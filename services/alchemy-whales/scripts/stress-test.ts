/**
 * ============================================
 * STRESS TEST RUNNER SCRIPT
 * ============================================
 * 
 * Comprehensive stress testing with performance report generation
 */

import { createLogger } from '../src/utils/logger';
import { runStressTest, StressTestResults } from '../src/tests/stress/load-test';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger({ component: 'StressTestRunner' });

// =============================================================================
// PERFORMANCE REPORT GENERATOR
// =============================================================================

function generatePerformanceReport(results: StressTestResults): string {
  const timestamp = new Date().toISOString();
  
  return `# 📊 Performance Report - Whale Fusion Engine

Generated: ${timestamp}

## Executive Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Throughput** | ${results.throughput.toFixed(1)} qps | ${results.config.targetThroughput} qps | ${results.throughput >= results.config.targetThroughput ? '✅ PASS' : '❌ FAIL'} |
| **P99 Latency** | ${results.p99LatencyMs.toFixed(1)}ms | <${results.config.maxLatencyMs}ms | ${results.p99LatencyMs <= results.config.maxLatencyMs ? '✅ PASS' : '❌ FAIL'} |
| **Success Rate** | ${(results.successRate * 100).toFixed(2)}% | >99% | ${results.successRate >= 0.99 ? '✅ PASS' : '❌ FAIL'} |
| **Cache Hit Rate** | ${(results.cacheHitRate * 100).toFixed(1)}% | >70% | ${results.cacheHitRate >= 0.7 ? '✅ PASS' : '❌ FAIL'} |

**Overall Status**: ${results.passed ? '✅ **ALL TESTS PASSED**' : '❌ **TESTS FAILED**'}

## Test Configuration

| Parameter | Value |
|-----------|-------|
| Total Queries | ${results.totalQueries.toLocaleString()} |
| Concurrent Queries | ${results.config.concurrentQueries} |
| Warmup Queries | ${results.config.warmupQueries} |
| Cooldown Between Batches | ${results.config.cooldownMs}ms |

## Query Statistics

| Metric | Value |
|--------|-------|
| Total Queries | ${results.totalQueries.toLocaleString()} |
| Successful Queries | ${results.successfulQueries.toLocaleString()} |
| Failed Queries | ${results.failedQueries.toLocaleString()} |
| Success Rate | ${(results.successRate * 100).toFixed(2)}% |

## Latency Metrics

| Percentile | Latency |
|------------|---------|
| Average | ${results.avgLatencyMs.toFixed(2)}ms |
| Minimum | ${results.minLatencyMs.toFixed(2)}ms |
| Maximum | ${results.maxLatencyMs.toFixed(2)}ms |
| P50 (Median) | ${results.p50LatencyMs.toFixed(2)}ms |
| P95 | ${results.p95LatencyMs.toFixed(2)}ms |
| P99 | ${results.p99LatencyMs.toFixed(2)}ms |

### Latency Distribution

\`\`\`
P50  [${'█'.repeat(Math.round(results.p50LatencyMs / 2))}] ${results.p50LatencyMs.toFixed(1)}ms
P95  [${'█'.repeat(Math.round(results.p95LatencyMs / 2))}] ${results.p95LatencyMs.toFixed(1)}ms
P99  [${'█'.repeat(Math.round(results.p99LatencyMs / 2))}] ${results.p99LatencyMs.toFixed(1)}ms
\`\`\`

## Throughput Metrics

| Metric | Value |
|--------|-------|
| Test Duration | ${(results.durationMs / 1000).toFixed(2)}s |
| Average Throughput | ${results.throughput.toFixed(1)} qps |
| Peak Throughput | ${results.peakThroughput.toFixed(1)} qps |
| Efficiency | ${(results.throughput / results.config.targetThroughput * 100).toFixed(1)}% of target |

## Resource Utilization

| Metric | Value |
|--------|-------|
| Cache Hit Rate | ${(results.cacheHitRate * 100).toFixed(1)}% |
| Memory Used | ${results.memoryUsedMB.toFixed(1)} MB |
| Peak Memory | ${results.peakMemoryMB.toFixed(1)} MB |

## Error Analysis

${Object.keys(results.errorBreakdown).length > 0 ? `
| Error Type | Count | Percentage |
|------------|-------|------------|
${Object.entries(results.errorBreakdown).map(([error, count]) => 
  `| ${error} | ${count} | ${((count / results.failedQueries) * 100).toFixed(1)}% |`
).join('\n')}
` : '**No errors recorded** ✅'}

## Performance Comparison

### vs. Target Performance

| Metric | Achieved | Target | Difference |
|--------|----------|--------|------------|
| Throughput | ${results.throughput.toFixed(1)} qps | ${results.config.targetThroughput} qps | ${results.throughput >= results.config.targetThroughput ? '+' : ''}${((results.throughput - results.config.targetThroughput) / results.config.targetThroughput * 100).toFixed(1)}% |
| P99 Latency | ${results.p99LatencyMs.toFixed(1)}ms | ${results.config.maxLatencyMs}ms | ${results.p99LatencyMs <= results.config.maxLatencyMs ? '-' : '+'}${Math.abs(((results.p99LatencyMs - results.config.maxLatencyMs) / results.config.maxLatencyMs * 100)).toFixed(1)}% |

### Efficiency Multiplier

Based on the cache hit rate of ${(results.cacheHitRate * 100).toFixed(1)}%, the effective efficiency multiplier is:

**${(1 / (1 - results.cacheHitRate)).toFixed(1)}x** 

This means for every ${(1 / (1 - results.cacheHitRate)).toFixed(0)} queries served, only 1 actual API call is made.

## Recommendations

${results.passed ? `
✅ **System is performing within acceptable parameters.**

Potential optimizations:
- Consider increasing cache TTL to improve hit rate further
- Monitor memory usage under sustained load
- Set up alerting for throughput degradation
` : `
❌ **System needs optimization.**

${results.failureReasons.map(r => `- ${r}`).join('\n')}

Recommended actions:
${results.throughput < results.config.targetThroughput ? '- Increase concurrency or optimize query processing' : ''}
${results.p99LatencyMs > results.config.maxLatencyMs ? '- Investigate slow queries and optimize provider selection' : ''}
${results.successRate < 0.99 ? '- Review error handling and retry logic' : ''}
`}

## Test Environment

- **Node.js Version**: ${process.version}
- **Platform**: ${process.platform}
- **Architecture**: ${process.arch}
- **Test Date**: ${timestamp}

---

*Report generated by Whale Fusion Engine Stress Test Suite*
`;
}

// =============================================================================
// MAIN RUNNER
// =============================================================================

async function main(): Promise<void> {
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info('🐋 WHALE FUSION ENGINE - STRESS TEST SUITE');
  logger.info('═══════════════════════════════════════════════════════════════');
  
  const args = process.argv.slice(2);
  const isQuick = args.includes('--quick');
  const isFull = args.includes('--full');
  const isExtreme = args.includes('--extreme');
  const generateReport = args.includes('--report') || args.includes('-r');
  
  // Determine test configuration
  let config: any = {};
  
  if (isQuick) {
    config = { totalQueries: 1000, concurrentQueries: 50 };
    logger.info('Running QUICK test (1000 queries)');
  } else if (isExtreme) {
    config = { totalQueries: 50000, concurrentQueries: 200 };
    logger.info('Running EXTREME test (50000 queries)');
  } else if (isFull) {
    config = { totalQueries: 10000, concurrentQueries: 100 };
    logger.info('Running FULL test (10000 queries)');
  } else {
    config = { totalQueries: 10000, concurrentQueries: 100 };
    logger.info('Running DEFAULT test (10000 queries)');
  }
  
  try {
    // Run stress test
    const results = await runStressTest(config);
    
    // Generate performance report
    if (generateReport || true) { // Always generate report
      const report = generatePerformanceReport(results);
      
      // Save report
      const reportDir = path.join(__dirname, '..', 'reports');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      const reportPath = path.join(reportDir, `performance-report-${Date.now()}.md`);
      fs.writeFileSync(reportPath, report);
      
      logger.info(`\n📄 Performance report saved to: ${reportPath}`);
      
      // Also save as latest
      const latestPath = path.join(reportDir, 'PERFORMANCE_REPORT.md');
      fs.writeFileSync(latestPath, report);
      logger.info(`📄 Latest report: ${latestPath}`);
    }
    
    // Save JSON results
    const resultsDir = path.join(__dirname, '..', 'reports');
    const jsonPath = path.join(resultsDir, `stress-test-results-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    logger.info(`📊 JSON results saved to: ${jsonPath}`);
    
    // Exit with appropriate code
    process.exit(results.passed ? 0 : 1);
    
  } catch (error: any) {
    logger.error('Stress test failed with error:', { error: error.message });
    process.exit(1);
  }
}

// Run
main();

