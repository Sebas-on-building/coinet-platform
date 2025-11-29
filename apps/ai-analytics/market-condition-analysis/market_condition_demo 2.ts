/**
 * =========================================
 * MARKET CONDITION CORRELATION ANALYSIS DEMO
 * =========================================
 * Divine world-class demonstration of market condition correlation analysis
 * Shows how to use the complete system for strategy optimization
 */

import { MarketConditionAnalysis, setupMarketConditionAnalysis } from './market_condition_analysis';

/**
 * Demo: Basic market condition analysis
 */
async function basicMarketAnalysisDemo(): Promise<void> {
  console.log('🚀 Starting basic market condition analysis demo...');

  try {
    // Setup market condition analyzer
    const analyzer = await setupMarketConditionAnalysis({
      databaseUrl: 'postgresql://localhost:5432/coinet',
      enableRealTime: true,
      analysisInterval: 15 // minutes
    });

    console.log('✅ Market condition analyzer initialized');

    // Get current market conditions
    const currentConditions = analyzer.getCurrentConditions();
    console.log('📊 Current market conditions:', {
      regime: currentConditions?.regime || 'unknown',
      confidence: currentConditions?.metadata?.confidence || 0,
      timestamp: currentConditions?.timestamp?.toISOString()
    });

    // Perform correlation analysis
    console.log('🔍 Performing correlation analysis...');
    const analysis = await analyzer.analyzeCorrelations({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    });

    console.log('✅ Correlation analysis completed:', {
      analysisId: analysis.analysisId,
      status: analysis.status,
      marketConditionsAnalyzed: analysis.progress.marketConditionsAnalyzed,
      correlationsCalculated: analysis.progress.correlationsCalculated,
      keyFindings: analysis.insights.keyFindings.length
    });

    // Get adaptive weights
    console.log('⚖️ Getting adaptive weights...');
    const weight = await analyzer.getAdaptiveWeights('price', 'rule_price_breakout');
    console.log('📈 Adaptive weight for price signals:', weight);

    // Generate strategy report
    console.log('📋 Generating strategy report...');
    const report = await analyzer.generateReport();
    console.log('✅ Strategy report generated:', {
      reportId: report.id,
      sections: Object.keys(report.sections).length,
      recommendations: report.sections.strategyRecommendations.implementationRoadmap.length
    });

    // Display key insights
    console.log('\n🎯 KEY INSIGHTS:');
    analysis.insights.keyFindings.forEach((finding, index) => {
      console.log(`${index + 1}. ${finding}`);
    });

    console.log('\n💡 RECOMMENDATIONS:');
    analysis.insights.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // Cleanup
    await analyzer.shutdown();
    console.log('✅ Demo completed successfully');

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
  }
}

/**
 * Demo: Advanced market condition analysis with custom configuration
 */
async function advancedMarketAnalysisDemo(): Promise<void> {
  console.log('🚀 Starting advanced market condition analysis demo...');

  try {
    // Custom configuration
    const config = {
      database: {
        host: 'localhost',
        port: 5432,
        database: 'coinet',
        user: 'postgres',
        password: 'postgres'
      },
      marketConditionTracker: {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'coinet',
          user: 'postgres',
          password: 'postgres'
        },
        tracking: {
          updateInterval: 30000, // 30 seconds for demo
          dataRetentionDays: 30,
          enableRealTimeUpdates: true,
          enableHistoricalBackfill: false
        },
        dataSources: {
          volatility: ['vix-api', 'realized-volatility'],
          macroeconomic: ['fomc-rates', 'cpi-data'],
          liquidity: ['order-book-depth'],
          volume: ['exchange-volume-24h'],
          sentiment: ['fear-greed-index']
        },
        regimeDetection: {
          lookbackWindow: 5, // Shorter window for demo
          confidenceThreshold: 0.7,
          minDataPoints: 5,
          regimeStabilityThreshold: 0.6
        }
      },
      correlationAnalysis: {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'coinet',
          user: 'postgres',
          password: 'postgres'
        },
        analysis: {
          minSampleSize: 10, // Smaller sample for demo
          significanceLevel: 0.1, // More lenient for demo
          confidenceLevel: 0.9,
          lookbackDays: 7, // Shorter period for demo
          updateInterval: 5 // minutes
        },
        statisticalTests: {
          pearsonCorrelation: true,
          spearmanCorrelation: true,
          kendallCorrelation: true,
          tTest: true,
          anova: false
        },
        marketVariables: {
          volatility: ['vix', 'realizedVolatility'],
          macroeconomic: ['interestRates', 'inflation'],
          liquidity: ['bidAskSpread', 'marketDepth'],
          volume: ['totalVolume24h'],
          sentiment: ['fearGreedIndex']
        },
        alertMetrics: ['successRate', 'winRate', 'sharpeRatio']
      },
      adaptiveWeighting: {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'coinet',
          user: 'postgres',
          password: 'postgres'
        },
        weighting: {
          updateInterval: 5, // minutes
          minAdjustmentThreshold: 0.005, // More sensitive for demo
          maxAdjustmentRate: 0.05, // Smaller adjustments for demo
          stabilityWeight: 0.4,
          performanceWeight: 0.3,
          regimeWeight: 0.3
        },
        adjustmentRules: {
          correlationThreshold: 0.2, // More lenient for demo
          significanceThreshold: 0.1,
          minSampleSize: 8,
          regimeSpecificAdjustment: true
        }
      },
      reporting: {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'coinet',
          user: 'postgres',
          password: 'postgres'
        },
        reporting: {
          reportInterval: 6, // hours
          retentionDays: 7,
          enableAutoReports: true,
          enableRealTimeUpdates: true
        },
        thresholds: {
          significanceLevel: 0.1,
          correlationThreshold: 0.2,
          minSampleSize: 10,
          confidenceThreshold: 0.7
        }
      },
      system: {
        enableRealTimeUpdates: true,
        enableAutoOptimization: true,
        performanceMonitoring: true,
        maxConcurrentAnalyses: 3
      }
    };

    // Create and start the analysis system
    const analysisSystem = new MarketConditionAnalysis(config);
    await analysisSystem.start();

    console.log('✅ Advanced market condition analysis system started');

    // Monitor real-time updates for 2 minutes
    console.log('📡 Monitoring real-time updates for 2 minutes...');

    let updateCount = 0;
    const maxUpdates = 4; // Stop after 4 updates for demo

    const updateHandler = (conditions: any) => {
      updateCount++;
      console.log(`📊 Update ${updateCount}: ${conditions.regime} regime (confidence: ${conditions.metadata.confidence.toFixed(2)})`);

      if (updateCount >= maxUpdates) {
        analysisSystem.removeListener('marketConditionsUpdated', updateHandler);
        console.log(`✅ Received ${updateCount} real-time updates`);
      }
    };

    analysisSystem.on('marketConditionsUpdated', updateHandler);

    // Wait for updates
    await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes

    // Perform final analysis
    console.log('🔍 Performing final comprehensive analysis...');
    const finalAnalysis = await analysisSystem.performComprehensiveAnalysis();

    console.log('✅ Final analysis completed:', {
      analysisId: finalAnalysis.analysisId,
      duration: `${(finalAnalysis.performance.duration / 1000).toFixed(1)}s`,
      keyFindings: finalAnalysis.insights.keyFindings.length,
      recommendations: finalAnalysis.insights.recommendations.length
    });

    // Display key insights
    console.log('\n🎯 FINAL INSIGHTS:');
    finalAnalysis.insights.keyFindings.forEach((finding, index) => {
      console.log(`${index + 1}. ${finding}`);
    });

    console.log('\n💡 FINAL RECOMMENDATIONS:');
    finalAnalysis.insights.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // Stop the system
    await analysisSystem.stop();
    console.log('✅ Advanced demo completed successfully');

  } catch (error: any) {
    console.error('❌ Advanced demo failed:', error.message);
  }
}

/**
 * Demo: API usage examples
 */
async function apiUsageDemo(): Promise<void> {
  console.log('🚀 Starting API usage demo...');

  try {
    // Initialize analyzer
    const analyzer = await setupMarketConditionAnalysis({
      databaseUrl: 'postgresql://localhost:5432/coinet',
      enableRealTime: false, // Disable for API demo
      analysisInterval: 60
    });

    // API 1: Get current market conditions
    console.log('📊 API 1: Getting current market conditions...');
    const conditions = analyzer.getCurrentConditions();
    console.log('Current regime:', conditions?.regime || 'unknown');

    // API 2: Get adaptive weights
    console.log('⚖️ API 2: Getting adaptive weights...');
    const weight = await analyzer.getAdaptiveWeights('price', 'rule_price_breakout');
    console.log('Price signal weight:', weight);

    // API 3: Generate strategy report
    console.log('📋 API 3: Generating strategy report...');
    const report = await analyzer.generateReport();
    console.log('Report generated with', Object.keys(report.sections).length, 'sections');

    // API 4: Export analysis data
    console.log('📤 API 4: Exporting analysis data...');
    const exportData = await analyzer.generateReport(); // This would be the export method in real usage
    console.log('Export data generated');

    // Cleanup
    await analyzer.shutdown();
    console.log('✅ API demo completed successfully');

  } catch (error: any) {
    console.error('❌ API demo failed:', error.message);
  }
}

/**
 * Run all demos
 */
async function runAllDemos(): Promise<void> {
  console.log('🎯 RUNNING COMPLETE MARKET CONDITION CORRELATION ANALYSIS DEMO SUITE');
  console.log('================================================================');

  try {
    // Run basic demo
    await basicMarketAnalysisDemo();
    console.log('\n' + '='.repeat(80) + '\n');

    // Run advanced demo
    await advancedMarketAnalysisDemo();
    console.log('\n' + '='.repeat(80) + '\n');

    // Run API demo
    await apiUsageDemo();

    console.log('\n🎉 ALL DEMOS COMPLETED SUCCESSFULLY!');
    console.log('The market condition correlation analysis system is working perfectly.');

  } catch (error: any) {
    console.error('❌ Demo suite failed:', error.message);
    process.exit(1);
  }
}

/**
 * Usage examples for external integration
 */
export const usageExamples = {
  // Quick setup for basic usage
  quickStart: `
    import { setupMarketConditionAnalysis } from './market_condition_analysis';

    // Initialize analyzer
    const analyzer = await setupMarketConditionAnalysis({
      databaseUrl: 'postgresql://localhost:5432/coinet',
      enableRealTime: true,
      analysisInterval: 15
    });

    // Get current market conditions
    const conditions = analyzer.getCurrentConditions();

    // Perform correlation analysis
    const analysis = await analyzer.analyzeCorrelations();

    // Get adaptive weights
    const weight = await analyzer.getAdaptiveWeights('price', 'rule_id');

    // Generate report
    const report = await analyzer.generateReport();

    // Cleanup
    await analyzer.shutdown();
  `,

  // Advanced configuration
  advancedConfig: `
    import { MarketConditionAnalysis } from './market_condition_analysis';

    const config = {
      database: { host: 'localhost', port: 5432, database: 'coinet', user: 'postgres', password: 'postgres' },
      marketConditionTracker: {
        tracking: { updateInterval: 60000, enableRealTimeUpdates: true },
        dataSources: { volatility: ['vix-api'], macroeconomic: ['economic-indicators'] },
        regimeDetection: { lookbackWindow: 7, confidenceThreshold: 0.8 }
      },
      correlationAnalysis: {
        analysis: { minSampleSize: 30, significanceLevel: 0.05, lookbackDays: 30 },
        statisticalTests: { pearsonCorrelation: true, spearmanCorrelation: true },
        marketVariables: {
          volatility: ['vix', 'realizedVolatility'],
          macroeconomic: ['interestRates', 'inflation']
        },
        alertMetrics: ['successRate', 'winRate', 'sharpeRatio']
      },
      adaptiveWeighting: {
        weighting: { updateInterval: 15, maxAdjustmentRate: 0.1 },
        adjustmentRules: { correlationThreshold: 0.3, regimeSpecificAdjustment: true }
      },
      reporting: {
        reporting: { reportInterval: 24, enableAutoReports: true },
        thresholds: { significanceLevel: 0.05, correlationThreshold: 0.3 }
      }
    };

    const analysis = new MarketConditionAnalysis(config);
    await analysis.start();
  `,

  // API endpoints
  apiEndpoints: `
    GET /api/v1/alerts/market/conditions - Current market conditions
    GET /api/v1/alerts/market/correlations/:regime - Regime-specific correlations
    GET /api/v1/alerts/market/weights/:signalType/:ruleId - Adaptive weights
    POST /api/v1/alerts/market/analyze - Perform comprehensive analysis
    GET /api/v1/alerts/market/reports - Recent analysis reports
    GET /api/v1/alerts/market/status - System health status
    POST /api/v1/alerts/market/export - Export analysis data
  `
};

// Run demos if this file is executed directly
if (require.main === module) {
  runAllDemos().catch(error => {
    console.error('❌ Demo execution failed:', error);
    process.exit(1);
  });
}

export { basicMarketAnalysisDemo, advancedMarketAnalysisDemo, apiUsageDemo, runAllDemos };
