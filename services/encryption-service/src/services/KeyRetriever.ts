/**
 * =========================================
 * KEY RETRIEVER
 * =========================================
 * Divine world-class key retrieval service for encryption operations
 * Secure communication with Key Management Service
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/Logger';
import { KeyManagementConfig } from '../types';

export interface KeyInfo {
  keyId: string;
  keyType: string;
  purpose: string;
  version: string;
  status: string;
}

export interface KeyRequest {
  userId: string;
  dataType: string;
  purpose: string;
}

/**
 * Advanced key retriever with secure communication to KMS
 */
export class KeyRetriever {
  private logger: Logger;
  private config: KeyManagementConfig;
  private httpClient: AxiosInstance;
  private keyCache: Map<string, { key: string; expiresAt: Date }> = new Map();

  constructor(config: KeyManagementConfig) {
    this.logger = new Logger('KeyRetriever');
    this.config = config;

    // Initialize HTTP client for KMS communication
    this.httpClient = axios.create({
      baseURL: config.kmsUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        'User-Agent': 'EncryptionService/1.0.0',
      },
    });

    // Add retry logic
    this.setupRetryInterceptor();
  }

  /**
   * Initialize the key retriever
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Key Retriever...', {
      kmsUrl: this.config.kmsUrl,
      timeout: this.config.timeout,
    });

    // Test connection to KMS
    await this.testKMSConnection();

    this.logger.info('✅ Key Retriever initialized successfully');
  }

  /**
   * Shutdown the key retriever
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Key Retriever...');

    this.keyCache.clear();
    this.logger.info('✅ Key Retriever shutdown successfully');
  }

  /**
   * Get encryption key for user and data type
   */
  async getKeyForUser(userId: string, dataType: string): Promise<string> {
    const cacheKey = `${userId}:${dataType}`;

    // Check cache first
    const cached = this.keyCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.key;
    }

    try {
      // Request key from KMS
      const response = await this.httpClient.post('/keys/request', {
        userId,
        dataType,
        purpose: `encrypt_${dataType}`,
      });

      if (!response.data.success) {
        throw new Error(`KMS key request failed: ${response.data.error}`);
      }

      const keyId = response.data.data.keyId;

      // Cache the key (in real implementation, this would be the encrypted key)
      this.keyCache.set(cacheKey, {
        key: keyId,
        expiresAt: new Date(Date.now() + 300000), // 5 minutes
      });

      this.logger.debug('Key retrieved for user', {
        userId,
        dataType,
        keyId,
      });

      return keyId;

    } catch (error: any) {
      this.logger.error('Failed to get key for user', error, {
        userId,
        dataType,
      });
      throw error;
    }
  }

  /**
   * Request a new key from KMS
   */
  async requestKey(request: KeyRequest): Promise<string> {
    try {
      const response = await this.httpClient.post('/keys/generate', {
        keyType: 'aes256',
        purpose: request.purpose,
        userId: request.userId,
        metadata: {
          dataType: request.dataType,
        },
      });

      if (!response.data.success) {
        throw new Error(`KMS key generation failed: ${response.data.error}`);
      }

      const keyId = response.data.data.keyId;

      this.logger.info('Key generated for user', {
        userId: request.userId,
        dataType: request.dataType,
        keyId,
      });

      return keyId;

    } catch (error: any) {
      this.logger.error('Failed to request key from KMS', error, {
        userId: request.userId,
        dataType: request.dataType,
      });
      throw error;
    }
  }

  /**
   * Verify key access permissions
   */
  async verifyKeyAccess(keyId: string, userId: string): Promise<void> {
    try {
      const response = await this.httpClient.get(`/keys/${keyId}`, {
        headers: {
          'X-User-ID': userId,
        },
      });

      if (!response.data.success) {
        throw new Error(`Key access denied: ${response.data.error}`);
      }

      this.logger.debug('Key access verified', {
        keyId,
        userId,
      });

    } catch (error: any) {
      this.logger.error('Key access verification failed', error, {
        keyId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get key status from KMS
   */
  async getKeyStatus(keyId: string): Promise<KeyInfo> {
    try {
      const response = await this.httpClient.get(`/keys/${keyId}/status`);

      if (!response.data.success) {
        throw new Error(`Failed to get key status: ${response.data.error}`);
      }

      return response.data.data;

    } catch (error: any) {
      this.logger.error('Failed to get key status', error, { keyId });
      throw error;
    }
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(keyId: string, userId: string): Promise<void> {
    try {
      const response = await this.httpClient.put(`/keys/${keyId}/rotate`, {}, {
        headers: {
          'X-User-ID': userId,
        },
      });

      if (!response.data.success) {
        throw new Error(`Key rotation failed: ${response.data.error}`);
      }

      // Clear cache for this key
      this.clearKeyCache(keyId);

      this.logger.info('Key rotated successfully', {
        keyId,
        userId,
      });

    } catch (error: any) {
      this.logger.error('Failed to rotate key', error, {
        keyId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Distribute key to multiple services
   */
  async distributeKey(keyId: string, services: string[]): Promise<void> {
    try {
      const response = await this.httpClient.post(`/keys/${keyId}/distribute`, {
        services,
      });

      if (!response.data.success) {
        throw new Error(`Key distribution failed: ${response.data.error}`);
      }

      this.logger.info('Key distributed to services', {
        keyId,
        services,
      });

    } catch (error: any) {
      this.logger.error('Failed to distribute key', error, {
        keyId,
        services,
      });
      throw error;
    }
  }

  // Private helper methods

  private async testKMSConnection(): Promise<void> {
    try {
      const response = await this.httpClient.get('/health');
      if (response.data.status !== 'healthy') {
        throw new Error('KMS health check failed');
      }

      this.logger.info('KMS connection verified');
    } catch (error: any) {
      this.logger.error('KMS connection test failed', error);
      throw new Error(`Cannot connect to KMS: ${error.message}`);
    }
  }

  private setupRetryInterceptor(): void {
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;

        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry < this.config.retryAttempts) {
          config.retry += 1;

          // Exponential backoff
          const delay = Math.pow(this.config.backoffMultiplier, config.retry - 1) * 1000;

          this.logger.debug('Retrying KMS request', {
            attempt: config.retry,
            delay,
            url: config.url,
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          return this.httpClient(config);
        }

        return Promise.reject(error);
      }
    );
  }

  private clearKeyCache(keyId: string): void {
    for (const [cacheKey, cached] of Array.from(this.keyCache.entries())) {
      if (cacheKey.includes(keyId)) {
        this.keyCache.delete(cacheKey);
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      const response = await this.httpClient.get('/health');

      if (response.data.status === 'healthy') {
        return { status: 'healthy' };
      } else {
        return {
          status: 'unhealthy',
          details: `KMS status: ${response.data.status}`,
        };
      }
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: `KMS connection failed: ${error.message}`,
      };
    }
  }
}
