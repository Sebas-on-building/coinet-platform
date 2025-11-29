/**
 * ============================================
 * ML FALLBACK MODEL TRAINING SCRIPT
 * ============================================
 * 
 * Trains the ML fallback selector on historical/simulated data
 * Validates fallback accuracy in simulated outage scenarios
 * 
 * Target: >80% fallback accuracy
 */

import { MLFallbackSelector } from '../src/intelligence/ml-fallback-selector';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURATION
// ============================================

interface TrainingConfig {
  simulatedRequests: number;
  outageSimulations: number;
  providers: string[];
  successRates: Map<string, number>; // Realistic success rates
  latencies: Map<string, { avg: number; std: number }>; // Latency distributions
}

interface TrainingResults {
  timestamp: string;
  config: {
    simulatedRequests: number;
    outageSimulations: number;
  };
  modelAccuracy: number;
  outageResults: {
    provider: string;
    fallbackAccuracy: number;
    avgLatency: number;
    topFallback: string;
  }[];
  providerMetrics: {
    provider: string;
    successRate: number;
    avgLatency: number;
    totalRequests: number;
  }[];
  recommendations: string[];
  status: 'PASS' | 'FAIL';
}

// ============================================
// TRAINING SCRIPT
// ============================================

class FallbackModelTrainer {
  private selector: MLFallbackSelector;
  private config: TrainingConfig;

  constructor() {
    this.selector = new MLFallbackSelector();
    
    // Realistic configuration based on provider characteristics
    this.config = {
      simulatedRequests: 5000,
      outageSimulations: 100,
      providers: ['coingecko', 'coinmarketcap', 'defillama', 'database'],
      successRates: new Map([
        ['coingecko', 0.95],      // 95% success (primary provider)
        ['coinmarketcap', 0.92], // 92% success (fallback)
        ['defillama', 0.88],     // 88% success (secondary fallback)
        ['database', 0.99],      // 99% success (cached data)
      ]),
      latencies: new Map([
        ['coingecko', { avg: 120, std: 50 }],
        ['coinmarketcap', { avg: 150, std: 60 }],
        ['defillama', { avg: 180, std: 70 }],
        ['database', { avg: 5, std: 2 }],
      ]),
    };
  }

  /**
   * Generate random latency from normal distribution
   */
  private randomLatency(avg: number, std: number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(10, avg + z * std);
  }

  /**
   * Simulate provider requests to build training data
   */
  async simulateTrainingData(): Promise<void> {
    console.log('\n📊 Simulating training data...');
    console.log(`   Requests: ${this.config.simulatedRequests}`);
    console.log(`   Providers: ${this.config.providers.join(', ')}`);
    console.log('');

    const requestsPerProvider = Math.floor(
      this.config.simulatedRequests / this.config.providers.length
    );

    for (const provider of this.config.providers) {
      const successRate = this.config.successRates.get(provider) || 0.9;
      const latencyConfig = this.config.latencies.get(provider) || { avg: 100, std: 30 };

      for (let i = 0; i < requestsPerProvider; i++) {
        const success = Math.random() < successRate;
        const latency = this.randomLatency(latencyConfig.avg, latencyConfig.std);
        const freshness = success ? 1000 + Math.random() * 2000 : 5000;

        this.selector.recordRequest(provider, success, latency, freshness);

        // Add some variance based on time of day
        if (i % 100 === 0) {
          process.stdout.write(`\r   ${provider}: ${i}/${requestsPerProvider} requests`);
        }
      }
      console.log(`\r   ${provider}: ${requestsPerProvider}/${requestsPerProvider} requests ✓`);
    }

    console.log(`\n✅ Generated ${this.config.simulatedRequests} training samples`);
  }

  /**
   * Train the model
   */
  async trainModel(): Promise<{ accuracy: number; samplesUsed: number }> {
    console.log('\n🧠 Training ML fallback model...');
    
    const result = this.selector.trainModel();
    
    console.log(`   Model accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
    console.log(`   Samples used: ${result.samplesUsed}`);
    
    return {
      accuracy: result.accuracy,
      samplesUsed: result.samplesUsed,
    };
  }

  /**
   * Run outage simulations
   */
  async runOutageSimulations(): Promise<TrainingResults['outageResults']> {
    console.log('\n🔥 Running outage simulations...');
    
    const results: TrainingResults['outageResults'] = [];

    for (const provider of this.config.providers.slice(0, -1)) { // Skip database
      console.log(`   Simulating ${provider} outage...`);
      
      const simulation = this.selector.simulateOutage(
        provider,
        this.config.outageSimulations
      );

      // Find most used fallback
      let topFallback = '';
      let maxUsage = 0;
      simulation.providerUsage.forEach((count, p) => {
        if (count > maxUsage) {
          maxUsage = count;
          topFallback = p;
        }
      });

      results.push({
        provider,
        fallbackAccuracy: simulation.fallbackAccuracy,
        avgLatency: simulation.avgLatency,
        topFallback,
      });

      console.log(`      Fallback accuracy: ${(simulation.fallbackAccuracy * 100).toFixed(2)}%`);
      console.log(`      Top fallback: ${topFallback}`);
    }

    return results;
  }

  /**
   * Get provider metrics summary
   */
  getProviderMetrics(): TrainingResults['providerMetrics'] {
    const metrics: TrainingResults['providerMetrics'] = [];

    for (const provider of this.config.providers) {
      const providerMetrics = this.selector.getProviderMetrics(provider);
      if (providerMetrics) {
        metrics.push({
          provider,
          successRate: providerMetrics.totalRequests > 0
            ? providerMetrics.successfulRequests / providerMetrics.totalRequests
            : 0,
          avgLatency: providerMetrics.avgLatencyMs,
          totalRequests: providerMetrics.totalRequests,
        });
      }
    }

    return metrics;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(
    modelAccuracy: number,
    outageResults: TrainingResults['outageResults']
  ): string[] {
    const recommendations: string[] = [];

    // Model accuracy
    if (modelAccuracy >= 0.85) {
      recommendations.push('✅ Model accuracy excellent (>85%), ready for production');
    } else if (modelAccuracy >= 0.80) {
      recommendations.push('✅ Model accuracy meets target (>80%)');
    } else {
      recommendations.push('⚠️ Model accuracy below target, collect more training data');
    }

    // Fallback performance
    const avgFallbackAccuracy = outageResults.reduce((sum, r) => sum + r.fallbackAccuracy, 0) 
      / outageResults.length;

    if (avgFallbackAccuracy >= 0.80) {
      recommendations.push('✅ Fallback accuracy meets target (>80%)');
    } else {
      recommendations.push('⚠️ Fallback accuracy needs improvement');
    }

    // Latency
    const avgLatency = outageResults.reduce((sum, r) => sum + r.avgLatency, 0) 
      / outageResults.length;

    if (avgLatency < 200) {
      recommendations.push('✅ Fallback latency acceptable (<200ms)');
    } else {
      recommendations.push('⚠️ Consider optimizing fallback providers for lower latency');
    }

    return recommendations;
  }

  /**
   * Run full training pipeline
   */
  async run(): Promise<TrainingResults> {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ML FALLBACK MODEL TRAINING');
    console.log('='.repeat(60));

    // Step 1: Simulate training data
    await this.simulateTrainingData();

    // Step 2: Train model
    const { accuracy: modelAccuracy, samplesUsed } = await this.trainModel();

    // Step 3: Run outage simulations
    const outageResults = await this.runOutageSimulations();

    // Step 4: Get metrics
    const providerMetrics = this.getProviderMetrics();

    // Step 5: Generate recommendations
    const recommendations = this.generateRecommendations(modelAccuracy, outageResults);

    // Step 6: Determine status
    const avgFallbackAccuracy = outageResults.reduce((sum, r) => sum + r.fallbackAccuracy, 0) 
      / outageResults.length;
    const status: 'PASS' | 'FAIL' = avgFallbackAccuracy >= 0.80 ? 'PASS' : 'FAIL';

    // Build results
    const results: TrainingResults = {
      timestamp: new Date().toISOString(),
      config: {
        simulatedRequests: this.config.simulatedRequests,
        outageSimulations: this.config.outageSimulations,
      },
      modelAccuracy,
      outageResults,
      providerMetrics,
      recommendations,
      status,
    };

    // Print summary
    this.printSummary(results);

    return results;
  }

  /**
   * Print training summary
   */
  private printSummary(results: TrainingResults): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRAINING RESULTS SUMMARY');
    console.log('='.repeat(60));

    console.log(`\nTimestamp: ${results.timestamp}`);
    console.log(`Status: ${results.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log(`\n📈 Model Accuracy: ${(results.modelAccuracy * 100).toFixed(2)}%`);
    
    console.log('\n🔥 Outage Simulation Results:');
    console.log('-'.repeat(40));
    for (const result of results.outageResults) {
      const status = result.fallbackAccuracy >= 0.80 ? '✅' : '⚠️';
      console.log(`   ${status} ${result.provider} outage:`);
      console.log(`      Fallback accuracy: ${(result.fallbackAccuracy * 100).toFixed(2)}%`);
      console.log(`      Avg latency: ${result.avgLatency.toFixed(0)}ms`);
      console.log(`      Top fallback: ${result.topFallback}`);
    }

    console.log('\n📋 Provider Metrics:');
    console.log('-'.repeat(40));
    for (const metric of results.providerMetrics) {
      console.log(`   ${metric.provider}:`);
      console.log(`      Success rate: ${(metric.successRate * 100).toFixed(2)}%`);
      console.log(`      Avg latency: ${metric.avgLatency.toFixed(0)}ms`);
      console.log(`      Requests: ${metric.totalRequests}`);
    }

    console.log('\n💡 Recommendations:');
    console.log('-'.repeat(40));
    for (const rec of results.recommendations) {
      console.log(`   ${rec}`);
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.selector.destroy();
  }
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const trainer = new FallbackModelTrainer();
  
  try {
    const results = await trainer.run();

    // Save results to JSON
    const resultsPath = path.join(__dirname, 'results', `training-${Date.now()}.json`);
    const resultsDir = path.dirname(resultsPath);

    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${resultsPath}`);

    // Exit with appropriate code
    if (results.status === 'PASS') {
      console.log('\n✅ Training PASSED - Fallback accuracy meets target (>80%)');
      process.exit(0);
    } else {
      console.log('\n⚠️ Training needs improvement - Fallback accuracy below target');
      process.exit(1);
    }
  } finally {
    trainer.cleanup();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Training failed:', error);
    process.exit(1);
  });
}

export { FallbackModelTrainer, TrainingResults };

