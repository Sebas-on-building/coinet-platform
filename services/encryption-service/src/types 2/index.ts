/**
 * =========================================
 * ENCRYPTION SERVICE TYPES
 * =========================================
 * Divine world-class type definitions for encryption at rest
 */

import { z } from 'zod';

/**
 * Encryption service configuration
 */
export interface EncryptionConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';

  encryption: {
    algorithm: 'aes256' | 'aes128';
    keySize: number;
    ivLength: number;
    authTagLength: number;
    keyRotationInterval: number; // milliseconds
    maxKeyVersions: number;
  };

  keyManagement: {
    kmsUrl: string;
    apiKey: string;
    timeout: number;
    retryAttempts: number;
    backoffMultiplier?: number;
  };

  performance: {
    maxConcurrentOperations: number;
    cacheSize: number;
    cacheTTL: number; // seconds
    batchSize: number;
  };

  monitoring: {
    metrics: {
      enabled: boolean;
      collectionInterval: number;
    };
    alerting: {
      enabled: boolean;
      thresholds: {
        errorRate: number;
        averageLatency: number;
        throughput: number;
      };
    };
  };

  security: {
    requireKeyRotation: boolean;
    allowKeyReuse: boolean;
    auditEncryptionOperations: boolean;
    dataClassification: {
      personal: { sensitivity: string; retention: string };
      device_token: { sensitivity: string; retention: string };
      api_key: { sensitivity: string; retention: string };
      financial: { sensitivity: string; retention: string };
      custom: { sensitivity: string; retention: string };
    };
  };
}

/**
 * Key Management Service configuration
 */
export interface KeyManagementConfig {
  kmsUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  backoffMultiplier?: number;
}

/**
 * Encryption engine configuration
 */
export interface EncryptionEngineConfig {
  algorithm: 'aes256' | 'aes128';
  keySize: number;
  ivLength: number;
  authTagLength: number;
  keyRotationInterval: number;
  maxKeyVersions: number;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  metrics: {
    enabled: boolean;
    collectionInterval: number;
  };
  alerting: {
    enabled: boolean;
    thresholds: {
      errorRate: number;
      averageLatency: number;
      throughput: number;
    };
  };
}

/**
 * Zod schemas for validation
 */
export const EncryptionConfigSchema = z.object({
  port: z.number(),
  host: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  encryption: z.object({
    algorithm: z.enum(['aes256', 'aes128']),
    keySize: z.number(),
    ivLength: z.number(),
    authTagLength: z.number(),
    keyRotationInterval: z.number(),
    maxKeyVersions: z.number(),
  }),

  keyManagement: z.object({
    kmsUrl: z.string(),
    apiKey: z.string(),
    timeout: z.number(),
    retryAttempts: z.number(),
    backoffMultiplier: z.number().optional(),
  }),

  performance: z.object({
    maxConcurrentOperations: z.number(),
    cacheSize: z.number(),
    cacheTTL: z.number(),
    batchSize: z.number(),
  }),

  monitoring: z.object({
    metrics: z.object({
      enabled: z.boolean(),
      collectionInterval: z.number(),
    }),
    alerting: z.object({
      enabled: z.boolean(),
      thresholds: z.object({
        errorRate: z.number(),
        averageLatency: z.number(),
        throughput: z.number(),
      }),
    }),
  }),

  security: z.object({
    requireKeyRotation: z.boolean(),
    allowKeyReuse: z.boolean(),
    auditEncryptionOperations: z.boolean(),
    dataClassification: z.object({
      personal: z.object({
        sensitivity: z.string(),
        retention: z.string(),
      }),
      device_token: z.object({
        sensitivity: z.string(),
        retention: z.string(),
      }),
      api_key: z.object({
        sensitivity: z.string(),
        retention: z.string(),
      }),
      financial: z.object({
        sensitivity: z.string(),
        retention: z.string(),
      }),
      custom: z.object({
        sensitivity: z.string(),
        retention: z.string(),
      }),
    }),
  }),
});

// Type exports
export type EncryptionConfigType = z.infer<typeof EncryptionConfigSchema>;
