/**
 * Token Unlocks Integration Example
 * Divine world-class demonstration of the token unlocks system
 * 
 * This example demonstrates:
 * - Service initialization
 * - Fetching upcoming unlocks
 * - Impact analysis
 * - Alert generation
 * - Analytics reporting
 * - Integration with price feeds
 */

import { TokenUnlocksService } from '../services/token-unlocks.service';
import { TokenUnlocksAnalytics } from '../services/token-unlocks-analytics';
import { MarketDataAggregator } from '../aggregator';
import { logger } from '../utils/logger';

// Configuration
const config = {
  messari: {
    apiKey: process.env.MESSARI_API_KEY || 'your-api-key-here',
    apiUrl: 'https://data.messari.io/api/v1',
  },
  cache: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    defaultTTL: 86400, // 24 hours
    nearTermThreshold: 7, // 7 days
    nearTermTTL: 3600, // 1 hour
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'coinet',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  scheduler: {
    dailyPollingCron: '0 0 * * *', // Daily at midnight
    nearTermPollingCron: '0 * * * *', // Every hour
    nearTermThresholdDays: 7,
    daysAheadToFetch: 90,
    enableDailyPolling: true,
    enableNearTermPolling: true,
  },
  enablePriceFeedIntegration: true,
  alertThresholds: {
    minSeverity: 'medium' as const,
    daysAhead: 7,
  },
};

/**
 * Example 1: Initialize and start the service
 */
async function example1_InitializeService() {
  logger.info('=== Example 1: Initialize Token Unlocks Service ===');

  try {
    // Create service instance
    const service = new TokenUnlocksService(config);

    // Initialize (creates database schema, starts scheduler)
    await service.initialize();

    logger.info('Token unlocks service initialized successfully');

    // Get service health status
    const health = await service.getHealthStatus();
    logger.info('Service health status', health);

    // Get service statistics
    const stats = await service.getStats();
    logger.info('Service statistics', stats);

    // Shutdown gracefully
    await service.shutdown();
  } catch (error) {
    logger.error('Failed to initialize service', { error });
  }
}

/**
 * Example 2: Fetch upcoming unlocks for a specific token
 */
async function example2_FetchUpcomingUnlocks() {
  logger.info('=== Example 2: Fetch Upcoming Unlocks for a Token ===');

  try {
    const service = new TokenUnlocksService(config);
    await service.initialize();

    // Fetch upcoming unlocks for Arbitrum (ARB)
    const symbol = 'ARB';
    const daysAhead = 30;

    logger.info(`Fetching unlocks for ${symbol} in next ${daysAhead} days...`);
    const unlocks = await service.getUpcomingUnlocks(symbol, daysAhead, true);

    logger.info(`Found ${unlocks.length} upcoming unlocks for ${symbol}`);

    // Display each unlock
    unlocks.forEach((unlock) => {
      logger.info('Unlock event', {
        date: unlock.unlockDate.toISOString(),
        amount: unlock.unlockAmount.toLocaleString(),
        valueUsd: `$${unlock.unlockAmountUsd.toLocaleString()}`,
        percentage: `${unlock.unlockPercentage.toFixed(2)}%`,
        category: unlock.category,
        severity: unlock.severity,
        impactScore: unlock.impactScore,
      });
    });

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to fetch upcoming unlocks', { error });
  }
}

/**
 * Example 3: Get all upcoming unlocks across all tokens
 */
async function example3_GetAllUpcomingUnlocks() {
  logger.info('=== Example 3: Get All Upcoming Unlocks ===');

  try {
    const service = new TokenUnlocksService(config);
    await service.initialize();

    const daysAhead = 7; // Next 7 days
    logger.info(`Fetching all unlocks in next ${daysAhead} days...`);

    const unlocks = await service.getAllUpcomingUnlocks(daysAhead, true);

    logger.info(`Found ${unlocks.length} total upcoming unlocks`);

    // Group by symbol
    const bySymbol = new Map<string, typeof unlocks>();
    unlocks.forEach((unlock) => {
      if (!bySymbol.has(unlock.symbol)) {
        bySymbol.set(unlock.symbol, []);
      }
      bySymbol.get(unlock.symbol)!.push(unlock);
    });

    // Display summary by symbol
    logger.info('Unlocks by symbol:');
    for (const [symbol, symbolUnlocks] of bySymbol) {
      const totalValue = symbolUnlocks.reduce(
        (sum, u) => sum + u.unlockAmountUsd,
        0
      );
      logger.info(`  ${symbol}: ${symbolUnlocks.length} unlocks, $${totalValue.toLocaleString()}`);
    }

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to fetch all upcoming unlocks', { error });
  }
}

/**
 * Example 4: Get high-impact unlocks only
 */
async function example4_GetHighImpactUnlocks() {
  logger.info('=== Example 4: Get High-Impact Unlocks ===');

  try {
    const service = new TokenUnlocksService(config);
    await service.initialize();

    const daysAhead = 30;
    const minSeverity = 'high';

    logger.info(
      `Fetching ${minSeverity}+ severity unlocks in next ${daysAhead} days...`
    );
    const unlocks = await service.getHighImpactUnlocks(daysAhead, minSeverity);

    logger.info(`Found ${unlocks.length} high-impact unlocks`);

    // Display each high-impact unlock
    unlocks.forEach((unlock) => {
      logger.warn('HIGH-IMPACT UNLOCK DETECTED', {
        symbol: unlock.symbol,
        date: unlock.unlockDate.toISOString(),
        valueUsd: `$${unlock.unlockAmountUsd.toLocaleString()}`,
        severity: unlock.severity,
        impactScore: unlock.impactScore,
        category: unlock.category,
      });
    });

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to fetch high-impact unlocks', { error });
  }
}

/**
 * Example 5: Generate alerts for upcoming unlocks
 */
async function example5_GenerateAlerts() {
  logger.info('=== Example 5: Generate Unlock Alerts ===');

  try {
    const service = new TokenUnlocksService(config);
    await service.initialize();

    const daysAhead = 7;
    const minSeverity = 'medium';

    logger.info(`Generating alerts for next ${daysAhead} days...`);
    const alerts = await service.generateAlerts(daysAhead, minSeverity);

    logger.info(`Generated ${alerts.length} alerts`);

    // Display each alert
    alerts.forEach((alert) => {
      logger.warn('UNLOCK ALERT', {
        symbol: alert.assetSymbol,
        daysUntil: alert.daysUntilUnlock,
        severity: alert.severity,
        message: alert.message,
        action: alert.recommendedAction,
      });
    });

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to generate alerts', { error });
  }
}

/**
 * Example 6: Get tokenomics data for a token
 */
async function example6_GetTokenomics() {
  logger.info('=== Example 6: Get Tokenomics Data ===');

  try {
    const service = new TokenUnlocksService(config);
    await service.initialize();

    const symbol = 'APT'; // Aptos

    logger.info(`Fetching tokenomics for ${symbol}...`);
    const tokenomics = await service.getTokenomics(symbol, true);

    if (tokenomics) {
      logger.info('Tokenomics data', {
        symbol: tokenomics.asset_symbol,
        name: tokenomics.asset_name,
        totalSupply: tokenomics.total_supply?.toLocaleString(),
        circulatingSupply: tokenomics.circulating_supply?.toLocaleString(),
        inflationRate: `${tokenomics.inflation_rate_annual?.toFixed(2)}%`,
        upcomingUnlocks: tokenomics.upcoming_unlocks?.length || 0,
        vestingSchedules: tokenomics.vesting_schedules?.length || 0,
      });

      // Display supply distribution
      if (tokenomics.supply_distribution) {
        logger.info('Supply distribution:');
        tokenomics.supply_distribution.forEach((dist) => {
          logger.info(`  ${dist.category}: ${dist.percentage.toFixed(2)}% (${dist.amount.toLocaleString()} tokens)`);
        });
      }
    } else {
      logger.warn(`No tokenomics data found for ${symbol}`);
    }

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to fetch tokenomics', { error });
  }
}

/**
 * Example 7: Perform impact analysis
 */
async function example7_ImpactAnalysis() {
  logger.info('=== Example 7: Impact Analysis ===');

  try {
    const service = new TokenUnlocksService(config);
    await service.initialize();

    const symbol = 'ARB';
    const unlocks = await service.getUpcomingUnlocks(symbol, 30, true);

    if (unlocks.length > 0) {
      logger.info(`Analyzing impact for ${unlocks.length} unlocks...`);

      // Analyze each unlock
      unlocks.forEach((unlock) => {
        const assessment = TokenUnlocksAnalytics.calculateImpactAssessment(
          unlock
        );

        logger.info('Impact Assessment', {
          date: unlock.unlockDate.toISOString().split('T')[0],
          overallScore: assessment.overallScore,
          severity: assessment.severity,
          pricePressure: assessment.expectedPricePressure,
        });

        // Display factors
        logger.info('Impact Factors', assessment.factors);

        // Display recommendations
        logger.info('Recommendations:');
        assessment.recommendations.forEach((rec) => {
          logger.info(`  - ${rec}`);
        });

        // Display alerts
        if (assessment.alerts.length > 0) {
          logger.warn('Alerts:');
          assessment.alerts.forEach((alert) => {
            logger.warn(`  ! ${alert}`);
          });
        }
      });
    }

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to perform impact analysis', { error });
  }
}

/**
 * Example 8: Market pressure analysis
 */
async function example8_MarketPressureAnalysis() {
  logger.info('=== Example 8: Market Pressure Analysis ===');

  try {
    const service = new TokenUnlocksService(config);
    await service.initialize();

    const symbol = 'APT';
    const daysAhead = 30;

    const unlocks = await service.getUpcomingUnlocks(symbol, daysAhead, true);

    if (unlocks.length > 0) {
      const pressure = TokenUnlocksAnalytics.analyzeMarketPressure(
        unlocks,
        undefined,
        daysAhead
      );

      logger.info('Market Pressure Analysis', {
        symbol: pressure.symbol,
        timeframe: pressure.timeframe,
        totalUnlocks: pressure.totalUpcomingUnlocks,
        totalValue: `$${pressure.totalUnlockValueUsd.toLocaleString()}`,
        percentOfMarketCap: `${pressure.percentOfMarketCap.toFixed(2)}%`,
        pressureLevel: pressure.pressureLevel,
      });

      logger.info('Peak Pressure Dates:');
      pressure.peakPressureDates.forEach((date) => {
        logger.info(`  ${date.toISOString().split('T')[0]}`);
      });

      logger.info('Recommendations:');
      pressure.recommendations.forEach((rec) => {
        logger.info(`  - ${rec}`);
      });
    }

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to analyze market pressure', { error });
  }
}

/**
 * Example 9: Get comprehensive analytics report
 */
async function example9_AnalyticsReport() {
  logger.info('=== Example 9: Comprehensive Analytics Report ===');

  try {
    const service = new TokenUnlocksService(config);
    await service.initialize();

    // Get analytics for all upcoming unlocks
    const analytics = await service.getUnlockAnalytics(90);

    logger.info('Unlock Analytics Summary', {
      totalUpcoming: analytics.totalUpcoming,
      totalValue: `$${analytics.totalValueUsd.toLocaleString()}`,
    });

    logger.info('By Category:');
    Object.entries(analytics.byCategory).forEach(([category, data]) => {
      logger.info(`  ${category}: ${data.count} unlocks, $${data.valueUsd.toLocaleString()}`);
    });

    logger.info('By Severity:');
    Object.entries(analytics.bySeverity).forEach(([severity, data]) => {
      logger.info(`  ${severity}: ${data.count} unlocks, $${data.valueUsd.toLocaleString()}`);
    });

    logger.info('By Timeframe:');
    logger.info(`  Next 7 days: ${analytics.byTimeframe.next7Days.count} unlocks, $${analytics.byTimeframe.next7Days.valueUsd.toLocaleString()}`);
    logger.info(`  Next 30 days: ${analytics.byTimeframe.next30Days.count} unlocks, $${analytics.byTimeframe.next30Days.valueUsd.toLocaleString()}`);
    logger.info(`  Next 90 days: ${analytics.byTimeframe.next90Days.count} unlocks, $${analytics.byTimeframe.next90Days.valueUsd.toLocaleString()}`);

    logger.info('Top Unlocks by Value:');
    analytics.topUnlocksByValue.slice(0, 5).forEach((unlock, i) => {
      logger.info(`  ${i + 1}. ${unlock.symbol}: $${unlock.unlockAmountUsd.toLocaleString()} on ${unlock.unlockDate.toISOString().split('T')[0]}`);
    });

    logger.info('Top Unlocks by Impact:');
    analytics.topUnlocksByImpact.slice(0, 5).forEach((unlock, i) => {
      logger.info(`  ${i + 1}. ${unlock.symbol}: Impact ${unlock.impactScore}/100 on ${unlock.unlockDate.toISOString().split('T')[0]}`);
    });

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to generate analytics report', { error });
  }
}

/**
 * Example 10: Listen to scheduler events
 */
async function example10_SchedulerEvents() {
  logger.info('=== Example 10: Scheduler Events ===');

  try {
    const service = new TokenUnlocksService(config);
    await service.initialize();

    // Listen to events
    service.on('daily_poll_completed', (data) => {
      logger.info('Daily poll completed', { count: data.count });
    });

    service.on('near_term_poll_completed', (data) => {
      logger.info('Near-term poll completed', { count: data.count });
    });

    service.on('poll_failed', (data) => {
      logger.error('Poll failed', { error: data.error });
    });

    service.on('alerts_generated', (data) => {
      logger.info('Alerts generated', { count: data.count });
    });

    logger.info('Listening for events... (will run for 5 minutes)');

    // Keep alive for 5 minutes to listen to events
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));

    await service.shutdown();
  } catch (error) {
    logger.error('Failed to listen to events', { error });
  }
}

/**
 * Main function - run all examples
 */
async function main() {
  const examples = [
    { name: 'Initialize Service', fn: example1_InitializeService },
    { name: 'Fetch Upcoming Unlocks', fn: example2_FetchUpcomingUnlocks },
    { name: 'Get All Upcoming Unlocks', fn: example3_GetAllUpcomingUnlocks },
    { name: 'Get High-Impact Unlocks', fn: example4_GetHighImpactUnlocks },
    { name: 'Generate Alerts', fn: example5_GenerateAlerts },
    { name: 'Get Tokenomics', fn: example6_GetTokenomics },
    { name: 'Impact Analysis', fn: example7_ImpactAnalysis },
    { name: 'Market Pressure Analysis', fn: example8_MarketPressureAnalysis },
    { name: 'Analytics Report', fn: example9_AnalyticsReport },
    // Skip example 10 by default (long-running)
    // { name: 'Scheduler Events', fn: example10_SchedulerEvents },
  ];

  logger.info('🚀 Token Unlocks Integration Examples');
  logger.info('=====================================\n');

  for (const example of examples) {
    try {
      logger.info(`\n📋 Running: ${example.name}\n`);
      await example.fn();
      logger.info(`\n✅ Completed: ${example.name}\n`);
    } catch (error) {
      logger.error(`\n❌ Failed: ${example.name}`, { error });
    }

    // Wait between examples
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  logger.info('\n🎉 All examples completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error', { error });
    process.exit(1);
  });
}

export {
  example1_InitializeService,
  example2_FetchUpcomingUnlocks,
  example3_GetAllUpcomingUnlocks,
  example4_GetHighImpactUnlocks,
  example5_GenerateAlerts,
  example6_GetTokenomics,
  example7_ImpactAnalysis,
  example8_MarketPressureAnalysis,
  example9_AnalyticsReport,
  example10_SchedulerEvents,
};

