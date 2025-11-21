import type { NextApiRequest, NextApiResponse } from "next";
import Joi from "joi";
import { Queue } from "bullmq";
import { RedisService } from "../../../services/redis";
import {
  checkPasswordEntropy,
  isCommonPassword,
} from "../../../utils/passwordUtils";
import { sendOtpEmail } from "../../../services/emailService";
import User from "src/models/User";
import bcrypt from "bcryptjs";
import { t } from '../../../utils/i18n';
import { logAuditEvent } from '../../../services/auditLog';

// Polyfill fetch for Node.js if needed
import fetch from "node-fetch";

const redis = RedisService.getInstance();
const otpQueue = new Queue("otp-rate-limit", {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(12).required(),
  captcha: Joi.string().required(),
  captchaProvider: Joi.string().valid("recaptcha", "hcaptcha").required(),
});

// Server-side Google reCAPTCHA v3 verification
const verifyRecaptcha = async (token: string) => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const response = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`,
    },
  );
  const data = await response.json();
  return data.success && data.score && data.score > 0.5;
};

// Server-side hCaptcha verification
const verifyHcaptcha = async (token: string) => {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });
  const data = await response.json();
  return data.success;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();
  const { error, value } = schema.validate(req.body);
  if (error) {
    await logAuditEvent({
      event: 'register_failed',
      email: req.body?.email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      reason: error.details[0].message,
    });
    return res.status(400).json({ error: t('register.invalid', { reason: error.details[0].message }) });
  }

  const { email, password, captcha, captchaProvider } = value;

  // CAPTCHA verification (Google reCAPTCHA v3, fallback to hCaptcha)
  let captchaValid = false;
  if (captchaProvider === "recaptcha") {
    captchaValid = await verifyRecaptcha(captcha);
  } else if (captchaProvider === "hcaptcha") {
    captchaValid = await verifyHcaptcha(captcha);
  }
  if (!captchaValid) {
    await logAuditEvent({
      event: 'register_failed',
      email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      reason: 'captcha',
    });
    return res.status(400).json({ error: t('register.captcha_failed') });
  }

  // Password entropy and blacklist check
  if (!checkPasswordEntropy(password)) {
    await logAuditEvent({
      event: 'register_failed',
      email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      reason: 'entropy',
    });
    return res.status(400).json({ error: t('register.entropy_low') });
  }
  if (isCommonPassword(password)) {
    await logAuditEvent({
      event: 'register_failed',
      email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      reason: 'common_password',
    });
    return res.status(400).json({ error: t('register.common_password') });
  }

  let user = await User.findOne({ email });
  if (user && user.isVerified) {
    await logAuditEvent({
      event: 'register_failed',
      email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      reason: 'already_verified',
    });
    return res.status(400).json({ error: t('register.already_verified') });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  if (!user) {
    user = await User.create({ email, passwordHash, isVerified: false });
  } else {
    user.passwordHash = passwordHash;
    user.isVerified = false;
    await user.save();
  }

  // Rate limit OTP requests using BullMQ
  const job = await otpQueue.add("register", { email });
  if (!job) {
    await logAuditEvent({
      event: 'register_failed',
      email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      reason: 'rate_limit',
    });
    return res.status(429).json({ error: t('register.too_many_requests') });
  }

  // Generate OTP and store in Redis
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`otp:${email}`, otp, 600); // 10 min expiry using set(key, value, ttlSeconds)

  // Send OTP via email
  try {
    await sendOtpEmail({ to: email, otp, expiry: 600 });
  } catch (err) {
    await logAuditEvent({
      event: 'register_failed',
      email,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      reason: 'email_send',
    });
    return res.status(500).json({ error: t('register.email_failed') });
  }

  await logAuditEvent({
    event: 'register_success',
    email,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
  // TODO: Add device fingerprinting for advanced security
  // TODO: Add magic link support for passwordless registration
  // Return entropy score for frontend feedback (placeholder: 4.0)
  return res.status(200).json({ message: t('register.initiated'), entropy: 4.0 });
}
