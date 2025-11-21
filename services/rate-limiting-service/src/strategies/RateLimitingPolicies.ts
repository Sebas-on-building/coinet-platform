/**
 * =========================================
 * RATE LIMITING POLICIES
 * =========================================
 * Configuration system for different rate limiting policies
 */

import { RateLimitConfig } from '../types';

export interface RateLimitingPolicy {
  name: string;
  description: string;
  config: Partial<RateLimitConfig>;
  conditions: PolicyCondition[];
}

export interface PolicyCondition {
  type: 'load' | 'time' | 'endpoint' | 'user_tier' | 'behavior';
  operator: 'gt' | 'lt' | 'eq' | 'in' | 'not_in';
  value: any;
  action: 'apply' | 'skip' | 'modify';
}

export class RateLimitingPolicies {
  private policies: Map<string, RateLimitingPolicy> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default rate limiting policies
   */
  private initializeDefaultPolicies(): void {
    // Conservative policy for high-load scenarios
    this.policies.set('conservative', {
      name: 'Conservative',
      description: 'Conservative rate limiting for high-load scenarios',
      config: {
        limits: {
          keyLevel: {
            enabled: true,
            defaultLimit: 500,
            windowSize: 60000,
            differentiated: {
              free: 100,
              premium: 1000,
              enterprise: 10000,
            },
          },
          resourceLevel: {
            enabled: true,
            endpoints: {
              '/api/v1/market-data': {
                limit: 5000,
                windowSize: 60000,
              },
              '/api/v1/alerts': {
                limit: 500,
                windowSize: 60000,
              },
              '/api/v1/notifications': {
                limit: 250,
                windowSize: 60000,
              },
            },
            methods: {
              GET: 10000,
              POST: 1000,
              PUT: 500,
              DELETE: 100,
            },
          },
          global: {
            enabled: true,
            maxRequestsPerSecond: 5000,
            maxConcurrentRequests: 1000,
          },
        },
      },
      conditions: [
        {
          type: 'load',
          operator: 'gt',
          value: 0.8,
          action: 'apply',
        },
      ],
    });

    // Aggressive policy for suspicious behavior
    this.policies.set('aggressive', {
      name: 'Aggressive',
      description: 'Aggressive rate limiting for suspicious behavior',
      config: {
        limits: {
          keyLevel: {
            enabled: true,
            defaultLimit: 100,
            windowSize: 60000,
            differentiated: {
              free: 10,
              premium: 100,
              enterprise: 1000,
            },
          },
          resourceLevel: {
            enabled: true,
            endpoints: {},
            methods: {},
          },
          global: {
            enabled: true,
            maxRequestsPerSecond: 1000,
            maxConcurrentRequests: 100,
          },
        },
      },
      conditions: [
        {
          type: 'behavior',
          operator: 'eq',
          value: 'suspicious',
          action: 'apply',
        },
      ],
    });

    // Standard policy for normal operation
    this.policies.set('standard', {
      name: 'Standard',
      description: 'Standard rate limiting for normal operation',
      config: {
        limits: {
          keyLevel: {
            enabled: true,
            defaultLimit: 1000,
            windowSize: 60000,
            differentiated: {
              free: 500,
              premium: 2000,
              enterprise: 5000,
            },
          },
          resourceLevel: {
            enabled: true,
            endpoints: {
              '/api/v1/market-data': {
                limit: 10000,
                windowSize: 60000,
              },
              '/api/v1/alerts': {
                limit: 1000,
                windowSize: 60000,
              },
              '/api/v1/notifications': {
                limit: 500,
                windowSize: 60000,
              },
            },
            methods: {
              GET: 10000,
              POST: 1000,
              PUT: 500,
              DELETE: 100,
            },
          },
          global: {
            enabled: true,
            maxRequestsPerSecond: 10000,
            maxConcurrentRequests: 1000,
          },
        },
      },
      conditions: [
        {
          type: 'load',
          operator: 'lt',
          value: 0.5,
          action: 'apply',
        },
      ],
    });

    // Premium policy for enterprise users
    this.policies.set('premium', {
      name: 'Premium',
      description: 'Premium rate limiting for enterprise users',
      config: {
        limits: {
          keyLevel: {
            enabled: true,
            defaultLimit: 5000,
            windowSize: 60000,
            differentiated: {
              free: 1000,
              premium: 10000,
              enterprise: 50000,
            },
          },
          resourceLevel: {
            enabled: true,
            endpoints: {
              '/api/v1/market-data': {
                limit: 50000,
                windowSize: 60000,
              },
              '/api/v1/alerts': {
                limit: 5000,
                windowSize: 60000,
              },
              '/api/v1/notifications': {
                limit: 2500,
                windowSize: 60000,
              },
            },
            methods: {
              GET: 50000,
              POST: 5000,
              PUT: 2500,
              DELETE: 500,
            },
          },
          global: {
            enabled: true,
            maxRequestsPerSecond: 50000,
            maxConcurrentRequests: 5000,
          },
        },
      },
      conditions: [
        {
          type: 'user_tier',
          operator: 'in',
          value: ['premium', 'enterprise'],
          action: 'apply',
        },
      ],
    });

    // Development policy for testing
    this.policies.set('development', {
      name: 'Development',
      description: 'Development rate limiting for testing',
      config: {
        limits: {
          keyLevel: {
            enabled: true,
            defaultLimit: 10000,
            windowSize: 60000,
            differentiated: {
              free: 10000,
              premium: 10000,
              enterprise: 10000,
            },
          },
          resourceLevel: {
            enabled: true,
            endpoints: {
              '/api/v1/market-data': {
                limit: 100000,
                windowSize: 60000,
              },
            },
            methods: {
              GET: 100000,
              POST: 100000,
              PUT: 100000,
              DELETE: 100000,
            },
          },
          global: {
            enabled: true,
            maxRequestsPerSecond: 100000,
            maxConcurrentRequests: 10000,
          },
        },
      },
      conditions: [
        {
          type: 'endpoint',
          operator: 'in',
          value: ['/dev', '/test'],
          action: 'apply',
        },
      ],
    });
  }

  /**
   * Get policy by name
   */
  getPolicy(name: string): RateLimitingPolicy | null {
    return this.policies.get(name) || null;
  }

  /**
   * Get all available policies
   */
  getAllPolicies(): RateLimitingPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Select appropriate policy based on context
   */
  selectPolicy(context: PolicySelectionContext): RateLimitingPolicy | null {
    const candidates = this.policies.values();

    for (const policy of Array.from(candidates)) {
      if (this.evaluatePolicyConditions(policy, context)) {
        return policy;
      }
    }

    // Return standard policy as default
    return this.policies.get('standard') || null;
  }

  /**
   * Evaluate policy conditions against context
   */
  private evaluatePolicyConditions(policy: RateLimitingPolicy, context: PolicySelectionContext): boolean {
    for (const condition of policy.conditions) {
      const contextValue = this.getContextValue(context, condition.type);
      const conditionMet = this.evaluateCondition(contextValue, condition.operator, condition.value);

      if (condition.action === 'apply' && !conditionMet) {
        return false;
      }

      if (condition.action === 'skip' && conditionMet) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get context value based on condition type
   */
  private getContextValue(context: PolicySelectionContext, type: string): any {
    switch (type) {
      case 'load':
        return Math.max(context.loadMetrics.cpuUsage, context.loadMetrics.memoryUsage);
      case 'time':
        return new Date().getHours();
      case 'endpoint':
        return context.endpoint;
      case 'user_tier':
        return context.userTier;
      case 'behavior':
        return context.userBehavior?.requestPattern;
      default:
        return null;
    }
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(contextValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'gt':
        return contextValue > expectedValue;
      case 'lt':
        return contextValue < expectedValue;
      case 'eq':
        return contextValue === expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(contextValue);
      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(contextValue);
      default:
        return false;
    }
  }

  /**
   * Create custom policy
   */
  createPolicy(policy: RateLimitingPolicy): void {
    this.policies.set(policy.name, policy);
  }

  /**
   * Remove policy
   */
  removePolicy(name: string): boolean {
    return this.policies.delete(name);
  }
}

export interface PolicySelectionContext {
  loadMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
  };
  endpoint: string;
  userTier?: string;
  userBehavior?: {
    requestPattern: string;
    averageRequestsPerHour: number;
  };
  timeOfDay?: number;
}
