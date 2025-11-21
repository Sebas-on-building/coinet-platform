/**
 * =========================================
 * SIMPLE LOGGER UTILITY
 * =========================================
 * Basic logging utility for the encryption service
 */

export class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  info(message: string, meta?: any) {
    console.log(`[${this.name}] INFO: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  error(message: string, error?: any, meta?: any) {
    console.error(`[${this.name}] ERROR: ${message}`, error, meta ? JSON.stringify(meta, null, 2) : '');
  }

  debug(message: string, meta?: any) {
    console.log(`[${this.name}] DEBUG: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  warn(message: string, meta?: any) {
    console.warn(`[${this.name}] WARN: ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }
}
