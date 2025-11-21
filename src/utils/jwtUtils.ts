import { SignJWT, jwtVerify } from 'jose';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
const JWT_ISSUER = 'Coinet';
const JWT_AUDIENCE = 'CoinetUser';
const ACCESS_TOKEN_EXP = '15m';
const REFRESH_TOKEN_EXP = 60 * 60 * 24 * 30; // 30 days

// TODO: Load ES256 keys from secure storage
const privateKey = /* load from env or secure vault */ null as any;
const publicKey = /* load from env or secure vault */ null as any;

/**
 * Sign a short-lived access token (ES256)
 */
export async function signAccessToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXP)
    .sign(privateKey);
}

/**
 * Sign and store a refresh token (rotated, per device)
 */
export async function signRefreshToken(payload: any, deviceId: string) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(REFRESH_TOKEN_EXP)
    .sign(privateKey);
  await redis.sadd(`refresh:${payload.userId}:${deviceId}`, token);
  return token;
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string) {
  return jwtVerify(token, publicKey, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
}

/**
 * Rotate a refresh token (remove old, add new)
 */
export async function rotateRefreshToken(userId: string, deviceId: string, oldToken: string, newPayload: any) {
  await redis.srem(`refresh:${userId}:${deviceId}`, oldToken);
  return signRefreshToken(newPayload, deviceId);
}

/**
 * Check if a refresh token is valid for a device
 */
export async function isRefreshTokenValid(userId: string, deviceId: string, token: string) {
  return !!(await redis.sismember(`refresh:${userId}:${deviceId}`, token));
} 