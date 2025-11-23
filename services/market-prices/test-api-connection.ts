/**
 * Test API Connection Script
 * Tests CoinGecko and CoinMarketCap API connections with automatic endpoint detection
 */

import { CoinGeckoRestClient } from './src/providers/coingecko-rest';
import { CoinMarketCapRestClient } from './src/providers/coinmarketcap-rest';
import { ProviderConfig } from './src/types';
import { getRateLimiter } from './src/middleware/rateLimiter';
import { logger } from './src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

const FREE_ENDPOINT = 'https://api.coingecko.com/api/v3';
const PRO_ENDPOINT = 'https://pro-api.coingecko.com/api/v3';

/**
 * Detect which endpoint CoinGecko says you're currently using based on error message
 */
function detectCurrentEndpoint(errorMessage: string): 'free' | 'pro' | null {
  // Normalize the error message: lowercase, normalize whitespace
  const normalized = errorMessage.toLowerCase().replace(/\s+/g, ' ').trim();

  // Pattern 1: "from api.coingecko.com" (free endpoint)
  // Handle variations: "from api.coingecko.com" or "from api.coingecko"
  if (normalized.includes('from api.coingecko.com') || 
      normalized.includes('from api.coingecko')) {
    return 'free';
  }

  // Pattern 2: "from pro-api.coingecko.com" (pro endpoint)
  // Handle variations: "from pro-api.coingecko.com" or "from pro-api.coingecko"
  if (normalized.includes('from pro-api.coingecko.com') || 
      normalized.includes('from pro-api.coingecko')) {
    return 'pro';
  }

  return null;
}

/**
 * Extract error message from various error formats
 */
function extractErrorMessage(error: any): string {
  // Try multiple sources for the error message
  
  // 1. Direct message
  if (error.message) {
    return error.message;
  }

  // 2. Check if it's a ProviderError with originalError
  if (error.originalError) {
    const original = error.originalError;
    
    // Check response.data.error (most common for API errors)
    if (original.response?.data?.error) {
      return original.response.data.error;
    }
    
    // Check original message
    if (original.message) {
      return original.message;
    }
  }

  // 3. Check error.data directly
  if (error.data?.error) {
    return error.data.error;
  }

  // 4. Check error.response.data
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  // 5. Fallback to toString
  return error.toString();
}

/**
 * Test CoinGecko API with automatic endpoint detection
 */
async function testCoinGeckoAPI(): Promise<void> {
  console.log('\n📡 Testing CoinGecko API...');

  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    throw new Error('COINGECKO_API_KEY environment variable is required');
  }

  // Start with free endpoint
  let currentEndpoint = FREE_ENDPOINT;
  let switchCount = 0;
  const maxSwitches = 2; // Allow free -> pro -> free cycle

  console.log(`Initial API URL: ${currentEndpoint}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}... (${apiKey.length} chars)`);

  while (switchCount <= maxSwitches) {
    try {
      const config: ProviderConfig = {
        apiKey,
        apiUrl: currentEndpoint,
        rateLimit: {
          maxRequestsPerMinute: 30,
          reservoir: 30,
          reservoirRefreshAmount: 30,
          reservoirRefreshInterval: 60 * 1000,
        },
        retry: {
          retries: 0, // Disable retries for testing
          retryDelay: 1000,
        },
        priority: 1,
      };

      const client = new CoinGeckoRestClient(config);
      const result = await client.ping();

      console.log('✅ CoinGecko API connection successful!');
      console.log(`   Response: ${result.gecko_says}`);
      console.log(`   Endpoint: ${currentEndpoint}`);
      return;

    } catch (error: any) {
      // Extract error message from multiple sources
      const errorMessage = extractErrorMessage(error);
      
      // Debug logging
      console.log(`\n🔍 Error Analysis:`);
      console.log(`   Current Endpoint: ${currentEndpoint}`);
      console.log(`   Switch Count: ${switchCount}/${maxSwitches}`);
      console.log(`   Error Message: ${errorMessage.substring(0, 150)}...`);
      
      // Detect which endpoint CoinGecko says we're currently using
      const currentEndpointType = detectCurrentEndpoint(errorMessage);
      console.log(`   Detected Endpoint Type: ${currentEndpointType || 'unknown'}`);

      if (currentEndpointType === 'free' && currentEndpoint === FREE_ENDPOINT) {
        // Currently on free endpoint, CoinGecko says switch to pro
        if (switchCount >= maxSwitches) {
          console.log('❌ Max switches reached. CoinGecko API key may be invalid or misconfigured.');
          throw error;
        }
        console.log('⚠️  API says we\'re on free endpoint. Switching to Pro endpoint...');
        currentEndpoint = PRO_ENDPOINT;
        switchCount++;
        continue;
      }

      if (currentEndpointType === 'pro' && currentEndpoint === PRO_ENDPOINT) {
        // Currently on pro endpoint, CoinGecko says switch to free
        if (switchCount >= maxSwitches) {
          console.log('❌ Max switches reached. CoinGecko API key may be invalid or misconfigured.');
          throw error;
        }
        console.log('⚠️  API says we\'re on Pro endpoint. Switching to Free endpoint...');
        currentEndpoint = FREE_ENDPOINT;
        switchCount++;
        continue;
      }

      // Can't detect endpoint from error, or it's a different error
      console.log('❌ API Test Failed: Could not determine correct endpoint from error message');
      console.log(`   Full error: ${errorMessage}`);
      throw error;
    }
  }

  throw new Error('Failed to connect to CoinGecko API after trying both endpoints');
}

/**
 * Test CoinMarketCap API
 */
async function testCoinMarketCapAPI(): Promise<void> {
  console.log('\n📡 Testing CoinMarketCap API...');

  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (!apiKey) {
    console.log('⚠️  COINMARKETCAP_API_KEY not set, skipping CoinMarketCap test');
    return;
  }

  try {
    const config: ProviderConfig = {
      apiKey,
      apiUrl: 'https://pro-api.coinmarketcap.com/v1',
      rateLimit: {
        maxRequestsPerMinute: 30,
        reservoir: 30,
        reservoirRefreshAmount: 30,
        reservoirRefreshInterval: 60 * 1000,
      },
      retry: {
        retries: 0,
        retryDelay: 1000,
      },
      priority: 2,
    };

    const client = new CoinMarketCapRestClient(config);
    await client.ping();

    console.log('✅ CoinMarketCap API connection successful!');
  } catch (error: any) {
    console.log('❌ CoinMarketCap API Test Failed:', error.message);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTests(): Promise<void> {
  console.log('🧪 Testing API Connections...\n');

  const results = {
    coingecko: false,
    coinmarketcap: false,
  };

  // Test CoinGecko (don't fail if it errors)
  try {
    await testCoinGeckoAPI();
    results.coingecko = true;
  } catch (error: any) {
    console.log('\n⚠️  CoinGecko test failed, continuing with CoinMarketCap...');
    console.log(`   Error: ${error.message.substring(0, 100)}...`);
  }

  // Test CoinMarketCap (always try this)
  try {
    await testCoinMarketCapAPI();
    results.coinmarketcap = true;
  } catch (error: any) {
    console.log('\n❌ CoinMarketCap test failed:', error.message);
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   CoinGecko: ${results.coingecko ? '✅ Passed' : '❌ Failed'}`);
  console.log(`   CoinMarketCap: ${results.coinmarketcap ? '✅ Passed' : '❌ Failed'}`);

  if (results.coinmarketcap) {
    console.log('\n✅ At least one API is working!');
  } else if (!results.coingecko && !results.coinmarketcap) {
    console.log('\n❌ All API tests failed!');
    process.exit(1);
  }
  
  // Cleanup rate limiters
  const rateLimiter = getRateLimiter();
  await rateLimiter.disconnectAll();
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

