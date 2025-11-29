/**
 * 📝 Divine Logging System
 * 
 * Production-ready logging with levels, formatting, and context.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const prefix = this.getPrefix(level);

    if (context) {
      console.log(
        `${timestamp} ${prefix} ${message}`,
        this.isDevelopment ? context : JSON.stringify(context)
      );
    } else {
      console.log(`${timestamp} ${prefix} ${message}`);
    }
  }

  private getPrefix(level: LogLevel): string {
    const prefixes = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };
    return prefixes[level];
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (error instanceof Error) {
      this.log('error', `${message}: ${error.message}`, {
        ...context,
        stack: error.stack,
      });
    } else {
      this.log('error', message, { ...context, error });
    }
  }
}

export const logger = new Logger();

