/**
 * Comprehensive Input Validation and Sanitization
 * Ensures all inputs are safe and valid before processing
 */

import { DataSource } from '../types';
import { logger } from './logger';

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InputValidator {
  /**
   * Validate and sanitize coin symbols
   */
  static validateSymbols(symbols: string[]): string[] {
    if (!Array.isArray(symbols)) {
      throw new ValidationError('Symbols must be an array');
    }

    if (symbols.length === 0) {
      throw new ValidationError('At least one symbol is required');
    }

    if (symbols.length > 100) {
      throw new ValidationError('Maximum 100 symbols allowed per request');
    }

    return symbols
      .map((symbol) => {
        if (typeof symbol !== 'string') {
          throw new ValidationError(`Invalid symbol type: ${typeof symbol}`, 'symbol', symbol);
        }
        // Sanitize: uppercase, remove whitespace, allow alphanumeric and hyphens
        return symbol.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      })
      .filter((symbol) => symbol.length > 0 && symbol.length <= 20);
  }

  /**
   * Validate CoinGecko coin IDs
   */
  static validateCoinGeckoIds(ids: string[]): string[] {
    if (!Array.isArray(ids)) {
      throw new ValidationError('Coin IDs must be an array');
    }

    return ids
      .map((id) => {
        if (typeof id !== 'string') {
          throw new ValidationError(`Invalid coin ID type: ${typeof id}`, 'id', id);
        }
        // CoinGecko IDs: lowercase, alphanumeric, hyphens, underscores
        return id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      })
      .filter((id) => id.length > 0 && id.length <= 100);
  }

  /**
   * Validate currency codes
   */
  static validateCurrency(currency: string): string {
    if (typeof currency !== 'string') {
      throw new ValidationError('Currency must be a string', 'currency', currency);
    }

    const sanitized = currency.trim().toLowerCase();
    
    // Common currency codes: 3-4 characters, lowercase
    if (!/^[a-z]{3,4}$/.test(sanitized)) {
      throw new ValidationError(
        `Invalid currency format: ${currency}`,
        'currency',
        currency
      );
    }

    return sanitized;
  }

  /**
   * Validate time intervals
   */
  static validateInterval(interval: string): string {
    const validIntervals = [
      '1m', '5m', '15m', '30m', '1h', '4h', '12h', '1d', '1w', '1M',
      '1min', '5min', '15min', '30min', '1hour', '4hour', '12hour',
      '1day', '1week', '1month',
    ];

    const sanitized = interval.trim().toLowerCase();

    if (!validIntervals.includes(sanitized)) {
      throw new ValidationError(
        `Invalid interval: ${interval}. Valid: ${validIntervals.join(', ')}`,
        'interval',
        interval
      );
    }

    return sanitized;
  }

  /**
   * Validate days parameter
   */
  static validateDays(days: number | string): number {
    let numDays: number;

    if (typeof days === 'string') {
      if (days === 'max') {
        return 'max' as any; // Special case for CoinGecko
      }
      numDays = parseInt(days, 10);
    } else {
      numDays = days;
    }

    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      throw new ValidationError(
        `Days must be between 1 and 365, got: ${days}`,
        'days',
        days
      );
    }

    return numDays;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: number, perPage?: number): {
    page: number;
    perPage: number;
  } {
    const validatedPage = page !== undefined ? Math.max(1, Math.floor(page)) : 1;
    const validatedPerPage =
      perPage !== undefined ? Math.max(1, Math.min(250, Math.floor(perPage))) : 100;

    return {
      page: validatedPage,
      perPage: validatedPerPage,
    };
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string, provider: DataSource): string {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new ValidationError(
        `API key is required for ${provider}`,
        'apiKey',
        apiKey
      );
    }

    const sanitized = apiKey.trim();

    if (sanitized.length < 10) {
      throw new ValidationError(
        `API key appears invalid (too short) for ${provider}`,
        'apiKey'
      );
    }

    return sanitized;
  }

  /**
   * Validate rate limit configuration
   */
  static validateRateLimitConfig(config: {
    maxRequestsPerMinute: number;
    reservoir: number;
    reservoirRefreshAmount: number;
    reservoirRefreshInterval: number;
  }): void {
    if (config.maxRequestsPerMinute <= 0) {
      throw new ValidationError(
        'maxRequestsPerMinute must be greater than 0',
        'maxRequestsPerMinute',
        config.maxRequestsPerMinute
      );
    }

    if (config.reservoir <= 0) {
      throw new ValidationError(
        'reservoir must be greater than 0',
        'reservoir',
        config.reservoir
      );
    }

    if (config.reservoirRefreshInterval <= 0) {
      throw new ValidationError(
        'reservoirRefreshInterval must be greater than 0',
        'reservoirRefreshInterval',
        config.reservoirRefreshInterval
      );
    }

    if (config.reservoirRefreshAmount <= 0) {
      throw new ValidationError(
        'reservoirRefreshAmount must be greater than 0',
        'reservoirRefreshAmount',
        config.reservoirRefreshAmount
      );
    }
  }

  /**
   * Sanitize URL parameters
   */
  static sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        continue; // Skip null/undefined values
      }

      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = value.trim().slice(0, 1000); // Max length
      } else if (typeof value === 'number') {
        // Validate numbers
        if (isNaN(value) || !isFinite(value)) {
          logger.warn(`Skipping invalid number parameter: ${key}=${value}`);
          continue;
        }
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        // Validate arrays
        sanitized[key] = value.slice(0, 100); // Max array length
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else {
        logger.warn(`Skipping unsupported parameter type: ${key}=${typeof value}`);
      }
    }

    return sanitized;
  }

  /**
   * Validate WebSocket subscription options
   */
  static validateWebSocketSubscription(options: {
    coins: string[];
    channels?: string[];
  }): void {
    if (!options.coins || !Array.isArray(options.coins)) {
      throw new ValidationError('coins must be an array');
    }

    if (options.coins.length === 0) {
      throw new ValidationError('At least one coin is required');
    }

    if (options.coins.length > 1000) {
      throw new ValidationError('Maximum 1000 coins allowed per subscription');
    }

    if (options.channels && !Array.isArray(options.channels)) {
      throw new ValidationError('channels must be an array');
    }

    // Validate coin IDs
    options.coins.forEach((coin, index) => {
      if (typeof coin !== 'string' || coin.trim().length === 0) {
        throw new ValidationError(
          `Invalid coin at index ${index}`,
          `coins[${index}]`,
          coin
        );
      }
    });
  }

  /**
   * Validate database connection config
   */
  static validateDatabaseConfig(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }): void {
    if (!config.host || typeof config.host !== 'string') {
      throw new ValidationError('Database host is required');
    }

    if (!config.port || typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
      throw new ValidationError(
        `Invalid database port: ${config.port}`,
        'port',
        config.port
      );
    }

    if (!config.database || typeof config.database !== 'string') {
      throw new ValidationError('Database name is required');
    }

    if (!config.user || typeof config.user !== 'string') {
      throw new ValidationError('Database user is required');
    }

    if (!config.password || typeof config.password !== 'string') {
      throw new ValidationError('Database password is required');
    }
  }

  /**
   * Validate Redis cache config
   */
  static validateRedisConfig(config: {
    host: string;
    port: number;
    password?: string;
    db: number;
  }): void {
    if (!config.host || typeof config.host !== 'string') {
      throw new ValidationError('Redis host is required');
    }

    if (!config.port || typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
      throw new ValidationError(`Invalid Redis port: ${config.port}`, 'port', config.port);
    }

    if (typeof config.db !== 'number' || config.db < 0 || config.db > 15) {
      throw new ValidationError(`Invalid Redis DB: ${config.db}`, 'db', config.db);
    }
  }
}

export default InputValidator;

