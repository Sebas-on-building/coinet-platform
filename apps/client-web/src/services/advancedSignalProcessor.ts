import { supabase } from '@/integrations/supabase/client';
import type { AdvancedAlert, AlertSignal, MarketContext, ContextPack, SignalSource, AlertTrigger, WhaleActivity, NewsItem, TechnicalLevel } from '@/types/advancedAlerts';

export class AdvancedSignalProcessor {
  private static instance: AdvancedSignalProcessor;
  private sequenceTracking: Map<string, SequenceTracker> = new Map();
  private recentTriggers: Map<string, number> = new Map();

  static getInstance(): AdvancedSignalProcessor {
    if (!AdvancedSignalProcessor.instance) {
      AdvancedSignalProcessor.instance = new AdvancedSignalProcessor();
    }
    return AdvancedSignalProcessor.instance;
  }

  // ====== MULTI-SIGNAL FUSION ======

  async evaluateMultiSignalAlert(alert: AdvancedAlert, signalSources: SignalSource[]): Promise<{
    triggered: boolean;
    confidence: number;
    signalContributions: Record<string, number>;
    contextPack: ContextPack;
  }> {
    const signalResults: Record<string, { value: number; triggered: boolean; confidence: number; weight: number }> = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let triggeredSignals = 0;

    // Evaluate each signal
    for (const signal of alert.signals) {
      const result = await this.evaluateSignal(signal, signalSources);
      signalResults[signal.id] = result;
      
      if (result.triggered) {
        triggeredSignals++;
        totalWeightedScore += result.confidence * result.weight;
      }
      totalWeight += result.weight;
    }

    // Apply sequence logic if configured
    let sequenceMultiplier = 1.0;
    if (alert.sequence_config) {
      sequenceMultiplier = this.evaluateSequenceLogic(alert, signalResults);
    }

    // Calculate final confidence score
    const baseConfidence = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const finalConfidence = baseConfidence * sequenceMultiplier;

    // Check cooldown
    const cooldownKey = `${alert.id}`;
    const lastTrigger = this.recentTriggers.get(cooldownKey) || 0;
    const cooldownExpired = Date.now() - lastTrigger > (alert.cooldown_minutes * 60 * 1000);

    const triggered = finalConfidence >= alert.confidence_threshold && 
                     triggeredSignals > 0 && 
                     cooldownExpired;

    if (triggered) {
      this.recentTriggers.set(cooldownKey, Date.now());
    }

    // Generate rich context pack
    const contextPack = await this.generateEnhancedContextPack(alert, signalResults, signalSources);

    return {
      triggered,
      confidence: finalConfidence,
      signalContributions: Object.fromEntries(
        Object.entries(signalResults).map(([id, result]) => [id, result.confidence * result.weight])
      ),
      contextPack
    };
  }

  private async evaluateSignal(
    signal: AlertSignal, 
    signalSources: SignalSource[]
  ): Promise<{ value: number; triggered: boolean; confidence: number; weight: number }> {
    const source = signalSources.find(s => 
      s.source_name === signal.source_name && 
      (s.asset_symbol === signal.asset_symbol || !signal.asset_symbol)
    );

    if (!source || (source.confidence < signal.min_confidence)) {
      return { value: 0, triggered: false, confidence: 0, weight: signal.weight };
    }

    let signalValue = source.current_value || 0;
    let triggered = false;

    // Enhanced signal evaluation logic
    switch (signal.operator) {
      case 'gt':
        triggered = signalValue > signal.value;
        break;
      case 'lt':
        triggered = signalValue < signal.value;
        break;
      case 'z_score_gt':
        signalValue = source.z_score || 0;
        triggered = signalValue > signal.value;
        break;
      case 'crosses_above':
        triggered = (source.previous_value || 0) <= signal.value && signalValue > signal.value;
        break;
      case 'crosses_below':
        triggered = (source.previous_value || 0) >= signal.value && signalValue < signal.value;
        break;
      case 'rate_change_gt':
        signalValue = Math.abs(source.change_rate || 0);
        triggered = signalValue > signal.value;
        break;
      case 'divergence':
        // Check for correlation breaks or unusual patterns
        triggered = this.detectDivergence(source, signal.value);
        break;
    }

    // Apply adaptive baseline if enabled
    if (signal.z_score_threshold && source.z_score) {
      const zScoreTriggered = Math.abs(source.z_score) > signal.z_score_threshold;
      triggered = triggered && zScoreTriggered;
    }

    return {
      value: signalValue,
      triggered,
      confidence: source.confidence,
      weight: signal.weight
    };
  }

  private evaluateSequenceLogic(
    alert: AdvancedAlert, 
    signalResults: Record<string, { value: number; triggered: boolean; confidence: number; weight: number }>
  ): number {
    if (!alert.sequence_config) return 1.0;

    const { type, window_minutes, required_signals, logical_operator } = alert.sequence_config;
    
    switch (type) {
      case 'sequential':
        return this.evaluateSequentialLogic(alert.id, required_signals, signalResults, window_minutes);
      case 'parallel':
        return this.evaluateParallelLogic(required_signals, signalResults, logical_operator);
      case 'if_then':
        return this.evaluateIfThenLogic(required_signals, signalResults);
      default:
        return 1.0;
    }
  }

  private evaluateSequentialLogic(
    alertId: string, 
    requiredSignals: string[], 
    signalResults: Record<string, any>, 
    windowMinutes: number
  ): number {
    const trackerKey = `sequence_${alertId}`;
    let tracker = this.sequenceTracking.get(trackerKey);
    
    if (!tracker) {
      tracker = new SequenceTracker(requiredSignals, windowMinutes);
      this.sequenceTracking.set(trackerKey, tracker);
    }

    return tracker.updateSequence(signalResults);
  }

  private evaluateParallelLogic(
    requiredSignals: string[], 
    signalResults: Record<string, any>, 
    operator: 'AND' | 'OR'
  ): number {
    const triggeredRequired = requiredSignals.filter(id => signalResults[id]?.triggered);
    
    if (operator === 'AND') {
      return triggeredRequired.length === requiredSignals.length ? 1.2 : 0.8;
    } else {
      return triggeredRequired.length > 0 ? 1.1 : 0.9;
    }
  }

  private evaluateIfThenLogic(requiredSignals: string[], signalResults: Record<string, any>): number {
    if (requiredSignals.length < 2) return 1.0;
    
    const condition = signalResults[requiredSignals[0]]?.triggered;
    const consequence = signalResults[requiredSignals[1]]?.triggered;
    
    return (condition && consequence) ? 1.3 : 1.0;
  }

  private detectDivergence(source: SignalSource, threshold: number): boolean {
    // Simplified divergence detection
    const changeRate = Math.abs(source.change_rate || 0);
    const zScore = Math.abs(source.z_score || 0);
    
    return changeRate > threshold && zScore > 2.0;
  }

  // ====== ENHANCED CONTEXT PACK GENERATION ======

  private async generateEnhancedContextPack(
    alert: AdvancedAlert, 
    signalResults: Record<string, any>, 
    signalSources: SignalSource[]
  ): Promise<ContextPack> {
    const assetSymbol = alert.filters.assets?.[0] || 'BTC';
    
    // Gather contextual data from multiple sources
    const [whaleActivity, recentNews, technicalLevels] = await Promise.all([
      this.getRecentWhaleActivity(assetSymbol),
      this.getRecentNews(assetSymbol),
      this.getTechnicalLevels(assetSymbol)
    ]);

    // Calculate key metrics from signal results
    const keyMetrics = this.extractKeyMetrics(signalResults, signalSources);
    
    // Generate opportunity score and edge decay estimate
    const opportunityScore = this.calculateOpportunityScore(alert, signalResults);
    const edgeDecayMinutes = this.estimateEdgeDecay(alert, signalResults);

    // Create intelligent summary
    const summary = this.generateIntelligentSummary(alert, signalResults, keyMetrics);

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(alert, signalResults, signalSources);

    return {
      summary,
      key_metrics: keyMetrics,
      whale_activity: whaleActivity,
      recent_news: recentNews,
      technical_levels: technicalLevels,
      risk_factors: riskFactors,
      opportunity_score: opportunityScore,
      edge_decay_minutes: edgeDecayMinutes
    };
  }

  private async getRecentWhaleActivity(assetSymbol: string): Promise<WhaleActivity[]> {
    try {
      const { data } = await supabase
        .from('whale_activities')
        .select(`
          *,
          whale_addresses!inner(*)
        `)
        .eq('asset_symbol', assetSymbol)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(5);

      return (data || []).map(item => ({
        id: item.id,
        whale_address_id: item.whale_address_id,
        transaction_hash: item.transaction_hash,
        asset_symbol: item.asset_symbol,
        action: item.action as 'buy' | 'sell' | 'transfer' | 'stake' | 'unstake',
        amount: item.amount,
        price: item.price || undefined,
        exchange: item.exchange || undefined,
        timestamp: item.timestamp,
        block_number: item.block_number || undefined,
        impact_score: item.impact_score || undefined,
        confidence: item.confidence || 1.0,
        metadata: (typeof item.metadata === 'object' ? item.metadata : {}) as Record<string, any>
      }));
    } catch (error) {
      console.error('Error fetching whale activity:', error);
      return [];
    }
  }

  private async getRecentNews(assetSymbol: string): Promise<NewsItem[]> {
    // Mock implementation - would integrate with news APIs
    return [
      {
        title: `${assetSymbol} Technical Analysis Update`,
        source: "CryptoNews",
        timestamp: new Date().toISOString(),
        sentiment: 0.2,
        relevance: 0.8
      }
    ];
  }

  private async getTechnicalLevels(assetSymbol: string): Promise<TechnicalLevel[]> {
    // Mock implementation - would calculate from price data
    return [
      {
        type: 'support',
        price: 45000,
        strength: 0.8,
        distance_percent: -2.5
      },
      {
        type: 'resistance',
        price: 48000,
        strength: 0.9,
        distance_percent: 3.2
      }
    ];
  }

  private extractKeyMetrics(
    signalResults: Record<string, any>, 
    signalSources: SignalSource[]
  ): Record<string, number> {
    const metrics: Record<string, number> = {};

    // Extract most significant signal values
    Object.entries(signalResults).forEach(([signalId, result]) => {
      if (result.triggered) {
        metrics[`signal_${signalId}`] = result.value;
      }
    });

    // Add market context metrics
    const marketSources = signalSources.filter(s => s.source_type === 'market');
    marketSources.forEach(source => {
      if (source.current_value !== undefined) {
        metrics[source.source_name] = source.current_value;
      }
    });

    return metrics;
  }

  private calculateOpportunityScore(alert: AdvancedAlert, signalResults: Record<string, any>): number {
    let score = 0.5; // Base score

    // Boost score based on signal strength
    const triggeredSignals = Object.values(signalResults).filter((r: any) => r.triggered);
    const signalStrength = triggeredSignals.length / alert.signals.length;
    score += signalStrength * 0.3;

    // Boost based on alert priority
    const priorityBoost = {
      'low': 0.0,
      'medium': 0.1,
      'high': 0.15,
      'critical': 0.2
    };
    score += priorityBoost[alert.priority] || 0.0;

    // Cap at 1.0
    return Math.min(1.0, score);
  }

  private estimateEdgeDecay(alert: AdvancedAlert, signalResults: Record<string, any>): number {
    // Base decay time by alert type and priority
    const baseDecay = {
      'low': 180,      // 3 hours
      'medium': 90,    // 1.5 hours
      'high': 45,      // 45 minutes
      'critical': 20   // 20 minutes
    };

    let decayMinutes = baseDecay[alert.priority] || 90;

    // Adjust based on signal volatility
    const avgVolatility = Object.values(signalResults).reduce((sum: number, r: any) => {
      return sum + (Math.abs(r.value) || 0);
    }, 0) / alert.signals.length;

    if (avgVolatility > 1.5) decayMinutes *= 0.7; // Higher volatility = faster decay
    if (avgVolatility < 0.5) decayMinutes *= 1.3; // Lower volatility = slower decay

    return Math.round(decayMinutes);
  }

  private generateIntelligentSummary(
    alert: AdvancedAlert, 
    signalResults: Record<string, any>, 
    keyMetrics: Record<string, number>
  ): string {
    const triggeredSignals = Object.entries(signalResults)
      .filter(([_, result]) => (result as any).triggered)
      .map(([id, _]) => alert.signals.find(s => s.id === id))
      .filter(Boolean);

    if (triggeredSignals.length === 0) {
      return `Alert "${alert.name}" triggered with no active signals`;
    }

    const signalTypes = triggeredSignals.map(s => s!.type).join(', ');
    const confidenceLevel = triggeredSignals.length === 1 ? 'moderate' : 
                           triggeredSignals.length === 2 ? 'high' : 'very high';

    return `${confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)} confidence ${alert.priority} alert: ${signalTypes} signals detected. ${triggeredSignals.length} of ${alert.signals.length} conditions met.`;
  }

  private identifyRiskFactors(
    alert: AdvancedAlert, 
    signalResults: Record<string, any>, 
    signalSources: SignalSource[]
  ): string[] {
    const riskFactors: string[] = [];

    // Check for data quality issues
    const poorQualitySources = signalSources.filter(s => s.data_quality === 'poor').length;
    if (poorQualitySources > 0) {
      riskFactors.push(`${poorQualitySources} signal sources have poor data quality`);
    }

    // Check for high volatility
    const highVolatilitySources = signalSources.filter(s => 
      s.source_type === 'market' && Math.abs(s.z_score || 0) > 2
    ).length;
    if (highVolatilitySources > 0) {
      riskFactors.push('High market volatility detected');
    }

    // Check for conflicting signals
    const conflictingSignals = this.detectConflictingSignals(alert, signalResults);
    if (conflictingSignals) {
      riskFactors.push('Some signals show conflicting patterns');
    }

    return riskFactors;
  }

  private detectConflictingSignals(alert: AdvancedAlert, signalResults: Record<string, any>): boolean {
    // Simplified conflict detection
    const bullishSignals = ['whale_accumulation', 'funding_flip'];
    const bearishSignals = ['exchange_inflow', 'liquidation_cluster'];

    const triggeredBullish = alert.signals.filter(s => 
      bullishSignals.includes(s.type) && signalResults[s.id]?.triggered
    ).length;

    const triggeredBearish = alert.signals.filter(s => 
      bearishSignals.includes(s.type) && signalResults[s.id]?.triggered
    ).length;

    return triggeredBullish > 0 && triggeredBearish > 0;
  }
}

// ====== SEQUENCE TRACKING CLASS ======

class SequenceTracker {
  private requiredSignals: string[];
  private windowMinutes: number;
  private signalHistory: Array<{ signalId: string; timestamp: number }> = [];

  constructor(requiredSignals: string[], windowMinutes: number) {
    this.requiredSignals = requiredSignals;
    this.windowMinutes = windowMinutes;
  }

  updateSequence(signalResults: Record<string, any>): number {
    const now = Date.now();
    const windowMs = this.windowMinutes * 60 * 1000;

    // Clean old entries
    this.signalHistory = this.signalHistory.filter(
      entry => now - entry.timestamp < windowMs
    );

    // Add newly triggered signals
    this.requiredSignals.forEach(signalId => {
      if (signalResults[signalId]?.triggered) {
        const existingIndex = this.signalHistory.findIndex(h => h.signalId === signalId);
        if (existingIndex === -1) {
          this.signalHistory.push({ signalId, timestamp: now });
        }
      }
    });

    // Check if we have the complete sequence in order
    const sequenceComplete = this.requiredSignals.every((signalId, index) => {
      const signalEntry = this.signalHistory.find(h => h.signalId === signalId);
      if (!signalEntry) return false;

      // For sequential logic, check if signals triggered in order
      if (index > 0) {
        const previousSignalId = this.requiredSignals[index - 1];
        const previousEntry = this.signalHistory.find(h => h.signalId === previousSignalId);
        if (previousEntry && signalEntry.timestamp < previousEntry.timestamp) {
          return false;
        }
      }
      return true;
    });

    return sequenceComplete ? 1.5 : 1.0;
  }
}

// Export singleton
export const advancedSignalProcessor = AdvancedSignalProcessor.getInstance();