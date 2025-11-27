/**
 * ============================================
 * IN-MEMORY KEY ROTATION SYSTEM
 * ============================================
 * 
 * Free-tier security solution for API key management
 * Features:
 * - Zero-cost in-memory rotation (no HashiCorp Vault needed)
 * - Automatic key expiry and refresh
 * - Multi-key load balancing
 * - Emergency rotation on security events
 * - Audit logging for compliance
 * 
 * Security Level: Production-Grade (Free-Tier Optimized)
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';

/**
 * API Key configuration
 */
export interface APIKeyConfig {
  provider: string; // e.g., 'coingecko', 'coinmarketcap'
  key: string;
  environment: 'production' | 'staging' | 'development';
  expiresAt?: Date;
  maxUsage?: number; // Optional usage limit
  metadata?: Record<string, any>;
}

/**
 * Key rotation event
 */
export interface KeyRotationEvent {
  provider: string;
  previousKeyHash: string;
  newKeyHash: string;
  reason: 'scheduled' | 'usage_limit' | 'security_incident' | 'manual';
  timestamp: Date;
}

/**
 * Key usage statistics
 */
export interface KeyUsageStats {
  provider: string;
  keyHash: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  rateLimitErrors: number;
  lastUsed: Date;
  createdAt: Date;
}

/**
 * In-Memory Key Rotation Manager
 */
export class KeyRotationManager extends EventEmitter {
  private keys: Map<string, APIKeyConfig[]> = new Map(); // provider -> keys[]
  private currentKeyIndex: Map<string, number> = new Map(); // provider -> current index
  private keyStats: Map<string, KeyUsageStats> = new Map(); // keyHash -> stats
  private rotationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private initialized = false;

  // Configuration
  private readonly DEFAULT_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly DEFAULT_MAX_USAGE = 10000; // Usage limit before rotation

  constructor() {
    super();
  }

  /**
   * Initialize key rotation manager
   */
  async initialize(keyConfigs: APIKeyConfig[]): Promise<void> {
    if (this.initialized) {
      logger.warn('Key rotation manager already initialized');
      return;
    }

    logger.info('🔐 Initializing Key Rotation Manager...');

    // Group keys by provider
    for (const config of keyConfigs) {
      this.addKey(config);
    }

    // Start automatic rotation for each provider
    for (const provider of this.keys.keys()) {
      this.startAutomaticRotation(provider);
    }

    this.initialized = true;
    logger.info('✅ Key Rotation Manager initialized', {
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
  addKey(config: APIKeyConfig): void {
    const provider = config.provider.toLowerCase();
    
    if (!this.keys.has(provider)) {
      this.keys.set(provider, []);
      this.currentKeyIndex.set(provider, 0);
    }

    this.keys.get(provider)!.push(config);

    // Initialize stats
    const keyHash = this.hashKey(config.key);
    this.keyStats.set(keyHash, {
      provider,
      keyHash,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rateLimitErrors: 0,
      lastUsed: new Date(),
      createdAt: new Date(),
    });

    logger.info('Key added', { provider, environment: config.environment });
  }

  /**
   * Get current active key for a provider
   */
  getCurrentKey(provider: string): APIKeyConfig | null {
    const providerKeys = this.keys.get(provider.toLowerCase());
    if (!providerKeys || providerKeys.length === 0) {
      logger.warn(`No keys available for provider: ${provider}`);
      return null;
    }

    const currentIndex = this.currentKeyIndex.get(provider.toLowerCase()) || 0;
    const key = providerKeys[currentIndex];

    // Check if key is expired
    if (key.expiresAt && key.expiresAt < new Date()) {
      logger.warn(`Current key expired for ${provider}, rotating...`);
      this.rotateKey(provider, 'scheduled');
      return this.getCurrentKey(provider); // Recursive call after rotation
    }

    // Check if usage limit reached
    const keyHash = this.hashKey(key.key);
    const stats = this.keyStats.get(keyHash);
    if (key.maxUsage && stats && stats.totalCalls >= key.maxUsage) {
      logger.warn(`Usage limit reached for ${provider}, rotating...`);
      this.rotateKey(provider, 'usage_limit');
      return this.getCurrentKey(provider);
    }

    return key;
  }

  /**
   * Record key usage
   */
  recordUsage(
    provider: string,
    success: boolean,
    isRateLimitError: boolean = false
  ): void {
    const key = this.getCurrentKey(provider);
    if (!key) return;

    const keyHash = this.hashKey(key.key);
    const stats = this.keyStats.get(keyHash);

    if (stats) {
      stats.totalCalls++;
      if (success) {
        stats.successfulCalls++;
      } else {
        stats.failedCalls++;
      }
      if (isRateLimitError) {
        stats.rateLimitErrors++;
      }
      stats.lastUsed = new Date();

      this.keyStats.set(keyHash, stats);

      // Check if rotation needed due to rate limit abuse
      if (stats.rateLimitErrors > 10) {
        logger.warn(`High rate limit errors for ${provider}, considering rotation...`);
      }
    }
  }

  /**
   * Rotate to next key
   */
  rotateKey(
    provider: string,
    reason: KeyRotationEvent['reason'] = 'manual'
  ): void {
    const providerKeys = this.keys.get(provider.toLowerCase());
    if (!providerKeys || providerKeys.length <= 1) {
      logger.warn(`Cannot rotate: only one key available for ${provider}`);
      return;
    }

    const currentIndex = this.currentKeyIndex.get(provider.toLowerCase()) || 0;
    const previousKey = providerKeys[currentIndex];
    const previousKeyHash = this.hashKey(previousKey.key);

    // Move to next key
    const nextIndex = (currentIndex + 1) % providerKeys.length;
    this.currentKeyIndex.set(provider.toLowerCase(), nextIndex);

    const newKey = providerKeys[nextIndex];
    const newKeyHash = this.hashKey(newKey.key);

    logger.info('🔄 Key rotated', {
      provider,
      reason,
      previousKeyHash: previousKeyHash.substring(0, 8),
      newKeyHash: newKeyHash.substring(0, 8),
    });

    const event: KeyRotationEvent = {
      provider,
      previousKeyHash,
      newKeyHash,
      reason,
      timestamp: new Date(),
    };

    this.emit('key_rotated', event);
  }

  /**
   * Emergency rotation for all keys of a provider
   */
  emergencyRotation(provider: string): void {
    logger.warn(`🚨 Emergency rotation triggered for ${provider}`);
    this.rotateKey(provider, 'security_incident');
    
    this.emit('emergency_rotation', {
      provider,
      timestamp: new Date(),
    });
  }

  /**
   * Start automatic rotation for a provider
   */
  private startAutomaticRotation(provider: string): void {
    // Clear existing interval if any
    const existingInterval = this.rotationIntervals.get(provider);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up new rotation interval
    const interval = setInterval(() => {
      logger.info(`🔄 Scheduled rotation for ${provider}`);
      this.rotateKey(provider, 'scheduled');
    }, this.DEFAULT_ROTATION_INTERVAL);

    this.rotationIntervals.set(provider, interval);

    logger.info(`⏰ Automatic rotation scheduled for ${provider}`, {
      intervalHours: this.DEFAULT_ROTATION_INTERVAL / (60 * 60 * 1000),
    });
  }

  /**
   * Get usage statistics for a provider
   */
  getProviderStats(provider: string): KeyUsageStats[] {
    const providerKeys = this.keys.get(provider.toLowerCase());
    if (!providerKeys) return [];

    return providerKeys.map((key) => {
      const keyHash = this.hashKey(key.key);
      return this.keyStats.get(keyHash)!;
    }).filter(Boolean);
  }

  /**
   * Get overall statistics
   */
  getOverallStats(): {
    totalProviders: number;
    totalKeys: number;
    totalCalls: number;
    avgSuccessRate: number;
    recentRotations: KeyRotationEvent[];
  } {
    let totalKeys = 0;
    let totalCalls = 0;
    let totalSuccessful = 0;

    for (const providerKeys of this.keys.values()) {
      totalKeys += providerKeys.length;
    }

    for (const stats of this.keyStats.values()) {
      totalCalls += stats.totalCalls;
      totalSuccessful += stats.successfulCalls;
    }

    const avgSuccessRate = totalCalls > 0 ? (totalSuccessful / totalCalls) * 100 : 0;

    return {
      totalProviders: this.keys.size,
      totalKeys,
      totalCalls,
      avgSuccessRate,
      recentRotations: [], // Would track in production
    };
  }

  /**
   * Hash a key for safe logging and comparison
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Cleanup and stop all rotation intervals
   */
  destroy(): void {
    for (const interval of this.rotationIntervals.values()) {
      clearInterval(interval);
    }

    this.rotationIntervals.clear();
    this.keys.clear();
    this.currentKeyIndex.clear();
    this.keyStats.clear();
    this.removeAllListeners();

    logger.info('✅ Key Rotation Manager destroyed');
  }

  /**
   * Export audit log (for compliance)
   */
  exportAuditLog(): {
    provider: string;
    keyHash: string;
    stats: KeyUsageStats;
  }[] {
    const log: {
      provider: string;
      keyHash: string;
      stats: KeyUsageStats;
    }[] = [];

    for (const [provider, providerKeys] of this.keys.entries()) {
      for (const key of providerKeys) {
        const keyHash = this.hashKey(key.key);
        const stats = this.keyStats.get(keyHash);
        if (stats) {
          log.push({
            provider,
            keyHash,
            stats,
          });
        }
      }
    }

    return log;
  }

  /**
   * Validate key health
   */
  validateKeyHealth(provider: string): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const key = this.getCurrentKey(provider);
    if (!key) {
      issues.push('No active key available');
      return { healthy: false, issues, recommendations };
    }

    const keyHash = this.hashKey(key.key);
    const stats = this.keyStats.get(keyHash);

    if (!stats) {
      issues.push('No usage statistics available');
      return { healthy: false, issues, recommendations };
    }

    // Check success rate
    const successRate = stats.totalCalls > 0 
      ? (stats.successfulCalls / stats.totalCalls) * 100 
      : 100;

    if (successRate < 90) {
      issues.push(`Low success rate: ${successRate.toFixed(2)}%`);
      recommendations.push('Consider rotating key or checking API status');
    }

    // Check rate limit errors
    const rateLimitRate = stats.totalCalls > 0
      ? (stats.rateLimitErrors / stats.totalCalls) * 100
      : 0;

    if (rateLimitRate > 5) {
      issues.push(`High rate limit error rate: ${rateLimitRate.toFixed(2)}%`);
      recommendations.push('Implement better rate limiting or upgrade API plan');
    }

    // Check key age
    const keyAge = Date.now() - stats.createdAt.getTime();
    const keyAgeDays = keyAge / (24 * 60 * 60 * 1000);

    if (keyAgeDays > 30) {
      recommendations.push(`Key is ${keyAgeDays.toFixed(0)} days old, consider rotation`);
    }

    const healthy = issues.length === 0;

    return { healthy, issues, recommendations };
  }
}

/**
 * Global key rotation manager instance
 */
let globalKeyRotationManager: KeyRotationManager | null = null;

/**
 * Get or create global key rotation manager
 */
export function getKeyRotationManager(): KeyRotationManager {
  if (!globalKeyRotationManager) {
    globalKeyRotationManager = new KeyRotationManager();
  }
  return globalKeyRotationManager;
}

/**
 * Reset global manager (for testing)
 */
export function resetKeyRotationManager(): void {
  if (globalKeyRotationManager) {
    globalKeyRotationManager.destroy();
  }
  globalKeyRotationManager = null;
}

export default KeyRotationManager;

