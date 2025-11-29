/**
 * =========================================
 * API INFRASTRUCTURE TYPES
 * =========================================
 * Divine world-class type definitions for API infrastructure
 */

import { z } from 'zod';

/**
 * Main API Infrastructure configuration
 */
export interface APIInfrastructureConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';

  // Security configuration
  security: {
    allowedOrigins: string[];
    jwtSecret: string;
    apiKeys: string[];
    encryptionKey: string;
  };

  // Authentication configuration
  authentication: {
    jwt: {
      secret: string;
      expiresIn: string;
      issuer: string;
      audience: string;
    };
    apiKeys: {
      enabled: boolean;
      header: string;
    };
    oauth: {
      enabled: boolean;
      providers: string[];
    };
  };

  // Authorization configuration
  authorization: {
    rbac: {
      enabled: boolean;
      defaultRole: string;
    };
    permissions: {
      checkInterval: number;
    };
  };

  // Rate limiting configuration
  rateLimiting: {
    global: {
      maxRequestsPerSecond: number;
      maxRequestsPerMinute: number;
      maxRequestsPerHour: number;
    };
    perUser: {
      maxRequestsPerMinute: number;
      maxRequestsPerHour: number;
      burstLimit: number;
    };
    perEndpoint: Record<string, {
      maxRequestsPerSecond: number;
      maxRequestsPerMinute: number;
      burstLimit: number;
    }>;
    adaptive: {
      enabled: boolean;
      adjustmentFactor: number;
      cooldownPeriod: number;
      maxAdjustment: number;
    };
  };

  // Validation configuration
  validation: {
    strictMode: boolean;
    maxRequestSize: number;
    maxArraySize: number;
  };

  // Error handling configuration
  errorHandling: {
    includeStackTrace: boolean;
    logErrors: boolean;
    errorReporting: {
      enabled: boolean;
      endpoint: string;
    };
  };

  // Health check configuration
  health: {
    checkInterval: number;
    unhealthyThreshold: number;
    services: {
      redis: string;
      kafka: string[];
      database: string;
    };
  };

  // Monitoring configuration
  monitoring: {
    metrics: {
      enabled: boolean;
      collectionInterval: number;
      retentionPeriod: number;
    };
    logging: {
      level: 'error' | 'warn' | 'info' | 'debug';
      structured: boolean;
      retentionDays: number;
    };
  };

  // Distributed tracing configuration
  tracing: {
    enabled: boolean;
    serviceName: string;
    samplingRate: number;
    exporter: {
      type: 'jaeger' | 'zipkin' | 'otlp';
      endpoint: string;
    };
  };

  // Service configurations
  marketSignals: any; // Import from market-signal-processor
  alertEvaluation: any; // Import from evaluate-alert-conditions
  notifications: any; // Import from send-notifications
  nlp: any; // Import from parse-natural-language
}

/**
 * Zod schemas for validation
 */
export const APIInfrastructureConfigSchema = z.object({
  port: z.number(),
  host: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  security: z.object({
    allowedOrigins: z.array(z.string()),
    jwtSecret: z.string(),
    apiKeys: z.array(z.string()),
    encryptionKey: z.string(),
  }),

  authentication: z.object({
    jwt: z.object({
      secret: z.string(),
      expiresIn: z.string(),
      issuer: z.string(),
      audience: z.string(),
    }),
    apiKeys: z.object({
      enabled: z.boolean(),
      header: z.string(),
    }),
    oauth: z.object({
      enabled: z.boolean(),
      providers: z.array(z.string()),
    }),
  }),

  authorization: z.object({
    rbac: z.object({
      enabled: z.boolean(),
      defaultRole: z.string(),
    }),
    permissions: z.object({
      checkInterval: z.number(),
    }),
  }),

  rateLimiting: z.object({
    global: z.object({
      maxRequestsPerSecond: z.number(),
      maxRequestsPerMinute: z.number(),
      maxRequestsPerHour: z.number(),
    }),
    perUser: z.object({
      maxRequestsPerMinute: z.number(),
      maxRequestsPerHour: z.number(),
      burstLimit: z.number(),
    }),
    perEndpoint: z.record(z.object({
      maxRequestsPerSecond: z.number(),
      maxRequestsPerMinute: z.number(),
      burstLimit: z.number(),
    })),
    adaptive: z.object({
      enabled: z.boolean(),
      adjustmentFactor: z.number(),
      cooldownPeriod: z.number(),
      maxAdjustment: z.number(),
    }),
  }),

  validation: z.object({
    strictMode: z.boolean(),
    maxRequestSize: z.number(),
    maxArraySize: z.number(),
  }),

  errorHandling: z.object({
    includeStackTrace: z.boolean(),
    logErrors: z.boolean(),
    errorReporting: z.object({
      enabled: z.boolean(),
      endpoint: z.string(),
    }),
  }),

  health: z.object({
    checkInterval: z.number(),
    unhealthyThreshold: z.number(),
    services: z.object({
      redis: z.string(),
      kafka: z.array(z.string()),
      database: z.string(),
    }),
  }),

  monitoring: z.object({
    metrics: z.object({
      enabled: z.boolean(),
      collectionInterval: z.number(),
      retentionPeriod: z.number(),
    }),
    logging: z.object({
      level: z.enum(['error', 'warn', 'info', 'debug']),
      structured: z.boolean(),
      retentionDays: z.number(),
    }),
  }),

  tracing: z.object({
    enabled: z.boolean(),
    serviceName: z.string(),
    samplingRate: z.number(),
    exporter: z.object({
      type: z.enum(['jaeger', 'zipkin', 'otlp']),
      endpoint: z.string(),
    }),
  }),

  marketSignals: z.any(),
  alertEvaluation: z.any(),
  notifications: z.any(),
  nlp: z.any(),
});

// Type exports
export type APIInfrastructureConfigType = z.infer<typeof APIInfrastructureConfigSchema>;
