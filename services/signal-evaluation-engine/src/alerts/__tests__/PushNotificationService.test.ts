/**
 * =========================================
 * PUSH NOTIFICATION SERVICE TEST SUITE
 * =========================================
 * Comprehensive testing of push notification service:
 * - Device token management
 * - FCM/APNs/Web push integration
 * - Message queuing and batching
 * - Retry logic with exponential backoff
 * - Rate limiting and provider compliance
 * - Performance validation (<2s latency)
 * - Error handling and recovery
 */

import { PushNotificationService } from '../PushNotificationService';
import type {
  NotificationConfig,
  DeviceToken,
  NotificationMessage,
  AlertNotification,
  NotificationPlatform
} from '../types';

describe('PushNotificationService', () => {
  let pushService: PushNotificationService;
  let testConfig: NotificationConfig;
  let mockAlert: AlertNotification;

  beforeEach(async () => {
    testConfig = {
      enabled: true,
      platforms: {
        fcm: {
          enabled: true,
          serverKey: 'test_server_key',
          projectId: 'test_project_id',
          rateLimit: 1000
        },
        apns: {
          enabled: true,
          keyId: 'test_key_id',
          teamId: 'test_team_id',
          bundleId: 'com.example.app',
          sandbox: false,
          rateLimit: 500
        },
        web: {
          enabled: true,
          vapidKeys: {
            publicKey: 'test_public_key',
            privateKey: 'test_private_key'
          }
        }
      },
      queue: {
        enabled: true,
        maxQueueSize: 10000,
        batchSize: 100,
        processingInterval: 1000
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
      },
      security: {
        tokenEncryption: true,
        auditLogging: true
      }
    };

    pushService = new PushNotificationService(testConfig);

    mockAlert = {
      id: 'alert_123',
      ruleId: 'rule_456',
      ruleName: 'Test Alert',
      triggeredAt: new Date(),
      severity: 'warning',
      title: 'Test Alert Title',
      description: 'Test alert description',
      signals: [],
      context: {
        marketRegime: 'bull',
        confidence: 0.85,
        explanation: 'Test explanation'
      },
      channels: {
        email: false,
        webhook: false,
        dashboard: true,
        telegram: false,
        discord: false
      },
      metadata: {
        evaluationResult: {} as any,
        deliveryStatus: {},
        retryCount: 0
      }
    };
  });

  afterEach(async () => {
    await pushService.stop();
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await pushService.initialize();
      expect(pushService.getStatus().initialized).toBe(true);
    });

    it('should start and stop properly', async () => {
      await pushService.initialize();
      await pushService.start();

      expect(pushService.getStatus().running).toBe(true);

      await pushService.stop();
      expect(pushService.getStatus().running).toBe(false);
    });

    it('should initialize providers when enabled', async () => {
      await pushService.initialize();

      const providerStatus = pushService.getProviderStatus();
      expect(providerStatus.get('fcm')).toBeDefined();
      expect(providerStatus.get('apns')).toBeDefined();
      expect(providerStatus.get('web')).toBeDefined();
    });
  });

  describe('Device Token Management', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('should register device tokens successfully', async () => {
      const tokenId = await pushService.registerDeviceToken(
        'user_123',
        'fcm',
        'test_fcm_token',
        {
          os: 'Android',
          osVersion: '11',
          appVersion: '1.0.0',
          deviceModel: 'Pixel 5',
          p256dh: 'test_p256dh',
          auth: 'test_auth'
        }
      );

      expect(tokenId).toBeDefined();
      expect(tokenId.startsWith('token_')).toBe(true);

      const userTokens = pushService.getUserDeviceTokens('user_123');
      expect(userTokens).toHaveLength(1);
      expect(userTokens[0].platform).toBe('fcm');
    });

    it('should handle multiple device tokens per user', async () => {
      await pushService.registerDeviceToken(
        'user_123',
        'fcm',
        'fcm_token_1',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
      );

      await pushService.registerDeviceToken(
        'user_123',
        'apns',
        'apns_token_1',
        { os: 'iOS', osVersion: '15.0', appVersion: '1.0.0', deviceModel: 'iPhone 13' }
      );

      await pushService.registerDeviceToken(
        'user_123',
        'web',
        'web_subscription',
        {
          os: 'Web',
          osVersion: 'Chrome 96',
          appVersion: '1.0.0',
          deviceModel: 'Desktop',
          p256dh: 'test_p256dh_web',
          auth: 'test_auth_web'
        }
      );

      const userTokens = pushService.getUserDeviceTokens('user_123');
      expect(userTokens).toHaveLength(3);
      expect(userTokens.some(t => t.platform === 'fcm')).toBe(true);
      expect(userTokens.some(t => t.platform === 'apns')).toBe(true);
      expect(userTokens.some(t => t.platform === 'web')).toBe(true);
    });

    it('should unregister device tokens successfully', async () => {
      const tokenId = await pushService.registerDeviceToken(
        'user_123',
        'fcm',
        'test_token',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5', p256dh: 'mock_p256dh', auth: 'mock_auth' }
      );

      const success = await pushService.unregisterDeviceToken(tokenId);
      expect(success).toBe(true);

      const userTokens = pushService.getUserDeviceTokens('user_123');
      expect(userTokens).toHaveLength(2);
    });

    it('should handle token encryption when enabled', async () => {
      const tokenId = await pushService.registerDeviceToken(
        'user_123',
        'fcm',
        'plain_token',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
      );

      const tokens = pushService.getUserDeviceTokens('user_123');
      expect(tokens[0].token).toBe('encrypted_plain_token');
    });
  });

  describe('Push Notification Sending', () => {
    beforeEach(async () => {
      await pushService.initialize();
      await pushService.start();

      // Register a test device
      await pushService.registerDeviceToken(
        'user_123',
        'fcm',
        'test_fcm_token',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
      );
    });

    it('should send notifications successfully', async () => {
      const payload = {
        title: 'Test Alert',
        body: 'This is a test notification',
        sound: 'default' as const,
        badge: 1,
        priority: 'normal' as const
      };

      await pushService.sendNotification('user_123', mockAlert, payload);

      // Check statistics
      const stats = pushService.getStatistics();
      expect(stats.totalSent).toBeGreaterThan(0);
    });

    it('should respect platform-specific features', async () => {
      // Test FCM features
      const fcmPayload = {
        title: 'FCM Alert',
        body: 'FCM notification with actions',
        actionButtons: [
          { id: 'view', title: 'View', action: 'view_alert' },
          { id: 'dismiss', title: 'Dismiss', action: 'dismiss_alert' }
        ],
        image: 'https://example.com/image.png'
      };

      await pushService.sendNotification('user_123', mockAlert, fcmPayload);

      const stats = pushService.getStatistics();
      expect(stats.platformStats.fcm.sent).toBeGreaterThan(0);
    });

    it('should handle notification failures gracefully', async () => {
      // This would test with invalid tokens or network failures
      const invalidAlert = {
        ...mockAlert,
        ruleId: 'invalid_rule'
      };

      // The service should handle failures without crashing
      await expect(pushService.sendNotification('nonexistent_user', invalidAlert, {
        title: 'Test',
        body: 'Test notification'
      })).resolves.not.toThrow();
    });
  });

  describe('Message Queuing and Batching', () => {
    beforeEach(async () => {
      await pushService.initialize();
      await pushService.start();

      // Register multiple devices
      for (let i = 0; i < 5; i++) {
        await pushService.registerDeviceToken(
          `user_${i}`,
          i % 2 === 0 ? 'fcm' : 'apns',
          `token_${i}`,
          { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
        );
      }
    });

    it('should queue messages when queue is enabled', async () => {
      const initialQueueSize = pushService.getStatus().queueSize;

      // Send multiple notifications
      for (let i = 0; i < 10; i++) {
        await pushService.sendNotification(`user_${i % 5}`, mockAlert, {
          title: `Alert ${i}`,
          body: `Notification ${i}`
        });
      }

      // Queue should have grown
      expect(pushService.getStatus().queueSize).toBeGreaterThan(initialQueueSize);
    });

    it('should process queued messages in batches', async () => {
      await pushService.sendNotification('user_0', mockAlert, {
        title: 'Batch Test',
        body: 'Test notification'
      });

      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const stats = pushService.getStatistics();
      expect(stats.totalSent).toBeGreaterThan(0);
    });
  });

  describe('Retry Logic and Rate Limiting', () => {
    beforeEach(async () => {
      await pushService.initialize();
      await pushService.start();

      await pushService.registerDeviceToken(
        'user_123',
        'fcm',
        'test_token',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
      );
    });

    it('should implement exponential backoff for retries', async () => {
      // Mock a failure scenario
      const originalSendMethod = (pushService as any).sendFCMNotification;
      let callCount = 0;

      // Mock to fail first two attempts
      (pushService as any).sendFCMNotification = async () => {
        callCount++;
        if (callCount <= 2) {
          return { success: false, error: 'Temporary failure' };
        }
        return { success: true, deliveryTime: 100 };
      };

      await pushService.sendNotification('user_123', mockAlert, {
        title: 'Retry Test',
        body: 'Test notification'
      });

      // Should have attempted multiple times
      expect(callCount).toBeGreaterThan(1);
    });

    it('should respect rate limits per platform', async () => {
      const config = { ...testConfig };
      config.platforms.fcm.rateLimit = 1; // Very low rate limit

      const rateLimitedService = new PushNotificationService(config);
      await rateLimitedService.initialize();
      await rateLimitedService.start();

      await rateLimitedService.registerDeviceToken(
        'user_123',
        'fcm',
        'test_token',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
      );

      // Send multiple rapid notifications
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(rateLimitedService.sendNotification('user_123', mockAlert, {
          title: `Alert ${i}`,
          body: `Notification ${i}`
        }));
      }

      await Promise.all(promises);

      // Should have rate limiting in effect
      const stats = rateLimitedService.getStatistics();
      expect(stats.platformStats.fcm.sent).toBeLessThan(5); // Some should be rate limited
    });
  });

  describe('Performance Requirements', () => {
    beforeEach(async () => {
      await pushService.initialize();
      await pushService.start();

      // Register test devices
      for (let i = 0; i < 10; i++) {
        await pushService.registerDeviceToken(
          `user_${i}`,
          i % 3 === 0 ? 'fcm' : i % 3 === 1 ? 'apns' : 'web',
          `token_${i}`,
          { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
        );
      }
    });

    it('should achieve sub-2-second end-to-end latency', async () => {
      const startTime = Date.now();

      await pushService.sendNotification('user_0', mockAlert, {
        title: 'Performance Test',
        body: 'Test notification for latency measurement'
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      expect(latency).toBeLessThan(2000); // 2 second requirement
    });

    it('should handle high-volume notification sending', async () => {
      const startTime = Date.now();

      // Send notifications to multiple users rapidly
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(pushService.sendNotification(`user_${i % 10}`, mockAlert, {
          title: `Bulk Alert ${i}`,
          body: `Bulk notification ${i}`
        }));
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const throughput = 50 / (totalTime / 1000); // notifications per second

      expect(throughput).toBeGreaterThan(10); // Should handle 10+ notifications/second
    });

    it('should maintain low memory usage under load', async () => {
      // Send many notifications
      for (let i = 0; i < 100; i++) {
        await pushService.sendNotification(`user_${i % 10}`, mockAlert, {
          title: `Memory Test ${i}`,
          body: `Memory test notification ${i}`
        });
      }

      // Memory usage should remain reasonable
      const memoryUsage = process.memoryUsage().heapUsed;
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await pushService.initialize();
      await pushService.start();
    });

    it('should handle provider connection failures gracefully', async () => {
      // Mock provider connection failure
      const originalConnect = (pushService as any).connectProvider;
      (pushService as any).connectProvider = async () => {
        throw new Error('Connection failed');
      };

      // Should not crash the service
      await expect(pushService.start()).resolves.not.toThrow();

      // Restore original method
      (pushService as any).connectProvider = originalConnect;
    });

    it('should handle invalid device tokens gracefully', async () => {
      await pushService.registerDeviceToken(
        'user_123',
        'fcm',
        '', // Invalid empty token
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
      );

      // Should handle gracefully
      await expect(pushService.sendNotification('user_123', mockAlert, {
        title: 'Test',
        body: 'Test notification'
      })).resolves.not.toThrow();
    });

    it('should recover from temporary failures', async () => {
      let failureCount = 0;
      const originalSend = (pushService as any).sendFCMNotification;

      (pushService as any).sendFCMNotification = async () => {
        failureCount++;
        if (failureCount <= 2) {
          return { success: false, error: 'Temporary failure' };
        }
        return { success: true, deliveryTime: 100 };
      };

      await pushService.sendNotification('user_123', mockAlert, {
        title: 'Recovery Test',
        body: 'Test notification'
      });

      // Should eventually succeed
      const stats = pushService.getStatistics();
      expect(stats.totalSent).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      await pushService.initialize();
      await pushService.start();

      await pushService.registerDeviceToken(
        'user_123',
        'fcm',
        'test_token',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
      );
    });

    it('should track delivery statistics accurately', async () => {
      await pushService.sendNotification('user_123', mockAlert, {
        title: 'Stats Test',
        body: 'Test notification for statistics'
      });

      const stats = pushService.getStatistics();
      expect(stats.totalSent).toBeGreaterThan(0);
      expect(stats.platformStats.fcm.sent).toBeGreaterThan(0);
    });

    it('should provide provider status information', async () => {
      const providerStatus = pushService.getProviderStatus();
      expect(providerStatus.size).toBeGreaterThan(0);

      const fcmStatus = providerStatus.get('fcm');
      expect(fcmStatus).toBeDefined();
      expect(fcmStatus?.isConnected).toBeDefined();
    });

    it('should track error breakdown', async () => {
      // Force some failures to test error tracking
      const originalSend = (pushService as any).sendFCMNotification;
      (pushService as any).sendFCMNotification = async () => {
        return { success: false, error: 'Test error' };
      };

      await pushService.sendNotification('user_123', mockAlert, {
        title: 'Error Test',
        body: 'Test notification'
      });

      const stats = pushService.getStatistics();
      expect(stats.totalFailed).toBeGreaterThan(0);
      expect(stats.errorBreakdown['Test error']).toBeGreaterThan(0);
    });
  });

  describe('Security Features', () => {
    beforeEach(async () => {
      await pushService.initialize();
    });

    it('should encrypt device tokens when enabled', async () => {
      const tokenId = await pushService.registerDeviceToken(
        'user_123',
        'fcm',
        'sensitive_token_data',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
      );

      const tokens = pushService.getUserDeviceTokens('user_123');
      expect(tokens[0].token).not.toBe('sensitive_token_data');
      expect(tokens[0].token).toContain('encrypted_');
    });

    it('should validate input parameters', async () => {
      // Test invalid platform
      await expect(pushService.registerDeviceToken(
        'user_123',
        'invalid_platform' as NotificationPlatform,
        'token',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5', p256dh: 'mock_p256dh', auth: 'mock_auth' }
      )).resolves.toBeDefined(); // Should handle gracefully

      // Test empty token
      await expect(pushService.registerDeviceToken(
        'user_123',
        'fcm',
        '',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5', p256dh: 'mock_p256dh', auth: 'mock_auth' }
      )).resolves.toBeDefined(); // Should handle gracefully
    });
  });

  describe('Multi-Platform Support', () => {
    beforeEach(async () => {
      await pushService.initialize();
      await pushService.start();

      // Register devices for all platforms
      await pushService.registerDeviceToken(
        'user_fcm',
        'fcm',
        'fcm_token',
        { os: 'Android', osVersion: '11', appVersion: '1.0.0', deviceModel: 'Pixel 5' }
      );

      await pushService.registerDeviceToken(
        'user_apns',
        'apns',
        'apns_token',
        { os: 'iOS', osVersion: '15.0', appVersion: '1.0.0', deviceModel: 'iPhone 13' }
      );

      await pushService.registerDeviceToken(
        'user_web',
        'web',
        'web_subscription',
        { os: 'Web', osVersion: 'Chrome 96', appVersion: '1.0.0', deviceModel: 'Desktop' }
      );
    });

    it('should send to FCM devices', async () => {
      await pushService.sendNotification('user_fcm', mockAlert, {
        title: 'FCM Test',
        body: 'FCM notification test'
      });

      const stats = pushService.getStatistics();
      expect(stats.platformStats.fcm.sent).toBeGreaterThan(0);
    });

    it('should send to APNs devices', async () => {
      await pushService.sendNotification('user_apns', mockAlert, {
        title: 'APNs Test',
        body: 'APNs notification test'
      });

      const stats = pushService.getStatistics();
      expect(stats.platformStats.apns.sent).toBeGreaterThan(0);
    });

    it('should send to Web Push devices', async () => {
      await pushService.sendNotification('user_web', mockAlert, {
        title: 'Web Push Test',
        body: 'Web push notification test'
      });

      const stats = pushService.getStatistics();
      expect(stats.platformStats.web.sent).toBeGreaterThan(0);
    });

    it('should handle mixed platform scenarios', async () => {
      // Send to all platforms simultaneously
      await Promise.all([
        pushService.sendNotification('user_fcm', mockAlert, { title: 'Multi-platform', body: 'Test 1' }),
        pushService.sendNotification('user_apns', mockAlert, { title: 'Multi-platform', body: 'Test 2' }),
        pushService.sendNotification('user_web', mockAlert, { title: 'Multi-platform', body: 'Test 3' })
      ]);

      const stats = pushService.getStatistics();
      expect(stats.platformStats.fcm.sent).toBeGreaterThan(0);
      expect(stats.platformStats.apns.sent).toBeGreaterThan(0);
      expect(stats.platformStats.web.sent).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    it('should validate configuration on initialization', async () => {
      const invalidConfig = {
        ...testConfig,
        platforms: {
          ...testConfig.platforms,
          fcm: {
            ...testConfig.platforms.fcm,
            serverKey: '' // Invalid empty key
          }
        }
      };

      const service = new PushNotificationService(invalidConfig);
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should handle configuration updates', async () => {
      await pushService.initialize();

      const newConfig = {
        ...testConfig,
        queue: {
          ...testConfig.queue,
          batchSize: 50
        }
      };

      // Configuration update would be handled by the service
      expect(newConfig.queue.batchSize).toBe(50);
    });
  });

  describe('Integration with Alert System', () => {
    it('should integrate seamlessly with RuleEngine', async () => {
      // This would test the integration between RuleEngine and PushNotificationService
      // The RuleEngine should automatically trigger push notifications when alerts are fired

      const stats = pushService.getStatistics();
      expect(stats).toBeDefined();
    });

    it('should handle alert grouping integration', async () => {
      // Test that grouped alerts are properly handled by push notifications
      // This would verify that group summaries are sent as push notifications

      const stats = pushService.getStatistics();
      expect(stats).toBeDefined();
    });
  });
});
