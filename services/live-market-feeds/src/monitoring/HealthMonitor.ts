/**
 * =========================================
 * HEALTH MONITOR
 * =========================================
 * Monitors the health of all components in the live market data feeds system
 */

import { EventEmitter } from 'events';
import { HealthStatus } from '../types/index';
import { Logger } from '../utils/Logger'; // Import Logger

export class HealthMonitor extends EventEmitter {
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private isRunning: boolean = false;
  private checkTimer: NodeJS.Timeout | null = null;
  private lastHealthStatus: HealthStatus = {
    status: 'unhealthy',
    lastCheck: new Date(),
    checks: {},
    issues: []
  };
  private logger: Logger; // Add logger instance

  constructor() {
    super();
    this.logger = new Logger('HealthMonitor'); // Initialize logger
  }

  /**
   * Start health monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start periodic health checks
    this.checkTimer = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds

    // Initial health check
    await this.performHealthChecks();
  }

  /**
   * Stop health monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Register a health check
   */
  registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
  }

  /**
   * Unregister a health check
   */
  unregisterHealthCheck(name: string): void {
    this.healthChecks.delete(name);
  }

  /**
   * Get overall health status
   */
  getOverallHealth(): HealthStatus {
    return { ...this.lastHealthStatus };
  }

  /**
   * Perform all health checks
   */
  private async performHealthChecks(): Promise<void> {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];
    let allHealthy = true;

    for (const [name, check] of Array.from(this.healthChecks.entries())) {
      try {
        const isHealthy = await check();
        checks[name] = isHealthy;

        if (!isHealthy) {
          allHealthy = false;
          issues.push(`Health check failed: ${name}`);
        }
      } catch (error: any) {
        checks[name] = false;
        allHealthy = false;
        issues.push(`Health check error for ${name}: ${error.message}`);
      }
    }

    const status = allHealthy ? 'healthy' :
                  issues.length < this.healthChecks.size / 2 ? 'degraded' : 'unhealthy';

    this.lastHealthStatus = {
      status,
      lastCheck: new Date(),
      checks,
      issues
    };

    this.emit('healthStatusChanged', this.lastHealthStatus);

    if (!allHealthy) {
      this.emit('healthIssues', issues);
      this.logger.warn(`Health issues detected: ${issues.join(', ')}`); // Log health issues
    }
  }

  /**
   * Get health check results
   */
  getHealthChecks(): Record<string, boolean> {
    return { ...this.lastHealthStatus.checks };
  }
}
