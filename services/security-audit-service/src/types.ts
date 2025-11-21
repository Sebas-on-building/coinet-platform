export interface ScanningConfig {
  enabled: boolean;
  scheduleInterval: number;
  maxConcurrentScans: number;
  scanTimeout: number;
  retentionDays: number;
}

export interface PenetrationTestingConfig {
  enabled: boolean;
  scheduleInterval: number;
  maxConcurrentTests: number;
  testTimeout: number;
  allowedTechniques: string[];
}

export interface ComplianceAuditingConfig {
  enabled: boolean;
  frameworks: string[];
  scheduleInterval: number;
  retentionDays: number;
}

export interface SecurityAuditingConfig {
  enabled: boolean;
  scheduleInterval: number;
  retentionDays: number;
  tamperDetection: boolean;
}

export interface SecurityAuditConfig {
  port: number;
  host: string;
  environment: 'development' | 'staging' | 'production';
  scanning: ScanningConfig;
  penetrationTesting: PenetrationTestingConfig;
  compliance: ComplianceAuditingConfig;
  audit: SecurityAuditingConfig;
  security: {
    requireMFA: boolean;
    auditAllOperations: boolean;
    encryptionRequired: boolean;
    accessLogging: boolean;
  };
  remediation: {
    autoRemediation: boolean;
    remediationTimeout: number;
    escalationThreshold: number;
  };
  reporting: {
    enabled: boolean;
    reportFrequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    includeDetails: boolean;
  };
}
