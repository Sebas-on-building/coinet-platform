/**
 * =========================================
 * AI INSIGHTS SERVICE LOGGER
 * =========================================
 * Divine world-class logging for AI insights operations
 */

// Simple console logger for development
const logger = {
  error: (message: string, meta?: any) => console.error(`ERROR [${new Date().toISOString()}] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`WARN [${new Date().toISOString()}] ${message}`, meta),
  info: (message: string, meta?: any) => console.info(`INFO [${new Date().toISOString()}] ${message}`, meta),
  debug: (message: string, meta?: any) => console.debug(`DEBUG [${new Date().toISOString()}] ${message}`, meta),
  http: (message: string, meta?: any) => console.log(`HTTP [${new Date().toISOString()}] ${message}`, meta)
};

/**
 * Structured logger wrapper
 */
export class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context || '';
  }

  /**
   * Log error messages
   */
  error(message: string, meta?: any): void {
    logger.error(`${this.context ? `[${this.context}] ` : ''}${message}`, meta);
  }

  /**
   * Log warning messages
   */
  warn(message: string, meta?: any): void {
    logger.warn(`${this.context ? `[${this.context}] ` : ''}${message}`, meta);
  }

  /**
   * Log info messages
   */
  info(message: string, meta?: any): void {
    logger.info(`${this.context ? `[${this.context}] ` : ''}${message}`, meta);
  }

  /**
   * Log HTTP requests
   */
  http(message: string, meta?: any): void {
    logger.http(`${this.context ? `[${this.context}] ` : ''}${message}`, meta);
  }

  /**
   * Log debug messages
   */
  debug(message: string, meta?: any): void {
    logger.debug(`${this.context ? `[${this.context}] ` : ''}${message}`, meta);
  }

  /**
   * Create child logger with additional context
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  /**
   * Log with timing information
   */
  withTiming<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.debug(`Starting ${operation}`);

    return fn()
      .then(result => {
        const duration = Date.now() - startTime;
        this.debug(`Completed ${operation} in ${duration}ms`);
        return result;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        this.error(`Failed ${operation} after ${duration}ms`, {
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      });
  }
}
