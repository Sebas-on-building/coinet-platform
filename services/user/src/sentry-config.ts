/**
 * Coinet User Service - Sentry Error Tracking Configuration
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Sentry configuration
export const initializeSentry = () => {
  const sentryDsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const release = process.env.SENTRY_RELEASE || 'coinet-user-service@1.0.0';

  if (!sentryDsn) {
    console.log('⚠️  Sentry DSN not configured, error tracking disabled');
    return false;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    release,
    
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Profiling integration
      nodeProfilingIntegration(),
      
      // HTTP integration for request tracking
      Sentry.httpIntegration(),
      
      // Express integration for automatic error capture
      Sentry.expressIntegration(),
      
      // Console integration for console.error capture
      Sentry.consoleIntegration()
    ],

    // Error filtering
    beforeSend(event, hint) {
      // Don't send health check errors
      if (event.request?.url?.includes('/health') || 
          event.request?.url?.includes('/ready') ||
          event.request?.url?.includes('/metrics')) {
        return null;
      }

      // Don't send rate limiting errors (they're expected)
      if (event.exception?.values?.[0]?.type === 'RateLimitError') {
        return null;
      }

      // Add user context if available
      if (event.user?.id) {
        event.tags = {
          ...event.tags,
          user_tier: event.user.tier,
          user_role: event.user.role
        };
      }

      return event;
    },

    // Performance transaction filtering
    beforeSendTransaction(event) {
      // Sample only important transactions in production
      if (environment === 'production') {
        // Always capture auth-related transactions
        if (event.transaction?.includes('auth') || 
            event.transaction?.includes('login') ||
            event.transaction?.includes('register')) {
          return event;
        }
        
        // Sample other transactions at 10%
        if (Math.random() > 0.1) {
          return null;
        }
      }
      
      return event;
    }
  });

  console.log('✅ Sentry initialized for error tracking and performance monitoring');
  return true;
};

// Utility functions for enhanced error tracking
export const captureUserError = (error: Error, user: any, context: any = {}) => {
  Sentry.withScope((scope) => {
    scope.setUser({
      id: user?.id,
      email: user?.email,
      role: user?.role,
      tier: user?.tier
    });
    
    scope.setContext('user_context', context);
    scope.setLevel('error');
    
    Sentry.captureException(error);
  });
};

export const captureAuthEvent = (event: string, user: any, metadata: any = {}) => {
  Sentry.withScope((scope) => {
    scope.setUser({
      id: user?.id,
      email: user?.email,
      role: user?.role
    });
    
    scope.setContext('auth_event', {
      event,
      timestamp: new Date().toISOString(),
      ...metadata
    });
    
    scope.setLevel('info');
    Sentry.captureMessage(`Auth Event: ${event}`, 'info');
  });
};

export const captureSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any = {}) => {
  Sentry.withScope((scope) => {
    scope.setContext('security_event', {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details
    });
    
    scope.setLevel(severity === 'critical' ? 'fatal' : 
                   severity === 'high' ? 'error' :
                   severity === 'medium' ? 'warning' : 'info');
    
    const level = severity === 'critical' ? 'fatal' : 
                  severity === 'high' ? 'error' :
                  severity === 'medium' ? 'warning' : 'info';
    Sentry.captureMessage(`Security Event: ${event}`, level);
  });
};

export const capturePerformanceMetric = (operation: string, duration: number, metadata: any = {}) => {
  Sentry.withScope((scope) => {
    scope.setTag('operation', operation);
    scope.setContext('performance', {
      duration,
      metadata,
      slow_operation: duration > 1000
    });
    
    if (duration > 1000) {
      Sentry.captureMessage(`Slow operation: ${operation} took ${duration}ms`, 'warning');
    }
  });
};

// Express middleware for automatic error capture
export const sentryErrorHandler = Sentry.expressErrorHandler({
  shouldHandleError(error) {
    // Handle all errors except rate limiting
    return error.status !== 429;
  }
});

export const sentryRequestHandler = (req: any, res: any, next: any) => {
  // Set user context if available
  if (req.user) {
    Sentry.setUser({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      tier: req.user.tier
    });
  }
  next();
};
