import type { NextApiRequest, NextApiResponse } from "next";
import { healthCheckMarketConnectors } from "@/services/market/MarketDataService";
import { Cache } from "@/utils/cache";

// Use in-memory caching for 15 seconds to avoid excessive health pings
const cache = new Cache();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const cacheKey = "health-market";
  const cached = await cache.get(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  try {
    const result = await healthCheckMarketConnectors();
    await cache.set(cacheKey, result, 15); // cache for 15 seconds
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
}
