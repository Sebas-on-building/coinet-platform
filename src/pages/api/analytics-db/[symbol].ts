import type { NextApiRequest, NextApiResponse } from "next";
import { Pool } from "pg";

const PG_CONN =
  process.env.PG_CONN || "postgresql://coinet:coinetpass@localhost:5432/coinet";
const pool = new Pool({ connectionString: PG_CONN });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { symbol } = req.query;
  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({ error: "Missing symbol" });
  }
  try {
    const analytics = await pool.query(
      "SELECT time, ma20, volatility FROM analytics WHERE symbol = $1 ORDER BY time DESC LIMIT 100",
      [symbol],
    );
    const anomalies = await pool.query(
      "SELECT time, price, ma20, volatility, reason FROM anomalies WHERE symbol = $1 ORDER BY time DESC LIMIT 20",
      [symbol],
    );
    res.status(200).json({
      symbol,
      analytics: analytics.rows,
      anomalies: anomalies.rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}
