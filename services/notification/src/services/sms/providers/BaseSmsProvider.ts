import { SmsProvider, SmsData, SmsResult, SmsError, SmsProviderConfig } from '@/types';
import { Logger } from '@/utils/Logger';

export abstract class BaseSmsProvider implements SmsProvider {
  public readonly name: string;
  public readonly type: 'twilio' | 'nexmo' | 'aws-sns';
  public readonly config: SmsProviderConfig;
  public readonly priority: number;
  public readonly rateLimit: { maxRequests: number; windowMs: number } | undefined;

  protected logger: Logger;
  protected healthStatus: boolean = true;
  protected lastHealthCheck: Date = new Date();

  constructor(
    name: string,
    type: 'twilio' | 'nexmo' | 'aws-sns',
    config: SmsProviderConfig,
    priority: number = 1,
    rateLimit?: { maxRequests: number; windowMs: number }
  ) {
    this.name = name;
    this.type = type;
    this.config = config;
    this.priority = priority;
    this.rateLimit = rateLimit;
    this.logger = Logger.getInstance();
  }

  abstract sendSms(smsData: SmsData): Promise<SmsResult>;

  async healthCheck(): Promise<boolean> {
    try {
      // Basic health check - can be overridden by specific providers
      this.healthStatus = await this.performHealthCheck();
      this.lastHealthCheck = new Date();

      if (!this.healthStatus) {
        this.logger.warn(`Health check failed for SMS provider ${this.name}`);
      }

      return this.healthStatus;
    } catch (error) {
      this.logger.error(`Health check error for SMS provider ${this.name}`, { error });
      this.healthStatus = false;
      return false;
    }
  }

  protected abstract performHealthCheck(): Promise<boolean>;

  protected createError(code: string, message: string, retryable: boolean = false): SmsError {
    return {
      code,
      message,
      provider: this.name,
      retryable
    };
  }

  protected createSuccessResult(messageId: string, metadata?: Record<string, any>): SmsResult {
    const result: SmsResult = {
      success: true,
      messageId,
      provider: this.name,
      timestamp: new Date()
    };

    if (metadata) {
      result.metadata = metadata;
    }

    return result;
  }

  protected createErrorResult(error: SmsError): SmsResult {
    return {
      success: false,
      error,
      provider: this.name,
      timestamp: new Date()
    };
  }

  protected validateSmsData(smsData: SmsData): void {
    if (!smsData.to) {
      throw this.createError('INVALID_RECIPIENT', 'No recipient specified', false);
    }

    if (!smsData.body || smsData.body.trim().length === 0) {
      throw this.createError('INVALID_BODY', 'No message body provided', false);
    }

    // Validate phone number format (basic international format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(smsData.to)) {
      throw this.createError('INVALID_PHONE_NUMBER', `Invalid phone number format: ${smsData.to}`, false);
    }

    // Validate message length (SMS has 160 char limit for single message)
    const maxLength = smsData.maxLength || 160;
    if (smsData.body.length > maxLength) {
      throw this.createError('MESSAGE_TOO_LONG', `Message exceeds maximum length of ${maxLength} characters`, false);
    }

    // Check for promotional content in transactional context
    if (smsData.priority !== 'critical' && this.containsPromotionalContent(smsData.body)) {
      this.logger.warn(`Promotional content detected in non-critical SMS: ${smsData.to}`);
    }
  }

  protected sanitizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except leading +
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  protected truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }

    // Try to truncate at word boundary
    const truncated = message.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getHealthInfo(): { status: boolean; lastCheck: Date; name: string; type: string } {
    return {
      status: this.healthStatus,
      lastCheck: this.lastHealthCheck,
      name: this.name,
      type: this.type
    };
  }

  private containsPromotionalContent(message: string): boolean {
    const promotionalKeywords = [
      'sale', 'discount', 'offer', 'promo', 'coupon', 'free', 'win', 'prize',
      'congratulations', 'special offer', 'limited time', 'exclusive', 'deal',
      'save', 'off', 'reduced', 'clearance', 'promotion'
    ];

    const lowerMessage = message.toLowerCase();
    return promotionalKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  protected formatPhoneNumber(phoneNumber: string): string {
    // Ensure phone number is in E.164 format
    let formatted = this.sanitizePhoneNumber(phoneNumber);

    // Add country code if missing (assuming US/Canada)
    if (formatted.length === 10 && !formatted.startsWith('+')) {
      formatted = '+1' + formatted;
    } else if (formatted.length === 11 && formatted.startsWith('1')) {
      formatted = '+' + formatted;
    }

    return formatted;
  }

  protected estimateMessageSegments(message: string): number {
    // SMS segmentation: 160 chars for single message, 153 for multi-part
    const singleMessageLength = 160;
    const multiMessageLength = 153;

    if (message.length <= singleMessageLength) {
      return 1;
    }

    return Math.ceil(message.length / multiMessageLength);
  }

  protected calculateCost(message: string, provider: string): number {
    // Basic cost estimation - can be enhanced with actual provider pricing
    const segments = this.estimateMessageSegments(message);

    switch (provider) {
      case 'twilio':
        return segments * 0.0075; // ~$0.0075 per segment
      case 'nexmo':
        return segments * 0.0065; // ~$0.0065 per segment
      case 'aws-sns':
        return segments * 0.0064; // ~$0.0064 per segment
      default:
        return segments * 0.01; // Default estimate
    }
  }
}
