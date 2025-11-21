import { toast } from "react-hot-toast";

export interface OnChainMetrics {
  network: {
    hashRate: number;
    difficulty: number;
    blockHeight: number;
    blockTime: number;
    activeAddresses: number;
    transactionsPerSecond: number;
  };
  mempool: {
    size: number;
    averageFee: number;
    priorityFee: number;
    pendingTransactions: number;
  };
  staking: {
    totalStaked: number;
    stakingRatio: number;
    averageStakingTime: number;
    stakingRewards: number;
  };
  defi: {
    totalValueLocked: number;
    lendingVolume: number;
    borrowingVolume: number;
    yieldFarmingApy: number;
    protocolRevenue: number;
  };
  nft: {
    tradingVolume: number;
    floorPrice: number;
    uniqueOwners: number;
    averagePrice: number;
  };
}

export interface DerivativesMetrics {
  futures: {
    openInterest: number;
    fundingRate: number;
    longShortRatio: number;
    basis: number;
    volume24h: number;
  };
  options: {
    putCallRatio: number;
    impliedVolatility: number;
    maxPain: number;
    openInterest: {
      calls: number;
      puts: number;
    };
    volume24h: {
      calls: number;
      puts: number;
    };
  };
  perpetual: {
    fundingRate: number;
    openInterest: number;
    volume24h: number;
    longShortRatio: number;
  };
}

export interface PriceImpactMetrics {
  price: {
    current: number;
    change: number;
    changePercent: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    marketCap: number;
  };
  technical: {
    rsi: number;
    macd: {
      value: number;
      signal: number;
      histogram: number;
    };
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
    support: number[];
    resistance: number[];
  };
  sentiment: {
    overall: number;
    social: {
      twitter: number;
      reddit: number;
      telegram: number;
    };
    news: {
      positive: number;
      neutral: number;
      negative: number;
    };
    fearGreed: number;
  };
  volume: {
    total: number;
    buyVolume: number;
    sellVolume: number;
    buySellRatio: number;
    largeTransactions: number;
    whaleActivity: number;
  };
  volatility: {
    current: number;
    historical: number[];
    implied: number;
    skew: number;
  };
  liquidity: {
    depth: {
      bids: { price: number; size: number }[];
      asks: { price: number; size: number }[];
    };
    spread: number;
    slippage: number;
  };
  onChain: OnChainMetrics;
  derivatives: DerivativesMetrics;
}

export interface PriceImpactPrediction {
  shortTerm: {
    price: {
      expected: number;
      bestCase: number;
      worstCase: number;
      confidence: number;
    };
    volume: {
      expected: number;
      bestCase: number;
      worstCase: number;
    };
    volatility: {
      expected: number;
      bestCase: number;
      worstCase: number;
    };
  };
  mediumTerm: {
    price: {
      expected: number;
      bestCase: number;
      worstCase: number;
      confidence: number;
    };
    volume: {
      expected: number;
      bestCase: number;
      worstCase: number;
    };
    volatility: {
      expected: number;
      bestCase: number;
      worstCase: number;
    };
  };
  longTerm: {
    price: {
      expected: number;
      bestCase: number;
      worstCase: number;
      confidence: number;
    };
    volume: {
      expected: number;
      bestCase: number;
      worstCase: number;
    };
    volatility: {
      expected: number;
      bestCase: number;
      worstCase: number;
    };
  };
  factors: {
    technical: number;
    sentiment: number;
    volume: number;
    liquidity: number;
    market: number;
    onChain: number;
    derivatives: number;
  };
  confidence: number;
}

class PriceImpactService {
  private static instance: PriceImpactService;
  private metrics: Map<string, PriceImpactMetrics> = new Map();
  private predictions: Map<string, PriceImpactPrediction> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startTracking();
  }

  static getInstance(): PriceImpactService {
    if (!PriceImpactService.instance) {
      PriceImpactService.instance = new PriceImpactService();
    }
    return PriceImpactService.instance;
  }

  private startTracking() {
    // Update metrics every minute
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 60000);
  }

  private async updateMetrics() {
    try {
      // In a real application, this would fetch data from various sources
      // For now, we'll use mock data
      const mockMetrics: PriceImpactMetrics = {
        price: {
          current: 50000,
          change: 1000,
          changePercent: 2,
          high24h: 51000,
          low24h: 49000,
          volume24h: 1000000000,
          marketCap: 1000000000000,
        },
        technical: {
          rsi: 65,
          macd: {
            value: 100,
            signal: 90,
            histogram: 10,
          },
          bollingerBands: {
            upper: 52000,
            middle: 50000,
            lower: 48000,
          },
          support: [48000, 47000, 46000],
          resistance: [51000, 52000, 53000],
        },
        sentiment: {
          overall: 0.7,
          social: {
            twitter: 0.8,
            reddit: 0.6,
            telegram: 0.7,
          },
          news: {
            positive: 0.6,
            neutral: 0.3,
            negative: 0.1,
          },
          fearGreed: 65,
        },
        volume: {
          total: 1000000000,
          buyVolume: 600000000,
          sellVolume: 400000000,
          buySellRatio: 1.5,
          largeTransactions: 10,
          whaleActivity: 0.8,
        },
        volatility: {
          current: 0.02,
          historical: [0.01, 0.015, 0.02, 0.025, 0.03],
          implied: 0.025,
          skew: 0.1,
        },
        liquidity: {
          depth: {
            bids: [
              { price: 49900, size: 100 },
              { price: 49800, size: 200 },
              { price: 49700, size: 300 },
            ],
            asks: [
              { price: 50100, size: 100 },
              { price: 50200, size: 200 },
              { price: 50300, size: 300 },
            ],
          },
          spread: 200,
          slippage: 0.001,
        },
        onChain: {
          network: {
            hashRate: 150000000,
            difficulty: 25000000000,
            blockHeight: 750000,
            blockTime: 10,
            activeAddresses: 1000000,
            transactionsPerSecond: 5,
          },
          mempool: {
            size: 50000,
            averageFee: 0.0001,
            priorityFee: 0.0002,
            pendingTransactions: 25000,
          },
          staking: {
            totalStaked: 10000000,
            stakingRatio: 0.4,
            averageStakingTime: 30,
            stakingRewards: 0.05,
          },
          defi: {
            totalValueLocked: 5000000000,
            lendingVolume: 1000000000,
            borrowingVolume: 800000000,
            yieldFarmingApy: 0.15,
            protocolRevenue: 50000000,
          },
          nft: {
            tradingVolume: 100000000,
            floorPrice: 10000,
            uniqueOwners: 50000,
            averagePrice: 15000,
          },
        },
        derivatives: {
          futures: {
            openInterest: 2000000000,
            fundingRate: 0.0001,
            longShortRatio: 1.2,
            basis: 0.001,
            volume24h: 5000000000,
          },
          options: {
            putCallRatio: 0.8,
            impliedVolatility: 0.6,
            maxPain: 50000,
            openInterest: {
              calls: 100000,
              puts: 80000,
            },
            volume24h: {
              calls: 50000000,
              puts: 40000000,
            },
          },
          perpetual: {
            fundingRate: 0.0001,
            openInterest: 3000000000,
            volume24h: 8000000000,
            longShortRatio: 1.1,
          },
        },
      };

      this.metrics.set("BTC", mockMetrics);
      this.updatePredictions();
    } catch (error) {
      console.error("Error updating metrics:", error);
      toast.error("Failed to update price impact metrics");
    }
  }

  private updatePredictions() {
    const metrics = this.metrics.get("BTC");
    if (!metrics) return;

    const prediction: PriceImpactPrediction = {
      shortTerm: {
        price: {
          expected: 51000,
          bestCase: 52000,
          worstCase: 50000,
          confidence: 0.8,
        },
        volume: {
          expected: 1200000000,
          bestCase: 1500000000,
          worstCase: 900000000,
        },
        volatility: {
          expected: 0.025,
          bestCase: 0.03,
          worstCase: 0.02,
        },
      },
      mediumTerm: {
        price: {
          expected: 53000,
          bestCase: 55000,
          worstCase: 51000,
          confidence: 0.7,
        },
        volume: {
          expected: 1300000000,
          bestCase: 1600000000,
          worstCase: 1000000000,
        },
        volatility: {
          expected: 0.03,
          bestCase: 0.035,
          worstCase: 0.025,
        },
      },
      longTerm: {
        price: {
          expected: 55000,
          bestCase: 60000,
          worstCase: 50000,
          confidence: 0.6,
        },
        volume: {
          expected: 1400000000,
          bestCase: 1800000000,
          worstCase: 1100000000,
        },
        volatility: {
          expected: 0.035,
          bestCase: 0.04,
          worstCase: 0.03,
        },
      },
      factors: {
        technical: 0.7,
        sentiment: 0.8,
        volume: 0.6,
        liquidity: 0.9,
        market: 0.75,
        onChain: 0.8,
        derivatives: 0.8,
      },
      confidence: 0.75,
    };

    // Add on-chain and derivatives factors to the prediction
    const onChainFactor = this.calculateOnChainFactor(metrics.onChain);
    const derivativesFactor = this.calculateDerivativesFactor(
      metrics.derivatives,
    );

    prediction.factors = {
      ...prediction.factors,
      onChain: onChainFactor,
      derivatives: derivativesFactor,
    };

    // Adjust confidence based on new factors
    prediction.confidence =
      (prediction.confidence + onChainFactor + derivativesFactor) / 3;

    this.predictions.set("BTC", prediction);
  }

  private calculateOnChainFactor(metrics: OnChainMetrics): number {
    const factors = [
      // Network health
      metrics.network.activeAddresses > 500000 ? 0.8 : 0.5,
      metrics.network.transactionsPerSecond > 3 ? 0.8 : 0.5,

      // Mempool congestion
      metrics.mempool.pendingTransactions < 10000 ? 0.9 : 0.6,

      // Staking metrics
      metrics.staking.stakingRatio > 0.3 ? 0.8 : 0.5,

      // DeFi activity
      metrics.defi.totalValueLocked > 1000000000 ? 0.8 : 0.5,
      metrics.defi.protocolRevenue > 1000000 ? 0.8 : 0.5,

      // NFT market
      metrics.nft.tradingVolume > 50000000 ? 0.7 : 0.4,
    ];

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  private calculateDerivativesFactor(metrics: DerivativesMetrics): number {
    const factors = [
      // Futures market
      metrics.futures.openInterest > 1000000000 ? 0.8 : 0.5,
      Math.abs(metrics.futures.fundingRate) < 0.001 ? 0.9 : 0.6,

      // Options market
      metrics.options.putCallRatio > 0.5 && metrics.options.putCallRatio < 1.5
        ? 0.8
        : 0.5,
      metrics.options.impliedVolatility < 0.8 ? 0.8 : 0.5,

      // Perpetual market
      Math.abs(metrics.perpetual.fundingRate) < 0.001 ? 0.9 : 0.6,
      metrics.perpetual.volume24h > 1000000000 ? 0.8 : 0.5,
    ];

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  async getMetrics(symbol: string): Promise<PriceImpactMetrics | null> {
    return this.metrics.get(symbol) || null;
  }

  async getPrediction(symbol: string): Promise<PriceImpactPrediction | null> {
    return this.predictions.get(symbol) || null;
  }

  async getHistoricalMetrics(
    symbol: string,
    timeframe: "1h" | "4h" | "1d" | "1w" | "1m",
  ): Promise<PriceImpactMetrics[]> {
    // In a real application, this would fetch historical data
    // For now, return mock data
    return Array(24)
      .fill(null)
      .map(() => this.metrics.get(symbol)!);
  }

  async getCorrelationMatrix(symbols: string[]): Promise<number[][]> {
    // In a real application, this would calculate correlations between assets
    // For now, return mock data
    return symbols.map(() => symbols.map(() => Math.random()));
  }

  async getMarketImpact(
    symbol: string,
    orderSize: number,
  ): Promise<{
    priceImpact: number;
    slippage: number;
    executionTime: number;
  }> {
    const metrics = this.metrics.get(symbol);
    if (!metrics) {
      throw new Error("Symbol not found");
    }

    // Calculate price impact based on order book depth
    const { depth } = metrics.liquidity;
    let remainingSize = orderSize;
    let totalCost = 0;
    let weightedPrice = 0;

    for (const ask of depth.asks) {
      if (remainingSize <= 0) break;
      const executedSize = Math.min(remainingSize, ask.size);
      totalCost += executedSize * ask.price;
      weightedPrice = totalCost / (orderSize - remainingSize + executedSize);
      remainingSize -= executedSize;
    }

    const priceImpact =
      ((weightedPrice - metrics.price.current) / metrics.price.current) * 100;
    const slippage = metrics.liquidity.slippage * (orderSize / 1000000); // Scale slippage with order size
    const executionTime = Math.max(1, Math.ceil(orderSize / 100000)); // Simulate execution time

    return {
      priceImpact,
      slippage,
      executionTime,
    };
  }

  async getOnChainMetrics(symbol: string): Promise<OnChainMetrics | null> {
    const metrics = this.metrics.get(symbol);
    return metrics?.onChain || null;
  }

  async getDerivativesMetrics(
    symbol: string,
  ): Promise<DerivativesMetrics | null> {
    const metrics = this.metrics.get(symbol);
    return metrics?.derivatives || null;
  }

  async getMarketHealth(symbol: string): Promise<{
    onChain: number;
    derivatives: number;
    overall: number;
  }> {
    const metrics = this.metrics.get(symbol);
    if (!metrics) {
      throw new Error("Symbol not found");
    }

    const onChainHealth = this.calculateOnChainFactor(metrics.onChain);
    const derivativesHealth = this.calculateDerivativesFactor(
      metrics.derivatives,
    );
    const overallHealth = (onChainHealth + derivativesHealth) / 2;

    return {
      onChain: onChainHealth,
      derivatives: derivativesHealth,
      overall: overallHealth,
    };
  }

  stopTracking() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export const priceImpactService = PriceImpactService.getInstance();
