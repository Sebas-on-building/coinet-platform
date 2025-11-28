/**
 * Health Check System
 */

import { DatabaseManager } from '../database/DatabaseManager';
import { CacheManager } from '../cache/CacheManager';
import { AlchemyClientManager } from '../clients/AlchemyClient';
import { createLogger } from '../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  components: {
    database: ComponentHealth;
    cache: ComponentHealth;
    alchemy: ComponentHealth;
    webhook: ComponentHealth;
  };
  metrics?: any;
}

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  message?: string;
  latency?: number;
  details?: any;
}

export class HealthCheck {
  private logger: any;
  private db: DatabaseManager;
  private cache: CacheManager;
  private alchemyClients: AlchemyClientManager;
  private startTime: number;

  constructor(
    db: DatabaseManager,
    cache: CacheManager,
    alchemyClients: AlchemyClientManager
  ) {
    this.logger = createLogger({ component: 'HealthCheck' });
    this.db = db;
    this.cache = cache;
    this.alchemyClients = alchemyClients;
    this.startTime = Date.now();
  }

  /**
   * Perform full health check
   */
  async check(): Promise<HealthStatus> {
    this.logger.debug('Performing health check');

    const [dbHealth, cacheHealth, alchemyHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
      this.checkAlchemy(),
    ]);

    // Determine overall status
    const components = [dbHealth, cacheHealth, alchemyHealth];
    const status = this.determineOverallStatus(components);

    const health: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      components: {
        database: dbHealth,
        cache: cacheHealth,
        alchemy: alchemyHealth,
        webhook: { status: 'up' }, // Simplified
      },
    };

    this.logger.info('Health check completed', {
      status,
      dbStatus: dbHealth.status,
      cacheStatus: cacheHealth.status,
      alchemyStatus: alchemyHealth.status,
    });

    return health;
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.db.healthCheck();
      const latency = Date.now() - startTime;

      if (!isHealthy) {
        return {
          status: 'down',
          message: 'Database connection failed',
          latency,
        };
      }

      // Check if latency is acceptable
      if (latency > 1000) {
        return {
          status: 'degraded',
          message: 'Database responding slowly',
          latency,
        };
      }

      return {
        status: 'up',
        message: 'Database connected',
        latency,
      };
    } catch (error: any) {
      return {
        status: 'down',
        message: error.message,
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCache(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.cache.healthCheck();
      const latency = Date.now() - startTime;

      if (!isHealthy) {
        return {
          status: 'down',
          message: 'Redis connection failed',
          latency,
        };
      }

      // Get cache stats
      const stats = await this.cache.getStats();

      if (latency > 500) {
        return {
          status: 'degraded',
          message: 'Redis responding slowly',
          latency,
          details: stats,
        };
      }

      return {
        status: 'up',
        message: 'Redis connected',
        latency,
        details: stats,
      };
    } catch (error: any) {
      return {
        status: 'down',
        message: error.message,
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Alchemy clients health
   */
  private async checkAlchemy(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const chains = this.alchemyClients.getActiveChains();
      const chainHealths: Record<string, any> = {};

      for (const chain of chains) {
        const client = this.alchemyClients.getClient(chain);
        const metrics = client.getMetrics();
        
        chainHealths[chain] = {
          circuitBreakerState: metrics.circuitBreakerState,
          requests: metrics.requests,
          errors: metrics.errors,
        };
      }

      const latency = Date.now() - startTime;

      return {
        status: 'up',
        message: `${chains.length} chains connected`,
        latency,
        details: chainHealths,
      };
    } catch (error: any) {
      return {
        status: 'down',
        message: error.message,
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Determine overall health status
   * For Railway compatibility: treat missing DB/cache as degraded, not unhealthy
   * Service can run without these components
   */
  private determineOverallStatus(components: ComponentHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    const hasDown = components.some(c => c.status === 'down');
    const hasDegraded = components.some(c => c.status === 'degraded');

    // If only DB or cache is down, treat as degraded (service can still function)
    // Only mark unhealthy if critical components (like Alchemy clients) are down
    const criticalComponents = components.filter((_, index) => {
      // Index 0 = DB, Index 1 = Cache, Index 2 = Alchemy
      // Alchemy is critical, DB/Cache are optional
      return index === 2; // Alchemy clients
    });
    const criticalDown = criticalComponents.some(c => c.status === 'down');
    
    if (criticalDown) return 'unhealthy';
    if (hasDown || hasDegraded) return 'degraded';
    return 'healthy';
  }

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Liveness probe (simple check)
   */
  async liveness(): Promise<boolean> {
    return true; // Process is running
  }

  /**
   * Readiness probe (can serve traffic)
   */
  async readiness(): Promise<boolean> {
    try {
      const dbHealthy = await this.db.healthCheck();
      const cacheHealthy = await this.cache.healthCheck();
      return dbHealthy && cacheHealthy;
    } catch (error) {
      return false;
    }
  }
}

export default HealthCheck;

