/**
 * =========================================
 * KEY MANAGEMENT SERVICE TYPES
 * =========================================
 * Divine world-class type definitions for key management
 */

export interface KeyStorageConfig {
  provider: 'redis' | 'database' | 'filesystem';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  database?: {
    url: string;
  };
  filesystem?: {
    path: string;
    encryption: boolean;
  };
}

export interface KeyMetadata {
  createdAt: Date;
  expiresAt?: Date;
  version: string;
  purpose: string;
  userId: string;
}

export interface RBACConfig {
  defaultRole: string;
  cacheTTL: number;
  checkInterval: number;
}

export interface AuditConfig {
  enabled: boolean;
  retentionDays: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface RotationConfig {
  enabled: boolean;
  interval: number;
  maxVersions: number;
  gracePeriod: number;
}

export interface DistributionConfig {
  maxRetries: number;
  timeout: number;
  backoffMultiplier: number;
}

export interface KeyManagementConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';

  keyStorage: KeyStorageConfig;

  rbac: RBACConfig;

  audit: AuditConfig;

  rotation: RotationConfig;

  distribution: DistributionConfig;

  security: {
    masterKey: string;
    encryptionAlgorithm: 'aes256' | 'aes128';
    keyDerivationRounds: number;
  };

  monitoring: {
    metrics: {
      enabled: boolean;
      collectionInterval: number;
    };
    alerting: {
      enabled: boolean;
      thresholds: {
        failedOperations: number;
        suspiciousActivity: number;
      };
    };
  };
}
