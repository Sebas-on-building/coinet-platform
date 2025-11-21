/**
 * Performance Tests - API Gateway Load Testing
 * Testing throughput, latency, and resource usage under load
 */

import request from 'supertest';
import { RevolutionaryAPIGateway } from '../../src/RevolutionaryAPIGateway';
import { GatewayConfig } from '../../src/types';

describe('API Gateway - Performance Tests', () => {
  let gateway: RevolutionaryAPIGateway;
  let app: any;

  const performanceConfig: Partial<GatewayConfig> = {
    server: {
      port: 0,
      host: 'localhost',
      timeout: 30000,
      bodyLimit: '10mb'
    },
    redis: {
      url: 'redis://localhost:6379',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    },
    security: {
      cors: {
        origin: ['*'],
        credentials: false
      },
      helmet: {},
      rateLimit: {
        windowMs: 60000,
        max: 10000, // High limit for performance testing
        standardHeaders: true,
        legacyHeaders: false
      }
    },
    circuitBreaker: {
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 30000,
      resetTimeout: 60000
    },
    loadBalancer: {
      strategy: 'round-robin',
      healthCheckInterval: 30000,
      maxRetries: 3
    }
  };

  beforeAll(async () => {
    gateway = new RevolutionaryAPIGateway(performanceConfig);
    app = gateway['app']; // Access private app property for testing
    
    // Initialize without starting server
    await gateway['initializeRedis']();
    await gateway['initializeServices']();
  }, 30000);

  afterAll(async () => {
    if (gateway) {
      await gateway['cleanup']();
    }
  }, 15000);

  describe('Throughput Tests', () => {
    it('should handle high-frequency health check requests', async () => {
      const requestCount = 1000;
      const concurrency = 50;
      const batches = requestCount / concurrency;
      
      const startTime = Date.now();
      const results: any[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = Array(concurrency).fill(null).map(() =>
          request(app).get('/health')
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = requestCount / (duration / 1000);

      // Assertions
      expect(results.length).toBe(requestCount);
      expect(results.every(res => res.status === 200)).toBe(true);
      expect(throughput).toBeGreaterThan(100); // Should handle > 100 RPS
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds

      console.log(`Throughput: ${throughput.toFixed(2)} requests/second`);
      console.log(`Average latency: ${(duration / requestCount).toFixed(2)}ms`);
    }, 30000);

    it('should maintain performance under concurrent load', async () => {
      const concurrentUsers = 100;
      const requestsPerUser = 10;
      
      const startTime = Date.now();

      const userPromises = Array(concurrentUsers).fill(null).map(async () => {
        const userRequests = [];
        for (let i = 0; i < requestsPerUser; i++) {
          userRequests.push(request(app).get('/health'));
        }
        return Promise.all(userRequests);
      });

      const results = await Promise.all(userPromises);
      const endTime = Date.now();
      
      const totalRequests = concurrentUsers * requestsPerUser;
      const duration = endTime - startTime;
      const throughput = totalRequests / (duration / 1000);

      // Flatten results
      const allResponses = results.flat();

      expect(allResponses.length).toBe(totalRequests);
      expect(allResponses.every(res => res.status === 200)).toBe(true);
      expect(throughput).toBeGreaterThan(50); // Maintain decent throughput under load
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Concurrent throughput: ${throughput.toFixed(2)} requests/second`);
      console.log(`Total requests: ${totalRequests}, Duration: ${duration}ms`);
    }, 45000);
  });

  describe('Latency Tests', () => {
    it('should maintain low latency for health checks', async () => {
      const samples = 100;
      const latencies: number[] = [];

      for (let i = 0; i < samples; i++) {
        const start = Date.now();
        const response = await request(app).get('/health');
        const latency = Date.now() - start;
        
        latencies.push(latency);
        expect(response.status).toBe(200);
      }

      // Calculate statistics
      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const sortedLatencies = latencies.sort((a, b) => a - b);
      const p50 = sortedLatencies[Math.floor(samples * 0.5)];
      const p95 = sortedLatencies[Math.floor(samples * 0.95)];
      const p99 = sortedLatencies[Math.floor(samples * 0.99)];

      // Assertions
      expect(avgLatency).toBeLessThan(50); // Average < 50ms
      expect(p95).toBeLessThan(100); // 95th percentile < 100ms
      expect(p99).toBeLessThan(200); // 99th percentile < 200ms

      console.log(`Latency stats - Avg: ${avgLatency.toFixed(2)}ms, P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
    }, 15000);

    it('should handle request spikes gracefully', async () => {
      // Simulate a traffic spike
      const spikeSize = 200;
      const normalLoad = 10;

      // Normal load baseline
      const baselineStart = Date.now();
      const baselinePromises = Array(normalLoad).fill(null).map(() =>
        request(app).get('/health')
      );
      await Promise.all(baselinePromises);
      const baselineLatency = (Date.now() - baselineStart) / normalLoad;

      // Traffic spike
      const spikeStart = Date.now();
      const spikePromises = Array(spikeSize).fill(null).map(() =>
        request(app).get('/health')
      );
      const spikeResults = await Promise.all(spikePromises);
      const spikeLatency = (Date.now() - spikeStart) / spikeSize;

      // All requests should succeed
      expect(spikeResults.every(res => res.status === 200)).toBe(true);
      
      // Latency degradation should be reasonable
      const latencyIncrease = spikeLatency / baselineLatency;
      expect(latencyIncrease).toBeLessThan(5); // Less than 5x latency increase

      console.log(`Baseline latency: ${baselineLatency.toFixed(2)}ms`);
      console.log(`Spike latency: ${spikeLatency.toFixed(2)}ms`);
      console.log(`Latency increase factor: ${latencyIncrease.toFixed(2)}x`);
    }, 20000);
  });

  describe('Memory Usage Tests', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate sustained load
      const loadDuration = 10000; // 10 seconds
      const loadStart = Date.now();
      const activeRequests: Promise<any>[] = [];

      while (Date.now() - loadStart < loadDuration) {
        // Keep a rolling window of active requests
        if (activeRequests.length < 50) {
          const requestPromise = request(app).get('/health');
          activeRequests.push(requestPromise);
          
          // Clean up completed requests
          requestPromise.finally(() => {
            const index = activeRequests.indexOf(requestPromise);
            if (index > -1) {
              activeRequests.splice(index, 1);
            }
          });
        }

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for all requests to complete
      await Promise.all(activeRequests);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable
      expect(memoryIncreaseMB).toBeLessThan(100); // Less than 100MB increase

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      console.log(`Heap used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }, 15000);

    it('should clean up resources after requests', async () => {
      const iterations = 5;
      const requestsPerIteration = 100;
      const memoryMeasurements: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Make requests
        const promises = Array(requestsPerIteration).fill(null).map(() =>
          request(app).get('/health')
        );
        await Promise.all(promises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Measure memory
        const memory = process.memoryUsage().heapUsed;
        memoryMeasurements.push(memory);

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Memory should not continuously increase
      const firstMeasurement = memoryMeasurements[0];
      const lastMeasurement = memoryMeasurements[memoryMeasurements.length - 1];
      const memoryGrowth = (lastMeasurement - firstMeasurement) / firstMeasurement;

      expect(memoryGrowth).toBeLessThan(0.5); // Less than 50% growth

      console.log(`Memory growth: ${(memoryGrowth * 100).toFixed(2)}%`);
    }, 20000);
  });

  describe('Resource Limits Tests', () => {
    it('should handle maximum concurrent connections', async () => {
      const maxConnections = 500;
      const timeout = 30000;

      const connectionPromises = Array(maxConnections).fill(null).map(async (_, index) => {
        try {
          const response = await Promise.race([
            request(app).get('/health'),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ]);
          return { success: true, index, response };
        } catch (error) {
          return { success: false, index, error: (error as Error).message };
        }
      });

      const results = await Promise.all(connectionPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      // Should handle most connections successfully
      expect(successful).toBeGreaterThan(maxConnections * 0.8); // At least 80% success
      expect(successful + failed).toBe(maxConnections);

      console.log(`Successful connections: ${successful}/${maxConnections}`);
      console.log(`Failed connections: ${failed}/${maxConnections}`);
    }, 45000);

    it('should gracefully handle resource exhaustion', async () => {
      // Simulate resource exhaustion by making many slow requests
      const heavyLoad = 100;
      
      const heavyPromises = Array(heavyLoad).fill(null).map(async () => {
        // Simulate a heavier request by adding query parameters
        return request(app)
          .get('/health')
          .query({ heavy: 'true', timestamp: Date.now() });
      });

      const startTime = Date.now();
      const results = await Promise.allSettled(heavyPromises);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Should handle the load without crashing
      expect(successful + failed).toBe(heavyLoad);
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute

      console.log(`Heavy load results: ${successful} successful, ${failed} failed`);
      console.log(`Duration: ${duration}ms`);
    }, 75000);
  });

  describe('Stress Tests', () => {
    it('should survive sustained high load', async () => {
      const stressTestDuration = 30000; // 30 seconds
      const requestRate = 20; // Requests per second
      const intervalMs = 1000 / requestRate;

      let requestCount = 0;
      let errorCount = 0;
      const startTime = Date.now();

      const stressInterval = setInterval(async () => {
        try {
          const response = await request(app).get('/health');
          if (response.status !== 200) {
            errorCount++;
          }
          requestCount++;
        } catch (error) {
          errorCount++;
          requestCount++;
        }
      }, intervalMs);

      // Wait for stress test duration
      await new Promise(resolve => setTimeout(resolve, stressTestDuration));
      clearInterval(stressInterval);

      const actualDuration = Date.now() - startTime;
      const errorRate = errorCount / requestCount;

      // Should maintain low error rate
      expect(errorRate).toBeLessThan(0.05); // Less than 5% errors
      expect(requestCount).toBeGreaterThan(0);

      console.log(`Stress test: ${requestCount} requests, ${errorCount} errors`);
      console.log(`Error rate: ${(errorRate * 100).toFixed(2)}%`);
      console.log(`Actual duration: ${actualDuration}ms`);
    }, 35000);
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks', async () => {
      const benchmarks = {
        minThroughput: 100, // requests per second
        maxAvgLatency: 50,  // milliseconds
        maxMemoryUsage: 200, // MB
        minSuccessRate: 0.99 // 99%
      };

      // Run benchmark test
      const testDuration = 10000; // 10 seconds
      const requestsPerSecond = 50;
      const totalRequests = (testDuration / 1000) * requestsPerSecond;

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;
      const results: any[] = [];

      // Generate consistent load
      for (let i = 0; i < totalRequests; i++) {
        const requestStart = Date.now();
        try {
          const response = await request(app).get('/health');
          const latency = Date.now() - requestStart;
          results.push({ success: true, latency, status: response.status });
        } catch (error) {
          const latency = Date.now() - requestStart;
          results.push({ success: false, latency, error });
        }

        // Maintain request rate
        const expectedTime = startTime + (i * (1000 / requestsPerSecond));
        const currentTime = Date.now();
        if (currentTime < expectedTime) {
          await new Promise(resolve => 
            setTimeout(resolve, expectedTime - currentTime)
          );
        }
      }

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      // Calculate metrics
      const actualDuration = endTime - startTime;
      const actualThroughput = results.length / (actualDuration / 1000);
      const successfulRequests = results.filter(r => r.success).length;
      const successRate = successfulRequests / results.length;
      const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
      const memoryUsageMB = (endMemory - startMemory) / (1024 * 1024);

      // Verify benchmarks
      expect(actualThroughput).toBeGreaterThanOrEqual(benchmarks.minThroughput);
      expect(avgLatency).toBeLessThanOrEqual(benchmarks.maxAvgLatency);
      expect(memoryUsageMB).toBeLessThanOrEqual(benchmarks.maxMemoryUsage);
      expect(successRate).toBeGreaterThanOrEqual(benchmarks.minSuccessRate);

      console.log('\n=== Performance Benchmark Results ===');
      console.log(`Throughput: ${actualThroughput.toFixed(2)} req/s (min: ${benchmarks.minThroughput})`);
      console.log(`Avg Latency: ${avgLatency.toFixed(2)}ms (max: ${benchmarks.maxAvgLatency})`);
      console.log(`Memory Usage: ${memoryUsageMB.toFixed(2)}MB (max: ${benchmarks.maxMemoryUsage})`);
      console.log(`Success Rate: ${(successRate * 100).toFixed(2)}% (min: ${benchmarks.minSuccessRate * 100}%)`);
      console.log('=====================================\n');
    }, 20000);
  });
}); 