/**
 * Arbitrage Detection System
 * REVOLUTIONARY: Advanced arbitrage detection with cross-chain analysis
 * Detects price discrepancies, MEV opportunities, and cross-chain arbitrage
 */

import { EventEmitter } from 'events';

export interface ArbitrageOpportunity {
  id: string;
  type: 'price_discrepancy' | 'mev_opportunity' | 'cross_chain' | 'triangular' | 'statistical';
  assets: string[];
  chains: string[];
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number; // Percentage
  estimatedProfit: number;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
  timeToExecute: number; // milliseconds
  gasCost: number;
  netProfit: number;
  timestamp: Date;
}

export interface CrossChainArbitrage {
  id: string;
  sourceChain: string;
  targetChain: string;
  bridge: string;
  asset: string;
  sourcePrice: number;
  targetPrice: number;
  bridgeFee: number;
  gasCost: number;
  estimatedProfit: number;
  executionTime: number;
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  timestamp: Date;
}

export interface MEVOpportunity {
  id: string;
  type: 'sandwich' | 'liquidation' | 'front_running' | 'back_running' | 'jito_tip';
  victim: string;
  profit: number;
  gasPrice: number;
  blockNumber: number;
  timestamp: Date;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
}

export interface ArbitrageAnalytics {
  totalOpportunities: number;
  totalProfit: number;
  averageSpread: number;
  bestChain: string;
  bestAsset: string;
  riskDistribution: Map<string, number>;
  timeDistribution: Map<string, number>;
  profitByType: Map<string, number>;
}

export class ArbitrageDetectionSystem extends EventEmitter {
  private opportunities: ArbitrageOpportunity[] = [];
  private crossChainArb: CrossChainArbitrage[] = [];
  private mevOpportunities: MEVOpportunity[] = [];
  private analytics: ArbitrageAnalytics;

  constructor() {
    super();
    this.analytics = this.initializeAnalytics();
  }

  /**
   * Detect arbitrage opportunities across exchanges
   */
  async detectArbitrage(
    priceData: Map<string, Map<string, number>>, // chain -> asset -> price
    _exchanges: string[]
  ): Promise<ArbitrageOpportunity[]> {
    // console.log(`🔍 Detecting arbitrage across ${_exchanges.length} exchanges...`);

    const opportunities: ArbitrageOpportunity[] = [];
    const chains = Array.from(priceData.keys());

    // Detect price discrepancies
    for (const chain of chains) {
      const chainPrices = priceData.get(chain);
      if (!chainPrices) continue;

      for (const asset of chainPrices.keys()) {
        const prices = _exchanges.map((_exchange) => chainPrices.get(asset) || 0);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);

        if (maxPrice > 0 && minPrice > 0) {
          const spread = ((maxPrice - minPrice) / minPrice) * 100;

          if (spread > 0.5) { // Minimum 0.5% spread
            const buyExchange = _exchanges[prices.indexOf(minPrice)];
            const sellExchange = _exchanges[prices.indexOf(maxPrice)];

            const estimatedProfit = this.calculateArbitrageProfit(
              minPrice,
              maxPrice,
              asset,
              1000 // $1000 trade size
            );

            opportunities.push({
              id: `arb_${Date.now()}_${asset}`,
              type: 'price_discrepancy',
              assets: [asset],
              chains: [chain],
              buyExchange,
              sellExchange,
              buyPrice: minPrice,
              sellPrice: maxPrice,
              spread,
              estimatedProfit,
              confidence: Math.min(spread / 5, 0.95),
              risk: spread > 5 ? 'high' : spread > 2 ? 'medium' : 'low',
              timeToExecute: 5000,
              gasCost: 10,
              netProfit: estimatedProfit - 10,
              timestamp: new Date()
            });
          }
        }
      }
    }

    this.opportunities.push(...opportunities);
    this.updateAnalytics(opportunities);

    // console.log(`✅ Detected ${opportunities.length} arbitrage opportunities`);
    opportunities.forEach(opp => {
      this.emit('arbitrage_detected', opp);
    });

    return opportunities;
  }

  /**
   * Detect cross-chain arbitrage opportunities
   */
  async detectCrossChainArbitrage(
    chainPrices: Map<string, Map<string, number>>,
    bridges: Map<string, { fee: number; time: number }>
  ): Promise<CrossChainArbitrage[]> {
    // console.log('🌐 Detecting cross-chain arbitrage opportunities...');

    const opportunities: CrossChainArbitrage[] = [];
    const chains = Array.from(chainPrices.keys());

    for (let i = 0; i < chains.length; i++) {
      for (let j = i + 1; j < chains.length; j++) {
        const chain1 = chains[i];
        const chain2 = chains[j];

        const prices1 = chainPrices.get(chain1);
        const prices2 = chainPrices.get(chain2);

        if (!prices1 || !prices2) continue;

        for (const asset of prices1.keys()) {
          if (!prices2.has(asset)) continue;

          const price1 = prices1.get(asset)!;
          const price2 = prices2.get(asset)!;

          // Check if arbitrage exists
          const priceDiff = Math.abs(price1 - price2);
          const avgPrice = (price1 + price2) / 2;

          if (priceDiff > avgPrice * 0.01) { // 1% difference
            const sourceChain = price1 < price2 ? chain1 : chain2;
            const targetChain = price1 < price2 ? chain2 : chain1;
            const sourcePrice = price1 < price2 ? price1 : price2;
            const targetPrice = price1 < price2 ? price2 : price1;

            // Find best bridge
            const bridge = this.findBestBridge(sourceChain, targetChain, bridges);
            if (!bridge) continue;

            const bridgeFee = bridge.fee;
            const gasCost = 15; // Estimated gas cost
            const grossProfit = targetPrice - sourcePrice;
            const netProfit = grossProfit - bridgeFee - gasCost;

            if (netProfit > 0) {
              opportunities.push({
                id: `cross_chain_${Date.now()}_${asset}`,
                sourceChain,
                targetChain,
                bridge: bridge.name,
                asset,
                sourcePrice,
                targetPrice,
                bridgeFee,
                gasCost,
                estimatedProfit: netProfit,
                executionTime: bridge.time,
                risk: netProfit < 50 ? 'high' : netProfit < 200 ? 'medium' : 'low',
                confidence: Math.min(priceDiff / avgPrice, 0.9),
                timestamp: new Date()
              });
            }
          }
        }
      }
    }

    this.crossChainArb.push(...opportunities);
    // console.log(`✅ Detected ${opportunities.length} cross-chain arbitrage opportunities`);

    opportunities.forEach(opp => {
      this.emit('cross_chain_arbitrage_detected', opp);
    });

    return opportunities;
  }

  /**
   * Detect MEV opportunities
   */
  async detectMEVOpportunities(
    mempool: Array<{ txHash: string; gasPrice: number; value: number; to: string }>,
    _blockNumber: number
  ): Promise<MEVOpportunity[]> {
    // console.log(`⚡ Detecting MEV opportunities in block ${blockNumber}...`);

    const opportunities: MEVOpportunity[] = [];

    // Detect sandwich attacks
    const sandwichOpps = this.detectSandwichAttacks(mempool);
    opportunities.push(...sandwichOpps);

    // Detect liquidation opportunities
    const liquidationOpps = this.detectLiquidationOpportunities(mempool);
    opportunities.push(...liquidationOpps);

    // Detect front-running
    const frontRunOpps = this.detectFrontRunning(mempool);
    opportunities.push(...frontRunOpps);

    this.mevOpportunities.push(...opportunities);
    // console.log(`✅ Detected ${opportunities.length} MEV opportunities`);

    opportunities.forEach(opp => {
      this.emit('mev_opportunity_detected', opp);
    });

    return opportunities;
  }

  /**
   * Detect sandwich attacks
   */
  private detectSandwichAttacks(
    mempool: Array<{ txHash: string; gasPrice: number; value: number; to: string }>
  ): MEVOpportunity[] {
    const opportunities: MEVOpportunity[] = [];

    // Look for high-value transactions with low gas prices (potential victims)
    const victims = mempool.filter(tx =>
      tx.value > 1000 && tx.gasPrice < 50
    );

    // Look for high gas price transactions (potential attackers)
    const attackers = mempool.filter(tx =>
      tx.gasPrice > 100 && tx.value < 100
    );

    victims.forEach(victim => {
      // Check if there are attackers before and after
      const beforeAttackers = attackers.filter(tx =>
        tx.to === victim.to && tx.gasPrice > victim.gasPrice * 2
      );

      if (beforeAttackers.length > 0) {
        const profit = victim.value * 0.002; // Estimated profit

        opportunities.push({
          id: `sandwich_${Date.now()}`,
          type: 'sandwich',
          victim: victim.txHash,
          profit,
          gasPrice: victim.gasPrice,
          blockNumber: 0, // Would get from context
          timestamp: new Date(),
          confidence: 0.75,
          risk: profit < 100 ? 'high' : 'medium'
        });
      }
    });

    return opportunities;
  }

  /**
   * Detect liquidation opportunities
   */
  private detectLiquidationOpportunities(
    mempool: Array<{ txHash: string; gasPrice: number; value: number; to: string }>
  ): MEVOpportunity[] {
    const opportunities: MEVOpportunity[] = [];

    // Look for transactions to lending protocols (potential liquidations)
    const lendingProtocols = ['0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9']; // Aave, Compound, etc.

    lendingProtocols.forEach(protocol => {
      const liquidationTxs = mempool.filter(tx =>
        tx.to.toLowerCase() === protocol.toLowerCase() &&
        tx.gasPrice > 50 // High gas price for priority
      );

      liquidationTxs.forEach(tx => {
        const profit = tx.value * 0.01; // Estimated liquidation bonus

        opportunities.push({
          id: `liquidation_${Date.now()}`,
          type: 'liquidation',
          victim: tx.to,
          profit,
          gasPrice: tx.gasPrice,
          blockNumber: 0,
          timestamp: new Date(),
          confidence: 0.65,
          risk: profit < 50 ? 'high' : 'low'
        });
      });
    });

    return opportunities;
  }

  /**
   * Detect front-running opportunities
   */
  private detectFrontRunning(
    mempool: Array<{ txHash: string; gasPrice: number; value: number; to: string }>
  ): MEVOpportunity[] {
    const opportunities: MEVOpportunity[] = [];

    // Look for large DEX transactions (potential victims)
    const dexTxs = mempool.filter(tx =>
      tx.value > 10000 &&
      tx.to.toLowerCase().includes('0x') // DEX addresses
    );

    dexTxs.forEach(victim => {
      const frontRunners = mempool.filter(tx =>
        tx.to === victim.to &&
        tx.gasPrice > victim.gasPrice * 3 &&
        tx.value < victim.value / 10
      );

      frontRunners.forEach(frontRunner => {
        const profit = victim.value * 0.001; // Estimated profit

        opportunities.push({
          id: `frontrun_${Date.now()}`,
          type: 'front_running',
          victim: victim.txHash,
          profit,
          gasPrice: frontRunner.gasPrice,
          blockNumber: 0,
          timestamp: new Date(),
          confidence: 0.70,
          risk: 'medium'
        });
      });
    });

    return opportunities;
  }

  /**
   * Calculate arbitrage profit
   */
  private calculateArbitrageProfit(
    buyPrice: number,
    sellPrice: number,
    _asset: string,
    tradeSize: number
  ): number {
    const grossProfit = (sellPrice - buyPrice) * (tradeSize / buyPrice);
    const fees = tradeSize * 0.002; // 0.2% trading fees
    const slippage = grossProfit * 0.001; // 0.1% slippage

    return grossProfit - fees - slippage;
  }

  /**
   * Find best bridge for cross-chain arbitrage
   */
  private findBestBridge(
    sourceChain: string,
    targetChain: string,
    _bridges: Map<string, { fee: number; time: number }>
  ): { name: string; fee: number; time: number } | null {
    const bridgeKey = `${sourceChain}_${targetChain}`;
    const bridge = _bridges.get(bridgeKey);

    return bridge ? { name: bridgeKey, ...bridge } : null;
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): ArbitrageAnalytics {
    return {
      totalOpportunities: 0,
      totalProfit: 0,
      averageSpread: 0,
      bestChain: '',
      bestAsset: '',
      riskDistribution: new Map(),
      timeDistribution: new Map(),
      profitByType: new Map()
    };
  }

  /**
   * Update analytics
   */
  private updateAnalytics(opportunities: ArbitrageOpportunity[]): void {
    this.analytics.totalOpportunities += opportunities.length;
    this.analytics.totalProfit += opportunities.reduce((sum, opp) => sum + opp.estimatedProfit, 0);

    if (opportunities.length > 0) {
      this.analytics.averageSpread = opportunities.reduce((sum, opp) => sum + opp.spread, 0) / opportunities.length;

      // Find best chain
      const chainProfits = new Map<string, number>();
      opportunities.forEach(opp => {
        const profit = chainProfits.get(opp.chains[0]) || 0;
        chainProfits.set(opp.chains[0], profit + opp.estimatedProfit);
      });

      const bestChain = Array.from(chainProfits.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      this.analytics.bestChain = bestChain;

      // Find best asset
      const assetProfits = new Map<string, number>();
      opportunities.forEach(opp => {
        opp.assets.forEach(asset => {
          const profit = assetProfits.get(asset) || 0;
          assetProfits.set(asset, profit + opp.estimatedProfit);
        });
      });

      const bestAsset = Array.from(assetProfits.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      this.analytics.bestAsset = bestAsset;

      // Update risk distribution
      opportunities.forEach(opp => {
        const risk = this.analytics.riskDistribution.get(opp.risk) || 0;
        this.analytics.riskDistribution.set(opp.risk, risk + 1);
      });

      // Update type distribution
      opportunities.forEach(opp => {
        const profit = this.analytics.profitByType.get(opp.type) || 0;
        this.analytics.profitByType.set(opp.type, profit + opp.estimatedProfit);
      });
    }
  }

  /**
   * Get arbitrage opportunities
   */
  getArbitrageOpportunities(): ArbitrageOpportunity[] {
    return [...this.opportunities];
  }

  /**
   * Get cross-chain arbitrage
   */
  getCrossChainArbitrage(): CrossChainArbitrage[] {
    return [...this.crossChainArb];
  }

  /**
   * Get MEV opportunities
   */
  getMEVOpportunities(): MEVOpportunity[] {
    return [...this.mevOpportunities];
  }

  /**
   * Get analytics
   */
  getAnalytics(): ArbitrageAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get best opportunities
   */
  getBestOpportunities(limit: number = 10): ArbitrageOpportunity[] {
    return this.opportunities
      .sort((a, b) => b.estimatedProfit - a.estimatedProfit)
      .slice(0, limit);
  }

  /**
   * Clear old opportunities
   */
  clearOldOpportunities(olderThanHours: number = 24): number {
    const cutoff = Date.now() - olderThanHours * 3600000;
    const initialLength = this.opportunities.length;

    this.opportunities = this.opportunities.filter(opp => opp.timestamp.getTime() > cutoff);
    this.crossChainArb = this.crossChainArb.filter(arb => arb.timestamp.getTime() > cutoff);
    this.mevOpportunities = this.mevOpportunities.filter(mev => mev.timestamp.getTime() > cutoff);

    return initialLength - this.opportunities.length;
  }
}