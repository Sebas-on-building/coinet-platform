/**
 * ============================================
 * RECOVERY MANAGER - Unit Tests
 * ============================================
 * 
 * Comprehensive test coverage for the RecoveryManager
 * Target: 95%+ code coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RecoveryManager,
  RecoveryConfig,
  ErrorType,
  ProviderName,
  RecoveryResult,
  resetRecoveryManager,
  getRecoveryManager,
} from '../../utils/RecoveryManager';

// =============================================================================
// TESTS
// =============================================================================

describe('RecoveryManager', () => {
  let manager: RecoveryManager;

  beforeEach(() => {
    vi.useFakeTimers();
    resetRecoveryManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetRecoveryManager();
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      manager = new RecoveryManager();
      expect(manager).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const config: Partial<RecoveryConfig> = {
        maxRetries: 10,
        baseDelayMs: 500,
        autoRecoveryEnabled: false,
      };
      
      manager = new RecoveryManager(config);
      expect(manager).toBeDefined();
    });

    it('should initialize all provider states', () => {
      manager = new RecoveryManager();
      const states = manager.getAllProviderStates();
      
      expect(states.size).toBe(4);
      expect(states.has('alchemy')).toBe(true);
      expect(states.has('quicknode')).toBe(true);
      expect(states.has('infura')).toBe(true);
      expect(states.has('moralis')).toBe(true);
    });
  });

  // ===========================================================================
  // ERROR CLASSIFICATION
  // ===========================================================================

  describe('Error Classification', () => {
    beforeEach(() => {
      manager = new RecoveryManager({ maxRetries: 1, baseDelayMs: 1 });
    });

    it('should classify CU exhaustion errors', async () => {
      const error = new Error('Compute unit quota exceeded');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;
      
      expect(result.errorType).toBe('CU_EXHAUSTED');
    });

    it('should classify rate limit errors', async () => {
      const error = new Error('Rate limit exceeded (429)');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;
      
      expect(result.errorType).toBe('RATE_LIMITED');
    });

    it('should classify network errors', async () => {
      const error = new Error('ECONNREFUSED');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(10000);
      const result = await resultPromise;
      
      expect(result.errorType).toBe('NETWORK_ERROR');
    });

    it('should classify timeout errors', async () => {
      const error = new Error('Request timed out');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(10000);
      const result = await resultPromise;
      
      expect(result.errorType).toBe('TIMEOUT');
    });

    it('should classify provider down errors', async () => {
      const error = new Error('503 Service Unavailable');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(200000);
      const result = await resultPromise;
      
      expect(result.errorType).toBe('PROVIDER_DOWN');
    });

    it('should classify invalid response errors', async () => {
      const error = new Error('Invalid JSON response');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;
      
      expect(result.errorType).toBe('INVALID_RESPONSE');
    });

    it('should classify unknown errors', async () => {
      const error = new Error('Something unexpected happened');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(10000);
      const result = await resultPromise;
      
      expect(result.errorType).toBe('UNKNOWN');
    });
  });

  // ===========================================================================
  // RECOVERY STRATEGIES
  // ===========================================================================

  describe('Recovery Strategies', () => {
    beforeEach(() => {
      manager = new RecoveryManager({ 
        maxRetries: 3, 
        baseDelayMs: 100,
        maxDelayMs: 1000,
      });
    });

    it('should recover from rate limit with backoff', async () => {
      let healthCheckCount = 0;
      manager.setHealthCheckFn(async () => {
        healthCheckCount++;
        return healthCheckCount >= 2; // Recover on second check
      });

      const error = new Error('Rate limit exceeded');
      const resultPromise = manager.recover('alchemy', error);
      
      // Advance through backoff delays
      await vi.advanceTimersByTimeAsync(5000);
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should fail recovery after max retries', async () => {
      manager.setHealthCheckFn(async () => false); // Always unhealthy

      const error = new Error('Rate limit exceeded');
      const resultPromise = manager.recover('alchemy', error);
      
      // Advance through all retries
      await vi.advanceTimersByTimeAsync(60000);
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
    });

    it('should handle CU exhaustion with wait', async () => {
      manager.setHealthCheckFn(async () => true);

      const error = new Error('CU quota exceeded');
      const resultPromise = manager.recover('infura', error);
      
      // Advance time
      await vi.advanceTimersByTimeAsync(70000);
      
      const result = await resultPromise;
      
      expect(result.errorType).toBe('CU_EXHAUSTED');
    });

    it('should open circuit after network failures', async () => {
      manager.setHealthCheckFn(async () => false);

      const error = new Error('ECONNREFUSED');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(60000);
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(manager.isProviderAvailable('alchemy')).toBe(false);
    });
  });

  // ===========================================================================
  // PROVIDER STATE MANAGEMENT
  // ===========================================================================

  describe('Provider State Management', () => {
    beforeEach(() => {
      manager = new RecoveryManager();
    });

    it('should mark provider as healthy', () => {
      manager.markUnhealthy('alchemy');
      expect(manager.isProviderAvailable('alchemy')).toBe(false);
      
      manager.markHealthy('alchemy');
      expect(manager.isProviderAvailable('alchemy')).toBe(true);
    });

    it('should mark provider as unhealthy', () => {
      expect(manager.isProviderAvailable('alchemy')).toBe(true);
      
      manager.markUnhealthy('alchemy', new Error('Test error'));
      expect(manager.isProviderAvailable('alchemy')).toBe(false);
    });

    it('should open circuit breaker', () => {
      expect(manager.isProviderAvailable('alchemy')).toBe(true);
      
      manager.openCircuit('alchemy');
      expect(manager.isProviderAvailable('alchemy')).toBe(false);
    });

    it('should track consecutive failures', async () => {
      manager.setHealthCheckFn(async () => false);
      
      const error = new Error('Rate limit');
      
      // First failure
      manager.recover('alchemy', error);
      await vi.advanceTimersByTimeAsync(10000);
      
      const states = manager.getAllProviderStates();
      const alchemyState = states.get('alchemy');
      
      expect(alchemyState?.consecutiveFailures).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // AUTO-RECOVERY
  // ===========================================================================

  describe('Auto-Recovery', () => {
    it('should start auto-recovery monitoring', () => {
      manager = new RecoveryManager({ autoRecoveryEnabled: true });
      
      const startedPromise = new Promise<void>(resolve => {
        manager.on('started', resolve);
      });
      
      manager.start();
      
      // Should emit started event
      expect(startedPromise).resolves.toBeUndefined();
    });

    it('should stop auto-recovery monitoring', () => {
      manager = new RecoveryManager({ autoRecoveryEnabled: true });
      manager.start();
      
      const stoppedPromise = new Promise<void>(resolve => {
        manager.on('stopped', resolve);
      });
      
      manager.stop();
      
      expect(stoppedPromise).resolves.toBeUndefined();
    });

    it('should run health checks periodically', async () => {
      let healthCheckCount = 0;
      
      manager = new RecoveryManager({ 
        autoRecoveryEnabled: true,
        healthCheckIntervalMs: 100,
      });
      
      manager.setHealthCheckFn(async () => {
        healthCheckCount++;
        return true;
      });
      
      // Mark a provider unhealthy
      manager.markUnhealthy('alchemy');
      
      manager.start();
      
      // Advance past health check interval
      await vi.advanceTimersByTimeAsync(500);
      
      manager.stop();
      
      // Health check should have been called
      expect(healthCheckCount).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // STATS
  // ===========================================================================

  describe('Statistics', () => {
    beforeEach(() => {
      manager = new RecoveryManager({ maxRetries: 1, baseDelayMs: 1 });
    });

    it('should track recovery attempts', async () => {
      manager.setHealthCheckFn(async () => true);
      
      const error = new Error('Rate limit');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(100);
      await resultPromise;
      
      const stats = manager.getStats();
      expect(stats.totalRecoveries).toBe(1);
    });

    it('should track successful recoveries', async () => {
      manager.setHealthCheckFn(async () => true);
      
      const error = new Error('Rate limit');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(100);
      await resultPromise;
      
      const stats = manager.getStats();
      expect(stats.successfulRecoveries).toBe(1);
    });

    it('should track failed recoveries', async () => {
      manager.setHealthCheckFn(async () => false);
      
      const error = new Error('Rate limit');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(10000);
      await resultPromise;
      
      const stats = manager.getStats();
      expect(stats.failedRecoveries).toBe(1);
    });

    it('should track by error type', async () => {
      manager.setHealthCheckFn(async () => true);
      
      const error = new Error('Rate limit exceeded');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(100);
      await resultPromise;
      
      const stats = manager.getStats();
      expect(stats.byErrorType['RATE_LIMITED'].attempts).toBe(1);
    });

    it('should track by provider', async () => {
      manager.setHealthCheckFn(async () => true);
      
      const error = new Error('Rate limit');
      const resultPromise = manager.recover('quicknode', error);
      
      await vi.advanceTimersByTimeAsync(100);
      await resultPromise;
      
      const stats = manager.getStats();
      expect(stats.byProvider['quicknode'].recoveries).toBe(1);
    });

    it('should reset stats', async () => {
      manager.setHealthCheckFn(async () => true);
      
      const error = new Error('Rate limit');
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(100);
      await resultPromise;
      
      manager.resetStats();
      
      const stats = manager.getStats();
      expect(stats.totalRecoveries).toBe(0);
    });
  });

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  describe('Events', () => {
    beforeEach(() => {
      manager = new RecoveryManager({ maxRetries: 1, baseDelayMs: 1 });
    });

    it('should emit recovery_completed event', async () => {
      manager.setHealthCheckFn(async () => true);
      
      const eventPromise = new Promise<RecoveryResult>(resolve => {
        manager.on('recovery_completed', resolve);
      });
      
      const error = new Error('Rate limit');
      manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(100);
      
      const event = await eventPromise;
      expect(event.provider).toBe('alchemy');
    });

    it('should emit recovery_failed event', async () => {
      manager.setHealthCheckFn(async () => false);
      
      const eventPromise = new Promise<RecoveryResult>(resolve => {
        manager.on('recovery_failed', resolve);
      });
      
      const error = new Error('Rate limit');
      manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(10000);
      
      const event = await eventPromise;
      expect(event.success).toBe(false);
    });

    it('should emit circuit_opened event', async () => {
      const eventPromise = new Promise<{ provider: ProviderName }>(resolve => {
        manager.on('circuit_opened', resolve);
      });
      
      manager.openCircuit('alchemy');
      
      const event = await eventPromise;
      expect(event.provider).toBe('alchemy');
    });

    it('should emit provider_healthy event', async () => {
      const eventPromise = new Promise<{ provider: ProviderName }>(resolve => {
        manager.on('provider_healthy', resolve);
      });
      
      manager.markHealthy('alchemy');
      
      const event = await eventPromise;
      expect(event.provider).toBe('alchemy');
    });

    it('should emit provider_unhealthy event', async () => {
      const eventPromise = new Promise<{ provider: ProviderName }>(resolve => {
        manager.on('provider_unhealthy', resolve);
      });
      
      manager.markUnhealthy('alchemy');
      
      const event = await eventPromise;
      expect(event.provider).toBe('alchemy');
    });
  });

  // ===========================================================================
  // SINGLETON
  // ===========================================================================

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getRecoveryManager();
      const instance2 = getRecoveryManager();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getRecoveryManager();
      resetRecoveryManager();
      const instance2 = getRecoveryManager();
      
      expect(instance1).not.toBe(instance2);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      manager = new RecoveryManager({ maxRetries: 1, baseDelayMs: 1 });
    });

    it('should handle null error message', async () => {
      const error = new Error();
      error.message = '';
      
      const resultPromise = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(10000);
      
      const result = await resultPromise;
      expect(result.errorType).toBe('UNKNOWN');
    });

    it('should handle concurrent recoveries', async () => {
      manager.setHealthCheckFn(async () => true);
      
      const error1 = new Error('Rate limit');
      const error2 = new Error('Rate limit');
      
      const promise1 = manager.recover('alchemy', error1);
      const promise2 = manager.recover('quicknode', error2);
      
      await vi.advanceTimersByTimeAsync(1000);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1.provider).toBe('alchemy');
      expect(result2.provider).toBe('quicknode');
    });

    it('should handle recovery during recovery', async () => {
      let callCount = 0;
      manager.setHealthCheckFn(async () => {
        callCount++;
        return callCount > 2;
      });
      
      const error = new Error('Rate limit');
      
      // Start first recovery
      const promise1 = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(50);
      
      // Start second recovery while first is in progress
      const promise2 = manager.recover('alchemy', error);
      
      await vi.advanceTimersByTimeAsync(10000);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // Both should complete
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});

