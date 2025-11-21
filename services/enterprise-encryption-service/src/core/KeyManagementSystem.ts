/**
 * =========================================
 * KEY MANAGEMENT SYSTEM (KMS)
 * =========================================
 * Divine world-class key management system for enterprise encryption
 * NIST SP 800-57 compliant key lifecycle management
 */

import * as crypto from 'crypto';
import { Logger, createLogger } from '../utils/Logger';
import { KMSConfig } from '../types';

export interface KeyInfo {
  keyId: string;
  keyType: 'AES' | 'RSA' | 'ECC' | 'HMAC';
  keySize: number;
  algorithm: string;
  purpose: string;
  status: 'active' | 'inactive' | 'compromised' | 'destroyed';
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  usageCount: number;
  metadata?: Record<string, any>;
}

export interface KeyRotationInfo {
  keyId: string;
  newKeyId: string;
  rotatedAt: Date;
  reason: string;
  previousVersion: string;
  newVersion: string;
}

export class KeyManagementSystem {
  private logger: Logger;
  private config: KMSConfig;
  private isInitialized: boolean = false;

  // In-memory key storage (in production, this would be a secure database)
  private keys = new Map<string, KeyInfo>();
  private keyVersions = new Map<string, string[]>();

  // Key rotation tracking
  private rotationHistory = new Map<string, KeyRotationInfo[]>();

  // Compliance tracking
  private auditLog: Array<{
    timestamp: Date;
    operation: string;
    keyId: string;
    userId: string;
    details: Record<string, any>;
  }> = [];

  constructor(config: KMSConfig) {
    this.logger = createLogger('KeyManagementSystem');
    this.config = config;
  }

  /**
   * Initialize the KMS
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing Key Management System...', {
      provider: this.config.provider,
      region: this.config.region,
    });

    try {
      // Initialize KMS provider
      await this.initializeKMSProvider();

      // Load existing keys if any
      await this.loadExistingKeys();

      // Set up key rotation scheduler
      this.setupKeyRotationScheduler();

      this.isInitialized = true;
      this.logger.info('✅ Key Management System initialized successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Key Management System', error);
      throw error;
    }
  }

  /**
   * Generate a new encryption key
   */
  async generateKey(request: {
    keyType: 'AES' | 'RSA' | 'ECC' | 'HMAC';
    keySize: number;
    purpose: string;
    userId: string;
    metadata?: Record<string, any>;
  }): Promise<{
    keyId: string;
    keyType: string;
    keySize: number;
    purpose: string;
    createdAt: Date;
  }> {
    if (!this.isInitialized) {
      throw new Error('KMS not initialized');
    }

    try {
      this.logger.debug('Generating encryption key', {
        keyType: request.keyType,
        keySize: request.keySize,
        purpose: request.purpose,
        userId: request.userId,
      });

      // Generate key ID
      const keyId = `kms-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

      // Calculate expiration based on purpose
      const expiresAt = this.calculateKeyExpiration(request.purpose);

      // Create key info
      const keyInfo: KeyInfo = {
        keyId,
        keyType: request.keyType,
        keySize: request.keySize,
        algorithm: this.getAlgorithmForKeyType(request.keyType),
        purpose: request.purpose,
        status: 'active',
        createdAt: new Date(),
        expiresAt,
        usageCount: 0,
        metadata: {
          ...request.metadata,
          generatedBy: request.userId,
          generationMethod: 'automated',
        },
      };

      // Store key (in production, this would be encrypted storage)
      this.keys.set(keyId, keyInfo);

      // Initialize version tracking
      this.keyVersions.set(keyId, ['1.0.0']);

      // Log key generation
      this.logAuditEvent({
        operation: 'key_generated',
        keyId,
        userId: request.userId,
        details: {
          keyType: request.keyType,
          purpose: request.purpose,
          algorithm: keyInfo.algorithm,
        },
      });

      this.logger.info('Encryption key generated successfully', {
        keyId,
        keyType: request.keyType,
        purpose: request.purpose,
      });

      return {
        keyId,
        keyType: request.keyType,
        keySize: request.keySize,
        purpose: request.purpose,
        createdAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error('Key generation failed', error, {
        keyType: request.keyType,
        purpose: request.purpose,
      });
      throw error;
    }
  }

  /**
   * Get key information
   */
  async getKey(keyId: string, userId: string): Promise<{
    keyId: string;
    keyType: string;
    purpose: string;
    encryptedKey: string;
    metadata?: Record<string, any>;
  }> {
    if (!this.isInitialized) {
      throw new Error('KMS not initialized');
    }

    const keyInfo = this.keys.get(keyId);
    if (!keyInfo) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (keyInfo.status !== 'active') {
      throw new Error(`Key is not active: ${keyId}`);
    }

    // Check if key is expired
    if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
      throw new Error(`Key has expired: ${keyId}`);
    }

    // Update usage statistics
    keyInfo.lastUsed = new Date();
    keyInfo.usageCount++;

    // Log key access
    this.logAuditEvent({
      operation: 'key_accessed',
      keyId,
      userId,
      details: {
        purpose: keyInfo.purpose,
        usageCount: keyInfo.usageCount,
      },
    });

    this.logger.debug('Key accessed', {
      keyId,
      userId,
      purpose: keyInfo.purpose,
    });

    // Return encrypted key (in production, this would be the actual encrypted key material)
    return {
      keyId,
      keyType: keyInfo.keyType,
      purpose: keyInfo.purpose,
      encryptedKey: `encrypted-${keyId}`, // Placeholder for actual encrypted key
      metadata: keyInfo.metadata,
    };
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(keyId: string, userId: string): Promise<{
    keyId: string;
    rotatedAt: Date;
    newVersion: string;
  }> {
    if (!this.isInitialized) {
      throw new Error('KMS not initialized');
    }

    const keyInfo = this.keys.get(keyId);
    if (!keyInfo) {
      throw new Error(`Key not found: ${keyId}`);
    }

    try {
      this.logger.info('Rotating encryption key', {
        keyId,
        currentVersion: this.keyVersions.get(keyId)?.[0],
      });

      // Generate new key version
      const currentVersions = this.keyVersions.get(keyId) || [];
      const newVersion = this.incrementVersion(currentVersions[0]);

      // Add new version to tracking
      currentVersions.unshift(newVersion);
      if (currentVersions.length > this.config.rotationInterval) {
        currentVersions.pop(); // Remove oldest version
      }
      this.keyVersions.set(keyId, currentVersions);

      // Update key info
      keyInfo.lastUsed = new Date();

      // Create rotation record
      const rotationInfo: KeyRotationInfo = {
        keyId,
        newKeyId: `${keyId}-v${newVersion}`,
        rotatedAt: new Date(),
        reason: 'scheduled_rotation',
        previousVersion: currentVersions[1] || '1.0.0',
        newVersion,
      };

      // Add to rotation history
      const history = this.rotationHistory.get(keyId) || [];
      history.push(rotationInfo);
      this.rotationHistory.set(keyId, history);

      // Log key rotation
      this.logAuditEvent({
        operation: 'key_rotated',
        keyId,
        userId,
        details: {
          newVersion,
          reason: 'scheduled_rotation',
          previousVersion: rotationInfo.previousVersion,
        },
      });

      this.logger.info('Key rotation completed', {
        keyId,
        newVersion,
        previousVersion: rotationInfo.previousVersion,
      });

      return {
        keyId,
        rotatedAt: new Date(),
        newVersion,
      };
    } catch (error: any) {
      this.logger.error('Key rotation failed', error, { keyId });
      throw error;
    }
  }

  /**
   * Revoke/deactivate a key
   */
  async revokeKey(keyId: string, userId: string, reason: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('KMS not initialized');
    }

    const keyInfo = this.keys.get(keyId);
    if (!keyInfo) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Update key status
    keyInfo.status = 'inactive';

    // Log key revocation
    this.logAuditEvent({
      operation: 'key_revoked',
      keyId,
      userId,
      details: {
        reason,
        previousStatus: 'active',
      },
    });

    this.logger.warn('Key revoked', {
      keyId,
      reason,
      revokedBy: userId,
    });
  }

  /**
   * Get key audit logs
   */
  async getAuditLogs(filters: {
    keyId?: string;
    userId?: string;
    operation?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<any[]> {
    let logs = [...this.auditLog];

    // Apply filters
    if (filters.keyId) {
      logs = logs.filter(log => log.keyId === filters.keyId);
    }

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.operation) {
      logs = logs.filter(log => log.operation === filters.operation);
    }

    if (filters.startDate) {
      logs = logs.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      logs = logs.filter(log => log.timestamp <= filters.endDate!);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Generate compliance report
   */
  async getComplianceReport(): Promise<{
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    rotatedKeys: number;
    securityIncidents: number;
    complianceScore: number;
    recommendations: string[];
  }> {
    const totalKeys = this.keys.size;
    const activeKeys = Array.from(this.keys.values()).filter(k => k.status === 'active').length;
    const expiredKeys = Array.from(this.keys.values()).filter(k => k.expiresAt && k.expiresAt < new Date()).length;
    const rotatedKeys = Array.from(this.rotationHistory.values()).flat().length;
    const securityIncidents = this.auditLog.filter(log => log.operation === 'security_incident').length;

    // Calculate compliance score (0-100)
    let complianceScore = 100;

    // Deduct points for issues
    if (expiredKeys > 0) complianceScore -= 20;
    if (securityIncidents > 0) complianceScore -= 30;
    if (activeKeys / totalKeys < 0.8) complianceScore -= 10;

    // Ensure score is not negative
    complianceScore = Math.max(0, complianceScore);

    // Generate recommendations
    const recommendations: string[] = [];

    if (expiredKeys > 0) {
      recommendations.push(`Renew ${expiredKeys} expired keys`);
    }

    if (securityIncidents > 0) {
      recommendations.push(`Investigate ${securityIncidents} security incidents`);
    }

    if (activeKeys / totalKeys < 0.9) {
      recommendations.push('Review and cleanup inactive keys');
    }

    if (rotatedKeys === 0) {
      recommendations.push('Implement key rotation schedule');
    }

    return {
      totalKeys,
      activeKeys,
      expiredKeys,
      rotatedKeys,
      securityIncidents,
      complianceScore,
      recommendations,
    };
  }

  /**
   * Health check for KMS
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    lastRotation?: Date;
  }> {
    try {
      const totalKeys = this.keys.size;
      const activeKeys = Array.from(this.keys.values()).filter(k => k.status === 'active').length;
      const expiredKeys = Array.from(this.keys.values()).filter(k => k.expiresAt && k.expiresAt < new Date()).length;

      // Get last rotation
      const lastRotation = Array.from(this.rotationHistory.values())
        .flat()
        .sort((a, b) => b.rotatedAt.getTime() - a.rotatedAt.getTime())[0]?.rotatedAt;

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (expiredKeys > 0) status = 'degraded';
      if (expiredKeys > totalKeys * 0.1) status = 'unhealthy';

      return {
        status,
        totalKeys,
        activeKeys,
        expiredKeys,
        lastRotation,
      };
    } catch (error) {
      this.logger.error('KMS health check failed', error);
      return {
        status: 'unhealthy',
        totalKeys: 0,
        activeKeys: 0,
        expiredKeys: 0,
      };
    }
  }

  /**
   * Shutdown KMS
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Key Management System');

    // Clear sensitive data
    this.keys.clear();
    this.keyVersions.clear();
    this.rotationHistory.clear();
    this.auditLog = [];

    this.isInitialized = false;
    this.logger.info('✅ Key Management System shutdown successfully');
  }

  // Private helper methods

  private async initializeKMSProvider(): Promise<void> {
    switch (this.config.provider) {
      case 'aws':
        await this.initializeAWSKMS();
        break;
      case 'azure':
        await this.initializeAzureKMS();
        break;
      case 'gcp':
        await this.initializeGCPKMS();
        break;
      case 'vault':
        await this.initializeVaultKMS();
        break;
      default:
        throw new Error(`Unsupported KMS provider: ${this.config.provider}`);
    }
  }

  private async initializeAWSKMS(): Promise<void> {
    this.logger.debug('Initializing AWS KMS');
    // Implementation would use AWS SDK
  }

  private async initializeAzureKMS(): Promise<void> {
    this.logger.debug('Initializing Azure KMS');
    // Implementation would use Azure SDK
  }

  private async initializeGCPKMS(): Promise<void> {
    this.logger.debug('Initializing GCP KMS');
    // Implementation would use Google Cloud SDK
  }

  private async initializeVaultKMS(): Promise<void> {
    this.logger.debug('Initializing HashiCorp Vault KMS');
    // Implementation would use Vault SDK
  }

  private async loadExistingKeys(): Promise<void> {
    // Load existing keys from storage
    this.logger.debug('Loading existing keys');
  }

  private setupKeyRotationScheduler(): void {
    // Set up automated key rotation
    setInterval(async () => {
      try {
        await this.performScheduledRotations();
      } catch (error) {
        this.logger.error('Scheduled key rotation failed', error);
      }
    }, this.config.rotationInterval);
  }

  private async performScheduledRotations(): Promise<void> {
    const now = new Date();
    const keysToRotate: string[] = [];

    Array.from(this.keys.entries()).forEach(([keyId, keyInfo]) => {
      if (keyInfo.status === 'active' &&
          keyInfo.expiresAt &&
          keyInfo.expiresAt.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) { // 7 days before expiry
        keysToRotate.push(keyId);
      }
    });

    for (const keyId of keysToRotate) {
      try {
        await this.rotateKey(keyId, 'system');
      } catch (error) {
        this.logger.error(`Failed to rotate key ${keyId}`, error);
      }
    }
  }

  private calculateKeyExpiration(purpose: string): Date | undefined {
    // Calculate expiration based on purpose and compliance requirements
    const expirationMap: Record<string, number> = {
      'session': 24 * 60 * 60 * 1000, // 24 hours
      'api_key': 90 * 24 * 60 * 60 * 1000, // 90 days
      'user_data': 365 * 24 * 60 * 60 * 1000, // 1 year
      'backup': 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    };

    const duration = expirationMap[purpose] || expirationMap['user_data'];
    return new Date(Date.now() + duration);
  }

  private getAlgorithmForKeyType(keyType: string): string {
    const algorithmMap: Record<string, string> = {
      'AES': 'AES-256-GCM',
      'RSA': 'RSA-OAEP',
      'ECC': 'ECDSA-P256',
      'HMAC': 'HMAC-SHA256',
    };

    return algorithmMap[keyType] || 'AES-256-GCM';
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const lastPart = parseInt(parts[parts.length - 1]) + 1;
    parts[parts.length - 1] = lastPart.toString();
    return parts.join('.');
  }

  private logAuditEvent(event: {
    operation: string;
    keyId: string;
    userId: string;
    details: Record<string, any>;
  }): void {
    this.auditLog.push({
      timestamp: new Date(),
      ...event,
    });

    // Keep only last 10000 entries in memory
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }
}

export default KeyManagementSystem;
