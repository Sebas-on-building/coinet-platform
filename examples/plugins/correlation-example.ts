/**
 * =========================================
 * CORRELATION ANALYSIS EXAMPLE
 * =========================================
 * Demonstrates the complete correlation analysis system
 * with integration to confidence scoring and fusion engine
 */

import { CorrelationAPI } from './CorrelationAPI';
import { ConfidenceAPI } from '../confidence';
import { FusionEngine } from '../fusion/FusionEngine';
import type {
  NormalizedSignal,
  FusionConfig,
  SignalType
} from '../types';
import type {
  CorrelationAnalysisRequest
} from './types';

/**
 * Example: Complete Correlation Analysis Pipeline
 */
export class CorrelationAnalysisPipeline {
  private correlationAPI: CorrelationAPI;
  private confidenceAPI: ConfidenceAPI;
  private fusionEngine: FusionEngine;

  constructor() {
    // Initialize correlation analysis with default config
    this.correlationAPI = new CorrelationAPI(CorrelationAPI.createDefaultConfig());

    // Initialize confidence scoring
    this.confidenceAPI = new ConfidenceAPI(ConfidenceAPI.createDefaultConfig());

    // Initialize fusion engine
    const fusionConfig: FusionConfig = {
      updateInterval: 1000,
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
    // Initialize all systems
    await Promise.all([
      this.correlationAPI.initialize(),
      this.confidenceAPI.initialize(),
      this.fusionEngine.initialize()
    ]);

    // Set up integrations
    this.correlationAPI.setConfidenceAPI(this.confidenceAPI);
    this.fusionEngine.setConfidenceAPI(this.confidenceAPI, this.confidenceAPI.getConfig());

    console.log('🚀 Correlation Analysis Pipeline initialized');
  }

  async processSignal(signal: NormalizedSignal): Promise<void> {
    // Step 1: Add to correlation analysis
    this.correlationAPI.addSignal(signal);

    // Step 2: Calculate confidence score
    const confidenceRequest = {
      signalId: signal.id,
      signalType: signal.type,
      timestamp: signal.timestamp,
      context: {
        sourceId: signal.source
      }
    };

    const confidenceResponse = await this.confidenceAPI.calculateConfidence(confidenceRequest);

    // Step 3: Enhance signal with confidence
    const enhancedSignal: NormalizedSignal = {
      ...signal,
      metadata: {
        ...signal.metadata,
        confidence: confidenceResponse.score.overallScore
      }
    };

    // Step 4: Update fusion engine
    await this.fusionEngine.updateWithSignal(enhancedSignal);

    console.log(`✅ Processed ${signal.type} signal:`, {
      signalId: signal.id,
      confidence: confidenceResponse.score.overallScore,
      factors: confidenceResponse.score.factors
    });
  }

  async performCorrelationAnalysis(): Promise<void> {
    const request: CorrelationAnalysisRequest = {
      signalTypes: ['price', 'volume', 'social_media', 'on_chain', 'technical'],
      timeWindow: 1440, // 24 hours
      correlationMethod: 'pearson',
      includeCausality: true,
      includeClustering: true,
      includePCA: true
    };

    const analysis = await this.correlationAPI.analyzeCorrelations(request);

    console.log('📊 Correlation Analysis Results:', {
      significantPairs: analysis.significantPairs.length,
      clustersFound: analysis.clusters.length,
      pcaComponents: analysis.pcaResult?.components.length || 0,
      analysisTime: analysis.analysisTime + 'ms'
    });

    // Show top correlations
    if (analysis.significantPairs.length > 0) {
      console.log('🔗 Top Correlations:');
      analysis.significantPairs.slice(0, 5).forEach(pair => {
        console.log(`  ${pair.signalType1} ↔ ${pair.signalType2}: ${pair.correlation.toFixed(3)} (${pair.strength})`);
      });
    }

    // Show clusters
    if (analysis.clusters.length > 0) {
      console.log('🎯 Signal Clusters:');
      analysis.clusters.forEach(cluster => {
        console.log(`  Cluster ${cluster.id}: [${cluster.signals.join(', ')}] (predictive power: ${cluster.predictivePower.toFixed(3)})`);
      });
    }

    // Show PCA insights
    if (analysis.pcaResult) {
      console.log('🧬 PCA Insights:', {
        originalDimensions: Object.keys(analysis.pcaResult.signalImportance).length,
        reducedDimensions: analysis.pcaResult.reducedDimensions,
        varianceExplained: analysis.pcaResult.cumulativeVariance[analysis.pcaResult.cumulativeVariance.length - 1] || 0
      });
    }
  }

  async updateAdaptiveWeights(): Promise<void> {
    const updates = await this.correlationAPI.updateAdaptiveWeights();

    console.log('⚖️ Adaptive Weight Updates:', {
      totalUpdates: updates.length,
      avgConfidence: updates.length > 0 ?
        updates.reduce((sum, u) => sum + u.confidence, 0) / updates.length : 0
    });

    if (updates.length > 0) {
      console.log('📈 Weight Changes:');
      updates.forEach(update => {
        console.log(`  ${update.signalType}: ${update.newWeight.toFixed(3)} (${update.reasoning[0]})`);
      });
    }
  }

  async generateFusionUpdate(): Promise<void> {
    const fusionUpdate = await this.fusionEngine.updateFusion();

    if (fusionUpdate) {
      console.log('🎯 Fusion Update:', {
        fusionScore: fusionUpdate.fusionScore,
        signalCount: fusionUpdate.signals.length,
        confidence: fusionUpdate.confidence,
        recommendation: fusionUpdate.recommendations.action
      });
    }
  }

  getCorrelationInsights() {
    return this.correlationAPI.getCorrelationInsights();
  }

  getConfidenceInsights() {
    return this.confidenceAPI.getConfig();
  }

  getMetrics() {
    return {
      correlation: this.correlationAPI.getMetrics(),
      confidence: this.confidenceAPI.getConfig(),
      fusion: this.fusionEngine.getStatus()
    };
  }

  async shutdown(): Promise<void> {
    await Promise.all([
      this.correlationAPI.stop(),
      this.confidenceAPI.stop(),
      this.fusionEngine.stop()
    ]);
    console.log('🛑 Correlation Analysis Pipeline shutdown complete');
  }
}

/**
 * Example Usage
 */
export async function runCorrelationExample(): Promise<void> {
  const pipeline = new CorrelationAnalysisPipeline();

  try {
    // Initialize the complete pipeline
    await pipeline.initialize();

    // Create sample signals for demonstration
    const sampleSignals: NormalizedSignal[] = [
      // Price signals
      createSampleSignal('price', 'binance_api', 0.85, 50000),
      createSampleSignal('price', 'coinbase_api', 0.82, 49950),
      createSampleSignal('price', 'kraken_api', 0.87, 50100),

      // Volume signals
      createSampleSignal('volume', 'binance_api', 0.72, 1000000),
      createSampleSignal('volume', 'coinbase_api', 0.68, 850000),

      // Social media signals
      createSampleSignal('social_media', 'twitter_api', 0.65, 1000),
      createSampleSignal('social_media', 'reddit_api', 0.58, 800),

      // On-chain signals
      createSampleSignal('on_chain', 'defi_llama', 0.92, 50000000),
      createSampleSignal('on_chain', 'dune_analytics', 0.89, 48000000),

      // Technical signals
      createSampleSignal('technical', 'tradingview_api', 0.78, 0.65),
      createSampleSignal('technical', 'ta_lib', 0.75, 0.62)
    ];

    // Process signals
    for (const signal of sampleSignals) {
      await pipeline.processSignal(signal);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }

    // Perform correlation analysis
    await pipeline.performCorrelationAnalysis();

    // Update adaptive weights
    await pipeline.updateAdaptiveWeights();

    // Generate fusion update
    await pipeline.generateFusionUpdate();

    // Show final insights
    const insights = pipeline.getCorrelationInsights();
    console.log('\n📊 Final Correlation Insights:');
    console.log(`  Dominant correlations: ${insights.dominantCorrelations.length}`);
    console.log(`  Predictive clusters: ${insights.predictiveClusters.length}`);
    console.log(`  Dimensionality reduction: ${insights.dimensionalityReduction.originalDimensions} → ${insights.dimensionalityReduction.reducedDimensions}`);

  } catch (error) {
    console.error('❌ Correlation example failed:', error);
  } finally {
    await pipeline.shutdown();
  }
}

/**
 * Create sample signal for demonstration
 */
function createSampleSignal(
  type: SignalType,
  source: string,
  normalizedValue: number,
  originalValue: number
): NormalizedSignal {
  return {
    id: `${type}_signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    source,
    timestamp: new Date(),
    normalizedValues: { primary: normalizedValue },
    originalValues: { value: originalValue },
    features: {
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      magnitude: normalizedValue,
      duration: 300,
      frequency: 0.1,
      mean: normalizedValue,
      std: 0.1,
      skewness: 0,
      kurtosis: 0,
      min: normalizedValue * 0.8,
      max: normalizedValue * 1.2,
      range: normalizedValue * 0.4,
      volatility: 0.3,
      momentum: 0.7,
      correlation: 0.5,
      trend: 0.8,
      compositeScore: normalizedValue,
      anomalyScore: 0.1,
      impactScore: normalizedValue
    },
    metadata: {
      sourceId: source,
      confidence: 0.8,
      normalizationMethod: 'z_score',
      featureExtractionMethod: 'statistical',
      version: '1.0'
    }
  };
}

// Run the example if this file is executed directly
if (require.main === module) {
  runCorrelationExample().catch(console.error);
}
