import type { NextApiRequest, NextApiResponse } from "next";
import Joi from "joi";
import { getClientIp } from "request-ip";
import { PrismaClient } from "../../../generated/prisma-client";
import winston from "winston";
import Redis from "ioredis";
import axios from "axios";
import geoip from "geoip-lite";
import { ReferralCodeModel, ReferralClaimModel } from '../../../models/referral';
import { t } from '../../../utils/i18n';
// import { creditWallet } from '@/services/habits'; // Stub for wallet crediting

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL!);
// Winston logger setup (could be moved to a shared logger)
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Joi schema for input validation
const claimSchema = Joi.object({
  code: Joi.string().alphanum().min(6).max(32).required(),
  fingerprint: Joi.string().min(32).max(128).required(),
});

// Modular fraud/rate limiting
async function checkRateLimit(ip: string, fingerprint: string) {
  const ipKey = `referral:claim:ip:${ip}`;
  const fpKey = `referral:claim:fp:${fingerprint}`;
  const [ipCount, fpCount] = await Promise.all([
    redis.incr(ipKey),
    redis.incr(fpKey),
  ]);
  if (ipCount === 1) await redis.expire(ipKey, 60 * 60); // 1 hour
  if (fpCount === 1) await redis.expire(fpKey, 60 * 60);
  if (ipCount > 5 || fpCount > 3) {
    logger.warn("Rate limit exceeded", { ip, fingerprint, ipCount, fpCount });
    return true;
  }
  return false;
}

// Real wallet crediting
async function creditWallet(
  userId: string,
  { amount, reason }: { amount: number; reason: string },
) {
  try {
    // Replace with your real wallet service endpoint and auth
    const res = await axios.post(
      process.env.WALLET_SERVICE_URL + "/credit",
      {
        userId,
        amount,
        reason,
        source: "referral",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WALLET_SERVICE_TOKEN}`,
        },
      },
    );
    logger.info("Wallet credited", { userId, amount, reason, tx: res.data });
    return res.data;
  } catch (err: any) {
    logger.error("Wallet crediting failed", {
      userId,
      amount,
      reason,
      error: err.message,
    });
    throw new Error("Wallet crediting failed");
  }
}

// Modular geolocation fraud check
function checkGeoFraud(ip: string) {
  const geo = geoip.lookup(ip);
  // Example: allow only claims from US, CA, EU countries (customize as needed)
  const allowedCountries = [
    "US",
    "CA",
    "GB",
    "DE",
    "FR",
    "NL",
    "SE",
    "IT",
    "ES",
    "IE",
    "DK",
    "FI",
    "NO",
    "BE",
    "AT",
    "CH",
    "PT",
    "LU",
    "GR",
    "PL",
    "CZ",
    "SK",
    "HU",
    "EE",
    "LT",
    "LV",
    "SI",
    "HR",
    "BG",
    "RO",
  ];
  if (!geo || !geo.country) {
    logger.warn("Geolocation failed", { ip });
    return { allowed: false, reason: "Could not determine location" };
  }
  if (!allowedCountries.includes(geo.country)) {
    logger.warn("Blocked country for referral claim", {
      ip,
      country: geo.country,
    });
    return {
      allowed: false,
      reason: `Claims from ${geo.country} are not allowed.`,
    };
  }
  return { allowed: true, country: geo.country };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: t('error.method_not_allowed') });
  const { code, userId, deviceFingerprint } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!code || !userId || !deviceFingerprint) return res.status(400).json({ error: t('error.missing_fields') });
  try {
    const referral = await ReferralCodeModel.findByCode(code);
    if (!referral || !referral.isActive) return res.status(404).json({ error: t('error.not_found') });
    // Fraud detection: check for duplicate device/IP
    const existingClaims = await ReferralClaimModel.findByFingerprint(deviceFingerprint);
    if (existingClaims.length > 0) {
      await ReferralClaimModel.flagFraud(existingClaims[0].id, 'Duplicate device');
      return res.status(403).json({ error: t('error.fraud_detected') });
    }
    // TODO: Geo lookup
    // const geo = await getGeoFromIP(ip);
    // Create claim
    const claim = await ReferralClaimModel.create({
      referralCodeId: referral.id,
      userId,
      ip,
      geo: null, // geo,
      deviceFingerprint,
      auditTrail: { event: 'claim', timestamp: new Date() },
    });
    await ReferralCodeModel.incrementUses(referral.id);
    // TODO: Credit reward via Habits service
    // await creditReward(userId, amount);
    await ReferralClaimModel.setRewarded(claim.id, 100); // Example: 100 points
    res.status(200).json({ success: true, reward: 100 });
  } catch (err) {
    res.status(500).json({ error: t('error.server_error') });
  }
}
