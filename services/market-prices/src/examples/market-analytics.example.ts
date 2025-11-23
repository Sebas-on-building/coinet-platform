/**
 * Example Usage: Market Analytics Service
 * Demonstrates how to use the MarketAnalytics service
 */

import { MarketAnalytics, Anomaly } from '../services/market-analytics';
import { CoinGeckoRestClient } from '../providers/coingecko-rest';

async function exampleMarketAnalytics() {
  // Initialize CoinGecko client
  const geckoClient = new CoinGeckoRestClient({
    apiKey: process.env.COINGECKO_API_KEY || '',
    apiUrl: 'https://api.coingecko.com/api/v3',
    priority: 1,
    rateLimit: {
      maxRequestsPerMinute: 50,
      reservoir: 50,
      reservoirRefreshAmount: 50,
      reservoirRefreshInterval: 60000,
    },
    retry: {
      retries: 3,
      retryDelay: 1000,
    },
  });

  // Create analytics service
  const analytics = new MarketAnalytics(geckoClient);

  // Example 1: Calculate correlation between two assets
  console.log('=== Example 1: Calculate Correlation ===');
  try {
    const correlation = await analytics.calculateCorrelation('BTC', 'ETH', 30);
    console.log(`Correlation between BTC and ETH:`);
    console.log(`  Correlation Coefficient: ${correlation.correlation.toFixed(4)}`);
    console.log(`  Sample Size: ${correlation.sampleSize}`);
    console.log(`  Period: ${correlation.period}`);
    console.log(`  Confidence: ${correlation.confidence}%`);

    if (Math.abs(correlation.correlation) > 0.7) {
      console.log('  → Strong correlation detected!');
    } else if (Math.abs(correlation.correlation) > 0.4) {
      console.log('  → Moderate correlation');
    } else {
      console.log('  → Weak correlation');
    }
  } catch (error) {
    console.error('Error calculating correlation:', error);
  }

  // Example 2: Detect price anomalies
  console.log('\n=== Example 2: Detect Price Anomalies ===');
  try {
    const anomalies = await analytics.detectAnomalies('BTC', 30, 2);
    console.log(`Found ${anomalies.length} anomalies:`);
    anomalies.slice(0, 5).forEach((anomaly: Anomaly, index: number) => {
      console.log(`\nAnomaly ${index + 1}:`);
      console.log(`  Timestamp: ${anomaly.timestamp}`);
      console.log(`  Price: $${anomaly.price}`);
      console.log(`  Expected: $${anomaly.expectedPrice}`);
      console.log(`  Deviation: ${anomaly.deviation.toFixed(2)}σ`);
      console.log(`  Severity: ${anomaly.severity}`);
      console.log(`  Confidence: ${anomaly.confidence}%`);
      console.log(`  Reason: ${anomaly.reason}`);
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
  }

  // Example 3: Analyze trend
  console.log('\n=== Example 3: Analyze Trend ===');
  try {
    const trend = await analytics.analyzeTrend('BTC', 30);
    console.log(`BTC Trend Analysis:`);
    console.log(`  Trend: ${trend.trend.toUpperCase()}`);
    console.log(`  Strength: ${trend.strength}%`);
    console.log(`  Support Level: $${trend.support}`);
    console.log(`  Resistance Level: $${trend.resistance}`);
    console.log(`  Momentum: ${(trend.momentum * 100).toFixed(2)}%`);
    console.log(`  Confidence: ${trend.confidence}%`);

    if (trend.trend === 'bullish' && trend.strength > 70) {
      console.log('  → Strong bullish trend detected!');
    } else if (trend.trend === 'bearish' && trend.strength > 70) {
      console.log('  → Strong bearish trend detected!');
    }
  } catch (error) {
    console.error('Error analyzing trend:', error);
  }

  // Example 4: Compare multiple assets
  console.log('\n=== Example 4: Compare Multiple Assets ===');
  const symbols = ['BTC', 'ETH', 'SOL'];
  try {
    for (const symbol of symbols) {
      const trend = await analytics.analyzeTrend(symbol, 30);
      console.log(`${symbol}: ${trend.trend} (${trend.strength}% strength)`);
    }
  } catch (error) {
    console.error('Error comparing assets:', error);
  }
}

// Run example if executed directly
if (require.main === module) {
  exampleMarketAnalytics().catch(console.error);
}

export { exampleMarketAnalytics };

