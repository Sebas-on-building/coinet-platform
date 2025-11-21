import { EventEmitter } from "events";
import { api } from "../api";
import { WebSocketService } from "../websocket";
import { TradingSignal } from "@/types/trading";
import * as tf from "@tensorflow/tfjs";

// Export StrategyConfig rather than importing it
export interface StrategyConfig {
  symbol: string;
  timeframe: string;
  name: string; // Strategy name - make it required
  parameters: Record<string, number | string | boolean>;
}

// Create a WebSocketService instance
const webSocketService = new WebSocketService();

export interface StrategySignal {
  type: "entry" | "exit";
  side: "buy" | "sell";
  price: number;
  reason: string;
  timestamp: number;
}

export interface Strategy {
  name: string;
  description: string;
  defaultConfig: Partial<StrategyConfig>;
  validateConfig: (config: StrategyConfig) => boolean;
  getParameterDefinitions: () => {
    name: string;
    type: "number" | "string" | "boolean";
    default: number | string | boolean;
    description: string;
  }[];
}

interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  symbol?: string;
}

interface StrategyState {
  klines: KlineData[];
  ema: { fast: number[]; slow: number[] };
  rsi: number[];
  bollingerBands: { upper: number[]; middle: number[]; lower: number[] };
}

abstract class BaseStrategy implements Strategy {
  abstract name: string;
  abstract description: string;
  abstract defaultConfig: Partial<StrategyConfig>;
  abstract validateConfig(config: StrategyConfig): boolean;
  abstract getParameterDefinitions(): {
    name: string;
    type: "number" | "string" | "boolean";
    default: number | string | boolean;
    description: string;
  }[];
  abstract processKline(kline: KlineData): StrategySignal | null;
  abstract setConfig(config: StrategyConfig): void;

  protected state: StrategyState = {
    klines: [],
    ema: { fast: [], slow: [] },
    rsi: [],
    bollingerBands: { upper: [], middle: [], lower: [] },
  };

  protected calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    ema[0] = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    return ema;
  }

  protected calculateRSI(prices: number[], period: number): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      gains[i] = difference > 0 ? difference : 0;
      losses[i] = difference < 0 ? -difference : 0;
    }

    let avgGain =
      gains.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
    let avgLoss =
      losses.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      if (i > period) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      }

      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }

    return rsi;
  }

  protected calculateBollingerBands(
    prices: number[],
    period: number,
    deviations: number,
  ): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const bands = {
      upper: new Array(prices.length),
      middle: new Array(prices.length),
      lower: new Array(prices.length),
    };

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      const mean = sum / period;

      const squaredDiffs = slice.map((x) => Math.pow(x - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const stdDev = Math.sqrt(variance);

      bands.middle[i] = mean;
      bands.upper[i] = mean + deviations * stdDev;
      bands.lower[i] = mean - deviations * stdDev;
    }

    return bands;
  }
}

class TrendFollowingStrategy extends BaseStrategy {
  name = "Trend Following";
  description =
    "Follows market trends using EMA crossovers and volume confirmation";

  defaultConfig: Partial<StrategyConfig> = {
    timeframe: "15m",
    parameters: {
      fastEMA: 9,
      slowEMA: 21,
      volumeThreshold: 1.5,
      stopLoss: 2.0,
      takeProfit: 4.0,
    },
  };

  validateConfig(config: StrategyConfig): boolean {
    const { fastEMA, slowEMA, volumeThreshold, stopLoss, takeProfit } =
      config.parameters;
    return (
      typeof fastEMA === "number" &&
      typeof slowEMA === "number" &&
      typeof volumeThreshold === "number" &&
      typeof stopLoss === "number" &&
      typeof takeProfit === "number" &&
      fastEMA > 0 &&
      slowEMA > fastEMA &&
      volumeThreshold > 0 &&
      stopLoss > 0 &&
      takeProfit > stopLoss
    );
  }

  getParameterDefinitions() {
    return [
      {
        name: "fastEMA",
        type: "number" as const,
        default: 9,
        description: "Fast EMA period",
      },
      {
        name: "slowEMA",
        type: "number" as const,
        default: 21,
        description: "Slow EMA period",
      },
      {
        name: "volumeThreshold",
        type: "number" as const,
        default: 1.5,
        description: "Volume surge threshold multiplier",
      },
      {
        name: "stopLoss",
        type: "number" as const,
        default: 2.0,
        description: "Stop loss percentage",
      },
      {
        name: "takeProfit",
        type: "number" as const,
        default: 4.0,
        description: "Take profit percentage",
      },
    ];
  }

  processKline(kline: KlineData): StrategySignal | null {
    this.state.klines.push(kline);
    if (this.state.klines.length > 100) this.state.klines.shift();

    const prices = this.state.klines.map((k) => k.close);
    const config = this.activeConfig?.parameters;
    if (!config) return null;

    const fastEMA = this.calculateEMA(prices, config.fastEMA as number);
    const slowEMA = this.calculateEMA(prices, config.slowEMA as number);

    const previousFastEMA = fastEMA[fastEMA.length - 2];
    const previousSlowEMA = slowEMA[slowEMA.length - 2];
    const currentFastEMA = fastEMA[fastEMA.length - 1];
    const currentSlowEMA = slowEMA[slowEMA.length - 1];

    if (previousFastEMA < previousSlowEMA && currentFastEMA > currentSlowEMA) {
      return {
        type: "entry",
        side: "buy",
        price: kline.close,
        reason: "EMA crossover - bullish",
        timestamp: kline.closeTime,
      };
    }

    if (previousFastEMA > previousSlowEMA && currentFastEMA < currentSlowEMA) {
      return {
        type: "entry",
        side: "sell",
        price: kline.close,
        reason: "EMA crossover - bearish",
        timestamp: kline.closeTime,
      };
    }

    return null;
  }

  private activeConfig: StrategyConfig | null = null;

  setConfig(config: StrategyConfig) {
    if (this.validateConfig(config)) {
      this.activeConfig = config;
    }
  }
}

class MeanReversionStrategy extends BaseStrategy {
  name = "Mean Reversion";
  description =
    "Trades price deviations from moving averages with RSI confirmation";

  defaultConfig: Partial<StrategyConfig> = {
    timeframe: "5m",
    parameters: {
      period: 20,
      standardDeviations: 2,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
    },
  };

  validateConfig(config: StrategyConfig): boolean {
    const {
      period,
      standardDeviations,
      rsiPeriod,
      rsiOverbought,
      rsiOversold,
    } = config.parameters;
    return (
      typeof period === "number" &&
      typeof standardDeviations === "number" &&
      typeof rsiPeriod === "number" &&
      typeof rsiOverbought === "number" &&
      typeof rsiOversold === "number" &&
      period > 0 &&
      standardDeviations > 0 &&
      rsiPeriod > 0 &&
      rsiOverbought > rsiOversold
    );
  }

  getParameterDefinitions() {
    return [
      {
        name: "period",
        type: "number" as const,
        default: 20,
        description: "Moving average period",
      },
      {
        name: "standardDeviations",
        type: "number" as const,
        default: 2,
        description: "Number of standard deviations for Bollinger Bands",
      },
      {
        name: "rsiPeriod",
        type: "number" as const,
        default: 14,
        description: "RSI calculation period",
      },
      {
        name: "rsiOverbought",
        type: "number" as const,
        default: 70,
        description: "RSI overbought threshold",
      },
      {
        name: "rsiOversold",
        type: "number" as const,
        default: 30,
        description: "RSI oversold threshold",
      },
    ];
  }

  processKline(kline: KlineData): StrategySignal | null {
    this.state.klines.push(kline);
    if (this.state.klines.length > 100) this.state.klines.shift();

    const prices = this.state.klines.map((k) => k.close);
    const config = this.activeConfig?.parameters;
    if (!config) return null;

    const period = config.period as number;
    const rsiPeriod = config.rsiPeriod as number;
    const rsiOverbought = config.rsiOverbought as number;
    const rsiOversold = config.rsiOversold as number;

    const bands = this.calculateBollingerBands(
      prices,
      period,
      config.standardDeviations as number,
    );
    const rsi = this.calculateRSI(prices, rsiPeriod);

    const currentPrice = prices[prices.length - 1];
    const currentRSI = rsi[rsi.length - 1];
    const upperBand = bands.upper[bands.upper.length - 1];
    const lowerBand = bands.lower[bands.lower.length - 1];

    if (currentPrice > upperBand && currentRSI > rsiOverbought) {
      return {
        type: "entry",
        side: "sell",
        price: kline.close,
        reason: "Overbought - price above upper band with high RSI",
        timestamp: kline.closeTime,
      };
    }

    if (currentPrice < lowerBand && currentRSI < rsiOversold) {
      return {
        type: "entry",
        side: "buy",
        price: kline.close,
        reason: "Oversold - price below lower band with low RSI",
        timestamp: kline.closeTime,
      };
    }

    return null;
  }

  private activeConfig: StrategyConfig | null = null;

  setConfig(config: StrategyConfig): void {
    if (this.validateConfig(config)) {
      this.activeConfig = config;
    }
  }
}

export class StrategyExecutor extends EventEmitter {
  private strategies: Map<string, BaseStrategy> = new Map();
  private activeStrategies: Map<string, StrategyConfig> = new Map();
  private signals: StrategySignal[] = [];
  private klineSubscriptions: Set<string> = new Set();

  constructor() {
    super();
    this.registerStrategy(new TrendFollowingStrategy());
    this.registerStrategy(new MeanReversionStrategy());
    this.setupWebSocket();
  }

  private setupWebSocket() {
    webSocketService.on("kline", (data: any) => {
      const kline: KlineData = {
        openTime: data.t,
        open: parseFloat(data.o),
        high: parseFloat(data.h),
        low: parseFloat(data.l),
        close: parseFloat(data.c),
        volume: parseFloat(data.v),
        closeTime: data.T,
        symbol: data.s,
      };

      if (kline.symbol && this.activeStrategies.has(kline.symbol)) {
        this.processKline(kline.symbol, kline);
      }
    });
  }

  private processKline(symbol: string, kline: KlineData) {
    this.activeStrategies.forEach((config, strategyName) => {
      if (config.symbol === symbol) {
        const strategy = this.strategies.get(strategyName);
        if (strategy) {
          const signal = strategy.processKline(kline);
          if (signal) {
            this.signals.push(signal);
            this.emit("strategySignal", { strategy: strategyName, signal });
          }
        }
      }
    });
  }

  registerStrategy(strategy: BaseStrategy) {
    this.strategies.set(strategy.name, strategy);
  }

  getAvailableStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  startStrategy(name: string, config: StrategyConfig) {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Strategy ${name} not found`);
    }

    if (!strategy.validateConfig(config)) {
      throw new Error(`Invalid configuration for strategy ${name}`);
    }

    strategy.setConfig(config);
    this.activeStrategies.set(name, config);

    // Subscribe to kline updates if not already subscribed
    if (!this.klineSubscriptions.has(config.symbol)) {
      webSocketService.on(`${config.symbol}_kline`, () => {});
      this.klineSubscriptions.add(config.symbol);
    }

    this.emit("strategyStarted", { name, config });
  }

  stopStrategy(name: string) {
    const config = this.activeStrategies.get(name);
    if (config) {
      this.activeStrategies.delete(name);

      // Check if we can unsubscribe from kline updates
      const symbolStillNeeded = Array.from(this.activeStrategies.values()).some(
        (c) => c.symbol === config.symbol,
      );

      if (!symbolStillNeeded) {
        webSocketService.off(`${config.symbol}_kline`, () => {});
        this.klineSubscriptions.delete(config.symbol);
      }

      this.emit("strategyStopped", { name });
    }
  }

  getSignals(): StrategySignal[] {
    return this.signals;
  }

  clearSignals() {
    this.signals = [];
  }
}

export const strategyExecutor = new StrategyExecutor();

interface MLModelInput {
  technicalFeatures: number[];
  sentimentFeatures: number[];
  onchainFeatures: number[];
  marketFeatures: number[];
}

export class MLStrategy {
  private model: tf.LayersModel | null = null;
  private activeConfig: StrategyConfig | null = null;
  private predictionWindow = 10;

  constructor() {
    this.loadModel();
  }

  private async loadModel() {
    try {
      this.model = await tf.loadLayersModel("/models/trading_model/model.json");
    } catch (error) {
      console.error("Failed to load model:", error);
    }
  }

  async predict(features: {
    technicalFeatures: number[];
    sentimentFeatures: number[];
    onChainFeatures: number[];
    marketFeatures: number[];
  }): Promise<TradingSignal | null> {
    if (!this.model || !this.activeConfig) {
      return null;
    }

    const combinedFeatures = {
      ...features,
      config: Object.values(this.activeConfig.parameters),
    };

    try {
      const featureValues = Object.values(combinedFeatures).flat();
      const numericFeatures = featureValues.map((val) =>
        typeof val === "number"
          ? val
          : typeof val === "boolean"
            ? val
              ? 1
              : 0
            : 0,
      );
      const featureTensor = tf.tensor2d([numericFeatures]);
      const prediction = this.model.predict(featureTensor) as tf.Tensor;
      const result = await prediction.data();

      if (result[0] > 0.7) {
        // Strong buy signal
        return {
          type: "buy",
          confidence: result[0] as number,
          timestamp: Date.now(),
          symbol: this.activeConfig.symbol,
          strategy: this.activeConfig.name || "ML Strategy",
          id: Date.now().toString(),
          price: 0, // This should be set from current market price
          position_size: 1,
          risk_level: "medium",
          metadata: {
            price_prediction: result[1] as number,
            timeframe: this.activeConfig.timeframe,
            estimated_profit: result[2] as number,
          },
        };
      } else if (result[0] < 0.3) {
        // Strong sell signal
        return {
          type: "sell",
          confidence: 1 - (result[0] as number),
          timestamp: Date.now(),
          symbol: this.activeConfig.symbol,
          strategy: this.activeConfig.name || "ML Strategy",
          id: Date.now().toString(),
          price: 0, // This should be set from current market price
          position_size: 1,
          risk_level: "medium",
          metadata: {
            price_prediction: result[1] as number,
            timeframe: this.activeConfig.timeframe,
            estimated_risk: result[3] as number,
          },
        };
      }

      return null;
    } catch (error) {
      console.error("Error during prediction:", error);
      return null;
    }
  }

  setConfig(config: StrategyConfig) {
    this.activeConfig = config;
  }

  start() {
    if (!this.activeConfig) return;

    // Subscribe to market data
    const handleKline = async (data: any) => {
      // Process market data and make predictions
      const features = this.processMarketData(data);
      const signal = await this.predict(features);
      if (signal) {
        // Emit signal or execute trade
        console.log("Trading signal:", signal);
      }
    };

    webSocketService.on("kline", handleKline);
    webSocketService.on(`${this.activeConfig.symbol}_price`, () => {});
  }

  stop() {
    if (this.activeConfig) {
      webSocketService.off(`${this.activeConfig.symbol}_price`, () => {});
    }
  }

  private processMarketData(data: any) {
    // Process market data into feature vectors
    // This is a placeholder implementation
    return {
      technicalFeatures: Array(this.predictionWindow * 4).fill(0),
      sentimentFeatures: Array(this.predictionWindow * 4).fill(0),
      onChainFeatures: Array(this.predictionWindow * 4).fill(0),
      marketFeatures: Array(this.predictionWindow * 4).fill(0),
    };
  }
}

// Export strategy factory
export const createStrategy = (config: StrategyConfig) => new MLStrategy();
