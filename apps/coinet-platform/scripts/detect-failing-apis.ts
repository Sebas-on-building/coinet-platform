/**
 * 🔍 Advanced API Failure Detection Script
 * 
 * Detects APIs that are:
 * - Returning misleading data (empty, stale, wrong format)
 * - Failing silently (returning 200 but no data)
 * - Rate limited or degraded
 * - Returning inconsistent data
 * - Having validation issues
 * 
 * Usage:
 *   npx ts-node --transpile-only scripts/detect-failing-apis.ts
 */

import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

interface ApiIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'MISLEADING' | 'FAILING' | 'DEGRADED' | 'INCONSISTENT' | 'VALIDATION_ERROR';
  api: string;
  endpoint: string;
  description: string;
  evidence: any;
  recommendation: string;
}

interface ApiTestResult {
  name: string;
  url: string;
  status: '✅ HEALTHY' | '⚠️ DEGRADED' | '❌ FAILING' | '🚨 MISLEADING';
  issues: ApiIssue[];
  latency: number;
  responseTime: number;
  dataQuality: {
    hasData: boolean;
    dataFreshness?: number; // seconds since last update
    dataCompleteness: number; // 0-1
    schemaValid: boolean;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const COINGECKO_BASE_URL = process.env.COINGECKO_API_KEY 
  ? 'https://pro-api.coingecko.com/api/v3'
  : 'https://api.coingecko.com/api/v3';
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com/latest/dex';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validatePriceData(data: any, api: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for empty/null data
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    issues.push('Empty response');
    return { valid: false, issues };
  }
  
  // Check for price field
  const price = data.price || data.lastPrice || data.current_price || data.usd;
  if (!price || price === 0 || price === null || price === undefined) {
    issues.push('Missing or zero price');
  }
  
  // Check for reasonable price range (BTC should be > 1000)
  if (price && (price < 1000 || price > 1000000)) {
    issues.push(`Suspicious price value: ${price}`);
  }
  
  // Check for timestamp freshness
  const timestamp = data.timestamp || data.last_updated || data.time || Date.now();
  const age = (Date.now() - (timestamp * 1000 || timestamp)) / 1000;
  if (age > 3600) {
    issues.push(`Stale data: ${Math.round(age / 60)} minutes old`);
  }
  
  return { valid: issues.length === 0, issues };
}

function validateMarketData(data: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!data || (Array.isArray(data) && data.length === 0)) {
    issues.push('Empty array response');
    return { valid: false, issues };
  }
  
  if (Array.isArray(data)) {
    // Check if array has expected structure
    const first = data[0];
    if (!first || typeof first !== 'object') {
      issues.push('Invalid array structure');
    } else {
      // Check required fields
      if (!first.symbol && !first.id && !first.name) {
        issues.push('Missing identifier fields');
      }
      if (first.price === undefined && first.current_price === undefined) {
        issues.push('Missing price field');
      }
    }
  }
  
  return { valid: issues.length === 0, issues };
}

function checkDataCompleteness(data: any, expectedFields: string[]): number {
  if (!data || typeof data !== 'object') return 0;
  
  let found = 0;
  for (const field of expectedFields) {
    if (data[field] !== undefined && data[field] !== null) {
      found++;
    }
  }
  
  return found / expectedFields.length;
}

// ============================================================================
// API TEST FUNCTIONS
// ============================================================================

async function testApiWithValidation(
  name: string,
  url: string,
  config: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    params?: Record<string, any>;
    validate?: (data: any) => { valid: boolean; issues: string[] };
    expectedFields?: string[];
    timeout?: number;
  }
): Promise<ApiTestResult> {
  const startTime = Date.now();
  const issues: ApiIssue[] = [];
  
  try {
    const response = await axios({
      method: config.method || 'GET',
      url,
      headers: config.headers || {},
      params: config.params,
      timeout: config.timeout || 10000,
      validateStatus: () => true,
    });
    
    const responseTime = Date.now() - startTime;
    
    // Check HTTP status
    if (response.status >= 500) {
      issues.push({
        severity: 'CRITICAL',
        type: 'FAILING',
        api: name,
        endpoint: url,
        description: `Server error: ${response.status}`,
        evidence: { status: response.status, data: response.data },
        recommendation: 'Check API provider status page',
      });
      return {
        name,
        url,
        status: '❌ FAILING',
        issues,
        latency: responseTime,
        responseTime,
        dataQuality: {
          hasData: false,
          dataCompleteness: 0,
          schemaValid: false,
        },
      };
    }
    
    if (response.status === 429) {
      issues.push({
        severity: 'HIGH',
        type: 'DEGRADED',
        api: name,
        endpoint: url,
        description: 'Rate limited',
        evidence: { status: response.status },
        recommendation: 'Reduce request frequency or upgrade API tier',
      });
      return {
        name,
        url,
        status: '⚠️ DEGRADED',
        issues,
        latency: responseTime,
        responseTime,
        dataQuality: {
          hasData: false,
          dataCompleteness: 0,
          schemaValid: false,
        },
      };
    }
    
    if (response.status >= 400) {
      issues.push({
        severity: 'HIGH',
        type: 'FAILING',
        api: name,
        endpoint: url,
        description: `Client error: ${response.status}`,
        evidence: { status: response.status, data: response.data },
        recommendation: 'Check API key and request parameters',
      });
      return {
        name,
        url,
        status: '❌ FAILING',
        issues,
        latency: responseTime,
        responseTime,
        dataQuality: {
          hasData: false,
          dataCompleteness: 0,
          schemaValid: false,
        },
      };
    }
    
    // Validate response data
    const data = response.data;
    let hasData = false;
    let dataCompleteness = 0;
    let schemaValid = true;
    
    // Check if response has data
    if (data === null || data === undefined) {
      issues.push({
        severity: 'CRITICAL',
        type: 'MISLEADING',
        api: name,
        endpoint: url,
        description: 'Returns 200 but no data',
        evidence: { status: response.status, body: 'null or undefined' },
        recommendation: 'This is misleading - API appears healthy but returns no data',
      });
    } else {
      hasData = true;
      
      // Run custom validation
      if (config.validate) {
        const validation = config.validate(data);
        if (!validation.valid) {
          schemaValid = false;
          for (const issue of validation.issues) {
            issues.push({
              severity: 'HIGH',
              type: 'VALIDATION_ERROR',
              api: name,
              endpoint: url,
              description: issue,
              evidence: { dataSample: JSON.stringify(data).substring(0, 200) },
              recommendation: 'Fix data validation or report to API provider',
            });
          }
        }
      }
      
      // Check data completeness
      if (config.expectedFields) {
        dataCompleteness = checkDataCompleteness(data, config.expectedFields);
        if (dataCompleteness < 0.5) {
          issues.push({
            severity: 'MEDIUM',
            type: 'DEGRADED',
            api: name,
            endpoint: url,
            description: `Low data completeness: ${Math.round(dataCompleteness * 100)}%`,
            evidence: { 
              expected: config.expectedFields,
              completeness: dataCompleteness,
            },
            recommendation: 'API may be returning incomplete data',
          });
        }
      }
      
      // Check for empty arrays/objects that might be misleading
      if (Array.isArray(data) && data.length === 0) {
        issues.push({
          severity: 'MEDIUM',
          type: 'MISLEADING',
          api: name,
          endpoint: url,
          description: 'Returns empty array (might be expected, but could indicate no results)',
          evidence: { responseType: 'array', length: 0 },
          recommendation: 'Verify if empty array is expected behavior',
        });
      }
      
      if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) {
        issues.push({
          severity: 'HIGH',
          type: 'MISLEADING',
          api: name,
          endpoint: url,
          description: 'Returns empty object',
          evidence: { responseType: 'object', keys: 0 },
          recommendation: 'This is misleading - API returns 200 but empty object',
        });
      }
    }
    
    // Determine overall status
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = issues.filter(i => i.severity === 'HIGH').length;
    
    let status: ApiTestResult['status'] = '✅ HEALTHY';
    if (criticalIssues > 0 || (highIssues > 0 && !hasData)) {
      status = '🚨 MISLEADING';
    } else if (highIssues > 0 || !schemaValid) {
      status = '❌ FAILING';
    } else if (issues.length > 0) {
      status = '⚠️ DEGRADED';
    }
    
    return {
      name,
      url,
      status,
      issues,
      latency: responseTime,
      responseTime,
      dataQuality: {
        hasData,
        dataCompleteness,
        schemaValid,
      },
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    issues.push({
      severity: 'CRITICAL',
      type: 'FAILING',
      api: name,
      endpoint: url,
      description: `Request failed: ${error.message}`,
      evidence: { 
        error: error.message,
        code: error.code,
        response: error.response?.data,
      },
      recommendation: 'Check network connectivity and API availability',
    });
    
    return {
      name,
      url,
      status: '❌ FAILING',
      issues,
      latency: responseTime,
      responseTime,
      dataQuality: {
        hasData: false,
        dataCompleteness: 0,
        schemaValid: false,
      },
    };
  }
}

// ============================================================================
// TEST CONFIGURATIONS
// ============================================================================

const API_TESTS = [
  // CoinGecko Tests
  {
    name: 'CoinGecko Ping',
    url: `${COINGECKO_BASE_URL}/ping`,
    validate: (data: any) => {
      if (!data.gecko_says) {
        return { valid: false, issues: ['Missing gecko_says field'] };
      }
      return { valid: true, issues: [] };
    },
  },
  {
    name: 'CoinGecko Price (BTC)',
    url: `${COINGECKO_BASE_URL}/simple/price`,
    params: { ids: 'bitcoin', vs_currencies: 'usd' },
    headers: process.env.COINGECKO_API_KEY ? {
      'x-cg-pro-api-key': process.env.COINGECKO_API_KEY,
    } : {},
    validate: (data: any) => validatePriceData(data.bitcoin || data, 'CoinGecko'),
    expectedFields: ['usd', 'usd_24h_change'],
  },
  {
    name: 'CoinGecko Market Data',
    url: `${COINGECKO_BASE_URL}/coins/markets`,
    params: { vs_currency: 'usd', ids: 'bitcoin,ethereum', per_page: 2 },
    headers: process.env.COINGECKO_API_KEY ? {
      'x-cg-pro-api-key': process.env.COINGECKO_API_KEY,
    } : {},
    validate: validateMarketData,
    expectedFields: ['id', 'symbol', 'current_price', 'market_cap', 'price_change_24h'],
  },
  {
    name: 'CoinGecko Invalid Coin',
    url: `${COINGECKO_BASE_URL}/simple/price`,
    params: { ids: 'invalid-coin-xyz-123', vs_currencies: 'usd' },
    headers: process.env.COINGECKO_API_KEY ? {
      'x-cg-pro-api-key': process.env.COINGECKO_API_KEY,
    } : {},
    validate: (data: any) => {
      // Should return empty object or error, not misleading data
      if (data && Object.keys(data).length > 0 && data.invalid_coin_xyz_123) {
        return { valid: false, issues: ['Returns data for invalid coin (misleading)'] };
      }
      return { valid: true, issues: [] };
    },
  },
  
  // Binance Tests
  {
    name: 'Binance Ticker (BTCUSDT)',
    url: `${BINANCE_BASE_URL}/ticker/24hr`,
    params: { symbol: 'BTCUSDT' },
    validate: (data: any) => validatePriceData(data, 'Binance'),
    expectedFields: ['symbol', 'lastPrice', 'priceChange', 'volume'],
  },
  {
    name: 'Binance Invalid Symbol',
    url: `${BINANCE_BASE_URL}/ticker/24hr`,
    params: { symbol: 'INVALIDPAIR123' },
    validate: (data: any) => {
      // Should return error, not empty data
      if (!data.code && !data.msg) {
        return { valid: false, issues: ['Invalid symbol returns no error (misleading)'] };
      }
      return { valid: true, issues: [] };
    },
  },
  {
    name: 'Binance Exchange Info',
    url: `${BINANCE_BASE_URL}/exchangeInfo`,
    validate: (data: any) => {
      if (!data.symbols || !Array.isArray(data.symbols) || data.symbols.length === 0) {
        return { valid: false, issues: ['Missing or empty symbols array'] };
      }
      return { valid: true, issues: [] };
    },
    expectedFields: ['symbols', 'timezone', 'serverTime'],
  },
  
  // DexScreener Tests
  {
    name: 'DexScreener Token Search',
    url: `${DEXSCREENER_BASE_URL}/tokens/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`, // WBTC
    validate: (data: any) => {
      if (!data.pairs || !Array.isArray(data.pairs)) {
        return { valid: false, issues: ['Missing pairs array'] };
      }
      if (data.pairs.length === 0) {
        return { valid: false, issues: ['Empty pairs array (might be misleading)'] };
      }
      return { valid: true, issues: [] };
    },
    expectedFields: ['pairs'],
  },
  {
    name: 'DexScreener Invalid Token',
    url: `${DEXSCREENER_BASE_URL}/tokens/0x0000000000000000000000000000000000000000`,
    validate: (data: any) => {
      // Should return empty pairs array, which is acceptable
      if (!data.pairs) {
        return { valid: false, issues: ['Missing pairs field'] };
      }
      return { valid: true, issues: [] };
    },
  },
];

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n🔍 Advanced API Failure Detection\n');
  console.log('='.repeat(70));
  console.log('Detecting misleading, failing, or degraded APIs...\n');
  
  const results: ApiTestResult[] = [];
  
  for (const test of API_TESTS) {
    process.stdout.write(`Testing ${test.name}... `);
    const result = await testApiWithValidation(test.name, test.url, {
      method: 'GET',
      headers: test.headers,
      params: test.params,
      validate: test.validate,
      expectedFields: test.expectedFields,
    });
    results.push(result);
    
    console.log(result.status);
    if (result.issues.length > 0) {
      console.log(`  ⚠️  Found ${result.issues.length} issue(s)`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // ==========================================================================
  // ANALYSIS REPORT
  // ==========================================================================
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 FAILURE ANALYSIS REPORT');
  console.log('='.repeat(70));
  
  const healthy = results.filter(r => r.status === '✅ HEALTHY').length;
  const degraded = results.filter(r => r.status === '⚠️ DEGRADED').length;
  const failing = results.filter(r => r.status === '❌ FAILING').length;
  const misleading = results.filter(r => r.status === '🚨 MISLEADING').length;
  
  console.log(`\n✅ Healthy: ${healthy}`);
  console.log(`⚠️  Degraded: ${degraded}`);
  console.log(`❌ Failing: ${failing}`);
  console.log(`🚨 Misleading: ${misleading}`);
  
  // Group issues by severity
  const allIssues = results.flatMap(r => r.issues);
  const criticalIssues = allIssues.filter(i => i.severity === 'CRITICAL');
  const highIssues = allIssues.filter(i => i.severity === 'HIGH');
  const mediumIssues = allIssues.filter(i => i.severity === 'MEDIUM');
  
  console.log(`\n📋 Issues Found: ${allIssues.length}`);
  console.log(`   🚨 Critical: ${criticalIssues.length}`);
  console.log(`   ⚠️  High: ${highIssues.length}`);
  console.log(`   💡 Medium: ${mediumIssues.length}`);
  
  // Detailed issue report
  if (criticalIssues.length > 0 || highIssues.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🚨 CRITICAL & HIGH PRIORITY ISSUES');
    console.log('='.repeat(70));
    
    for (const issue of [...criticalIssues, ...highIssues]) {
      console.log(`\n[${issue.severity}] ${issue.type}: ${issue.api}`);
      console.log(`   Endpoint: ${issue.endpoint}`);
      console.log(`   Description: ${issue.description}`);
      console.log(`   Recommendation: ${issue.recommendation}`);
      if (issue.evidence) {
        console.log(`   Evidence: ${JSON.stringify(issue.evidence).substring(0, 150)}...`);
      }
    }
  }
  
  // Misleading APIs report
  const misleadingApis = results.filter(r => r.status === '🚨 MISLEADING');
  if (misleadingApis.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🚨 MISLEADING APIs (Return 200 but wrong/missing data)');
    console.log('='.repeat(70));
    
    for (const api of misleadingApis) {
      console.log(`\n${api.name}`);
      console.log(`   URL: ${api.url}`);
      console.log(`   Issues: ${api.issues.length}`);
      for (const issue of api.issues) {
        console.log(`   - ${issue.description}`);
      }
    }
  }
  
  // Data quality report
  console.log('\n' + '='.repeat(70));
  console.log('📊 DATA QUALITY SUMMARY');
  console.log('='.repeat(70));
  
  for (const result of results) {
    if (result.dataQuality.hasData) {
      const completeness = Math.round(result.dataQuality.dataCompleteness * 100);
      const quality = completeness >= 80 ? '✅' : completeness >= 50 ? '⚠️' : '❌';
      console.log(`${quality} ${result.name}: ${completeness}% complete, ${result.responseTime}ms`);
    } else {
      console.log(`❌ ${result.name}: No data returned`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Exit code
  const hasCriticalIssues = criticalIssues.length > 0 || misleadingApis.length > 0;
  process.exit(hasCriticalIssues ? 1 : 0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { testApiWithValidation, API_TESTS };
