/**
 * =========================================
 * HEALTH MONITOR
 * =========================================
 * Monitors the health of all components in the on-chain monitoring system
 */

import { EventEmitter } from 'events';
import { HealthStatus, ChainType, NodeHealth } from '../types';
import { Logger } from '../utils/Logger';

export class HealthMonitor extends EventEmitter {
  private logger: Logger;
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private nodeHealth: Map<string, NodeHealth> = new Map();
  private isRunning: boolean = false;
  private checkTimer: NodeJS.Timeout | null = null;
  private lastHealthStatus: HealthStatus = {
    status: 'unhealthy',
    lastCheck: new Date(),
    checks: {},
    issues: []
  };

  constructor() {
    super();
    this.logger = new Logger('HealthMonitor');
  }

  /**
   * Initialize the health monitor
   */
  async initialize(): Promise<void> {
    await this.start();
    this.logger.info('✅ Health Monitor initialized');
  }

  /**
   * Start health monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('🏥 Starting Health Monitor...');

    // Start periodic health checks
    this.checkTimer = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds

    // Initial health check
    await this.performHealthChecks();

    this.isRunning = true;
    this.logger.info('✅ Health Monitor started');
  }

  /**
   * Stop health monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('🏥 Stopping Health Monitor...');

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    this.isRunning = false;
    this.logger.info('✅ Health Monitor stopped');
  }

  /**
   * Register a health check
   */
  registerHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
    this.logger.debug(`✅ Registered health check: ${name}`);
  }

  /**
   * Unregister a health check
   */
  unregisterHealthCheck(name: string): void {
    this.healthChecks.delete(name);
    this.logger.debug(`🗑️ Unregistered health check: ${name}`);
  }

  /**
   * Update node health
   */
  updateNodeHealth(nodeHealth: NodeHealth): void {
    this.nodeHealth.set(nodeHealth.providerId, nodeHealth);
  }

  /**
   * Get node health
   */
  getNodeHealth(providerId: string): NodeHealth | null {
    return this.nodeHealth.get(providerId) || null;
  }

  /**
   * Get all node health
   */
  getAllNodeHealth(): Map<string, NodeHealth> {
    return new Map(this.nodeHealth);
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

    // Check registered health checks
    for (const [name, check] of this.healthChecks.entries()) {
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

    // Check node health
    let nodeHealthScore = 0;
    const totalNodes = this.nodeHealth.size;
    if (totalNodes > 0) {
      for (const nodeHealth of this.nodeHealth.values()) {
        if (nodeHealth.isHealthy) {
          nodeHealthScore++;
        }
      }
      nodeHealthScore = (nodeHealthScore / totalNodes) * 100;
    }

    checks['node_health'] = nodeHealthScore >= 80;
    if (nodeHealthScore < 80) {
      issues.push(`Node health score too low: ${nodeHealthScore}%`);
    }

    const status = allHealthy && nodeHealthScore >= 80 ? 'healthy' :
                  (allHealthy || nodeHealthScore >= 50) ? 'degraded' : 'unhealthy';

    this.lastHealthStatus = {
      status,
      lastCheck: new Date(),
      checks,
      issues
    };

    this.emit('healthStatusChanged', this.lastHealthStatus);

    if (!allHealthy || nodeHealthScore < 80) {
      this.emit('healthIssues', issues);
      this.logger.warn(`Health issues detected: ${issues.join(', ')}`);
    }
  }

  /**
   * Get health check results
   */
  getHealthChecks(): Record<string, boolean> {
    return { ...this.lastHealthStatus.checks };
  }

  /**
   * Get monitor status
   */
  getStatus(): string {
    return this.isRunning ? 'Running' : 'Stopped';
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<any> {
    await this.performHealthChecks();

    return {
      status: this.lastHealthStatus.status,
      issues: this.lastHealthStatus.issues,
      checks: this.lastHealthStatus.checks,
      nodeHealthCount: this.nodeHealth.size,
      lastCheck: this.lastHealthStatus.lastCheck,
      uptime: process.uptime()
    };
  }
}
