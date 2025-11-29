import { SmsFallbackConfig, SmsData, SmsResult } from '@/types';
import { Logger } from '@/utils/Logger';

export interface FallbackAttempt {
  channel: 'push' | 'email';
  success: boolean;
  result?: any;
  error?: string;
  timestamp: Date;
}

export interface FallbackResult {
  primarySms: SmsResult;
  fallbackAttempts: FallbackAttempt[];
  finalSuccess: boolean;
  finalChannel?: 'sms' | 'push' | 'email';
  metadata?: Record<string, any>;
}

export class SmsFallbackService {
  private static instance: SmsFallbackService;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): SmsFallbackService {
    if (!SmsFallbackService.instance) {
      SmsFallbackService.instance = new SmsFallbackService();
    }
    return SmsFallbackService.instance;
  }

  /**
   * Attempt SMS with fallback to alternative channels
   */
  async sendWithFallback(
    smsData: SmsData,
    fallbackConfig: SmsFallbackConfig,
    primarySmsResult: SmsResult
  ): Promise<FallbackResult> {
    const result: FallbackResult = {
      primarySms: primarySmsResult,
      fallbackAttempts: [],
      finalSuccess: primarySmsResult.success,
    };

    // If primary SMS succeeded, no fallback needed
    if (primarySmsResult.success) {
      this.logger.info('Primary SMS succeeded, no fallback needed', {
        messageId: primarySmsResult.messageId,
        provider: primarySmsResult.provider,
      });
      return result;
    }

    // Check if fallback is enabled and conditions are met
    if (!this.shouldAttemptFallback(primarySmsResult, fallbackConfig)) {
      this.logger.info('Fallback conditions not met', {
        smsError: primarySmsResult.error,
        fallbackConfig,
      });
      return result;
    }

    this.logger.info('Attempting fallback for failed SMS', {
      smsError: primarySmsResult.error,
      fallbackChannels: fallbackConfig.channels,
    });

    // Attempt fallback channels in order
    for (const channel of fallbackConfig.channels) {
      const attempt = await this.attemptChannelFallback(channel, smsData, primarySmsResult);

      result.fallbackAttempts.push(attempt);

      if (attempt.success) {
        result.finalSuccess = true;
        result.finalChannel = channel;

        this.logger.info('Fallback succeeded', {
          channel,
          smsData,
        });

        break; // Stop at first successful fallback
      } else {
        this.logger.warn('Fallback attempt failed', {
          channel,
          error: attempt.error,
        });
      }
    }

    // If all fallbacks failed, mark as final failure
    if (!result.finalSuccess) {
      this.logger.error('All fallback attempts failed', {
        smsError: primarySmsResult.error,
        fallbackAttempts: result.fallbackAttempts,
      });
    }

    return result;
  }

  /**
   * Attempt push notification fallback
   */
  private async attemptChannelFallback(
    channel: 'push' | 'email',
    smsData: SmsData,
    primarySmsResult: SmsResult
  ): Promise<FallbackAttempt> {
    const attempt: FallbackAttempt = {
      channel,
      success: false,
      timestamp: new Date(),
    };

    try {
      switch (channel) {
        case 'push':
          attempt.result = await this.sendPushNotification(smsData, primarySmsResult);
          attempt.success = true;
          break;

        case 'email':
          attempt.result = await this.sendEmailFallback(smsData, primarySmsResult);
          attempt.success = true;
          break;
      }
    } catch (error) {
      attempt.error = (error as Error).message || 'Unknown fallback error';
      this.logger.error(`Fallback ${channel} attempt failed`, {
        error,
        smsData,
        primarySmsResult,
      });
    }

    return attempt;
  }

  /**
   * Send push notification as fallback
   */
  private async sendPushNotification(
    smsData: SmsData,
    primarySmsResult: SmsResult
  ): Promise<any> {
    // This would integrate with a push notification service
    // For now, we'll simulate a push notification send

    this.logger.info('Sending push notification fallback', {
      to: smsData.to,
      message: smsData.body,
      smsError: primarySmsResult.error,
    });

    // Simulate push notification API call
    await this.delay(100); // Simulate network delay

    return {
      pushId: `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deviceToken: smsData.to, // In real implementation, map phone to device token
      status: 'sent',
      timestamp: new Date(),
    };
  }

  /**
   * Send email as fallback
   */
  private async sendEmailFallback(
    smsData: SmsData,
    primarySmsResult: SmsResult
  ): Promise<any> {
    // This would integrate with the email service
    // For now, we'll simulate an email send

    this.logger.info('Sending email fallback', {
      to: smsData.to,
      message: smsData.body,
      smsError: primarySmsResult.error,
    });

    // Simulate email API call
    await this.delay(200); // Simulate network delay

    return {
      emailId: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recipient: smsData.to,
      subject: 'Important Message (SMS Fallback)',
      status: 'sent',
      timestamp: new Date(),
    };
  }

  /**
   * Determine if fallback should be attempted
   */
  private shouldAttemptFallback(
    smsResult: SmsResult,
    fallbackConfig: SmsFallbackConfig
  ): boolean {
    // Check if fallback is enabled
    if (!fallbackConfig.enabled) {
      return false;
    }

    // Check if error is in the list of retryable errors
    if (fallbackConfig.conditions.errorCodes && fallbackConfig.conditions.errorCodes.length > 0) {
      const errorCode = smsResult.error?.code;
      if (errorCode && fallbackConfig.conditions.errorCodes.includes(errorCode)) {
        return true;
      }
    }

    // Check if max retries exceeded (if specified)
    if (fallbackConfig.conditions.maxRetries !== undefined) {
      // This would need to be tracked per message
      // For now, assume it's okay to retry
    }

    // Check timeout
    if (fallbackConfig.conditions.timeoutMs) {
      const smsAge = Date.now() - smsResult.timestamp.getTime();
      if (smsAge > fallbackConfig.conditions.timeoutMs) {
        return false;
      }
    }

    // Default to allowing fallback for retryable errors
    return smsResult.error?.retryable === true;
  }

  /**
   * Create fallback configuration for different scenarios
   */
  createFallbackConfig(
    channels: ('push' | 'email')[] = ['push', 'email'],
    options: {
      maxRetries?: number;
      timeoutMs?: number;
      errorCodes?: string[];
    } = {}
  ): SmsFallbackConfig {
    return {
      enabled: true,
      channels,
      conditions: {
        maxRetries: options.maxRetries || 2,
        timeoutMs: options.timeoutMs || 300000, // 5 minutes
        errorCodes: options.errorCodes || [
          'INVALID_PHONE_NUMBER',
          'CARRIER_BLOCKED',
          'MESSAGE_BLOCKED',
          'RATE_LIMITED',
        ],
      },
    };
  }

  /**
   * Get recommended fallback configuration for different SMS types
   */
  getRecommendedFallbackConfig(type: 'transactional' | 'promotional' | 'critical'): SmsFallbackConfig {
    switch (type) {
      case 'critical':
        return this.createFallbackConfig(['email'], {
          timeoutMs: 60000, // 1 minute - quick fallback for critical messages
          errorCodes: ['INVALID_PHONE_NUMBER', 'CARRIER_ERROR'],
        });

      case 'transactional':
        return this.createFallbackConfig(['email'], {
          timeoutMs: 300000, // 5 minutes
          errorCodes: ['INVALID_PHONE_NUMBER', 'CARRIER_BLOCKED'],
        });

      case 'promotional':
        return this.createFallbackConfig(['email'], {
          timeoutMs: 1800000, // 30 minutes - promotional can wait longer
          errorCodes: ['INVALID_PHONE_NUMBER'],
        });

      default:
        return this.createFallbackConfig(['email']);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
