import type { NextApiRequest, NextApiResponse } from "next";
import Joi from "joi";
import { RedisService } from "../../../services/redis";
import User from "src/models/User";
import logger from "src/services/logger";

const redis = RedisService.getInstance();

const schema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { email, otp } = value;
  try {
    const storedOtp = await redis.get<string>(`otp:${email}`);
    if (!storedOtp) {
      logger.warn(`OTP expired or not found`, {
        email,
        event: "otp_verify",
        status: "fail",
      });
      return res.status(400).json({ error: "OTP expired or not found." });
    }
    if (storedOtp !== otp) {
      logger.warn(`Invalid OTP`, {
        email,
        event: "otp_verify",
        status: "fail",
      });
      return res.status(400).json({ error: "Invalid OTP." });
    }
    // OTP is valid, delete it
    await redis.delete(`otp:${email}`);
    const user = await User.findOne({ email });
    if (!user) {
      logger.error(`User not found after OTP`, {
        email,
        event: "otp_verify",
        status: "fail",
      });
      return res.status(404).json({ error: "User not found." });
    }
    user.isVerified = true;
    user.lastVerification = new Date();
    await user.save();
    logger.info(`OTP verified successfully`, {
      email,
      event: "otp_verify",
      status: "success",
    });
    return res.status(200).json({ message: "Email verified successfully." });
  } catch (err) {
    logger.error(`Internal server error during OTP verification`, {
      email,
      event: "otp_verify",
      status: "error",
      error: err,
    });
    return res.status(500).json({ error: "Internal server error." });
  }
}
