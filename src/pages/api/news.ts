import type { NextApiRequest, NextApiResponse } from "next";
import { newsArticles } from "@/services/news/rssAggregator";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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
    let filtered = [...newsArticles];
    const assetParam = req.query.asset as string | undefined;
    const from = req.query.from ? new Date(Number(req.query.from)) : undefined;
    const to = req.query.to ? new Date(Number(req.query.to)) : undefined;
    if (assetParam) {
      const assets = assetParam.split(",").map((a) => a.trim().toUpperCase());
      filtered = filtered.filter((article) =>
        article.assetsMentioned.some((asset) => assets.includes(asset)),
      );
    }
    if (from) {
      filtered = filtered.filter((article) => article.publishedAt >= from);
    }
    if (to) {
      filtered = filtered.filter((article) => article.publishedAt <= to);
    }
    filtered.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    res.status(200).json(filtered);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Internal error", details: err?.message || String(err) });
  }
}
