import { NextApiRequest, NextApiResponse } from "next";
import { getPriceLevels } from "../../services/analysis/priceLevelService";
import { historicalLevelsService } from "../../services/analysis/historicalLevelsService";

const VALID_TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1D",
  "3D",
  "1W",
  "2W",
  "1M",
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      timeframe = "1h",
      includeHistory = "false",
      startTime,
      endTime,
    } = req.query;

    // Validate timeframe
    if (!VALID_TIMEFRAMES.includes(timeframe as string)) {
      return res.status(400).json({
        message: "Invalid timeframe",
        validTimeframes: VALID_TIMEFRAMES,
      });
    }

    // Get current price levels
    const levels = await getPriceLevels(timeframe as string);

    // Track levels for historical analysis
    await historicalLevelsService.trackLevels(timeframe as string);

    // Include historical data if requested
    if (includeHistory === "true") {
      const historicalLevels = historicalLevelsService.getHistoricalLevels(
        timeframe as string,
        startTime as string,
        endTime as string,
      );

      const breakdown = historicalLevelsService.getLevelBreakdowns(
        timeframe as string,
      );

      return res.status(200).json({
        currentLevels: levels,
        historicalLevels,
        breakdown,
        timeframe,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      levels,
      timeframe,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching price levels:", error);
    res.status(500).json({ message: "Error fetching price levels" });
  }
}
