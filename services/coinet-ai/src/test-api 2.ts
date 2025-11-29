/**
 * 🧪 API SERVICE TEST
 * 
 * Test our divine API service with various scenarios.
 * Verifies endpoints, error handling, and response formatting.
 */

import axios from 'axios';
import { logger } from './utils/logger';

const API_BASE_URL = 'http://localhost:3001';

interface TestCase {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  data?: any;
  expectedStatus: number;
  expectedFields?: string[];
}

const testCases: TestCase[] = [
  // Health check
  {
    name: 'Health Check',
    endpoint: '/api/v1/health',
    method: 'GET',
    expectedStatus: 200,
    expectedFields: ['status', 'timestamp', 'version', 'service']
  },

  // Status check
  {
    name: 'Status Check',
    endpoint: '/api/v1/status',
    method: 'GET',
    expectedStatus: 200,
    expectedFields: ['status', 'uptime', 'statistics', 'capabilities']
  },

  // Valid analysis requests
  {
    name: 'Bitcoin Analysis (Ticker)',
    endpoint: '/api/v1/analyze',
    method: 'POST',
    data: {
      content: 'BTC',
      type: 'ticker'
    },
    expectedStatus: 200,
    expectedFields: ['success', 'data', 'metadata']
  },

  {
    name: 'Ethereum Analysis (Question)',
    endpoint: '/api/v1/analyze',
    method: 'POST',
    data: {
      content: 'What do you think about Ethereum?',
      type: 'auto',
      context: {
        analysisDepth: 'standard'
      }
    },
    expectedStatus: 200,
    expectedFields: ['success', 'data', 'metadata']
  },

  {
    name: 'Solana Analysis (Deep)',
    endpoint: '/api/v1/analyze',
    method: 'POST',
    data: {
      content: 'SOL',
      type: 'ticker',
      context: {
        analysisDepth: 'deep',
        timeframe: '1w'
      }
    },
    expectedStatus: 200,
    expectedFields: ['success', 'data', 'metadata']
  },

  // Error cases
  {
    name: 'Invalid Request (Empty Content)',
    endpoint: '/api/v1/analyze',
    method: 'POST',
    data: {
      content: '',
      type: 'ticker'
    },
    expectedStatus: 400,
    expectedFields: ['success', 'error', 'metadata']
  },

  {
    name: 'Invalid Request (Missing Content)',
    endpoint: '/api/v1/analyze',
    method: 'POST',
    data: {
      type: 'ticker'
    },
    expectedStatus: 400,
    expectedFields: ['success', 'error', 'metadata']
  },

  {
    name: 'Invalid Endpoint',
    endpoint: '/api/v1/nonexistent',
    method: 'GET',
    expectedStatus: 404,
    expectedFields: ['success', 'error', 'metadata']
  }
];

async function runApiTests() {
  logger.info('🧪 Starting API Service tests...');
  
  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    try {
      logger.info(`\n🧪 Test ${i + 1}/${totalTests}: ${testCase.name}`);
      logger.info(`📡 ${testCase.method} ${testCase.endpoint}`);
      
      if (testCase.data) {
        logger.info(`📝 Request: ${JSON.stringify(testCase.data, null, 2)}`);
      }

      const startTime = Date.now();
      
      let response;
      if (testCase.method === 'GET') {
        response = await axios.get(`${API_BASE_URL}${testCase.endpoint}`, {
          validateStatus: () => true // Don't throw on error status codes
        });
      } else {
        response = await axios.post(`${API_BASE_URL}${testCase.endpoint}`, testCase.data, {
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      const responseTime = Date.now() - startTime;

      // Check status code
      if (response.status === testCase.expectedStatus) {
        logger.info(`✅ Status: ${response.status} (expected: ${testCase.expectedStatus})`);
      } else {
        logger.error(`❌ Status: ${response.status} (expected: ${testCase.expectedStatus})`);
        continue;
      }

      // Check expected fields
      if (testCase.expectedFields) {
        const missingFields = testCase.expectedFields.filter(field => 
          !(field in response.data)
        );

        if (missingFields.length === 0) {
          logger.info(`✅ Response fields: All expected fields present`);
        } else {
          logger.error(`❌ Missing fields: ${missingFields.join(', ')}`);
          continue;
        }
      }

      // Log response details
      logger.info(`⚡ Response time: ${responseTime}ms`);
      logger.info(`📊 Response size: ${JSON.stringify(response.data).length} bytes`);
      
      // Log brief details for analysis requests
      if (testCase.endpoint === '/api/v1/analyze' && response.data.success && response.data.data) {
        const brief = response.data.data;
        logger.info(`🎯 Brief: ${brief.symbol} | ${brief.recommendation} | ${Math.round(brief.confidence * 100)}% confidence`);
        logger.info(`📖 Components: ${brief.risks?.length || 0} risks, ${brief.catalysts?.length || 0} catalysts, ${brief.sources?.length || 0} sources`);
      }

      logger.info(`✅ Test ${i + 1} PASSED`);
      passedTests++;

    } catch (error) {
      logger.error(`❌ Test ${i + 1} FAILED: ${testCase.name}`);
      if (axios.isAxiosError(error)) {
        logger.error(`Request error: ${error.message}`);
        if (error.response) {
          logger.error(`Response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
      } else {
        logger.error(`Error: ${error}`);
      }
    }
  }

  logger.info(`\n🎉 API testing completed!`);
  logger.info(`📊 Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    logger.info(`🏆 ALL TESTS PASSED! API service is working perfectly!`);
  } else {
    logger.error(`❌ ${totalTests - passedTests} tests failed. Please check the API service.`);
  }

  return passedTests === totalTests;
}

// Additional caching test
async function testCaching() {
  logger.info(`\n🧪 Testing response caching...`);

  try {
    const testData = {
      content: 'BTC',
      type: 'ticker'
    };

    // First request
    const start1 = Date.now();
    const response1 = await axios.post(`${API_BASE_URL}/api/v1/analyze`, testData);
    const time1 = Date.now() - start1;

    // Second request (should be cached)
    const start2 = Date.now();
    const response2 = await axios.post(`${API_BASE_URL}/api/v1/analyze`, testData);
    const time2 = Date.now() - start2;

    logger.info(`📊 First request: ${time1}ms`);
    logger.info(`📊 Second request: ${time2}ms`);
    logger.info(`🎯 Cached: ${response2.data.metadata.cached ? 'Yes' : 'No'}`);

    if (response2.data.metadata.cached && time2 < time1 * 0.5) {
      logger.info(`✅ Caching working correctly - 50%+ speed improvement`);
      return true;
    } else {
      logger.warn(`⚠️ Caching may not be working optimally`);
      return false;
    }

  } catch (error) {
    logger.error(`❌ Caching test failed:`, error);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  logger.info('🚀 Starting API tests...');
  logger.info(`🔗 Testing API at: ${API_BASE_URL}`);
  logger.info('⚠️ Make sure the API server is running!');

  setTimeout(async () => {
    try {
      const mainTestsPass = await runApiTests();
      const cachingTestPass = await testCaching();

      if (mainTestsPass && cachingTestPass) {
        logger.info('\n🎉 ALL TESTS PASSED! API service is ready for production! 🚀');
        process.exit(0);
      } else {
        logger.error('\n❌ Some tests failed. Please check the implementation.');
        process.exit(1);
      }
    } catch (error) {
      logger.error('🚨 Test execution failed:', error);
      process.exit(1);
    }
  }, 1000); // Wait 1 second for server to start
}

export { runApiTests, testCaching };
