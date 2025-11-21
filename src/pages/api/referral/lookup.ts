import type { NextApiRequest, NextApiResponse } from "next";
import Joi from "joi";
import { PrismaClient } from "@prisma/client";
import winston from "winston";

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const lookupSchema = Joi.object({
  code: Joi.string().alphanum().min(6).max(32).required(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code } = req.query;
  const { error } = lookupSchema.validate({ code });
  if (error) {
    logger.warn("Referral lookup validation failed", { error: error.details });
    return res
      .status(400)
      .json({ error: "Invalid code", details: error.details });
  }

  try {
    const referral = await prisma.referralCode.findUnique({
      where: { code: code as string },
      include: {
        user: { select: { id: true, email: true, name: true } },
        claims: true,
      },
    });
    if (!referral) {
      logger.info("Referral code not found", { code });
      return res.status(404).json({ error: "Referral code not found" });
    }
    const usageCount = referral.claims ? referral.claims.length : 0;
    logger.info("Referral code lookup success", {
      code,
      owner: referral.user?.id,
      usageCount,
    });
    return res.status(200).json({
      code: referral.code,
      owner: referral.user,
      usageCount,
      createdAt: referral.createdAt,
      status: referral.active ? "active" : "inactive",
    });
  } catch (err: any) {
    logger.error("Referral lookup error", { error: err.message, code });
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
}
