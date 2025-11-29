/**
 * ============================================
 * RECOVERY MANAGER - Auto-Recovery System
 * ============================================
 * 
 * World-class automatic recovery system that:
 * - Handles all failure types automatically
 * - Implements circuit breaker auto-reset
 * - Manages CU exhaustion recovery
 * - Restores provider health automatically
 * - Uses exponential backoff with jitter
 * 
 * Target: 100% automatic recovery, zero manual intervention
 */

import { EventEmitter } from 'events';
import { createLogger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export type ErrorType = 
  | 'CU_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'PROVIDER_DOWN'
  | 'INVALID_RESPONSE'
  | 'CIRCUIT_OPEN'
  | 'UNKNOWN';

export type ProviderName = 'alchemy' | 'quicknode' | 'infura' | 'moralis';

export interface RecoveryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;          // 0-1, adds randomness to delays
  circuitResetTimeMs: number;    // Time before circuit breaker resets
  cuResetCheckIntervalMs: number;// How often to check CU reset
  healthCheckIntervalMs: number; // How often to check provider health
  autoRecoveryEnabled: boolean;
}

export interface ProviderState {
  name: ProviderName;
  isHealthy: boolean;
  circuitOpen: boolean;
  circuitOpenedAt: Date | null;
  consecutiveFailures: number;
  lastError: Error | null;
  lastErrorAt: Date | null;
  lastSuccessAt: Date | null;
  cuExhausted: boolean;
  cuResetAt: Date | null;
  recoveryAttempts: number;
  inRecovery: boolean;
}

export interface RecoveryResult {
  success: boolean;
  provider: ProviderName;
  errorType: ErrorType;
  attempts: number;
  totalDelayMs: number;
  recoveredAt: Date | null;
  message: string;
}

export interface RecoveryStats {
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  avgRecoveryTimeMs: number;
  byErrorType: Record<ErrorType, { attempts: number; successes: number }>;
  byProvider: Record<ProviderName, { recoveries: number; failures: number }>;
}

const DEFAULT_CONFIG: RecoveryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  jitterFactor: 0.3,
  circuitResetTimeMs: 60000,
  cuResetCheckIntervalMs: 60000,
  healthCheckIntervalMs: 30000,
  autoRecoveryEnabled: true,
};

// =============================================================================
// MAIN CLASS
// =============================================================================

export class RecoveryManager extends EventEmitter {
  private logger: any;
  private config: RecoveryConfig;
  
  // Provider states
  private providerStates: Map<ProviderName, ProviderState> = new Map();
  
  // Recovery timers
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private cuResetTimer: NodeJS.Timeout | null = null;
  private recoveryTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Stats
  private stats: RecoveryStats = {
    totalRecoveries: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    avgRecoveryTimeMs: 0,
    byErrorType: {} as Record<ErrorType, { attempts: number; successes: number }>,
    byProvider: {} as Record<ProviderName, { recoveries: number; failures: number }>,
  };

  // Health check callback
  private healthCheckFn: ((provider: ProviderName) => Promise<boolean>) | null = null;

  constructor(config?: Partial<RecoveryConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger({ component: 'RecoveryManager' });

    // Initialize provider states
    this.initializeProviderStates();

    // Initialize stats
    this.initializeStats();

    this.logger.info('RecoveryManager initialized', {
      maxRetries: this.config.maxRetries,
      autoRecoveryEnabled: this.config.autoRecoveryEnabled,
    });
  }

  /**
   * Initialize provider states
   */
  private initializeProviderStates(): void {
    const providers: ProviderName[] = ['alchemy', 'quicknode', 'infura', 'moralis'];
    
    for (const provider of providers) {
      this.providerStates.set(provider, {
        name: provider,
        isHealthy: true,
        circuitOpen: false,
        circuitOpenedAt: null,
        consecutiveFailures: 0,
        lastError: null,
        lastErrorAt: null,
        lastSuccessAt: null,
        cuExhausted: false,
        cuResetAt: null,
        recoveryAttempts: 0,
        inRecovery: false,
      });
    }
  }

  /**
   * Initialize stats
   */
  private initializeStats(): void {
    const errorTypes: ErrorType[] = [
      'CU_EXHAUSTED', 'RATE_LIMITED', 'NETWORK_ERROR', 
      'TIMEOUT', 'PROVIDER_DOWN', 'INVALID_RESPONSE', 
      'CIRCUIT_OPEN', 'UNKNOWN'
    ];
    
    for (const type of errorTypes) {
      this.stats.byErrorType[type] = { attempts: 0, successes: 0 };
    }

    const providers: ProviderName[] = ['alchemy', 'quicknode', 'infura', 'moralis'];
    for (const provider of providers) {
      this.stats.byProvider[provider] = { recoveries: 0, failures: 0 };
    }
  }

  // ===========================================================================
  // MAIN RECOVERY METHOD
  // ===========================================================================

  /**
   * Attempt to recover from an error
   */
  async recover(
    provider: ProviderName,
    error: Error,
    context?: any
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const errorType = this.classifyError(error);
    
    this.stats.totalRecoveries++;
    this.stats.byErrorType[errorType].attempts++;

    this.logger.info('Starting recovery', {
      provider,
      errorType,
      error: error.message,
    });

    // Update provider state
    const state = this.getProviderState(provider);
    state.lastError = error;
    state.lastErrorAt = new Date();
    state.consecutiveFailures++;
    state.inRecovery = true;

    let result: RecoveryResult;

    try {
      // Apply recovery strategy based on error type
      switch (errorType) {
        case 'CU_EXHAUSTED':
          result = await this.recoverFromCUExhaustion(provider, state);
          break;
        case 'RATE_LIMITED':
          result = await this.recoverFromRateLimit(provider, state);
          break;
        case 'CIRCUIT_OPEN':
          result = await this.recoverFromCircuitOpen(provider, state);
          break;
        case 'NETWORK_ERROR':
        case 'TIMEOUT':
          result = await this.recoverFromNetworkError(provider, state);
          break;
        case 'PROVIDER_DOWN':
          result = await this.recoverFromProviderDown(provider, state);
          break;
        case 'INVALID_RESPONSE':
          result = await this.recoverFromInvalidResponse(provider, state);
          break;
        default:
          result = await this.recoverFromUnknownError(provider, state);
      }

      // Update stats
      if (result.success) {
        this.stats.successfulRecoveries++;
        this.stats.byErrorType[errorType].successes++;
        this.stats.byProvider[provider].recoveries++;
        
        // Update average recovery time
        const recoveryTime = Date.now() - startTime;
        this.stats.avgRecoveryTimeMs = 
          (this.stats.avgRecoveryTimeMs * (this.stats.successfulRecoveries - 1) + recoveryTime) / 
          this.stats.successfulRecoveries;
      } else {
        this.stats.failedRecoveries++;
        this.stats.byProvider[provider].failures++;
      }

      state.inRecovery = false;
      this.emit('recovery_completed', result);
      
      return result;

    } catch (recoveryError: any) {
      state.inRecovery = false;
      this.stats.failedRecoveries++;
      this.stats.byProvider[provider].failures++;

      const failedResult: RecoveryResult = {
        success: false,
        provider,
        errorType,
        attempts: state.recoveryAttempts,
        totalDelayMs: Date.now() - startTime,
        recoveredAt: null,
        message: `Recovery failed: ${recoveryError.message}`,
      };

      this.emit('recovery_failed', failedResult);
      return failedResult;
    }
  }

  // ===========================================================================
  // RECOVERY STRATEGIES
  // ===========================================================================

  /**
   * Recover from CU exhaustion
   */
  private async recoverFromCUExhaustion(
    provider: ProviderName,
    state: ProviderState
  ): Promise<RecoveryResult> {
    this.logger.info('Recovering from CU exhaustion', { provider });

    state.cuExhausted = true;
    state.isHealthy = false;

    // Calculate reset time based on provider
    const resetTime = this.getCUResetTime(provider);
    state.cuResetAt = resetTime;

    // Wait for CU reset
    const waitTime = Math.max(0, resetTime.getTime() - Date.now());
    
    if (waitTime > 0) {
      this.logger.info('Waiting for CU reset', {
        provider,
        waitTimeMs: waitTime,
        resetAt: resetTime.toISOString(),
      });

      await this.sleep(Math.min(waitTime, this.config.maxDelayMs));
    }

    // Verify recovery
    const recovered = await this.verifyProviderHealth(provider);

    if (recovered) {
      state.cuExhausted = false;
      state.isHealthy = true;
      state.consecutiveFailures = 0;
      state.cuResetAt = null;
    }

    return {
      success: recovered,
      provider,
      errorType: 'CU_EXHAUSTED',
      attempts: 1,
      totalDelayMs: waitTime,
      recoveredAt: recovered ? new Date() : null,
      message: recovered 
        ? 'CU quota restored' 
        : 'CU still exhausted, will retry later',
    };
  }

  /**
   * Recover from rate limiting
   */
  private async recoverFromRateLimit(
    provider: ProviderName,
    state: ProviderState
  ): Promise<RecoveryResult> {
    this.logger.info('Recovering from rate limit', { provider });

    let attempts = 0;
    let totalDelay = 0;

    while (attempts < this.config.maxRetries) {
      attempts++;
      state.recoveryAttempts = attempts;

      // Calculate delay with exponential backoff and jitter
      const delay = this.calculateBackoffDelay(attempts);
      totalDelay += delay;

      this.logger.debug('Rate limit backoff', {
        provider,
        attempt: attempts,
        delayMs: delay,
      });

      await this.sleep(delay);

      // Verify recovery
      const recovered = await this.verifyProviderHealth(provider);
      
      if (recovered) {
        state.isHealthy = true;
        state.consecutiveFailures = 0;

        return {
          success: true,
          provider,
          errorType: 'RATE_LIMITED',
          attempts,
          totalDelayMs: totalDelay,
          recoveredAt: new Date(),
          message: `Recovered after ${attempts} attempts`,
        };
      }
    }

    return {
      success: false,
      provider,
      errorType: 'RATE_LIMITED',
      attempts,
      totalDelayMs: totalDelay,
      recoveredAt: null,
      message: `Failed to recover after ${attempts} attempts`,
    };
  }

  /**
   * Recover from circuit open
   */
  private async recoverFromCircuitOpen(
    provider: ProviderName,
    state: ProviderState
  ): Promise<RecoveryResult> {
    this.logger.info('Recovering from circuit open', { provider });

    if (!state.circuitOpenedAt) {
      state.circuitOpenedAt = new Date();
    }

    // Wait for circuit reset time
    const timeSinceOpen = Date.now() - state.circuitOpenedAt.getTime();
    const waitTime = Math.max(0, this.config.circuitResetTimeMs - timeSinceOpen);

    if (waitTime > 0) {
      this.logger.debug('Waiting for circuit reset', {
        provider,
        waitTimeMs: waitTime,
      });

      await this.sleep(waitTime);
    }

    // Attempt half-open state
    const recovered = await this.verifyProviderHealth(provider);

    if (recovered) {
      state.circuitOpen = false;
      state.circuitOpenedAt = null;
      state.isHealthy = true;
      state.consecutiveFailures = 0;

      this.emit('circuit_closed', { provider });

      return {
        success: true,
        provider,
        errorType: 'CIRCUIT_OPEN',
        attempts: 1,
        totalDelayMs: waitTime,
        recoveredAt: new Date(),
        message: 'Circuit breaker reset successfully',
      };
    }

    // Keep circuit open
    state.circuitOpenedAt = new Date();

    return {
      success: false,
      provider,
      errorType: 'CIRCUIT_OPEN',
      attempts: 1,
      totalDelayMs: waitTime,
      recoveredAt: null,
      message: 'Circuit breaker still open, will retry later',
    };
  }

  /**
   * Recover from network error
   */
  private async recoverFromNetworkError(
    provider: ProviderName,
    state: ProviderState
  ): Promise<RecoveryResult> {
    this.logger.info('Recovering from network error', { provider });

    let attempts = 0;
    let totalDelay = 0;

    while (attempts < this.config.maxRetries) {
      attempts++;
      state.recoveryAttempts = attempts;

      const delay = this.calculateBackoffDelay(attempts);
      totalDelay += delay;

      await this.sleep(delay);

      const recovered = await this.verifyProviderHealth(provider);

      if (recovered) {
        state.isHealthy = true;
        state.consecutiveFailures = 0;

        return {
          success: true,
          provider,
          errorType: 'NETWORK_ERROR',
          attempts,
          totalDelayMs: totalDelay,
          recoveredAt: new Date(),
          message: `Network recovered after ${attempts} attempts`,
        };
      }
    }

    // Open circuit breaker after max retries
    state.circuitOpen = true;
    state.circuitOpenedAt = new Date();
    state.isHealthy = false;

    this.emit('circuit_opened', { provider, reason: 'network_error' });

    return {
      success: false,
      provider,
      errorType: 'NETWORK_ERROR',
      attempts,
      totalDelayMs: totalDelay,
      recoveredAt: null,
      message: `Network recovery failed, circuit opened`,
    };
  }

  /**
   * Recover from provider down
   */
  private async recoverFromProviderDown(
    provider: ProviderName,
    state: ProviderState
  ): Promise<RecoveryResult> {
    this.logger.info('Recovering from provider down', { provider });

    state.isHealthy = false;
    state.circuitOpen = true;
    state.circuitOpenedAt = new Date();

    // Wait longer for provider recovery
    const waitTime = this.config.circuitResetTimeMs * 2;
    await this.sleep(waitTime);

    const recovered = await this.verifyProviderHealth(provider);

    if (recovered) {
      state.circuitOpen = false;
      state.circuitOpenedAt = null;
      state.isHealthy = true;
      state.consecutiveFailures = 0;

      return {
        success: true,
        provider,
        errorType: 'PROVIDER_DOWN',
        attempts: 1,
        totalDelayMs: waitTime,
        recoveredAt: new Date(),
        message: 'Provider recovered',
      };
    }

    return {
      success: false,
      provider,
      errorType: 'PROVIDER_DOWN',
      attempts: 1,
      totalDelayMs: waitTime,
      recoveredAt: null,
      message: 'Provider still down',
    };
  }

  /**
   * Recover from invalid response
   */
  private async recoverFromInvalidResponse(
    provider: ProviderName,
    state: ProviderState
  ): Promise<RecoveryResult> {
    this.logger.info('Recovering from invalid response', { provider });

    // Simple retry with short delay
    const delay = this.config.baseDelayMs;
    await this.sleep(delay);

    const recovered = await this.verifyProviderHealth(provider);

    if (recovered) {
      state.consecutiveFailures = 0;

      return {
        success: true,
        provider,
        errorType: 'INVALID_RESPONSE',
        attempts: 1,
        totalDelayMs: delay,
        recoveredAt: new Date(),
        message: 'Provider responding normally',
      };
    }

    return {
      success: false,
      provider,
      errorType: 'INVALID_RESPONSE',
      attempts: 1,
      totalDelayMs: delay,
      recoveredAt: null,
      message: 'Provider still returning invalid responses',
    };
  }

  /**
   * Recover from unknown error
   */
  private async recoverFromUnknownError(
    provider: ProviderName,
    state: ProviderState
  ): Promise<RecoveryResult> {
    this.logger.info('Recovering from unknown error', { provider });

    // Use standard backoff
    return this.recoverFromNetworkError(provider, state);
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Classify error type
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('cu') || message.includes('compute unit') || message.includes('quota')) {
      return 'CU_EXHAUSTED';
    }
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many')) {
      return 'RATE_LIMITED';
    }
    if (message.includes('circuit') || message.includes('breaker')) {
      return 'CIRCUIT_OPEN';
    }
    if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }
    if (message.includes('503') || message.includes('unavailable') || message.includes('down')) {
      return 'PROVIDER_DOWN';
    }
    if (message.includes('invalid') || message.includes('malformed') || message.includes('parse')) {
      return 'INVALID_RESPONSE';
    }

    return 'UNKNOWN';
  }

  /**
   * Calculate backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
    
    // Add jitter
    const jitter = cappedDelay * this.config.jitterFactor * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Get CU reset time for provider
   */
  private getCUResetTime(provider: ProviderName): Date {
    const now = new Date();

    switch (provider) {
      case 'infura':
        // Daily reset at midnight UTC
        const tomorrow = new Date(now);
        tomorrow.setUTCHours(24, 0, 0, 0);
        return tomorrow;

      case 'alchemy':
      case 'quicknode':
      case 'moralis':
        // Monthly reset on 1st
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth;

      default:
        // Default to 1 hour from now
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
  }

  /**
   * Verify provider health
   */
  private async verifyProviderHealth(provider: ProviderName): Promise<boolean> {
    if (this.healthCheckFn) {
      try {
        return await this.healthCheckFn(provider);
      } catch {
        return false;
      }
    }

    // Default: assume healthy after delay
    return true;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider state
   */
  private getProviderState(provider: ProviderName): ProviderState {
    let state = this.providerStates.get(provider);
    if (!state) {
      state = {
        name: provider,
        isHealthy: true,
        circuitOpen: false,
        circuitOpenedAt: null,
        consecutiveFailures: 0,
        lastError: null,
        lastErrorAt: null,
        lastSuccessAt: null,
        cuExhausted: false,
        cuResetAt: null,
        recoveryAttempts: 0,
        inRecovery: false,
      };
      this.providerStates.set(provider, state);
    }
    return state;
  }

  // ===========================================================================
  // AUTO-RECOVERY MANAGEMENT
  // ===========================================================================

  /**
   * Start auto-recovery monitoring
   */
  start(): void {
    if (!this.config.autoRecoveryEnabled) {
      this.logger.warn('Auto-recovery is disabled');
      return;
    }

    // Start health check timer
    this.healthCheckTimer = setInterval(
      () => this.runHealthChecks(),
      this.config.healthCheckIntervalMs
    );

    // Start CU reset timer
    this.cuResetTimer = setInterval(
      () => this.checkCUReset(),
      this.config.cuResetCheckIntervalMs
    );

    this.logger.info('Auto-recovery started');
    this.emit('started');
  }

  /**
   * Stop auto-recovery monitoring
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.cuResetTimer) {
      clearInterval(this.cuResetTimer);
      this.cuResetTimer = null;
    }

    // Clear all recovery timers
    for (const timer of this.recoveryTimers.values()) {
      clearTimeout(timer);
    }
    this.recoveryTimers.clear();

    this.logger.info('Auto-recovery stopped');
    this.emit('stopped');
  }

  /**
   * Run health checks on all providers
   */
  private async runHealthChecks(): Promise<void> {
    for (const [provider, state] of this.providerStates) {
      if (state.inRecovery) continue;

      if (!state.isHealthy || state.circuitOpen) {
        // Attempt recovery
        const error = state.lastError || new Error('Provider unhealthy');
        this.recover(provider, error).catch(err => {
          this.logger.error('Auto-recovery failed', { provider, error: err.message });
        });
      }
    }
  }

  /**
   * Check for CU reset
   */
  private checkCUReset(): void {
    const now = new Date();

    for (const [provider, state] of this.providerStates) {
      if (state.cuExhausted && state.cuResetAt && now >= state.cuResetAt) {
        this.logger.info('CU reset detected', { provider });
        
        state.cuExhausted = false;
        state.cuResetAt = null;
        state.isHealthy = true;
        state.consecutiveFailures = 0;

        this.emit('cu_reset', { provider });
      }
    }
  }

  /**
   * Set health check function
   */
  setHealthCheckFn(fn: (provider: ProviderName) => Promise<boolean>): void {
    this.healthCheckFn = fn;
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  /**
   * Mark provider as healthy
   */
  markHealthy(provider: ProviderName): void {
    const state = this.getProviderState(provider);
    state.isHealthy = true;
    state.circuitOpen = false;
    state.circuitOpenedAt = null;
    state.consecutiveFailures = 0;
    state.lastSuccessAt = new Date();
    state.cuExhausted = false;

    this.emit('provider_healthy', { provider });
  }

  /**
   * Mark provider as unhealthy
   */
  markUnhealthy(provider: ProviderName, error?: Error): void {
    const state = this.getProviderState(provider);
    state.isHealthy = false;
    state.lastError = error || null;
    state.lastErrorAt = new Date();
    state.consecutiveFailures++;

    this.emit('provider_unhealthy', { provider, error });
  }

  /**
   * Open circuit breaker
   */
  openCircuit(provider: ProviderName): void {
    const state = this.getProviderState(provider);
    state.circuitOpen = true;
    state.circuitOpenedAt = new Date();
    state.isHealthy = false;

    this.emit('circuit_opened', { provider });
  }

  /**
   * Get all provider states
   */
  getAllProviderStates(): Map<ProviderName, ProviderState> {
    return new Map(this.providerStates);
  }

  /**
   * Get stats
   */
  getStats(): RecoveryStats {
    return { ...this.stats };
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    this.initializeStats();
    this.logger.info('Stats reset');
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(provider: ProviderName): boolean {
    const state = this.providerStates.get(provider);
    return state ? state.isHealthy && !state.circuitOpen && !state.cuExhausted : false;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let recoveryInstance: RecoveryManager | null = null;

export function getRecoveryManager(config?: Partial<RecoveryConfig>): RecoveryManager {
  if (!recoveryInstance) {
    recoveryInstance = new RecoveryManager(config);
  }
  return recoveryInstance;
}

export function resetRecoveryManager(): void {
  if (recoveryInstance) {
    recoveryInstance.stop();
  }
  recoveryInstance = null;
}

export default RecoveryManager;

