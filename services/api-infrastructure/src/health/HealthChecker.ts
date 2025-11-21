/**
 * =========================================
 * HEALTH CHECKER
 * =========================================
 * Divine world-class health checking and service monitoring
 */

import { Logger } from '../utils/Logger';

export interface HealthConfig {
  checkInterval: number;
  unhealthyThreshold: number;
  services: {
    redis: string;
    kafka: string[];
    database: string;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    redis: { status: 'healthy' | 'unhealthy'; responseTime: number };
    kafka: { status: 'healthy' | 'unhealthy'; responseTime: number };
    database: { status: 'healthy' | 'unhealthy'; responseTime: number };
  };
  metrics: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

export interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
    kafka: boolean;
    services: boolean;
  };
}

/**
 * Advanced health checker for comprehensive service monitoring
 */
export class HealthChecker {
  private logger: Logger;
  private config: HealthConfig;
  private healthHistory: Array<{ timestamp: number; status: string }> = [];
  private lastCheckTime: number = 0;

  constructor(config: HealthConfig) {
    this.logger = new Logger('HealthChecker');
    this.config = config;
  }

  /**
   * Get overall health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Check all service dependencies
      const [redisStatus, kafkaStatus, databaseStatus] = await Promise.all([
        this.checkRedisHealth(),
        this.checkKafkaHealth(),
        this.checkDatabaseHealth(),
      ]);

      // Determine overall status
      const serviceStatuses = [redisStatus, kafkaStatus, databaseStatus];
      const unhealthyServices = serviceStatuses.filter(s => s.status === 'unhealthy');

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (unhealthyServices.length > 0) {
        overallStatus = unhealthyServices.length === serviceStatuses.length ? 'unhealthy' : 'degraded';
      }

      const totalTime = Date.now() - startTime;

      // Record health check
      this.healthHistory.push({
        timestamp: Date.now(),
        status: overallStatus,
      });

      // Keep only last 100 checks
      if (this.healthHistory.length > 100) {
        this.healthHistory.shift();
      }

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime() * 1000,
        version: '1.0.0',
        services: {
          redis: redisStatus,
          kafka: kafkaStatus,
          database: databaseStatus,
        },
        metrics: {
          totalRequests: 0, // Would be populated from metrics collector
          errorRate: 0,     // Would be populated from metrics collector
          averageResponseTime: 0, // Would be populated from metrics collector
        },
      };

    } catch (error: any) {
      this.logger.error('Health check failed', error);

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime() * 1000,
        version: '1.0.0',
        services: {
          redis: { status: 'unhealthy', responseTime: Date.now() - startTime },
          kafka: { status: 'unhealthy', responseTime: Date.now() - startTime },
          database: { status: 'unhealthy', responseTime: Date.now() - startTime },
        },
        metrics: {
          totalRequests: 0,
          errorRate: 1.0,
          averageResponseTime: 0,
        },
      };
    }
  }

  /**
   * Get readiness status (for Kubernetes readiness probes)
   */
  async getReadinessStatus(): Promise<ReadinessStatus> {
    try {
      const [redisReady, kafkaReady, databaseReady] = await Promise.all([
        this.checkRedisHealth(),
        this.checkKafkaHealth(),
        this.checkDatabaseHealth(),
      ]);

      // Service is ready if all critical dependencies are healthy
      const ready = redisReady.status === 'healthy' &&
                   kafkaReady.status === 'healthy' &&
                   databaseReady.status === 'healthy';

      return {
        ready,
        timestamp: new Date().toISOString(),
        checks: {
          database: databaseReady.status === 'healthy',
          redis: redisReady.status === 'healthy',
          kafka: kafkaReady.status === 'healthy',
          services: ready,
        },
      };

    } catch (error: any) {
      this.logger.error('Readiness check failed', error);

      return {
        ready: false,
        timestamp: new Date().toISOString(),
        checks: {
          database: false,
          redis: false,
          kafka: false,
          services: false,
        },
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedisHealth(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would connect to Redis and run a ping
      // For demo purposes, we'll simulate the check

      // Simulate Redis ping
      await new Promise(resolve => setTimeout(resolve, 10));

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
      };

    } catch (error: any) {
      this.logger.error('Redis health check failed', error);

      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Kafka health
   */
  private async checkKafkaHealth(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would connect to Kafka and check broker status
      // For demo purposes, we'll simulate the check

      // Simulate Kafka health check
      await new Promise(resolve => setTimeout(resolve, 15));

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
      };

    } catch (error: any) {
      this.logger.error('Kafka health check failed', error);

      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would connect to database and run a simple query
      // For demo purposes, we'll simulate the check

      // Simulate database health check
      await new Promise(resolve => setTimeout(resolve, 20));

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
      };

    } catch (error: any) {
      this.logger.error('Database health check failed', error);

      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get health history
   */
  getHealthHistory(limit: number = 50): Array<{ timestamp: number; status: string }> {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Get health statistics
   */
  getHealthStats(): {
    totalChecks: number;
    healthyChecks: number;
    unhealthyChecks: number;
    degradedChecks: number;
    averageCheckTime: number;
    uptimePercentage: number;
  } {
    const totalChecks = this.healthHistory.length;
    const healthyChecks = this.healthHistory.filter(h => h.status === 'healthy').length;
    const unhealthyChecks = this.healthHistory.filter(h => h.status === 'unhealthy').length;
    const degradedChecks = this.healthHistory.filter(h => h.status === 'degraded').length;

    // Calculate average check time (simplified)
    const averageCheckTime = 100; // ms

    // Calculate uptime percentage based on recent history
    const recentChecks = this.healthHistory.slice(-20); // Last 20 checks
    const recentHealthy = recentChecks.filter(h => h.status === 'healthy').length;
    const uptimePercentage = recentChecks.length > 0 ? (recentHealthy / recentChecks.length) * 100 : 100;

    return {
      totalChecks,
      healthyChecks,
      unhealthyChecks,
      degradedChecks,
      averageCheckTime,
      uptimePercentage,
    };
  }

  /**
   * Force a health check
   */
  async forceHealthCheck(): Promise<HealthStatus> {
    this.lastCheckTime = Date.now();
    return this.getHealthStatus();
  }

  /**
   * Get service dependencies status
   */
  async getDependenciesStatus(): Promise<{
    redis: { connected: boolean; latency: number };
    kafka: { connected: boolean; brokers: string[] };
    database: { connected: boolean; type: string };
  }> {
    // In a real implementation, this would check actual connections
    return {
      redis: { connected: true, latency: 10 },
      kafka: { connected: true, brokers: ['localhost:29092'] },
      database: { connected: true, type: 'mongodb' },
    };
  }
}
