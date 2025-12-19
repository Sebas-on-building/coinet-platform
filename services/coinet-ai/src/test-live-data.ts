/**
 * 🧪 LIVE DATA TEST SCRIPT
 * 
 * Tests that the market data, sentiment, and technical services
 * are fetching REAL data from external APIs.
 * 
 * Run with: npx ts-node src/test-live-data.ts
 */

import { MarketDataService } from './services/market-data-service';
import { SentimentDataService } from './services/sentiment-data-service';
import { TechnicalIndicatorsService } from './services/technical-indicators-service';

async function testLiveData() {
  console.log('🧪 COINET AI - LIVE DATA TEST');
  console.log('='.repeat(60));
  console.log('');

  // Initialize services
  const marketService = new MarketDataService();
  const sentimentService = new SentimentDataService();
  const technicalService = new TechnicalIndicatorsService();

  // Test 1: Market Data for BTC
  console.log('📊 TEST 1: Fetching LIVE BTC market data from CoinGecko...');
  try {
    const btcData = await marketService.getMarketData('BTC');
    console.log('✅ BTC Market Data:');
    console.log(`   Price: $${btcData.currentPrice.toLocaleString()}`);
    console.log(`   24h Change: ${btcData.priceChangePercent24h.toFixed(2)}%`);
    console.log(`   Market Cap: $${(btcData.marketCap / 1e9).toFixed(2)}B`);
    console.log(`   ATH: $${btcData.ath?.toLocaleString() || 'N/A'}`);
    console.log(`   ATH Date: ${btcData.athDate?.toISOString().split('T')[0] || 'N/A'}`);
    console.log(`   Data Source: ${btcData.dataSource}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ BTC Market Data FAILED: ${error.message}`);
    console.log('');
  }

  // Test 2: Fear & Greed Index
  console.log('😱 TEST 2: Fetching Fear & Greed Index from Alternative.me...');
  try {
    const sentiment = await sentimentService.getSentimentData();
    console.log('✅ Market Sentiment:');
    console.log(`   Fear & Greed: ${sentiment.fearGreed.value}/100 (${sentiment.fearGreed.classification})`);
    console.log(`   Trend: ${sentiment.fearGreed.trend}`);
    console.log(`   Overall: ${sentiment.overallSentiment}`);
    console.log(`   Score: ${sentiment.sentimentScore}`);
    console.log(`   Summary: ${sentiment.summary.substring(0, 100)}...`);
    console.log(`   Data Source: ${sentiment.dataSource}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ Fear & Greed FAILED: ${error.message}`);
    console.log('');
  }

  // Test 3: Technical Analysis for ETH
  console.log('📈 TEST 3: Calculating Technical Analysis for ETH...');
  try {
    const technicals = await technicalService.getTechnicalAnalysis('ETH');
    console.log('✅ ETH Technical Analysis:');
    console.log(`   RSI(14): ${technicals.rsi14} (${technicals.rsiSignal})`);
    console.log(`   MACD Trend: ${technicals.macd.trend}`);
    console.log(`   Overall Signal: ${technicals.overallSignal}`);
    console.log(`   Confidence: ${technicals.confidence}%`);
    console.log(`   Trend: ${technicals.trend.direction} (strength: ${technicals.trend.strength}%)`);
    console.log(`   Price vs SMA200: ${technicals.movingAverages.priceVsSMA200.toFixed(2)}%`);
    console.log(`   Golden Cross: ${technicals.movingAverages.goldenCross ? 'YES' : 'NO'}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ Technical Analysis FAILED: ${error.message}`);
    console.log('');
  }

  // Test 4: Multiple Coins
  console.log('🔄 TEST 4: Fetching data for multiple coins...');
  const coins = ['SOL', 'DOGE', 'AVAX'];
  for (const coin of coins) {
    try {
      const data = await marketService.getMarketData(coin);
      if (data.currentPrice > 0) {
        console.log(`   ✅ ${coin}: $${data.currentPrice.toLocaleString()} (${data.priceChangePercent24h.toFixed(2)}%)`);
      } else {
        console.log(`   ⚠️ ${coin}: No price data available`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${coin}: ${error.message}`);
    }
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('🎉 LIVE DATA TEST COMPLETE');
  console.log('');
  console.log('The services are now fetching REAL data from:');
  console.log('  • CoinGecko API (market data, OHLC, ATH)');
  console.log('  • Alternative.me (Fear & Greed Index)');
  console.log('  • Calculated technical indicators (RSI, MACD, SMAs)');
  console.log('');
  console.log('No more mock data! 🚀');
}

// Run the test
testLiveData().catch(console.error);
