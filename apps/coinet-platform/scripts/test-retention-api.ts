/**
 * 🧪 COINET RETENTION API TEST SCRIPT
 * 
 * Test script for retention system API endpoints
 * 
 * Usage:
 *   ts-node scripts/test-retention-api.ts
 * 
 * Environment variables:
 *   API_URL=http://localhost:3000
 *   TEST_USER_ID=test-user-id
 *   CRON_SECRET=your-cron-secret
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-123';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

// =============================================================================
// TEST HELPERS
// =============================================================================

function logTest(name: string) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log('─'.repeat(60));
}

function logSuccess(message: string, data?: unknown) {
  console.log(`✅ ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(message: string, error: unknown) {
  console.error(`❌ ${message}`);
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(JSON.stringify(error, null, 2));
  }
}

async function makeRequest(method: string, endpoint: string, data?: unknown, headers?: Record<string, string>) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': TEST_USER_ID,
        ...headers,
      },
      data,
    };
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
}

// =============================================================================
// API TESTS
// =============================================================================

async function testSessionStart() {
  logTest('Session Start');
  
  const result = await makeRequest('GET', '/api/retention/session-start?trigger=organic&device=mobile&platform=ios');
  
  if (result.success) {
    logSuccess('Session start successful', result.data);
  } else {
    logError('Session start failed', result.error);
  }
  
  return result.success;
}

async function testQueryCompleted() {
  logTest('Query Completed');
  
  const result = await makeRequest('POST', '/api/retention/query-completed', {
    query: 'What is the OmniScore for BTC?',
    symbols: ['BTC'],
    intent: 'quick_answer',
    sessionId: 'test-session-123',
  });
  
  if (result.success) {
    logSuccess('Query completed processing successful', result.data);
  } else {
    logError('Query completed failed', result.error);
  }
  
  return result.success;
}

async function testNotifications() {
  logTest('Get Notifications');
  
  const result = await makeRequest('GET', '/api/retention/notifications?limit=10');
  
  if (result.success) {
    logSuccess('Get notifications successful', result.data);
  } else {
    logError('Get notifications failed', result.error);
  }
  
  return result.success;
}

async function testRewards() {
  logTest('Get Rewards');
  
  const result = await makeRequest('GET', '/api/retention/rewards?surface=in_app_card');
  
  if (result.success) {
    logSuccess('Get rewards successful', result.data);
  } else {
    logError('Get rewards failed', result.error);
  }
  
  return result.success;
}

async function testRitualCard() {
  logTest('Get Ritual Card');
  
  const result = await makeRequest('GET', '/api/retention/ritual-card?time=morning');
  
  if (result.success) {
    logSuccess('Get ritual card successful', result.data);
  } else {
    logError('Get ritual card failed', result.error);
  }
  
  return result.success;
}

async function testInvestmentAction() {
  logTest('Record Investment Action');
  
  const result = await makeRequest('POST', '/api/retention/investment/watchlist_add', {
    symbol: 'BTC',
    context: 'after_query',
  });
  
  if (result.success) {
    logSuccess('Investment action recorded', result.data);
  } else {
    logError('Investment action failed', result.error);
  }
  
  return result.success;
}

async function testInvestmentPrompts() {
  logTest('Get Investment Prompts');
  
  const result = await makeRequest('GET', '/api/retention/investment/prompts?context=after_query&symbol=BTC');
  
  if (result.success) {
    logSuccess('Get investment prompts successful', result.data);
  } else {
    logError('Get investment prompts failed', result.error);
  }
  
  return result.success;
}

async function testPersonalization() {
  logTest('Get Personalization');
  
  const result = await makeRequest('GET', '/api/retention/personalization');
  
  if (result.success) {
    logSuccess('Get personalization successful', result.data);
  } else {
    logError('Get personalization failed', result.error);
  }
  
  return result.success;
}

async function testQuickReplies() {
  logTest('Get Quick Replies');
  
  const result = await makeRequest('GET', '/api/retention/quick-replies?symbol=BTC');
  
  if (result.success) {
    logSuccess('Get quick replies successful', result.data);
  } else {
    logError('Get quick replies failed', result.error);
  }
  
  return result.success;
}

async function testLifecycle() {
  logTest('Get Lifecycle State');
  
  const result = await makeRequest('GET', '/api/retention/lifecycle');
  
  if (result.success) {
    logSuccess('Get lifecycle successful', result.data);
  } else {
    logError('Get lifecycle failed', result.error);
  }
  
  return result.success;
}

async function testMetrics() {
  logTest('Get Retention Metrics (Admin)');
  
  const result = await makeRequest('GET', '/api/retention/metrics');
  
  if (result.success) {
    logSuccess('Get metrics successful', result.data);
  } else {
    logError('Get metrics failed', result.error);
  }
  
  return result.success;
}

async function testFailures() {
  logTest('Get Failure Events (Admin)');
  
  const result = await makeRequest('GET', '/api/retention/failures');
  
  if (result.success) {
    logSuccess('Get failures successful', result.data);
  } else {
    logError('Get failures failed', result.error);
  }
  
  return result.success;
}

async function testScheduledJobs() {
  logTest('Run Scheduled Jobs (Cron)');
  
  const result = await makeRequest('POST', '/api/retention/scheduled-jobs', {
    jobType: 'hourly_maintenance',
  }, {
    'x-cron-key': CRON_SECRET,
  });
  
  if (result.success) {
    logSuccess('Scheduled jobs executed', result.data);
  } else {
    logError('Scheduled jobs failed', result.error);
  }
  
  return result.success;
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  console.log('🚀 Starting Retention API Tests');
  console.log('═'.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`Test User ID: ${TEST_USER_ID}`);
  console.log('═'.repeat(60));
  
  const tests = [
    { name: 'Session Start', fn: testSessionStart },
    { name: 'Query Completed', fn: testQueryCompleted },
    { name: 'Notifications', fn: testNotifications },
    { name: 'Rewards', fn: testRewards },
    { name: 'Ritual Card', fn: testRitualCard },
    { name: 'Investment Action', fn: testInvestmentAction },
    { name: 'Investment Prompts', fn: testInvestmentPrompts },
    { name: 'Personalization', fn: testPersonalization },
    { name: 'Quick Replies', fn: testQuickReplies },
    { name: 'Lifecycle', fn: testLifecycle },
    { name: 'Metrics', fn: testMetrics },
    { name: 'Failures', fn: testFailures },
    { name: 'Scheduled Jobs', fn: testScheduledJobs },
  ];
  
  const results: Array<{ name: string; passed: boolean }> = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logError(`Test ${test.name} threw error`, error);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log('═'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
