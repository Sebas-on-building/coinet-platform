/**
 * 🔍 Comprehensive API Health Check Script
 * 
 * Tests all external and internal APIs to verify they're working correctly.
 * 
 * Usage:
 *   npx ts-node --transpile-only scripts/check-all-apis.ts
 * 
 * Or from project root:
 *   cd apps/coinet-platform && npx ts-node --transpile-only scripts/check-all-apis.ts
 */

import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

interface ApiTestResult {
  name: string;
  status: '✅ PASS' | '❌ FAIL' | '⚠️ WARN' | '⏭️ SKIP';
  latency?: number;
  error?: string;
  details?: any;
}

interface ApiTestConfig {
  name: string;
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  timeout?: number;
  expectedStatus?: number;
  skip?: () => boolean;
  validate?: (response: any) => boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env.BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:3000';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
const CMC_API_KEY = process.env.CMC_API_KEY || '';
const COINGECKO_BASE_URL = COINGECKO_API_KEY 
  ? 'https://pro-api.coingecko.com/api/v3'
  : 'https://api.coingecko.com/api/v3';
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/latest/dex';

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

async function testApi(config: ApiTestConfig): Promise<ApiTestResult> {
  const startTime = Date.now();
  
  // Check if test should be skipped
  if (config.skip && config.skip()) {
    return {
      name: config.name,
      status: '⏭️ SKIP',
      details: 'Skipped (prerequisites not met)',
    };
  }

  try {
    const axiosConfig = {
      method: config.method || 'GET',
      url: config.url,
      headers: config.headers || {},
      params: config.params,
      data: config.body,
      timeout: config.timeout || 10000,
      validateStatus: () => true, // Don't throw on any status
    };

    const response = await axios(axiosConfig);
    const latency = Date.now() - startTime;

    // Check expected status
    if (config.expectedStatus && response.status !== config.expectedStatus) {
      return {
        name: config.name,
        status: '❌ FAIL',
        latency,
        error: `Expected status ${config.expectedStatus}, got ${response.status}`,
        details: response.data,
      };
    }

    // Custom validation
    if (config.validate && !config.validate(response.data)) {
      return {
        name: config.name,
        status: '❌ FAIL',
        latency,
        error: 'Response validation failed',
        details: response.data,
      };
    }

    // Check for error responses
    if (response.status >= 400) {
      return {
        name: config.name,
        status: '❌ FAIL',
        latency,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: response.data,
      };
    }

    return {
      name: config.name,
      status: '✅ PASS',
      latency,
      details: response.data,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        name: config.name,
        status: '❌ FAIL',
        latency,
        error: `Connection failed: ${error.message}`,
      };
    }

    return {
      name: config.name,
      status: '❌ FAIL',
      latency,
      error: error.message || String(error),
      details: error.response?.data,
    };
  }
}

// ============================================================================
// API TEST CONFIGURATIONS
// ============================================================================

const API_TESTS: ApiTestConfig[] = [
  // ==========================================================================
  // INTERNAL API ENDPOINTS
  // ==========================================================================
  {
    name: 'Internal Health Check',
    url: `${BASE_URL}/api/health`,
    expectedStatus: 200,
    validate: (data) => data.ok !== undefined || data.status !== undefined,
  },
  {
    name: 'Internal Status Endpoint',
    url: `${BASE_URL}/api/status`,
    expectedStatus: 200,
    validate: (data) => data.status !== undefined,
  },
  {
    name: 'Internal Diagnostic Endpoint',
    url: `${BASE_URL}/api/diagnostic?symbol=BTC`,
    expectedStatus: 200,
    validate: (data) => data.services !== undefined,
  },
  {
    name: 'Internal API Keys Report',
    url: `${BASE_URL}/api/keys`,
    expectedStatus: 200,
    skip: () => !BASE_URL.includes('localhost') && !BASE_URL.includes('railway'),
  },

  // ==========================================================================
  // EXTERNAL MARKET DATA APIs
  // ==========================================================================
  {
    name: 'CoinGecko Ping',
    url: `${COINGECKO_BASE_URL}/ping`,
    expectedStatus: 200,
    validate: (data) => data.gecko_says !== undefined,
  },
  {
    name: 'CoinGecko Price (BTC)',
    url: `${COINGECKO_BASE_URL}/simple/price`,
    params: {
      ids: 'bitcoin',
      vs_currencies: 'usd',
    },
    headers: COINGECKO_API_KEY ? {
      'x-cg-pro-api-key': COINGECKO_API_KEY,
    } : {},
    expectedStatus: 200,
    validate: (data) => data.bitcoin?.usd !== undefined,
  },
  {
    name: 'CoinGecko Market Data',
    url: `${COINGECKO_BASE_URL}/coins/markets`,
    params: {
      vs_currency: 'usd',
      ids: 'bitcoin,ethereum',
      per_page: 2,
    },
    headers: COINGECKO_API_KEY ? {
      'x-cg-pro-api-key': COINGECKO_API_KEY,
    } : {},
    expectedStatus: 200,
    validate: (data) => Array.isArray(data) && data.length > 0,
  },
  {
    name: 'CoinMarketCap Metadata',
    url: `${CMC_BASE_URL}/cryptocurrency/info`,
    params: {
      symbol: 'BTC',
    },
    headers: CMC_API_KEY ? {
      'X-CMC_PRO_API_KEY': CMC_API_KEY,
    } : {},
    expectedStatus: 200,
    skip: () => !CMC_API_KEY,
    validate: (data) => data.data?.BTC !== undefined,
  },
  {
    name: 'Binance Ticker',
    url: `${BINANCE_BASE_URL}/ticker/24hr`,
    params: {
      symbol: 'BTCUSDT',
    },
    expectedStatus: 200,
    validate: (data) => data.symbol === 'BTCUSDT' && (data.lastPrice !== undefined || data.price !== undefined),
  },
  {
    name: 'Binance Exchange Info',
    url: `${BINANCE_BASE_URL}/exchangeInfo`,
    expectedStatus: 200,
    validate: (data) => data.symbols !== undefined && Array.isArray(data.symbols),
  },
  {
    name: 'DexScreener Search',
    url: `${DEXSCREENER_BASE_URL}/tokens/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`, // WBTC
    expectedStatus: 200,
    validate: (data) => data.pairs !== undefined,
  },
  {
    name: 'DexScreener Pairs',
    url: `${DEXSCREENER_BASE_URL}/pairs/ethereum/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640`,
    expectedStatus: 200,
    validate: (data) => data.pair !== undefined,
  },

  // ==========================================================================
  // NEWS & SOCIAL APIs
  // ==========================================================================
  {
    name: 'CryptoPanic News',
    url: 'https://cryptopanic.com/api/v1/posts/',
    params: {
      auth_token: process.env.CRYPTOPANIC_API_KEY || '',
      currencies: 'BTC',
      public: 'true',
    },
    expectedStatus: 200,
    skip: () => !process.env.CRYPTOPANIC_API_KEY,
    validate: (data) => data.results !== undefined,
  },
  {
    name: 'LunarCrush Social',
    url: 'https://lunarcrush.com/api3/coins',
    params: {
      key: process.env.LUNARCRUSH_API_KEY || '',
      symbol: 'BTC',
    },
    expectedStatus: 200,
    skip: () => !process.env.LUNARCRUSH_API_KEY,
    validate: (data) => data.data !== undefined,
  },

  // ==========================================================================
  // DERIVATIVES APIs
  // ==========================================================================
  {
    name: 'Coinglass Funding Rates',
    url: 'https://open-api.coinglass.com/public/v2/funding_rate',
    headers: process.env.COINGLASS_API_KEY ? {
      'coinglassSecret': process.env.COINGLASS_API_KEY,
    } : {},
    expectedStatus: 200,
    skip: () => !process.env.COINGLASS_API_KEY,
    validate: (data) => data.data !== undefined,
  },
  {
    name: 'Deribit Instruments',
    url: 'https://www.deribit.com/api/v2/public/get_instruments',
    params: {
      currency: 'BTC',
      kind: 'future',
    },
    expectedStatus: 200,
    validate: (data) => data.result !== undefined,
  },

  // ==========================================================================
  // ON-CHAIN APIs
  // ==========================================================================
  {
    name: 'Etherscan API',
    url: 'https://api.etherscan.io/api',
    params: {
      module: 'stats',
      action: 'ethsupply',
      apikey: process.env.ETHERSCAN_API_KEY || '',
    },
    expectedStatus: 200,
    skip: () => !process.env.ETHERSCAN_API_KEY,
    validate: (data) => data.status === '1' || data.result !== undefined,
  },
];

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n🔍 Coinet Platform - Comprehensive API Health Check\n');
  console.log('=' .repeat(70));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`CoinGecko: ${COINGECKO_API_KEY ? '✅ Pro Tier' : '⚠️ Free Tier'}`);
  console.log(`CoinMarketCap: ${CMC_API_KEY ? '✅ Configured' : '❌ Not Configured'}`);
  console.log('=' .repeat(70));
  console.log();

  const results: ApiTestResult[] = [];
  
  // Run tests sequentially to avoid rate limits
  for (const testConfig of API_TESTS) {
    process.stdout.write(`Testing ${testConfig.name}... `);
    const result = await testApi(testConfig);
    results.push(result);
    
    // Print status immediately
    console.log(result.status);
    if (result.latency) {
      console.log(`  ⏱️  Latency: ${result.latency}ms`);
    }
    if (result.error) {
      console.log(`  ❌ Error: ${result.error}`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // ==========================================================================
  // SUMMARY REPORT
  // ==========================================================================
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.status === '✅ PASS').length;
  const failed = results.filter(r => r.status === '❌ FAIL').length;
  const warned = results.filter(r => r.status === '⚠️ WARN').length;
  const skipped = results.filter(r => r.status === '⏭️ SKIP').length;
  
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📊 Total: ${results.length}`);
  
  // Group by category
  console.log('\n📋 DETAILED RESULTS BY CATEGORY:\n');
  
  const categories = {
    'Internal APIs': results.slice(0, 4),
    'Market Data APIs': results.slice(4, 11),
    'News & Social APIs': results.slice(11, 13),
    'Derivatives APIs': results.slice(13, 15),
    'On-Chain APIs': results.slice(15),
  };
  
  for (const [category, categoryResults] of Object.entries(categories)) {
    if (categoryResults.length === 0) continue;
    
    console.log(`\n${category}:`);
    console.log('-'.repeat(50));
    
    for (const result of categoryResults) {
      const statusIcon = result.status === '✅ PASS' ? '✅' :
                         result.status === '❌ FAIL' ? '❌' :
                         result.status === '⚠️ WARN' ? '⚠️' : '⏭️';
      
      console.log(`${statusIcon} ${result.name}`);
      if (result.latency) {
        console.log(`   Latency: ${result.latency}ms`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }
  
  // Recommendations
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(70));
  
  if (failed > 0) {
    console.log('\n⚠️  Some APIs failed. Check the errors above.');
  }
  
  if (!COINGECKO_API_KEY) {
    console.log('\n💡 Consider adding COINGECKO_API_KEY for higher rate limits (500 req/min vs 10 req/min)');
  }
  
  if (!CMC_API_KEY) {
    console.log('💡 Consider adding CMC_API_KEY for backup market data source');
  }
  
  if (!process.env.CRYPTOPANIC_API_KEY) {
    console.log('💡 Consider adding CRYPTOPANIC_API_KEY for premium news aggregation');
  }
  
  if (!process.env.COINGLASS_API_KEY) {
    console.log('💡 Consider adding COINGLASS_API_KEY for liquidation data and funding rates');
  }
  
  if (passed === results.length - skipped) {
    console.log('\n🎉 All configured APIs are working correctly!');
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { testApi, API_TESTS };

