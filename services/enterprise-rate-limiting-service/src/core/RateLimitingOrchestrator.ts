/**
 * =========================================
 * RATE LIMITING ORCHESTRATOR
 * =========================================
 * Orchestrates adaptive and distributed rate limiting
 */

import { Logger, createLogger } from '../utils/Logger';
import { AdaptiveRateLimiter } from './AdaptiveRateLimiter';
import { DistributedRateLimiter } from './DistributedRateLimiter';

export interface RateLimitingOrchestratorConfig {
  fallbackLimit: number;
  circuitBreakerThreshold: number;
  healthCheckInterval: number;
  metricsRetentionDays: number;
}

export interface RateLimitRequest {
  userId: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  currentLoad?: number;
  errorRate?: number;
  timestamp?: Date;
}

export interface OrchestratorResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  reason?: string;
  confidence: number;
  adaptive: boolean;
  distributed: boolean;
  latency: number;
}

export class RateLimitingOrchestrator {
  private logger: Logger;
  private config: RateLimitingOrchestratorConfig;
  private adaptiveLimiter: AdaptiveRateLimiter;
  private distributedLimiter: DistributedRateLimiter;

  // Circuit breaker state
  private circuitBreakerOpen: boolean = false;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;

  // Performance metrics
  private metrics = {
    totalRequests: 0,
    allowedRequests: 0,
    deniedRequests: 0,
    adaptiveDecisions: 0,
    distributedDecisions: 0,
    averageLatency: 0,
    circuitBreakerTrips: 0,
  };

  constructor(components: {
    adaptiveLimiter: AdaptiveRateLimiter;
    distributedLimiter: DistributedRateLimiter;
    config: RateLimitingOrchestratorConfig;
  }) {
    this.logger = createLogger('RateLimitingOrchestrator');
    this.adaptiveLimiter = components.adaptiveLimiter;
    this.distributedLimiter = components.distributedLimiter;
    this.config = components.config;
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing Rate Limiting Orchestrator...');

    // Start health monitoring
    this.startHealthMonitoring();

    this.logger.info('✅ Rate Limiting Orchestrator initialized successfully');
  }

  /**
   * Make rate limiting decision
   */
  async makeDecision(request: RateLimitRequest): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      // Check circuit breaker
      if (this.circuitBreakerOpen) {
        return this.createFallbackResult('circuit_breaker_open', startTime);
      }

      // Try adaptive rate limiting first
      let result: OrchestratorResult;

      try {
        const adaptiveDecision = await this.adaptiveLimiter.makeDecision({
          userId: request.userId,
          endpoint: request.endpoint,
          method: request.method,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          timestamp: request.timestamp || new Date(),
          currentLoad: request.currentLoad,
          errorRate: request.errorRate,
        });

        result = {
          ...adaptiveDecision,
          distributed: false,
          latency: Date.now() - startTime,
        };

        this.metrics.adaptiveDecisions++;
        this.resetCircuitBreaker();

      } catch (adaptiveError) {
        this.logger.warn('Adaptive rate limiting failed, falling back to distributed', {
          error: adaptiveError,
          userId: request.userId,
        });

        // Fallback to distributed rate limiting
        try {
          const distributedResult = await this.distributedLimiter.checkLimit(
            `${request.userId}:${request.endpoint}`,
            this.config.fallbackLimit,
            60000 // 1 minute window
          );

          result = {
            allowed: distributedResult.allowed,
            limit: distributedResult.current,
            remaining: distributedResult.remaining,
            resetTime: distributedResult.resetTime,
            reason: 'distributed_fallback',
            confidence: 0.5,
            adaptive: false,
            distributed: true,
            latency: Date.now() - startTime,
          };

          this.metrics.distributedDecisions++;

        } catch (distributedError) {
          this.logger.error('Both adaptive and distributed rate limiting failed', {
            adaptiveError,
            distributedError,
            userId: request.userId,
          });

          this.handleFailure();
          return this.createFallbackResult('all_systems_failed', startTime);
        }
      }

      // Update metrics
      this.updateMetrics(result.allowed);

      return result;

    } catch (error: any) {
      this.logger.error('Rate limiting orchestrator failed', error, {
        userId: request.userId,
        endpoint: request.endpoint,
      });

      this.handleFailure();
      return this.createFallbackResult('orchestrator_error', startTime);
    }
  }

  /**
   * Make batch rate limiting decisions
   */
  async makeBatchDecisions(requests: RateLimitRequest[]): Promise<OrchestratorResult[]> {
    const startTime = Date.now();

    try {
      const results: OrchestratorResult[] = [];

      // Process in batches to avoid overwhelming the system
      const batchSize = 100;
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(request => this.makeDecision(request))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            // Handle failed decision
            results.push(this.createFallbackResult('batch_processing_error', startTime));
          }
        });
      }

      const totalLatency = Date.now() - startTime;

      this.logger.info('Batch rate limiting completed', {
        batchSize: requests.length,
        successRate: (results.filter(r => r.confidence > 0).length / results.length * 100).toFixed(2) + '%',
        averageLatency: (totalLatency / requests.length).toFixed(2) + 'ms',
      });

      return results;

    } catch (error: any) {
      this.logger.error('Batch rate limiting failed', error, {
        batchSize: requests.length,
      });

      // Return fallback results for all requests
      return requests.map(() => this.createFallbackResult('batch_error', startTime));
    }
  }

  /**
   * Get orchestrator metrics
   */
  async getMetrics(): Promise<{
    totalRequests: number;
    allowedRequests: number;
    deniedRequests: number;
    successRate: number;
    adaptiveDecisions: number;
    distributedDecisions: number;
    averageLatency: number;
    circuitBreakerTrips: number;
    circuitBreakerStatus: 'open' | 'closed';
  }> {
    const successRate = this.metrics.totalRequests > 0 ?
      (this.metrics.allowedRequests / this.metrics.totalRequests * 100) : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      allowedRequests: this.metrics.allowedRequests,
      deniedRequests: this.metrics.deniedRequests,
      successRate,
      adaptiveDecisions: this.metrics.adaptiveDecisions,
      distributedDecisions: this.metrics.distributedDecisions,
      averageLatency: this.metrics.averageLatency,
      circuitBreakerTrips: this.metrics.circuitBreakerTrips,
      circuitBreakerStatus: this.circuitBreakerOpen ? 'open' : 'closed',
    };
  }

  /**
   * Health check for orchestrator
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, any>;
    circuitBreaker: {
      status: 'open' | 'closed';
      failureCount: number;
      lastFailureTime: number;
    };
  }> {
    try {
      const [adaptiveHealth, distributedHealth] = await Promise.all([
        this.adaptiveLimiter.healthCheck(),
        this.distributedLimiter.healthCheck(),
      ]);

      const components = {
        adaptiveLimiter: adaptiveHealth,
        distributedLimiter: distributedHealth,
      };

      // Determine overall health
      const unhealthyComponents = Object.entries(components)
        .filter(([, health]) => health.status === 'unhealthy');

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (this.circuitBreakerOpen) {
        overallStatus = 'degraded';
      }

      if (unhealthyComponents.length > 0) {
        overallStatus = unhealthyComponents.length === Object.keys(components).length ?
          'unhealthy' : 'degraded';
      }

      return {
        status: overallStatus,
        components,
        circuitBreaker: {
          status: this.circuitBreakerOpen ? 'open' : 'closed',
          failureCount: this.failureCount,
          lastFailureTime: this.lastFailureTime,
        },
      };
    } catch (error: any) {
      this.logger.error('Orchestrator health check failed', error);
      return {
        status: 'unhealthy',
        components: {},
        circuitBreaker: {
          status: 'closed',
          failureCount: this.failureCount,
          lastFailureTime: this.lastFailureTime,
        },
      };
    }
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Rate Limiting Orchestrator');
    // Components are shut down by the main service
  }

  // Private methods

  private createFallbackResult(reason: string, startTime: number): OrchestratorResult {
    return {
      allowed: true, // Allow on fallback to avoid blocking legitimate traffic
      limit: this.config.fallbackLimit,
      remaining: this.config.fallbackLimit,
      resetTime: new Date(Date.now() + 60000), // 1 minute
      reason,
      confidence: 0,
      adaptive: false,
      distributed: false,
      latency: Date.now() - startTime,
    };
  }

  private updateMetrics(allowed: boolean): void {
    this.metrics.totalRequests++;
    if (allowed) {
      this.metrics.allowedRequests++;
    } else {
      this.metrics.deniedRequests++;
    }
  }

  private handleFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Open circuit breaker if threshold exceeded
    if (this.failureCount >= this.config.circuitBreakerThreshold && !this.circuitBreakerOpen) {
      this.circuitBreakerOpen = true;
      this.metrics.circuitBreakerTrips++;
      this.logger.warn('Circuit breaker opened due to excessive failures', {
        failureCount: this.failureCount,
        threshold: this.config.circuitBreakerThreshold,
      });
    }
  }

  private resetCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      this.circuitBreakerOpen = false;
      this.failureCount = 0;
      this.logger.info('Circuit breaker reset');
    }
  }

  private startHealthMonitoring(): void {
    // Periodic health checks
    setInterval(async () => {
      try {
        const health = await this.healthCheck();
        if (health.status === 'unhealthy') {
          this.logger.warn('Orchestrator health degraded', { health });
        }
      } catch (error) {
        this.logger.error('Health monitoring failed', error);
      }
    }, this.config.healthCheckInterval);
  }
}

export default RateLimitingOrchestrator;
