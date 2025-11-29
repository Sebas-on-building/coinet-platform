/**
 * ============================================
 * ENHANCED KEY ROTATION SYSTEM
 * ============================================
 * 
 * Enterprise-grade API key management with:
 * - Auto-rotation on rate limit errors
 * - Intelligent backoff strategies
 * - Cross-provider failover
 * - Real-time health monitoring
 * - Automatic recovery mechanisms
 * 
 * Security Level: Enterprise-Grade
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';
import { getPrometheusMetrics } from '../monitoring/prometheus-metrics';
import * as crypto from 'crypto';

/**
 * Enhanced API Key configuration
 */
export interface EnhancedAPIKeyConfig {
  provider: string;
  key: string;
  tier: 'free' | 'pro' | 'enterprise';
  environment: 'production' | 'staging' | 'development';
  expiresAt?: Date;
  maxUsage?: number;
  rateLimitPerMinute?: number;
  metadata?: Record<string, any>;
}

/**
 * Key health status
 */
export interface KeyHealthStatus {
  keyHash: string;
  provider: string;
  healthy: boolean;
  successRate: number;
  rateLimitErrorRate: number;
  avgLatencyMs: number;
  lastUsed: Date;
  cooldownUntil?: Date;
  issues: string[];
}

/**
 * Rate limit event
 */
export interface RateLimitEvent {
  provider: string;
  keyHash: string;
  timestamp: Date;
  retryAfterMs?: number;
  httpStatus?: number;
}

/**
 * Auto-rotation configuration
 */
export interface AutoRotationConfig {
  enabled: boolean;
  rateLimitThreshold: number; // Rotate after X consecutive rate limits
  errorRateThreshold: number; // Rotate if error rate > X%
  cooldownPeriodMs: number;   // Cooldown after rotation
  minHealthyKeys: number;     // Minimum healthy keys before alerting
}

/**
 * Enhanced Key Rotation Manager
 */
export class EnhancedKeyRotationManager extends EventEmitter {
  private keys: Map<string, EnhancedAPIKeyConfig[]> = new Map();
  private currentKeyIndex: Map<string, number> = new Map();
  private keyHealth: Map<string, KeyHealthStatus> = new Map();
  private consecutiveRateLimits: Map<string, number> = new Map();
  private latencyHistory: Map<string, number[]> = new Map();
  private rotationHistory: Map<string, Date[]> = new Map();
  
  private readonly config: AutoRotationConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly metrics = getPrometheusMetrics();

  constructor(config?: Partial<AutoRotationConfig>) {
    super();
    
    this.config = {
      enabled: config?.enabled ?? true,
      rateLimitThreshold: config?.rateLimitThreshold ?? 3,
      errorRateThreshold: config?.errorRateThreshold ?? 20,
      cooldownPeriodMs: config?.cooldownPeriodMs ?? 60000,
      minHealthyKeys: config?.minHealthyKeys ?? 1,
    };

    // Register additional metrics
    this.registerMetrics();
    
    logger.info('🔐 Enhanced Key Rotation Manager initialized', {
      autoRotationEnabled: this.config.enabled,
      rateLimitThreshold: this.config.rateLimitThreshold,
    });
  }

  /**
   * Register Prometheus metrics for key rotation
   */
  private registerMetrics(): void {
    this.metrics.register({
      name: 'key_rotation_total',
      help: 'Total number of key rotations',
      type: 'counter',
      labels: ['provider', 'reason'],
    });

    this.metrics.register({
      name: 'key_rate_limit_errors_total',
      help: 'Total number of rate limit errors',
      type: 'counter',
      labels: ['provider'],
    });

    this.metrics.register({
      name: 'key_health_score',
      help: 'Current key health score (0-100)',
      type: 'gauge',
      labels: ['provider', 'key_hash'],
    });

    this.metrics.register({
      name: 'active_keys_count',
      help: 'Number of active healthy keys',
      type: 'gauge',
      labels: ['provider'],
    });

    this.metrics.register({
      name: 'key_cooldown_active',
      help: 'Whether a key is in cooldown (1=yes, 0=no)',
      type: 'gauge',
      labels: ['provider', 'key_hash'],
    });
  }

  /**
   * Initialize with keys
   */
  async initialize(keyConfigs: EnhancedAPIKeyConfig[]): Promise<void> {
    logger.info('🔐 Initializing Enhanced Key Rotation...');

    for (const config of keyConfigs) {
      this.addKey(config);
    }

    // Start health monitoring
    this.startHealthMonitoring();

    logger.info('✅ Enhanced Key Rotation initialized', {
      providers: Array.from(this.keys.keys()),
      totalKeys: keyConfigs.length,
    });

    this.emit('initialized', {
      providers: Array.from(this.keys.keys()),
      keyCount: keyConfigs.length,
    });
  }

  /**
   * Add a new API key
   */
  addKey(config: EnhancedAPIKeyConfig): void {
    const provider = config.provider.toLowerCase();
    
    if (!this.keys.has(provider)) {
      this.keys.set(provider, []);
      this.currentKeyIndex.set(provider, 0);
    }

    this.keys.get(provider)!.push(config);

    const keyHash = this.hashKey(config.key);
    
    // Initialize health status
    this.keyHealth.set(keyHash, {
      keyHash,
      provider,
      healthy: true,
      successRate: 100,
      rateLimitErrorRate: 0,
      avgLatencyMs: 0,
      lastUsed: new Date(),
      issues: [],
    });

    this.consecutiveRateLimits.set(keyHash, 0);
    this.latencyHistory.set(keyHash, []);

    // Update metrics
    this.updateKeyMetrics(provider);

    logger.info('Key added', { 
      provider, 
      tier: config.tier,
      keyHash: keyHash.substring(0, 8),
    });
  }

  /**
   * Get current active key with health check
   */
  getCurrentKey(provider: string): EnhancedAPIKeyConfig | null {
    const providerKeys = this.keys.get(provider.toLowerCase());
    if (!providerKeys || providerKeys.length === 0) {
      logger.warn(`No keys available for provider: ${provider}`);
      return null;
    }

    const currentIndex = this.currentKeyIndex.get(provider.toLowerCase()) || 0;
    let key = providerKeys[currentIndex];
    const keyHash = this.hashKey(key.key);
    const health = this.keyHealth.get(keyHash);

    // Check if key is in cooldown
    if (health?.cooldownUntil && health.cooldownUntil > new Date()) {
      logger.debug(`Key ${keyHash.substring(0, 8)} in cooldown, trying next`);
      
      // Find next healthy key
      for (let i = 0; i < providerKeys.length; i++) {
        const nextIndex = (currentIndex + i + 1) % providerKeys.length;
        const nextKey = providerKeys[nextIndex];
        const nextKeyHash = this.hashKey(nextKey.key);
        const nextHealth = this.keyHealth.get(nextKeyHash);
        
        if (!nextHealth?.cooldownUntil || nextHealth.cooldownUntil <= new Date()) {
          this.currentKeyIndex.set(provider.toLowerCase(), nextIndex);
          key = nextKey;
          break;
        }
      }
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      logger.warn(`Key expired for ${provider}, rotating...`);
      this.rotateKey(provider, 'expired');
      return this.getCurrentKey(provider);
    }

    return key;
  }

  /**
   * Record successful API call
   */
  recordSuccess(provider: string, latencyMs: number): void {
    const key = this.getCurrentKey(provider);
    if (!key) return;

    const keyHash = this.hashKey(key.key);
    const health = this.keyHealth.get(keyHash);

    if (health) {
      // Reset consecutive rate limits on success
      this.consecutiveRateLimits.set(keyHash, 0);

      // Update latency history
      const history = this.latencyHistory.get(keyHash) || [];
      history.push(latencyMs);
      if (history.length > 100) history.shift();
      this.latencyHistory.set(keyHash, history);

      // Calculate avg latency
      health.avgLatencyMs = history.reduce((a, b) => a + b, 0) / history.length;
      health.lastUsed = new Date();

      // Recalculate success rate (simple moving average)
      health.successRate = Math.min(100, health.successRate * 0.99 + 1);
      health.rateLimitErrorRate = Math.max(0, health.rateLimitErrorRate * 0.99);

      this.keyHealth.set(keyHash, health);
    }

    // Update metrics
    this.metrics.incCounter('api_requests_total', { provider, status: 'success' });
    this.metrics.observeHistogram('api_request_duration_seconds', latencyMs / 1000, { provider });
  }

  /**
   * Record rate limit error with auto-rotation
   */
  recordRateLimitError(provider: string, retryAfterMs?: number): void {
    const key = this.getCurrentKey(provider);
    if (!key) return;

    const keyHash = this.hashKey(key.key);
    const health = this.keyHealth.get(keyHash);

    if (health) {
      // Increment consecutive rate limits
      const consecutive = (this.consecutiveRateLimits.get(keyHash) || 0) + 1;
      this.consecutiveRateLimits.set(keyHash, consecutive);

      // Update health
      health.rateLimitErrorRate = Math.min(100, health.rateLimitErrorRate * 0.9 + 10);
      health.lastUsed = new Date();

      // Add issue
      if (!health.issues.includes('rate_limit')) {
        health.issues.push('rate_limit');
      }

      this.keyHealth.set(keyHash, health);

      logger.warn(`Rate limit hit for ${provider}`, {
        keyHash: keyHash.substring(0, 8),
        consecutive,
        retryAfterMs,
      });

      // Update metrics
      this.metrics.incCounter('key_rate_limit_errors_total', { provider });

      // Auto-rotate if threshold exceeded
      if (this.config.enabled && consecutive >= this.config.rateLimitThreshold) {
        logger.warn(`Auto-rotating key for ${provider} after ${consecutive} rate limits`);
        this.rotateKey(provider, 'rate_limit', retryAfterMs);
      }
    }

    const event: RateLimitEvent = {
      provider,
      keyHash,
      timestamp: new Date(),
      retryAfterMs,
    };

    this.emit('rate_limit', event);
  }

  /**
   * Record generic error
   */
  recordError(provider: string, errorType: string): void {
    const key = this.getCurrentKey(provider);
    if (!key) return;

    const keyHash = this.hashKey(key.key);
    const health = this.keyHealth.get(keyHash);

    if (health) {
      health.successRate = Math.max(0, health.successRate * 0.95);
      
      if (!health.issues.includes(errorType)) {
        health.issues.push(errorType);
      }

      // Check if error rate threshold exceeded
      if (this.config.enabled && health.successRate < (100 - this.config.errorRateThreshold)) {
        logger.warn(`High error rate for ${provider}, rotating...`);
        this.rotateKey(provider, 'error_rate');
      }

      this.keyHealth.set(keyHash, health);
    }

    this.metrics.incCounter('api_requests_total', { provider, status: 'error' });
  }

  /**
   * Rotate to next key
   */
  rotateKey(
    provider: string,
    reason: 'rate_limit' | 'error_rate' | 'expired' | 'manual' | 'scheduled',
    cooldownMs?: number
  ): void {
    const providerKeys = this.keys.get(provider.toLowerCase());
    if (!providerKeys || providerKeys.length <= 1) {
      logger.warn(`Cannot rotate: only one key available for ${provider}`);
      this.emit('rotation_failed', { provider, reason: 'single_key' });
      return;
    }

    const currentIndex = this.currentKeyIndex.get(provider.toLowerCase()) || 0;
    const previousKey = providerKeys[currentIndex];
    const previousKeyHash = this.hashKey(previousKey.key);

    // Put current key in cooldown
    const health = this.keyHealth.get(previousKeyHash);
    if (health) {
      health.cooldownUntil = new Date(Date.now() + (cooldownMs || this.config.cooldownPeriodMs));
      health.healthy = false;
      this.keyHealth.set(previousKeyHash, health);

      this.metrics.setGauge('key_cooldown_active', 1, { 
        provider, 
        key_hash: previousKeyHash.substring(0, 8),
      });
    }

    // Find next healthy key
    let nextIndex = currentIndex;
    for (let i = 1; i <= providerKeys.length; i++) {
      const candidateIndex = (currentIndex + i) % providerKeys.length;
      const candidateKey = providerKeys[candidateIndex];
      const candidateHash = this.hashKey(candidateKey.key);
      const candidateHealth = this.keyHealth.get(candidateHash);

      if (!candidateHealth?.cooldownUntil || candidateHealth.cooldownUntil <= new Date()) {
        nextIndex = candidateIndex;
        break;
      }
    }

    if (nextIndex === currentIndex) {
      logger.error(`All keys for ${provider} are in cooldown!`);
      this.emit('all_keys_exhausted', { provider });
      return;
    }

    this.currentKeyIndex.set(provider.toLowerCase(), nextIndex);

    const newKey = providerKeys[nextIndex];
    const newKeyHash = this.hashKey(newKey.key);

    // Track rotation history
    const history = this.rotationHistory.get(provider) || [];
    history.push(new Date());
    if (history.length > 100) history.shift();
    this.rotationHistory.set(provider, history);

    // Update metrics
    this.metrics.incCounter('key_rotation_total', { provider, reason });
    this.updateKeyMetrics(provider);

    logger.info('🔄 Key rotated', {
      provider,
      reason,
      previousKeyHash: previousKeyHash.substring(0, 8),
      newKeyHash: newKeyHash.substring(0, 8),
      cooldownMs: cooldownMs || this.config.cooldownPeriodMs,
    });

    this.emit('key_rotated', {
      provider,
      previousKeyHash,
      newKeyHash,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds

    logger.info('🏥 Key health monitoring started');
  }

  /**
   * Perform health check on all keys
   */
  private performHealthCheck(): void {
    for (const [provider, providerKeys] of this.keys.entries()) {
      let healthyCount = 0;

      for (const key of providerKeys) {
        const keyHash = this.hashKey(key.key);
        const health = this.keyHealth.get(keyHash);

        if (health) {
          // Clear expired cooldowns
          if (health.cooldownUntil && health.cooldownUntil <= new Date()) {
            health.cooldownUntil = undefined;
            health.healthy = true;
            health.issues = health.issues.filter(i => i !== 'cooldown');
            
            this.metrics.setGauge('key_cooldown_active', 0, { 
              provider, 
              key_hash: keyHash.substring(0, 8),
            });

            logger.info(`Key ${keyHash.substring(0, 8)} cooldown ended for ${provider}`);
          }

          // Calculate health score
          const healthScore = this.calculateHealthScore(health);
          this.metrics.setGauge('key_health_score', healthScore, { 
            provider, 
            key_hash: keyHash.substring(0, 8),
          });

          if (health.healthy) {
            healthyCount++;
          }
        }
      }

      // Alert if below minimum healthy keys
      if (healthyCount < this.config.minHealthyKeys) {
        logger.error(`⚠️ Low healthy keys for ${provider}: ${healthyCount}`);
        this.emit('low_healthy_keys', { provider, healthyCount });
      }

      this.metrics.setGauge('active_keys_count', healthyCount, { provider });
    }
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(health: KeyHealthStatus): number {
    let score = 100;

    // Deduct for low success rate
    score -= (100 - health.successRate) * 0.5;

    // Deduct for high rate limit errors
    score -= health.rateLimitErrorRate * 0.3;

    // Deduct for issues
    score -= health.issues.length * 5;

    // Deduct for cooldown
    if (health.cooldownUntil && health.cooldownUntil > new Date()) {
      score -= 50;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Update key metrics for a provider
   */
  private updateKeyMetrics(provider: string): void {
    const providerKeys = this.keys.get(provider.toLowerCase());
    if (!providerKeys) return;

    let healthyCount = 0;
    for (const key of providerKeys) {
      const keyHash = this.hashKey(key.key);
      const health = this.keyHealth.get(keyHash);
      if (health?.healthy) healthyCount++;
    }

    this.metrics.setGauge('active_keys_count', healthyCount, { provider });
  }

  /**
   * Get health status for all keys
   */
  getHealthStatus(): Map<string, KeyHealthStatus[]> {
    const status = new Map<string, KeyHealthStatus[]>();

    for (const [provider, providerKeys] of this.keys.entries()) {
      const providerHealth: KeyHealthStatus[] = [];

      for (const key of providerKeys) {
        const keyHash = this.hashKey(key.key);
        const health = this.keyHealth.get(keyHash);
        if (health) {
          providerHealth.push({ ...health });
        }
      }

      status.set(provider, providerHealth);
    }

    return status;
  }

  /**
   * Get rotation statistics
   */
  getRotationStats(): {
    provider: string;
    rotationsLast24h: number;
    rotationsLastHour: number;
    avgTimeBetweenRotations: number;
  }[] {
    const stats: {
      provider: string;
      rotationsLast24h: number;
      rotationsLastHour: number;
      avgTimeBetweenRotations: number;
    }[] = [];

    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    for (const [provider, history] of this.rotationHistory.entries()) {
      const rotationsLastHour = history.filter(d => d.getTime() > hourAgo).length;
      const rotationsLast24h = history.filter(d => d.getTime() > dayAgo).length;

      let avgTimeBetweenRotations = 0;
      if (history.length > 1) {
        const intervals: number[] = [];
        for (let i = 1; i < history.length; i++) {
          intervals.push(history[i].getTime() - history[i - 1].getTime());
        }
        avgTimeBetweenRotations = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      }

      stats.push({
        provider,
        rotationsLast24h,
        rotationsLastHour,
        avgTimeBetweenRotations,
      });
    }

    return stats;
  }

  /**
   * Hash a key for safe logging
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.keys.clear();
    this.keyHealth.clear();
    this.consecutiveRateLimits.clear();
    this.latencyHistory.clear();
    this.rotationHistory.clear();
    this.removeAllListeners();

    logger.info('✅ Enhanced Key Rotation Manager destroyed');
  }
}

/**
 * Global instance
 */
let globalEnhancedKeyRotation: EnhancedKeyRotationManager | null = null;

export function getEnhancedKeyRotation(): EnhancedKeyRotationManager {
  if (!globalEnhancedKeyRotation) {
    globalEnhancedKeyRotation = new EnhancedKeyRotationManager();
  }
  return globalEnhancedKeyRotation;
}

export function resetEnhancedKeyRotation(): void {
  if (globalEnhancedKeyRotation) {
    globalEnhancedKeyRotation.destroy();
  }
  globalEnhancedKeyRotation = null;
}

export default EnhancedKeyRotationManager;

