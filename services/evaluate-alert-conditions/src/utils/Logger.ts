/**
 * =========================================
 * LOGGER UTILITY
 * =========================================
 * Divine world-class structured logging utility
 * High-performance logging with multiple output formats
 */

// Note: winston would be installed in a real implementation
// import winston from 'winston';

/**
 * Structured logger with performance optimization
 */
export class Logger {
  private serviceName: string;
  private level: string;

  constructor(serviceName: string, level: string = 'info') {
    this.serviceName = serviceName;
    this.level = level;
  }

  /**
   * Log error message
   */
  error(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      console.error(`[${new Date().toISOString()}] ${this.serviceName} ERROR:`, message, meta || '');
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.warn(`[${new Date().toISOString()}] ${this.serviceName} WARN:`, message, meta || '');
    }
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.log(`[${new Date().toISOString()}] ${this.serviceName} INFO:`, message, meta || '');
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.debug(`[${new Date().toISOString()}] ${this.serviceName} DEBUG:`, message, meta || '');
    }
  }

  /**
   * Check if message should be logged based on level
   */
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  /**
   * Log with timing information
   */
  withTiming<T>(operation: string, fn: () => T): T {
    const startTime = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - startTime;

      this.debug(`Operation completed`, {
        operation,
        duration,
        success: true,
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.error(`Operation failed`, {
        operation,
        duration,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    return new Logger(`${this.serviceName}:${JSON.stringify(context)}`, this.level);
  }

  /**
   * Set log level
   */
  setLevel(level: string): void {
    this.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.level;
  }
}
