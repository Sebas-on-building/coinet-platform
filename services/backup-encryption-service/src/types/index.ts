/**
 * =========================================
 * BACKUP ENCRYPTION SERVICE TYPES
 * =========================================
 * Divine world-class type definitions for backup encryption
 */

export interface BackupEncryptionConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';

  backupDirectory: string;
  tempDirectory: string;

  encryption: {
    algorithm: 'aes256' | 'aes128';
    keySize: number;
    ivLength: number;
    authTagLength: number;
  };

  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'lz4' | 'zstd';
    level: number;
  };

  keyRotation: {
    enabled: boolean;
    interval: number;
    maxVersions: number;
    gracePeriod: number;
  };

  monitoring: {
    metrics: {
      enabled: boolean;
      collectionInterval: number;
    };
    alerting: {
      enabled: boolean;
      thresholds: {
        failedBackups: number;
        unencryptedBackups: number;
      };
    };
  };

  security: {
    requireEncryption: boolean;
    allowUnencryptedBackups: boolean;
    auditBackupOperations: boolean;
  };
}