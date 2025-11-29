/**
 * =========================================
 * RETRY MANAGER
 * =========================================
 * Divine world-class retry logic with exponential backoff
 * Intelligent retry strategies for notification delivery
 */

// Note: Logger import would be uncommented when Logger is implemented
// import { Logger } from '@/utils/Logger';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

/**
 * Retry attempt result
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'timeout',
    'rate_limited',
    'temporary_failure',
    'service_unavailable',
  ],
};

/**
 * Retry manager for notification delivery
 */
export class RetryManager {
  private logger: any; // Logger
  private config: RetryConfig;

  constructor(config: RetryConfig = DEFAULT_RETRY_CONFIG) {
    // this.logger = new Logger('RetryManager'); // Commented out until Logger implemented
    this.config = config;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Note: Logger calls commented out until Logger is implemented
        // this.logger.debug('Executing operation attempt', {
        //   attempt: attempt + 1,
        //   maxRetries: this.config.maxRetries,
        //   context,
        // });

        const result = await operation();
        const totalTime = Date.now() - startTime;

        if (attempt > 0) {
        // this.logger.info('Operation succeeded after retries', { // Commented out until Logger implemented
        //   attempts: attempt + 1,
        //   totalTime,
        //   context,
        // });
        }

        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalTime,
        };

      } catch (error: any) {
        lastError = error;

        // Note: Logger calls commented out until Logger is implemented
        // this.logger.warn('Operation attempt failed', {
        //   attempt: attempt + 1,
        //   error: error.message,
        //   context,
        // });

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt >= this.config.maxRetries) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);

        // Note: Logger calls commented out until Logger is implemented
        // this.logger.debug('Waiting before retry', {
        //   delay,
        //   attempt: attempt + 1,
        //   context,
        // });

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    const totalTime = Date.now() - startTime;

        // Note: Logger calls commented out until Logger is implemented
        // this.logger.error('Operation failed after all retries', { // Commented out until Logger implemented
        //   attempts: this.config.maxRetries + 1,
        //   totalTime,
        //   lastError: lastError?.message,
        //   context,
        // });

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: this.config.maxRetries + 1,
      totalTime,
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code;

    return this.config.retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase()) ||
      errorCode === retryableError
    );
  }

  /**
   * Calculate delay for retry attempt
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ attempt)
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);

    // Cap at maxDelay
    delay = Math.min(delay, this.config.maxDelay);

    // Add jitter if enabled
    if (this.config.jitter) {
      // Add random jitter up to 25% of delay
      const jitterAmount = delay * 0.25 * Math.random();
      delay += jitterAmount;
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Circuit breaker for notification providers
 */
export class CircuitBreaker {
  private logger: any; // Logger
  private failureThreshold: number;
  private resetTimeout: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    failureThreshold: number = 5,
    resetTimeout: number = 60000 // 1 minute
  ) {
    // this.logger = new Logger('CircuitBreaker'); // Commented out until Logger implemented
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    // Check if circuit breaker is open
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
        // this.logger.info('Circuit breaker transitioning to half-open', { context }); // Commented out until Logger implemented
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();

      // Success - reset failure count and close circuit
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
        // this.logger.info('Circuit breaker closed after successful operation', { context }); // Commented out until Logger implemented
      }

      return result;

    } catch (error: any) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        // this.logger.warn('Circuit breaker opened due to failures', { // Commented out until Logger implemented
        //   failureCount: this.failureCount,
        //   context,
        // });
      }

      throw error;
    }
  }

  /**
   * Get circuit breaker state
   */
  getState(): {
    state: string;
    failureCount: number;
    lastFailureTime: number;
    isOpen: boolean;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      isOpen: this.state === 'open',
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    // this.logger.info('Circuit breaker manually reset'); // Commented out until Logger implemented
  }
}
