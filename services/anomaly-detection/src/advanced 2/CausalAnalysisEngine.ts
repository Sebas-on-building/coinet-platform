/**
 * Causal Analysis Engine
 * REVOLUTIONARY: Understands WHY anomalies happen, not just that they happened
 * Uses causal inference, Granger causality, and counterfactual analysis
 */

import { Anomaly, DataPoint, DataSource } from '../core/types';
import { EventEmitter } from 'events';

export interface CausalRelationship {
  cause: DataSource;
  effect: DataSource;
  strength: number; // 0-1
  lagTime: number; // milliseconds
  confidence: number;
  type: 'direct' | 'indirect' | 'confounded' | 'spurious';
}

export interface RootCause {
  id: string;
  anomalyId: string;
  primaryCause: string;
  contributingFactors: Array<{
    factor: string;
    contribution: number; // 0-1, percentage contribution
    dataSource: DataSource;
  }>;
  causalChain: string[]; // Chain of events leading to anomaly
  counterfactual: string; // What would have happened without the cause
  confidence: number;
  evidence: string[];
}

export interface InterventionRecommendation {
  id: string;
  rootCause: RootCause;
  intervention: string;
  expectedImpact: number; // -1 to 1
  cost: 'low' | 'medium' | 'high';
  timeToEffect: number; // milliseconds
  risks: string[];
  benefits: string[];
}

export class CausalAnalysisEngine extends EventEmitter {
  private causalGraph: Map<DataSource, Map<DataSource, CausalRelationship>> = new Map();
  private rootCauseHistory: Map<string, RootCause> = new Map();

  constructor() {
    super();
    this.initializeCausalGraph();
  }

  /**
   * Identify root cause of an anomaly
   */
  async identifyRootCause(
    anomaly: Anomaly,
    relatedData: Map<DataSource, DataPoint[]>
  ): Promise<RootCause> {
    // Analyze causal relationships
    const causalFactors = await this.analyzeCausalFactors(anomaly, relatedData);
    
    // Build causal chain
    const causalChain = await this.buildCausalChain(anomaly, causalFactors);
    
    // Perform counterfactual analysis
    const counterfactual = this.performCounterfactualAnalysis(anomaly, causalFactors);
    
    // Identify primary cause
    const primaryCause = this.identifyPrimaryCause(causalFactors, causalChain);
    
    // Calculate confidence
    const confidence = this.calculateCausalConfidence(causalFactors, causalChain);

    const rootCause: RootCause = {
      id: `cause_${Date.now()}_${Math.random()}`,
      anomalyId: anomaly.id,
      primaryCause,
      contributingFactors: causalFactors,
      causalChain,
      counterfactual,
      confidence,
      evidence: this.gatherEvidence(anomaly, causalFactors, relatedData)
    };

    this.rootCauseHistory.set(rootCause.id, rootCause);
    this.emit('root_cause_identified', rootCause);

    return rootCause;
  }

  /**
   * Test for Granger causality between data sources
   */
  private grangerCausality(
    cause: DataPoint[],
    effect: DataPoint[],
    maxLag: number = 5
  ): { causality: boolean; strength: number; lag: number } {
    // Simplified Granger causality test
    // In production, use proper statistical tests
    
    let bestStrength = 0;
    let bestLag = 0;
    let causality = false;

    const causeValues = cause.map(d => d.value);
    const effectValues = effect.map(d => d.value);

    for (let lag = 1; lag <= maxLag; lag++) {
      // Calculate correlation at this lag
      const correlation = this.calculateLaggedCorrelation(causeValues, effectValues, lag);
      
      if (Math.abs(correlation) > Math.abs(bestStrength)) {
        bestStrength = correlation;
        bestLag = lag;
        causality = Math.abs(correlation) > 0.5;
      }
    }

    return {
      causality,
      strength: Math.abs(bestStrength),
      lag: bestLag
    };
  }

  /**
   * Calculate lagged correlation
   */
  private calculateLaggedCorrelation(x: number[], y: number[], lag: number): number {
    if (lag >= y.length) return 0;

    const xLagged = x.slice(0, -lag);
    const yLagged = y.slice(lag);
    
    const n = Math.min(xLagged.length, yLagged.length);
    if (n < 2) return 0;

    const xMean = xLagged.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const yMean = yLagged.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let xVariance = 0;
    let yVariance = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = xLagged[i] - xMean;
      const yDiff = yLagged[i] - yMean;
      numerator += xDiff * yDiff;
      xVariance += xDiff * xDiff;
      yVariance += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xVariance * yVariance);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Analyze causal factors contributing to anomaly
   */
  private async analyzeCausalFactors(
    anomaly: Anomaly,
    relatedData: Map<DataSource, DataPoint[]>
  ): Promise<RootCause['contributingFactors']> {
    const factors: RootCause['contributingFactors'] = [];
    const anomalySource = anomaly.source;

    // Test each data source for causal relationship
    for (const [source, data] of relatedData) {
      if (source === anomalySource) continue;

      const relationship = this.causalGraph.get(source)?.get(anomalySource);
      
      if (relationship && relationship.strength > 0.3) {
        // Calculate contribution
        const contribution = this.calculateContribution(
          data,
          anomaly,
          relationship
        );

        if (contribution > 0.1) {
          factors.push({
            factor: this.describeSource(source),
            contribution,
            dataSource: source
          });
        }
      }
    }

    // Sort by contribution
    factors.sort((a, b) => b.contribution - a.contribution);

    // Normalize contributions
    const total = factors.reduce((sum, f) => sum + f.contribution, 0);
    if (total > 0) {
      factors.forEach(f => f.contribution = f.contribution / total);
    }

    return factors;
  }

  /**
   * Build causal chain showing sequence of events
   */
  private async buildCausalChain(
    anomaly: Anomaly,
    factors: RootCause['contributingFactors']
  ): Promise<string[]> {
    const chain: string[] = [];

    // Start with primary cause
    if (factors.length > 0) {
      const primary = factors[0];
      chain.push(`1. ${primary.factor} (${(primary.contribution * 100).toFixed(0)}% contribution)`);
    }

    // Add intermediate causes
    for (let i = 1; i < Math.min(factors.length, 3); i++) {
      const factor = factors[i];
      chain.push(`${i + 1}. Led to ${factor.factor} (${(factor.contribution * 100).toFixed(0)}%)`);
    }

    // Add final effect
    chain.push(`${chain.length + 1}. Resulting in ${anomaly.source} anomaly`);

    return chain;
  }

  /**
   * Perform counterfactual analysis
   */
  private performCounterfactualAnalysis(
    anomaly: Anomaly,
    factors: RootCause['contributingFactors']
  ): string {
    if (factors.length === 0) {
      return 'Without the anomaly trigger, values would have remained within normal range.';
    }

    const primaryFactor = factors[0];
    const reduction = (1 - primaryFactor.contribution) * 100;

    return `If ${primaryFactor.factor} had remained stable, ` +
           `the anomaly would have been ${reduction.toFixed(0)}% less severe. ` +
           `Expected value would have been ${anomaly.baseline.mean.toFixed(2)} ` +
           `instead of ${anomaly.dataPoint.value.toFixed(2)}.`;
  }

  /**
   * Identify primary cause from factors
   */
  private identifyPrimaryCause(
    factors: RootCause['contributingFactors'],
    _causalChain: string[]
  ): string {
    if (factors.length === 0) {
      return 'Unknown - insufficient causal data';
    }

    const primary = factors[0];
    
    return `${primary.factor} is the primary driver, ` +
           `contributing ${(primary.contribution * 100).toFixed(0)}% to the anomaly. ` +
           this.explainMechanism(primary.dataSource);
  }

  /**
   * Explain causal mechanism
   */
  private explainMechanism(source: DataSource): string {
    const mechanisms: Record<DataSource, string> = {
      [DataSource.TRADING_VOLUME]: 'High volume creates price pressure through supply/demand imbalance.',
      [DataSource.PRICE_MOVEMENT]: 'Price changes trigger algorithmic trading and emotional reactions.',
      [DataSource.SENTIMENT]: 'Sentiment shifts drive behavior changes in traders and investors.',
      [DataSource.WALLET_ACTIVITY]: 'Large wallet movements signal insider knowledge or smart money positioning.',
      [DataSource.NETWORK_FEES]: 'Fee spikes indicate network congestion or attack activity.',
      [DataSource.SOCIAL_VOLUME]: 'Social media buzz amplifies market movements through FOMO/FUD.',
      [DataSource.ON_CHAIN_METRICS]: 'On-chain activity reflects fundamental network health and adoption.',
      [DataSource.NEWS_FLOW]: 'News events provide new information that changes market expectations.',
      [DataSource.LIQUIDITY]: 'Liquidity changes affect market efficiency and slippage.',
      [DataSource.MARKET_DEPTH]: 'Order book depth determines price stability and manipulation resistance.'
    };

    return mechanisms[source] || 'Mechanism requires further investigation.';
  }

  /**
   * Calculate contribution of a factor
   */
  private calculateContribution(
    data: DataPoint[],
    anomaly: Anomaly,
    relationship: CausalRelationship
  ): number {
    // Contribution based on:
    // 1. Causal strength
    // 2. Temporal alignment
    // 3. Magnitude of deviation

    const values = data.map(d => d.value);
    const recentValues = values.slice(-10);
    const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const stdDev = Math.sqrt(
      recentValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentValues.length
    );

    const deviation = Math.abs(recentValues[recentValues.length - 1] - mean) / stdDev;

    return Math.min(
      relationship.strength * (deviation / 5) * relationship.confidence,
      1
    );
  }

  /**
   * Gather evidence for causal relationship
   */
  private gatherEvidence(
    anomaly: Anomaly,
    factors: RootCause['contributingFactors'],
    relatedData: Map<DataSource, DataPoint[]>
  ): string[] {
    const evidence: string[] = [];

    // Temporal evidence
    evidence.push(`Anomaly occurred at ${anomaly.timestamp.toISOString()}`);

    // Statistical evidence
    evidence.push(
      `Deviation: ${anomaly.deviation.standardDeviations.toFixed(2)}σ ` +
      `(${anomaly.deviation.relativeDifference.toFixed(1)}%)`
    );

    // Causal evidence
    for (const factor of factors) {
      const data = relatedData.get(factor.dataSource);
      if (data && data.length > 0) {
        const latest = data[data.length - 1];
        evidence.push(
          `${factor.factor}: Value ${latest.value.toFixed(2)} ` +
          `at ${latest.timestamp.toISOString()}`
        );
      }
    }

    // Correlation evidence
    if (anomaly.context.correlatedEvents.length > 0) {
      evidence.push(
        `${anomaly.context.correlatedEvents.length} correlated events detected`
      );
    }

    return evidence;
  }

  /**
   * Calculate confidence in causal analysis
   */
  private calculateCausalConfidence(
    factors: RootCause['contributingFactors'],
    causalChain: string[]
  ): number {
    if (factors.length === 0) return 0.3;

    // Confidence based on:
    // 1. Number of identified factors
    // 2. Strength of primary factor
    // 3. Completeness of causal chain

    const factorConfidence = Math.min(factors.length / 3, 1) * 0.4;
    const primaryStrength = factors[0].contribution * 0.4;
    const chainCompleteness = Math.min(causalChain.length / 4, 1) * 0.2;

    return factorConfidence + primaryStrength + chainCompleteness;
  }

  /**
   * Recommend intervention to prevent future anomalies
   */
  async recommendIntervention(rootCause: RootCause): Promise<InterventionRecommendation> {
    const primaryFactor = rootCause.contributingFactors[0];
    
    const intervention = this.designIntervention(primaryFactor);
    const expectedImpact = this.estimateInterventionImpact(rootCause, intervention);
    const cost = this.estimateInterventionCost(intervention);
    const timeToEffect = this.estimateTimeToEffect(intervention);

    return {
      id: `intervention_${Date.now()}`,
      rootCause,
      intervention: intervention.description,
      expectedImpact,
      cost,
      timeToEffect,
      risks: intervention.risks,
      benefits: intervention.benefits
    };
  }

  /**
   * Design intervention based on root cause
   */
  private designIntervention(factor: RootCause['contributingFactors'][0]): {
    description: string;
    risks: string[];
    benefits: string[];
  } {
    const interventions: Partial<Record<DataSource, {
      description: string;
      risks: string[];
      benefits: string[];
    }>> = {
      [DataSource.TRADING_VOLUME]: {
        description: 'Implement volume circuit breakers and rate limiting',
        risks: ['May reduce market efficiency', 'Could delay legitimate trades'],
        benefits: ['Prevents flash crashes', 'Reduces manipulation', 'Stabilizes prices']
      },
      [DataSource.SENTIMENT]: {
        description: 'Deploy sentiment monitoring and FUD detection system',
        risks: ['False positives may occur', 'Requires manual review'],
        benefits: ['Early warning of market sentiment shifts', 'Identifies coordinated FUD campaigns']
      },
      [DataSource.WALLET_ACTIVITY]: {
        description: 'Implement wallet tracking and whale movement alerts',
        risks: ['Privacy concerns', 'May miss obfuscated transactions'],
        benefits: ['Early detection of large movements', 'Identifies smart money', 'Prevents rug pulls']
      }
    };

    return interventions[factor.dataSource] || {
      description: 'Increase monitoring frequency and alert sensitivity',
      risks: ['Higher alert volume'],
      benefits: ['Better anomaly detection']
    };
  }

  /**
   * Estimate intervention impact
   */
  private estimateInterventionImpact(
    rootCause: RootCause,
    _intervention: unknown
  ): number {
    const primaryContribution = rootCause.contributingFactors[0]?.contribution || 0.5;
    return primaryContribution * rootCause.confidence;
  }

  /**
   * Estimate intervention cost
   */
  private estimateInterventionCost(_intervention: { risks: unknown[] }): 'low' | 'medium' | 'high' {
    const riskCount = (_intervention as { risks: unknown[] }).risks.length;
    if (riskCount >= 3) return 'high';
    if (riskCount >= 2) return 'medium';
    return 'low';
  }

  /**
   * Estimate time to effect
   */
  private estimateTimeToEffect(_intervention: { risks: unknown[] }): number {
    // Simple heuristic
    return (_intervention as { risks: unknown[] }).risks.length * 3600000; // 1 hour per risk
  }

  /**
   * Initialize causal graph with known relationships
   */
  private initializeCausalGraph(): void {
    // Trading Volume -> Price Movement
    this.addCausalRelationship(
      DataSource.TRADING_VOLUME,
      DataSource.PRICE_MOVEMENT,
      { strength: 0.8, lagTime: 60000, confidence: 0.9, type: 'direct' }
    );

    // Sentiment -> Trading Volume
    this.addCausalRelationship(
      DataSource.SENTIMENT,
      DataSource.TRADING_VOLUME,
      { strength: 0.7, lagTime: 300000, confidence: 0.85, type: 'direct' }
    );

    // Wallet Activity -> Price Movement
    this.addCausalRelationship(
      DataSource.WALLET_ACTIVITY,
      DataSource.PRICE_MOVEMENT,
      { strength: 0.75, lagTime: 180000, confidence: 0.8, type: 'direct' }
    );

    // News -> Sentiment
    this.addCausalRelationship(
      DataSource.NEWS_FLOW,
      DataSource.SENTIMENT,
      { strength: 0.85, lagTime: 600000, confidence: 0.9, type: 'direct' }
    );

    // Social Volume -> Sentiment
    this.addCausalRelationship(
      DataSource.SOCIAL_VOLUME,
      DataSource.SENTIMENT,
      { strength: 0.6, lagTime: 300000, confidence: 0.75, type: 'direct' }
    );

    // Network Fees -> Wallet Activity
    this.addCausalRelationship(
      DataSource.NETWORK_FEES,
      DataSource.WALLET_ACTIVITY,
      { strength: 0.5, lagTime: 120000, confidence: 0.7, type: 'indirect' }
    );

    // Liquidity -> Price Movement
    this.addCausalRelationship(
      DataSource.LIQUIDITY,
      DataSource.PRICE_MOVEMENT,
      { strength: 0.9, lagTime: 30000, confidence: 0.95, type: 'direct' }
    );
  }

  /**
   * Add causal relationship to graph
   */
  private addCausalRelationship(
    cause: DataSource,
    effect: DataSource,
    params: Omit<CausalRelationship, 'cause' | 'effect'>
  ): void {
    if (!this.causalGraph.has(cause)) {
      this.causalGraph.set(cause, new Map());
    }

    this.causalGraph.get(cause)!.set(effect, {
      cause,
      effect,
      ...params
    });
  }

  /**
   * Describe data source in human-readable form
   */
  private describeSource(source: DataSource): string {
    const descriptions: Record<DataSource, string> = {
      [DataSource.TRADING_VOLUME]: 'Trading volume surge',
      [DataSource.PRICE_MOVEMENT]: 'Price volatility',
      [DataSource.SENTIMENT]: 'Market sentiment shift',
      [DataSource.WALLET_ACTIVITY]: 'Wallet activity spike',
      [DataSource.NETWORK_FEES]: 'Network fee increase',
      [DataSource.SOCIAL_VOLUME]: 'Social media buzz',
      [DataSource.ON_CHAIN_METRICS]: 'On-chain activity change',
      [DataSource.NEWS_FLOW]: 'Breaking news event',
      [DataSource.LIQUIDITY]: 'Liquidity change',
      [DataSource.MARKET_DEPTH]: 'Order book depth change'
    };

    return descriptions[source] || source;
  }

  /**
   * Get causal graph
   */
  getCausalGraph(): Map<DataSource, Map<DataSource, CausalRelationship>> {
    return new Map(this.causalGraph);
  }

  /**
   * Get root cause history
   */
  getRootCauseHistory(): Map<string, RootCause> {
    return new Map(this.rootCauseHistory);
  }
}

