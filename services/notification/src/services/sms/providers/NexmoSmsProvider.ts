import axios, { AxiosInstance } from 'axios';
import { BaseSmsProvider } from './BaseSmsProvider';
import { SmsData, SmsResult, SmsProviderConfig, SmsStatus } from '@/types';
import { SmsStatusTracker } from '@/services/sms/SmsStatusTracker';

export class NexmoSmsProvider extends BaseSmsProvider {
  private apiKey: string;
  private apiSecret: string;
  private fromNumber: string;
  private axiosInstance: AxiosInstance;
  private smsStatusTracker: SmsStatusTracker;

  constructor(
    name: string,
    config: SmsProviderConfig,
    priority: number = 1,
    rateLimit?: { maxRequests: number; windowMs: number }
  ) {
    super(name, 'nexmo', config, priority, rateLimit);

    if (!config.apiKey || !config.apiSecret) {
      throw new Error('Nexmo API Key and API Secret are required');
    }

    if (!config.fromNumber) {
      throw new Error('Nexmo From Number is required');
    }

    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.fromNumber = config.fromNumber;

    // Create axios instance for Nexmo API
    this.axiosInstance = axios.create({
      baseURL: 'https://rest.nexmo.com',
      auth: {
        username: this.apiKey,
        password: this.apiSecret,
      },
      timeout: 30000, // 30 seconds
    });
    this.smsStatusTracker = SmsStatusTracker.getInstance(); // Initialize SmsStatusTracker
  }

  async sendSms(smsData: SmsData): Promise<SmsResult> {
    try {
      this.validateSmsData(smsData);

      const formattedTo = this.formatPhoneNumber(smsData.to);
      const formattedFrom = this.formatPhoneNumber(smsData.from || this.fromNumber);

      // Truncate message if necessary to fit SMS limits
      const maxLength = smsData.maxLength || 160;
      const messageBody = this.truncateMessage(smsData.body, maxLength);

      // Prepare Nexmo message parameters
      const messageParams: {
        from: string;
        to: string;
        text: string;
        type: string;
        callback: string;
        'client-ref'?: string; // Explicitly allow 'client-ref'
      } = {
        from: formattedFrom,
        to: formattedTo,
        text: messageBody,
        type: 'text',
        // Nexmo supports delivery receipts via webhook
        callback: process.env.NEXMO_STATUS_WEBHOOK_URL || `${process.env.BASE_URL}/sms/webhooks/status`,
      };

      // Add client reference for tracking
      if (smsData.campaignId) {
        messageParams['client-ref'] = smsData.campaignId;
      }

      // Add priority handling (Nexmo doesn't have priority, but we can use it for logging)
      if (smsData.priority === 'critical') {
        this.logger.info(`Sending critical SMS via Nexmo: ${formattedTo}`);
      }

      // Send the message
      const response = await this.axiosInstance.post('/sms/json', messageParams);

      if (response.data.messages && response.data.messages.length > 0) {
        const message = response.data.messages[0];

        if (message.status === '0') {
          // Success
          this.logger.info(`SMS sent successfully via Nexmo: ${message.messageId}`, {
            to: formattedTo,
            from: formattedFrom,
            segments: this.estimateMessageSegments(messageBody),
            cost: this.calculateCost(messageBody, 'nexmo'),
          });

          return this.createSuccessResult(message.messageId, {
            segments: this.estimateMessageSegments(messageBody),
            cost: this.calculateCost(messageBody, 'nexmo'),
            status: this.mapNexmoStatus(message.status),
            networkCode: message.networkCode,
          });

        } else {
          // Error
          throw new Error(`Nexmo API error: ${message.errorText} (Code: ${message.status})`);
        }
      } else {
        throw new Error('Invalid response from Nexmo API');
      }

    } catch (error: any) {
      this.logger.error(`Failed to send SMS via Nexmo: ${error.message}`, { error, smsData });

      // Determine if error is retryable
      const retryable = this.isRetryableError(error);

      return this.createErrorResult(
        this.createError(
          error.code || 'NEXMO_SEND_ERROR',
          error.message || 'Unknown Nexmo error',
          retryable
        )
      );
    }
  }

  async sendBulkSms(
    smsList: SmsData[],
    maxConcurrency: number = 10
  ): Promise<SmsResult[]> {
    if (smsList.length === 0) {
      throw this.createError('NO_MESSAGES', 'No SMS messages provided for bulk send', false);
    }

    if (smsList.length > 1000) {
      throw this.createError('BULK_TOO_LARGE', 'Bulk SMS limited to 1000 messages per call', false);
    }

    const results: SmsResult[] = [];

    // Nexmo doesn't have a native bulk API, so we'll send messages individually
    // Process messages in batches to respect rate limits
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
          return this.createErrorResult(
            this.createError(
              'BULK_SEND_ERROR',
              `Bulk SMS processing error: ${error}`,
              true
            )
          );
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push(this.createErrorResult(
            this.createError(
              'BATCH_ERROR',
              `Batch SMS processing error: ${result.reason.message}`,
              true
            )
          ));
        }
      }

      // Delay between batches to avoid overwhelming the provider
      if (i + maxConcurrency < smsList.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // Check Nexmo account balance and connectivity
      const response = await this.axiosInstance.get('/account/get-balance');

      // Basic health check - ensure we can make API calls and have balance
      if (response.data && response.data.value !== undefined) {
        const balance = parseFloat(response.data.value);

        // Warn if balance is low (less than $1)
        if (balance < 1.0) {
          this.logger.warn('Nexmo balance is low', { balance });
        }

        return true;
      }

      return false;

    } catch (error) {
      this.logger.error('Nexmo health check failed', { error });
      return false;
    }
  }

  private isRetryableError(error: any): boolean {
    // Nexmo retryable errors include:
    // - Rate limiting (429)
    // - Server errors (5xx)
    // - Network timeouts
    // - Temporary service unavailable

    if (error.response?.status === 429) return true; // Rate limited
    if (error.response?.status >= 500) return true; // Server errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true; // Network issues

    // Specific Nexmo error codes that are retryable
    const retryableCodes = [
      '1',   // Throttled
      '2',   // Missing parameters
      '3',   // Invalid parameters
      '4',   // Invalid credentials
      '5',   // Internal error
      '6',   // Invalid message
      '7',   // Number barred
      '8',   // Partner account barred
      '9',   // Partner quota exceeded
      '11',  // Account not enabled for REST
      '12',  // Message too long
      '13',  // Communication failed
      '14',  // Invalid signature
      '15',  // Illegal sender address
      '16',  // Unreachable
      '19',  // Facility not allowed
      '20',  // Bad extension
    ];

    const errorCode = error.response?.data?.['error-code'];
    return errorCode && retryableCodes.includes(errorCode);
  }

  private mapNexmoStatus(nexmoStatus: string): SmsStatus['status'] | undefined {
    switch (nexmoStatus) {
      case '0':
        return 'sent';
      case '1':
      case '2':
      case '3':
        return 'sent';
      case '4':
        return 'delivered';
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '10':
      case '11':
      case '12':
      case '13':
      case '14':
      case '15':
      case '16':
        return 'failed';
      default:
        return undefined;
    }
  }

  // This method is used by the SmsStatusTracker to handle incoming webhooks
  public async handleNexmoWebhook(webhookData: Record<string, any>): Promise<void> {
    const messageId = webhookData.messageId;
    // Ensure the status mapping is correct and handles undefined gracefully
    const status = this.mapNexmoStatus(webhookData.status) as SmsStatus['status'] | undefined;

    if (messageId && status) {
      await this.smsStatusTracker.recordStatusUpdate(
        messageId,
        'nexmo',
        status,
        new Date(),
        webhookData.err_code?.toString() || undefined,
        webhookData.error_text || undefined,
        webhookData
      );
    }
  }

  public async getAccountBalance(): Promise<number | null> {
    try {
      const response = await this.axiosInstance.get('/account/get-balance');

      if (response.data && response.data.value !== undefined) {
        return parseFloat(response.data.value);
      }

      return null;

    } catch (error: unknown) {
      this.logger.error('Failed to get Nexmo account balance', { error });
      return null;
    }
  }

  public async getAccountInfo(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/account/get-balance');

      return {
        apiKey: this.apiKey,
        balance: response.data?.value ? parseFloat(response.data.value) : 0,
        autoReload: response.data?.autoReload || false,
      };

    } catch (error: unknown) {
      this.logger.error('Failed to get Nexmo account info', { error });
      return null;
    }
  }

  public async getMessageStatus(messageId: string): Promise<SmsStatus | null> {
    try {
      // Nexmo doesn't provide a direct way to query message status
      // Status updates come via webhooks only
      this.logger.warn('Nexmo message status query not supported - use webhooks instead', { messageId });
      return null;

    } catch (error: unknown) {
      this.logger.error('Failed to get Nexmo message status', { error, messageId });
      return null;
    }
  }

  public async getUsageRecords(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Nexmo doesn't provide usage records via REST API
      // This would need to be implemented via their reporting API or webhooks
      this.logger.info('Nexmo usage records retrieval not implemented yet');
      return [];

    } catch (error: unknown) {
      this.logger.error('Failed to get Nexmo usage records', { error, startDate, endDate });
      return [];
    }
  }

  public async validateNumber(phoneNumber: string): Promise<boolean> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const response = await this.axiosInstance.post('/sms/json', {
        from: this.fromNumber,
        to: formattedNumber,
        text: 'VALIDATION_TEST',
      });

      // If we get a successful response, the number is valid
      if (response.data.messages && response.data.messages.length > 0) {
        const message = response.data.messages[0];
        return message.status === '0';
      }

      return false;

    } catch (error: unknown) {
      this.logger.error('Failed to validate phone number via Nexmo', { error, phoneNumber });
      return false;
    }
  }
}
