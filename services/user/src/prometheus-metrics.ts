/**
 * Coinet User Service - Prometheus Metrics
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({
  prefix: 'coinet_user_',
  register
});

// Authentication metrics
export const authMetrics = {
  registrations: new Counter({
    name: 'coinet_user_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['status', 'tier']
  }),

  logins: new Counter({
    name: 'coinet_user_logins_total', 
    help: 'Total number of login attempts',
    labelNames: ['status', 'method', 'tier']
  }),

  failedLogins: new Counter({
    name: 'coinet_user_failed_logins_total',
    help: 'Total number of failed login attempts',
    labelNames: ['reason', 'email_domain']
  }),

  logouts: new Counter({
    name: 'coinet_user_logouts_total',
    help: 'Total number of user logouts',
    labelNames: ['method']
  }),

  twoFactorSetups: new Counter({
    name: 'coinet_user_2fa_setups_total',
    help: 'Total number of 2FA setups',
    labelNames: ['status']
  }),

  passwordResets: new Counter({
    name: 'coinet_user_password_resets_total',
    help: 'Total number of password reset requests',
    labelNames: ['status']
  })
};

// User management metrics
export const userMetrics = {
  activeUsers: new Gauge({
    name: 'coinet_user_active_users',
    help: 'Number of active users'
  }),

  verifiedUsers: new Gauge({
    name: 'coinet_user_verified_users',
    help: 'Number of verified users'
  }),

  twoFactorEnabledUsers: new Gauge({
    name: 'coinet_user_2fa_enabled_users',
    help: 'Number of users with 2FA enabled'
  }),

  usersByTier: new Gauge({
    name: 'coinet_user_users_by_tier',
    help: 'Number of users by tier',
    labelNames: ['tier']
  }),

  usersByRole: new Gauge({
    name: 'coinet_user_users_by_role',
    help: 'Number of users by role',
    labelNames: ['role']
  })
};

// Session metrics
export const sessionMetrics = {
  activeSessions: new Gauge({
    name: 'coinet_user_active_sessions',
    help: 'Number of active user sessions'
  }),

  sessionDuration: new Histogram({
    name: 'coinet_user_session_duration_seconds',
    help: 'User session duration in seconds',
    buckets: [300, 900, 1800, 3600, 7200, 14400, 28800, 86400] // 5m to 24h
  }),

  sessionCreations: new Counter({
    name: 'coinet_user_sessions_created_total',
    help: 'Total number of sessions created',
    labelNames: ['device_type']
  }),

  sessionTerminations: new Counter({
    name: 'coinet_user_sessions_terminated_total',
    help: 'Total number of sessions terminated',
    labelNames: ['reason']
  })
};

// API Key metrics
export const apiKeyMetrics = {
  apiKeysCreated: new Counter({
    name: 'coinet_user_api_keys_created_total',
    help: 'Total number of API keys created',
    labelNames: ['user_tier', 'permissions']
  }),

  apiKeysActive: new Gauge({
    name: 'coinet_user_api_keys_active',
    help: 'Number of active API keys'
  }),

  apiKeyUsage: new Counter({
    name: 'coinet_user_api_key_requests_total',
    help: 'Total number of API key requests',
    labelNames: ['key_id', 'status']
  }),

  apiKeyRevocations: new Counter({
    name: 'coinet_user_api_keys_revoked_total',
    help: 'Total number of API keys revoked',
    labelNames: ['reason']
  })
};

// Security metrics
export const securityMetrics = {
  accountLocks: new Counter({
    name: 'coinet_user_account_locks_total',
    help: 'Total number of account locks',
    labelNames: ['reason']
  }),

  securityScore: new Histogram({
    name: 'coinet_user_security_score',
    help: 'User security score distribution',
    buckets: [20, 40, 60, 80, 100]
  }),

  auditLogs: new Counter({
    name: 'coinet_user_audit_logs_total',
    help: 'Total number of audit log entries',
    labelNames: ['action', 'severity']
  }),

  suspensions: new Counter({
    name: 'coinet_user_suspensions_total',
    help: 'Total number of user suspensions',
    labelNames: ['reason', 'duration']
  })
};

// Database metrics
export const databaseMetrics = {
  connected: new Gauge({
    name: 'coinet_user_database_connected',
    help: 'Database connection status (1 = connected, 0 = disconnected)'
  }),

  operations: new Counter({
    name: 'coinet_user_db_operations_total',
    help: 'Total database operations',
    labelNames: ['operation', 'table', 'status']
  }),

  queryDuration: new Histogram({
    name: 'coinet_user_db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
  })
};

// Request metrics
export const requestMetrics = {
  httpRequests: new Counter({
    name: 'coinet_user_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  }),

  requestDuration: new Histogram({
    name: 'coinet_user_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
  }),

  requestSize: new Histogram({
    name: 'coinet_user_http_request_size_bytes',
    help: 'HTTP request size in bytes',
    buckets: [100, 1000, 10000, 100000, 1000000]
  }),

  responseSize: new Histogram({
    name: 'coinet_user_http_response_size_bytes',
    help: 'HTTP response size in bytes',
    buckets: [100, 1000, 10000, 100000, 1000000]
  })
};

// Export Prometheus registry
export { register };

// Utility function to update user counts
export const updateUserCounts = async (userCounts: any) => {
  userMetrics.activeUsers.set(userCounts.active || 0);
  userMetrics.verifiedUsers.set(userCounts.verified || 0);
  userMetrics.twoFactorEnabledUsers.set(userCounts.twoFactorEnabled || 0);

  // Update by tier
  if (userCounts.byTier) {
    Object.entries(userCounts.byTier).forEach(([tier, count]) => {
      userMetrics.usersByTier.set({ tier }, count as number);
    });
  }

  // Update by role
  if (userCounts.byRole) {
    Object.entries(userCounts.byRole).forEach(([role, count]) => {
      userMetrics.usersByRole.set({ role }, count as number);
    });
  }
};

// Utility function to track database operations
export const trackDatabaseOperation = (operation: string, table: string, duration: number, success: boolean) => {
  databaseMetrics.operations.inc({
    operation,
    table,
    status: success ? 'success' : 'error'
  });

  if (success) {
    databaseMetrics.queryDuration.observe({ operation, table }, duration);
  }
};

// Utility function to track HTTP requests
export const trackHttpRequest = (method: string, route: string, statusCode: number, duration: number, requestSize: number, responseSize: number) => {
  requestMetrics.httpRequests.inc({
    method,
    route,
    status_code: statusCode.toString()
  });

  requestMetrics.requestDuration.observe({ method, route }, duration);
  requestMetrics.requestSize.observe(requestSize);
  requestMetrics.responseSize.observe(responseSize);
};
