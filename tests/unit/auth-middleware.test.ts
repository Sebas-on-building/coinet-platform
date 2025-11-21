/**
 * =========================================
 * AUTHENTICATION MIDDLEWARE UNIT TESTS
 * =========================================
 * Comprehensive unit tests for authentication and authorization middleware
 */

import { jest } from '@jest/globals';
import {
  authenticateToken,
  requireRole,
  requirePermission,
  requireAuth,
  optionalAuth,
  generateJWT,
  verifyJWT,
  extractToken,
  authRateLimit,
  securityHeaders,
  corsConfig,
  requestLogging,
  authErrorHandler
} from '../../packages/shared-utils/src/auth';

// Mock Express request/response objects
const createMockReq = (overrides = {}) => ({
  headers: {},
  cookies: {},
  query: {},
  user: undefined,
  token: undefined,
  tokenPayload: undefined,
  userId: undefined,
  ip: '127.0.0.1',
  path: '/test',
  method: 'GET',
  get: jest.fn((header) => {
    if (header === 'User-Agent') return 'test-agent';
    return undefined;
  }),
  ...overrides
});

const createMockRes = (overrides = {}) => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  setHeader: jest.fn().mockReturnThis(),
  cookie: jest.fn().mockReturnThis(),
  clearCookie: jest.fn().mockReturnThis(),
  headersSent: false,
  end: jest.fn(),
  ...overrides
});

const createMockNext = () => jest.fn();

describe('Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractToken', () => {
    it('should extract token from Authorization header', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer test-token' }
      });

      const token = extractToken(req);
      expect(token).toBe('test-token');
    });

    it('should extract token from cookies', () => {
      const req = createMockReq({
        cookies: { accessToken: 'cookie-token' }
      });

      const token = extractToken(req);
      expect(token).toBe('cookie-token');
    });

    it('should extract token from query parameter', () => {
      const req = createMockReq({
        query: { token: 'query-token' }
      });

      const token = extractToken(req);
      expect(token).toBe('query-token');
    });

    it('should return null when no token found', () => {
      const req = createMockReq();

      const token = extractToken(req);
      expect(token).toBeNull();
    });
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const mockUser = {
        id: 'user123',
        role: 'user',
        permissions: ['read:profile'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(mockUser);
      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user123');
      expect(req.user.role).toBe('user');
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid token'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when no token provided', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication required'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow request with correct role', () => {
      const mockUser = {
        id: 'user123',
        role: 'admin',
        permissions: ['admin:access'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(mockUser);
      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` },
        user: mockUser
      });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requireRole(['admin', 'user']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject request with insufficient role', () => {
      const mockUser = {
        id: 'user123',
        role: 'user',
        permissions: ['read:profile'],
        isActive: true,
        createdAt: new Date()
      };

      const req = createMockReq({ user: mockUser });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when no user authenticated', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow request with correct permissions', () => {
      const mockUser = {
        id: 'user123',
        role: 'user',
        permissions: ['signals:process', 'portfolio:read'],
        isActive: true,
        createdAt: new Date()
      };

      const req = createMockReq({ user: mockUser });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requirePermission(['signals:process']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject request with insufficient permissions', () => {
      const mockUser = {
        id: 'user123',
        role: 'user',
        permissions: ['portfolio:read'],
        isActive: true,
        createdAt: new Date()
      };

      const req = createMockReq({ user: mockUser });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requirePermission(['signals:process']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should authenticate and authorize correctly', () => {
      const mockUser = {
        id: 'user123',
        role: 'premium',
        permissions: ['signals:process'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(mockUser);
      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requireAuth(['premium'], ['signals:process']);
      middleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('premium');
      expect(next).toHaveBeenCalled();
    });

    it('should fail authentication first', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      const middleware = requireAuth(['premium'], ['signals:process']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user when token is valid', () => {
      const mockUser = {
        id: 'user123',
        role: 'user',
        permissions: ['read:profile'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(mockUser);
      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = createMockRes();
      const next = createMockNext();

      optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user123');
      expect(next).toHaveBeenCalled();
    });

    it('should not fail when no token provided', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should not fail when token is invalid', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = createMockRes();
      const next = createMockNext();

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('generateJWT', () => {
    it('should generate valid JWT token', () => {
      const user = {
        id: 'user123',
        role: 'user',
        permissions: ['read:profile'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(user);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      // Should be verifiable
      const payload = verifyJWT(token);
      expect(payload.id).toBe('user123');
      expect(payload.role).toBe('user');
    });

    it('should include custom expiration', () => {
      const user = {
        id: 'user123',
        role: 'user',
        permissions: ['read:profile'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(user, { expiresIn: '1h' });

      const payload = verifyJWT(token);
      expect(payload.exp).toBeDefined();
    });
  });

  describe('verifyJWT', () => {
    it('should verify valid token', () => {
      const user = {
        id: 'user123',
        role: 'user',
        permissions: ['read:profile'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(user);
      const payload = verifyJWT(token);

      expect(payload.id).toBe('user123');
      expect(payload.role).toBe('user');
      expect(payload.iss).toBe('coinet-auth-service');
      expect(payload.aud).toBe('coinet-api');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyJWT('invalid.token.here');
      }).toThrow();
    });
  });

  describe('authRateLimit', () => {
    it('should return rate limit middleware', () => {
      const middleware = authRateLimit();

      expect(typeof middleware).toBe('function');

      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      // Should be a valid Express middleware function
      expect(() => {
        middleware(req, res, next);
      }).not.toThrow();
    });
  });

  describe('securityHeaders', () => {
    it('should return helmet middleware', () => {
      const middleware = securityHeaders();

      expect(typeof middleware).toBe('function');

      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      expect(() => {
        middleware(req, res, next);
      }).not.toThrow();
    });
  });

  describe('corsConfig', () => {
    it('should return cors middleware', () => {
      const middleware = corsConfig();

      expect(typeof middleware).toBe('function');

      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      expect(() => {
        middleware(req, res, next);
      }).not.toThrow();
    });
  });

  describe('requestLogging', () => {
    it('should return logging middleware', () => {
      const middleware = requestLogging();

      expect(typeof middleware).toBe('function');

      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      expect(() => {
        middleware(req, res, next);
      }).not.toThrow();
    });
  });

  describe('authErrorHandler', () => {
    it('should return error handler middleware', () => {
      const middleware = authErrorHandler();

      expect(typeof middleware).toBe('function');

      const error = new Error('Test error');
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      expect(() => {
        middleware(error, req, res, next);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle full authentication flow', () => {
      const user = {
        id: 'integration-user',
        role: 'premium',
        permissions: ['signals:process', 'portfolio:read'],
        isActive: true,
        createdAt: new Date()
      };

      // Generate token
      const token = generateJWT(user);

      // Create authenticated request
      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` }
      });

      const res = createMockRes();
      const next = createMockNext();

      // Authenticate
      authenticateToken(req, res, () => {
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe('integration-user');

        // Authorize by role
        const roleMiddleware = requireRole(['premium', 'enterprise']);
        roleMiddleware(req, res, () => {
          // Authorize by permission
          const permMiddleware = requirePermission(['signals:process']);
          permMiddleware(req, res, next);

          expect(next).toHaveBeenCalled();
        });
      });
    });

    it('should handle authentication failures gracefully', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer completely-invalid-token' }
      });

      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid token'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed Authorization header', () => {
      const req = createMockReq({
        headers: { authorization: 'NotBearerFormat' }
      });

      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle expired tokens', () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlciIsInJvbGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOlsic2lnbmFsczpwcm9jZXNzIl0sImlzcyI6ImNvaW5ldC1hdXRoLXNlcnZpY2UiLCJhdWQiOiJjb2luZXQtYXBpIiwianRpIjoiZXhwaXJlZC10b2tlbiIsInN1YiI6InRlc3QtdXNlciIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxNjA5NDU5MjAwfQ.invalid-signature';

      const req = createMockReq({
        headers: { authorization: `Bearer ${expiredToken}` }
      });

      const res = createMockRes();
      const next = createMockNext();

      expect(() => {
        authenticateToken(req, res, next);
      }).toThrow();
    });

    it('should handle concurrent requests correctly', async () => {
      const user = {
        id: 'concurrent-user',
        role: 'user',
        permissions: ['read:profile'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(user);

      // Simulate concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        new Promise<void>((resolve) => {
          const req = createMockReq({
            headers: { authorization: `Bearer ${token}` }
          });

          const res = createMockRes();
          const next = createMockNext();

          authenticateToken(req, res, () => {
            expect(req.user).toBeDefined();
            expect(req.user.id).toBe('concurrent-user');
            resolve();
          });
        })
      );

      await Promise.all(requests);

      // All requests should have been authenticated successfully
      expect(requests).toHaveLength(10);
    });
  });

  describe('Performance Tests', () => {
    it('should handle token verification quickly', () => {
      const user = {
        id: 'perf-user',
        role: 'user',
        permissions: ['read:profile'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(user);

      // Measure verification performance
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        verifyJWT(token);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should verify 1000 tokens in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle middleware execution quickly', () => {
      const user = {
        id: 'perf-user',
        role: 'user',
        permissions: ['read:profile'],
        isActive: true,
        createdAt: new Date()
      };

      const token = generateJWT(user);

      // Measure middleware execution performance
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const req = createMockReq({
          headers: { authorization: `Bearer ${token}` }
        });

        const res = createMockRes();
        const next = createMockNext();

        authenticateToken(req, res, next);
        expect(next).toHaveBeenCalled();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should process 1000 middleware calls in under 200ms
      expect(duration).toBeLessThan(200);
    });
  });
});
