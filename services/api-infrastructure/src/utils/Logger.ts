/**
 * =========================================
 * LOGGER
 * =========================================
 * Divine world-class logging system with structured output and multiple transports
 */

export interface LogLevel {
  error: 0;
  warn: 1;
  info: 2;
  debug: 3;
}

export interface LogEntry {
  timestamp: string;
  level: keyof LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Advanced logger with structured output and multiple transports
 */
export class Logger {
  private name: string;
  private level: keyof LogLevel;

  constructor(name: string, level: keyof LogLevel = 'info') {
    this.name = name;
    this.level = level;
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', message, context, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Log HTTP request/response
   */
  http(message: string, context?: Record<string, any>): void {
    this.log('info', message, { ...context, type: 'http' });
  }

  /**
   * Core logging method
   */
  private log(
    level: keyof LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    // Check if we should log at this level
    const levels: LogLevel = { error: 0, warn: 1, info: 2, debug: 3 };
    if (levels[level] > levels[this.level]) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: `[${this.name}] ${message}`,
      context,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Output to console in development
    if (process.env.NODE_ENV === 'development') {
      this.outputToConsole(logEntry);
    }

    // In production, this would send to external logging service
    // (e.g., Winston, Pino, or structured logging service)
    if (process.env.NODE_ENV === 'production') {
      this.outputToExternal(logEntry);
    }
  }

  /**
   * Output to console (development)
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const level = entry.level.toUpperCase().padEnd(5);
    const prefix = `${timestamp} ${level} ${entry.message}`;

    let output = prefix;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` | ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'debug':
        console.debug(output);
        break;
    }
  }

  /**
   * Output to external logging service (production)
   */
  private outputToExternal(entry: LogEntry): void {
    // In a real implementation, this would send to:
    // - Elasticsearch/Logstash/Kibana (ELK stack)
    // - Splunk
    // - DataDog
    // - New Relic
    // - CloudWatch Logs
    // etc.

    // For demo purposes, we'll just use structured console output
    console.log(JSON.stringify(entry));
  }

  /**
   * Create child logger with additional context
   */
  child(name: string, context?: Record<string, any>): Logger {
    const childLogger = new Logger(`${this.name}:${name}`, this.level);

    // Add context to all log entries from this child
    if (context) {
      // Store context for child logger
      (childLogger as any).defaultContext = context;
    }

    return childLogger;
  }

  /**
   * Set logging level
   */
  setLevel(level: keyof LogLevel): void {
    this.level = level;
  }

  /**
   * Get current logging level
   */
  getLevel(): keyof LogLevel {
    return this.level;
  }
}
