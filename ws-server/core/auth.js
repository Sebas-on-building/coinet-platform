const jwt = require('jsonwebtoken');
const { SecretManager } = require('../../src/lib/security/SecretManager');
const { Logger } = require('../../src/lib/logging/Logger');
const { MetricsCollector } = require('../../src/lib/metrics/MetricsCollector');

const logger = Logger.getInstance();
const metrics = MetricsCollector.getInstance();
const secretManager = SecretManager.getInstance();

let jwtSecret = null;

// Initialize JWT secret
async function getJWTSecret() {
  if (!jwtSecret) {
    jwtSecret = await secretManager.getSecret('JWT_SECRET', {
      source: 'env',
      required: true,
      minLength: 64
    });
  }
  return jwtSecret;
}

async function authenticateJWT(req) {
  const startTime = Date.now();

  try {
    // Extract token from various sources
    let token = null;

    // Check Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check query parameter as fallback for WebSocket connections
    if (!token && req.url) {
      const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
      token = urlParams.get('token');
    }

    if (!token) {
      logger.debug('No authentication token provided');
      metrics.incrementCounter('ws_auth_failures', { reason: 'no_token' });
      return null;
    }

    // Basic token validation
    if (token.length < 10) {
      logger.debug('Invalid token format');
      metrics.incrementCounter('ws_auth_failures', { reason: 'invalid_format' });
      return null;
    }

    // Verify JWT token
    const secret = await getJWTSecret();
    const payload = jwt.verify(token, secret, {
      issuer: 'coinet-platform',
      audience: 'coinet-users',
      algorithms: ['HS256']
    });

    // Validate payload structure
    if (!payload.sub || !payload.userId) {
      logger.warn('Invalid token payload structure', { payload });
      metrics.incrementCounter('ws_auth_failures', { reason: 'invalid_payload' });
      return null;
    }

    // Create user object
    const user = {
      id: payload.userId,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || [],
      sessionId: payload.sessionId
    };

    // Log successful authentication
    logger.debug('WebSocket user authenticated successfully', {
      userId: user.id,
      email: user.email,
      sessionId: user.sessionId
    });

    const duration = Date.now() - startTime;
    metrics.recordHistogram('ws_auth_duration', duration);
    metrics.incrementCounter('ws_auth_successes');

    return user;

  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.recordHistogram('ws_auth_duration', duration);

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (error instanceof jwt.JsonWebTokenError) {
      logger.debug('JWT verification failed', { error: errorMessage });
      metrics.incrementCounter('ws_auth_failures', { reason: 'jwt_error' });
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Token expired', { error: errorMessage });
      metrics.incrementCounter('ws_auth_failures', { reason: 'token_expired' });
    } else {
      logger.warn('Authentication error', { error: errorMessage });
      metrics.incrementCounter('ws_auth_failures', { reason: 'unknown_error' });
    }

    return null;
  }
}

// Helper function to check user permissions
function hasPermission(user, requiredPermission) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions && user.permissions.includes(requiredPermission);
}

// Helper function to check user role
function hasRole(user, requiredRole) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === requiredRole;
}

module.exports = {
  authenticateJWT,
  hasPermission,
  hasRole
}; 