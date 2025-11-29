import { getPriceLevels } from "./priceLevelService";

interface HistoricalLevel {
  price: number;
  label: string;
  type: "support" | "resistance" | "neutral";
  strength: number;
  timestamp: string;
  timeframe: string;
  indicators?: {
    rsi?: number;
    macd?: {
      value: number;
      signal: number;
      histogram: number;
    };
    volumeProfile?: {
      volume: number;
      buyVolume: number;
      sellVolume: number;
    };
    fibonacci?: {
      level: number;
      retracement: number;
    };
  };
}

class HistoricalLevelsService {
  private static instance: HistoricalLevelsService;
  private historicalLevels: Map<string, HistoricalLevel[]> = new Map();
  private readonly MAX_HISTORY_LENGTH = 1000; // Maximum number of historical levels to store

  private constructor() {}

  public static getInstance(): HistoricalLevelsService {
    if (!HistoricalLevelsService.instance) {
      HistoricalLevelsService.instance = new HistoricalLevelsService();
    }
    return HistoricalLevelsService.instance;
  }

  public async trackLevels(timeframe: string): Promise<void> {
    try {
      const currentLevels = await getPriceLevels(timeframe);
      const timestamp = new Date().toISOString();

      const historicalLevels = currentLevels.map((level) => ({
        ...level,
        timestamp,
        timeframe,
      }));

      const key = `levels_${timeframe}`;
      const existingLevels = this.historicalLevels.get(key) || [];

      // Add new levels and maintain maximum history length
      const updatedLevels = [...existingLevels, ...historicalLevels].slice(
        -this.MAX_HISTORY_LENGTH,
      );

      this.historicalLevels.set(key, updatedLevels);
    } catch (error) {
      console.error("Error tracking historical levels:", error);
    }
  }

  public getHistoricalLevels(
    timeframe: string,
    startTime?: string,
    endTime?: string,
  ): HistoricalLevel[] {
    const levels = this.historicalLevels.get(`levels_${timeframe}`) || [];

    if (!startTime && !endTime) {
      return levels;
    }

    return levels.filter((level) => {
      const timestamp = new Date(level.timestamp).getTime();
      const start = startTime ? new Date(startTime).getTime() : 0;
      const end = endTime ? new Date(endTime).getTime() : Date.now();
      return timestamp >= start && timestamp <= end;
    });
  }

  public getLevelBreakdowns(timeframe: string): {
    support: number;
    resistance: number;
    neutral: number;
  } {
    const levels = this.historicalLevels.get(`levels_${timeframe}`) || [];
    const breakdown = {
      support: 0,
      resistance: 0,
      neutral: 0,
    };

    levels.forEach((level) => {
      breakdown[level.type]++;
    });

    return breakdown;
  }

  public getLevelStrengthTrend(
    timeframe: string,
    price: number,
    tolerance: number = 0.001,
  ): {
    averageStrength: number;
    strengthTrend: "increasing" | "decreasing" | "stable";
  } {
    const levels = this.historicalLevels.get(`levels_${timeframe}`) || [];
    const relevantLevels = levels.filter(
      (level) => Math.abs(level.price - price) / price <= tolerance,
    );

    if (relevantLevels.length === 0) {
      return {
        averageStrength: 0,
        strengthTrend: "stable",
      };
    }

    const strengths = relevantLevels.map((level) => level.strength);
    const averageStrength =
      strengths.reduce((sum, strength) => sum + strength, 0) / strengths.length;

    // Calculate trend based on the last 5 occurrences
    const recentStrengths = strengths.slice(-5);
    const trend =
      recentStrengths.length >= 2
        ? recentStrengths[recentStrengths.length - 1] > recentStrengths[0]
          ? "increasing"
          : recentStrengths[recentStrengths.length - 1] < recentStrengths[0]
            ? "decreasing"
            : "stable"
        : "stable";

    return {
      averageStrength,
      strengthTrend: trend,
    };
  }
}

export const historicalLevelsService = HistoricalLevelsService.getInstance();
