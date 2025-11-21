import { Twilio } from 'twilio';
import { BaseSmsProvider } from './BaseSmsProvider';
import { SmsData, SmsResult, SmsProviderConfig, SmsStatus } from '@/types';

export class TwilioSmsProvider extends BaseSmsProvider {
  private twilioClient: Twilio;
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(
    name: string,
    config: SmsProviderConfig,
    priority: number = 1,
    rateLimit?: { maxRequests: number; windowMs: number }
  ) {
    super(name, 'twilio', config, priority, rateLimit);

    if (!config.accountSid || !config.authToken) {
      throw new Error('Twilio Account SID and Auth Token are required');
    }

    if (!config.fromNumber) {
      throw new Error('Twilio From Number is required');
    }

    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;

    this.twilioClient = new Twilio(this.accountSid, this.authToken);
  }

  async sendSms(smsData: SmsData): Promise<SmsResult> {
    try {
      this.validateSmsData(smsData);

      const formattedTo = this.formatPhoneNumber(smsData.to);
      const formattedFrom = this.formatPhoneNumber(smsData.from || this.fromNumber);

      // Truncate message if necessary to fit SMS limits
      const maxLength = smsData.maxLength || 160;
      const messageBody = this.truncateMessage(smsData.body, maxLength);

      // Prepare Twilio message parameters
      const messageParams: { // Explicitly define type
        body: string;
        from: string;
        to: string;
        statusCallback: string;
        [key: string]: any; // Allow for dynamic properties like `client-ref`
      } = {
        body: messageBody,
        from: formattedFrom,
        to: formattedTo,
        statusCallback: process.env.TWILIO_STATUS_WEBHOOK_URL || `${process.env.BASE_URL}/sms/webhooks/status`,
      };

      // Add metadata if provided
      if (smsData.metadata) {
        messageParams.statusCallback = `${messageParams.statusCallback}?metadata=${encodeURIComponent(JSON.stringify(smsData.metadata))}`;
      }

      // Add priority handling (Twilio doesn't have priority, but we can use it for logging)
      if (smsData.priority === 'critical') {
        this.logger.info(`Sending critical SMS via Twilio: ${formattedTo}`);
      }

      // Send the message
      const message = await this.twilioClient.messages.create(messageParams);

      this.logger.info(`SMS sent successfully via Twilio: ${message.sid}`, {
        to: formattedTo,
        from: formattedFrom,
        segments: this.estimateMessageSegments(messageBody),
        cost: this.calculateCost(messageBody, 'twilio'),
      });

      return this.createSuccessResult(message.sid, {
        segments: this.estimateMessageSegments(messageBody),
        cost: this.calculateCost(messageBody, 'twilio'),
        status: message.status,
        direction: message.direction,
      });

    } catch (error: any) {
      this.logger.error(`Failed to send SMS via Twilio: ${error.message}`, { error, smsData });

      // Determine if error is retryable
      const retryable = this.isRetryableError(error);

      return this.createErrorResult(
        this.createError(
          error.code || 'TWILIO_SEND_ERROR',
          error.message || 'Unknown Twilio error',
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
      // Check Twilio account balance and connectivity
      const account = await this.twilioClient.api.accounts(this.accountSid).fetch();

      // Basic health check - ensure we can make API calls and account is active
      if (account.status !== 'active') {
        this.logger.warn('Twilio account is not active', { status: account.status });
        return false;
      }

      // Check if we have sufficient balance (if applicable)
      // Note: Twilio doesn't expose balance directly, but we can check recent usage

      return true;

    } catch (error) {
      this.logger.error('Twilio health check failed', { error });
      return false;
    }
  }

  private isRetryableError(error: any): boolean {
    // Twilio retryable errors include:
    // - Rate limiting (429)
    // - Server errors (5xx)
    // - Network timeouts
    // - Temporary service unavailable

    if (error.status === 429) return true; // Rate limited
    if (error.status >= 500) return true; // Server errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true; // Network issues

    // Specific Twilio error codes that are retryable
    const retryableCodes = [
      '30001', // Queue overflow
      '30002', // Account suspended
      '30003', // Phone number blacklisted
      '30004', // Invalid phone number
      '30005', // Message blocked
      '30006', // Message too long
      '30007', // Invalid from number
      '30008', // Invalid to number
      '30009', // Invalid message body
      '30010', // Invalid callback URL
      '30011', // Invalid status callback URL
      '30012', // Invalid message ID
      '30013', // Invalid callback method
      '30014', // Invalid callback URL method
      '30015', // Invalid callback URL host
      '30016', // Invalid callback URL scheme
      '30017', // Invalid callback URL path
      '30018', // Invalid callback URL query
      '30019', // Invalid callback URL fragment
      '30020', // Invalid callback URL port
      '30021', // Invalid callback URL user
      '30022', // Invalid callback URL password
      '30023', // Invalid callback URL timeout
      '30024', // Invalid callback URL redirect
      '30025', // Invalid callback URL redirect limit
      '30026', // Invalid callback URL redirect loop
      '30027', // Invalid callback URL redirect location
      '30028', // Invalid callback URL redirect status
      '30029', // Invalid callback URL redirect header
      '30030', // Invalid callback URL redirect header value
      '30031', // Invalid callback URL redirect header name
      '30032', // Invalid callback URL redirect header value length
      '30033', // Invalid callback URL redirect header name length
      '30034', // Invalid callback URL redirect header value encoding
      '30035', // Invalid callback URL redirect header name encoding
      '30036', // Invalid callback URL redirect header value charset
      '30037', // Invalid callback URL redirect header name charset
      '30038', // Invalid callback URL redirect header value language
      '30039', // Invalid callback URL redirect header name language
      '30040', // Invalid callback URL redirect header value country
      '30041', // Invalid callback URL redirect header name country
      '30042', // Invalid callback URL redirect header value region
      '30043', // Invalid callback URL redirect header name region
      '30044', // Invalid callback URL redirect header value city
      '30045', // Invalid callback URL redirect header name city
      '30046', // Invalid callback URL redirect header value postal
      '30047', // Invalid callback URL redirect header name postal
      '30048', // Invalid callback URL redirect header value metro
      '30049', // Invalid callback URL redirect header name metro
      '30050', // Invalid callback URL redirect header value area
      '30051', // Invalid callback URL redirect header name area
      '30052', // Invalid callback URL redirect header value timezone
      '30053', // Invalid callback URL redirect header name timezone
      '30054', // Invalid callback URL redirect header value currency
      '30055', // Invalid callback URL redirect header name currency
      '30056', // Invalid callback URL redirect header value language code
      '30057', // Invalid callback URL redirect header name language code
      '30058', // Invalid callback URL redirect header value country code
      '30059', // Invalid callback URL redirect header name country code
      '30060', // Invalid callback URL redirect header value region code
      '30061', // Invalid callback URL redirect header name region code
      '30062', // Invalid callback URL redirect header value city code
      '30063', // Invalid callback URL redirect header name city code
      '30064', // Invalid callback URL redirect header value postal code
      '30065', // Invalid callback URL redirect header name postal code
      '30066', // Invalid callback URL redirect header value metro code
      '30067', // Invalid callback URL redirect header name metro code
      '30068', // Invalid callback URL redirect header value area code
      '30069', // Invalid callback URL redirect header name area code
      '30070', // Invalid callback URL redirect header value timezone code
      '30071', // Invalid callback URL redirect header name timezone code
      '30072', // Invalid callback URL redirect header value currency code
      '30073', // Invalid callback URL redirect header name currency code
    ];

    return retryableCodes.includes(error.code) || error.retryable === true;
  }

  public async getAccountInfo(): Promise<any> {
    try {
      const account = await this.twilioClient.api.accounts(this.accountSid).fetch();
      return {
        accountSid: account.sid,
        status: account.status,
        friendlyName: account.friendlyName,
        type: account.type,
        created: account.dateCreated,
        updated: account.dateUpdated,
      };
    } catch (error) {
      this.logger.error('Failed to get Twilio account info', { error });
      return null;
    }
  }

  public async getMessageStatus(messageId: string): Promise<SmsStatus | null> {
    try {
      const message = await this.twilioClient.messages(messageId).fetch();

      return {
        id: message.sid,
        messageId: message.sid,
        status: this.mapTwilioStatus(message.status),
        timestamp: new Date(message.dateUpdated || message.dateCreated),
        provider: this.name,
      };

    } catch (error: unknown) {
      this.logger.error('Failed to get Twilio message status', { error, messageId });
      return null;
    }
  }

  private mapTwilioStatus(twilioStatus: string): SmsStatus['status'] {
    switch (twilioStatus) {
      case 'queued':
        return 'queued';
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'failed':
        return 'failed';
      case 'undelivered':
        return 'undelivered';
      default:
        return 'sent';
    }
  }

  public async getUsageRecords(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const usage = await this.twilioClient.usage.records.list({
        category: 'sms',
        startDate: startDate,
        endDate: endDate,
      });

      return usage.map(record => ({
        category: record.category,
        description: record.description,
        count: record.count,
        countUnit: record.countUnit,
        price: record.price,
        priceUnit: record.priceUnit,
        usage: record.usage,
        usageUnit: record.usageUnit,
        startDate: record.startDate,
        endDate: record.endDate,
      }));

    } catch (error) {
      this.logger.error('Failed to get Twilio usage records', { error, startDate, endDate });
      return [];
    }
  }
}
