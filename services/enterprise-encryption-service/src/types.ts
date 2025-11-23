export interface EncryptionConfig {
  algorithm: 'aes256' | 'quantum_resistant' | 'KYBER512' | 'KYBER768' | 'KYBER1024';
  quantumResistant: boolean;
  keySize: number;
  ivLength: number;
  authTagLength: number;
  keyRotationInterval: number;
  maxKeyVersions: number;
  batchSize: number;
  performanceThreshold: number;
}

export interface HSMConfig {
  enabled: boolean;
  provider: 'aws' | 'azure' | 'gcp' | 'thales';
  region: string;
  keyStore: string;
  timeout: number;
}

export interface KMSConfig {
  provider: 'aws' | 'azure' | 'gcp' | 'vault';
  region: string;
  keyRing: string;
  rotationInterval: number;
}

export interface EnterpriseEncryptionConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';
  encryption: EncryptionConfig;
  hsm: HSMConfig;
  kms: KMSConfig;
  security: {
    requireMFA: boolean;
    auditAllOperations: boolean;
    dataClassification: {
      personal: { sensitivity: string; retention: string };
      device_token: { sensitivity: string; retention: string };
      api_key: { sensitivity: string; retention: string };
      financial: { sensitivity: string; retention: string };
      custom: { sensitivity: string; retention: string };
    };
  };
  performance: {
    maxConcurrentOperations: number;
    cacheSize: number;
    cacheTTL: number;
    enableCompression: boolean;
  };
  monitoring: {
    enabled: boolean;
    collectionInterval: number;
    retentionDays: number;
  };
  compliance: {
    gdpr: {
      enabled: boolean;
      dataRetentionDays: number;
      consentRequired: boolean;
    };
    sox: {
      enabled: boolean;
      auditRetentionDays: number;
    };
    pci: {
      enabled: boolean;
      keyRotationDays: number;
    };
  };
}
