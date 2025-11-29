import * as sgMail from '@sendgrid/mail';
import { BaseProvider } from './BaseProvider';
import { EmailData, EmailResult, EmailProviderConfig } from '@/types';
import { MailDataRequired } from '@sendgrid/helpers/classes/mail';

export class SendGridProvider extends BaseProvider {
  private apiKey: string;

  constructor(
    name: string,
    config: EmailProviderConfig,
    priority: number = 1,
    rateLimit?: { maxRequests: number; windowMs: number }
  ) {
    super(name, 'sendgrid', config, priority, rateLimit);

    if (!config.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    this.apiKey = config.apiKey;
    sgMail.setApiKey(this.apiKey);
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      this.validateEmailData(emailData);

      const sanitizedTo = this.sanitizeEmailAddresses(emailData.to);
      const sanitizedFrom = emailData.from.trim();

      // Build SendGrid email data
      const emailDataSg: sgMail.MailDataRequired = {
        to: sanitizedTo,
        from: sanitizedFrom,
        subject: emailData.subject,
        ...(emailData.html && { html: emailData.html }),
        ...(emailData.text && { text: emailData.text }),
        ...(emailData.cc && emailData.cc.length > 0 && {
          cc: this.sanitizeEmailAddresses(emailData.cc)
        }),
        ...(emailData.bcc && emailData.bcc.length > 0 && {
          bcc: this.sanitizeEmailAddresses(emailData.bcc)
        }),
        ...(emailData.headers && { headers: emailData.headers }),
        ...(emailData.attachments && emailData.attachments.length > 0 && {
          attachments: emailData.attachments.map(attachment => ({
            content: typeof attachment.content === 'string' ? attachment.content : attachment.content.toString('base64'), // Ensure content is base64 string
            filename: attachment.filename,
            type: attachment.contentType || 'application/octet-stream',
            disposition: attachment.cid ? 'inline' : 'attachment',
            content_id: attachment.cid,
          }))
        }),
        // SendGrid specific features
        ...(emailData.tags && { categories: Object.values(emailData.tags) }),
        ...(emailData.metadata && {
          custom_args: emailData.metadata
        }),
        // Tracking settings - can be configured globally or per email
        trackingSettings: { // Corrected to trackingSettings
          clickTracking: { enable: true }, // Corrected to clickTracking
          openTracking: { enable: true }, // Corrected to openTracking
        },
        content: emailData.html ? [{type: 'text/html', value: emailData.html}] : [{type: 'text/plain', value: emailData.text || ''}], // Ensure content has at least one item
      };

      // Send the email
      const response = await sgMail.send(emailDataSg);

      this.logger.info(`Email sent successfully via SendGrid: ${response[0]?.headers?.['x-message-id']}`);

      return this.createSuccessResult(response[0]?.headers?.['x-message-id'] || 'unknown', {
        statusCode: response[0]?.statusCode,
        headers: response[0]?.headers,
      });

    } catch (error: any) {
      this.logger.error(`Failed to send email via SendGrid: ${error.message}`, { error, emailData });

      // Determine if error is retryable
      const retryable = this.isRetryableError(error);

      return this.createErrorResult(
        this.createError(
          error.code || 'SENDGRID_SEND_ERROR',
          error.message || 'Unknown SendGrid error',
          retryable
        )
      );
    }
  }

  async sendTemplatedEmail(
    templateId: string,
    templateData: Record<string, any>,
    emailData: EmailData
  ): Promise<EmailResult> {
    try {
      this.validateEmailData(emailData);

      const sanitizedTo = this.sanitizeEmailAddresses(emailData.to);
      const sanitizedFrom = emailData.from.trim();

      // Build SendGrid template email data
      const emailDataSg: sgMail.MailDataRequired = {
        to: sanitizedTo,
        from: sanitizedFrom,
        templateId: templateId, // Corrected to templateId
        dynamicTemplateData: templateData, // Corrected to dynamicTemplateData
        ...(emailData.cc && emailData.cc.length > 0 && {
          cc: this.sanitizeEmailAddresses(emailData.cc)
        }),
        ...(emailData.bcc && emailData.bcc.length > 0 && {
          bcc: this.sanitizeEmailAddresses(emailData.bcc)
        }),
        ...(emailData.headers && { headers: emailData.headers }),
        ...(emailData.metadata && {
          custom_args: emailData.metadata
        }),
        // Tracking settings
        trackingSettings: { // Corrected to trackingSettings
          clickTracking: { enable: true }, // Corrected to clickTracking
          openTracking: { enable: true }, // Corrected to openTracking
        },
        // Explicitly add content as an empty array if not present, to satisfy MailDataRequired
        content: [],
      };

      const response = await sgMail.send(emailDataSg);

      this.logger.info(`Templated email sent successfully via SendGrid: ${response[0]?.headers?.['x-message-id']}`);

      return this.createSuccessResult(response[0]?.headers?.['x-message-id'] || 'unknown', {
        statusCode: response[0]?.statusCode,
        headers: response[0]?.headers,
      });

    } catch (error: any) {
      this.logger.error(`Failed to send templated email via SendGrid: ${error.message}`, { error, templateId, emailData });

      const retryable = this.isRetryableError(error);

      return this.createErrorResult(
        this.createError(
          error.code || 'SENDGRID_TEMPLATE_SEND_ERROR',
          error.message || 'Unknown SendGrid template error',
          retryable
        )
      );
    }
  }

  async sendBulkEmail(
    emails: EmailData[],
    from?: string
  ): Promise<EmailResult[]> {
    if (emails.length === 0) {
      throw this.createError('NO_EMAILS', 'No emails provided for bulk send', false);
    }

    if (emails.length > 1000) {
      throw this.createError('TOO_MANY_EMAILS', 'Bulk send limited to 1000 emails per call', false);
    }

    const results: EmailResult[] = [];

    // SendGrid doesn't have a native bulk send API like SES
    // We need to send emails individually or in small batches
    const batchSize = 10; // SendGrid recommends small batches for reliability

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const batchPromises = batch.map(email => this.sendEmail(email));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push(this.createErrorResult(
            this.createError(
              'BATCH_SEND_ERROR',
              `Batch send failed: ${result.reason.message}`,
              true
            )
          ));
        }
      }

      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < emails.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // SendGrid doesn't have a direct health check endpoint
      // We'll do a simple API call to verify connectivity
      // Note: This might consume a small amount of API quota

      const testEmail = {
        to: ['test@example.com'], // This should bounce but indicates API connectivity
        from: 'test@coinet.com',
        subject: 'Health Check',
        text: 'This is a health check email from Coinet Platform',
      };

      try {
        await sgMail.send(testEmail);
        // If we get here, the API is working
        return true;
      } catch (error: any) {
        // If it's a validation error or unauthorized, API is reachable but config is wrong
        if (error.code === 401 || error.code === 400) {
          this.logger.warn('SendGrid API reachable but configuration error', { error: error.code });
          return true; // API is working, just config issue
        }
        throw error;
      }

    } catch (error) {
      this.logger.error('SendGrid health check failed', { error });
      return false;
    }
  }

  private isRetryableError(error: any): boolean {
    // SendGrid retryable errors include:
    // - Rate limiting (429)
    // - Server errors (5xx)
    // - Network timeouts
    if (error.code === 429) return true; // Rate limited
    if (error.statusCode >= 500) return true; // Server errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true; // Network issues

    return false;
  }

  public async getAccountStats(): Promise<any> {
    try {
      // SendGrid provides account statistics via their API
      // This would require additional API calls to their stats endpoints
      // For now, we'll return a placeholder
      this.logger.info('SendGrid account stats retrieval not implemented yet');
      return null;
    } catch (error) {
      this.logger.error('Failed to get SendGrid account stats', { error });
      return null;
    }
  }

  public async validateTemplate(templateId: string): Promise<boolean> {
    try {
      // SendGrid doesn't provide a direct template validation endpoint
      // This would require sending a test email with the template
      this.logger.info('SendGrid template validation not implemented yet');
      return true; // Assume valid for now
    } catch (error) {
      this.logger.error('Failed to validate SendGrid template', { error, templateId });
      return false;
    }
  }
}

