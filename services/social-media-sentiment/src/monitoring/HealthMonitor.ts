/// <reference types="node" />
/**
 * =========================================
 * HEALTH MONITOR
 * =========================================
 * Health monitoring and status tracking for the social media sentiment service
 */

import { Logger } from '../utils/Logger';

export interface HealthStatus {
  isHealthy: boolean;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
}

export class HealthMonitor {
  private logger: Logger;
  private isInitialized: boolean = false;
  private startTime: number = Date.now();

  constructor() {
    this.logger = new Logger('HealthMonitor');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Health Monitor...');
      this.isInitialized = true;
      this.logger.info('✅ Health Monitor initialized successfully');
    } catch (error: unknown) {
      this.logger.error('❌ Failed to initialize Health Monitor', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ Health Monitor stopped successfully');
    } catch (error: unknown) {
      this.logger.error('❌ Failed to stop Health Monitor', error);
      throw error;
    }
  }

  async getHealth(): Promise<HealthStatus> {
    const memoryUsage = process.memoryUsage();

    return {
      isHealthy: this.isInitialized,
      uptime: Date.now() - this.startTime,
      memoryUsage,
      timestamp: new Date()
    };
  }

  getStatus(): string {
    return this.isInitialized ? 'Healthy' : 'Not Initialized';
  }
}
