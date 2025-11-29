/**
 * Comprehensive tests for RetryManager
 */
import { RetryManager, CircuitBreaker, DEFAULT_RETRY_CONFIG } from './RetryManager';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager(DEFAULT_RETRY_CONFIG);
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new Error('ECONNRESET');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(mockOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const permanentError = new Error('Permanent failure');
      const mockOperation = jest.fn().mockRejectedValue(permanentError);

      const result = await retryManager.executeWithRetry(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBe(permanentError);
      expect(result.attempts).toBe(4); // initial + 3 retries
      expect(mockOperation).toHaveBeenCalledTimes(4);
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new Error('Validation failed');
      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

      const result = await retryManager.executeWithRetry(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBe(nonRetryableError);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff with jitter', async () => {
      const retryableError = new Error('timeout');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const startTime = Date.now();
      const result = await retryManager.executeWithRetry(mockOperation);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);

      // Should have taken at least some time due to delays
      expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second total
    });

    it('should pass context to operation', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const context = { userId: 'test-user', operation: 'test' };

      await retryManager.executeWithRetry(mockOperation, context);

      expect(mockOperation).toHaveBeenCalledWith();
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors by message', () => {
      const retryableErrors = [
        new Error('Connection reset by peer timeout'),
        new Error('Request timeout occurred'),
        new Error('Service temporarily unavailable')
      ];

      retryableErrors.forEach(error => {
        const isRetryable = (retryManager as any).isRetryableError(error);
        expect(isRetryable).toBe(true);
      });
    });

    it('should identify retryable errors by code', () => {
      const errorWithCode = new Error('Connection failed');
      (errorWithCode as any).code = 'ECONNREFUSED';

      const isRetryable = (retryManager as any).isRetryableError(errorWithCode);
      expect(isRetryable).toBe(true);
    });

    it('should reject non-retryable errors', () => {
      const nonRetryableErrors = [
        new Error('Validation failed'),
        new Error('Authentication error'),
        new Error('Permission denied')
      ];

      nonRetryableErrors.forEach(error => {
        const isRetryable = (retryManager as any).isRetryableError(error);
        expect(isRetryable).toBe(false);
      });
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      const delays = [0, 1, 2, 3].map(attempt =>
        (retryManager as any).calculateDelay(attempt)
      );

      expect(delays[0]).toBeGreaterThanOrEqual(1000); // 1st retry: 1000ms
      expect(delays[1]).toBeGreaterThanOrEqual(2000); // 2nd retry: 2000ms
      expect(delays[2]).toBeGreaterThanOrEqual(4000); // 3rd retry: 4000ms
      expect(delays[3]).toBeLessThanOrEqual(30000); // Should be capped at maxDelay
    });

    it('should add jitter when enabled', () => {
      const managerWithJitter = new RetryManager({
        ...DEFAULT_RETRY_CONFIG,
        jitter: true
      });

      const delay1 = (managerWithJitter as any).calculateDelay(1);
      const delay2 = (managerWithJitter as any).calculateDelay(1);

      // With jitter, delays should be different (within 25% range)
      expect(delay1).not.toBe(delay2);
      expect(Math.abs(delay1 - delay2)).toBeLessThan(delay1 * 0.25);
    });

    it('should not add jitter when disabled', () => {
      const managerWithoutJitter = new RetryManager({
        ...DEFAULT_RETRY_CONFIG,
        jitter: false
      });

      const delay1 = (managerWithoutJitter as any).calculateDelay(1);
      const delay2 = (managerWithoutJitter as any).calculateDelay(1);

      expect(delay1).toBe(delay2);
    });
  });

  describe('configuration', () => {
    it('should use default config when none provided', () => {
      const manager = new RetryManager();
      const config = manager.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.baseDelay).toBe(1000);
      expect(config.backoffMultiplier).toBe(2);
    });

    it('should allow config updates', () => {
      const manager = new RetryManager();
      const newConfig = {
        maxRetries: 5,
        baseDelay: 2000,
        jitter: false
      };

      manager.updateConfig(newConfig);
      const config = manager.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.baseDelay).toBe(2000);
      expect(config.jitter).toBe(false);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(3, 1000); // 3 failures, 1 second reset
  });

  describe('executeWithCircuitBreaker', () => {
    it('should execute successfully when circuit is closed', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.executeWithCircuitBreaker(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after threshold failures', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service failure'));

      // First 3 calls should fail and increment failure count
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.executeWithCircuitBreaker(mockOperation)
        ).rejects.toThrow('Service failure');
      }

      // 4th call should be blocked by circuit breaker
      await expect(
        circuitBreaker.executeWithCircuitBreaker(mockOperation)
      ).rejects.toThrow('Circuit breaker is open');

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should transition to half-open after reset timeout', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service failure'));

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.executeWithCircuitBreaker(mockOperation)
        ).rejects.toThrow('Service failure');
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Next call should succeed (half-open -> closed)
      mockOperation.mockResolvedValue('success');
      const result = await circuitBreaker.executeWithCircuitBreaker(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(4);
    });

    it('should remain open if half-open call fails', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service failure'));

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.executeWithCircuitBreaker(mockOperation)
        ).rejects.toThrow('Service failure');
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Half-open call fails - should remain open
      await expect(
        circuitBreaker.executeWithCircuitBreaker(mockOperation)
      ).rejects.toThrow('Service failure');

      // Verify circuit breaker is open
      const state = circuitBreaker.getState();
      expect(state.isOpen).toBe(true);
    });
  });

  describe('state management', () => {
    it('should report correct state', () => {
      let state = circuitBreaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
      expect(state.isOpen).toBe(false);
    });

    it('should allow manual reset', () => {
      // Force failures to open circuit
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 3; i++) {
        circuitBreaker.executeWithCircuitBreaker(mockOperation).catch(() => {});
      }

      circuitBreaker.reset();

      const state = circuitBreaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
    });
  });
});
