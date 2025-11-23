import { EmailProvider, EmailData, EmailResult, EmailError, EmailProviderConfig } from '@/types';
import { Logger } from '@/utils/Logger';

export abstract class BaseProvider implements EmailProvider {
  public readonly name: string;
  public readonly type: 'ses' | 'sendgrid' | 'smtp' | 'mailgun';
  public readonly config: EmailProviderConfig;
  public readonly priority: number;
  public readonly rateLimit: { maxRequests: number; windowMs: number } | undefined;

  protected logger: Logger;
  protected healthStatus: boolean = true;
  protected lastHealthCheck: Date = new Date();

  constructor(
    name: string,
    type: 'ses' | 'sendgrid' | 'smtp' | 'mailgun',
    config: EmailProviderConfig,
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

  abstract sendEmail(emailData: EmailData): Promise<EmailResult>;

  async healthCheck(): Promise<boolean> {
    try {
      // Basic health check - can be overridden by specific providers
      this.healthStatus = await this.performHealthCheck();
      this.lastHealthCheck = new Date();

      if (!this.healthStatus) {
        this.logger.warn(`Health check failed for provider ${this.name}`);
      }

      return this.healthStatus;
    } catch (error) {
      this.logger.error(`Health check error for provider ${this.name}`, { error });
      this.healthStatus = false;
      return false;
    }
  }

  protected abstract performHealthCheck(): Promise<boolean>;

  protected createError(code: string, message: string, retryable: boolean = false): EmailError {
    return {
      code,
      message,
      provider: this.name,
      retryable
    };
  }

  protected createSuccessResult(messageId: string, metadata?: Record<string, any>): EmailResult {
    return {
      success: true,
      messageId,
      provider: this.name,
      metadata,
      timestamp: new Date()
    };
  }

  protected createErrorResult(error: EmailError): EmailResult {
    return {
      success: false,
      error,
      provider: this.name,
      metadata: undefined,
      timestamp: new Date()
    };
  }

  protected validateEmailData(emailData: EmailData): void {
    if (!emailData.to || emailData.to.length === 0) {
      throw this.createError('INVALID_RECIPIENTS', 'No recipients specified', false);
    }

    if (!emailData.from) {
      throw this.createError('INVALID_SENDER', 'No sender specified', false);
    }

    if (!emailData.subject) {
      throw this.createError('INVALID_SUBJECT', 'No subject specified', false);
    }

    if (!emailData.html && !emailData.text) {
      throw this.createError('INVALID_CONTENT', 'No email content provided', false);
    }

    // Validate recipient count limits
    const maxRecipients = 50; // AWS SES limit, can be configured
    if (emailData.to.length > maxRecipients) {
      throw this.createError('TOO_MANY_RECIPIENTS', `Too many recipients. Max: ${maxRecipients}`, false);
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emailData.to) {
      if (!emailRegex.test(email)) {
        throw this.createError('INVALID_EMAIL_FORMAT', `Invalid email format: ${email}`, false);
      }
    }
  }

  protected sanitizeEmailAddresses(emails: string[]): string[] {
    return emails.map(email => email.trim().toLowerCase());
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
}

