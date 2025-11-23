/**
 * =========================================
 * LOGGER UTILITY
 * =========================================
 * Centralized logging for the live market data feeds service
 */

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[${new Date().toISOString()}] ${this.context} ℹ️  ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${new Date().toISOString()}] ${this.context} ❌ ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${new Date().toISOString()}] ${this.context} ⚠️  ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(`[${new Date().toISOString()}] ${this.context} 🔍 ${message}`, ...args);
    }
  }
}
