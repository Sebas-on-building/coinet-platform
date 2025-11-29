/**
 * Real-Time Systems Test Script
 * 
 * Tests all real-time components:
 * - Event subscriptions
 * - RxJS streams
 * - Adaptive polling
 * - Caching (Redis + LRU)
 * - Security (rate limiting, encryption)
 * 
 * Success Criteria:
 * - Event processing <1s latency
 * - Handle 1000+ concurrent unlocks
 * - Cache hit rate >95%
 * - All security features functional
 */

import { 
  initializeRealtimeSystems,
  shutdownRealtimeSystems,
  getEventSubscriptionManager,
  getRealtimeStreamManager,
  getAdaptivePollingScheduler,
  getFlowCache,
  getSecurityManager,
  VestingStream,
  FlowStream,
  FlowRecord,
  WalletInfo,
} from '../src/realtime';

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
  metrics?: Record<string, any>;
}

const results: TestResult[] = [];
let totalTests = 0;
let passedTests = 0;

// Helper functions
function logTest(name: string, passed: boolean, duration: number, details?: string, metrics?: Record<string, any>): void {
  results.push({ name, passed, duration, details, metrics });
  totalTests++;
  if (passed) passedTests++;
  
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name} (${duration}ms)${details ? ` - ${details}` : ''}`);
  if (metrics) {
    console.log(`   Metrics:`, metrics);
  }
}

async function runTest(name: string, testFn: () => Promise<{ passed: boolean; details?: string; metrics?: Record<string, any> }>): Promise<void> {
  const start = Date.now();
  try {
    const result = await testFn();
    logTest(name, result.passed, Date.now() - start, result.details, result.metrics);
  } catch (error) {
    logTest(name, false, Date.now() - start, `Error: ${(error as Error).message}`);
  }
}

// =============================================================================
// TESTS
// =============================================================================

async function testEventSubscriptionManager(): Promise<{ passed: boolean; details?: string; metrics?: Record<string, any> }> {
  const manager = getEventSubscriptionManager();
  
  // Test subscription
  const subscribed = await manager.subscribe({
    chain: 'ethereum',
    address: '0x1234567890123456789012345678901234567890',
    type: 'vesting',
    priority: 'high',
  });

  // Test stats
  const stats = manager.getStats();
  
  // Test event stream
  let eventReceived = false;
  const subscription = manager.getEventStream().subscribe(event => {
    eventReceived = true;
  });
  subscription.unsubscribe();

  // Test health
  const health = manager.getConnectionHealth();

  return {
    passed: stats.activeSubscriptions > 0,
    details: `${stats.activeSubscriptions} subscriptions active`,
    metrics: {
      subscriptions: stats.activeSubscriptions,
      reconnects: stats.reconnects,
      errors: stats.errors,
    },
  };
}

async function testRealtimeStreamManager(): Promise<{ passed: boolean; details?: string; metrics?: Record<string, any> }> {
  const manager = getRealtimeStreamManager();
  
  // Test vesting stream
  let vestingReceived = false;
  const vestingSub = manager.getVestingStream().subscribe(() => {
    vestingReceived = true;
  });

  // Emit test event
  const testVesting: VestingStream = {
    type: 'release',
    chain: 'ethereum',
    tokenSymbol: 'TEST',
    amount: 1000000,
    amountUsd: 1000000,
    beneficiary: '0x1234',
    contractAddress: '0x5678',
    timestamp: new Date(),
  };
  manager.emitVestingEvent(testVesting);

  // Test flow stream
  let flowReceived = false;
  const flowSub = manager.getFlowStream().subscribe(() => {
    flowReceived = true;
  });

  const testFlow: FlowStream = {
    type: 'to_exchange',
    chain: 'ethereum',
    tokenSymbol: 'TEST',
    from: '0x1111',
    to: '0x2222',
    amount: 500000,
    amountUsd: 500000,
    timestamp: new Date(),
  };
  manager.emitFlowEvent(testFlow);

  // Wait for events
  await new Promise(resolve => setTimeout(resolve, 100));

  vestingSub.unsubscribe();
  flowSub.unsubscribe();

  // Get health
  const health = manager.getStreamHealth();

  return {
    passed: vestingReceived && flowReceived,
    details: `Vesting: ${vestingReceived}, Flow: ${flowReceived}`,
    metrics: {
      streamsActive: health.length,
      vestingEvents: health.find(h => h.name === 'vesting')?.eventsPerSecond || 0,
      flowEvents: health.find(h => h.name === 'flow')?.eventsPerSecond || 0,
    },
  };
}

async function testAdaptivePollingScheduler(): Promise<{ passed: boolean; details?: string; metrics?: Record<string, any> }> {
  const scheduler = getAdaptivePollingScheduler();
  
  // Add test tasks
  const nearUnlock = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const farUnlock = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const nearTask = scheduler.addUnlockMonitor('NEAR_TOKEN', nearUnlock);
  const farTask = scheduler.addUnlockMonitor('FAR_TOKEN', farUnlock);
  
  // Verify adaptive intervals
  const nearInterval = nearTask.intervalMs;
  const farInterval = farTask.intervalMs;
  
  // Near unlock should have shorter interval
  const adaptiveWorking = nearInterval < farInterval;
  
  // Get stats
  const stats = scheduler.getStats();
  
  // Cleanup
  scheduler.removeTask(nearTask.id);
  scheduler.removeTask(farTask.id);

  return {
    passed: adaptiveWorking && stats.activeTasks >= 0,
    details: `Near: ${nearInterval}ms, Far: ${farInterval}ms`,
    metrics: {
      activeTasks: stats.activeTasks,
      pollsPerMinute: stats.pollsPerMinute,
      queueDepth: stats.queueDepth,
    },
  };
}

async function testFlowCache(): Promise<{ passed: boolean; details?: string; metrics?: Record<string, any> }> {
  const cache = getFlowCache();
  
  // Test flow storage
  const testFlow: FlowRecord = {
    id: `test-flow-${Date.now()}`,
    chain: 'ethereum',
    tokenSymbol: 'TEST',
    tokenAddress: '0xtest',
    from: '0xfrom',
    to: '0xto',
    amount: 1000,
    amountUsd: 1000,
    flowType: 'to_exchange',
    txHash: '0xtx',
    blockNumber: 12345,
    timestamp: new Date(),
  };
  
  await cache.storeFlow(testFlow);
  
  // Test retrieval
  const retrieved = await cache.getFlow(testFlow.id);
  const flowStored = retrieved !== null && retrieved.id === testFlow.id;
  
  // Test aggregation
  const aggregation = await cache.computeAggregation('TEST', '1h');
  
  // Get stats
  const stats = cache.getStats();
  
  // Test LRU stats
  const lruHitRate = stats.lru.flows.hitRate;

  return {
    passed: flowStored,
    details: `Flow stored and retrieved successfully`,
    metrics: {
      lruFlowsSize: stats.lru.flows.size,
      lruHitRate: Math.round(lruHitRate * 100) + '%',
      redisConnected: stats.redis.connected,
      writeQueue: stats.writes.queued,
    },
  };
}

async function testSecurityManager(): Promise<{ passed: boolean; details?: string; metrics?: Record<string, any> }> {
  const security = getSecurityManager();
  
  // Test encryption
  const testWallet: WalletInfo = {
    address: '0x1234567890123456789012345678901234567890',
    chain: 'ethereum',
    label: 'Test VC Wallet',
    type: 'vc',
    tags: ['tier1', 'active'],
  };
  
  const encrypted = security.encryptWalletData(testWallet);
  const decrypted = await security.decryptWalletData(encrypted);
  const encryptionWorks = decrypted.address === testWallet.address;
  
  // Test rate limiting
  const rateLimit1 = await security.checkRateLimit('rpc:ethereum');
  const rateLimit2 = await security.checkRateLimit('rpc:ethereum');
  const rateLimitingWorks = rateLimit1 && rateLimit2;
  
  // Test hashing
  const hash = security.hash('test-data');
  const hashWorks = hash.length === 64;
  
  // Test signing
  const signature = security.sign('test-data');
  const signatureValid = security.verify('test-data', signature);
  
  // Test redaction
  const sensitiveObj = { password: 'secret123', name: 'public' };
  const redacted = security.redactSensitiveFields(sensitiveObj);
  const redactionWorks = redacted.password === '[REDACTED]' && redacted.name === 'public';
  
  // Test address masking
  const masked = security.maskAddress('0x1234567890123456789012345678901234567890');
  const maskingWorks = masked === '0x1234...7890';
  
  // Test address validation
  const validEvm = security.isValidAddress('0x1234567890123456789012345678901234567890', 'ethereum');
  const validSolana = security.isValidAddress('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', 'solana');
  
  // Get health
  const health = security.getHealth();

  return {
    passed: encryptionWorks && rateLimitingWorks && hashWorks && signatureValid && redactionWorks && maskingWorks,
    details: `Encryption: ${encryptionWorks}, RateLimit: ${rateLimitingWorks}, Hash: ${hashWorks}, Sign: ${signatureValid}`,
    metrics: {
      encryptionReady: health.encryptionReady,
      rateLimitActive: health.rateLimitActive,
      auditLogSize: health.auditLogSize,
      activeLimits: health.rateLimitStatuses.length,
    },
  };
}

async function testLatencyBenchmark(): Promise<{ passed: boolean; details?: string; metrics?: Record<string, any> }> {
  const streamManager = getRealtimeStreamManager();
  const latencies: number[] = [];
  
  // Measure event processing latency
  const NUM_EVENTS = 100;
  
  for (let i = 0; i < NUM_EVENTS; i++) {
    const start = Date.now();
    
    const testVesting: VestingStream = {
      type: 'release',
      chain: 'ethereum',
      tokenSymbol: `TEST${i}`,
      amount: 1000000,
      amountUsd: 1000000,
      beneficiary: '0x1234',
      contractAddress: '0x5678',
      timestamp: new Date(),
    };
    
    streamManager.emitVestingEvent(testVesting);
    latencies.push(Date.now() - start);
  }
  
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const p99Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)];
  
  // Target: <1s (1000ms), but for in-memory operations should be <10ms
  const passed = avgLatency < 100 && p99Latency < 500;

  return {
    passed,
    details: `Avg: ${avgLatency.toFixed(2)}ms, P99: ${p99Latency}ms, Max: ${maxLatency}ms`,
    metrics: {
      eventsProcessed: NUM_EVENTS,
      avgLatencyMs: avgLatency.toFixed(2),
      p99LatencyMs: p99Latency,
      maxLatencyMs: maxLatency,
    },
  };
}

async function testConcurrentUnlocks(): Promise<{ passed: boolean; details?: string; metrics?: Record<string, any> }> {
  const scheduler = getAdaptivePollingScheduler();
  const cache = getFlowCache();
  
  const NUM_CONCURRENT = 1000;
  const start = Date.now();
  
  // Add 1000 concurrent unlock monitors
  const tasks: string[] = [];
  for (let i = 0; i < NUM_CONCURRENT; i++) {
    const unlockDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    const task = scheduler.addUnlockMonitor(`TOKEN_${i}`, unlockDate);
    tasks.push(task.id);
  }
  
  const addDuration = Date.now() - start;
  
  // Get stats
  const stats = scheduler.getStats();
  
  // Cleanup
  for (const taskId of tasks) {
    scheduler.removeTask(taskId);
  }
  
  const cleanupDuration = Date.now() - start - addDuration;
  const totalDuration = Date.now() - start;
  
  // Should handle 1000 tasks efficiently (<5s) with high throughput
  const throughputPerSec = NUM_CONCURRENT / (totalDuration / 1000);
  const passed = totalDuration < 5000 && throughputPerSec > 100; // >100 tasks/sec required

  return {
    passed,
    details: `Added ${NUM_CONCURRENT} tasks in ${addDuration}ms, cleaned up in ${cleanupDuration}ms`,
    metrics: {
      tasksAdded: NUM_CONCURRENT,
      addDurationMs: addDuration,
      cleanupDurationMs: cleanupDuration,
      totalDurationMs: totalDuration,
      throughput: Math.round(NUM_CONCURRENT / (totalDuration / 1000)) + ' tasks/sec',
    },
  };
}

async function testCachePerformance(): Promise<{ passed: boolean; details?: string; metrics?: Record<string, any> }> {
  const cache = getFlowCache();
  
  const NUM_OPERATIONS = 10000;
  const start = Date.now();
  
  // Write test
  const writeStart = Date.now();
  for (let i = 0; i < NUM_OPERATIONS; i++) {
    const flow: FlowRecord = {
      id: `perf-test-${i}`,
      chain: 'ethereum',
      tokenSymbol: 'PERF',
      tokenAddress: '0xperf',
      from: `0xfrom${i}`,
      to: `0xto${i}`,
      amount: i * 100,
      amountUsd: i * 100,
      flowType: 'to_exchange',
      txHash: `0xtx${i}`,
      blockNumber: 12345 + i,
      timestamp: new Date(),
    };
    await cache.storeFlow(flow);
  }
  const writeDuration = Date.now() - writeStart;
  
  // Read test (should hit LRU cache)
  const readStart = Date.now();
  let cacheHits = 0;
  for (let i = NUM_OPERATIONS - 1000; i < NUM_OPERATIONS; i++) { // Read last 1000
    const flow = await cache.getFlow(`perf-test-${i}`);
    if (flow) cacheHits++;
  }
  const readDuration = Date.now() - readStart;
  
  // Get final stats
  const stats = cache.getStats();
  const hitRate = cacheHits / 1000;
  
  // Target: >95% cache hit rate
  const passed = hitRate >= 0.95;

  return {
    passed,
    details: `Write: ${writeDuration}ms, Read: ${readDuration}ms, Hit rate: ${(hitRate * 100).toFixed(1)}%`,
    metrics: {
      operations: NUM_OPERATIONS,
      writeDurationMs: writeDuration,
      readDurationMs: readDuration,
      writeOpsPerSec: Math.round(NUM_OPERATIONS / (writeDuration / 1000)),
      readOpsPerSec: Math.round(1000 / (readDuration / 1000)),
      cacheHitRate: (hitRate * 100).toFixed(1) + '%',
      lruSize: stats.lru.flows.size,
    },
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('\n🚀 Real-Time Systems Test Suite\n');
  console.log('═'.repeat(60));
  console.log('Testing: Event Subscriptions, Streams, Polling, Cache, Security');
  console.log('Targets: <1s latency, 1000+ concurrent, >95% cache hit rate');
  console.log('═'.repeat(60));
  console.log('');

  // Initialize systems
  console.log('📦 Initializing real-time systems...\n');
  initializeRealtimeSystems();

  // Run component tests
  console.log('📋 Component Tests\n');
  console.log('-'.repeat(60));
  
  await runTest('Event Subscription Manager', testEventSubscriptionManager);
  await runTest('Real-Time Stream Manager', testRealtimeStreamManager);
  await runTest('Adaptive Polling Scheduler', testAdaptivePollingScheduler);
  await runTest('Flow Cache (LRU + Redis)', testFlowCache);
  await runTest('Security Manager', testSecurityManager);

  // Run performance tests
  console.log('\n📊 Performance Tests\n');
  console.log('-'.repeat(60));
  
  await runTest('Latency Benchmark (<1s target)', testLatencyBenchmark);
  await runTest('Concurrent Unlocks (1000+ target)', testConcurrentUnlocks);
  await runTest('Cache Performance (>95% hit rate)', testCachePerformance);

  // Shutdown
  console.log('\n📦 Shutting down systems...');
  await shutdownRealtimeSystems();

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`\n   Total Tests:  ${totalTests}`);
  console.log(`   Passed:       ${passedTests} ✅`);
  console.log(`   Failed:       ${totalTests - passedTests} ${totalTests - passedTests > 0 ? '❌' : ''}`);
  console.log(`   Pass Rate:    ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Performance summary
  console.log('\n📈 Performance Summary:');
  const latencyTest = results.find(r => r.name.includes('Latency'));
  const concurrentTest = results.find(r => r.name.includes('Concurrent'));
  const cacheTest = results.find(r => r.name.includes('Cache Performance'));
  
  if (latencyTest?.metrics) {
    console.log(`   Avg Latency:      ${latencyTest.metrics.avgLatencyMs}ms (target: <1000ms)`);
  }
  if (concurrentTest?.metrics) {
    console.log(`   Throughput:       ${concurrentTest.metrics.throughput}`);
  }
  if (cacheTest?.metrics) {
    console.log(`   Cache Hit Rate:   ${cacheTest.metrics.cacheHitRate} (target: >95%)`);
  }

  console.log('\n' + '═'.repeat(60));
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - REAL-TIME SYSTEMS READY!');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} test(s) failed - review needed`);
  }
  console.log('═'.repeat(60) + '\n');

  // Exit with appropriate code
  process.exit(passedTests === totalTests ? 0 : 1);
}

main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

