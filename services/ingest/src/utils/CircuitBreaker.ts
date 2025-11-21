// =============================================================================
// COINET AI - CIRCUIT BREAKER PATTERN
// Resilient service communication with automatic failure recovery
// =============================================================================

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  threshold?: number;          // Number of failures before opening
  timeout?: number;            // Time to wait before trying half-open
  resetTimeout?: number;       // Time to reset failure count
  monitoringPeriod?: number;   // Period to monitor success rate
  minimumRequests?: number;    // Minimum requests before evaluating
  errorThresholdPercentage?: number; // Error percentage to trip
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailTime?: number;
  lastSuccessTime?: number;
  consecutiveFailures: number;
  errorRate: number;
}

export class CircuitBreaker<T = any> {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private totalRequests = 0;
  private consecutiveFailures = 0;
  private lastFailTime?: number;
  private lastSuccessTime?: number;
  private halfOpenRequests = 0;
  private readonly maxHalfOpenRequests = 3;
  
  private readonly threshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;
  private readonly monitoringPeriod: number;
  private readonly minimumRequests: number;
  private readonly errorThresholdPercentage: number;
  
  private requestTimestamps: number[] = [];
  private errorTimestamps: number[] = [];

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 1 minute
    this.minimumRequests = options.minimumRequests || 10;
    this.errorThresholdPercentage = options.errorThresholdPercentage || 50;
  }

  async execute<R = T>(fn: () => Promise<R>): Promise<R> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new Error(`Circuit breaker '${this.name}' is OPEN. Service is unavailable.`);
      }
    }

    // In HALF_OPEN state, limit concurrent requests
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenRequests >= this.maxHalfOpenRequests) {
        throw new Error(`Circuit breaker '${this.name}' is testing recovery. Please retry later.`);
      }
      this.halfOpenRequests++;
    }

    const startTime = Date.now();
    
    try {
      const result = await fn();
      this.onSuccess(startTime);
      return result;
    } catch (error) {
      this.onFailure(startTime, error);
      throw error;
    } finally {
      if (this.state === CircuitState.HALF_OPEN) {
        this.halfOpenRequests--;
      }
    }
  }

  private onSuccess(startTime: number): void {
    const now = Date.now();
    const duration = now - startTime;
    
    this.totalRequests++;
    this.successes++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = now;
    this.requestTimestamps.push(now);
    
    // Clean up old timestamps
    this.cleanupTimestamps(now);

    if (this.state === CircuitState.HALF_OPEN) {
      console.log(`🔄 Circuit breaker '${this.name}' successful test in HALF_OPEN state`);
      if (this.halfOpenRequests === 0) {
        // All test requests succeeded, close the circuit
        this.transitionToClosed();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count after successful requests
      if (this.failures > 0 && (now - (this.lastFailTime || 0)) > this.resetTimeout) {
        this.failures = 0;
      }
    }

    this.logMetrics(duration, true);
  }

  private onFailure(startTime: number, error: any): void {
    const now = Date.now();
    const duration = now - startTime;
    
    this.totalRequests++;
    this.failures++;
    this.consecutiveFailures++;
    this.lastFailTime = now;
    this.requestTimestamps.push(now);
    this.errorTimestamps.push(now);
    
    // Clean up old timestamps
    this.cleanupTimestamps(now);

    console.error(`❌ Circuit breaker '${this.name}' recorded failure:`, 
      error instanceof Error ? error.message : 'Unknown error');

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN state reopens the circuit
      this.transitionToOpen('Failure during recovery test');
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.transitionToOpen('Threshold exceeded');
      }
    }

    this.logMetrics(duration, false);
  }

  private shouldOpen(): boolean {
    // Check consecutive failures threshold
    if (this.consecutiveFailures >= this.threshold) {
      return true;
    }

    // Check error rate threshold
    const recentRequests = this.getRecentRequestCount();
    if (recentRequests >= this.minimumRequests) {
      const errorRate = this.calculateErrorRate();
      if (errorRate >= this.errorThresholdPercentage) {
        return true;
      }
    }

    return false;
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailTime) return true;
    return Date.now() - this.lastFailTime >= this.timeout;
  }

  private transitionToOpen(reason: string): void {
    this.state = CircuitState.OPEN;
    console.error(`🔴 Circuit breaker '${this.name}' is now OPEN. Reason: ${reason}`);
    console.error(`   Failures: ${this.failures}, Consecutive: ${this.consecutiveFailures}`);
    console.error(`   Error rate: ${this.calculateErrorRate().toFixed(2)}%`);
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenRequests = 0;
    console.log(`🟡 Circuit breaker '${this.name}' is now HALF_OPEN. Testing recovery...`);
  }

  private transitionToClosed(): void {
    const wasOpen = this.state !== CircuitState.CLOSED;
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.consecutiveFailures = 0;
    
    if (wasOpen) {
      console.log(`🟢 Circuit breaker '${this.name}' is now CLOSED. Service recovered.`);
    }
  }

  private cleanupTimestamps(now: number): void {
    const cutoff = now - this.monitoringPeriod;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > cutoff);
    this.errorTimestamps = this.errorTimestamps.filter(ts => ts > cutoff);
  }

  private getRecentRequestCount(): number {
    const now = Date.now();
    const cutoff = now - this.monitoringPeriod;
    return this.requestTimestamps.filter(ts => ts > cutoff).length;
  }

  private calculateErrorRate(): number {
    const recentRequests = this.getRecentRequestCount();
    if (recentRequests === 0) return 0;
    
    const now = Date.now();
    const cutoff = now - this.monitoringPeriod;
    const recentErrors = this.errorTimestamps.filter(ts => ts > cutoff).length;
    
    return (recentErrors / recentRequests) * 100;
  }

  private logMetrics(duration: number, success: boolean): void {
    if (this.totalRequests % 100 === 0) {
      console.log(`📊 Circuit breaker '${this.name}' metrics:`);
      console.log(`   State: ${this.state}`);
      console.log(`   Total requests: ${this.totalRequests}`);
      console.log(`   Success rate: ${((this.successes / this.totalRequests) * 100).toFixed(2)}%`);
      console.log(`   Recent error rate: ${this.calculateErrorRate().toFixed(2)}%`);
      console.log(`   Last request: ${success ? '✅ Success' : '❌ Failure'} (${duration}ms)`);
    }
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailTime: this.lastFailTime,
      lastSuccessTime: this.lastSuccessTime,
      consecutiveFailures: this.consecutiveFailures,
      errorRate: this.calculateErrorRate(),
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.consecutiveFailures = 0;
    this.lastFailTime = undefined;
    this.lastSuccessTime = undefined;
    this.halfOpenRequests = 0;
    this.requestTimestamps = [];
    this.errorTimestamps = [];
    console.log(`🔄 Circuit breaker '${this.name}' has been manually reset`);
  }

  forceOpen(): void {
    this.transitionToOpen('Manually forced open');
  }

  forceClosed(): void {
    this.transitionToClosed();
  }
}

// =============================================================================
// CIRCUIT BREAKER FACTORY
// =============================================================================

export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>();

  static create<T = any>(
    name: string,
    options?: CircuitBreakerOptions
  ): CircuitBreaker<T> {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker<T>(name, options));
    }
    return this.breakers.get(name) as CircuitBreaker<T>;
  }

  static get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  static getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  static reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }

  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  static getMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });
    return metrics;
  }
}

export default CircuitBreaker;
