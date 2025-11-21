/**
 * Coinet User Service - k6 Load Tests
 * 
 * Comprehensive load testing for production readiness validation
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('requests');
const activeUsers = new Gauge('active_users');
const authSuccessRate = new Rate('auth_success');
const registrationRate = new Rate('registration_success');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 50 },   // Ramp down to 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: [
      'p(95)<1000',  // 95% of requests under 1s
      'p(99)<2000',  // 99% of requests under 2s
    ],
    http_req_failed: ['rate<0.05'],     // Error rate under 5%
    errors: ['rate<0.05'],              // Custom error rate under 5%
    auth_success: ['rate>0.95'],        // Auth success rate over 95%
    registration_success: ['rate>0.98'], // Registration success rate over 98%
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:eu:dublin': { loadZone: 'amazon:eu:dublin', percent: 50 },
      },
    },
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8005';

// Test scenarios
const scenarios = {
  // Health check scenario (constant light load)
  health_checks: {
    executor: 'constant-vus',
    vus: 2,
    duration: '26m',
    exec: 'healthChecks',
  },
  
  // User registration scenario
  user_registration: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 10 },
      { duration: '10m', target: 20 },
      { duration: '5m', target: 10 },
      { duration: '6m', target: 0 },
    ],
    exec: 'userRegistration',
  },
  
  // Authentication scenario
  user_authentication: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 15 },
      { duration: '10m', target: 30 },
      { duration: '5m', target: 15 },
      { duration: '6m', target: 0 },
    ],
    exec: 'userAuthentication',
  },
  
  // API operations scenario
  api_operations: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 20 },
      { duration: '10m', target: 40 },
      { duration: '5m', target: 20 },
      { duration: '6m', target: 0 },
    ],
    exec: 'apiOperations',
  },
};

// Global setup
export function setup() {
  console.log('🚀 Starting Coinet User Service load tests...');
  
  // Verify service is available
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Service not available: ${healthResponse.status}`);
  }
  
  console.log('✅ User Service is healthy and ready for load testing');
  
  return {
    baseUrl: BASE_URL,
    startTime: Date.now()
  };
}

// Health check scenario
export function healthChecks() {
  group('Health Checks', () => {
    const response = http.get(`${BASE_URL}/health`);
    
    check(response, {
      'health status is 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
      'health returns healthy status': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy';
        } catch (e) {
          return false;
        }
      }
    });
    
    errorRate.add(response.status !== 200);
    responseTime.add(response.timings.duration);
  });
  
  sleep(1);
}

// User registration scenario
export function userRegistration() {
  group('User Registration', () => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const email = `load-test-${uniqueId}@coinet.ai`;
    
    const registrationResponse = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      email: email,
      password: 'LoadTest123!',
      name: `Load Test User ${uniqueId}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    const success = check(registrationResponse, {
      'registration status is 201': (r) => r.status === 201,
      'registration response time < 2000ms': (r) => r.timings.duration < 2000,
      'registration returns token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data.token;
        } catch (e) {
          return false;
        }
      }
    });

    registrationRate.add(success);
    errorRate.add(!success);
    responseTime.add(registrationResponse.timings.duration);
    requestCount.add(1);
  });
  
  sleep(Math.random() * 2 + 1); // 1-3 second delay
}

// Authentication scenario
export function userAuthentication() {
  group('User Authentication', () => {
    // Test with admin credentials
    const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: 'admin@coinet.ai',
      password: 'admin123'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    const success = check(loginResponse, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 1000ms': (r) => r.timings.duration < 1000,
      'login returns valid token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data.token && body.data.user.email === 'admin@coinet.ai';
        } catch (e) {
          return false;
        }
      }
    });

    authSuccessRate.add(success);
    errorRate.add(!success);
    responseTime.add(loginResponse.timings.duration);
    requestCount.add(1);

    // Test invalid credentials
    const invalidLoginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: 'invalid@example.com',
      password: 'wrongpassword'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    check(invalidLoginResponse, {
      'invalid login returns 401': (r) => r.status === 401,
      'invalid login response time < 500ms': (r) => r.timings.duration < 500,
    });
  });
  
  sleep(Math.random() * 1 + 0.5); // 0.5-1.5 second delay
}

// API operations scenario
export function apiOperations(data) {
  if (!data.adminToken) {
    return; // Skip if no admin token
  }

  group('API Operations', () => {
    const headers = {
      'Authorization': `Bearer ${data.adminToken}`,
      'Content-Type': 'application/json'
    };

    // Test user profile access
    const profileResponse = http.get(`${BASE_URL}/users/me`, { headers });
    check(profileResponse, {
      'profile access status is 200': (r) => r.status === 200,
      'profile response time < 300ms': (r) => r.timings.duration < 300,
    });

    // Test security info
    const securityResponse = http.get(`${BASE_URL}/users/me/security`, { headers });
    check(securityResponse, {
      'security info status is 200': (r) => r.status === 200,
      'security response time < 200ms': (r) => r.timings.duration < 200,
    });

    // Test admin analytics
    const analyticsResponse = http.get(`${BASE_URL}/admin/analytics/users`, { headers });
    check(analyticsResponse, {
      'admin analytics status is 200': (r) => r.status === 200,
      'admin analytics response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    // Test API key creation
    const apiKeyResponse = http.post(`${BASE_URL}/users/me/api-keys`, JSON.stringify({
      name: `Load Test Key ${Date.now()}`,
      permissions: ['read'],
      scopes: ['api:access']
    }), { headers });

    check(apiKeyResponse, {
      'api key creation status is 201': (r) => r.status === 201,
      'api key response time < 500ms': (r) => r.timings.duration < 500,
    });

    requestCount.add(4); // 4 requests in this group
    activeUsers.set(__VU);
  });
  
  sleep(Math.random() * 3 + 1); // 1-4 second delay
}

// Test teardown
export function teardown(data) {
  console.log('🧹 Tearing down k6 load tests...');
  
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`⏱️  Total test duration: ${duration.toFixed(2)} seconds`);
  
  console.log('✅ k6 load test teardown completed');
}

// Custom summary report
export function handleSummary(data) {
  return {
    'reports/user-service-load-test.html': htmlReport(data),
    'reports/user-service-load-test.txt': textSummary(data, { indent: ' ', enableColors: true }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
