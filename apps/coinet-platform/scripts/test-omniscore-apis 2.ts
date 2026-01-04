/**
 * Diagnostic script to test all API gates for OmniScore
 * Tests each API endpoint individually to identify connection issues
 */

import axios from 'axios';
import { logger } from '../src/utils/logger';

const PROJECT_ID = 'solana';
const SOL_SYMBOL = 'sol';

interface ApiTestResult {
  name: string;
  status: 'success' | 'failed' | 'timeout' | 'error';
  responseTime?: number;
  error?: string;
  data?: any;
}

async function testCoinGecko(projectId: string): Promise<ApiTestResult> {
  const start = Date.now();
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${projectId}`,
      {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinet-Diagnostic/1.0',
        },
      }
    );
    
    const responseTime = Date.now() - start;
    return {
      name: 'CoinGecko',
      status: 'success',
      responseTime,
      data: {
        hasMarketData: !!response.data.market_data,
        currentPrice: response.data.market_data?.current_price?.usd,
        ath: response.data.market_data?.ath?.usd,
        athDate: response.data.market_data?.ath_date?.usd,
      },
    };
  } catch (error: any) {
    return {
      name: 'CoinGecko',
      status: error.code === 'ECONNABORTED' ? 'timeout' : 'error',
      responseTime: Date.now() - start,
      error: error.message || String(error),
    };
  }
}

async function testSnapshot(projectId: string): Promise<ApiTestResult> {
  const start = Date.now();
  const spaceId = 'solana'; // Try solana space
  
  try {
    const query = `
      query {
        space(id: "${spaceId}") {
          id
          name
          proposalsCount
          votesCount
          followersCount
        }
        proposals(
          first: 5,
          skip: 0,
          where: {
            space_in: ["${spaceId}"],
          },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          state
          votes
          created
        }
      }
    `;
    
    const response = await axios.post(
      'https://hub.snapshot.org/graphql',
      { query },
      { 
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const responseTime = Date.now() - start;
    const data = response.data?.data;
    
    return {
      name: 'Snapshot.org',
      status: data?.space ? 'success' : 'failed',
      responseTime,
      data: {
        spaceFound: !!data?.space,
        proposalsCount: data?.space?.proposalsCount,
        proposalsReturned: data?.proposals?.length || 0,
      },
      error: !data?.space ? 'Space not found' : undefined,
    };
  } catch (error: any) {
    return {
      name: 'Snapshot.org',
      status: error.code === 'ECONNABORTED' ? 'timeout' : 'error',
      responseTime: Date.now() - start,
      error: error.message || String(error),
    };
  }
}

async function testGoPlus(projectId: string): Promise<ApiTestResult> {
  const start = Date.now();
  // Solana doesn't have an Ethereum contract, so this will fail
  // But we test the API endpoint itself
  
  try {
    // Test with a known Ethereum token (Chainlink) to verify API works
    const response = await axios.get(
      'https://api.gopluslabs.io/api/v1/token_security/1',
      {
        params: { contract_addresses: '0x514910771af9ca656af840dff83e8264ecf986ca' },
        timeout: 10000,
      }
    );
    
    const responseTime = Date.now() - start;
    const result = response.data?.result;
    
    return {
      name: 'GoPlus Security',
      status: result ? 'success' : 'failed',
      responseTime,
      data: {
        hasResult: !!result,
        // Note: Solana native token won't have Ethereum contract
        note: 'Solana native token (SOL) does not have an Ethereum contract address',
      },
    };
  } catch (error: any) {
    return {
      name: 'GoPlus Security',
      status: error.code === 'ECONNABORTED' ? 'timeout' : 'error',
      responseTime: Date.now() - start,
      error: error.message || String(error),
    };
  }
}

async function testDeFiLlama(projectId: string): Promise<ApiTestResult> {
  const start = Date.now();
  const slug = 'solana'; // Try solana slug
  
  try {
    const [protocolResponse, feesResponse] = await Promise.all([
      axios.get(`https://api.llama.fi/protocol/${slug}`, { timeout: 10000 }),
      axios.get(`https://api.llama.fi/summary/fees/${slug}`, { timeout: 10000 }).catch(() => null),
    ]);
    
    const responseTime = Date.now() - start;
    const protocol = protocolResponse.data;
    
    return {
      name: 'DeFiLlama',
      status: protocol ? 'success' : 'failed',
      responseTime,
      data: {
        hasProtocol: !!protocol,
        name: protocol?.name,
        hasTvl: !!protocol?.tvl,
        hasFees: !!feesResponse?.data,
      },
    };
  } catch (error: any) {
    return {
      name: 'DeFiLlama',
      status: error.code === 'ECONNABORTED' ? 'timeout' : error.response?.status === 404 ? 'failed' : 'error',
      responseTime: Date.now() - start,
      error: error.message || String(error),
    };
  }
}

async function testGitHub(projectId: string): Promise<ApiTestResult> {
  const start = Date.now();
  const repo = 'solana-labs/solana';
  
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repo}`,
      {
        timeout: 10000,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Coinet-Diagnostic/1.0',
        },
      }
    );
    
    const responseTime = Date.now() - start;
    
    return {
      name: 'GitHub API',
      status: 'success',
      responseTime,
      data: {
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        name: response.data.name,
      },
    };
  } catch (error: any) {
    return {
      name: 'GitHub API',
      status: error.code === 'ECONNABORTED' ? 'timeout' : error.response?.status === 404 ? 'failed' : 'error',
      responseTime: Date.now() - start,
      error: error.message || String(error),
    };
  }
}

async function testAllApis() {
  console.log('🔍 Testing all API gates for OmniScore...\n');
  console.log(`Project: ${PROJECT_ID} (${SOL_SYMBOL})\n`);
  console.log('═'.repeat(80));
  
  const results: ApiTestResult[] = [];
  
  // Test all APIs in parallel
  const [coingecko, snapshot, goplus, defillama, github] = await Promise.all([
    testCoinGecko(PROJECT_ID),
    testSnapshot(PROJECT_ID),
    testGoPlus(PROJECT_ID),
    testDeFiLlama(PROJECT_ID),
    testGitHub(PROJECT_ID),
  ]);
  
  results.push(coingecko, snapshot, goplus, defillama, github);
  
  // Print results
  for (const result of results) {
    const statusIcon = result.status === 'success' ? '✅' : result.status === 'failed' ? '⚠️' : '❌';
    console.log(`\n${statusIcon} ${result.name}`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    if (result.responseTime) {
      console.log(`   Response Time: ${result.responseTime}ms`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2));
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 Summary:');
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const errorCount = results.filter(r => r.status === 'error' || r.status === 'timeout').length;
  
  console.log(`   ✅ Success: ${successCount}/${results.length}`);
  console.log(`   ⚠️  Failed (expected): ${failedCount}/${results.length}`);
  console.log(`   ❌ Errors: ${errorCount}/${results.length}`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  CRITICAL: Some APIs are returning errors. This will cause OmniScore to fail.');
    console.log('   Check network connectivity, API keys, and rate limits.');
  } else if (failedCount > 0) {
    console.log('\n⚠️  Some APIs returned no data (expected for Solana native token).');
    console.log('   OmniScore should still work with available data sources.');
  } else {
    console.log('\n✅ All APIs are working correctly!');
  }
  
  return results;
}

// Run if executed directly
if (require.main === module) {
  testAllApis()
    .then(() => {
      console.log('\n✅ Diagnostic complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Diagnostic failed:', error);
      process.exit(1);
    });
}

export { testAllApis };
