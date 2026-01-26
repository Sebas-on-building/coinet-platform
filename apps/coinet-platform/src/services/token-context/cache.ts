/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💾 TOKEN CONTEXT CACHE - TTL-Based Module Caching                         ║
 * ║                                                                               ║
 * ║   Caches token data with per-module TTLs to reduce API calls.                 ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready caching layer                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import { ModuleResult, ChainId } from './types';

// ============================================================================
// TTL CONFIGURATION (in seconds)
// ============================================================================

export const MODULE_TTL: Record<string, number> = {
  dexscreener: 60,      // 1 minute - prices change fast
  security: 900,        // 15 minutes - security rarely changes
  holders: 300,         // 5 minutes - holder data changes slowly
  pumpfun: 30,          // 30 seconds - pump.fun is volatile
  smartMoney: 180,      // 3 minutes - smart money activity
  resolved: 3600,       // 1 hour - resolution rarely changes
};

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
  key: string;
}

class TokenContextCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxEntries: number = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Generate cache key for a module
   */
  private buildKey(module: string, address: string, chain: ChainId): string {
    return `${module}:${chain}:${address.toLowerCase()}`;
  }
  
  /**
   * Get cached module result
   */
  get<T>(module: string, address: string, chain: ChainId): ModuleResult<T> | null {
    const key = this.buildKey(module, address, chain);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    if (now > entry.timestamp + entry.ttlMs) {
      this.cache.delete(key);
      logger.debug('💾 Cache expired', { module, address: address.slice(0, 8), chain });
      return null;
    }
    
    logger.debug('💾 Cache hit', { 
      module, 
      address: address.slice(0, 8), 
      chain,
      ageMs: now - entry.timestamp,
    });
    
    return entry.data;
  }
  
  /**
   * Set cached module result
   */
  set<T>(
    module: string, 
    address: string, 
    chain: ChainId, 
    result: ModuleResult<T>
  ): void {
    const key = this.buildKey(module, address, chain);
    const ttlSeconds = MODULE_TTL[module] || 60;
    
    // Enforce max entries (LRU-style eviction)
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttlMs: ttlSeconds * 1000,
      key,
    });
    
    logger.debug('💾 Cache set', { 
      module, 
      address: address.slice(0, 8), 
      chain,
      ttlSeconds,
    });
  }
  
  /**
   * Check if cache entry exists and is valid
   */
  has(module: string, address: string, chain: ChainId): boolean {
    const key = this.buildKey(module, address, chain);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    const now = Date.now();
    if (now > entry.timestamp + entry.ttlMs) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Invalidate cache for an address
   */
  invalidate(address: string, chain?: ChainId): void {
    const prefix = chain ? `${chain}:${address.toLowerCase()}` : address.toLowerCase();
    
    let deleted = 0;
    for (const [key] of this.cache) {
      if (key.includes(prefix)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    if (deleted > 0) {
      logger.debug('💾 Cache invalidated', { address: address.slice(0, 8), chain, deleted });
    }
  }
  
  /**
   * Invalidate a specific module for an address
   */
  invalidateModule(module: string, address: string, chain: ChainId): void {
    const key = this.buildKey(module, address, chain);
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('💾 Cache cleared', { entriesCleared: size });
  }
  
  /**
   * Get cache statistics
   */
  stats(): { entries: number; modules: Record<string, number> } {
    const modules: Record<string, number> = {};
    
    for (const [key] of this.cache) {
      const module = key.split(':')[0];
      modules[module] = (modules[module] || 0) + 1;
    }
    
    return {
      entries: this.cache.size,
      modules,
    };
  }
  
  /**
   * Evict oldest entries (simple LRU)
   */
  private evictOldest(): void {
    let oldest: { key: string; timestamp: number } | null = null;
    
    for (const [key, entry] of this.cache) {
      if (!oldest || entry.timestamp < oldest.timestamp) {
        oldest = { key, timestamp: entry.timestamp };
      }
    }
    
    if (oldest) {
      this.cache.delete(oldest.key);
      logger.debug('💾 Cache evicted oldest', { key: oldest.key });
    }
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.timestamp + entry.ttlMs) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('💾 Cache cleanup', { cleaned, remaining: this.cache.size });
    }
  }
  
  /**
   * Destroy cache (cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instance
export const tokenContextCache = new TokenContextCache();
