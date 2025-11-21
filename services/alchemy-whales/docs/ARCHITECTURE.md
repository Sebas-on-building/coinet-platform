# 🏗️ QuickNode Integration - Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          AlchemyWhalesService (Main Service)             │   │
│  │  - Service orchestration                                  │   │
│  │  - Business logic                                         │   │
│  │  - Event handling                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Provider Orchestration Layer                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ProviderOrchestrator                         │   │
│  │  - Intelligent routing                                    │   │
│  │  - Load balancing                                         │   │
│  │  - Quota management                                       │   │
│  │  - Automatic fallback                                     │   │
│  │  - Health monitoring                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Data Validation Layer                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           CrossValidationService                          │   │
│  │  - Provider data comparison                               │   │
│  │  - Discrepancy detection                                  │   │
│  │  - Confidence scoring                                     │   │
│  │  - Reconciliation algorithms                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Provider Client Layer                       │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │  AlchemyClientMgr    │         │  QuickNodeClientMgr      │  │
│  │  ┌────────────────┐  │         │  ┌────────────────────┐ │  │
│  │  │ ETH Client     │  │         │  │ ETH Client (QN)    │ │  │
│  │  │ Polygon Client │  │         │  │ Polygon Client     │ │  │
│  │  │ Arbitrum Client│  │         │  │ Arbitrum Client    │ │  │
│  │  │ Optimism Client│  │         │  │ Optimism Client    │ │  │
│  │  │ Base Client    │  │         │  │ Base Client        │ │  │
│  │  │ + Circuit Break│  │         │  │ + 65+ more chains  │ │  │
│  │  └────────────────┘  │         │  └────────────────────┘ │  │
│  └──────────────────────┘         └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Rate Limiting & Control Layer                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              RateLimiterManager                           │   │
│  │  - Per-chain rate limiting                                │   │
│  │  - Compute unit tracking                                  │   │
│  │  - Token bucket algorithm                                 │   │
│  │  - Exponential backoff                                    │   │
│  │  - Circuit breaker coordination                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   CacheManager│  │ DatabaseMgr  │  │  MetricsCollector  │    │
│  │   (Redis)     │  │ (PostgreSQL) │  │   (Prometheus)     │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      External APIs Layer                         │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │   Alchemy API        │         │   QuickNode API          │  │
│  │   5 chains           │         │   70+ chains             │  │
│  └──────────────────────┘         └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interactions

### 1. Request Flow - Standard Query

```
User Request
     ↓
ProviderOrchestrator
     ↓ (determine routing)
     ├─→ Check health metrics
     ├─→ Check quota utilization
     ├─→ Apply routing strategy
     └─→ Select provider
          ↓
     Alchemy OR QuickNode Client
          ↓ (rate limited)
     RateLimiterManager
          ↓
     External API Call
          ↓
     Response Processing
          ↓
     Cache Result
          ↓
     Return to User
```

### 2. Request Flow - Cross-Validation

```
User Request (large transfer)
     ↓
ProviderOrchestrator
     ↓ (cross-validate strategy)
     ├─→ Parallel Fetch
     │    ├─→ Alchemy Client
     │    └─→ QuickNode Client
     ↓
CrossValidationService
     ↓
     ├─→ Compare transfers
     ├─→ Calculate discrepancies
     ├─→ Generate confidence score
     └─→ Reconcile if needed
          ↓
     Best data selection
          ↓
     Cache Result
          ↓
     Return to User
```

### 3. Request Flow - Fallback Scenario

```
User Request
     ↓
ProviderOrchestrator
     ↓ (try primary)
Alchemy Client
     ↓
[ERROR: Rate Limit / Timeout]
     ↓
ProviderOrchestrator detects failure
     ↓ (automatic fallback)
QuickNode Client
     ↓
Successful Response
     ↓
Update metrics (Alchemy unavailable)
     ↓
Return to User
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      Input Data                              │
│  • Wallet Address                                            │
│  • Chain Selection                                           │
│  • Block Range                                               │
│  • Query Parameters                                          │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                  Validation Layer                            │
│  • Schema validation (Zod)                                   │
│  • Address format check                                      │
│  • Parameter range validation                                │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                   Routing Decision                           │
│  • Strategy evaluation                                       │
│  • Health score calculation                                  │
│  • Quota utilization check                                   │
│  • Provider selection                                        │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                 API Request Execution                        │
│  • Rate limit check                                          │
│  • Compute unit allocation                                   │
│  • HTTP request with retry                                   │
│  • Circuit breaker protection                                │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                  Response Processing                         │
│  • Parse API response                                        │
│  • Normalize data format                                     │
│  • Enrich with metadata                                      │
│  • Error handling                                            │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│              Cross-Validation (if enabled)                   │
│  • Fetch from second provider                                │
│  • Compare results                                           │
│  • Calculate confidence                                      │
│  • Reconcile discrepancies                                   │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                    Caching Layer                             │
│  • Generate cache key                                        │
│  • Store in Redis                                            │
│  • Set TTL                                                   │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                  Metrics Collection                          │
│  • Update request counters                                   │
│  • Record latency                                            │
│  • Track errors                                              │
│  • Update health scores                                      │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│                   Return Response                            │
│  • Normalized transfers                                      │
│  • Metadata                                                  │
│  • Provider info                                             │
│  • Performance metrics                                       │
└──────────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Strategy Pattern (Routing)

```typescript
interface RoutingStrategy {
  selectProvider(context: RoutingContext): Provider;
  shouldCrossValidate(value: number): boolean;
}

class QuotaAwareStrategy implements RoutingStrategy {
  selectProvider(context) {
    if (alchemy.quotaUtilization > 80) return quicknode;
    return alchemy;
  }
}

class LoadBalancingStrategy implements RoutingStrategy {
  selectProvider(context) {
    return healthScore(alchemy) > healthScore(quicknode) 
      ? alchemy 
      : quicknode;
  }
}
```

### 2. Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  
  canExecute(): boolean {
    if (state === 'OPEN' && timeoutExpired()) {
      state = 'HALF_OPEN';
    }
    return state !== 'OPEN';
  }
  
  recordSuccess() {
    if (state === 'HALF_OPEN') state = 'CLOSED';
    failureCount = 0;
  }
  
  recordFailure() {
    failureCount++;
    if (failureCount >= threshold) state = 'OPEN';
  }
}
```

### 3. Adapter Pattern (Provider Abstraction)

```typescript
interface ProviderAdapter {
  getTransfers(query: TransferQuery): Promise<Transfer[]>;
  getBalance(address: string): Promise<Balance>;
  getNFTs(address: string): Promise<NFT[]>;
}

class AlchemyAdapter implements ProviderAdapter {
  // Alchemy-specific implementation
}

class QuickNodeAdapter implements ProviderAdapter {
  // QuickNode-specific implementation
}
```

### 4. Observer Pattern (Health Monitoring)

```typescript
class HealthMonitor {
  private observers: Observer[] = [];
  
  subscribe(observer: Observer) {
    this.observers.push(observer);
  }
  
  notifyHealthChange(provider: Provider, health: Health) {
    this.observers.forEach(o => o.onHealthChange(provider, health));
  }
}

// Usage
healthMonitor.subscribe({
  onHealthChange: (provider, health) => {
    if (!health.healthy) {
      orchestrator.switchProvider(provider);
    }
  }
});
```

## State Management

### Provider State Machine

```
┌──────────────┐
│   HEALTHY    │ ←──────────────────┐
└──────────────┘                    │
       ↓ (errors > threshold)       │
┌──────────────┐                    │
│  DEGRADED    │                    │
└──────────────┘                    │
       ↓ (circuit open)             │
┌──────────────┐                    │
│  UNHEALTHY   │                    │
└──────────────┘                    │
       ↓ (timeout)                  │
┌──────────────┐                    │
│  RECOVERING  │ ───────────────────┘
└──────────────┘  (successful requests)
```

### Request State Machine

```
┌──────────┐
│  QUEUED  │
└──────────┘
     ↓
┌──────────┐
│ PENDING  │ ←─────────┐
└──────────┘           │
     ↓                 │
┌──────────┐           │
│ EXECUTING│           │
└──────────┘           │
     ↓                 │
     ├─→ SUCCESS       │
     ├─→ RATE_LIMITED ─┘ (retry)
     └─→ FAILED
          ↓
     ┌─────────────┐
     │  FALLBACK   │ (try alternate provider)
     └─────────────┘
```

## Performance Optimizations

### 1. Connection Pooling

```typescript
// HTTP connection reuse
const httpClient = axios.create({
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 50,
  }),
});
```

### 2. Request Batching

```typescript
// Batch multiple addresses
const results = await Promise.all(
  addresses.map(addr => 
    rateLimiter.schedule(chain, () => 
      client.getTransfers(addr)
    )
  )
);
```

### 3. Smart Caching

```typescript
// Multi-level cache strategy
const getCached = async (key) => {
  // L1: Memory cache (fastest)
  if (memoryCache.has(key)) return memoryCache.get(key);
  
  // L2: Redis cache (fast)
  const cached = await redis.get(key);
  if (cached) {
    memoryCache.set(key, cached);
    return cached;
  }
  
  // L3: Database (slower)
  return await database.get(key);
};
```

### 4. Compute Unit Optimization

```typescript
// Smart CU allocation
const estimateCU = (method: string): number => {
  const weights = {
    qn_getTransfersByAddress: 25,
    qn_getWalletTokenBalance: 20,
    qn_getNFTsByOwner: 30,
  };
  return weights[method] || 15;
};

// Reserve CU for critical operations
rateLimiter.schedule(chain, operation, {
  weight: estimateCU(method),
  priority: calculatePriority(method),
});
```

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Instance 1 │     │  Instance 2 │     │  Instance 3 │
└─────────────┘     └─────────────┘     └─────────────┘
       ↓                   ↓                   ↓
┌────────────────────────────────────────────────────┐
│              Shared Redis Cluster                  │
│  (Distributed rate limiting & caching)             │
└────────────────────────────────────────────────────┘
       ↓                   ↓                   ↓
┌────────────────────────────────────────────────────┐
│              PostgreSQL Database                   │
│  (Persistent storage)                              │
└────────────────────────────────────────────────────┘
```

### Load Balancing Strategy

```
Traffic
   ↓
Load Balancer
   ↓
   ├─→ Health check all instances
   ├─→ Check quota utilization
   ├─→ Route to optimal instance
   └─→ Implement sticky sessions (if needed)
```

## Security Architecture

### 1. Input Validation

```typescript
// Schema validation at entry point
const validateInput = (input: unknown) => {
  return TransferQuerySchema.parse(input);
};
```

### 2. Rate Limiting

```typescript
// Multiple layers of rate limiting
- Application level: RateLimiterManager
- Network level: Nginx rate limiting
- API level: Provider rate limits
```

### 3. Error Sanitization

```typescript
// Never expose sensitive data in errors
const sanitizeError = (error: Error): SafeError => {
  return {
    message: error.message,
    code: error.code,
    // Do NOT include: stack traces, API keys, internal paths
  };
};
```

## Monitoring & Observability

### Metrics Hierarchy

```
System Metrics
  ├─ Application Metrics
  │   ├─ Request Rate
  │   ├─ Response Time
  │   ├─ Error Rate
  │   └─ Active Connections
  │
  ├─ Provider Metrics
  │   ├─ Alchemy
  │   │   ├─ Quota Utilization
  │   │   ├─ Response Time
  │   │   └─ Error Rate
  │   └─ QuickNode
  │       ├─ Compute Utilization
  │       ├─ Response Time
  │       └─ Error Rate
  │
  ├─ Validation Metrics
  │   ├─ Total Validations
  │   ├─ Pass Rate
  │   ├─ Discrepancies Found
  │   └─ Confidence Scores
  │
  └─ Infrastructure Metrics
      ├─ Redis Performance
      ├─ Database Performance
      └─ Cache Hit Rates
```

## Deployment Architecture

### Production Deployment

```
┌─────────────────────────────────────────────────┐
│                  Kubernetes Cluster              │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  Ingress (Load Balancer)                 │   │
│  └──────────────────────────────────────────┘   │
│                     ↓                            │
│  ┌──────────────────────────────────────────┐   │
│  │  Service Pods (3+ replicas)              │   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐           │   │
│  │  │ Pod 1│  │ Pod 2│  │ Pod 3│           │   │
│  │  └──────┘  └──────┘  └──────┘           │   │
│  └──────────────────────────────────────────┘   │
│                     ↓                            │
│  ┌──────────────────────────────────────────┐   │
│  │  StatefulSet - Redis                     │   │
│  └──────────────────────────────────────────┘   │
│                     ↓                            │
│  ┌──────────────────────────────────────────┐   │
│  │  External PostgreSQL (managed)           │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Summary

This architecture provides:

✅ **Modularity** - Clean separation of concerns  
✅ **Scalability** - Horizontal and vertical scaling  
✅ **Reliability** - Circuit breakers and fallbacks  
✅ **Performance** - Multi-level caching and optimization  
✅ **Observability** - Comprehensive metrics and logging  
✅ **Maintainability** - Clear patterns and abstractions  
✅ **Security** - Input validation and error sanitization  
✅ **Future-Proof** - Extensible and adaptable design  

**Built with divine world-class architectural excellence** 🏗️✨

