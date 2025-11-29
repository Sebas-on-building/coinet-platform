import { getLiquidationData } from "../exchanges/liquidationService";
import NodeCache from "node-cache";

interface PriceLevel {
  price: number;
  label: string;
  type: "support" | "resistance" | "neutral";
  strength: number;
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

interface VolumeProfile {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  pocs: number[]; // Points of Control
}

// Cache price levels for 5 minutes
const priceLevelCache = new NodeCache({ stdTTL: 300 });

export async function getPriceLevels(timeframe: string): Promise<PriceLevel[]> {
  const cacheKey = `price_levels_${timeframe}`;
  const cachedLevels = priceLevelCache.get<PriceLevel[]>(cacheKey);

  if (cachedLevels) {
    return cachedLevels;
  }

  try {
    const liquidationData = await getLiquidationData(timeframe);
    const levels = calculatePriceLevels(liquidationData);
    priceLevelCache.set(cacheKey, levels);
    return levels;
  } catch (error) {
    console.error("Error calculating price levels:", error);
    return generateFallbackPriceLevels();
  }
}

function calculatePriceLevels(data: any[]): PriceLevel[] {
  const pricePoints = data.map((d) => d.price);
  const levels: PriceLevel[] = [];

  // Calculate pivot points
  const high = Math.max(...pricePoints);
  const low = Math.min(...pricePoints);
  const close = pricePoints[pricePoints.length - 1];
  const pivot = (high + low + close) / 3;

  // Calculate Fibonacci levels
  const range = high - low;
  const fibLevels = {
    0: low,
    0.236: low + range * 0.236,
    0.382: low + range * 0.382,
    0.5: low + range * 0.5,
    0.618: low + range * 0.618,
    0.786: low + range * 0.786,
    1: high,
  };

  // Calculate volume profile
  const volumeProfile = calculateVolumeProfile(data);

  // Calculate RSI
  const rsi = calculateRSI(pricePoints);

  // Calculate MACD
  const macd = calculateMACD(pricePoints);

  // Add pivot point with indicators
  levels.push({
    price: pivot,
    label: "Pivot",
    type: "neutral",
    strength: calculateLevelStrength(pivot, data),
    indicators: {
      rsi: rsi[rsi.length - 1],
      macd: macd[macd.length - 1],
      volumeProfile: volumeProfile.find(
        (vp) => Math.abs(vp.price - pivot) / pivot <= 0.001,
      ),
    },
  });

  // Add Fibonacci levels
  Object.entries(fibLevels).forEach(([level, price]) => {
    const volumeProfileData = volumeProfile.find(
      (vp) => Math.abs(vp.price - price) / price <= 0.001,
    );
    levels.push({
      price,
      label: `Fib ${level}`,
      type: Number(level) > 0.5 ? "resistance" : "support",
      strength: calculateLevelStrength(price, data),
      indicators: {
        fibonacci: {
          level: Number(level),
          retracement: Number(level) * 100,
        },
        volumeProfile: volumeProfileData,
      },
    });
  });

  // Add volume profile POCs (Points of Control)
  const pocs = volumeProfile
    .filter(
      (vp) =>
        vp.volume >= Math.max(...volumeProfile.map((v) => v.volume)) * 0.8,
    )
    .map((vp) => vp.price);

  pocs.forEach((price: number, index: number) => {
    const volumeProfileData = volumeProfile.find(
      (vp) => Math.abs(vp.price - price) / price <= 0.001,
    );
    levels.push({
      price,
      label: `POC ${index + 1}`,
      type: "neutral",
      strength: calculateLevelStrength(price, data),
      indicators: {
        volumeProfile: volumeProfileData,
      },
    });
  });

  // Add liquidation clusters with indicators
  const liquidationLevels = findLiquidationClusters(data);
  liquidationLevels.forEach((level, index) => {
    const volumeProfileData = volumeProfile.find(
      (vp) => Math.abs(vp.price - level.price) / level.price <= 0.001,
    );
    levels.push({
      price: level.price,
      label: `L${index + 1}`,
      type: level.type,
      strength: level.strength,
      indicators: {
        rsi: rsi[rsi.length - 1],
        macd: macd[macd.length - 1],
        volumeProfile: volumeProfileData,
      },
    });
  });

  return levels.sort((a, b) => b.price - a.price);
}

function calculateVolumeProfile(data: any[]): VolumeProfile[] {
  const priceStep =
    (Math.max(...data.map((d) => d.price)) -
      Math.min(...data.map((d) => d.price))) /
    100;
  const volumeProfile: VolumeProfile[] = [];
  const pocs: number[] = [];

  // Group data by price levels
  for (
    let price = Math.min(...data.map((d) => d.price));
    price <= Math.max(...data.map((d) => d.price));
    price += priceStep
  ) {
    const levelData = data.filter(
      (d) => Math.abs(d.price - price) / price <= 0.001,
    );
    const volume = levelData.reduce((sum, d) => sum + d.totalLiquidations, 0);
    const buyVolume = levelData.reduce((sum, d) => sum + d.longLiquidations, 0);
    const sellVolume = levelData.reduce(
      (sum, d) => sum + d.shortLiquidations,
      0,
    );

    volumeProfile.push({
      price,
      volume,
      buyVolume,
      sellVolume,
      pocs: [],
    });
  }

  // Find Points of Control (highest volume levels)
  const sortedProfile = [...volumeProfile].sort((a, b) => b.volume - a.volume);
  const maxVolume = sortedProfile[0].volume;
  const pocThreshold = maxVolume * 0.8; // Consider levels with 80% of max volume as POCs

  sortedProfile.forEach((level) => {
    if (level.volume >= pocThreshold) {
      pocs.push(level.price);
    }
  });

  // Add POCs to all volume profile entries
  volumeProfile.forEach((level) => {
    level.pocs = pocs;
  });

  return volumeProfile;
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map((change) => (change > 0 ? change : 0));
  const losses = changes.map((change) => (change < 0 ? -change : 0));

  const avgGain =
    gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss =
    losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  const rsi: number[] = [];
  let prevAvgGain = avgGain;
  let prevAvgLoss = avgLoss;

  for (let i = period; i < prices.length; i++) {
    const currentGain = gains[i - 1];
    const currentLoss = losses[i - 1];

    prevAvgGain = (prevAvgGain * (period - 1) + currentGain) / period;
    prevAvgLoss = (prevAvgLoss * (period - 1) + currentLoss) / period;

    const rs = prevAvgGain / prevAvgLoss;
    const currentRSI = 100 - 100 / (1 + rs);
    rsi.push(currentRSI);
  }

  return rsi;
}

function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
): Array<{ value: number; signal: number; histogram: number }> {
  const ema = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    let ema = data[0];
    return data.map((price) => {
      ema = price * k + ema * (1 - k);
      return ema;
    });
  };

  const fastEMA = ema(prices, fastPeriod);
  const slowEMA = ema(prices, slowPeriod);
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);

  return macdLine.map((macd, i) => ({
    value: macd,
    signal: signalLine[i],
    histogram: macd - signalLine[i],
  }));
}

function calculateLevelStrength(price: number, data: any[]): number {
  const tolerance = 0.001; // 0.1% tolerance
  const nearbyPoints = data.filter(
    (d) => Math.abs(d.price - price) / price <= tolerance,
  );

  const volume = nearbyPoints.reduce((sum, d) => sum + d.totalLiquidations, 0);
  const maxVolume = Math.max(...data.map((d) => d.totalLiquidations));

  return Math.min(volume / maxVolume, 1);
}

function findLiquidationClusters(data: any[]): PriceLevel[] {
  const clusters: {
    [key: string]: {
      price: number;
      volume: number;
      type: "support" | "resistance";
    };
  } = {};
  const tolerance = 0.002; // 0.2% tolerance

  data.forEach((d) => {
    const priceKey = Math.round(d.price / tolerance) * tolerance;
    if (!clusters[priceKey]) {
      clusters[priceKey] = {
        price: d.price,
        volume: 0,
        type:
          d.longLiquidations > d.shortLiquidations ? "resistance" : "support",
      };
    }
    clusters[priceKey].volume += d.totalLiquidations;
  });

  const maxVolume = Math.max(...Object.values(clusters).map((c) => c.volume));

  return Object.values(clusters)
    .filter((c) => c.volume > maxVolume * 0.1) // Only include significant clusters
    .map((c) => ({
      price: c.price,
      label: "",
      type: c.type,
      strength: c.volume / maxVolume,
    }));
}

function generateFallbackPriceLevels(): PriceLevel[] {
  const basePrice = 25000;
  return [
    { price: basePrice + 1000, label: "R1", type: "resistance", strength: 0.8 },
    { price: basePrice + 500, label: "R2", type: "resistance", strength: 0.6 },
    { price: basePrice, label: "Pivot", type: "neutral", strength: 0.5 },
    { price: basePrice - 500, label: "S1", type: "support", strength: 0.6 },
    { price: basePrice - 1000, label: "S2", type: "support", strength: 0.8 },
  ];
}
