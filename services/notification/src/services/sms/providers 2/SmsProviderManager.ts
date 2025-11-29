import { SmsProvider, SmsData, SmsResult, SmsProviderConfig } from '@/types';
import { BaseSmsProvider } from './BaseSmsProvider';
import { TwilioSmsProvider } from './TwilioSmsProvider';
import { NexmoSmsProvider } from './NexmoSmsProvider';
import { Logger } from '@/utils/Logger';

export class SmsProviderManager {
  private static instance: SmsProviderManager;
  private providers: Map<string, SmsProvider> = new Map();
  private logger: Logger;
  private fallbackEnabled: boolean;
  private maxRetries: number;
  private retryDelay: number;

  private constructor(
    fallbackEnabled: boolean = true,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ) {
    this.fallbackEnabled = fallbackEnabled;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.logger = Logger.getInstance();
  }

  static getInstance(
    fallbackEnabled?: boolean,
    maxRetries?: number,
    retryDelay?: number
  ): SmsProviderManager {
    if (!SmsProviderManager.instance) {
      SmsProviderManager.instance = new SmsProviderManager(fallbackEnabled, maxRetries, retryDelay);
    }
    return SmsProviderManager.instance;
  }

  /**
   * Add a provider to the manager
   */
  addProvider(provider: SmsProvider): void {
    this.providers.set(provider.name, provider);
    this.logger.info(`Added SMS provider: ${provider.name} (type: ${provider.type}, priority: ${provider.priority})`);
  }

  /**
   * Remove a provider from the manager
   */
  removeProvider(providerName: string): void {
    const removed = this.providers.delete(providerName);
    if (removed) {
      this.logger.info(`Removed SMS provider: ${providerName}`);
    } else {
      this.logger.warn(`Provider not found for removal: ${providerName}`);
    }
  }

  /**
   * Get all providers sorted by priority (lower number = higher priority)
   */
  getProviders(): SmsProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): SmsProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Send SMS with automatic provider selection and fallback
   */
  async sendSms(smsData: SmsData): Promise<SmsResult> {
    const providers = this.getProviders();
    let lastError: SmsResult | null = null;

    for (const provider of providers) {
      try {
        this.logger.info(`Attempting to send SMS via provider: ${provider.name}`);

        const result = await provider.sendSms(smsData);

        if (result.success) {
          this.logger.info(`SMS sent successfully via provider: ${provider.name}`);
          return result;
        } else {
          lastError = result;
          this.logger.warn(`SMS send failed via provider ${provider.name}: ${result.error?.message}`);

          // If fallback is disabled or error is not retryable, don't try other providers
          if (!this.fallbackEnabled || !result.error?.retryable) {
            break;
          }
        }
      } catch (error) {
        this.logger.error(`Unexpected error with SMS provider ${provider.name}`, { error });
        lastError = {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: `Unexpected error with SMS provider ${provider.name}: ${(error as Error).message}`,
            provider: provider.name,
            retryable: true
          },
          provider: provider.name,
          timestamp: new Date()
        };

        // Continue to next provider if fallback is enabled
        if (!this.fallbackEnabled) {
          break;
        }
      }

      // Add delay between provider attempts
      if (providers.indexOf(provider) < providers.length - 1) {
        await this.delay(this.retryDelay);
      }
    }

      // All providers failed
    if (lastError) {
      this.logger.error('All SMS providers failed', { lastError, smsData });
      return lastError;
    } else {
      // This shouldn't happen, but handle gracefully
      const fallbackError: SmsResult = {
        success: false,
        error: {
          code: 'NO_PROVIDERS',
          message: 'No SMS providers available',
          provider: 'system',
          retryable: false
        },
        provider: 'system',
        timestamp: new Date()
      };

      this.logger.error('No SMS providers configured');
      return fallbackError;
    }
  }

  /**
   * Send SMS with retry logic for a specific provider
   */
  async sendSmsWithRetry(
    providerName: string,
    smsData: SmsData,
    maxRetries?: number
  ): Promise<SmsResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_NOT_FOUND',
          message: `SMS provider ${providerName} not found`,
          provider: 'system',
          retryable: false
        },
        provider: 'system',
        timestamp: new Date()
      };
    }

    const retries = maxRetries || this.maxRetries;
    let lastError: SmsResult | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.logger.info(`Attempt ${attempt + 1}/${retries + 1} to send SMS via ${providerName}`);

        const result = await provider.sendSms(smsData);

        if (result.success) {
          this.logger.info(`SMS sent successfully via ${providerName} on attempt ${attempt + 1}`);
          return result;
        } else {
          lastError = result;

          if (!result.error?.retryable || attempt === retries) {
            break;
          }
        }
      } catch (error) {
        this.logger.error(`Unexpected error with SMS provider ${providerName} on attempt ${attempt + 1}`, { error });
        lastError = {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: `Unexpected error with SMS provider ${providerName}: ${(error as Error).message}`,
            provider: providerName,
            retryable: true
          },
          provider: providerName,
          timestamp: new Date()
        };

        if (attempt === retries) {
          break;
        }
      }

      // Delay before retry
      if (attempt < retries) {
        await this.delay(this.retryDelay * (attempt + 1)); // Exponential backoff
      }
    }

    this.logger.error(`All retry attempts failed for SMS provider ${providerName}`, { lastError });
    return lastError || {
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: `Max retries (${retries}) exceeded for SMS provider ${providerName}`,
        provider: providerName,
        retryable: false
      },
      provider: providerName,
      timestamp: new Date()
    };
  }

  /**
   * Send bulk SMS with provider load balancing
   */
  async sendBulkSms(
    smsList: SmsData[],
    maxConcurrency: number = 10
  ): Promise<SmsResult[]> {
    if (smsList.length === 0) {
      return [];
    }

    if (smsList.length > 1000) {
      throw new Error('Bulk SMS limited to 1000 messages per call');
    }

    const results: SmsResult[] = [];

    // Process messages in batches
    for (let i = 0; i < smsList.length; i += maxConcurrency) {
      const batch = smsList.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (smsData, index) => {
        try {
          // Add delay for rate limiting
          if (index > 0) {
            await this.delay(100);
          }

          return await this.sendSms(smsData);
        } catch (error) {
          this.logger.error(`Bulk SMS error at index ${index}`, { error, smsData });
          return {
            success: false,
            error: {
              code: 'BULK_ERROR',
              message: `Bulk SMS processing error: ${(error as Error).message}`,
              provider: 'system',
              retryable: true
            },
            provider: 'system',
            timestamp: new Date()
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: {
              code: 'BATCH_ERROR',
              message: `Batch SMS processing error: ${(result.reason as Error).message}`,
              provider: 'system',
              retryable: true
            },
            provider: 'system',
            timestamp: new Date()
          });
        }
      }

      // Delay between batches to avoid overwhelming providers
      if (i + maxConcurrency < smsList.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Check health of all providers
   */
  async checkAllProvidersHealth(): Promise<Map<string, boolean>> {
    const healthResults = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      try {
        const isHealthy = await provider.healthCheck();
        healthResults.set(name, isHealthy);
      } catch (error) {
        this.logger.error(`Health check failed for SMS provider ${name}`, { error });
        healthResults.set(name, false);
      }
    }

    return healthResults;
  }

  /**
   * Get health status of all providers
   */
  getAllProvidersHealth(): Array<{ name: string; healthy: boolean; lastCheck: Date; type: string }> {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.name,
      healthy: provider.getHealthInfo().status,
      lastCheck: provider.getHealthInfo().lastCheck,
      type: provider.type
    }));
  }

  /**
   * Create provider instances from configuration
   */
  static async createProvidersFromConfig(providersConfig: SmsProviderConfig[]): Promise<SmsProvider[]> {
    const providers: SmsProvider[] = [];
    const logger = Logger.getInstance();

    for (const config of providersConfig) {
      try {
        let provider: SmsProvider;

        switch (config.type || 'twilio') {
          case 'twilio':
            if (!config.accountSid || !config.authToken || !config.fromNumber) {
              logger.warn('Twilio provider configuration incomplete, skipping');
              continue;
            }
            provider = new TwilioSmsProvider(
              config.name || `twilio-${Date.now()}`,
              config,
              config.priority || 1,
              config.rateLimit
            );
            break;

          case 'nexmo':
            if (!config.apiKey || !config.apiSecret || !config.fromNumber) {
              logger.warn('Nexmo provider configuration incomplete, skipping');
              continue;
            }
            provider = new NexmoSmsProvider(
              config.name || `nexmo-${Date.now()}`,
              config,
              config.priority || 1,
              config.rateLimit
            );
            break;

          case 'aws-sns':
            // AWS SNS provider would be implemented here
            logger.warn('AWS SNS provider not implemented yet');
            continue;

          default:
            logger.warn(`Unsupported SMS provider type: ${config.type}`);
            continue;
        }

        // Test provider health before adding
        const isHealthy = await provider.healthCheck();
        if (isHealthy) {
          providers.push(provider);
          logger.info(`SMS provider ${provider.name} created and health check passed`);
        } else {
          logger.warn(`SMS provider ${provider.name} failed health check, not adding to active providers`);
        }

      } catch (error) {
        logger.error(`Failed to create SMS provider from config`, { error: (error as Error).message, config: { ...config, apiKey: '[REDACTED]', apiSecret: '[REDACTED]', authToken: '[REDACTED]' } });
      }
    }

    return providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get provider statistics
   */
  async getProviderStats(): Promise<Map<string, any>> {
    const stats = new Map<string, any>();

    for (const [name, provider] of this.providers) {
      try {
        let providerStats = null;

        // Get provider-specific stats if available
        if (provider instanceof TwilioSmsProvider) {
          providerStats = await provider.getAccountInfo();
        } else if (provider instanceof NexmoSmsProvider) {
          providerStats = await provider.getAccountBalance();
        }

        stats.set(name, {
          type: provider.type,
          priority: provider.priority,
          healthy: provider.getHealthInfo().status,
          stats: providerStats
        });

      } catch (error) {
        this.logger.error(`Failed to get stats for SMS provider ${name}`, { error: (error as Error).message });
        stats.set(name, {
          type: provider.type,
          priority: provider.priority,
          healthy: provider.getHealthInfo().status,
          error: (error as Error).message
        });
      }
    }

    return stats;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
