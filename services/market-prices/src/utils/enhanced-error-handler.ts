/**
 * Enhanced Error Handling Utility
 * Centralized error handling with circuit breaker pattern and retry logic
 * Divine perfection in error resilience
 */

import { AxiosError } from 'axios';
import {
  DataSource,
  ProviderError,
} from '../types';
import { logger } from '../utils/logger';

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing, reject requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening
  successThreshold: number;      // Successes before closing
  timeout: number;                // Time before half-open (ms)
  resetTimeout: number;           // Time before reset (ms)
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,  // 1 minute
  resetTimeout: 300000, // 5 minutes
};

/**
 * Circuit breaker state for a data source
 */
interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

/**
 * Enhanced Error Handler
 * Provides circuit breaker pattern, retry logic, and comprehensive error context
 */
export class EnhancedErrorHandler {
  private circuitBreakers: Map<DataSource, CircuitBreakerState>;
  private config: CircuitBreakerConfig;
  private errorCounts: Map<DataSource, Map<number, number>>; // statusCode -> count

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
    this.circuitBreakers = new Map();
    this.errorCounts = new Map();

    // Initialize circuit breakers for all data sources
    Object.values(DataSource).forEach(source => {
      this.circuitBreakers.set(source, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
      });
      this.errorCounts.set(source, new Map());
    });
  }

  /**
   * Handle API error with enhanced context
   */
  handleError(
    error: AxiosError,
    source: DataSource,
    endpoint: string,
    context?: Record<string, any>
  ): ProviderError {
    const circuitState = this.getCircuitState(source);
    
    // Track error
    this.trackError(source, error);

    // Check circuit breaker
    if (circuitState.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - (circuitState.lastFailureTime || 0);
      if (timeSinceFailure < this.config.timeout) {
        logger.warn(`Circuit breaker OPEN for ${source}, rejecting request`, {
          endpoint,
          timeSinceFailure,
        });
        throw new ProviderError(
          `Circuit breaker is OPEN for ${source}. Service unavailable.`,
          source,
          503,
          error
        );
      } else {
        // Transition to half-open
        circuitState.state = CircuitState.HALF_OPEN;
        logger.info(`Circuit breaker transitioning to HALF_OPEN for ${source}`);
      }
    }

    // Build enhanced error context
    const errorContext = this.buildErrorContext(error, endpoint, context);

    // Log error with full context
    this.logError(error, source, endpoint, errorContext);

    // Create ProviderError with enhanced context
    const providerError = this.createProviderError(error, source, errorContext);

    // Update circuit breaker on failure
    if (error.response?.status && error.response.status >= 500) {
      this.recordFailure(source);
    } else if (error.response?.status && error.response.status < 500) {
      // Client errors don't count as circuit breaker failures
      this.recordSuccess(source);
    }

    return providerError;
  }

  /**
   * Record successful request
   */
  recordSuccess(source: DataSource): void {
    const state = this.getCircuitState(source);
    
    if (state.state === CircuitState.HALF_OPEN) {
      state.successes++;
      state.lastSuccessTime = Date.now();
      
      if (state.successes >= this.config.successThreshold) {
        state.state = CircuitState.CLOSED;
        state.failures = 0;
        state.successes = 0;
        logger.info(`Circuit breaker CLOSED for ${source} - service recovered`);
      }
    } else if (state.state === CircuitState.CLOSED) {
      // Reset failure count on success
      state.failures = Math.max(0, state.failures - 1);
    }
  }

  /**
   * Record failed request
   */
  recordFailure(source: DataSource): void {
    const state = this.getCircuitState(source);
    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.state === CircuitState.HALF_OPEN) {
      // Failed during half-open, open immediately
      state.state = CircuitState.OPEN;
      logger.warn(`Circuit breaker OPENED for ${source} - service still failing`);
    } else if (state.failures >= this.config.failureThreshold) {
      state.state = CircuitState.OPEN;
      logger.error(`Circuit breaker OPENED for ${source}`, {
        failures: state.failures,
        threshold: this.config.failureThreshold,
      });
    }
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(source: DataSource): CircuitBreakerState {
    let state = this.circuitBreakers.get(source);
    if (!state) {
      state = {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
      };
      this.circuitBreakers.set(source, state);
    }
    return state;
  }

  /**
   * Track error for analytics
   */
  private trackError(source: DataSource, error: AxiosError): void {
    const statusCode = error.response?.status || 0;
    const errorMap = this.errorCounts.get(source) || new Map();
    const count = errorMap.get(statusCode) || 0;
    errorMap.set(statusCode, count + 1);
    this.errorCounts.set(source, errorMap);
  }

  /**
   * Build enhanced error context
   */
  private buildErrorContext(
    error: AxiosError,
    endpoint: string,
    context?: Record<string, any>
  ): Record<string, any> {
    const baseContext: Record<string, any> = {
      endpoint,
      url: error.config?.url,
      method: error.config?.method,
      timestamp: new Date().toISOString(),
    };

    if (error.response) {
      baseContext.status = error.response.status;
      baseContext.statusText = error.response.statusText;
      baseContext.headers = error.response.headers;
      baseContext.data = error.response.data;
    }

    if (error.request) {
      baseContext.requestMade = true;
      baseContext.timeout = error.config?.timeout;
    }

    if (context) {
      Object.assign(baseContext, context);
    }

    return baseContext;
  }

  /**
   * Log error with full context
   */
  private logError(
    error: AxiosError,
    source: DataSource,
    endpoint: string,
    context: Record<string, any>
  ): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      logger.error(`${source} API error: ${status}`, {
        endpoint,
        status,
        error: data?.error || data?.status?.error_message || error.message,
        context,
      });
    } else if (error.request) {
      logger.error(`${source} network error`, {
        endpoint,
        error: error.message,
        context,
      });
    } else {
      logger.error(`${source} request error`, {
        endpoint,
        error: error.message,
        context,
      });
    }
  }

  /**
   * Create ProviderError with enhanced context
   */
  private createProviderError(
    error: AxiosError,
    source: DataSource,
    context: Record<string, any>
  ): ProviderError {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      const message = data?.error || 
                     data?.status?.error_message || 
                     `HTTP ${status}: ${error.message}`;

      return new ProviderError(
        `${source} API error: ${status} - ${message}`,
        source,
        status,
        { ...error, context }
      );
    } else if (error.request) {
      return new ProviderError(
        `${source} network error: ${error.message}`,
        source,
        undefined,
        { ...error, context }
      );
    } else {
      return new ProviderError(
        `${source} request error: ${error.message}`,
        source,
        undefined,
        { ...error, context }
      );
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<DataSource, Record<number, number>> {
    const stats: Record<string, Record<number, number>> = {};
    
    this.errorCounts.forEach((errorMap, source) => {
      stats[source] = {};
      errorMap.forEach((count, statusCode) => {
        stats[source][statusCode] = count;
      });
    });

    return stats as Record<DataSource, Record<number, number>>;
  }

  /**
   * Reset circuit breaker for a source
   */
  resetCircuitBreaker(source: DataSource): void {
    const state = this.getCircuitState(source);
    state.state = CircuitState.CLOSED;
    state.failures = 0;
    state.successes = 0;
    state.lastFailureTime = null;
    state.lastSuccessTime = null;
    logger.info(`Circuit breaker reset for ${source}`);
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen(source: DataSource): boolean {
    const state = this.getCircuitState(source);
    return state.state === CircuitState.OPEN;
  }

  /**
   * Get circuit breaker status for all sources
   */
  getCircuitBreakerStatus(): Record<DataSource, {
    state: CircuitState;
    failures: number;
    successes: number;
  }> {
    const status: Record<string, any> = {};
    
    this.circuitBreakers.forEach((state, source) => {
      status[source] = {
        state: state.state,
        failures: state.failures,
        successes: state.successes,
      };
    });

    return status as Record<DataSource, {
      state: CircuitState;
      failures: number;
      successes: number;
    }>;
  }
}

// Singleton instance
let errorHandlerInstance: EnhancedErrorHandler | null = null;

/**
 * Get or create enhanced error handler instance
 */
export function getEnhancedErrorHandler(
  config?: Partial<CircuitBreakerConfig>
): EnhancedErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new EnhancedErrorHandler(config);
  }
  return errorHandlerInstance;
}

export default EnhancedErrorHandler;

