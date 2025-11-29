import * as winston from 'winston';

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
          const context = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level.toUpperCase()}]: ${message}${context}`;
        })
      ),
      defaultMeta: { service: 'notification-service' },
      transports: [
        // Write all logs with importance level of `error` or less to `error.log`
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        // Write all logs with importance level of `info` or less to `combined.log`
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
      ],
    });

    // If we're not in production, also log to the console
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
            const context = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}]: ${message}${context}`;
          })
        )
      }));
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  // Convenience method for logging email-related events
  logEmailEvent(event: string, emailData: any, context?: LogContext): void {
    this.info(`Email ${event}`, {
      emailData: {
        to: emailData.to,
        from: emailData.from,
        subject: emailData.subject,
        templateId: emailData.templateId,
        campaignId: emailData.campaignId,
        priority: emailData.priority,
      },
      ...context,
    });
  }

  // Convenience method for logging provider events
  logProviderEvent(provider: string, event: string, context?: LogContext): void {
    this.info(`Provider ${provider}: ${event}`, context);
  }

  // Convenience method for logging errors with email context
  logEmailError(error: string, emailData: any, errorDetails?: any): void {
    this.error(`Email error: ${error}`, {
      emailData: {
        to: emailData.to,
        from: emailData.from,
        subject: emailData.subject,
        templateId: emailData.templateId,
        campaignId: emailData.campaignId,
      },
      errorDetails,
    });
  }

  // Convenience method for logging provider errors
  logProviderError(provider: string, error: string, context?: LogContext): void {
    this.error(`Provider ${provider} error: ${error}`, context);
  }

  // Convenience method for logging SMS-related events
  logSmsEvent(event: string, smsData: any, context?: LogContext): void {
    this.info(`SMS ${event}`, {
      smsData: {
        to: smsData.to,
        from: smsData.from,
        body: smsData.body?.substring(0, 50) + (smsData.body?.length > 50 ? '...' : ''),
        templateId: smsData.templateId,
        campaignId: smsData.campaignId,
        priority: smsData.priority,
      },
      ...context,
    });
  }

  // Convenience method for logging SMS errors
  logSmsError(error: string, smsData: any, errorDetails?: any): void {
    this.error(`SMS error: ${error}`, {
      smsData: {
        to: smsData.to,
        from: smsData.from,
        body: smsData.body?.substring(0, 50) + (smsData.body?.length > 50 ? '...' : ''),
        templateId: smsData.templateId,
        campaignId: smsData.campaignId,
      },
      errorDetails,
    });
  }
}

