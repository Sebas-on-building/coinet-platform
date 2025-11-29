/**
 * =========================================
 * CACHE MANAGER
 * =========================================
 * Caching layer for the signal evaluation engine
 */

import NodeCache from 'node-cache';
import { Logger } from '../utils/Logger';

export class CacheManager {
  private cache!: NodeCache;
  private logger: Logger;
  private isInitialized: boolean = false;
  private defaultTtl: number;

  constructor(defaultTtl: number = 300) {
    this.logger = new Logger('CacheManager');
    this.defaultTtl = defaultTtl;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Cache Manager...');
      this.cache = new (NodeCache as any)({
        stdTTL: this.defaultTtl,
        checkperiod: this.defaultTtl * 0.2,
        useClones: false
      });
      this.isInitialized = true;
      this.logger.info('✅ Cache Manager initialized successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Cache Manager', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.cache) {
        this.cache.close();
      }
      this.isInitialized = false;
      this.logger.info('✅ Cache Manager stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Cache Manager', error);
      throw error;
    }
  }

  set(key: string, value: any, ttl?: number): boolean {
    if (!this.isInitialized || !this.cache) {
      return false;
    }
    return this.cache.set(key, value, ttl || this.defaultTtl);
  }

  get<T = any>(key: string): T | undefined {
    if (!this.isInitialized || !this.cache) {
      return undefined;
    }
    return this.cache.get<T>(key);
  }

  del(key: string): number {
    if (!this.isInitialized || !this.cache) {
      return 0;
    }
    return this.cache.del(key);
  }

  has(key: string): boolean {
    if (!this.isInitialized || !this.cache) {
      return false;
    }
    return this.cache.has(key);
  }

  getStats(): NodeCache.Stats | undefined {
    if (!this.isInitialized || !this.cache) {
      return undefined;
    }
    return this.cache.getStats();
  }

  async isConnected(): Promise<boolean> {
    return this.isInitialized;
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
