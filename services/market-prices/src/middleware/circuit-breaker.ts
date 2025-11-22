/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by opening circuit after threshold failures
 */

import EventEmitter from 'eventemitter3';
import { DataSource } from '../types';
import { logger } from '../utils/logger';

export enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing, reject requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Open circuit after N failures
  successThreshold: number;      // Close circuit after N successes (half-open)
  timeout: number;               // Time before attempting half-open (ms)
  resetTimeout: number;          // Time before resetting failure count (ms)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  openedAt?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 2,      // Close after 2 successes in half-open
  timeout: 60000,           // Wait 1 minute before half-open
  resetTimeout: 300000,     // Reset failure count after 5 minutes
};

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private openedAt?: Date;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private config: CircuitBreakerConfig;
  private halfOpenTimer?: NodeJS.Timeout;
  private resetTimer?: NodeJS.Timeout;

  constructor(
    private source: DataSource,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    logger.info(`Circuit breaker initialized for ${source}`, {
      config: this.config,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed to attempt half-open
      if (this.openedAt) {
        const timeSinceOpen = Date.now() - this.openedAt.getTime();
        if (timeSinceOpen >= this.config.timeout) {
          this.setState(CircuitState.HALF_OPEN);
        } else {
          const remaining = Math.ceil(
            (this.config.timeout - timeSinceOpen) / 1000
          );
          throw new Error(
            `Circuit breaker is OPEN for ${this.source}. ` +
            `Retry after ${remaining}s`
          );
        }
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.source}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.setState(CircuitState.CLOSED);
        logger.info(`Circuit breaker CLOSED for ${this.source}`, {
          successes: this.successes,
        });
        this.emit('closed', { source: this.source });
      }
    } else {
      // Reset failure count on success (if enough time passed)
      if (this.lastFailure) {
        const timeSinceFailure = Date.now() - this.lastFailure.getTime();
        if (timeSinceFailure >= this.config.resetTimeout) {
          this.failures = 0;
          logger.debug(`Failure count reset for ${this.source}`);
        }
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.lastFailure = new Date();
    this.totalFailures++;
    this.failures++;

    // Don't count rate limit errors as failures (they're expected)
    if (error.message.includes('Rate limit') || error.message.includes('429')) {
      logger.debug(`Rate limit error (not counted as failure) for ${this.source}`);
      return;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state opens circuit again
      this.setState(CircuitState.OPEN);
      logger.warn(`Circuit breaker re-opened for ${this.source}`, {
        error: error.message,
      });
      this.emit('opened', { source: this.source, error: error.message });
    } else if (this.failures >= this.config.failureThreshold) {
      this.setState(CircuitState.OPEN);
      logger.error(`Circuit breaker OPENED for ${this.source}`, {
        failures: this.failures,
        threshold: this.config.failureThreshold,
      });
      this.emit('opened', {
        source: this.source,
        failures: this.failures,
      });
    }
  }

  /**
   * Set circuit breaker state
   */
  private setState(newState: CircuitState): void {
    if (this.state === newState) {
      return;
    }

    const oldState = this.state;
    this.state = newState;

    // Clear timers
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = undefined;
    }
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    // Set timers based on new state
    if (newState === CircuitState.OPEN) {
      this.openedAt = new Date();
      this.successes = 0;
      // Schedule half-open attempt
      this.halfOpenTimer = setTimeout(() => {
        if (this.state === CircuitState.OPEN) {
          this.setState(CircuitState.HALF_OPEN);
          logger.info(`Circuit breaker attempting HALF_OPEN for ${this.source}`);
          this.emit('half_open', { source: this.source });
        }
      }, this.config.timeout);
    } else if (newState === CircuitState.CLOSED) {
      this.failures = 0;
      this.successes = 0;
      this.openedAt = undefined;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successes = 0;
    }

    logger.debug(`Circuit breaker state changed: ${oldState} -> ${newState}`, {
      source: this.source,
    });
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      openedAt: this.openedAt,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    logger.info(`Manually resetting circuit breaker for ${this.source}`);
    this.setState(CircuitState.CLOSED);
    this.failures = 0;
    this.successes = 0;
    this.openedAt = undefined;
    this.emit('reset', { source: this.source });
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit breaker is closed (healthy)
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Circuit Breaker Manager
 * Manages circuit breakers for all data sources
 */
export class CircuitBreakerManager {
  private breakers: Map<DataSource, CircuitBreaker> = new Map();

  /**
   * Get or create circuit breaker for a source
   */
  getBreaker(
    source: DataSource,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(source)) {
      const breaker = new CircuitBreaker(source, config);
      breaker.on('opened', () => {
        logger.error(`Circuit breaker opened for ${source}`);
      });
      breaker.on('closed', () => {
        logger.info(`Circuit breaker closed for ${source}`);
      });
      this.breakers.set(source, breaker);
    }
    return this.breakers.get(source)!;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [source, breaker] of this.breakers.entries()) {
      stats[source] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Singleton instance
let circuitBreakerManagerInstance: CircuitBreakerManager | null = null;

export function getCircuitBreakerManager(): CircuitBreakerManager {
  if (!circuitBreakerManagerInstance) {
    circuitBreakerManagerInstance = new CircuitBreakerManager();
  }
  return circuitBreakerManagerInstance;
}

export function resetCircuitBreakerManager(): void {
  circuitBreakerManagerInstance = null;
}

export default getCircuitBreakerManager;

