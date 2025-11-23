import { SESClient, SendEmailCommand, SendTemplatedEmailCommand, SendBulkTemplatedEmailCommand, GetSendQuotaCommand, GetSendStatisticsCommand } from '@aws-sdk/client-ses';
import { BaseProvider } from './BaseProvider';
import { EmailData, EmailResult, EmailProviderConfig } from '@/types';

export class AwsSesProvider extends BaseProvider {
  private sesClient: SESClient;
  private region: string;

  constructor(
    name: string,
    config: EmailProviderConfig,
    priority: number = 1,
    rateLimit?: { maxRequests: number; windowMs: number }
  ) {
    super(name, 'ses', config, priority, rateLimit);

    if (!config.region) {
      throw new Error('AWS SES region is required');
    }

    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error('AWS SES credentials are required');
    }

    this.region = config.region;
    this.sesClient = new SESClient({
      region: this.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async sendEmail(emailData: EmailData): Promise<EmailResult> {
    try {
      this.validateEmailData(emailData);

      const sanitizedTo = this.sanitizeEmailAddresses(emailData.to);
      const sanitizedFrom = emailData.from.trim();

      // Build SES email parameters
      const destination: { ToAddresses: string[]; CcAddresses?: string[]; BccAddresses?: string[]; } = {
        ToAddresses: sanitizedTo,
      };

      // Add CC and BCC if provided
      if (emailData.cc && emailData.cc.length > 0) {
        destination.CcAddresses = this.sanitizeEmailAddresses(emailData.cc);
      }

      if (emailData.bcc && emailData.bcc.length > 0) {
        destination.BccAddresses = this.sanitizeEmailAddresses(emailData.bcc);
      }

      const emailParams: any = {
        Source: sanitizedFrom,
        Destination: destination,
        Message: {
          Subject: {
            Data: emailData.subject,
            Charset: 'UTF-8',
          },
          Body: {},
        },
      };

      // Add custom headers
      if (emailData.headers) {
        emailParams.Headers = this.buildSesHeaders(emailData.headers);
      }

      // Add tags for SES tracking
      if (emailData.tags) {
        emailParams.Tags = this.buildSesTags(emailData.tags);
      }

      // Add email body (HTML and/or text)
      if (emailData.html) {
        emailParams.Message.Body.Html = {
          Data: emailData.html,
          Charset: 'UTF-8',
        };
      }

      if (emailData.text) {
        emailParams.Message.Body.Text = {
          Data: emailData.text,
          Charset: 'UTF-8',
        };
      }

      // Add attachments if provided
      if (emailData.attachments && emailData.attachments.length > 0) {
        // Note: SES doesn't support attachments directly in SendEmail
        // For attachments, you'd need to use SendRawEmail with proper MIME formatting
        this.logger.warn('Attachments not supported in SES SendEmail, use SendRawEmail instead');
      }

      // Execute the send command
      const command = new SendEmailCommand(emailParams);
      const response = await this.sesClient.send(command);

      this.logger.info(`Email sent successfully via SES: ${response.MessageId}`);

      return this.createSuccessResult(response.MessageId!, {
        requestId: response.$metadata.requestId,
        httpStatusCode: response.$metadata.httpStatusCode,
      });

    } catch (error: any) {
      this.logger.error(`Failed to send email via SES: ${error.message}`, { error, emailData });

      // Determine if error is retryable
      const retryable = this.isRetryableError(error);

      return this.createErrorResult(
        this.createError(
          error.code || 'SES_SEND_ERROR',
          error.message || 'Unknown SES error',
          retryable
        )
      );
    }
  }

  async sendTemplatedEmail(
    templateName: string,
    templateData: Record<string, any>,
    emailData: EmailData
  ): Promise<EmailResult> {
    try {
      this.validateEmailData(emailData);

      const sanitizedTo = this.sanitizeEmailAddresses(emailData.to);
      const sanitizedFrom = emailData.from.trim();

      const emailParams: any = { // Changed to any to allow dynamic assignment from emailData.cc, bcc below
        Source: sanitizedFrom,
        Template: templateName,
        TemplateData: JSON.stringify(templateData),
        Destination: {
          ToAddresses: sanitizedTo,
        },
      };

      // Ensure that if CC/BCC are provided, the Destination object is correctly updated without redeclaring
      if (emailData.cc && emailData.cc.length > 0) {
        emailParams.Destination.CcAddresses = this.sanitizeEmailAddresses(emailData.cc);
      }

      if (emailData.bcc && emailData.bcc.length > 0) {
        emailParams.Destination.BccAddresses = this.sanitizeEmailAddresses(emailData.bcc);
      }

      const command = new SendTemplatedEmailCommand(emailParams);
      const response = await this.sesClient.send(command);

      this.logger.info(`Templated email sent successfully via SES: ${response.MessageId}`);

      return this.createSuccessResult(response.MessageId!, {
        requestId: response.$metadata.requestId,
        httpStatusCode: response.$metadata.httpStatusCode,
      });

    } catch (error: any) {
      this.logger.error(`Failed to send templated email via SES: ${error.message}`, { error, templateName, emailData });

      const retryable = this.isRetryableError(error);

      return this.createErrorResult(
        this.createError(
          error.code || 'SES_TEMPLATE_SEND_ERROR',
          error.message || 'Unknown SES template error',
          retryable
        )
      );
    }
  }

  async sendBulkTemplatedEmail(
    templateName: string,
    recipients: Array<{
      email: string;
      data: Record<string, any>;
      cc?: string[];
      bcc?: string[];
    }>,
    from?: string
  ): Promise<EmailResult[]> {
    try {
      if (recipients.length === 0) {
        throw this.createError('NO_RECIPIENTS', 'No recipients provided for bulk send', false);
      }

      if (recipients.length > 50) {
        throw this.createError('TOO_MANY_RECIPIENTS', 'Bulk send limited to 50 recipients per call', false);
      }

      // For bulk sending, we need to use the same source for all emails
      const sourceEmail = from || 'noreply@coinet.com';

      const command = new SendBulkTemplatedEmailCommand({
        Source: sourceEmail,
        Template: templateName,
        DefaultTemplateData: JSON.stringify({}), // Required by SES
        Destinations: recipients.map(recipient => {
          const destination: any = {
            ToAddresses: [recipient.email],
          };

          if (recipient.cc && recipient.cc.length > 0) {
            destination.CcAddresses = this.sanitizeEmailAddresses(recipient.cc);
          }
          if (recipient.bcc && recipient.bcc.length > 0) {
            destination.BccAddresses = this.sanitizeEmailAddresses(recipient.bcc);
          }

          return {
            Destination: destination,
            ReplacementTemplateData: JSON.stringify(recipient.data),
          };
        }),
      });
      const response = await this.sesClient.send(command);

      this.logger.info(`Bulk templated email sent successfully via SES: ${response.$metadata.requestId || 'unknown'}`, {
        response, // Log full response for debugging
      });

      // AWS SDK v3 returns success/failure for each destination in the 'Status' array
      if (!response.Status || !Array.isArray(response.Status)) {
        throw this.createError('BULK_SEND_ERROR', 'No status information returned for bulk send', true);
      }

      return response.Status.map((result: any, index: number) => {
        if (result.Status === 'Success') {
          const messageId = result.MessageId || `bulk-${Date.now()}-${index}`;
          const recipient = recipients[index];
          const metadata: any = {};

          if (recipient && recipient.email) {
            metadata.recipient = recipient.email;
          }

          if (response.$metadata.requestId) {
            metadata.requestId = response.$metadata.requestId;
          }

          return this.createSuccessResult(messageId, metadata);
        } else {
          return this.createErrorResult(
            this.createError(
              result.Error?.ErrorCode || 'BULK_SEND_ERROR',
              result.Error?.ErrorMessage || 'Bulk send error',
              this.isRetryableError(result.Error)
            )
          );
        }
      });
    } catch (error: unknown) { // Explicitly type error as unknown
      this.logger.error(`Failed to send bulk templated email via SES: ${(error as Error).message}`, { error, templateName });

      const retryable = this.isRetryableError(error);

      return recipients.map(recipient =>
        this.createErrorResult(
          this.createError(
            (error as any).code || 'SES_BULK_SEND_ERROR',
            (error as Error).message || 'Unknown SES bulk send error',
            retryable
          )
        )
      );
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // Check SES quota and sending statistics
      const quotaCommand = new GetSendQuotaCommand({});
      const statsCommand = new GetSendStatisticsCommand({});

      const [quotaResponse, statsResponse] = await Promise.all([
        this.sesClient.send(quotaCommand),
        this.sesClient.send(statsCommand),
      ]);

      // Basic health check - ensure we can make API calls and have quota available
      const hasQuota = quotaResponse.Max24HourSend !== undefined && quotaResponse.SentLast24Hours !== undefined && quotaResponse.Max24HourSend > quotaResponse.SentLast24Hours;
      const hasSendingCapacity = quotaResponse.MaxSendRate !== undefined && quotaResponse.MaxSendRate > 0;

      if (!hasQuota || !hasSendingCapacity) {
        this.logger.warn('SES health check failed: insufficient quota or rate limit', {
          quota: quotaResponse,
          stats: statsResponse,
        });
        return false;
      }

      return true;

    } catch (error) {
      this.logger.error('SES health check failed', { error });
      return false;
    }
  }

  private buildSesHeaders(headers: Record<string, string>): Array<{ Name: string; Value: string }> {
    return Object.entries(headers).map(([name, value]) => ({
      Name: name,
      Value: value,
    }));
  }

  private buildSesTags(tags: Record<string, string>): Array<{ Name: string; Value: string }> {
    return Object.entries(tags).map(([name, value]) => ({
      Name: name,
      Value: value,
    }));
  }

  private isRetryableError(error: any): boolean {
    // SES retryable errors include:
    // - Throttling errors
    // - Service unavailable
    // - Internal errors
    const retryableCodes = [
      'Throttling',
      'ServiceUnavailable',
      'InternalFailure',
      'LimitExceededException',
      'RequestThrottled',
    ];

    return retryableCodes.includes(error.code) || error.retryable === true;
  }

  public async getSendingStats(): Promise<any> {
    try {
      const [quotaResponse, statsResponse] = await Promise.all([
        this.sesClient.send(new GetSendQuotaCommand({})),
        this.sesClient.send(new GetSendStatisticsCommand({})),
      ]);

      return {
        quota: {
          max24HourSend: quotaResponse.Max24HourSend,
          maxSendRate: quotaResponse.MaxSendRate,
          sentLast24Hours: quotaResponse.SentLast24Hours,
        },
        stats: statsResponse.SendDataPoints || [], // Ensure SendDataPoints is an array or empty
      };
    } catch (error: unknown) { // Explicitly type error as unknown
      this.logger.error('Failed to get SES sending stats', { error });
      return null;
    }
  }
}

