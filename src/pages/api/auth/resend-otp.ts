import type { NextApiRequest, NextApiResponse } from "next";
import Joi from "joi";
import { Queue } from "bullmq";
import { RedisService } from "../../../services/redis";
import { sendOtpEmail } from "../../../services/emailService";
import logger from "src/services/logger";

const redis = RedisService.getInstance();
const otpQueue = new Queue("otp-rate-limit", {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

const schema = Joi.object({
  email: Joi.string().email().required(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { email } = value;
  try {
    // Rate limit OTP requests using BullMQ
    const job = await otpQueue.add("resend", { email });
    if (!job) {
      logger.warn("OTP resend rate limited", {
        email,
        event: "otp_resend",
        status: "fail",
      });
      return res
        .status(429)
        .json({ error: "Too many requests. Please try again later." });
    }
    // Generate OTP and store in Redis
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`otp:${email}`, otp, 600); // 10 min expiry
    // Send OTP via email
    await sendOtpEmail({ to: email, otp, expiry: 600 });
    logger.info("OTP resent successfully", {
      email,
      event: "otp_resend",
      status: "success",
    });
    return res
      .status(200)
      .json({ message: "OTP resent. Please check your email." });
  } catch (err) {
    logger.error("Failed to resend OTP", {
      email,
      event: "otp_resend",
      status: "error",
      error: err,
    });
    return res
      .status(500)
      .json({ error: "Failed to resend OTP. Please try again later." });
  }
}
