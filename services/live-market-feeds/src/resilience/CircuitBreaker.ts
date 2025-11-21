/**
 * =========================================
 * CIRCUIT BREAKER
 * =========================================
 * Implements circuit breaker pattern for fault tolerance
 * in the live market data feeds system
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker extends EventEmitter {
  private logger: Logger;
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: Date = new Date();
  private nextAttempt: Date = new Date();
  private monitoringTimer: NodeJS.Timeout | null = null;

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
    this.logger = new Logger('CircuitBreaker');
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (new Date() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      } else {
        this.state = 'half-open';
        this.logger.info('Circuit breaker transitioning to half-open state');
        this.emit('stateChanged', 'half-open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if the circuit breaker allows execution
   */
  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      return new Date() >= this.nextAttempt;
    }

    // Half-open state - allow limited attempts
    return true;
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): any {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      failureThreshold: this.config.failureThreshold,
      successThreshold: this.config.successThreshold
    };
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successCount++;

    if (this.state === 'half-open') {
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed';
        this.resetCounters();
        this.logger.info('Circuit breaker closed after successful recovery');
        this.emit('stateChanged', 'closed');
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttempt = new Date(Date.now() + this.config.timeout);
      this.logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
      this.emit('stateChanged', 'open');
    } else if (this.state === 'half-open') {
      // Any failure in half-open state goes back to open
      this.state = 'open';
      this.nextAttempt = new Date(Date.now() + this.config.timeout);
      this.logger.warn('Circuit breaker returned to open state after failure in half-open');
      this.emit('stateChanged', 'open');
    }
  }

  /**
   * Reset counters
   */
  private resetCounters(): void {
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Start monitoring (if needed for periodic state checks)
   */
  startMonitoring(): void {
    // Could implement periodic state validation if needed
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
  }
}
