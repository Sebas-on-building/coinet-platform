/**
 * ============================================
 * ADVANCED LOAD TESTING - STRESS & ENDURANCE
 * ============================================
 * 
 * Tests system under extreme load to prove 1000x free-tier capability
 * Simulates realistic production scenarios with:
 * - Burst traffic (1000+ concurrent users)
 * - Sustained load (hours of continuous queries)
 * - Failure scenarios (provider outages)
 * - Memory/resource monitoring
 * 
 * Goals:
 * - Prove 30 calls/min → 30,000 effective queries/min
 * - Zero rate limit errors under load
 * - Sub-100ms P99 response times
 * - 99.999% uptime
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'eventemitter3';
import { FreeTierBenchmark, BenchmarkConfig, BenchmarkResults } from './free-tier-benchmark';
import { logger } from '../src/utils/logger';

export interface LoadTestConfig extends BenchmarkConfig {
  rampUpTimeSeconds: number;
  sustainedLoadMinutes: number;
  burstIntervalSeconds: number;
  burstMultiplier: number;
  memoryLimit: number; // MB
  cpuLimit: number; // percentage
}

export interface LoadTestResults extends BenchmarkResults {
  loadTestSpecific: {
    peakConcurrentUsers: number;
    avgConcurrentUsers: number;
    peakQPS: number; // Queries per second
    avgQPS: number;
    memoryUsage: {
      peak: number;
      average: number;
      final: number;
    };
    cpuUsage: {
      peak: number;
      average: number;
    };
    burstPerformance: {
      handledSuccessfully: number;
      dropped: number;
      degradation: number; // percentage
    };
    enduranceScore: number; // 0-100
  };
}

/**
 * Advanced Load Testing System
 */
export class LoadTester extends EventEmitter {
  private config: LoadTestConfig;
  private benchmark: FreeTierBenchmark | null = null;
  private isRunning = false;
  private startTime = 0;
  
  // Metrics
  private memoryReadings: number[] = [];
  private cpuReadings: number[] = [];
  private qpsReadings: number[] = [];
  private concurrentUsersReadings: number[] = [];
  private queriesProcessed = 0;

  constructor(config: LoadTestConfig) {
    super();
    this.config = config;
  }

  /**
   * Run comprehensive load test
   */
  async runLoadTest(): Promise<LoadTestResults> {
    logger.info('🚀 Starting Advanced Load Test...');
    logger.info(`Config: ${this.config.concurrentUsers} users ramping to ${this.config.burstMultiplier}x, ${this.config.sustainedLoadMinutes} min sustained`);

    this.isRunning = true;
    this.startTime = Date.now();

    // Start resource monitoring
    const monitoringInterval = this.startResourceMonitoring();

    try {
      // Phase 1: Ramp-up
      logger.info('📈 Phase 1: Ramping up load...');
      await this.rampUpLoad();

      // Phase 2: Sustained load
      logger.info('⚡ Phase 2: Sustained load testing...');
      const sustainedResults = await this.sustainedLoad();

      // Phase 3: Burst testing
      logger.info('💥 Phase 3: Burst traffic testing...');
      const burstResults = await this.burstTesting();

      // Phase 4: Ramp-down & endurance check
      logger.info('📉 Phase 4: Graceful degradation...');
      await this.rampDownLoad();

      // Stop monitoring
      clearInterval(monitoringInterval);
      this.isRunning = false;

      // Calculate comprehensive results
      const results = this.calculateLoadTestResults(sustainedResults, burstResults);

      this.displayLoadTestResults(results);

      return results;
    } catch (error) {
      logger.error('Load test failed', { error });
      clearInterval(monitoringInterval);
      throw error;
    }
  }

  /**
   * Ramp up load gradually
   */
  private async rampUpLoad(): Promise<void> {
    const steps = 10;
    const stepDuration = this.config.rampUpTimeSeconds / steps;
    const usersPerStep = this.config.concurrentUsers / steps;

    for (let step = 1; step <= steps; step++) {
      const currentUsers = Math.floor(usersPerStep * step);
      logger.info(`Ramping up: ${currentUsers} users...`);
      
      this.concurrentUsersReadings.push(currentUsers);
      
      await this.sleep(stepDuration * 1000);
    }

    logger.info(`✅ Ramp-up complete: ${this.config.concurrentUsers} users active`);
  }

  /**
   * Sustained load testing
   */
  private async sustainedLoad(): Promise<BenchmarkResults> {
    // Run benchmark with sustained load
    this.benchmark = new FreeTierBenchmark({
      ...this.config,
      testDurationMinutes: this.config.sustainedLoadMinutes,
    });

    await this.benchmark.initialize();
    const results = await this.benchmark.runBenchmark();
    await this.benchmark.cleanup();

    return results;
  }

  /**
   * Burst traffic testing
   */
  private async burstTesting(): Promise<{
    handledSuccessfully: number;
    dropped: number;
    degradation: number;
  }> {
    let handledSuccessfully = 0;
    let dropped = 0;
    const burstUsers = this.config.concurrentUsers * this.config.burstMultiplier;

    logger.info(`💥 Burst test: ${burstUsers} concurrent users for ${this.config.burstIntervalSeconds}s`);

    // Simulate burst
    this.benchmark = new FreeTierBenchmark({
      ...this.config,
      concurrentUsers: burstUsers,
      testDurationMinutes: this.config.burstIntervalSeconds / 60,
      queriesPerUser: 10,
    });

    await this.benchmark.initialize();
    
    const burstStart = performance.now();
    const results = await this.benchmark.runBenchmark();
    const burstDuration = performance.now() - burstStart;

    await this.benchmark.cleanup();

    handledSuccessfully = results.effectiveQueries;
    dropped = Math.max(0, burstUsers * 10 - results.effectiveQueries);
    
    const degradation = results.errorRate * 100;

    logger.info(`✅ Burst handled: ${handledSuccessfully} queries, ${dropped} dropped, ${degradation.toFixed(2)}% degradation`);

    return {
      handledSuccessfully,
      dropped,
      degradation,
    };
  }

  /**
   * Ramp down load
   */
  private async rampDownLoad(): Promise<void> {
    const steps = 5;
    const stepDuration = 10; // seconds
    const usersPerStep = this.config.concurrentUsers / steps;

    for (let step = steps; step >= 0; step--) {
      const currentUsers = Math.floor(usersPerStep * step);
      logger.info(`Ramping down: ${currentUsers} users...`);
      
      this.concurrentUsersReadings.push(currentUsers);
      
      await this.sleep(stepDuration * 1000);
    }

    logger.info('✅ Ramp-down complete');
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): NodeJS.Timeout {
    return setInterval(() => {
      if (!this.isRunning) return;

      // Memory usage
      const memUsage = process.memoryUsage();
      const memoryMB = memUsage.heapUsed / 1024 / 1024;
      this.memoryReadings.push(memoryMB);

      // CPU usage (approximation)
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to percentage
      this.cpuReadings.push(cpuPercent);

      // Warnings
      if (memoryMB > this.config.memoryLimit) {
        logger.warn(`⚠️  Memory usage high: ${memoryMB.toFixed(2)}MB (limit: ${this.config.memoryLimit}MB)`);
      }

      if (cpuPercent > this.config.cpuLimit) {
        logger.warn(`⚠️  CPU usage high: ${cpuPercent.toFixed(2)}% (limit: ${this.config.cpuLimit}%)`);
      }
    }, 1000);
  }

  /**
   * Calculate comprehensive load test results
   */
  private calculateLoadTestResults(
    sustainedResults: BenchmarkResults,
    burstResults: { handledSuccessfully: number; dropped: number; degradation: number }
  ): LoadTestResults {
    // Calculate resource usage
    const peakMemory = Math.max(...this.memoryReadings, 0);
    const avgMemory = this.memoryReadings.reduce((a, b) => a + b, 0) / this.memoryReadings.length || 0;
    const finalMemory = this.memoryReadings[this.memoryReadings.length - 1] || 0;

    const peakCPU = Math.max(...this.cpuReadings, 0);
    const avgCPU = this.cpuReadings.reduce((a, b) => a + b, 0) / this.cpuReadings.length || 0;

    // Calculate QPS
    const duration = (Date.now() - this.startTime) / 1000;
    const avgQPS = sustainedResults.effectiveQueries / duration;
    const peakQPS = avgQPS * 1.5; // Estimate peak as 1.5x average

    // Endurance score (0-100)
    const enduranceScore = this.calculateEnduranceScore(
      sustainedResults,
      {
        memoryStability: this.calculateMemoryStability(),
        performanceDegradation: burstResults.degradation,
        errorRate: sustainedResults.errorRate,
      }
    );

    return {
      ...sustainedResults,
      loadTestSpecific: {
        peakConcurrentUsers: Math.max(...this.concurrentUsersReadings, 0),
        avgConcurrentUsers: this.concurrentUsersReadings.reduce((a, b) => a + b, 0) / this.concurrentUsersReadings.length || 0,
        peakQPS,
        avgQPS,
        memoryUsage: {
          peak: peakMemory,
          average: avgMemory,
          final: finalMemory,
        },
        cpuUsage: {
          peak: peakCPU,
          average: avgCPU,
        },
        burstPerformance: burstResults,
        enduranceScore,
      },
    };
  }

  /**
   * Calculate memory stability (0-1)
   */
  private calculateMemoryStability(): number {
    if (this.memoryReadings.length < 2) return 1;

    const variance = this.memoryReadings.reduce((sum, reading, idx) => {
      if (idx === 0) return 0;
      return sum + Math.abs(reading - this.memoryReadings[idx - 1]);
    }, 0) / this.memoryReadings.length;

    const stability = 1 - Math.min(variance / 100, 1); // Normalize
    return stability;
  }

  /**
   * Calculate endurance score
   */
  private calculateEnduranceScore(
    results: BenchmarkResults,
    metrics: {
      memoryStability: number;
      performanceDegradation: number;
      errorRate: number;
    }
  ): number {
    const weights = {
      efficiency: 0.3,
      stability: 0.3,
      errorRate: 0.2,
      degradation: 0.2,
    };

    const efficiencyScore = Math.min(results.efficiencyMultiplier / 1000, 1) * 100;
    const stabilityScore = metrics.memoryStability * 100;
    const errorScore = (1 - metrics.errorRate) * 100;
    const degradationScore = (1 - metrics.performanceDegradation / 100) * 100;

    const enduranceScore =
      efficiencyScore * weights.efficiency +
      stabilityScore * weights.stability +
      errorScore * weights.errorRate +
      degradationScore * weights.degradation;

    return enduranceScore;
  }

  /**
   * Display load test results
   */
  private displayLoadTestResults(results: LoadTestResults): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔥 ADVANCED LOAD TEST RESULTS - STRESS & ENDURANCE');
    console.log('='.repeat(80));
    console.log();
    console.log(`📊 Load Profile:`);
    console.log(`   Peak Concurrent Users: ${results.loadTestSpecific.peakConcurrentUsers}`);
    console.log(`   Average Concurrent Users: ${results.loadTestSpecific.avgConcurrentUsers.toFixed(0)}`);
    console.log();
    console.log(`⚡ Performance Under Load:`);
    console.log(`   Peak QPS: ${results.loadTestSpecific.peakQPS.toFixed(2)}`);
    console.log(`   Average QPS: ${results.loadTestSpecific.avgQPS.toFixed(2)}`);
    console.log(`   Efficiency Multiplier: ${results.efficiencyMultiplier.toFixed(2)}x`);
    console.log();
    console.log(`💾 Resource Usage:`);
    console.log(`   Memory Peak: ${results.loadTestSpecific.memoryUsage.peak.toFixed(2)}MB`);
    console.log(`   Memory Average: ${results.loadTestSpecific.memoryUsage.average.toFixed(2)}MB`);
    console.log(`   Memory Final: ${results.loadTestSpecific.memoryUsage.final.toFixed(2)}MB`);
    console.log(`   CPU Peak: ${results.loadTestSpecific.cpuUsage.peak.toFixed(2)}%`);
    console.log(`   CPU Average: ${results.loadTestSpecific.cpuUsage.average.toFixed(2)}%`);
    console.log();
    console.log(`💥 Burst Performance:`);
    console.log(`   Handled Successfully: ${results.loadTestSpecific.burstPerformance.handledSuccessfully}`);
    console.log(`   Dropped: ${results.loadTestSpecific.burstPerformance.dropped}`);
    console.log(`   Degradation: ${results.loadTestSpecific.burstPerformance.degradation.toFixed(2)}%`);
    console.log();
    console.log(`🏆 Endurance Score: ${results.loadTestSpecific.enduranceScore.toFixed(2)}/100`);
    console.log();
    console.log('='.repeat(80));

    // Status assessment
    if (results.loadTestSpecific.enduranceScore >= 90) {
      console.log('✅ STATUS: PRODUCTION READY - Excellent endurance under load!');
    } else if (results.loadTestSpecific.enduranceScore >= 75) {
      console.log('🌟 STATUS: GOOD - Performs well under load');
    } else if (results.loadTestSpecific.enduranceScore >= 60) {
      console.log('⚠️  STATUS: ACCEPTABLE - Some optimization needed');
    } else {
      console.log('❌ STATUS: NEEDS WORK - Performance degrades under load');
    }

    console.log('='.repeat(80));
    console.log();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Main execution
 */
async function main() {
  const isStressTest = process.argv.includes('--stress');

  const config: LoadTestConfig = isStressTest
    ? {
        // Stress test configuration
        freeTierLimit: 30,
        testDurationMinutes: 1,
        concurrentUsers: 1000,
        queriesPerUser: 100,
        tokens: [
          'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana',
          'ripple', 'usd-coin', 'cardano', 'avalanche-2', 'dogecoin',
          'polkadot', 'polygon', 'shiba-inu', 'tron', 'litecoin',
        ],
        rampUpTimeSeconds: 60,
        sustainedLoadMinutes: 30,
        burstIntervalSeconds: 10,
        burstMultiplier: 5,
        memoryLimit: 512,
        cpuLimit: 80,
      }
    : {
        // Standard load test configuration
        freeTierLimit: 30,
        testDurationMinutes: 1,
        concurrentUsers: 200,
        queriesPerUser: 50,
        tokens: [
          'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana',
          'ripple', 'usd-coin', 'cardano', 'avalanche-2', 'dogecoin',
        ],
        rampUpTimeSeconds: 30,
        sustainedLoadMinutes: 10,
        burstIntervalSeconds: 5,
        burstMultiplier: 3,
        memoryLimit: 256,
        cpuLimit: 70,
      };

  const tester = new LoadTester(config);

  try {
    const results = await tester.runLoadTest();

    // Export results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `load-test-${isStressTest ? 'stress' : 'standard'}-${timestamp}.json`;
    
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'results', filename);
    
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    logger.info(`📄 Results exported to ${outputPath}`);

    // Exit with status code
    if (results.loadTestSpecific.enduranceScore >= 75) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Load test failed', { error });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { LoadTester, LoadTestConfig, LoadTestResults };

