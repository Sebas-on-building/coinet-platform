// Minimal in-memory rate limiter for Next.js API routes
// Usage: import and call at the top of your API handler

import type { NextApiRequest, NextApiResponse } from "next";

type RateLimitStore = Map<string, { count: number; last: number }>;

const store: RateLimitStore = new Map();
const WINDOW = 60 * 1000; // 1 minute
const MAX = 30; // 30 requests per minute per IP

export function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void,
) {
  let ip =
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  if (Array.isArray(ip)) ip = ip[0];
  const now = Date.now();
  const entry = store.get(ip) || { count: 0, last: now };
  if (now - entry.last > WINDOW) {
    entry.count = 0;
    entry.last = now;
  }
  entry.count += 1;
  store.set(ip, entry);
  if (entry.count > MAX) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  next();
}
