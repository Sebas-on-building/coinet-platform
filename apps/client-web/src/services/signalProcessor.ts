import { supabase } from '@/integrations/supabase/client';
import type { SignalSource, MarketContext, WhaleActivity, AdvancedAlert } from '@/types/advancedAlerts';
import { dbAlertToAdvancedAlert } from '@/lib/typeAdapters';

export class SignalProcessor {
  private static instance: SignalProcessor;
  private signalSources: Map<string, SignalSource> = new Map();
  private marketContextCache: Map<string, MarketContext> = new Map();

  static getInstance(): SignalProcessor {
    if (!SignalProcessor.instance) {
      SignalProcessor.instance = new SignalProcessor();
    }
    return SignalProcessor.instance;
  }

  // ====== SIGNAL SOURCE MANAGEMENT ======

  async updateSignalSource(
    sourceType: string,
    sourceName: string,
    assetSymbol: string | null,
    value: number,
    rawData?: Record<string, any>
  ): Promise<void> {
    const key = `${sourceType}:${sourceName}:${assetSymbol || 'global'}`;
    
    // Get previous value for change calculation
    const existing = this.signalSources.get(key);
    const previousValue = existing?.current_value || value;
    const changeRate = previousValue !== 0 ? (value - previousValue) / previousValue : 0;

    // Calculate z-score (simplified - would use rolling window in production)
    const zScore = this.calculateZScore(key, value);

    const signalSource: SignalSource = {
      id: key,
      source_type: sourceType as any,
      source_name: sourceName,
      asset_symbol: assetSymbol || undefined,
      current_value: value,
      previous_value: previousValue,
      change_rate: changeRate,
      z_score: zScore,
      last_updated: new Date().toISOString(),
      confidence: this.calculateConfidence(sourceType, rawData),
      data_quality: this.assessDataQuality(rawData),
      raw_data: rawData
    };

    // Update in-memory cache
    this.signalSources.set(key, signalSource);

    // Persist to database
    await this.persistSignalSource(signalSource);
  }

  private calculateZScore(key: string, value: number): number {
    // Simplified z-score calculation
    // In production, this would use a rolling window of historical values
    const existing = this.signalSources.get(key);
    if (!existing) return 0;

    // Mock calculation - replace with proper statistical analysis
    const mean = (existing.current_value + value + (existing.previous_value || 0)) / 3;
    const variance = Math.pow(value - mean, 2);
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (value - mean) / stdDev : 0;
  }

  private calculateConfidence(sourceType: string, rawData?: Record<string, any>): number {
    // Base confidence by source type
    const baseConfidence: Record<string, number> = {
      'market': 0.9,      // High confidence in market data
      'onchain': 0.85,    // High confidence in blockchain data
      'social': 0.6,      // Medium confidence in social signals
      'tokenomics': 0.8,  // Good confidence in tokenomics data
      'risk': 0.75       // Good confidence in risk metrics
    };

    let confidence = baseConfidence[sourceType] || 0.5;

    // Adjust based on data quality indicators
    if (rawData) {
      if (rawData.timestamp && Date.now() - new Date(rawData.timestamp).getTime() > 300000) {
        confidence *= 0.8; // Reduce confidence for stale data (>5min)
      }
      if (rawData.volume && rawData.volume < 1000) {
        confidence *= 0.7; // Reduce confidence for low volume
      }
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private assessDataQuality(rawData?: Record<string, any>): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!rawData) return 'fair';

    let score = 0;
    
    // Freshness check
    if (rawData.timestamp) {
      const age = Date.now() - new Date(rawData.timestamp).getTime();
      if (age < 60000) score += 3;      // < 1 min
      else if (age < 300000) score += 2; // < 5 min
      else if (age < 900000) score += 1; // < 15 min
    }

    // Completeness check
    const expectedFields = ['price', 'volume', 'timestamp'];
    const presentFields = expectedFields.filter(field => rawData[field] !== undefined);
    score += presentFields.length;

    // Volume/liquidity check
    if (rawData.volume && rawData.volume > 10000) score += 1;

    if (score >= 6) return 'excellent';
    if (score >= 4) return 'good';
    if (score >= 2) return 'fair';
    return 'poor';
  }

  private async persistSignalSource(signalSource: SignalSource): Promise<void> {
    try {
      await supabase
        .from('signal_sources')
        .upsert({
          source_type: signalSource.source_type,
          source_name: signalSource.source_name,
          asset_symbol: signalSource.asset_symbol,
          current_value: signalSource.current_value,
          previous_value: signalSource.previous_value,
          change_rate: signalSource.change_rate,
          z_score: signalSource.z_score,
          last_updated: signalSource.last_updated,
          confidence: signalSource.confidence,
          data_quality: signalSource.data_quality,
          raw_data: signalSource.raw_data
        });
    } catch (error) {
      console.error('Error persisting signal source:', error);
    }
  }

  // ====== MARKET CONTEXT MANAGEMENT ======

  async updateMarketContext(assetSymbol: string, contextData: Partial<MarketContext>): Promise<void> {
    const context: MarketContext = {
      id: `${assetSymbol}-${Date.now()}`,
      asset_symbol: assetSymbol,
      timestamp: new Date().toISOString(),
      price: contextData.price || 0,
      correlation_breaks: 0,
      ...contextData
    };

    // Update cache
    this.marketContextCache.set(assetSymbol, context);

    // Persist to database
    try {
      await supabase
        .from('market_context')
        .insert([context]);
    } catch (error) {
      console.error('Error persisting market context:', error);
    }
  }

  // ====== WHALE ACTIVITY PROCESSING ======

  async processWhaleActivity(
    address: string,
    transactionHash: string,
    assetSymbol: string,
    action: 'buy' | 'sell' | 'transfer' | 'stake' | 'unstake',
    amount: number,
    price?: number,
    exchange?: string
  ): Promise<void> {
    // Find or create whale address record
    let whaleAddress = await this.findOrCreateWhaleAddress(address);

    // Calculate impact score based on amount and market conditions
    const impactScore = await this.calculateImpactScore(assetSymbol, amount, price);

    const activity: Omit<WhaleActivity, 'id'> = {
      whale_address_id: whaleAddress.id,
      transaction_hash: transactionHash,
      asset_symbol: assetSymbol,
      action,
      amount,
      price,
      exchange,
      timestamp: new Date().toISOString(),
      impact_score: impactScore,
      confidence: whaleAddress.confidence_score,
      metadata: {}
    };

    // Persist whale activity
    try {
      await supabase
        .from('whale_activities')
        .insert([activity]);

      // Update whale activity signal
      await this.updateSignalSource(
        'onchain',
        `whale_${action}`,
        assetSymbol,
        amount,
        {
          address,
          impact_score: impactScore,
          confidence: whaleAddress.confidence_score
        }
      );
    } catch (error) {
      console.error('Error persisting whale activity:', error);
    }
  }

  private async findOrCreateWhaleAddress(address: string) {
    // Try to find existing whale address
    const { data: existing } = await supabase
      .from('whale_addresses')
      .select('*')
      .eq('address', address)
      .single();

    if (existing) return existing;

    // Create new whale address record
    const newWhale = {
      address,
      confidence_score: 0.5, // Default confidence
      category: 'whale' as const,
      risk_level: 'medium' as const,
      total_volume: 0,
      success_rate: 0,
      metadata: {}
    };

    const { data, error } = await supabase
      .from('whale_addresses')
      .insert([newWhale])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async calculateImpactScore(assetSymbol: string, amount: number, price?: number): Promise<number> {
    // Get market context for volume comparison
    const context = this.marketContextCache.get(assetSymbol);
    if (!context || !context.volume_24h) return 0.5;

    const tradeValue = price ? amount * price : amount;
    const volumeImpact = tradeValue / context.volume_24h;

    // Normalize to 0-1 scale
    return Math.min(1.0, Math.max(0.1, volumeImpact * 10));
  }

  // ====== SIGNAL EVALUATION ======

  async evaluateAlertsForSignalUpdate(signalKey: string): Promise<void> {
    // This would be called whenever a signal is updated to check if any alerts should trigger
    // Implementation would fetch active alerts and evaluate them against the updated signal
    
    try {
      // Get alerts that use this signal
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('status', 'active');

      if (!alerts) return;

      // Filter alerts that reference this signal
      const relevantAlerts = alerts.filter(alert => {
        if (!Array.isArray(alert.signals)) return false;
        return alert.signals.some((signal: any) => 
          `${signal.source_type}:${signal.source_name}:${signal.asset_symbol || 'global'}` === signalKey
        );
      });

      // Evaluate each relevant alert
      for (const alert of relevantAlerts) {
        const convertedAlert = dbAlertToAdvancedAlert(alert);
        await this.evaluateAlert(convertedAlert);
      }
    } catch (error) {
      console.error('Error evaluating alerts for signal update:', error);
    }
  }

  private async evaluateAlert(alert: AdvancedAlert): Promise<void> {
    // Implementation would evaluate the alert's conditions against current signal values
    // This is a simplified version - full implementation would be more complex
    
    console.log(`Evaluating alert: ${alert.name}`);
    // Evaluation logic would go here
  }

  // ====== UTILITY METHODS ======

  getSignalSource(sourceType: string, sourceName: string, assetSymbol?: string): SignalSource | undefined {
    const key = `${sourceType}:${sourceName}:${assetSymbol || 'global'}`;
    return this.signalSources.get(key);
  }

  getMarketContext(assetSymbol: string): MarketContext | undefined {
    return this.marketContextCache.get(assetSymbol);
  }

  getAllSignalSources(): SignalSource[] {
    return Array.from(this.signalSources.values());
  }
}

// Export singleton instance
export const signalProcessor = SignalProcessor.getInstance();