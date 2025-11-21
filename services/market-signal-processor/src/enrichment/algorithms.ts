/**
 * =========================================
 * DATA ENRICHMENT ALGORITHMS
 * =========================================
 * Divine world-class mathematical algorithms for market signal enrichment
 * Sophisticated calculations for momentum, order-book imbalance, and market microstructure
 */

import { RawMarketSignal, EnrichedMarketSignal, ProcessingContext, ExchangeType, SignalType, AssetType } from '@/types';
import { z } from 'zod';

// Enriched data interfaces
export interface MomentumMetrics {
  priceMomentum: number; // Rate of price change
  volumeMomentum: number; // Rate of volume change
  priceVelocity: number; // Price change per unit time
  volumeVelocity: number; // Volume change per unit time
  acceleration: number; // Rate of change of velocity
  momentumScore: number; // Composite momentum score (-1 to 1)
  trendStrength: number; // Strength of trend (0 to 1)
  trendDirection: 'bullish' | 'bearish' | 'sideways';
}

export interface OrderBookImbalance {
  bidAskImbalance: number; // Volume imbalance between bids and asks
  priceImbalance: number; // Price level distribution
  spreadPressure: number; // Pressure from bid-ask spread
  depthRatio: number; // Ratio of bid depth to ask depth
  orderFlowImbalance: number; // Net order flow direction
  marketMakerActivity: number; // Activity of market makers
  retailActivity: number; // Activity of retail traders
  institutionalActivity: number; // Activity of institutional traders
  imbalanceScore: number; // Composite imbalance score (-1 to 1)
}

export interface LiquidityMetrics {
  totalBidLiquidity: number;
  totalAskLiquidity: number;
  bidDepth: number; // Number of bid levels
  askDepth: number; // Number of ask levels
  averageBidSize: number;
  averageAskSize: number;
  bidAskRatio: number;
  liquidityScore: number; // Overall liquidity assessment
}

export interface VolatilityMetrics {
  priceVolatility: number; // Price variance over time window
  volumeVolatility: number; // Volume variance over time window
  spreadVolatility: number; // Spread variance over time window
  realizedVolatility: number; // Realized volatility calculation
  impliedVolatility?: number; // Implied volatility if available
  volatilityScore: number; // Composite volatility score
}

export interface MarketMicrostructure {
  orderBookShape: 'normal' | 'inverted' | 'skewed_bull' | 'skewed_bear';
  priceDiscovery: number; // Efficiency of price discovery (0 to 1)
  marketEfficiency: number; // Overall market efficiency (0 to 1)
  informationAsymmetry: number; // Level of information asymmetry (0 to 1)
  toxicityIndex: number; // Order book toxicity (0 to 1)
}

/**
 * Advanced momentum calculation engine
 * Implements sophisticated momentum analysis using multiple time windows
 */
export class MomentumCalculator {
  private priceHistory: Map<string, Array<{ timestamp: number; price: number }>> = new Map();
  private volumeHistory: Map<string, Array<{ timestamp: number; volume: number }>> = new Map();
  private maxHistorySize: number = 1000; // Maximum history entries per symbol

  /**
   * Calculate comprehensive momentum metrics
   */
  calculateMomentum(
    signal: RawMarketSignal,
    context: ProcessingContext,
    config: {
      priceWindow: number;
      volumeWindow: number;
      smoothingAlpha: number;
    }
  ): MomentumMetrics {
    const symbolKey = `${signal.exchange}:${signal.symbol}`;

    // Update price and volume history
    this.updateHistory(symbolKey, signal);

    // Get historical data for calculations
    const priceData = this.priceHistory.get(symbolKey) || [];
    const volumeData = this.volumeHistory.get(symbolKey) || [];

    // Calculate price momentum
    const priceMomentum = this.calculatePriceMomentum(priceData, config.priceWindow);

    // Calculate volume momentum
    const volumeMomentum = this.calculateVolumeMomentum(volumeData, config.volumeWindow);

    // Calculate velocities (rate of change)
    const priceVelocity = this.calculateVelocity(priceData, (p) => p.price, config.priceWindow);
    const volumeVelocity = this.calculateVelocity(volumeData, (v) => v.volume, config.volumeWindow);

    // Calculate acceleration (rate of change of velocity)
    const acceleration = this.calculateAcceleration(priceData, config.priceWindow);

    // Calculate trend strength and direction
    const { trendStrength, trendDirection } = this.calculateTrendAnalysis(priceData);

    // Calculate composite momentum score
    const momentumScore = this.calculateCompositeMomentumScore(
      priceMomentum,
      volumeMomentum,
      trendStrength,
      trendDirection
    );

    return {
      priceMomentum,
      volumeMomentum,
      priceVelocity,
      volumeVelocity,
      acceleration,
      momentumScore,
      trendStrength,
      trendDirection,
    };
  }

  private updateHistory(symbolKey: string, signal: RawMarketSignal): void {
    // Update price history
    if (signal.signalType === 'trade' || signal.signalType === 'quote') {
      const price = signal.signalType === 'trade' ? signal.price :
                   signal.signalType === 'quote' ? (signal.bid + signal.ask) / 2 : 0;

      if (price > 0) {
        let priceHistory = this.priceHistory.get(symbolKey) || [];
        priceHistory.push({ timestamp: signal.timestamp, price });

        // Keep only recent history
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        priceHistory = priceHistory.filter(p => p.timestamp > cutoff);

        // Limit history size
        if (priceHistory.length > this.maxHistorySize) {
          priceHistory = priceHistory.slice(-this.maxHistorySize);
        }

        this.priceHistory.set(symbolKey, priceHistory);
      }
    }

    // Update volume history for trades
    if (signal.signalType === 'trade') {
      let volumeHistory = this.volumeHistory.get(symbolKey) || [];
      volumeHistory.push({ timestamp: signal.timestamp, volume: signal.volume });

      // Keep only recent history
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      volumeHistory = volumeHistory.filter(v => v.timestamp > cutoff);

      // Limit history size
      if (volumeHistory.length > this.maxHistorySize) {
        volumeHistory = volumeHistory.slice(-this.maxHistorySize);
      }

      this.volumeHistory.set(symbolKey, volumeHistory);
    }
  }

  private calculatePriceMomentum(priceData: Array<{ timestamp: number; price: number }>, windowMs: number): number {
    if (priceData.length < 2) return 0;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Filter data within window
    const windowData = priceData.filter(p => p.timestamp >= windowStart);
    if (windowData.length < 2) return 0;

    // Sort by timestamp
    windowData.sort((a, b) => a.timestamp - b.timestamp);

    const firstPrice = windowData[0]?.price;
    const lastPrice = windowData[windowData.length - 1]?.price;

    // Calculate momentum as percentage change
    return firstPrice && lastPrice && firstPrice > 0 ? (lastPrice - firstPrice) / firstPrice : 0;
  }

  private calculateVolumeMomentum(volumeData: Array<{ timestamp: number; volume: number }>, windowMs: number): number {
    if (volumeData.length < 2) return 0;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Filter data within window
    const windowData = volumeData.filter(v => v.timestamp >= windowStart);
    if (windowData.length < 2) return 0;

    // Sort by timestamp
    windowData.sort((a, b) => a.timestamp - b.timestamp);

    const firstVolume = windowData[0]?.volume;
    const lastVolume = windowData[windowData.length - 1]?.volume;

    // Calculate momentum as percentage change
    return firstVolume && lastVolume && firstVolume > 0 ? (lastVolume - firstVolume) / firstVolume : 0;
  }

  private calculateVelocity<T extends { timestamp: number }>(data: Array<T>, valueAccessor: (item: T) => number, windowMs: number): number {
    if (data.length < 2) return 0;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Filter data within window
    const windowData = data.filter(d => d.timestamp >= windowStart);
    if (windowData.length < 2) return 0;

    // Sort by timestamp
    windowData.sort((a, b) => a.timestamp - b.timestamp);

    const firstValue = valueAccessor(windowData[0]!);
    const lastValue = valueAccessor(windowData[windowData.length - 1]!);
    const timeSpan = (windowData[windowData.length - 1]!.timestamp - windowData[0]!.timestamp) / 1000; // seconds

    // Calculate velocity (change per second)
    return timeSpan > 0 ? (lastValue - firstValue) / timeSpan : 0;
  }

  private calculateAcceleration(priceData: Array<{ timestamp: number; price: number }>, windowMs: number): number {
    if (priceData.length < 3) return 0;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Filter data within window
    const windowData = priceData.filter(p => p.timestamp >= windowStart);
    if (windowData.length < 3) return 0;

    // Sort by timestamp
    windowData.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate velocities at different points
    const earlyVelocities = this.calculateVelocityFromPoints(windowData.slice(0, Math.floor(windowData.length / 2)));
    const lateVelocities = this.calculateVelocityFromPoints(windowData.slice(Math.floor(windowData.length / 2)));

    // Ensure arrays are not empty before calculating average
    const avgEarlyVelocity = earlyVelocities.length > 0 ? earlyVelocities.reduce((sum, v) => sum + v, 0) / earlyVelocities.length : 0;
    const avgLateVelocity = lateVelocities.length > 0 ? lateVelocities.reduce((sum, v) => sum + v, 0) / lateVelocities.length : 0;

    // Acceleration is rate of change of velocity
    return avgLateVelocity - avgEarlyVelocity;
  }

  private calculateVelocityFromPoints(data: Array<{ timestamp: number; price: number }>): number[] {
    const velocities: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const timeDiff = (data[i]!.timestamp - data[i-1]!.timestamp) / 1000; // seconds
      const priceDiff = data[i]!.price - data[i-1]!.price;
      velocities.push(timeDiff > 0 ? priceDiff / timeDiff : 0);
    }

    return velocities;
  }

  private calculateTrendAnalysis(priceData: Array<{ timestamp: number; price: number }>): {
    trendStrength: number;
    trendDirection: 'bullish' | 'bearish' | 'sideways';
  } {
    if (priceData.length < 10) {
      return { trendStrength: 0, trendDirection: 'sideways' };
    }

    // Sort by timestamp
    priceData.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate linear regression for trend
    const n = priceData.length;
    const sumX = priceData.reduce((sum, p, i) => sum + i, 0);
    const sumY = priceData.reduce((sum, p) => sum + p.price, 0);
    const sumXY = priceData.reduce((sum, p, i) => sum + i * p.price, 0);
    const sumXX = priceData.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for trend strength
    const meanY = sumY / n;
    const totalSumSquares = priceData.reduce((sum, p) => sum + Math.pow(p.price - meanY, 2), 0);
    const residualSumSquares = priceData.reduce((sum, p, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(p.price - predicted, 2);
    }, 0);

    const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    const trendStrength = Math.min(rSquared, 1);

    // Determine trend direction
    let trendDirection: 'bullish' | 'bearish' | 'sideways' = 'sideways';
    if (slope > 0.001) trendDirection = 'bullish';
    else if (slope < -0.001) trendDirection = 'bearish';

    return { trendStrength, trendDirection };
  }

  private calculateCompositeMomentumScore(
    priceMomentum: number,
    volumeMomentum: number,
    trendStrength: number,
    trendDirection: 'bullish' | 'bearish' | 'sideways'
  ): number {
    // Weighted composite score
    const priceWeight = 0.5;
    const volumeWeight = 0.3;
    const trendWeight = 0.2;

    const priceScore = priceMomentum * priceWeight;
    const volumeScore = volumeMomentum * volumeWeight;
    const trendScore = trendDirection === 'bullish' ? trendStrength * trendWeight :
                      trendDirection === 'bearish' ? -trendStrength * trendWeight : 0;

    return Math.max(-1, Math.min(1, priceScore + volumeScore + trendScore));
  }
}

/**
 * Advanced order-book imbalance calculator
 * Sophisticated analysis of order book structure and flow
 */
export class OrderBookAnalyzer {
  /**
   * Calculate comprehensive order-book imbalance metrics
   */
  calculateOrderBookImbalance(orderbook: RawMarketSignal & { signalType: 'orderbook' }): OrderBookImbalance {
    const bids = orderbook.bids;
    const asks = orderbook.asks;

    if (bids.length === 0 || asks.length === 0) {
      return this.getEmptyImbalance();
    }

    // Calculate volume imbalance
    const bidAskImbalance = this.calculateVolumeImbalance(bids, asks);

    // Calculate price imbalance
    const priceImbalance = this.calculatePriceImbalance(bids, asks);

    // Calculate spread pressure
    const spreadPressure = this.calculateSpreadPressure(bids, asks);

    // Calculate depth ratio
    const depthRatio = this.calculateDepthRatio(bids, asks);

    // Calculate order flow imbalance
    const orderFlowImbalance = this.calculateOrderFlowImbalance(bids, asks);

    // Analyze market participants
    const { marketMakerActivity, retailActivity, institutionalActivity } = this.analyzeMarketParticipants(bids, asks);

    // Calculate composite imbalance score
    const imbalanceScore = this.calculateCompositeImbalanceScore(
      bidAskImbalance,
      priceImbalance,
      spreadPressure,
      depthRatio,
      orderFlowImbalance
    );

    return {
      bidAskImbalance,
      priceImbalance,
      spreadPressure,
      depthRatio,
      orderFlowImbalance,
      marketMakerActivity,
      retailActivity,
      institutionalActivity,
      imbalanceScore,
    };
  }

  private calculateVolumeImbalance(bids: Array<[number, number]>, asks: Array<[number, number]>): number {
    const totalBidVolume = bids.reduce((sum, [_, volume]) => sum + volume, 0);
    const totalAskVolume = asks.reduce((sum, [_, volume]) => sum + volume, 0);

    if (totalBidVolume + totalAskVolume === 0) return 0;

    // Volume imbalance: (bid_volume - ask_volume) / (bid_volume + ask_volume)
    return (totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume);
  }

  private calculatePriceImbalance(bids: Array<[number, number]>, asks: Array<[number, number]>): number {
    if (bids.length === 0 || asks.length === 0) return 0;

    const bestBid = Math.max(...bids.map(([price]) => price));
    const bestAsk = Math.min(...asks.map(([price]) => price));
    const midPrice = (bestBid + bestAsk) / 2;

    // Price imbalance based on distribution around mid price
    const bidDistance = Math.abs(bestBid - midPrice);
    const askDistance = Math.abs(bestAsk - midPrice);

    return bidDistance > 0 || askDistance > 0 ?
      (askDistance - bidDistance) / (bidDistance + askDistance) : 0;
  }

  private calculateSpreadPressure(bids: Array<[number, number]>, asks: Array<[number, number]>): number {
    if (bids.length === 0 || asks.length === 0) return 0;

    const bestBid = Math.max(...bids.map(([price]) => price));
    const bestAsk = Math.min(...asks.map(([price]) => price));
    const spread = bestAsk - bestBid;

    // Normalize spread pressure by typical spread for this level of liquidity
    const avgLevelSize = ((bids[0]?.[1] || 0) + (asks[0]?.[1] || 0)) / 2;
    const typicalSpread = avgLevelSize > 0 ? Math.sqrt(avgLevelSize) * 0.001 : 0.001; // Approximation

    return spread > 0 ? spread / typicalSpread - 1 : 0;
  }

  private calculateDepthRatio(bids: Array<[number, number]>, asks: Array<[number, number]>): number {
    const bidDepth = bids.length;
    const askDepth = asks.length;

    return bidDepth > 0 && askDepth > 0 ? Math.log(bidDepth / askDepth) : 0;
  }

  private calculateOrderFlowImbalance(bids: Array<[number, number]>, asks: Array<[number, number]>): number {
    // Analyze order flow by comparing recent additions vs cancellations
    // This is a simplified version - in practice, would need order flow data
    const bidAggressiveness = bids.reduce((sum, [price, volume]) => sum + volume / price, 0);
    const askAggressiveness = asks.reduce((sum, [price, volume]) => sum + volume / price, 0);

    return bidAggressiveness > 0 && askAggressiveness > 0 ?
      (bidAggressiveness - askAggressiveness) / (bidAggressiveness + askAggressiveness) : 0;
  }

  private analyzeMarketParticipants(bids: Array<[number, number]>, asks: Array<[number, number]>): {
    marketMakerActivity: number;
    retailActivity: number;
    institutionalActivity: number;
  } {
    // Simplified participant analysis based on order sizes
    const allOrders = bids.concat(asks);
    const smallOrders = allOrders.filter(([_, volume]) => volume < 1).length;
    const mediumOrders = allOrders.filter(([_, volume]) => volume >= 1 && volume < 10).length;
    const largeOrders = allOrders.filter(([_, volume]) => volume >= 10).length;

    const totalOrders = allOrders.length;

    return {
      marketMakerActivity: totalOrders > 0 ? largeOrders / totalOrders : 0, // Large orders often from market makers
      retailActivity: totalOrders > 0 ? smallOrders / totalOrders : 0, // Small orders often from retail
      institutionalActivity: totalOrders > 0 ? mediumOrders / totalOrders : 0, // Medium orders often from institutions
    };
  }

  private calculateCompositeImbalanceScore(
    bidAskImbalance: number,
    priceImbalance: number,
    spreadPressure: number,
    depthRatio: number,
    orderFlowImbalance: number
  ): number {
    // Weighted composite score
    const weights = {
      bidAskImbalance: 0.3,
      priceImbalance: 0.2,
      spreadPressure: 0.2,
      depthRatio: 0.15,
      orderFlowImbalance: 0.15,
    };

    const score = (
      bidAskImbalance * weights.bidAskImbalance +
      priceImbalance * weights.priceImbalance +
      spreadPressure * weights.spreadPressure +
      depthRatio * weights.depthRatio +
      orderFlowImbalance * weights.orderFlowImbalance
    );

    return Math.max(-1, Math.min(1, score));
  }

  private getEmptyImbalance(): OrderBookImbalance {
    return {
      bidAskImbalance: 0,
      priceImbalance: 0,
      spreadPressure: 0,
      depthRatio: 0,
      orderFlowImbalance: 0,
      marketMakerActivity: 0,
      retailActivity: 0,
      institutionalActivity: 0,
      imbalanceScore: 0,
    };
  }
}

/**
 * Liquidity analysis engine
 * Sophisticated liquidity assessment and market depth analysis
 */
export class LiquidityAnalyzer {
  calculateLiquidityMetrics(orderbook: RawMarketSignal & { signalType: 'orderbook' }): LiquidityMetrics {
    const bids = orderbook.bids;
    const asks = orderbook.asks;

    // Calculate total liquidity
    const totalBidLiquidity = bids.reduce((sum, [_, volume]) => sum + volume, 0);
    const totalAskLiquidity = asks.reduce((sum, [_, volume]) => sum + volume, 0);

    // Calculate depth metrics
    const bidDepth = bids.length;
    const askDepth = asks.length;

    // Calculate average order sizes
    const averageBidSize = bidDepth > 0 ? totalBidLiquidity / bidDepth : 0;
    const averageAskSize = askDepth > 0 ? totalAskLiquidity / askDepth : 0;

    // Calculate bid-ask ratio
    const bidAskRatio = totalAskLiquidity > 0 ? totalBidLiquidity / totalAskLiquidity : 0;

    // Calculate liquidity score (simplified composite measure)
    const liquidityScore = this.calculateLiquidityScore(
      totalBidLiquidity,
      totalAskLiquidity,
      bidDepth,
      askDepth,
      averageBidSize,
      averageAskSize
    );

    return {
      totalBidLiquidity,
      totalAskLiquidity,
      bidDepth,
      askDepth,
      averageBidSize,
      averageAskSize,
      bidAskRatio,
      liquidityScore,
    };
  }

  private calculateLiquidityScore(
    totalBidLiquidity: number,
    totalAskLiquidity: number,
    bidDepth: number,
    askDepth: number,
    averageBidSize: number,
    averageAskSize: number
  ): number {
    // Composite liquidity score based on multiple factors
    const totalLiquidity = totalBidLiquidity + totalAskLiquidity;
    const depthScore = Math.min((bidDepth + askDepth) / 20, 1); // Normalize to 20 levels
    const sizeScore = Math.min((averageBidSize + averageAskSize) / 10, 1); // Normalize to $10 avg size
    const balanceScore = 1 - Math.abs(totalBidLiquidity - totalAskLiquidity) / Math.max(totalLiquidity, 1);

    return (totalLiquidity > 0 ? Math.log10(totalLiquidity) / 6 : 0) * 0.4 +
           depthScore * 0.3 +
           sizeScore * 0.2 +
           balanceScore * 0.1;
  }
}

/**
 * Volatility calculation engine
 * Sophisticated volatility analysis using multiple methodologies
 */
export class VolatilityCalculator {
  calculateVolatilityMetrics(
    signal: RawMarketSignal,
    historicalPrices: Array<{ timestamp: number; price: number }>,
    config: { windowSize: number; annualizationFactor: number }
  ): VolatilityMetrics {
    const { windowSize, annualizationFactor } = config;

    // Filter historical prices within window
    const now = Date.now();
    const windowStart = now - windowSize;
    const windowPrices = historicalPrices.filter(p => p.timestamp >= windowStart);

    if (windowPrices.length < 10) {
      return this.getEmptyVolatility();
    }

    // Calculate price volatility
    const priceVolatility = this.calculatePriceVolatility(windowPrices);

    // Calculate volume volatility (if trade data available)
    const volumeVolatility = signal.signalType === 'trade' ?
      this.calculateVolumeVolatility(windowPrices) : 0;

    // Calculate spread volatility (if quote data available)
    const spreadVolatility = signal.signalType === 'quote' ?
      this.calculateSpreadVolatility(windowPrices) : 0;

    // Calculate realized volatility
    const realizedVolatility = this.calculateRealizedVolatility(windowPrices, annualizationFactor);

    // Calculate volatility score
    const volatilityScore = this.calculateVolatilityScore(
      priceVolatility,
      volumeVolatility,
      spreadVolatility,
      realizedVolatility
    );

    return {
      priceVolatility,
      volumeVolatility,
      spreadVolatility,
      realizedVolatility,
      volatilityScore,
    };
  }

  private calculatePriceVolatility(prices: Array<{ timestamp: number; price: number }>): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1]!.price;
      const currPrice = prices[i]!.price;

      if (prevPrice > 0) {
        returns.push(Math.log(currPrice / prevPrice));
      }
    }

    if (returns.length === 0) return 0;

    // Calculate standard deviation of log returns
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private calculateVolumeVolatility(prices: Array<{ timestamp: number; price: number }>): number {
    // Simplified volume volatility - in practice, would need actual volume data
    // Using price changes as proxy for volume activity
    return this.calculatePriceVolatility(prices) * 0.5; // Scale down as proxy
  }

  private calculateSpreadVolatility(prices: Array<{ timestamp: number; price: number }>): number {
    // Simplified spread volatility - in practice, would need spread data
    return this.calculatePriceVolatility(prices) * 0.3; // Scale down as proxy
  }

  private calculateRealizedVolatility(prices: Array<{ timestamp: number; price: number }>, annualizationFactor: number): number {
    const priceVolatility = this.calculatePriceVolatility(prices);

    // Annualize the volatility
    const timeSpan = (prices[prices.length - 1]!.timestamp - prices[0]!.timestamp) / (1000 * 60 * 60 * 24 * 365); // years

    return timeSpan > 0 ? priceVolatility * Math.sqrt(annualizationFactor / timeSpan) : 0;
  }

  private calculateVolatilityScore(
    priceVolatility: number,
    volumeVolatility: number,
    spreadVolatility: number,
    realizedVolatility: number
  ): number {
    // Composite volatility score
    const weights = {
      priceVolatility: 0.5,
      volumeVolatility: 0.2,
      spreadVolatility: 0.2,
      realizedVolatility: 0.1,
    };

    const score = (
      Math.min(priceVolatility, 2) * weights.priceVolatility +
      Math.min(volumeVolatility, 2) * weights.volumeVolatility +
      Math.min(spreadVolatility, 2) * weights.spreadVolatility +
      Math.min(realizedVolatility, 2) * weights.realizedVolatility
    );

    return Math.min(score, 1);
  }

  private getEmptyVolatility(): VolatilityMetrics {
    return {
      priceVolatility: 0,
      volumeVolatility: 0,
      spreadVolatility: 0,
      realizedVolatility: 0,
      volatilityScore: 0,
    };
  }
}

/**
 * Market microstructure analyzer
 * Advanced analysis of market structure and efficiency
 */
export class MarketMicrostructureAnalyzer {
  analyzeMarketStructure(
    signal: RawMarketSignal,
    orderBookImbalance?: OrderBookImbalance,
    liquidity?: LiquidityMetrics,
    volatility?: VolatilityMetrics
  ): MarketMicrostructure {
    // Analyze order book shape
    const orderBookShape = this.analyzeOrderBookShape(signal);

    // Calculate price discovery efficiency
    const priceDiscovery = this.calculatePriceDiscovery(signal, orderBookImbalance, liquidity);

    // Calculate market efficiency
    const marketEfficiency = this.calculateMarketEfficiency(signal, volatility, liquidity);

    // Calculate information asymmetry
    const informationAsymmetry = this.calculateInformationAsymmetry(signal, orderBookImbalance);

    // Calculate toxicity index
    const toxicityIndex = this.calculateToxicityIndex(signal, orderBookImbalance);

    return {
      orderBookShape,
      priceDiscovery,
      marketEfficiency,
      informationAsymmetry,
      toxicityIndex,
    };
  }

  private analyzeOrderBookShape(signal: RawMarketSignal): 'normal' | 'inverted' | 'skewed_bull' | 'skewed_bear' {
    if (signal.signalType !== 'orderbook') return 'normal';

    const bids = signal.bids;
    const asks = signal.asks;

    if (bids.length < 3 || asks.length < 3) return 'normal';

    const bidVolumes = bids.map(([_, volume]) => volume);
    const askVolumes = asks.map(([_, volume]) => volume);

    const bidMean = bidVolumes.reduce((sum, v) => sum + v, 0) / bidVolumes.length;
    const askMean = askVolumes.reduce((sum, v) => sum + v, 0) / askVolumes.length;

    // Check for inverted order book (larger sizes at worse prices)
    const bidSkew = bidVolumes[0]! < bidMean ? 1 : 0; // Top level smaller than average
    const askSkew = askVolumes[0]! < askMean ? 1 : 0; // Top level smaller than average

    if (bidSkew && askSkew) return 'inverted';
    if (bidSkew && !askSkew) return 'skewed_bull';
    if (!bidSkew && askSkew) return 'skewed_bear';

    return 'normal';
  }

  private calculatePriceDiscovery(
    signal: RawMarketSignal,
    orderBookImbalance?: OrderBookImbalance,
    liquidity?: LiquidityMetrics
  ): number {
    // Simplified price discovery efficiency
    let score = 0.5; // Base score

    if (orderBookImbalance) {
      score += orderBookImbalance.imbalanceScore * 0.2;
    }

    if (liquidity) {
      score += Math.min(liquidity.liquidityScore, 1) * 0.3;
    }

    return Math.min(score, 1);
  }

  private calculateMarketEfficiency(
    signal: RawMarketSignal,
    volatility?: VolatilityMetrics,
    liquidity?: LiquidityMetrics
  ): number {
    let score = 0.5; // Base score

    if (volatility && volatility.volatilityScore < 0.3) {
      score += 0.3; // Low volatility suggests efficiency
    }

    if (liquidity && liquidity.liquidityScore > 0.7) {
      score += 0.2; // High liquidity suggests efficiency
    }

    return Math.min(score, 1);
  }

  private calculateInformationAsymmetry(
    signal: RawMarketSignal,
    orderBookImbalance?: OrderBookImbalance
  ): number {
    if (!orderBookImbalance) return 0.5;

    // Higher imbalance suggests more information asymmetry
    return Math.abs(orderBookImbalance.imbalanceScore) * 0.5 + 0.25;
  }

  private calculateToxicityIndex(
    signal: RawMarketSignal,
    orderBookImbalance?: OrderBookImbalance
  ): number {
    if (!orderBookImbalance) return 0;

    // Higher imbalance and spread pressure suggest toxicity
    const imbalanceComponent = Math.abs(orderBookImbalance.imbalanceScore);
    const spreadComponent = Math.abs(orderBookImbalance.spreadPressure);

    return Math.min((imbalanceComponent + spreadComponent) / 2, 1);
  }
}

/**
 * Main data enrichment orchestrator
 */
export class DataEnrichmentEngine {
  private momentumCalculator = new MomentumCalculator();
  private orderBookAnalyzer = new OrderBookAnalyzer();
  private liquidityAnalyzer = new LiquidityAnalyzer();
  private volatilityCalculator = new VolatilityCalculator();
  private microstructureAnalyzer = new MarketMicrostructureAnalyzer();

  /**
   * Enrich a market signal with comprehensive analytics
   */
  async enrichSignal(
    signal: RawMarketSignal,
    context: ProcessingContext,
    config: {
      momentum: { enabled: boolean; priceWindow: number; volumeWindow: number; smoothingAlpha: number };
      orderBookAnalysis: { enabled: boolean; depthLevels: number; imbalanceThreshold: number };
      liquidityAnalysis: { enabled: boolean; minDepthLevels: number };
      volatilityCalculation: { enabled: boolean; windowSize: number; annualizationFactor: number };
    }
  ): Promise<EnrichedMarketSignal> {
    const startTime = Date.now();
    const enrichmentVersion = '1.0.0';

    // Initialize enriched signal
    const enrichedSignal: EnrichedMarketSignal = {
      ...signal,
      enrichedAt: new Date(),
      enrichmentVersion,
      processingLatency: 0,
      confidence: 1.0,
      momentum: {
        priceMomentum: 0,
        volumeMomentum: 0,
        priceVelocity: 0,
        volumeVelocity: 0,
        acceleration: 0,
        momentumScore: 0,
        trendStrength: 0,
        trendDirection: 'sideways',
      },
    };

    try {
      // Calculate momentum metrics
      if (config.momentum.enabled) {
        enrichedSignal.momentum = this.momentumCalculator.calculateMomentum(
          signal,
          context,
          config.momentum
        );
      }

      // Calculate order-book imbalance (for orderbook signals)
      if (config.orderBookAnalysis.enabled && signal.signalType === 'orderbook') {
        enrichedSignal.orderBookImbalance = this.orderBookAnalyzer.calculateOrderBookImbalance(
          signal as RawMarketSignal & { signalType: 'orderbook' }
        );
      }

      // Calculate liquidity metrics (for orderbook signals)
      if (config.liquidityAnalysis.enabled && signal.signalType === 'orderbook') {
        enrichedSignal.liquidity = this.liquidityAnalyzer.calculateLiquidityMetrics(
          signal as RawMarketSignal & { signalType: 'orderbook' }
        );
      }

      // Calculate volatility metrics (for all signal types with price data)
      if (config.volatilityCalculation.enabled &&
          (signal.signalType === 'trade' || signal.signalType === 'quote')) {
        // In practice, would need historical price data - simplified for now
        enrichedSignal.volatility = this.volatilityCalculator.calculateVolatilityMetrics(
          signal,
          [], // Placeholder for historical prices
          config.volatilityCalculation
        );
      }

      // Analyze market microstructure
      enrichedSignal.microstructure = this.microstructureAnalyzer.analyzeMarketStructure(
        signal,
        enrichedSignal.orderBookImbalance,
        enrichedSignal.liquidity,
        enrichedSignal.volatility
      );

      // Calculate processing latency and confidence
      enrichedSignal.processingLatency = Date.now() - startTime;
      enrichedSignal.confidence = this.calculateEnrichmentConfidence(enrichedSignal);

    } catch (error: any) {
      context.errors.push(`Enrichment failed: ${error.message}`);
      enrichedSignal.confidence = 0.5; // Reduced confidence on error
    }

    return enrichedSignal;
  }

  private calculateEnrichmentConfidence(enrichedSignal: EnrichedMarketSignal): number {
    let confidence = 1.0;

    // Reduce confidence if there were errors
    if (enrichedSignal.processingLatency > 1000) {
      confidence -= 0.1; // High latency reduces confidence
    }

    // Reduce confidence based on missing data
    if (!enrichedSignal.orderBookImbalance) confidence -= 0.1;
    if (!enrichedSignal.liquidity) confidence -= 0.1;
    if (!enrichedSignal.volatility) confidence -= 0.1;

    return Math.max(0.1, confidence);
  }
}
