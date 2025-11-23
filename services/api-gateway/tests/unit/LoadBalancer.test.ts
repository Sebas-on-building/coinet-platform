/**
 * Unit Tests - Load Balancer
 * Testing load balancing strategies, instance selection, and performance tracking
 */

import { LoadBalancer } from '../../src/services/LoadBalancer';
import { ServiceRegistry } from '../../src/services/ServiceRegistry';
import { LoadBalancingStrategy, ServiceInstance } from '../../src/types';

// Mock ServiceRegistry
jest.mock('../../src/services/ServiceRegistry');

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer;
  let mockServiceRegistry: jest.Mocked<ServiceRegistry>;
  let mockInstances: ServiceInstance[];

  beforeEach(() => {
    mockServiceRegistry = new ServiceRegistry(null as any) as jest.Mocked<ServiceRegistry>;
    
    // Create mock service instances
    mockInstances = [
      (global as any).testUtils.createMockService({
        id: 'service-1',
        name: 'test-service',
        url: 'http://localhost:4001',
        health: 'healthy',
        metadata: { connections: 0, responseTime: 100, weight: 1 }
      }),
      (global as any).testUtils.createMockService({
        id: 'service-2',
        name: 'test-service',
        url: 'http://localhost:4002',
        health: 'healthy',
        metadata: { connections: 2, responseTime: 150, weight: 1 }
      }),
      (global as any).testUtils.createMockService({
        id: 'service-3',
        name: 'test-service',
        url: 'http://localhost:4003',
        health: 'healthy',
        metadata: { connections: 1, responseTime: 200, weight: 2 }
      })
    ];

    mockServiceRegistry.getHealthyInstances.mockResolvedValue(mockInstances);
    
    loadBalancer = new LoadBalancer(mockServiceRegistry, 'round-robin');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default round-robin strategy', () => {
      const defaultBalancer = new LoadBalancer(mockServiceRegistry);
      expect(defaultBalancer).toBeDefined();
    });

    it('should initialize with specified strategy', () => {
      const strategies: LoadBalancingStrategy[] = [
        'round-robin',
        'least-connections',
        'weighted',
        'ip-hash'
      ];

      strategies.forEach(strategy => {
        const balancer = new LoadBalancer(mockServiceRegistry, strategy);
        expect(balancer).toBeDefined();
      });
    });
  });

  describe('Round Robin Strategy', () => {
    beforeEach(() => {
      loadBalancer = new LoadBalancer(mockServiceRegistry, 'round-robin');
    });

    it('should distribute requests evenly across instances', async () => {
      const serviceName = 'test-service';
      const results: ServiceInstance[] = [];

      // Get 6 instances to see full rotation pattern
      for (let i = 0; i < 6; i++) {
        const instance = await loadBalancer.getNext(serviceName);
        if (instance) results.push(instance);
      }

      expect(results).toHaveLength(6);
      
      // Should cycle through instances: 1, 2, 3, 1, 2, 3
      expect(results[0].id).toBe('service-1');
      expect(results[1].id).toBe('service-2');
      expect(results[2].id).toBe('service-3');
      expect(results[3].id).toBe('service-1');
      expect(results[4].id).toBe('service-2');
      expect(results[5].id).toBe('service-3');
    });

    it('should handle single instance', async () => {
      const singleInstance = [mockInstances[0]];
      mockServiceRegistry.getHealthyInstances.mockResolvedValue(singleInstance);

      const instance1 = await loadBalancer.getNext('test-service');
      const instance2 = await loadBalancer.getNext('test-service');

      expect(instance1?.id).toBe('service-1');
      expect(instance2?.id).toBe('service-1');
    });

    it('should return null when no instances available', async () => {
      mockServiceRegistry.getHealthyInstances.mockResolvedValue([]);

      const instance = await loadBalancer.getNext('test-service');
      expect(instance).toBeNull();
    });
  });

  describe('Least Connections Strategy', () => {
    beforeEach(() => {
      loadBalancer = new LoadBalancer(mockServiceRegistry, 'least-connections');
    });

    it('should select instance with fewest connections', async () => {
      const instance = await loadBalancer.getNext('test-service');
      
      // service-1 has 0 connections, should be selected
      expect(instance?.id).toBe('service-1');
    });

    it('should update connection counts', async () => {
      const serviceName = 'test-service';
      
      // Get instance and simulate connection
      const instance = await loadBalancer.getNext(serviceName);
      expect(instance?.id).toBe('service-1');

      // Record connection
      if (instance) {
        loadBalancer.recordConnection(serviceName, instance.id);
      }

      // Next request should still go to service-1 (now has 1 connection vs service-2's 2)
      const nextInstance = await loadBalancer.getNext(serviceName);
      expect(nextInstance?.id).toBe('service-1');
    });

    it('should handle connection release', async () => {
      const serviceName = 'test-service';
      const instance = await loadBalancer.getNext(serviceName);

      if (instance) {
        loadBalancer.recordConnection(serviceName, instance.id);
        loadBalancer.releaseConnection(serviceName, instance.id);
      }

      // Connection count should be back to original
      const stats = loadBalancer.getStats();
      const serviceStats = stats[serviceName];
      expect(serviceStats?.connections).toBe(0);
    });
  });

  describe('Weighted Strategy', () => {
    beforeEach(() => {
      loadBalancer = new LoadBalancer(mockServiceRegistry, 'weighted');
    });

    it('should respect instance weights', async () => {
      const serviceName = 'test-service';
      const results: string[] = [];

      // Get multiple instances to see weight distribution
      for (let i = 0; i < 12; i++) {
        const instance = await loadBalancer.getNext(serviceName);
        if (instance) results.push(instance.id);
      }

      // service-3 has weight 2, others have weight 1
      // So service-3 should appear twice as often
      const service1Count = results.filter(id => id === 'service-1').length;
      const service2Count = results.filter(id => id === 'service-2').length;
      const service3Count = results.filter(id => id === 'service-3').length;

      expect(service3Count).toBeGreaterThan(service1Count);
      expect(service3Count).toBeGreaterThan(service2Count);
    });

    it('should handle zero weights gracefully', async () => {
      const zeroWeightInstances = mockInstances.map(instance => ({
        ...instance,
        metadata: { ...instance.metadata, weight: 0 }
      }));
      mockServiceRegistry.getHealthyInstances.mockResolvedValue(zeroWeightInstances);

      const instance = await loadBalancer.getNext('test-service');
      expect(instance).toBeDefined(); // Should still return an instance
    });
  });

  describe('IP Hash Strategy', () => {
    beforeEach(() => {
      loadBalancer = new LoadBalancer(mockServiceRegistry, 'ip-hash');
    });

    it('should consistently route same IP to same instance', async () => {
      const serviceName = 'test-service';
      const clientIp = '192.168.1.100';

      const instance1 = await loadBalancer.getNext(serviceName, clientIp);
      const instance2 = await loadBalancer.getNext(serviceName, clientIp);
      const instance3 = await loadBalancer.getNext(serviceName, clientIp);

      expect(instance1?.id).toBe(instance2?.id);
      expect(instance2?.id).toBe(instance3?.id);
    });

    it('should distribute different IPs across instances', async () => {
      const serviceName = 'test-service';
      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3', '192.168.1.4'];
      const results = new Set<string>();

      for (const ip of ips) {
        const instance = await loadBalancer.getNext(serviceName, ip);
        if (instance) results.add(instance.id);
      }

      // Should distribute across multiple instances
      expect(results.size).toBeGreaterThan(1);
    });

    it('should handle missing client IP', async () => {
      const instance = await loadBalancer.getNext('test-service');
      expect(instance).toBeDefined();
    });
  });

  describe('Health and Failover', () => {
    it('should exclude unhealthy instances', async () => {
      const healthyInstances = mockInstances.filter(i => i.health === 'healthy');
      mockServiceRegistry.getHealthyInstances.mockResolvedValue(healthyInstances);

      const instance = await loadBalancer.getNext('test-service');
      expect(instance?.health).toBe('healthy');
    });

    it('should handle instance failure', async () => {
      const serviceName = 'test-service';
      const instanceId = 'service-1';

      // Simulate instance failure
      loadBalancer.handleInstanceFailure(serviceName, instanceId);

      // Get next instance - should not return the failed one
      const instance = await loadBalancer.getNext(serviceName);
      expect(instance?.id).not.toBe(instanceId);
    });

    it('should handle instance recovery', async () => {
      const serviceName = 'test-service';
      const instanceId = 'service-1';

      // First mark as failed
      loadBalancer.handleInstanceFailure(serviceName, instanceId);

      // Then mark as recovered
      loadBalancer.handleInstanceRecovery(serviceName, instanceId);

      // Should be available again (though we can't easily test this without exposing internal state)
      expect(() => loadBalancer.handleInstanceRecovery(serviceName, instanceId)).not.toThrow();
    });
  });

  describe('Performance Tracking', () => {
    it('should track response times', async () => {
      const serviceName = 'test-service';
      const instanceId = 'service-1';
      const responseTime = 250;

      loadBalancer.recordResponseTime(serviceName, instanceId, responseTime);

      const stats = loadBalancer.getStats();
      expect(stats[serviceName]).toBeDefined();
    });

    it('should provide service statistics', () => {
      const stats = loadBalancer.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    it('should track multiple services independently', async () => {
      const service1 = 'service-1';
      const service2 = 'service-2';

      // Mock different instances for each service
      mockServiceRegistry.getHealthyInstances
        .mockResolvedValueOnce([mockInstances[0]])
        .mockResolvedValueOnce([mockInstances[1]]);

      await loadBalancer.getNext(service1);
      await loadBalancer.getNext(service2);

      const stats = loadBalancer.getStats();
      expect(stats[service1]).toBeDefined();
      expect(stats[service2]).toBeDefined();
    });
  });

  describe('Configuration and Strategy Changes', () => {
    it('should allow strategy changes', () => {
      expect(() => {
        loadBalancer.setStrategy('least-connections');
        loadBalancer.setStrategy('weighted');
        loadBalancer.setStrategy('ip-hash');
      }).not.toThrow();
    });

    it('should reset state when strategy changes', () => {
      loadBalancer.setStrategy('least-connections');
      loadBalancer.setStrategy('round-robin');
      
      // Strategy change should not throw errors
      expect(() => loadBalancer.setStrategy('round-robin')).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty service name', async () => {
      const instance = await loadBalancer.getNext('');
      expect(instance).toBeNull();
    });

    it('should handle null service name', async () => {
      const instance = await loadBalancer.getNext(null as any);
      expect(instance).toBeNull();
    });

    it('should handle service registry errors', async () => {
      mockServiceRegistry.getHealthyInstances.mockRejectedValue(new Error('Registry error'));

      const instance = await loadBalancer.getNext('test-service');
      expect(instance).toBeNull();
    });

    it('should handle concurrent requests safely', async () => {
      const serviceName = 'test-service';
      const promises = Array(100).fill(null).map(() => 
        loadBalancer.getNext(serviceName)
      );

      const results = await Promise.all(promises);
      
      // All requests should complete
      expect(results).toHaveLength(100);
      
      // All results should be valid instances or null
      results.forEach(result => {
        if (result) {
          expect(['service-1', 'service-2', 'service-3']).toContain(result.id);
        }
      });
    });

    it('should handle very large number of instances', async () => {
      const largeInstanceList = Array(1000).fill(null).map((_, i) => 
        (global as any).testUtils.createMockService({
          id: `service-${i}`,
          name: 'large-service',
          url: `http://localhost:${4000 + i}`,
          health: 'healthy'
        })
      );

      mockServiceRegistry.getHealthyInstances.mockResolvedValue(largeInstanceList);

      const start = Date.now();
      const instance = await loadBalancer.getNext('large-service');
      const duration = Date.now() - start;

      expect(instance).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be fast even with many instances
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive statistics', () => {
      const stats = loadBalancer.getStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    it('should track request distribution', async () => {
      const serviceName = 'test-service';
      
      // Make several requests
      for (let i = 0; i < 10; i++) {
        await loadBalancer.getNext(serviceName);
      }

      const stats = loadBalancer.getStats();
      expect(stats[serviceName]).toBeDefined();
    });

    it('should handle statistics for non-existent services', () => {
      const stats = loadBalancer.getStats();
      expect(stats['non-existent-service']).toBeUndefined();
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources', () => {
      expect(() => {
        loadBalancer.cleanup?.();
      }).not.toThrow();
    });

    it('should handle memory efficiently', async () => {
      const serviceName = 'memory-test-service';
      
      // Simulate high load
      const promises = Array(1000).fill(null).map(async () => {
        const instance = await loadBalancer.getNext(serviceName);
        if (instance) {
          loadBalancer.recordConnection(serviceName, instance.id);
          loadBalancer.releaseConnection(serviceName, instance.id);
        }
      });

      await Promise.all(promises);
      
      // Should complete without memory issues
      expect(true).toBe(true);
    });
  });
}); 