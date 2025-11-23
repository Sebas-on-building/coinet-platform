import { NextApiRequest, NextApiResponse } from "next";
import { getLiquidationData } from "@/services/exchanges/liquidationService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { timeframe = "1D" } = req.query;
    const data = await getLiquidationData(timeframe as string);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching liquidation data:", error);
    res.status(500).json({ error: "Failed to fetch liquidation data" });
  }
}
