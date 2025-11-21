// API endpoint: /api/social-metrics
// Aggregates social sentiment metrics from Twitter, Reddit, and Discord.
// Query params:
//   asset: optional, comma-separated list of assets (e.g., BTC,ETH)
//   from: optional, ms since epoch (default: 24h ago)
//   to: optional, ms since epoch (default: now)
//   interval: optional, e.g., '5m', '1h' (default: 5m)
// Response: { [asset]: [ { asset, sentiment, volume, timestamp } ] }

import type { NextApiRequest, NextApiResponse } from "next";
import { getAggregatedMetrics as getTwitterMetrics } from "@/services/social/twitterStream";
import { SocialMetric } from "@/services/social/twitterStream";
import * as Sentry from "@sentry/nextjs";

// TODO: In a real system, Reddit/Discord would have their own buckets or a shared aggregator.
// For demo, we only use Twitter's in-memory buckets, but the structure supports all sources.

function parseInterval(interval: string): number {
  if (interval.endsWith("m")) return parseInt(interval) * 60 * 1000;
  if (interval.endsWith("h")) return parseInt(interval) * 60 * 60 * 1000;
  return 5 * 60 * 1000; // default 5m
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const assetParam = req.query.asset as string | undefined;
    const assets = assetParam
      ? assetParam.split(",").map((a) => a.trim().toUpperCase())
      : undefined;
    const from = req.query.from
      ? parseInt(req.query.from as string, 10)
      : Date.now() - 24 * 60 * 60 * 1000;
    const to = req.query.to ? parseInt(req.query.to as string, 10) : Date.now();
    const interval = req.query.interval ? String(req.query.interval) : "5m";
    const bucketSize = parseInterval(interval);

    // For demo, use Twitter's buckets (in a real system, merge all sources)
    // We'll scan all buckets in the time range for each asset
    const out: Record<string, SocialMetric[]> = {};
    const now = Date.now();
    const start = Math.floor(from / bucketSize) * bucketSize;
    const end = Math.floor(to / bucketSize) * bucketSize;
    const assetList = assets || [
      "BTC",
      "ETH",
      "DOGE",
      "SOL",
      "ADA",
      "XRP",
      "BNB",
      "MATIC",
      "DOT",
      "LTC",
    ];
    for (const asset of assetList) {
      out[asset] = [];
      for (let t = start; t <= end; t += bucketSize) {
        const metric = getTwitterMetrics(asset, t);
        if (metric.volume > 0) {
          out[asset].push(metric);
        }
      }
    }
    res.status(200).json(out);
  } catch (err: any) {
    Sentry.captureException(err);
    res
      .status(500)
      .json({ error: "Internal error", details: err?.message || String(err) });
  }
}
