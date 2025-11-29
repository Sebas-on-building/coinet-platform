/**
 * Real-Time Systems Module
 * 
 * Enterprise-grade real-time infrastructure for token unlocks:
 * - WebSocket event subscriptions (EVM + Solana)
 * - RxJS-powered reactive streams
 * - Adaptive polling with cron scheduling
 * - Redis + LRU caching layer
 * - Security: rate limiting, encryption, audit logging
 * 
 * Performance Targets:
 * - Event processing: <1s latency
 * - Concurrent capacity: 1000+ unlocks
 * - Cache hit rate: >95%
 * - Uptime: 99.9%
 */

// Event Subscriptions
import {
  EventSubscriptionManager,
  getEventSubscriptionManager,
  resetEventSubscriptionManager,
  SubscriptionConfig,
  ChainEvent,
  SubscriptionStats,
} from './event-subscription-manager';

// Real-Time Streams
import {
  RealtimeStreamManager,
  getRealtimeStreamManager,
  resetRealtimeStreamManager,
  StreamConfig,
  VestingStream,
  FlowStream,
  PredictionStream,
  AggregatedMetrics,
  StreamHealth,
} from './realtime-stream-manager';

// Adaptive Polling
import {
  AdaptivePollingScheduler,
  getAdaptivePollingScheduler,
  resetAdaptivePollingScheduler,
  PollingTask,
  PolledData,
  SchedulerConfig,
  SchedulerStats,
} from './adaptive-polling-scheduler';

// Flow Cache
import {
  FlowCache,
  getFlowCache,
  resetFlowCache,
  FlowRecord,
  PredictionRecord,
  FlowAggregation,
  CacheConfig,
} from './flow-cache';

// Security
import {
  SecurityManager,
  getSecurityManager,
  resetSecurityManager,
  RateLimitConfig,
  RateLimitStatus,
  EncryptedData,
  WalletInfo,
  AuditLog,
  SecurityConfig,
} from './security-manager';

// Re-export all
export {
  // Event Subscriptions
  EventSubscriptionManager,
  getEventSubscriptionManager,
  resetEventSubscriptionManager,
  SubscriptionConfig,
  ChainEvent,
  SubscriptionStats,
  // Real-Time Streams
  RealtimeStreamManager,
  getRealtimeStreamManager,
  resetRealtimeStreamManager,
  StreamConfig,
  VestingStream,
  FlowStream,
  PredictionStream,
  AggregatedMetrics,
  StreamHealth,
  // Adaptive Polling
  AdaptivePollingScheduler,
  getAdaptivePollingScheduler,
  resetAdaptivePollingScheduler,
  PollingTask,
  PolledData,
  SchedulerConfig,
  SchedulerStats,
  // Flow Cache
  FlowCache,
  getFlowCache,
  resetFlowCache,
  FlowRecord,
  PredictionRecord,
  FlowAggregation,
  CacheConfig,
  // Security
  SecurityManager,
  getSecurityManager,
  resetSecurityManager,
  RateLimitConfig,
  RateLimitStatus,
  EncryptedData,
  WalletInfo,
  AuditLog,
  SecurityConfig,
};

// Unified initialization
export function initializeRealtimeSystems(config?: {
  streaming?: StreamConfig;
  polling?: SchedulerConfig;
  cache?: CacheConfig;
  security?: SecurityConfig;
}): {
  eventManager: EventSubscriptionManager;
  streamManager: RealtimeStreamManager;
  pollingScheduler: AdaptivePollingScheduler;
  flowCache: FlowCache;
  securityManager: SecurityManager;
} {
  const eventManager = getEventSubscriptionManager();
  const streamManager = getRealtimeStreamManager(config?.streaming);
  const pollingScheduler = getAdaptivePollingScheduler(config?.polling);
  const flowCache = getFlowCache(config?.cache);
  const securityManager = getSecurityManager(config?.security);

  // Start polling scheduler
  pollingScheduler.start();

  return {
    eventManager,
    streamManager,
    pollingScheduler,
    flowCache,
    securityManager,
  };
}

// Unified shutdown
export async function shutdownRealtimeSystems(): Promise<void> {
  try {
    await Promise.all([
      getEventSubscriptionManager().shutdown().catch(() => {}),
      getRealtimeStreamManager().shutdown().catch(() => {}),
      getAdaptivePollingScheduler().shutdown().catch(() => {}),
      getFlowCache().shutdown().catch(() => {}),
    ]);
  } catch (error) {
    // Ignore shutdown errors
  }

  resetEventSubscriptionManager();
  resetRealtimeStreamManager();
  resetAdaptivePollingScheduler();
  resetFlowCache();
  resetSecurityManager();
}

export default {
  initializeRealtimeSystems,
  shutdownRealtimeSystems,
};
