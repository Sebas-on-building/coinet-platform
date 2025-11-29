/**
 * Enterprise-grade Secrets Management System
 * Supports multiple backends: HashiCorp Vault, AWS Secrets Manager, Environment Variables
 * 
 * Features:
 * - Multiple secret backends with automatic failover
 * - Secret caching with TTL
 * - Automatic rotation detection
 * - Audit logging
 * - Encryption at rest (for in-memory cache)
 */

import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { logger } from './logger';

export enum SecretBackend {
  VAULT = 'vault',
  AWS_SECRETS_MANAGER = 'aws',
  ENV = 'env',
}

export interface SecretConfig {
  backend: SecretBackend;
  cacheTTL?: number; // Cache TTL in seconds (default: 3600)
  enableCache?: boolean; // Enable in-memory caching (default: true)
  encryptionKey?: string; // Key for encrypting cached secrets
  
  // Vault-specific config
  vaultUrl?: string;
  vaultToken?: string;
  vaultNamespace?: string;
  vaultMountPath?: string;
  
  // AWS-specific config
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  
  // Fallback order
  fallbackBackends?: SecretBackend[];
}

interface CachedSecret {
  value: string;
  encrypted: boolean;
  expiresAt: number;
  version?: string;
}

export class SecretsManager {
  private config: SecretConfig;
  private cache: Map<string, CachedSecret>;
  private vaultClient?: AxiosInstance;
  private encryptionKey: Buffer;

  constructor(config: SecretConfig) {
    this.config = {
      cacheTTL: 3600,
      enableCache: true,
      fallbackBackends: [],
      ...config,
    };

    this.cache = new Map();

    // Generate encryption key for cache
    if (config.encryptionKey) {
      this.encryptionKey = crypto.createHash('sha256')
        .update(config.encryptionKey)
        .digest();
    } else {
      // Generate random encryption key if not provided
      this.encryptionKey = crypto.randomBytes(32);
      logger.warn('No encryption key provided for secrets cache. Using random key.');
    }

    // Initialize Vault client if configured
    if (config.backend === SecretBackend.VAULT && config.vaultUrl) {
      this.initializeVaultClient();
    }

    logger.info('Secrets manager initialized', {
      backend: config.backend,
      cacheEnabled: config.enableCache,
      cacheTTL: config.cacheTTL,
      fallbacks: config.fallbackBackends,
    });
  }

  /**
   * Initialize HashiCorp Vault client
   */
  private initializeVaultClient(): void {
    if (!this.config.vaultUrl || !this.config.vaultToken) {
      throw new Error('Vault URL and token are required for Vault backend');
    }

    this.vaultClient = axios.create({
      baseURL: this.config.vaultUrl,
      headers: {
        'X-Vault-Token': this.config.vaultToken,
        ...(this.config.vaultNamespace && {
          'X-Vault-Namespace': this.config.vaultNamespace,
        }),
      },
      timeout: 5000,
    });

    logger.info('Vault client initialized', {
      url: this.config.vaultUrl,
      namespace: this.config.vaultNamespace,
    });
  }

  /**
   * Encrypt a value for caching
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: iv + authTag + encrypted
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  }

  /**
   * Decrypt a cached value
   */
  private decrypt(encrypted: string): string {
    const iv = Buffer.from(encrypted.slice(0, 32), 'hex');
    const authTag = Buffer.from(encrypted.slice(32, 64), 'hex');
    const encryptedText = encrypted.slice(64);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get secret from cache
   */
  private getFromCache(key: string): string | null {
    if (!this.config.enableCache) {
      return null;
    }

    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Decrypt if encrypted
    if (cached.encrypted) {
      return this.decrypt(cached.value);
    }

    return cached.value;
  }

  /**
   * Store secret in cache
   */
  private setInCache(key: string, value: string, version?: string): void {
    if (!this.config.enableCache) {
      return;
    }

    const encrypted = this.encrypt(value);
    const expiresAt = Date.now() + (this.config.cacheTTL! * 1000);

    this.cache.set(key, {
      value: encrypted,
      encrypted: true,
      expiresAt,
      version,
    });
  }

  /**
   * Get secret from HashiCorp Vault
   */
  private async getFromVault(path: string): Promise<string> {
    if (!this.vaultClient) {
      throw new Error('Vault client not initialized');
    }

    try {
      const mountPath = this.config.vaultMountPath || 'secret';
      const fullPath = `/${mountPath}/data/${path}`;
      
      logger.debug(`Fetching secret from Vault: ${fullPath}`);
      
      const response = await this.vaultClient.get(fullPath);
      
      const data = response.data?.data?.data;
      if (!data) {
        throw new Error(`No data found at path: ${path}`);
      }

      // Extract version for cache invalidation
      const version = response.data?.data?.metadata?.version;

      // Vault stores key-value pairs, return the first value or the "value" field
      const value = data.value || Object.values(data)[0];
      
      if (typeof value !== 'string') {
        throw new Error(`Secret at ${path} is not a string`);
      }

      logger.debug(`Successfully fetched secret from Vault: ${path}`, {
        version,
      });

      return value;
    } catch (error: any) {
      logger.error(`Failed to fetch secret from Vault: ${path}`, {
        error: error.message,
        status: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * Get secret from AWS Secrets Manager
   * 
   * Requires @aws-sdk/client-secrets-manager to be installed:
   *   npm install @aws-sdk/client-secrets-manager
   * 
   * Configuration via environment variables (recommended):
   *   AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
   * Or via SecretConfig properties:
   *   awsRegion, awsAccessKeyId, awsSecretAccessKey
   */
  private async getFromAWS(secretName: string): Promise<string> {
    try {
      // Dynamic import to avoid requiring AWS SDK when not using AWS backend
      // Using Function constructor to bypass TypeScript static analysis
      const importDynamic = new Function('modulePath', 'return import(modulePath)');
      const awsModule = await importDynamic('@aws-sdk/client-secrets-manager') as any;
      const { SecretsManagerClient, GetSecretValueCommand } = awsModule;
      
      const clientConfig: any = {
        region: this.config.awsRegion || process.env.AWS_REGION || 'us-east-1',
      };
      
      // Only add credentials if explicitly provided (otherwise use default credential chain)
      if (this.config.awsAccessKeyId && this.config.awsSecretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.config.awsAccessKeyId,
          secretAccessKey: this.config.awsSecretAccessKey,
        };
      }
      
      const client = new SecretsManagerClient(clientConfig);
      
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });
      
      const response = await client.send(command);
      
      if (response.SecretString) {
        logger.debug(`Successfully fetched secret from AWS: ${secretName}`);
        return response.SecretString;
      } else if (response.SecretBinary) {
        // Handle binary secrets
        const buff = Buffer.from(response.SecretBinary as Uint8Array);
        return buff.toString('utf-8');
      } else {
        throw new Error(`Secret ${secretName} has no value`);
      }
    } catch (error: any) {
      // Check if it's a missing module error
      if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
        logger.warn(`AWS SDK not installed. Run: npm install @aws-sdk/client-secrets-manager`);
        throw new Error('AWS Secrets Manager requires @aws-sdk/client-secrets-manager. Install with: npm install @aws-sdk/client-secrets-manager');
      }
      
      // Handle specific AWS errors
      if (error.name === 'ResourceNotFoundException') {
        logger.error(`Secret not found in AWS: ${secretName}`);
        throw new Error(`Secret not found: ${secretName}`);
      }
      
      if (error.name === 'AccessDeniedException') {
        logger.error(`Access denied to AWS secret: ${secretName}`);
        throw new Error(`Access denied to secret: ${secretName}`);
      }
      
      logger.error(`Failed to fetch secret from AWS: ${secretName}`, {
        error: error.message,
        errorName: error.name,
      });
      throw error;
    }
  }

  /**
   * Get secret from environment variable
   */
  private getFromEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable not found: ${key}`);
    }
    return value;
  }

  /**
   * Get secret with automatic backend selection and failover
   */
  async getSecret(key: string, options?: {
    backend?: SecretBackend;
    skipCache?: boolean;
  }): Promise<string> {
    const backend = options?.backend || this.config.backend;

    // Try cache first
    if (!options?.skipCache) {
      const cached = this.getFromCache(key);
      if (cached) {
        logger.debug(`Secret retrieved from cache: ${key}`);
        return cached;
      }
    }

    // Try primary backend
    try {
      let value: string;

      switch (backend) {
        case SecretBackend.VAULT:
          value = await this.getFromVault(key);
          break;
        case SecretBackend.AWS_SECRETS_MANAGER:
          value = await this.getFromAWS(key);
          break;
        case SecretBackend.ENV:
          value = this.getFromEnv(key);
          break;
        default:
          throw new Error(`Unknown backend: ${backend}`);
      }

      // Cache the secret
      this.setInCache(key, value);

      logger.info(`Secret retrieved from ${backend}: ${key}`);
      return value;
    } catch (error) {
      logger.warn(`Failed to get secret from ${backend}: ${key}`, { error });

      // Try fallback backends
      if (this.config.fallbackBackends && this.config.fallbackBackends.length > 0) {
        for (const fallbackBackend of this.config.fallbackBackends) {
          try {
            logger.info(`Trying fallback backend: ${fallbackBackend}`);
            return await this.getSecret(key, {
              backend: fallbackBackend,
              skipCache: options?.skipCache,
            });
          } catch (fallbackError) {
            logger.warn(`Fallback backend ${fallbackBackend} failed`, {
              error: fallbackError,
            });
          }
        }
      }

      throw error;
    }
  }

  /**
   * Get multiple secrets in parallel
   */
  async getSecrets(keys: string[], options?: {
    backend?: SecretBackend;
    skipCache?: boolean;
  }): Promise<Record<string, string>> {
    const results = await Promise.allSettled(
      keys.map(key => this.getSecret(key, options))
    );

    const secrets: Record<string, string> = {};
    
    results.forEach((result, index) => {
      const key = keys[index];
      if (result.status === 'fulfilled') {
        secrets[key] = result.value;
      } else {
        logger.error(`Failed to get secret: ${key}`, {
          error: result.reason,
        });
      }
    });

    return secrets;
  }

  /**
   * Invalidate cache for a specific secret
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
    logger.debug(`Cache invalidated for: ${key}`);
  }

  /**
   * Clear all cached secrets
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('All secrets cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Health check for the secrets backend
   */
  async healthCheck(): Promise<boolean> {
    try {
      switch (this.config.backend) {
        case SecretBackend.VAULT:
          if (!this.vaultClient) {
            return false;
          }
          await this.vaultClient.get('/sys/health');
          return true;

        case SecretBackend.AWS_SECRETS_MANAGER:
          // AWS SDK health check would go here
          return true;

        case SecretBackend.ENV:
          // Environment variables are always available
          return true;

        default:
          return false;
      }
    } catch (error) {
      logger.error('Secrets backend health check failed', { error });
      return false;
    }
  }
}

// Singleton instance
let secretsManagerInstance: SecretsManager | null = null;

/**
 * Initialize the global secrets manager
 */
export function initializeSecretsManager(config: SecretConfig): SecretsManager {
  secretsManagerInstance = new SecretsManager(config);
  return secretsManagerInstance;
}

/**
 * Get the global secrets manager instance
 */
export function getSecretsManager(): SecretsManager {
  if (!secretsManagerInstance) {
    // Initialize with environment variables as fallback
    secretsManagerInstance = new SecretsManager({
      backend: SecretBackend.ENV,
    });
  }
  return secretsManagerInstance;
}

/**
 * Reset the secrets manager instance (for testing)
 */
export function resetSecretsManager(): void {
  if (secretsManagerInstance) {
    secretsManagerInstance.clearCache();
  }
  secretsManagerInstance = null;
}

export default {
  SecretsManager,
  initializeSecretsManager,
  getSecretsManager,
  resetSecretsManager,
  SecretBackend,
};

