/**
 * Integration tests for the complete notification delivery pipeline
 */
import { NotificationDeliveryOrchestrator } from '../../src/routing/NotificationDeliveryOrchestrator';
import { NotificationRouter } from '../../src/routing/NotificationRouter';
import { AdaptiveRateLimiter } from '../../src/rate-limiting/RateLimiter';
import { RetryManager } from '../../src/utils/RetryManager';
import { NotificationChannel, NotificationStatus, NotificationEventType, NotificationPriority } from '../../src/types';
import { createMockAlertEvent, createMockUserPreferences, wait } from '../../tests/setup';

describe('Notification Delivery Integration Tests', () => {
  let orchestrator: NotificationDeliveryOrchestrator;
  let router: NotificationRouter;
  let rateLimiter: AdaptiveRateLimiter;
  let retryManager: RetryManager;
  let mockCache: any;
  let mockLogsStorage: any;
  let mockProviders: Map<NotificationChannel, any>;

  beforeEach(() => {
    // Mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn()
    };

    // Mock logs storage
    mockLogsStorage = {
      logDelivery: jest.fn()
    };

    // Mock providers
    mockProviders = new Map();
    const mockEmailProvider = {
      type: NotificationChannel.EMAIL,
      name: 'email',
      initialize: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue({
        status: 'success',
        responseTime: 150,
        providerResponse: { messageId: 'email-123' }
      }),
      healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        responseTime: 100
      })
    };

    const mockSMSProvider = {
      type: NotificationChannel.SMS,
      name: 'sms',
      initialize: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue({
        status: 'success',
        responseTime: 200,
        providerResponse: { sid: 'sms-123' }
      }),
      healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        responseTime: 150
      })
    };

    mockProviders.set(NotificationChannel.EMAIL, mockEmailProvider);
    mockProviders.set(NotificationChannel.SMS, mockSMSProvider);

    // Initialize components
    const mockStorage = {
      getUserPreferences: jest.fn(),
      storeUserPreferences: jest.fn(),
      updateUserPreferences: jest.fn(),
      getBulkUserPreferences: jest.fn(),
      hasUserPreferences: jest.fn()
    };

    router = new NotificationRouter(mockStorage, mockCache);
    retryManager = new RetryManager();
    rateLimiter = new AdaptiveRateLimiter({} as any);

    orchestrator = new NotificationDeliveryOrchestrator(
      router,
      rateLimiter,
      mockLogsStorage,
      mockCache,
      5 // max concurrency
    );

    // Register providers
    mockProviders.forEach(provider => {
      orchestrator.registerProvider(provider);
    });
  });

  describe('End-to-End Notification Delivery', () => {
    it('should successfully deliver notifications through all channels', async () => {
      const alertEvent = createMockAlertEvent({
        id: 'integration-test-event',
        severity: 'high',
        userId: 'integration-test-user'
      });

      const userPrefs = createMockUserPreferences({
        userId: 'integration-test-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'high' },
          { channel: 'sms', enabled: true, priority: 'high' }
        ]
      });

      // Mock storage to return user preferences
      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      const logEntry = await orchestrator.processAlertEvent(alertEvent);

      // Verify log entry
      expect(logEntry.eventId).toBe(alertEvent.id);
      expect(logEntry.userId).toBe(alertEvent.userId);
      expect(logEntry.deliveries).toHaveLength(2);
      expect(logEntry.status).toBe(NotificationStatus.SENT);
      expect(logEntry.totalTime).toBeGreaterThan(0);

      // Verify all deliveries succeeded
      logEntry.deliveries.forEach(delivery => {
        expect(delivery.status).toBe(NotificationStatus.SENT);
        expect(delivery.error).toBeUndefined();
      });

      // Verify storage was called
      expect(mockLogsStorage.logDelivery).toHaveBeenCalledWith(logEntry);
    });

    it('should handle partial delivery failures gracefully', async () => {
      const alertEvent = createMockAlertEvent({
        id: 'partial-failure-test',
        severity: 'medium',
        userId: 'partial-failure-user'
      });

      // Make SMS provider fail
      const smsProvider = mockProviders.get(NotificationChannel.SMS);
      smsProvider.send.mockRejectedValue(new Error('SMS service unavailable'));

      const userPrefs = createMockUserPreferences({
        userId: 'partial-failure-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'medium' },
          { channel: 'sms', enabled: true, priority: 'medium' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      const logEntry = await orchestrator.processAlertEvent(alertEvent);

      // Should have one success and one failure
      const successfulDeliveries = logEntry.deliveries.filter(d => d.status === NotificationStatus.SENT);
      const failedDeliveries = logEntry.deliveries.filter(d => d.status === NotificationStatus.FAILED);

      expect(successfulDeliveries).toHaveLength(1);
      expect(failedDeliveries).toHaveLength(1);

      // Overall status should still be SENT (partial success)
      expect(logEntry.status).toBe(NotificationStatus.SENT);

      // Error summary should be present
      expect(logEntry.errorSummary).toBeDefined();
      expect(logEntry.errorSummary!.totalFailures).toBe(1);
    });

    it('should handle complete delivery failure', async () => {
      const alertEvent = createMockAlertEvent({
        id: 'complete-failure-test',
        severity: 'low',
        userId: 'complete-failure-user'
      });

      // Make both providers fail
      mockProviders.forEach(provider => {
        provider.send.mockRejectedValue(new Error(`${provider.name} service unavailable`));
      });

      const userPrefs = createMockUserPreferences({
        userId: 'complete-failure-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'low' },
          { channel: 'sms', enabled: true, priority: 'low' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      const logEntry = await orchestrator.processAlertEvent(alertEvent);

      // All deliveries should fail
      logEntry.deliveries.forEach(delivery => {
        expect(delivery.status).toBe(NotificationStatus.FAILED);
        expect(delivery.error).toBeDefined();
      });

      // Overall status should be FAILED
      expect(logEntry.status).toBe(NotificationStatus.FAILED);

      // Error summary should contain all failures
      expect(logEntry.errorSummary).toBeDefined();
      expect(logEntry.errorSummary!.totalFailures).toBe(2);
    });

    it('should respect rate limits during delivery', async () => {
      const alertEvent = createMockAlertEvent({
        id: 'rate-limit-test',
        severity: 'medium',
        userId: 'rate-limit-user'
      });

      // Mock rate limiter to block requests
      jest.spyOn(rateLimiter, 'checkAdaptiveLimit').mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60
      });

      const userPrefs = createMockUserPreferences({
        userId: 'rate-limit-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'medium' },
          { channel: 'sms', enabled: true, priority: 'medium' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      const logEntry = await orchestrator.processAlertEvent(alertEvent);

      // All deliveries should fail due to rate limiting
      logEntry.deliveries.forEach(delivery => {
        expect(delivery.status).toBe(NotificationStatus.FAILED);
        expect(delivery.error!.code).toBe('RATE_LIMITED');
      });

      expect(logEntry.status).toBe(NotificationStatus.FAILED);
    });

    it('should handle provider circuit breaker scenarios', async () => {
      const alertEvent = createMockAlertEvent({
        id: 'circuit-breaker-test',
        severity: 'high',
        userId: 'circuit-breaker-user'
      });

      // Make email provider consistently fail to trigger circuit breaker
      const emailProvider = mockProviders.get(NotificationChannel.EMAIL);
      emailProvider.send.mockRejectedValue(new Error('Email service consistently failing'));

      const userPrefs = createMockUserPreferences({
        userId: 'circuit-breaker-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'high' },
          { channel: 'sms', enabled: true, priority: 'high' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      // Process multiple events to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        const event = createMockAlertEvent({
          id: `circuit-breaker-event-${i}`,
          userId: 'circuit-breaker-user'
        });
        await orchestrator.processAlertEvent(event).catch(() => {});
      }

      // Circuit breaker should be open for email provider
      const emailProviderHealth = orchestrator.getProviderHealth('email');
      expect(emailProviderHealth.status).toBe('unhealthy');
    });

    it('should handle concurrent notification processing', async () => {
      const userPrefs = createMockUserPreferences({
        userId: 'concurrent-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'high' },
          { channel: 'sms', enabled: true, priority: 'high' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      // Create multiple events
      const events = Array.from({ length: 5 }, (_, i) =>
        createMockAlertEvent({
          id: `concurrent-event-${i}`,
          type: 'price_alert' as any,
          severity: 'medium',
          userId: 'concurrent-user'
        })
      );

      // Process all events concurrently
      const promises = events.map(event => orchestrator.processAlertEvent(event));
      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(logEntry => {
        expect(logEntry.status).toBe(NotificationStatus.SENT);
        expect(logEntry.deliveries).toHaveLength(2);
      });

      expect(results).toHaveLength(5);
    });

    it('should measure and record performance metrics', async () => {
      const alertEvent = createMockAlertEvent({
        id: 'performance-test',
        severity: 'high',
        userId: 'performance-user'
      });

      const userPrefs = createMockUserPreferences({
        userId: 'performance-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'high' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      const startTime = Date.now();
      const logEntry = await orchestrator.processAlertEvent(alertEvent);
      const endTime = Date.now();

      // Verify metrics are recorded
      expect(logEntry.metrics.totalTime).toBeGreaterThan(0);
      expect(logEntry.metrics.routingTime).toBeGreaterThan(0);
      expect(logEntry.metrics.deliveryTime).toBeGreaterThan(0);

      // Total time should be reasonable (less than 5 seconds for this test)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(logEntry.totalTime).toBeLessThan(5000);
    });

    it('should handle malformed alert events gracefully', async () => {
      const malformedEvent = {
        id: 'malformed-event',
        // Missing required fields like userId, type, etc.
      } as any;

      const logEntry = await orchestrator.processAlertEvent(malformedEvent);

      // Should handle gracefully with error logging
      expect(logEntry.status).toBe(NotificationStatus.FAILED);
      expect(logEntry.deliveries).toHaveLength(0);
      expect(logEntry.errorSummary).toBeDefined();
    });

    it('should handle provider initialization failures', async () => {
      // Create a provider that fails to initialize
      const failingProvider = {
        type: 'push' as NotificationChannel,
        name: 'push',
        initialize: jest.fn().mockRejectedValue(new Error('Push service unavailable')),
        send: jest.fn(),
        healthCheck: jest.fn(),
        getConfig: jest.fn(),
        updateConfig: jest.fn()
      };

      await expect(orchestrator.registerProvider(failingProvider)).rejects.toThrow('Push service unavailable');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume notification bursts', async () => {
      const userPrefs = createMockUserPreferences({
        userId: 'burst-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'high' },
          { channel: 'sms', enabled: true, priority: 'high' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      // Create 100 events
      const events = Array.from({ length: 100 }, (_, i) =>
        createMockAlertEvent({
          id: `burst-event-${i}`,
          severity: 'medium',
          userId: 'burst-user'
        })
      );

      const startTime = Date.now();

      // Process in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        await Promise.all(batch.map((event: any) => orchestrator.processAlertEvent(event)));
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (adjust based on system performance)
      expect(totalTime).toBeLessThan(30000); // 30 seconds for 100 notifications

      console.log(`Processed 100 notifications in ${totalTime}ms`);
    });

    it('should maintain performance under concurrent load', async () => {
      const userPrefs = createMockUserPreferences({
        userId: 'load-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'medium' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      // Create concurrent load
      const concurrentEvents = Array.from({ length: 20 }, (_, i) =>
        createMockAlertEvent({
          id: `concurrent-load-${i}`,
          severity: 'medium',
          userId: 'load-user'
        })
      );

      const startTime = Date.now();
      const promises = concurrentEvents.map((event: any) => orchestrator.processAlertEvent(event));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // All should succeed
      results.forEach(logEntry => {
        expect(logEntry.status).toBe(NotificationStatus.SENT);
      });

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 20 concurrent notifications

      console.log(`Processed 20 concurrent notifications in ${totalTime}ms`);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary provider failures', async () => {
      const alertEvent = createMockAlertEvent({
        id: 'recovery-test',
        severity: 'high',
        userId: 'recovery-user'
      });

      const userPrefs = createMockUserPreferences({
        userId: 'recovery-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'high' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      // First attempt fails
      const emailProvider = mockProviders.get(NotificationChannel.EMAIL);
      emailProvider.send.mockRejectedValueOnce(new Error('Temporary network error'));

      // Process event - should retry and succeed
      const logEntry = await orchestrator.processAlertEvent(alertEvent);

      // Should eventually succeed due to retry logic
      expect(logEntry.status).toBe(NotificationStatus.SENT);
      expect(logEntry.deliveries[0]!.retryAttempts).toBeGreaterThan(0);
    });

    it('should handle storage failures gracefully', async () => {
      const alertEvent = createMockAlertEvent({
        id: 'storage-failure-test',
        severity: 'medium',
        userId: 'storage-failure-user'
      });

      // Make storage fail
      mockLogsStorage.logDelivery.mockRejectedValue(new Error('Database connection lost'));

      const userPrefs = createMockUserPreferences({
        userId: 'storage-failure-user',
        channels: [
          { channel: 'email', enabled: true, priority: 'medium' }
        ]
      });

      (router as any).storage.getUserPreferences.mockResolvedValue(userPrefs);

      // Should still process delivery but fail to log
      const logEntry = await orchestrator.processAlertEvent(alertEvent);

      expect(logEntry.status).toBe(NotificationStatus.SENT);
      expect(logEntry.deliveries[0]!.status).toBe(NotificationStatus.SENT);

      // Log storage should have been called but failed
      expect(mockLogsStorage.logDelivery).toHaveBeenCalled();
    });
  });
});
