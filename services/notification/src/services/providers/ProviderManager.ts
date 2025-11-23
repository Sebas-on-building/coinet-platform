import { EmailProvider, EmailData, EmailResult, EmailProviderConfig } from '@/types';
import { BaseProvider } from './BaseProvider';
import { AwsSesProvider } from './AwsSesProvider';
import { SendGridProvider } from './SendGridProvider';
import { Logger } from '@/utils/Logger';

export class ProviderManager {
  private static instance: ProviderManager;
  private providers: Map<string, EmailProvider> = new Map();
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
  ): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager(fallbackEnabled, maxRetries, retryDelay);
    }
    return ProviderManager.instance;
  }

  /**
   * Add a provider to the manager
   */
  addProvider(provider: EmailProvider): void {
    this.providers.set(provider.name, provider);
    this.logger.info(`Added email provider: ${provider.name} (type: ${provider.type}, priority: ${provider.priority})`);
  }

  /**
   * Remove a provider from the manager
   */
  removeProvider(providerName: string): void {
    const removed = this.providers.delete(providerName);
    if (removed) {
      this.logger.info(`Removed email provider: ${providerName}`);
    } else {
      this.logger.warn(`Provider not found for removal: ${providerName}`);
    }
  }

  /**
   * Get all providers sorted by priority (lower number = higher priority)
   */
  getProviders(): EmailProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): EmailProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Send email with automatic provider selection and fallback
   */
  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    const providers = this.getProviders();
    let lastError: EmailResult | null = null;

    for (const provider of providers) {
      try {
        this.logger.info(`Attempting to send email via provider: ${provider.name}`);

        const result = await provider.sendEmail(emailData);

        if (result.success) {
          this.logger.info(`Email sent successfully via provider: ${provider.name}`);
          return result;
        } else {
          lastError = result;
          this.logger.warn(`Email send failed via provider ${provider.name}: ${result.error?.message}`);

          // If fallback is disabled or error is not retryable, don't try other providers
          if (!this.fallbackEnabled || !result.error?.retryable) {
            break;
          }
        }
      } catch (error) {
        this.logger.error(`Unexpected error with provider ${provider.name}`, { error });
        lastError = {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: `Unexpected error with provider ${provider.name}: ${error}`,
            provider: provider.name,
            retryable: true
          },
          provider: provider.name,
          metadata: undefined,
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
      this.logger.error('All email providers failed', { lastError, emailData });
      return lastError;
    } else {
      // This shouldn't happen, but handle gracefully
      const fallbackError: EmailResult = {
        success: false,
        error: {
          code: 'NO_PROVIDERS',
          message: 'No email providers available',
          provider: 'system',
          retryable: false
        },
        provider: 'system',
        metadata: undefined,
        timestamp: new Date()
      };

      this.logger.error('No email providers configured');
      return fallbackError;
    }
  }

  /**
   * Send email with retry logic for a specific provider
   */
  async sendEmailWithRetry(
    providerName: string,
    emailData: EmailData,
    maxRetries?: number
  ): Promise<EmailResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_NOT_FOUND',
          message: `Provider ${providerName} not found`,
          provider: 'system',
          retryable: false
        },
        provider: 'system',
        metadata: undefined,
        timestamp: new Date()
      };
    }

    const retries = maxRetries || this.maxRetries;
    let lastError: EmailResult | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.logger.info(`Attempt ${attempt + 1}/${retries + 1} to send email via ${providerName}`);

        const result = await provider.sendEmail(emailData);

        if (result.success) {
          this.logger.info(`Email sent successfully via ${providerName} on attempt ${attempt + 1}`);
          return result;
        } else {
          lastError = result;

          if (!result.error?.retryable || attempt === retries) {
            break;
          }
        }
      } catch (error) {
        this.logger.error(`Unexpected error with provider ${providerName} on attempt ${attempt + 1}`, { error });
        lastError = {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: `Unexpected error with provider ${providerName}: ${error}`,
            provider: providerName,
            retryable: true
          },
          provider: providerName,
          metadata: undefined,
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

    this.logger.error(`All retry attempts failed for provider ${providerName}`, { lastError });
    return lastError || {
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: `Max retries (${retries}) exceeded for provider ${providerName}`,
        provider: providerName,
        retryable: false
      },
      provider: providerName,
      metadata: undefined,
      timestamp: new Date()
    };
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
        this.logger.error(`Health check failed for provider ${name}`, { error });
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
  static async createProvidersFromConfig(providersConfig: EmailProviderConfig[]): Promise<EmailProvider[]> {
    const providers: EmailProvider[] = [];
    const logger = Logger.getInstance();

    for (const config of providersConfig) {
      try {
        let provider: EmailProvider;

        switch (config.type || 'ses') {
          case 'ses':
            provider = new AwsSesProvider(
              config.name || `ses-${Date.now()}`,
              config,
              config.priority || 1,
              config.rateLimit
            );
            break;

          case 'sendgrid':
            provider = new SendGridProvider(
              config.name || `sendgrid-${Date.now()}`,
              config,
              config.priority || 1,
              config.rateLimit
            );
            break;

          default:
            logger.warn(`Unsupported provider type: ${config.type}`);
            continue;
        }

        // Test provider health before adding
        const isHealthy = await provider.healthCheck();
        if (isHealthy) {
          providers.push(provider);
          logger.info(`Provider ${provider.name} created and health check passed`);
        } else {
          logger.warn(`Provider ${provider.name} failed health check, not adding to active providers`);
        }

      } catch (error) {
        logger.error(`Failed to create provider from config`, { error: (error as Error).message, config: { ...config, apiKey: '[REDACTED]' } });
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
        if (provider instanceof AwsSesProvider) {
          providerStats = await provider.getSendingStats();
        } else if (provider instanceof SendGridProvider) {
          providerStats = await provider.getAccountStats();
        }

        stats.set(name, {
          type: provider.type,
          priority: provider.priority,
          healthy: provider.getHealthInfo().status,
          stats: providerStats
        });

      } catch (error) {
        this.logger.error(`Failed to get stats for provider ${name}`, { error });
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

