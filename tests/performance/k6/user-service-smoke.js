/**
 * Coinet User Service - k6 Smoke Tests
 * 
 * Light smoke tests to verify basic functionality and performance
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('requests');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 5 },    // Stay at 5 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],             // Custom error rate under 10%
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8005';

// Test data
const testUsers = [
  { email: 'k6-test-1@coinet.ai', password: 'TestPass123', name: 'K6 Test User 1' },
  { email: 'k6-test-2@coinet.ai', password: 'TestPass123', name: 'K6 Test User 2' },
  { email: 'k6-test-3@coinet.ai', password: 'TestPass123', name: 'K6 Test User 3' },
];

let adminToken = '';

export function setup() {
  console.log('🔄 Setting up k6 smoke tests...');
  
  // Login as admin to get token for authenticated tests
  const adminLoginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'admin@coinet.ai',
    password: 'admin123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (adminLoginResponse.status === 200) {
    const body = JSON.parse(adminLoginResponse.body);
    adminToken = body.data.token;
    console.log('✅ Admin authentication successful for setup');
  } else {
    console.error('❌ Admin authentication failed during setup');
  }

  return { adminToken };
}

export default function (data) {
  requestCount.add(1);
  
  // Test 1: Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
    'health status is healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy';
      } catch (e) {
        return false;
      }
    }
  });
  
  errorRate.add(healthResponse.status !== 200);
  responseTime.add(healthResponse.timings.duration);

  // Test 2: Ready check
  const readyResponse = http.get(`${BASE_URL}/ready`);
  check(readyResponse, {
    'ready check status is 200': (r) => r.status === 200,
    'ready check response time < 50ms': (r) => r.timings.duration < 50,
  });

  // Test 3: Metrics endpoint
  const metricsResponse = http.get(`${BASE_URL}/metrics`);
  check(metricsResponse, {
    'metrics endpoint status is 200': (r) => r.status === 200,
    'metrics response contains prometheus data': (r) => {
      if (r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json')) {
        try {
          const body = JSON.parse(r.body);
          return body.prometheus !== undefined;
        } catch (e) {
          return false;
        }
      }
      return true;
    }
  });

  // Test 4: User registration
  const testUser = testUsers[Math.floor(Math.random() * testUsers.length)];
  const uniqueEmail = `k6-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@coinet.ai`;
  
  const registrationResponse = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email: uniqueEmail,
    password: testUser.password,
    name: testUser.name
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  const registrationSuccess = check(registrationResponse, {
    'registration status is 201': (r) => r.status === 201,
    'registration response time < 1000ms': (r) => r.timings.duration < 1000,
    'registration returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data.token;
      } catch (e) {
        return false;
      }
    }
  });

  let userToken = '';
  if (registrationSuccess && registrationResponse.status === 201) {
    try {
      const body = JSON.parse(registrationResponse.body);
      userToken = body.data.token;
    } catch (e) {
      console.error('Failed to parse registration response');
    }
  }

  // Test 5: User profile access (if registration succeeded)
  if (userToken) {
    const profileResponse = http.get(`${BASE_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    check(profileResponse, {
      'profile access status is 200': (r) => r.status === 200,
      'profile response time < 200ms': (r) => r.timings.duration < 200,
      'profile returns user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data.email === uniqueEmail;
        } catch (e) {
          return false;
        }
      }
    });
  }

  // Test 6: Admin analytics (if admin token available)
  if (data.adminToken) {
    const analyticsResponse = http.get(`${BASE_URL}/admin/analytics/users`, {
      headers: { 'Authorization': `Bearer ${data.adminToken}` }
    });

    check(analyticsResponse, {
      'admin analytics status is 200': (r) => r.status === 200,
      'admin analytics response time < 500ms': (r) => r.timings.duration < 500,
    });
  }

  // Test 7: Invalid authentication
  const invalidAuthResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'invalid@example.com',
    password: 'wrongpassword'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(invalidAuthResponse, {
    'invalid auth returns 401': (r) => r.status === 401,
    'invalid auth response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Small delay between iterations
  sleep(0.1);
}

export function teardown(data) {
  console.log('🧹 Cleaning up k6 smoke tests...');
  
  // In a real scenario, we might clean up test users here
  // For now, we'll rely on the User Service's built-in cleanup
  
  console.log('✅ k6 smoke test cleanup completed');
}
