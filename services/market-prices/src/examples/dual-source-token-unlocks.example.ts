/**
 * Dual-Source Token Unlocks Integration Example
 * Divine world-class demonstration of Messari + The Tie integration
 * 
 * This example demonstrates:
 * - Dual-source data aggregation
 * - Automatic reconciliation
 * - Discrepancy detection
 * - Consensus value calculation
 * - Historical backtesting
 * - Quality scoring
 * - Production-ready usage patterns
 */

import { UnifiedTokenUnlocksService } from '../services/unified-token-unlocks.service';
import { DualSourceUnlocksReconciliation } from '../services/dual-source-unlocks-reconciliation';
import { MessariRestClient } from '../providers/messari-rest';
import { TheTieRestClient } from '../providers/thetie-rest';
import { logger } from '../utils/logger';

// Configuration
const config = {
  messari: {
    apiKey: process.env.MESSARI_API_KEY || 'your-messari-api-key',
    apiUrl: 'https://data.messari.io/api/v1',
    enabled: true,
  },
  thetie: {
    apiKey: process.env.THETIE_API_KEY || 'your-thetie-api-key',
    apiUrl: 'https://api.thetie.io/v1',
    enabled: true,
  },
  cache: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    defaultTTL: 86400,
    nearTermThreshold: 7,
    nearTermTTL: 3600,
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'coinet',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  reconciliation: {
    tolerancePercent: 5, // 5% tolerance
    preferredSource: 'auto' as const,
    minConfidenceThreshold: 70,
    enableAlerts: true,
  },
  enablePriceFeedIntegration: true,
  enableScheduler: false, // Disabled for examples
};

/**
 * Example 1: Compare data from both sources
 */
async function example1_CompareBothSources() {
  logger.info('=== Example 1: Compare Messari vs The Tie ===');

  try {
    // Initialize clients
    const messariClient = new MessariRestClient({
      apiKey: config.messari.apiKey,
      apiUrl: config.messari.apiUrl,
      rateLimit: {
        maxRequestsPerMinute: 30,
        reservoir: 30,
        reservoirRefreshAmount: 30,
        reservoirRefreshInterval: 60000,
      },
      retry: { retries: 3, retryDelay: 2000 },
      priority: 2,
    });

    const theTieClient = new TheTieRestClient({
      apiKey: config.thetie.apiKey,
      apiUrl: config.thetie.apiUrl,
      rateLimit: {
        maxRequestsPerMinute: 60,
        reservoir: 60,
        reservoirRefreshAmount: 60,
        reservoirRefreshInterval: 60000,
      },
      retry: { retries: 3, retryDelay: 2000 },
      priority: 3,
    });

    const ticker = 'ARB';
    const daysAhead = 30;

    // Fetch from both sources
    logger.info(`Fetching ${ticker} unlocks from both sources...`);
    const [messariUnlocks, theTieUnlocks] = await Promise.all([
      messariClient.getUpcomingUnlocksNormalized(daysAhead, 0),
      theTieClient.getUpcomingUnlocksNormalized(daysAhead, 70),
    ]);

    logger.info('Data comparison:', {
      messariCount: messariUnlocks.length,
      theTieCount: theTieUnlocks.length,
    });

    // Use compareUnlockData method
    const comparisons = theTieClient.compareUnlockData(
      ticker,
      messariUnlocks,
      theTieUnlocks
    );

    logger.info(`Found ${comparisons.length} unlock events to compare`);

    // Display comparisons
    comparisons.forEach(comp => {
      logger.info('Unlock Comparison', {
        date: comp.unlockDate.toISOString().split('T')[0],
        messariAmount: comp.messariData?.unlockAmount,
        theTieAmount: comp.theTieData?.tokensUnlocked,
        discrepancies: comp.discrepancies.length,
        consensusConfidence: comp.consensusValue.confidence,
      });

      if (comp.discrepancies.length > 0) {
        logger.warn('Discrepancies found:');
        comp.discrepancies.forEach(d => {
          logger.warn(`  ${d.field}: Messari=${d.messariValue}, The Tie=${d.theTieValue}, Diff=${d.differencePercent?.toFixed(1)}%`);
        });
      }
    });
  } catch (error) {
    logger.error('Failed to compare sources', { error });
  }
}

/**
 * Example 2: Use unified service with automatic reconciliation
 */
async function example2_UnifiedService() {
  logger.info('=== Example 2: Unified Service with Reconciliation ===');

  try {
    const service = new UnifiedTokenUnlocksService(config);
    await service.initialize();

    const ticker = 'ARB';
    logger.info(`Fetching unified unlocks for ${ticker}...`);

    const unlocks = await service.getUnifiedUnlocks(ticker, 30);

    logger.info(`Found ${unlocks.length} reconciled unlocks`);

    unlocks.forEach(unlock => {
      logger.info('Unified Unlock', {
        date: unlock.unlockDate.toISOString().split('T')[0],
        amount: unlock.tokensUnlocked.toLocaleString(),
        valueUsd: `$${unlock.tokensUnlockedUsd.toLocaleString()}`,
        percentage: `${unlock.percentageOfSupply.toFixed(2)}%`,
        category: unlock.category,
        confidence: unlock.confidence,
        sources: unlock.sources.join(' + '),
        quality: unlock.quality.score,
        impact: unlock.impact.severity,
      });

      if (unlock.quality.hasDiscrepancies) {
        logger.warn(`  ⚠️ ${unlock.quality.discrepancyCount} discrepancies detected`);
      }

      if (unlock.historical) {
        logger.info('  Historical Impact:', {
          '1d': `${unlock.historical.priceChange1d?.toFixed(2)}%`,
          '7d': `${unlock.historical.priceChange7d?.toFixed(2)}%`,
          '30d': `${unlock.historical.priceChange30d?.toFixed(2)}%`,
        });
      }
    });

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to use unified service', { error });
  }
}

/**
 * Example 3: Multi-ticker reconciliation report
 */
async function example3_MultiTickerReconciliation() {
  logger.info('=== Example 3: Multi-Ticker Reconciliation Report ===');

  try {
    // Initialize clients
    const messariClient = new MessariRestClient({
      apiKey: config.messari.apiKey,
      apiUrl: config.messari.apiUrl,
      rateLimit: { maxRequestsPerMinute: 30, reservoir: 30, reservoirRefreshAmount: 30, reservoirRefreshInterval: 60000 },
      retry: { retries: 3, retryDelay: 2000 },
      priority: 2,
    });

    const theTieClient = new TheTieRestClient({
      apiKey: config.thetie.apiKey,
      apiUrl: config.thetie.apiUrl,
      rateLimit: { maxRequestsPerMinute: 60, reservoir: 60, reservoirRefreshAmount: 60, reservoirRefreshInterval: 60000 },
      retry: { retries: 3, retryDelay: 2000 },
      priority: 3,
    });

    const reconciliation = new DualSourceUnlocksReconciliation(
      messariClient,
      theTieClient
    );

    const tickers = ['ARB', 'APT', 'OP', 'SUI'];
    logger.info(`Reconciling ${tickers.length} tickers...`);

    const report = await reconciliation.reconcileMultipleTickers(tickers, 60);

    logger.info('Reconciliation Report Summary', {
      totalUnlocks: report.totalUnlocks,
      messariOnly: report.messariOnlyCount,
      theTieOnly: report.theTieOnlyCount,
      bothSources: report.bothSourcesCount,
      discrepancies: report.discrepancyCount,
      averageQuality: report.averageQualityScore.toFixed(2),
      criticalIssues: report.criticalDiscrepancies.length,
    });

    logger.info('Coverage Analysis:');
    const dualSourcePercent = (report.bothSourcesCount / report.totalUnlocks) * 100;
    logger.info(`  Dual-source coverage: ${dualSourcePercent.toFixed(1)}%`);
    logger.info(`  Messari exclusive: ${report.messariOnlyCount}`);
    logger.info(`  The Tie exclusive: ${report.theTieOnlyCount}`);

    logger.info('Recommendations:');
    report.recommendations.forEach(rec => {
      logger.info(`  - ${rec}`);
    });

    if (report.criticalDiscrepancies.length > 0) {
      logger.warn('Critical Discrepancies:');
      report.criticalDiscrepancies.slice(0, 5).forEach(d => {
        logger.warn(`  ${d.field}: ${d.differencePercent?.toFixed(1)}% difference - ${d.impact}`);
      });
    }
  } catch (error) {
    logger.error('Failed to generate reconciliation report', { error });
  }
}

/**
 * Example 4: Historical backtesting
 */
async function example4_HistoricalBacktest() {
  logger.info('=== Example 4: Historical Backtesting ===');

  try {
    const service = new UnifiedTokenUnlocksService(config);
    await service.initialize();

    const ticker = 'ARB';
    const lookbackDays = 90;

    logger.info(`Performing backtest for ${ticker} over ${lookbackDays} days...`);

    const backtestResults = await service.performBacktest(ticker, lookbackDays);

    logger.info(`Analyzed ${backtestResults.length} historical unlock events`);

    // Calculate overall accuracy
    const avgAccuracy = backtestResults.reduce((sum, r) => sum + r.accuracy.scoreAccuracy, 0) / backtestResults.length;
    const correctDirectionCount = backtestResults.filter(r => r.accuracy.directionCorrect).length;
    const directionAccuracy = (correctDirectionCount / backtestResults.length) * 100;

    logger.info('Backtest Summary', {
      eventsAnalyzed: backtestResults.length,
      averageAccuracy: `${avgAccuracy.toFixed(1)}%`,
      directionAccuracy: `${directionAccuracy.toFixed(1)}%`,
      correctPredictions: correctDirectionCount,
    });

    // Display each result
    backtestResults.forEach((result, i) => {
      logger.info(`\nBacktest Event ${i + 1}`, {
        date: result.unlockDate.toISOString().split('T')[0],
        predicted: result.predicted,
        actual: {
          '1d': `${result.actual.priceChange1d.toFixed(2)}%`,
          '7d': `${result.actual.priceChange7d.toFixed(2)}%`,
          '30d': `${result.actual.priceChange30d.toFixed(2)}%`,
        },
        accuracy: `${result.accuracy.scoreAccuracy.toFixed(1)}%`,
      });

      logger.info('Lessons:');
      result.lessons.forEach(lesson => {
        logger.info(`  ${lesson}`);
      });
    });

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to perform backtest', { error });
  }
}

/**
 * Example 5: Comprehensive analytics with all features
 */
async function example5_ComprehensiveAnalytics() {
  logger.info('=== Example 5: Comprehensive Analytics ===');

  try {
    const service = new UnifiedTokenUnlocksService(config);
    await service.initialize();

    const tickers = ['ARB', 'APT', 'OP'];
    logger.info(`Generating comprehensive analytics for ${tickers.length} tickers...`);

    const analytics = await service.getComprehensiveAnalytics(tickers, 90);

    logger.info('Analytics Summary', analytics.summary);

    if (analytics.reconciliation) {
      logger.info('Reconciliation Report', {
        totalUnlocks: analytics.reconciliation.totalUnlocks,
        bothSources: analytics.reconciliation.bothSourcesCount,
        discrepancies: analytics.reconciliation.discrepancyCount,
        averageQuality: analytics.reconciliation.averageQualityScore.toFixed(2),
      });
    }

    // Display unlocks by ticker
    analytics.unlocks.forEach((unlocks, ticker) => {
      const totalValue = unlocks.reduce((sum, u) => sum + u.tokensUnlockedUsd, 0);
      const avgQuality = unlocks.reduce((sum, u) => sum + u.quality.score, 0) / unlocks.length;
      const critical = unlocks.filter(u => u.impact.severity === 'critical').length;

      logger.info(`${ticker} Summary`, {
        unlocks: unlocks.length,
        totalValue: `$${totalValue.toLocaleString()}`,
        avgQuality: avgQuality.toFixed(1),
        criticalUnlocks: critical,
      });
    });

    // Display backtest results if available
    if (analytics.backtest && analytics.backtest.size > 0) {
      logger.info('\nBacktest Results:');
      analytics.backtest.forEach((results, ticker) => {
        const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy.scoreAccuracy, 0) / results.length;
        logger.info(`  ${ticker}: ${results.length} events, ${avgAccuracy.toFixed(1)}% accuracy`);
      });
    }

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to generate comprehensive analytics', { error });
  }
}

/**
 * Example 6: Listen to reconciliation events
 */
async function example6_ReconciliationEvents() {
  logger.info('=== Example 6: Reconciliation Events ===');

  try {
    const service = new UnifiedTokenUnlocksService(config);
    await service.initialize();

    // Listen for critical discrepancies
    service.on('critical_discrepancy', (data) => {
      logger.warn('🚨 CRITICAL DISCREPANCY DETECTED', {
        ticker: data.ticker,
        date: data.unlockDate,
        field: data.discrepancy.field,
        difference: `${data.discrepancy.differencePercent?.toFixed(1)}%`,
      });

      // In production, you would:
      // - Send alert to monitoring system
      // - Create ticket for manual review
      // - Log to audit trail
    });

    // Fetch data to trigger events
    await service.getUnifiedUnlocks('ARB', 30);

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to listen to events', { error });
  }
}

/**
 * Example 7: Quality-based filtering
 */
async function example7_QualityFiltering() {
  logger.info('=== Example 7: Quality-Based Filtering ===');

  try {
    const service = new UnifiedTokenUnlocksService(config);
    await service.initialize();

    const ticker = 'APT';
    
    // Get all unlocks
    const allUnlocks = await service.getUnifiedUnlocks(ticker, 90);
    
    // Get only high-quality unlocks (90+ quality score)
    const highQuality = await service.getUnifiedUnlocks(ticker, 90, {
      minQuality: 90,
    });

    logger.info('Quality Filtering Results', {
      total: allUnlocks.length,
      highQuality: highQuality.length,
      filteredOut: allUnlocks.length - highQuality.length,
    });

    // Group by quality tiers
    const byQuality = {
      excellent: allUnlocks.filter(u => u.quality.score >= 90),
      good: allUnlocks.filter(u => u.quality.score >= 70 && u.quality.score < 90),
      fair: allUnlocks.filter(u => u.quality.score >= 50 && u.quality.score < 70),
      poor: allUnlocks.filter(u => u.quality.score < 50),
    };

    logger.info('Quality Distribution:', {
      excellent: byQuality.excellent.length,
      good: byQuality.good.length,
      fair: byQuality.fair.length,
      poor: byQuality.poor.length,
    });

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to perform quality filtering', { error });
  }
}

/**
 * Example 8: Research-grade analysis with The Tie
 */
async function example8_ResearchGradeAnalysis() {
  logger.info('=== Example 8: Research-Grade Analysis ===');

  try {
    // Initialize The Tie client
    const theTieClient = new TheTieRestClient({
      apiKey: config.thetie.apiKey,
      apiUrl: config.thetie.apiUrl,
      rateLimit: { maxRequestsPerMinute: 60, reservoir: 60, reservoirRefreshAmount: 60, reservoirRefreshInterval: 60000 },
      retry: { retries: 3, retryDelay: 2000 },
      priority: 3,
    });

    const ticker = 'ARB';

    // Get high-confidence, high-impact unlocks from The Tie
    logger.info('Fetching high-impact unlocks from The Tie...');
    const highImpact = await theTieClient.getHighImpactUnlocks(14);

    logger.info(`Found ${highImpact.length} high-impact unlocks`);

    // Get detailed impact analysis
    for (const unlock of highImpact.slice(0, 3)) {
      try {
        const impact = await theTieClient.getUnlockImpactAnalysis(
          unlock.ticker,
          unlock.unlockDate.toISOString().split('T')[0]
        );

        logger.info(`\nDetailed Impact Analysis for ${unlock.ticker}`, {
          unlockDate: impact.unlock_date,
          unlockValue: `$${impact.unlock_amount_usd.toLocaleString()}`,
          impactScore: impact.risk_assessment.impact_score,
          riskLevel: impact.risk_assessment.risk_level,
          sellPressureEstimate: `${impact.risk_assessment.sell_pressure_estimate.toFixed(1)}%`,
        });

        if (impact.historical_precedent) {
          logger.info('  Historical Precedent:', {
            similarEvents: impact.historical_precedent.similar_unlocks_count,
            avgImpact1d: `${impact.historical_precedent.average_price_impact_1d.toFixed(2)}%`,
            avgImpact7d: `${impact.historical_precedent.average_price_impact_7d.toFixed(2)}%`,
            avgVolumeSpike: `${impact.historical_precedent.average_volume_spike.toFixed(1)}x`,
          });
        }
      } catch (error) {
        logger.debug('Impact analysis not available', { ticker: unlock.ticker });
      }
    }
  } catch (error) {
    logger.error('Failed to perform research-grade analysis', { error });
  }
}

/**
 * Example 9: Confidence-based decision making
 */
async function example9_ConfidenceBasedDecisions() {
  logger.info('=== Example 9: Confidence-Based Decision Making ===');

  try {
    const service = new UnifiedTokenUnlocksService(config);
    await service.initialize();

    const tickers = ['ARB', 'APT', 'OP', 'SUI'];
    const allUnlocks = await service.getAllUnifiedUnlocks(tickers, 30);

    // Categorize by confidence
    const byConfidence = {
      high: [] as any[],
      medium: [] as any[],
      low: [] as any[],
    };

    allUnlocks.forEach((unlocks, ticker) => {
      unlocks.forEach(unlock => {
        byConfidence[unlock.confidence].push({ ticker, unlock });
      });
    });

    logger.info('Decision Framework:', {
      highConfidence: byConfidence.high.length,
      mediumConfidence: byConfidence.medium.length,
      lowConfidence: byConfidence.low.length,
    });

    logger.info('\nHigh-Confidence Unlocks (Trade with confidence):');
    byConfidence.high.slice(0, 5).forEach(({ ticker, unlock }) => {
      logger.info(`  ${ticker}: ${unlock.tokensUnlockedUsd.toLocaleString()} USD on ${unlock.unlockDate.toISOString().split('T')[0]}`);
      logger.info(`    Quality: ${unlock.quality.score}/100, Sources: ${unlock.sources.join('+')}`);
    });

    logger.info('\nLow-Confidence Unlocks (Verify before trading):');
    byConfidence.low.slice(0, 3).forEach(({ ticker, unlock }) => {
      logger.warn(`  ${ticker}: ${unlock.tokensUnlockedUsd.toLocaleString()} USD on ${unlock.unlockDate.toISOString().split('T')[0]}`);
      logger.warn(`    Quality: ${unlock.quality.score}/100 - VERIFY MANUALLY`);
    });

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to perform confidence-based analysis', { error });
  }
}

/**
 * Example 10: Production monitoring setup
 */
async function example10_ProductionMonitoring() {
  logger.info('=== Example 10: Production Monitoring Setup ===');

  try {
    const service = new UnifiedTokenUnlocksService(config);
    await service.initialize();

    // Set up monitoring
    service.on('critical_discrepancy', (data) => {
      // Send to monitoring system (PagerDuty, Slack, etc.)
      logger.error('🚨 ALERT: Critical discrepancy', data);
    });

    service.on('reconciliation_completed', (data) => {
      logger.info('✅ Reconciliation completed', {
        ticker: data.ticker,
        results: data.results.length,
      });
    });

    // Check health periodically
    setInterval(async () => {
      const health = await service.getHealthStatus();
      logger.info('Health Check', health);

      if (!health.healthy) {
        logger.error('🚨 System unhealthy!', health);
        // Trigger alerts
      }
    }, 60000); // Every minute

    logger.info('Monitoring setup complete. Running for 5 minutes...');

    // Keep alive
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to set up monitoring', { error });
  }
}

/**
 * Main function - run all examples
 */
async function main() {
  const examples = [
    { name: 'Compare Both Sources', fn: example1_CompareBothSources },
    { name: 'Unified Service', fn: example2_UnifiedService },
    { name: 'Multi-Ticker Reconciliation', fn: example3_MultiTickerReconciliation },
    { name: 'Historical Backtesting', fn: example4_HistoricalBacktest },
    { name: 'Comprehensive Analytics', fn: example5_ComprehensiveAnalytics },
    { name: 'Reconciliation Events', fn: example6_ReconciliationEvents },
    { name: 'Quality Filtering', fn: example7_QualityFiltering },
    { name: 'Research-Grade Analysis', fn: example8_ResearchGradeAnalysis },
    { name: 'Confidence-Based Decisions', fn: example9_ConfidenceBasedDecisions },
    // Skip monitoring example by default (long-running)
    // { name: 'Production Monitoring', fn: example10_ProductionMonitoring },
  ];

  logger.info('🚀 Dual-Source Token Unlocks Examples');
  logger.info('======================================\n');

  for (const example of examples) {
    try {
      logger.info(`\n📋 Running: ${example.name}\n`);
      await example.fn();
      logger.info(`\n✅ Completed: ${example.name}\n`);
    } catch (error) {
      logger.error(`\n❌ Failed: ${example.name}`, { error });
    }

    // Wait between examples
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  logger.info('\n🎉 All examples completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error', { error });
    process.exit(1);
  });
}

export {
  example1_CompareBothSources,
  example2_UnifiedService,
  example3_MultiTickerReconciliation,
  example4_HistoricalBacktest,
  example5_ComprehensiveAnalytics,
  example6_ReconciliationEvents,
  example7_QualityFiltering,
  example8_ResearchGradeAnalysis,
  example9_ConfidenceBasedDecisions,
  example10_ProductionMonitoring,
};

