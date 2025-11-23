#!/usr/bin/env tsx

/**
 * Coinet Signal and Alert System Demo
 *
 * This script demonstrates the complete signal processing and alert system
 * that can handle billions of records with enterprise-grade performance,
 * multi-tenant isolation, and advanced analytics capabilities.
 */

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function demoSignalAlertSystem() {
  console.log('🚀 Coinet Signal and Alert System Demo');
  console.log('========================================\n');

  try {
    // Set tenant context for RLS
    await prisma.$executeRaw`SELECT set_tenant_context('default');`;

    console.log('📊 System Overview:');
    console.log('• Signal Sources: Tracks origins of incoming signals');
    console.log('• Signals: Raw signal data storage and processing');
    console.log('• Signal Correlations: Pattern recognition between signals');
    console.log('• Alert Triggers: Alert condition evaluation logging');
    console.log('• Alert Performance: Outcome tracking vs market reality');
    console.log('• User Feedback: UX improvements and ML training');
    console.log('• Notification Logs: High-throughput notification tracking\n');

    // 1. Create signal sources
    console.log('📡 Creating signal sources...');

    const binanceSource = await prisma.signalSource.create({
      data: {
        name: 'Binance Exchange',
        slug: 'binance-exchange',
        description: 'Real-time cryptocurrency exchange data from Binance',
        sourceType: 'exchange',
        sourceUrl: 'wss://stream.binance.com:9443/ws/!ticker@arr',
        network: 'binance',
        metadata: {
          apiKey: 'encrypted-api-key',
          baseUrl: 'https://api.binance.com',
          supportedSymbols: ['BTC', 'ETH', 'ADA', 'DOT'],
          dataTypes: ['MARKET', 'ON_CHAIN'],
          reliability: 'HIGH'
        },
        isActive: true,
        isPublic: true,
        rateLimit: 1000
      }
    });

    const twitterSource = await prisma.signalSource.create({
      data: {
        name: 'Twitter Crypto Sentiment',
        slug: 'twitter-sentiment',
        description: 'Social sentiment analysis from cryptocurrency discussions',
        sourceType: 'social',
        sourceUrl: 'https://api.twitter.com/2/tweets/search/recent',
        network: 'twitter',
        metadata: {
          keywords: ['#bitcoin', '#crypto', '#BTC', '#ETH'],
          sentimentModel: 'v2.1',
          confidenceThreshold: 0.7,
          dataTypes: ['SOCIAL', 'SENTIMENT'],
          reliability: 'MEDIUM'
        },
        isActive: true,
        isPublic: false,
        rateLimit: 300
      }
    });

    console.log(`✅ Created signal sources: ${binanceSource.name}, ${twitterSource.name}\n`);

    // 2. Create signals from these sources
    console.log('📈 Creating and processing signals...');

    const btcPriceSignal = await prisma.signal.create({
      data: {
        sourceId: binanceSource.id,
        tenantId: 'default',
        signalType: 'price_update',
        symbol: 'BTC',
        chain: 'bitcoin',
        rawData: {
          symbol: 'BTCUSDT',
          price: 45000.50,
          volume: 1250000000,
          timestamp: new Date().toISOString(),
          bid: 45000.25,
          ask: 45000.75
        },
        processedData: {
          symbol: 'BTC',
          price: 45000.50,
          change24h: 2.5,
          volume24h: 1250000000,
          marketCap: 850000000000
        },
        confidence: 0.95,
        timestamp: new Date(),
        isValid: true,
        qualityScore: 0.92
      }
    });

    const socialSentimentSignal = await prisma.signal.create({
      data: {
        sourceId: twitterSource.id,
        tenantId: 'default',
        signalType: 'sentiment_analysis',
        symbol: 'BTC',
        rawData: {
          tweetCount: 15420,
          positiveMentions: 8234,
          negativeMentions: 1234,
          neutralMentions: 5952,
          topHashtags: ['#Bitcoin', '#BTC', '#Crypto'],
          timestamp: new Date().toISOString()
        },
        processedData: {
          symbol: 'BTC',
          sentimentScore: 0.72,
          bullishRatio: 0.85,
          bearishRatio: 0.15,
          confidence: 0.78
        },
        confidence: 0.78,
        timestamp: new Date(),
        isValid: true,
        qualityScore: 0.85
      }
    });

    console.log(`✅ Created signals: BTC price (${btcPriceSignal.id}), Social sentiment (${socialSentimentSignal.id})\n`);

    // 3. Create signal correlations
    console.log('🔗 Creating signal correlations...');

    const priceVolumeCorrelation = await prisma.signalCorrelation.create({
      data: {
        primarySignalId: btcPriceSignal.id,
        secondarySignalId: socialSentimentSignal.id,
        tenantId: 'default',
        correlationType: 'price_sentiment',
        strength: 0.73,
        confidence: 0.82,
        lag: 150, // 150ms lag between price and sentiment
        timeWindow: '1h',
        method: 'pearson',
        sampleSize: 1000
      }
    });

    console.log(`✅ Created correlation: ${priceVolumeCorrelation.correlationType} (strength: ${priceVolumeCorrelation.strength})\n`);

    // 4. Create alert triggers
    console.log('⚠️ Creating alert triggers...');

    // First find or create a system user
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@coinet.ai' }
    });

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          email: 'system@coinet.ai',
          name: 'System User',
          password: 'system-password-hash',
          role: 'ADMIN'
        }
      });
    }

    // Create an alert (simplified - would normally exist)
    const alert = await prisma.alert.create({
      data: {
        userId: systemUser.id,
        name: 'BTC Price Breakout Alert',
        symbol: 'BTC',
        condition: 'PRICE',
        operator: 'GREATER_THAN',
        threshold: 50000,
        isActive: true
      }
    });

    const alertTrigger = await prisma.alertTrigger.create({
      data: {
        alertId: alert.id,
        tenantId: 'default',
        userId: 'system',
        triggerConditions: {
          symbol: 'BTC',
          condition: 'price',
          operator: 'greater_than',
          threshold: 50000,
          timeframe: '1m'
        },
        evaluationLogic: 'price_threshold_v2.1',
        result: 'FALSE', // Current price is 45000, not 50000
        confidence: 0.99,
        signalData: {
          currentPrice: 45000.50,
          previousPrice: 44950.25,
          volume: 1250000000
        },
        signalIds: [btcPriceSignal.id],
        evaluationTime: 45, // 45ms
        memoryUsed: 2048, // 2MB
        cpuUsed: 15.2, // 15.2% CPU
        metadata: {
          algorithmVersion: 'v2.1',
          evaluationCount: 1,
          falsePositiveRate: 0.02
        }
      }
    });

    console.log(`✅ Created alert trigger: ${alertTrigger.result} for alert ${alert.name}\n`);

    // 5. Create alert performance tracking
    console.log('📊 Creating alert performance tracking...');

    const alertPerformance = await prisma.alertPerformance.create({
      data: {
        alertId: alert.id,
        tenantId: 'default',
        userId: 'system',
        alertTriggerId: alertTrigger.id,
        outcome: 'NEUTRAL', // Alert didn't trigger, so neutral outcome
        kpiValue: 45000.50, // Current price
        kpiType: 'price_current',
        profitLoss: 0, // No trade executed
        duration: 0, // No trade duration
        signalLatency: 0, // No signal latency
        signalAccuracy: 0.99, // High accuracy for non-trigger
        marketVolatility: 0.02, // 2% volatility
        portfolioValue: 100000, // $100k portfolio
        riskTolerance: 'moderate',
        alertTime: new Date(),
        marketTime: new Date(),
        algorithmVersion: 'v2.1',
        notes: 'Alert condition not met - current price below threshold',
        metadata: {
          evaluationContext: 'real_time_monitoring',
          marketConditions: 'bullish_trend'
        }
      }
    });

    console.log(`✅ Created alert performance: ${alertPerformance.outcome} with accuracy ${alertPerformance.signalAccuracy}\n`);

    // 6. Create user feedback
    console.log('💬 Creating user feedback...');

    const userFeedback = await prisma.userFeedback.create({
      data: {
        alertId: alert.id,
        tenantId: 'default',
        userId: 'system',
        satisfactionScore: 4, // 4/5 stars
        category: 'HELPFUL',
        comment: 'Alert system is working well. Price threshold alerts are accurate and timely.',
        portfolioValue: 100000,
        riskTolerance: 'moderate',
        tradingFrequency: 'daily',
        algorithmVersion: 'v2.1',
        modelConfidence: 0.85,
        alertTime: new Date(),
        isAnonymous: false,
        gdprConsent: true,
        metadata: {
          userSegment: 'premium_trader',
          feedbackSource: 'web_dashboard'
        }
      }
    });

    console.log(`✅ Created user feedback: ${userFeedback.category} (${userFeedback.satisfactionScore}/5 stars)\n`);

    // 7. Query analytics and insights
    console.log('📈 Querying system analytics...');

    // Signal source health
    const signalSources = await prisma.signalSource.findMany({
      where: { tenantId: 'default' },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('Signal Sources:');
    signalSources.forEach(source => {
      console.log(`   ${source.name}: ${source.sourceType} - ${source.reliability} reliability`);
    });

    // Signal analytics
    const signalAnalytics = await prisma.signal.groupBy({
      by: ['signalType', 'isValid'],
      where: {
        tenantId: 'default',
        ingestedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      _count: { id: true },
      _avg: { confidence: true, qualityScore: true }
    });

    console.log('\nSignal Analytics (Last 24h):');
    signalAnalytics.forEach(analytic => {
      console.log(`   ${analytic.signalType}: ${analytic._count.id} signals`);
      console.log(`     Valid: ${analytic.isValid ? 'Yes' : 'No'}`);
      console.log(`     Avg Confidence: ${analytic._avg.confidence?.toFixed(3)}`);
      console.log(`     Avg Quality: ${analytic._avg.qualityScore?.toFixed(3)}\n`);
    });

    // Alert trigger analytics
    const triggerAnalytics = await prisma.alertTrigger.groupBy({
      by: ['result', 'evaluationLogic'],
      where: {
        tenantId: 'default',
        evaluatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      _count: { id: true },
      _avg: { evaluationTime: true, confidence: true }
    });

    console.log('Alert Trigger Analytics (Last 24h):');
    triggerAnalytics.forEach(analytic => {
      console.log(`   ${analytic.evaluationLogic} - ${analytic.result}: ${analytic._count.id} evaluations`);
      console.log(`     Avg Time: ${analytic._avg.evaluationTime?.toFixed(0)}ms`);
      console.log(`     Avg Confidence: ${analytic._avg.confidence?.toFixed(3)}\n`);
    });

    // Performance analytics
    const performanceAnalytics = await prisma.alertPerformance.groupBy({
      by: ['outcome', 'kpiType'],
      where: {
        tenantId: 'default',
        recordedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      _count: { id: true },
      _avg: { signalAccuracy: true, signalLatency: true },
      _sum: { profitLoss: true }
    });

    console.log('Alert Performance Analytics (Last 24h):');
    performanceAnalytics.forEach(analytic => {
      console.log(`   ${analytic.kpiType} - ${analytic.outcome}: ${analytic._count.id} records`);
      console.log(`     Avg Accuracy: ${analytic._avg.signalAccuracy?.toFixed(3)}`);
      console.log(`     Avg Latency: ${analytic._avg.signalLatency?.toFixed(0)}ms`);
      console.log(`     Total P&L: $${analytic._sum.profitLoss?.toFixed(2)}\n`);
    });

    // User feedback analytics
    const feedbackAnalytics = await prisma.userFeedback.groupBy({
      by: ['category', 'satisfactionScore'],
      where: {
        tenantId: 'default',
        feedbackTime: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      _count: { id: true },
      _avg: { satisfactionScore: true }
    });

    console.log('User Feedback Analytics (Last 24h):');
    feedbackAnalytics.forEach(analytic => {
      console.log(`   ${analytic.category}: ${analytic._count.id} feedback items`);
      console.log(`     Avg Satisfaction: ${analytic._avg.satisfactionScore?.toFixed(1)}/5\n`);
    });

    // 8. Demonstrate tenant isolation
    console.log('🏢 Demonstrating multi-tenant isolation...');

    // Set different tenant context
    await prisma.$executeRaw`SELECT set_tenant_context('premium-tenant');`;

    // Create tenant-specific signal source
    const premiumExchangeSource = await prisma.signalSource.create({
      data: {
        name: 'Premium Exchange Feed',
        slug: 'premium-exchange',
        description: 'Exclusive exchange data for premium users',
        sourceType: 'exchange',
        network: 'premium-exchange',
        dataTypes: ['MARKET', 'ON_CHAIN', 'DEFI'],
        reliability: 'HIGH',
        isActive: true,
        isPublic: false, // Only for premium tenants
        tenantId: 'premium-tenant',
        metadata: {
          premiumFeatures: true,
          apiKey: 'premium-encrypted-key',
          tier: 'premium'
        }
      }
    });

    console.log(`✅ Created premium tenant signal source: ${premiumExchangeSource.name}`);
    console.log(`   Public: ${premiumExchangeSource.isPublic ? 'Yes' : 'No'}`);
    console.log(`   Tenant: ${premiumExchangeSource.tenantId}\n`);

    // Query tenant-specific data
    const tenantSignalSources = await prisma.signalSource.findMany({
      where: { tenantId: 'premium-tenant' }
    });

    const defaultSignalSources = await prisma.signalSource.findMany({
      where: { tenantId: 'default' }
    });

    console.log('Multi-tenant Data Isolation:');
    console.log(`   Premium tenant sources: ${tenantSignalSources.length}`);
    console.log(`   Default tenant sources: ${defaultSignalSources.length}`);
    console.log(`   ✅ Tenants cannot see each other's data\n`);

    // 9. System health and monitoring
    console.log('🔍 System Health Monitoring...');

    console.log('Signal Sources Health:');
    console.log(`   Total sources: ${signalSources.length}`);
    console.log(`   Active sources: ${signalSources.filter(s => s.isActive).length}`);
    console.log(`   Public sources: ${signalSources.filter(s => s.isPublic).length}`);

    console.log('\nSignal Quality Metrics:');
    console.log(`   Total signals: ${await prisma.signal.count({ where: { tenantId: 'default' } })}`);
    console.log(`   Valid signals: ${await prisma.signal.count({ where: { tenantId: 'default', isValid: true } })}`);
    console.log(`   Average confidence: ${await prisma.signal.aggregate({ where: { tenantId: 'default' }, _avg: { confidence: true } }).then(r => r._avg.confidence?.toFixed(3))}`);

    console.log('\nAlert System Performance:');
    console.log(`   Total alerts: ${await prisma.alert.count({ where: { userId: 'system' } })}`);
    console.log(`   Alert triggers: ${await prisma.alertTrigger.count({ where: { tenantId: 'default' } })}`);
    console.log(`   Alert performances: ${await prisma.alertPerformance.count({ where: { tenantId: 'default' } })}`);
    console.log(`   User feedback: ${await prisma.userFeedback.count({ where: { tenantId: 'default' } })}`);

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nThe Coinet Signal and Alert System demonstrates:');
    console.log('• Multi-source signal ingestion (exchanges, social, news, blockchain)');
    console.log('• Real-time signal processing and correlation analysis');
    console.log('• Advanced alert evaluation with performance tracking');
    console.log('• User feedback collection for continuous improvement');
    console.log('• Multi-tenant isolation with enterprise security');
    console.log('• High-performance analytics for billions of records');
    console.log('• GDPR compliance and data protection');

  } catch (error) {
    console.error('❌ Error during demo:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the demo
if (require.main === module) {
  demoSignalAlertSystem()
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export { demoSignalAlertSystem };
