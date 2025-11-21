/**
 * =========================================
 * CONFIDENCE SCORING SYSTEM EXAMPLE
 * =========================================
 * Demonstrates the complete confidence scoring system
 * with integration to fusion engine
 */

import { ConfidenceAPI } from './ConfidenceAPI';
import { FusionEngine } from '../fusion/FusionEngine';
import type { NormalizedSignal, FusionConfig } from '../types';
import type { ConfidenceConfig } from './types';

/**
 * Example: Complete Signal Processing Pipeline with Confidence Scoring
 */
export class SignalProcessingPipeline {
  private confidenceAPI: ConfidenceAPI;
  private fusionEngine: FusionEngine;

  constructor() {
    // Initialize confidence scoring with default config
    this.confidenceAPI = new ConfidenceAPI(ConfidenceAPI.createDefaultConfig());

    // Initialize fusion engine with enhanced confidence integration
    const fusionConfig: FusionConfig = {
      updateInterval: 1000, // 1 second
      signalWeights: {
        price: 0.3,
        volume: 0.2,
        technical: 0.25,
        on_chain: 0.15,
        defi_metrics: 0.1,
        social_media: 0.05,
        news: 0.05,
        fundamental: 0.1
      },
      minSignals: 3,
      maxSignals: 20,
      decayFactor: 0.95,
      confidenceThreshold: 0.5
    };

    this.fusionEngine = new FusionEngine(fusionConfig);
  }

  async initialize(): Promise<void> {
    // Initialize both systems
    await this.confidenceAPI.initialize();
    await this.fusionEngine.initialize();

    // Integrate confidence scoring with fusion engine
    this.fusionEngine.setConfidenceAPI(
      this.confidenceAPI,
      this.confidenceAPI.getConfig()
    );

    console.log('🚀 Signal Processing Pipeline initialized with confidence scoring');
  }

  async processSignal(signal: NormalizedSignal): Promise<void> {
    // Step 1: Calculate confidence score
    const confidenceRequest = {
      signalId: signal.id,
      signalType: signal.type,
      timestamp: signal.timestamp,
      context: {
        sourceId: signal.source
      }
    };

    const confidenceResponse = await this.confidenceAPI.calculateConfidence(confidenceRequest);

    // Step 2: Enhance signal with confidence
    const enhancedSignal: NormalizedSignal = {
      ...signal,
      metadata: {
        ...signal.metadata,
        confidence: confidenceResponse.score.overallScore
      }
    };

    // Step 3: Update fusion engine
    await this.fusionEngine.updateWithSignal(enhancedSignal);

    // Step 4: Log results
    console.log(`✅ Processed ${signal.type} signal:`, {
      signalId: signal.id,
      confidence: confidenceResponse.score.overallScore,
      factors: confidenceResponse.score.factors,
      calculationTime: confidenceResponse.calculationTime + 'ms'
    });
  }

  async generateFusionUpdate(): Promise<void> {
    const fusionUpdate = await this.fusionEngine.updateFusion();

    if (fusionUpdate) {
      console.log(`🎯 Fusion Update:`, {
        fusionScore: fusionUpdate.fusionScore,
        signalCount: fusionUpdate.signals.length,
        confidence: fusionUpdate.confidence,
        recommendation: fusionUpdate.recommendations.action,
        dominantTypes: this.fusionEngine['fusionState'].dominantTypes
      });
    }
  }

  async learnFromOutcomes(): Promise<void> {
    // Example: Update reliability for various sources based on outcomes
    const outcomes = [
      { sourceId: 'binance_api', signalType: 'price' as const, accurate: true },
      { sourceId: 'coingecko_api', signalType: 'price' as const, accurate: false },
      { sourceId: 'twitter_api', signalType: 'social_media' as const, accurate: true },
      { sourceId: 'reddit_api', signalType: 'social_media' as const, accurate: false },
      { sourceId: 'defi_llama', signalType: 'on_chain' as const, accurate: true },
      { sourceId: 'dune_analytics', signalType: 'defi_metrics' as const, accurate: true }
    ];

    for (const outcome of outcomes) {
      await this.confidenceAPI.updateSourceReliability(
        outcome.sourceId,
        outcome.signalType,
        outcome.accurate
      );

      await this.confidenceAPI.updateHistoricalAccuracy(
        outcome.signalType,
        outcome.accurate
      );
    }

    console.log('📚 Updated reliability metrics from outcomes');
  }

  async performBacktesting(): Promise<void> {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = new Date();

    const results = await this.confidenceAPI.performBacktesting(startDate, endDate);

    console.log('🔬 Backtesting Results:', {
      period: `${startDate.toDateString()} - ${endDate.toDateString()}`,
      totalSignals: results.metrics.totalSignals,
      avgConfidence: results.metrics.avgConfidence,
      accuracy: results.metrics.accuracy,
      calibrationScore: results.metrics.calibrationScore,
      optimalWeights: results.recommendations.optimalWeights
    });

    // Apply optimized configuration
    this.confidenceAPI.updateConfig({
      signalTypeWeights: results.recommendations.optimalWeights,
      factorWeights: results.recommendations.factorImportance
    });
    this.fusionEngine.setConfidenceAPI(
      this.confidenceAPI,
      this.confidenceAPI.getConfig()
    );

    console.log('⚙️ Configuration updated with backtesting results');
  }

  getStatus(): any {
    return {
      confidenceAPI: this.confidenceAPI.getStatus(),
      fusionEngine: this.fusionEngine.getStatus()
    };
  }

  async shutdown(): Promise<void> {
    await this.confidenceAPI.stop();
    await this.fusionEngine.stop();
    console.log('🛑 Signal Processing Pipeline shutdown complete');
  }
}

/**
 * Example Usage
 */
export async function runExample(): Promise<void> {
  const pipeline = new SignalProcessingPipeline();

  try {
    // Initialize the complete pipeline
    await pipeline.initialize();

    // Create sample signals
    const sampleSignals: NormalizedSignal[] = [
      {
        id: 'price_signal_1',
        type: 'price',
        source: 'binance_api',
        timestamp: new Date(),
        normalizedValues: { price_change: 0.85, volume_ratio: 0.72 },
        originalValues: { price: 50000, volume: 1000000 },
        features: {
          timestamp: Date.now(),
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          magnitude: 0.85,
          duration: 300,
          frequency: 0.1,
          mean: 0.78,
          std: 0.15,
          skewness: -0.2,
          kurtosis: 1.8,
          min: 0.3,
          max: 1.0,
          range: 0.7,
          volatility: 0.6,
          momentum: 0.8,
          correlation: 0.4,
          trend: 0.9,
          compositeScore: 0.75,
          anomalyScore: 0.1,
          impactScore: 0.8
        },
        metadata: {
          sourceId: 'binance_api',
          confidence: 0.8,
          normalizationMethod: 'z_score',
          featureExtractionMethod: 'statistical',
          version: '1.0'
        }
      },
      {
        id: 'social_signal_1',
        type: 'social_media',
        source: 'twitter_api',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        normalizedValues: { sentiment_score: 0.65, engagement_ratio: 0.45 },
        originalValues: { likes: 1000, retweets: 500 },
        features: {
          timestamp: Date.now(),
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          magnitude: 0.65,
          duration: 180,
          frequency: 0.05,
          mean: 0.55,
          std: 0.25,
          skewness: 0.1,
          kurtosis: 1.2,
          min: 0.1,
          max: 0.9,
          range: 0.8,
          volatility: 0.4,
          momentum: 0.6,
          correlation: 0.2,
          trend: 0.7,
          compositeScore: 0.55,
          anomalyScore: 0.3,
          impactScore: 0.5
        },
        metadata: {
          sourceId: 'twitter_api',
          confidence: 0.6,
          normalizationMethod: 'z_score',
          featureExtractionMethod: 'sentiment_analysis',
          version: '1.0'
        }
      },
      {
        id: 'onchain_signal_1',
        type: 'on_chain',
        source: 'defi_llama',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        normalizedValues: { tvl_change: 0.92, active_addresses: 0.78 },
        originalValues: { tvl: 50000000, addresses: 15000 },
        features: {
          timestamp: Date.now(),
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          magnitude: 0.92,
          duration: 600,
          frequency: 0.02,
          mean: 0.85,
          std: 0.10,
          skewness: -0.1,
          kurtosis: 1.1,
          min: 0.6,
          max: 1.0,
          range: 0.4,
          volatility: 0.3,
          momentum: 0.9,
          correlation: 0.6,
          trend: 0.95,
          compositeScore: 0.85,
          anomalyScore: 0.05,
          impactScore: 0.9
        },
        metadata: {
          sourceId: 'defi_llama',
          confidence: 0.9,
          normalizationMethod: 'z_score',
          featureExtractionMethod: 'blockchain_metrics',
          version: '1.0'
        }
      }
    ];

    // Process each signal
    for (const signal of sampleSignals) {
      await pipeline.processSignal(signal);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }

    // Generate fusion update
    await pipeline.generateFusionUpdate();

    // Learn from outcomes
    await pipeline.learnFromOutcomes();

    // Perform backtesting
    await pipeline.performBacktesting();

    // Show final status
    console.log('\n📊 Final Pipeline Status:', pipeline.getStatus());

  } catch (error) {
    console.error('❌ Example failed:', error);
  } finally {
    await pipeline.shutdown();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}
