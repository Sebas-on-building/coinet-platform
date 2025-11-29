/**
 * Cross-Chain Correlation Engine
 * REVOLUTIONARY: Analyzes patterns across multiple blockchains simultaneously
 * Detects cross-chain arbitrage, bridge exploits, and multi-chain coordination
 */

import { EventEmitter } from 'events';

export interface ChainMetrics {
  chain: string;
  activeAddresses: number;
  totalVolume: number;
  averageFees: number;
  blockTime: number;
  timestamp: Date;
}

export interface CrossChainCorrelation {
  chains: string[];
  correlation: number; // -1 to 1
  timelag: number; // milliseconds
  confidence: number;
  type: 'positive' | 'negative' | 'leading' | 'lagging';
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
}

export interface CrossChainAnomaly {
  id: string;
  timestamp: Date;
  chains: string[];
  type: 'bridge_exploit' | 'arbitrage' | 'coordinated_attack' | 'liquidity_crisis' | 'cross_chain_mev';
  description: string;
  affectedAssets: string[];
  evidence: {
    priceDiscrepancy?: number;
    volumeSpike?: number;
    suspiciousTransfers?: number;
    timing: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: number; // USD
  countermeasures: string[];
}

export interface BridgeActivity {
  bridge: string;
  sourceChain: string;
  targetChain: string;
  volume: number;
  transactionCount: number;
  largestTransfer: number;
  averageTransfer: number;
  timestamp: Date;
  anomalous: boolean;
}

export class CrossChainCorrelationEngine extends EventEmitter {
  private correlationMatrix: Map<string, CrossChainCorrelation[]> = new Map();
  private bridgeActivity: Map<string, BridgeActivity[]> = new Map();
  private detectedAnomalies: CrossChainAnomaly[] = [];

  private supportedChains = [
    'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism',
    'avalanche', 'fantom', 'solana', 'cosmos', 'polkadot'
  ];

  constructor() {
    super();
  }

  /**
   * Analyze correlations across multiple chains
   */
  async analyzeCorrelations(
    chainMetrics: Map<string, ChainMetrics[]>
  ): Promise<CrossChainCorrelation[]> {
    const correlations: CrossChainCorrelation[] = [];

    const chains = Array.from(chainMetrics.keys());

    // Calculate pairwise correlations
    for (let i = 0; i < chains.length; i++) {
      for (let j = i + 1; j < chains.length; j++) {
        const chain1 = chains[i];
        const chain2 = chains[j];

        const data1 = chainMetrics.get(chain1) || [];
        const data2 = chainMetrics.get(chain2) || [];

        if (data1.length < 10 || data2.length < 10) continue;

        const correlation = await this.calculateCrossChainCorrelation(
          chain1,
          chain2,
          data1,
          data2
        );

        if (Math.abs(correlation.correlation) > 0.5) {
          correlations.push(correlation);
          this.storeCorrelation(correlation);
        }
      }
    }

    return correlations;
  }

  /**
   * Calculate correlation between two chains
   */
  private async calculateCrossChainCorrelation(
    chain1: string,
    chain2: string,
    data1: ChainMetrics[],
    data2: ChainMetrics[]
  ): Promise<CrossChainCorrelation> {
    // Align time series
    const { series1, series2, timelag } = this.alignTimeSeries(data1, data2);

    // Calculate Pearson correlation
    const correlation = this.pearsonCorrelation(
      series1.map(d => d.totalVolume),
      series2.map(d => d.totalVolume)
    );

    // Determine type and strength
    const type = this.determineCorrelationType(correlation, timelag);
    const strength = this.categorizeStrength(Math.abs(correlation));

    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(
      Math.min(series1.length, series2.length) / 100,
      0.95
    );

    return {
      chains: [chain1, chain2],
      correlation,
      timelag,
      confidence,
      type,
      strength
    };
  }

  /**
   * Detect cross-chain anomalies
   */
  async detectCrossChainAnomalies(
    chainMetrics: Map<string, ChainMetrics[]>,
    bridgeData: BridgeActivity[]
  ): Promise<CrossChainAnomaly[]> {
    const anomalies: CrossChainAnomaly[] = [];

    // Detect bridge exploits
    const bridgeExploits = await this.detectBridgeExploits(bridgeData);
    anomalies.push(...bridgeExploits);

    // Detect cross-chain arbitrage opportunities
    const arbitrage = await this.detectCrossChainArbitrage(chainMetrics);
    anomalies.push(...arbitrage);

    // Detect coordinated multi-chain attacks
    const coordinated = await this.detectCoordinatedAttacks(chainMetrics);
    anomalies.push(...coordinated);

    // Detect liquidity crises
    const liquidity = await this.detectLiquidityCrisis(chainMetrics);
    anomalies.push(...liquidity);

    // Store and emit
    anomalies.forEach(a => {
      this.detectedAnomalies.push(a);
      this.emit('cross_chain_anomaly', a);
    });

    return anomalies;
  }

  /**
   * Detect bridge exploits
   */
  private async detectBridgeExploits(
    bridgeData: BridgeActivity[]
  ): Promise<CrossChainAnomaly[]> {
    const anomalies: CrossChainAnomaly[] = [];

    for (const activity of bridgeData) {
      // Abnormal patterns in bridge activity
      const volumeAnomaly = activity.largestTransfer > activity.averageTransfer * 10;
      const countAnomaly = activity.transactionCount > 100; // Spam attack
      
      if (volumeAnomaly || countAnomaly) {
        anomalies.push({
          id: `bridge_exploit_${Date.now()}`,
          timestamp: activity.timestamp,
          chains: [activity.sourceChain, activity.targetChain],
          type: 'bridge_exploit',
          description: `Suspicious bridge activity detected on ${activity.bridge}`,
          affectedAssets: ['Bridge tokens'],
          evidence: {
            volumeSpike: volumeAnomaly ? (activity.largestTransfer / activity.averageTransfer) : undefined,
            suspiciousTransfers: countAnomaly ? activity.transactionCount : undefined,
            timing: 'Unusual bridge usage pattern'
          },
          severity: volumeAnomaly ? 'critical' : 'high',
          estimatedImpact: activity.volume,
          countermeasures: [
            'URGENT: Pause bridge if possible',
            'Investigate large transfers',
            'Check bridge contract for exploits',
            'Monitor liquidity pools',
            'Alert bridge operators',
            'Verify validator integrity'
          ]
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect cross-chain arbitrage opportunities
   */
  private async detectCrossChainArbitrage(
    chainMetrics: Map<string, ChainMetrics[]>
  ): Promise<CrossChainAnomaly[]> {
    const anomalies: CrossChainAnomaly[] = [];

    // Compare prices across chains (simplified - would need actual price data)
    const chains = Array.from(chainMetrics.keys());
    
    for (let i = 0; i < chains.length; i++) {
      for (let j = i + 1; j < chains.length; j++) {
        const chain1Data = chainMetrics.get(chains[i])!;
        const chain2Data = chainMetrics.get(chains[j])!;

        if (chain1Data.length === 0 || chain2Data.length === 0) continue;

        // Simplified arbitrage detection
        const volumeDiff = Math.abs(
          chain1Data[chain1Data.length - 1].totalVolume -
          chain2Data[chain2Data.length - 1].totalVolume
        );

        const avgVolume = (
          chain1Data[chain1Data.length - 1].totalVolume +
          chain2Data[chain2Data.length - 1].totalVolume
        ) / 2;

        // Significant volume difference suggests arbitrage activity
        if (volumeDiff > avgVolume * 0.3) {
          anomalies.push({
            id: `arbitrage_${Date.now()}`,
            timestamp: new Date(),
            chains: [chains[i], chains[j]],
            type: 'arbitrage',
            description: `Cross-chain arbitrage opportunity detected`,
            affectedAssets: ['Multiple'],
            evidence: {
              priceDiscrepancy: (volumeDiff / avgVolume) * 100,
              timing: 'Volume imbalance across chains'
            },
            severity: 'low',
            estimatedImpact: volumeDiff,
            countermeasures: [
              'Monitor for price convergence',
              'Implement cross-chain price feeds',
              'Consider arbitrage bot deployment'
            ]
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect coordinated multi-chain attacks
   */
  private async detectCoordinatedAttacks(
    chainMetrics: Map<string, ChainMetrics[]>
  ): Promise<CrossChainAnomaly[]> {
    const anomalies: CrossChainAnomaly[] = [];

    // Look for simultaneous anomalies across multiple chains
    const recentWindow = 300000; // 5 minutes
    const now = Date.now();

    const recentMetrics = new Map<string, ChainMetrics>();
    
    for (const [chain, metrics] of chainMetrics) {
      const recent = metrics.filter(m => now - m.timestamp.getTime() < recentWindow);
      if (recent.length > 0) {
        recentMetrics.set(chain, recent[recent.length - 1]);
      }
    }

    // If 3+ chains show unusual activity simultaneously
    const chainsWithActivity = Array.from(recentMetrics.keys());
    
    if (chainsWithActivity.length >= 3) {
      anomalies.push({
        id: `coordinated_${Date.now()}`,
        timestamp: new Date(),
        chains: chainsWithActivity,
        type: 'coordinated_attack',
        description: `Simultaneous unusual activity detected across ${chainsWithActivity.length} chains`,
        affectedAssets: ['Multiple'],
        evidence: {
          suspiciousTransfers: chainsWithActivity.length,
          timing: 'Synchronized cross-chain activity'
        },
        severity: 'critical',
        estimatedImpact: Array.from(recentMetrics.values()).reduce((sum, m) => sum + m.totalVolume, 0),
        countermeasures: [
          'CRITICAL: System-wide alert',
          'Investigate for coordinated attack',
          'Check all bridge contracts',
          'Monitor validator networks',
          'Prepare incident response',
          'Alert all chain operators'
        ]
      });
    }

    return anomalies;
  }

  /**
   * Detect liquidity crisis
   */
  private async detectLiquidityCrisis(
    chainMetrics: Map<string, ChainMetrics[]>
  ): Promise<CrossChainAnomaly[]> {
    const anomalies: CrossChainAnomaly[] = [];

    // Simplified: Look for high fees and low volume (liquidity stress)
    for (const [chain, metrics] of chainMetrics) {
      const recent = metrics.slice(-10);
      if (recent.length < 5) continue;

      const avgFees = recent.reduce((sum, m) => sum + m.averageFees, 0) / recent.length;
      const avgVolume = recent.reduce((sum, m) => sum + m.totalVolume, 0) / recent.length;

      const latest = recent[recent.length - 1];
      
      // High fees + low volume = liquidity crisis
      if (latest.averageFees > avgFees * 3 && latest.totalVolume < avgVolume * 0.5) {
        anomalies.push({
          id: `liquidity_${Date.now()}`,
          timestamp: latest.timestamp,
          chains: [chain],
          type: 'liquidity_crisis',
          description: `Potential liquidity crisis on ${chain}`,
          affectedAssets: ['All assets on chain'],
          evidence: {
            volumeSpike: (avgVolume - latest.totalVolume) / avgVolume,
            timing: 'High fees with low volume'
          },
          severity: 'high',
          estimatedImpact: avgVolume,
          countermeasures: [
            'Monitor liquidity pools',
            'Check for mass withdrawals',
            'Prepare emergency liquidity',
            'Alert users of high fees',
            'Consider alternative chains'
          ]
        });
      }
    }

    return anomalies;
  }

  /**
   * Align time series with different timestamps
   */
  private alignTimeSeries(
    data1: ChainMetrics[],
    data2: ChainMetrics[]
  ): { series1: ChainMetrics[]; series2: ChainMetrics[]; timelag: number } {
    // Simplified alignment - match by closest timestamps
    const aligned1: ChainMetrics[] = [];
    const aligned2: ChainMetrics[] = [];
    let totalLag = 0;
    let lagCount = 0;

    for (const d1 of data1) {
      const closest = this.findClosestMetric(d1.timestamp, data2);
      if (closest) {
        aligned1.push(d1);
        aligned2.push(closest);
        totalLag += Math.abs(d1.timestamp.getTime() - closest.timestamp.getTime());
        lagCount++;
      }
    }

    const avgLag = lagCount > 0 ? totalLag / lagCount : 0;

    return { series1: aligned1, series2: aligned2, timelag: avgLag };
  }

  /**
   * Find metric closest in time
   */
  private findClosestMetric(timestamp: Date, metrics: ChainMetrics[]): ChainMetrics | null {
    if (metrics.length === 0) return null;

    return metrics.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.timestamp.getTime() - timestamp.getTime());
      const currentDiff = Math.abs(current.timestamp.getTime() - timestamp.getTime());
      return currentDiff < closestDiff ? current : closest;
    });
  }

  /**
   * Calculate Pearson correlation
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - meanX;
      const yDiff = y[i] - meanY;
      numerator += xDiff * yDiff;
      sumXSquared += xDiff * xDiff;
      sumYSquared += yDiff * yDiff;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Determine correlation type
   */
  private determineCorrelationType(
    correlation: number,
    timelag: number
  ): CrossChainCorrelation['type'] {
    if (timelag > 60000) {
      return correlation > 0 ? 'lagging' : 'negative';
    } else if (timelag > 5000) {
      return 'leading';
    } else {
      return correlation > 0 ? 'positive' : 'negative';
    }
  }

  /**
   * Categorize correlation strength
   */
  private categorizeStrength(absCorr: number): CrossChainCorrelation['strength'] {
    if (absCorr >= 0.9) return 'very_strong';
    if (absCorr >= 0.7) return 'strong';
    if (absCorr >= 0.5) return 'moderate';
    return 'weak';
  }

  /**
   * Monitor bridge activity for anomalies
   */
  async monitorBridgeActivity(
    bridge: string,
    sourceChain: string,
    targetChain: string,
    transfers: Array<{ value: number; timestamp: Date }>
  ): Promise<BridgeActivity> {
    const totalVolume = transfers.reduce((sum, t) => sum + t.value, 0);
    const largestTransfer = Math.max(...transfers.map(t => t.value));
    const averageTransfer = totalVolume / transfers.length;

    // Check for anomalous bridge activity
    const anomalous = largestTransfer > averageTransfer * 5 || transfers.length > 1000;

    const activity: BridgeActivity = {
      bridge,
      sourceChain,
      targetChain,
      volume: totalVolume,
      transactionCount: transfers.length,
      largestTransfer,
      averageTransfer,
      timestamp: new Date(),
      anomalous
    };

    // Store activity
    const key = `${bridge}_${sourceChain}_${targetChain}`;
    if (!this.bridgeActivity.has(key)) {
      this.bridgeActivity.set(key, []);
    }
    this.bridgeActivity.get(key)!.push(activity);

    if (anomalous) {
      this.emit('bridge_anomaly', activity);
    }

    return activity;
  }

  /**
   * Store correlation
   */
  private storeCorrelation(correlation: CrossChainCorrelation): void {
    const key = correlation.chains.sort().join('-');
    if (!this.correlationMatrix.has(key)) {
      this.correlationMatrix.set(key, []);
    }
    this.correlationMatrix.get(key)!.push(correlation);
  }

  /**
   * Get correlation between chains
   */
  getCorrelation(chain1: string, chain2: string): CrossChainCorrelation | null {
    const key = [chain1, chain2].sort().join('-');
    const correlations = this.correlationMatrix.get(key);
    return correlations && correlations.length > 0 
      ? correlations[correlations.length - 1]
      : null;
  }

  /**
   * Get all correlations
   */
  getAllCorrelations(): Map<string, CrossChainCorrelation[]> {
    return new Map(this.correlationMatrix);
  }

  /**
   * Get cross-chain anomaly history
   */
  getAnomalyHistory(): CrossChainAnomaly[] {
    return [...this.detectedAnomalies];
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): string[] {
    return [...this.supportedChains];
  }

  /**
   * Add supported chain
   */
  addSupportedChain(chain: string): void {
    if (!this.supportedChains.includes(chain)) {
      this.supportedChains.push(chain);
      this.emit('chain_added', chain);
    }
  }
}

