import { createHash, timingSafeEqual } from 'crypto';
import { Logger } from '../logging/Logger';

export interface SecretConfig {
  source: 'env' | 'aws' | 'vault' | 'kubernetes';
  required: boolean;
  minLength?: number;
  cacheTtlMs?: number;
}

export class SecretManager {
  private static instance: SecretManager;
  private cache = new Map<string, { value: string; expires: number }>();
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  async getSecret(
    secretName: string,
    config: SecretConfig = { source: 'env', required: true }
  ): Promise<string> {
    // Check cache first
    const cacheKey = `${config.source}:${secretName}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    let secretValue: string;

    try {
      switch (config.source) {
        case 'env':
          secretValue = await this.getFromEnvironment(secretName);
          break;
        case 'aws':
          secretValue = await this.getFromAWS(secretName);
          break;
        case 'vault':
          secretValue = await this.getFromVault(secretName);
          break;
        case 'kubernetes':
          secretValue = await this.getFromKubernetes(secretName);
          break;
        default:
          throw new Error(`Unsupported secret source: ${config.source}`);
      }

      if (!secretValue && config.required) {
        throw new Error(`Required secret '${secretName}' not found in ${config.source}`);
      }

      if (!secretValue) {
        return '';
      }

      // Validate secret strength
      if (config.minLength && secretValue.length < config.minLength) {
        throw new Error(`Secret '${secretName}' must be at least ${config.minLength} characters`);
      }

      // Cache the secret (default 5 minutes TTL)
      const ttl = config.cacheTtlMs || 5 * 60 * 1000;
      this.cache.set(cacheKey, {
        value: secretValue,
        expires: Date.now() + ttl
      });

      this.logger.info('Secret retrieved successfully', {
        secretName,
        source: config.source,
        length: secretValue.length
      });

      return secretValue;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to retrieve secret', {
        secretName,
        source: config.source,
        error: errorMessage
      });

      if (config.required) {
        throw error;
      }
      return '';
    }
  }

  // Secure secret validation using timing-safe comparison
  validateSecret(provided: string, expected: string): boolean {
    if (!provided || !expected) {
      return false;
    }

    const providedHash = createHash('sha256').update(provided).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(providedHash, expectedHash);
  }

  // Clear cached secrets (for rotation scenarios)
  clearCache(secretName?: string): void {
    if (secretName) {
      // Clear specific secret from all sources
      for (const key of this.cache.keys()) {
        if (key.endsWith(`:${secretName}`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cached secrets
      this.cache.clear();
    }
  }

  private async getFromEnvironment(secretName: string): Promise<string> {
    return process.env[secretName] || '';
  }

  private async getFromAWS(secretName: string): Promise<string> {
    // For now, fall back to environment variables
    // TODO: Implement AWS Secrets Manager when @aws-sdk/client-secrets-manager is available
    this.logger.debug('AWS Secrets Manager not configured, using environment fallback', {
      secretName
    });
    return this.getFromEnvironment(secretName);
  }

  private async getFromVault(secretName: string): Promise<string> {
    try {
      // HashiCorp Vault implementation
      const vaultPath = process.env.VAULT_PATH || '/vault/secrets';
      const fs = await import('fs');
      const path = await import('path');

      const secretPath = path.join(vaultPath, secretName);

      if (fs.existsSync(secretPath)) {
        return fs.readFileSync(secretPath, 'utf8').trim();
      }

      return '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Vault not available, falling back to environment', {
        secretName,
        error: errorMessage
      });
      return this.getFromEnvironment(secretName);
    }
  }

  private async getFromKubernetes(secretName: string): Promise<string> {
    try {
      // Kubernetes secret implementation
      const fs = await import('fs');
      const secretPath = `/var/secrets/${secretName}`;

      if (fs.existsSync(secretPath)) {
        return fs.readFileSync(secretPath, 'utf8').trim();
      }

      return '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn('Kubernetes secrets not available, falling back to environment', {
        secretName,
        error: errorMessage
      });
      return this.getFromEnvironment(secretName);
    }
  }

  // Audit logging for secret access
  private auditSecretAccess(secretName: string, source: string, success: boolean): void {
    this.logger.info('Secret access audit', {
      event: 'secret_access',
      secretName,
      source,
      success,
      timestamp: new Date().toISOString(),
      process: process.pid
    });
  }
} 