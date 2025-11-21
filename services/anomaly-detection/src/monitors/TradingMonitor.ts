/**
 * Trading Monitor
 * Real-time monitoring of trading volume, price movements, and liquidity anomalies
 */

import { DataPoint, DataSource, MonitoringConfig } from '../core/types';
import { EventEmitter } from 'events';

export interface TradeData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  exchange: string;
  side: 'buy' | 'sell';
  liquidityDepth?: number;
}

export interface PriceAlert {
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  timestamp: Date;
}

export class TradingMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private volumeCache: Map<string, TradeData[]> = new Map();
  private priceCache: Map<string, number> = new Map();
  private readonly volumeWindow = 3600000; // 1 hour

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
  }

  /**
   * Process incoming trade data
   */
  async processTrade(trade: TradeData): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];

    // Monitor trading volume
    const volumePoint = await this.monitorVolume(trade);
    if (volumePoint) dataPoints.push(volumePoint);

    // Monitor price movements
    const pricePoint = await this.monitorPrice(trade);
    if (pricePoint) dataPoints.push(pricePoint);

    // Monitor liquidity
    if (trade.liquidityDepth !== undefined) {
      const liquidityPoint = await this.monitorLiquidity(trade);
      if (liquidityPoint) dataPoints.push(liquidityPoint);
    }

    return dataPoints;
  }

  /**
   * Monitor trading volume for unusual spikes or drops
   */
  private async monitorVolume(trade: TradeData): Promise<DataPoint | null> {
    const key = trade.symbol;
    
    // Add to cache
    if (!this.volumeCache.has(key)) {
      this.volumeCache.set(key, []);
    }
    
    const trades = this.volumeCache.get(key)!;
    trades.push(trade);

    // Remove old trades outside window
    const cutoff = Date.now() - this.volumeWindow;
    this.volumeCache.set(
      key,
      trades.filter(t => t.timestamp.getTime() > cutoff)
    );

    // Calculate current volume
    const currentTrades = this.volumeCache.get(key)!;
    const totalVolume = currentTrades.reduce((sum, t) => sum + t.volume, 0);

    return {
      timestamp: trade.timestamp,
      source: DataSource.TRADING_VOLUME,
      value: totalVolume,
      metadata: {
        symbol: trade.symbol,
        exchange: trade.exchange,
        tradeCount: currentTrades.length,
        buyVsSell: this.calculateBuySellRatio(currentTrades)
      },
      symbol: trade.symbol
    };
  }

  /**
   * Monitor price movements for sudden changes
   */
  private async monitorPrice(trade: TradeData): Promise<DataPoint | null> {
    const key = trade.symbol;
    const previousPrice = this.priceCache.get(key);
    
    // Update cache
    this.priceCache.set(key, trade.price);

    if (!previousPrice) {
      return null; // Need at least two prices
    }

    const changePercent = ((trade.price - previousPrice) / previousPrice) * 100;

    // Emit alert for significant price changes
    if (Math.abs(changePercent) > 5) {
      this.emit('price_alert', {
        symbol: trade.symbol,
        currentPrice: trade.price,
        previousPrice,
        changePercent,
        timestamp: trade.timestamp
      } as PriceAlert);
    }

    return {
      timestamp: trade.timestamp,
      source: DataSource.PRICE_MOVEMENT,
      value: trade.price,
      metadata: {
        symbol: trade.symbol,
        exchange: trade.exchange,
        previousPrice,
        changePercent,
        volatility: Math.abs(changePercent)
      },
      symbol: trade.symbol
    };
  }

  /**
   * Monitor liquidity depth
   */
  private async monitorLiquidity(trade: TradeData): Promise<DataPoint | null> {
    return {
      timestamp: trade.timestamp,
      source: DataSource.LIQUIDITY,
      value: trade.liquidityDepth!,
      metadata: {
        symbol: trade.symbol,
        exchange: trade.exchange,
        price: trade.price
      },
      symbol: trade.symbol
    };
  }

  /**
   * Calculate buy/sell ratio
   */
  private calculateBuySellRatio(trades: TradeData[]): number {
    const buyVolume = trades
      .filter(t => t.side === 'buy')
      .reduce((sum, t) => sum + t.volume, 0);
    
    const sellVolume = trades
      .filter(t => t.side === 'sell')
      .reduce((sum, t) => sum + t.volume, 0);

    return sellVolume === 0 ? buyVolume : buyVolume / sellVolume;
  }

  /**
   * Get volume statistics
   */
  getVolumeStats(symbol: string): {
    totalVolume: number;
    tradeCount: number;
    averageTradeSize: number;
    buyVsSell: number;
  } | null {
    const trades = this.volumeCache.get(symbol);
    if (!trades || trades.length === 0) return null;

    const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);
    const tradeCount = trades.length;
    const averageTradeSize = totalVolume / tradeCount;
    const buyVsSell = this.calculateBuySellRatio(trades);

    return {
      totalVolume,
      tradeCount,
      averageTradeSize,
      buyVsSell
    };
  }

  /**
   * Clear cache for symbol
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.volumeCache.delete(symbol);
      this.priceCache.delete(symbol);
    } else {
      this.volumeCache.clear();
      this.priceCache.clear();
    }
  }
}

