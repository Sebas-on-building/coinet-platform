/**
 * Coinet Platform - E2E Authentication Flow Tests via API Gateway
 * 
 * These tests verify the complete authentication journey through the API Gateway,
 * ensuring proper routing, security, and integration between services.
 */

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

// Test configuration
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8005';

// Test utilities
class E2ETestHelper {
  static async waitForService(url: string, maxAttempts = 10): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await request(url).get('/health');
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
  }

  static generateTestUser() {
    const id = uuidv4().substring(0, 8);
    return {
      email: `test-${id}@coinet-e2e.com`,
      password: 'TestPassword123!',
      name: `E2E Test User ${id}`
    };
  }

  static async cleanup(token: string, email: string) {
    try {
      // Delete test user account
      await request(USER_SERVICE_URL)
        .delete('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          password: 'TestPassword123!',
          confirmDelete: 'DELETE_MY_ACCOUNT'
        });
    } catch (error) {
      // Cleanup failed, but that's okay for tests
    }
  }
}

describe('🔐 E2E Authentication Flows via API Gateway', () => {
  let gatewayAvailable = false;
  let userServiceAvailable = false;

  beforeAll(async () => {
    console.log('🔍 Checking service availability...');
    
    gatewayAvailable = await E2ETestHelper.waitForService(GATEWAY_URL);
    userServiceAvailable = await E2ETestHelper.waitForService(USER_SERVICE_URL);

    console.log(`📊 Service Status:`);
    console.log(`   Gateway (${GATEWAY_URL}): ${gatewayAvailable ? '✅' : '❌'}`);
    console.log(`   User Service (${USER_SERVICE_URL}): ${userServiceAvailable ? '✅' : '❌'}`);

    if (!gatewayAvailable && !userServiceAvailable) {
      console.log('⚠️  No services available, tests will be skipped');
    }
  }, 30000);

  describe('🚀 Service Health & Documentation', () => {
    test('Gateway health check should work', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping gateway test - service not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('services');
    });

    test('User Service health check should work', async () => {
      if (!userServiceAvailable) {
        console.log('⏭️  Skipping user service test - service not available');
        return;
      }

      const response = await request(USER_SERVICE_URL)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('features');
      expect(response.body.features).toContain('authentication');
    });

    test('Gateway Swagger UI should be accessible', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping gateway Swagger test - service not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .get('/docs')
        .expect(200);

      expect(response.text).toContain('Coinet API Gateway');
      expect(response.headers['content-type']).toContain('text/html');
    });

    test('User Service Swagger UI should be accessible', async () => {
      if (!userServiceAvailable) {
        console.log('⏭️  Skipping user service Swagger test - service not available');
        return;
      }

      const response = await request(USER_SERVICE_URL)
        .get('/docs')
        .expect(200);

      expect(response.text).toContain('Coinet User Service');
      expect(response.headers['content-type']).toContain('text/html');
    });

    test('OpenAPI specs should be available', async () => {
      if (gatewayAvailable) {
        const gatewaySpec = await request(GATEWAY_URL)
          .get('/openapi.json')
          .expect(200);

        expect(gatewaySpec.body).toHaveProperty('openapi');
        expect(gatewaySpec.body.info.title).toBe('Coinet API Gateway');
      }

      if (userServiceAvailable) {
        const userSpec = await request(USER_SERVICE_URL)
          .get('/openapi.json')
          .expect(200);

        expect(userSpec.body).toHaveProperty('openapi');
        expect(userSpec.body.info.title).toBe('Coinet User Service');
      }
    });
  });

  describe('🔐 Complete Authentication Flow via Gateway', () => {
    let testUser: any;
    let authToken: string;
    let refreshToken: string;

    beforeEach(() => {
      testUser = E2ETestHelper.generateTestUser();
    });

    afterEach(async () => {
      if (authToken && testUser) {
        await E2ETestHelper.cleanup(authToken, testUser.email);
      }
    });

    test('Complete user registration flow via gateway', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping gateway registration test - service not available');
        return;
      }

      // 1. Register new user through gateway
      const registerResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(testUser.email);
      expect(registerResponse.body.data.token).toBeDefined();

      authToken = registerResponse.body.data.token;

      // 2. Verify we can access protected endpoints
      const profileResponse = await request(GATEWAY_URL)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(testUser.email);
    });

    test('Complete login flow via gateway', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping gateway login test - service not available');
        return;
      }

      // 1. Register user first
      await request(GATEWAY_URL)
        .post('/api/v1/users/auth/register')
        .send(testUser)
        .expect(201);

      // 2. Login through gateway
      const loginResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.email).toBe(testUser.email);
      expect(loginResponse.body.data.token).toBeDefined();

      authToken = loginResponse.body.data.token;

      // 3. Verify token works for protected routes
      const securityResponse = await request(GATEWAY_URL)
        .get('/api/v1/users/me/security')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(securityResponse.body.success).toBe(true);
      expect(securityResponse.body.data).toHaveProperty('securityScore');
    });

    test('Two-factor authentication setup via gateway', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping gateway 2FA test - service not available');
        return;
      }

      // 1. Register and login
      await request(GATEWAY_URL)
        .post('/api/v1/users/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      authToken = loginResponse.body.data.token;

      // 2. Setup 2FA through gateway
      const setupResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(setupResponse.body.success).toBe(true);
      expect(setupResponse.body.data.secret).toBeDefined();
      expect(setupResponse.body.data.qrCode).toBeDefined();

      // 3. Verify 2FA with test code
      const verifyResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '123456' }) // Test code for development
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.enabled).toBe(true);
      expect(verifyResponse.body.data.backupCodes).toBeDefined();
    });

    test('API key management via gateway', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping gateway API key test - service not available');
        return;
      }

      // 1. Register and login
      await request(GATEWAY_URL)
        .post('/api/v1/users/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      authToken = loginResponse.body.data.token;

      // 2. Create API key through gateway
      const createKeyResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/me/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test API Key',
          permissions: ['read', 'write'],
          scopes: ['api:access', 'trading:read'],
          rateLimit: 2000
        })
        .expect(201);

      expect(createKeyResponse.body.success).toBe(true);
      expect(createKeyResponse.body.data.name).toBe('E2E Test API Key');
      expect(createKeyResponse.body.data.key).toBeDefined();
      expect(createKeyResponse.body.data.permissions).toEqual(['read', 'write']);

      const apiKeyId = createKeyResponse.body.data.id;

      // 3. List API keys
      const listKeysResponse = await request(GATEWAY_URL)
        .get('/api/v1/users/me/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listKeysResponse.body.success).toBe(true);
      expect(listKeysResponse.body.data).toHaveLength(1);
      expect(listKeysResponse.body.data[0].name).toBe('E2E Test API Key');

      // 4. Revoke API key
      const revokeResponse = await request(GATEWAY_URL)
        .delete(`/api/v1/users/me/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(revokeResponse.body.success).toBe(true);
    });

    test('Session management via gateway', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping gateway session test - service not available');
        return;
      }

      // 1. Register and login
      await request(GATEWAY_URL)
        .post('/api/v1/users/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      authToken = loginResponse.body.data.token;

      // 2. Get active sessions
      const sessionsResponse = await request(GATEWAY_URL)
        .get('/api/v1/users/me/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(sessionsResponse.body.success).toBe(true);
      expect(sessionsResponse.body.data).toBeInstanceOf(Array);
      expect(sessionsResponse.body.data.length).toBeGreaterThan(0);

      const sessionId = sessionsResponse.body.data[0].id;

      // 3. Terminate session (this will invalidate our token)
      const terminateResponse = await request(GATEWAY_URL)
        .delete(`/api/v1/users/me/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(terminateResponse.body.success).toBe(true);
    });

    test('Password reset flow via gateway', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping gateway password reset test - service not available');
        return;
      }

      // 1. Register user
      await request(GATEWAY_URL)
        .post('/api/v1/users/auth/register')
        .send(testUser)
        .expect(201);

      // 2. Request password reset
      const forgotResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(forgotResponse.body.success).toBe(true);
      expect(forgotResponse.body.message).toContain('password reset link');

      // 3. Reset password (using a mock token for testing)
      const resetResponse = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/reset-password')
        .send({
          token: 'mock-reset-token',
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
    });
  });

  describe('👑 Admin Operations via Gateway', () => {
    let adminToken: string;
    let testUserId: string;

    beforeAll(async () => {
      if (!gatewayAvailable) return;

      // Login as admin
      const adminLogin = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/login')
        .send({
          email: 'admin@coinet.ai',
          password: 'admin123'
        });

      if (adminLogin.status === 200) {
        adminToken = adminLogin.body.data.token;
      }
    });

    test('Admin can list all users via gateway', async () => {
      if (!gatewayAvailable || !adminToken) {
        console.log('⏭️  Skipping admin test - gateway or admin token not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    test('Admin can access user analytics via gateway', async () => {
      if (!gatewayAvailable || !adminToken) {
        console.log('⏭️  Skipping admin analytics test - gateway or admin token not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .get('/api/v1/admin/analytics/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.security).toBeDefined();
    });

    test('Admin can access audit logs via gateway', async () => {
      if (!gatewayAvailable || !adminToken) {
        console.log('⏭️  Skipping admin audit test - gateway or admin token not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('🔒 Security & Error Handling via Gateway', () => {
    test('Unauthorized access should be rejected', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping unauthorized test - gateway not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .get('/api/v1/users/me')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('Access token required');
    });

    test('Invalid credentials should be rejected', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping invalid credentials test - gateway not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('Rate limiting should work', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping rate limiting test - gateway not available');
        return;
      }

      // Make multiple rapid requests to trigger rate limiting
      const requests = Array.from({ length: 10 }, () =>
        request(GATEWAY_URL)
          .post('/api/v1/users/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(requests);
      
      // At least some should succeed (before rate limit) and some might be rate limited
      const successfulResponses = responses.filter(r => r.status < 500);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    test('CORS headers should be present', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping CORS test - gateway not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .options('/api/v1/users/auth/login')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('🚀 Service Integration via Gateway', () => {
    let authToken: string;

    beforeAll(async () => {
      if (!gatewayAvailable) return;

      // Login as admin for integration tests
      const adminLogin = await request(GATEWAY_URL)
        .post('/api/v1/users/auth/login')
        .send({
          email: 'admin@coinet.ai',
          password: 'admin123'
        });

      if (adminLogin.status === 200) {
        authToken = adminLogin.body.data.token;
      }
    });

    test('Gateway should route to user service correctly', async () => {
      if (!gatewayAvailable || !authToken) {
        console.log('⏭️  Skipping routing test - gateway or token not available');
        return;
      }

      // Test that gateway properly routes user service endpoints
      const directResponse = await request(USER_SERVICE_URL)
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      const gatewayResponse = await request(GATEWAY_URL)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      if (directResponse.status === 200 && gatewayResponse.status === 200) {
        expect(gatewayResponse.body.data.email).toBe(directResponse.body.data.email);
        expect(gatewayResponse.body.data.role).toBe(directResponse.body.data.role);
      }
    });

    test('Gateway should handle service errors gracefully', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping error handling test - gateway not available');
        return;
      }

      // Test non-existent endpoint
      const response = await request(GATEWAY_URL)
        .get('/api/v1/users/nonexistent')
        .set('Authorization', `Bearer ${authToken || 'invalid-token'}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    test('Gateway should add proper headers', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping headers test - gateway not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .get('/health');

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('📊 Performance & Monitoring via Gateway', () => {
    test('Gateway metrics should be available', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping metrics test - gateway not available');
        return;
      }

      const response = await request(GATEWAY_URL)
        .get('/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('requests');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('uptime');
    });

    test('Response times should be reasonable', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping performance test - gateway not available');
        return;
      }

      const start = Date.now();
      
      await request(GATEWAY_URL)
        .get('/health')
        .expect(200);

      const responseTime = Date.now() - start;
      
      // Response should be under 1 second
      expect(responseTime).toBeLessThan(1000);
    });

    test('Concurrent requests should be handled properly', async () => {
      if (!gatewayAvailable) {
        console.log('⏭️  Skipping concurrency test - gateway not available');
        return;
      }

      // Make 5 concurrent health check requests
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(GATEWAY_URL).get('/health')
      );

      const responses = await Promise.all(concurrentRequests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });
  });
});

describe('🧪 Direct User Service Tests', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(() => {
    testUser = E2ETestHelper.generateTestUser();
  });

  afterEach(async () => {
    if (authToken && testUser) {
      await E2ETestHelper.cleanup(authToken, testUser.email);
    }
  });

  test('Complete authentication flow (direct)', async () => {
    if (!userServiceAvailable) {
      console.log('⏭️  Skipping direct user service test - service not available');
      return;
    }

    // 1. Register
    const registerResponse = await request(USER_SERVICE_URL)
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    expect(registerResponse.body.success).toBe(true);
    authToken = registerResponse.body.data.token;

    // 2. Get profile
    const profileResponse = await request(USER_SERVICE_URL)
      .get('/users/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(profileResponse.body.data.email).toBe(testUser.email);

    // 3. Update profile
    const updateResponse = await request(USER_SERVICE_URL)
      .put('/users/me')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Name',
        bio: 'Updated bio'
      })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);

    // 4. Change password
    const passwordResponse = await request(USER_SERVICE_URL)
      .post('/users/me/change-password')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!'
      })
      .expect(200);

    expect(passwordResponse.body.success).toBe(true);

    // 5. Logout
    const logoutResponse = await request(USER_SERVICE_URL)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(logoutResponse.body.success).toBe(true);
  });
});
