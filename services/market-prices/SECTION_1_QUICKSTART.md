# Section 1 Improvements - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Update Your Environment Variables

Copy the new variables to your `.env` file:

```bash
# Environment
NODE_ENV=development  # or 'production'

# CoinGecko - Separate keys for dev/prod
COINGECKO_API_KEY=your_dev_key_here
COINGECKO_API_KEY_PROD=your_prod_key_here
COINGECKO_TIER=demo  # or analyst, pro, pro_plus
COINGECKO_RATE_LIMIT_PER_MINUTE=30  # Adjust based on tier

# CoinMarketCap - Separate keys for dev/prod
COINMARKETCAP_API_KEY=your_dev_key_here
COINMARKETCAP_API_KEY_PROD=your_prod_key_here
COINMARKETCAP_COMMERCIAL_LICENSE=false  # Set to 'true' for production

# WebSocket (now optimized for 1000 concurrent subscriptions)
ENABLE_WEBSOCKET=true
COINGECKO_MAX_CONCURRENT_WS=10
COINGECKO_MAX_SUBSCRIPTIONS_PER_CHANNEL=100

# Metrics Server (optional)
METRICS_PORT=9090
```

### 2. Install Dependencies (if needed)

```bash
cd services/market-prices
npm install
npm run build
```

### 3. Test the Improvements

#### A. Test Quota Monitoring

```typescript
import { getQuotaMonitor } from './src/services/quota-monitor.service';

const monitor = getQuotaMonitor();

// Listen for quota alerts
monitor.on('alert', (alert) => {
  console.log(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
});

// Check current usage
const stats = monitor.getAllUsageStats();
console.log('Quota Stats:', stats);
```

#### B. Test Metrics Endpoint

```bash
# Start the metrics server
node dist/examples/metrics-server.example.js

# In another terminal, check metrics
curl http://localhost:9090/metrics/summary | jq

# Check health
curl http://localhost:9090/health | jq
```

#### C. Test WebSocket Manager

```typescript
import { createAggregator } from './src/index';
import { getWebSocketManager } from './src/services/websocket-manager.service';
import { getConfig } from './src/config';

const config = getConfig();
const aggregator = await createAggregator();

// Get WebSocket manager
const wsManager = getWebSocketManager(
  config.providers.coingecko.websocket,
  config.providers.coingecko.apiKey
);

await wsManager.initialize();

// Subscribe with priorities
await wsManager.batchSubscribe({
  high: ['bitcoin', 'ethereum'],     // Critical assets
  medium: ['cardano', 'solana'],     // Important assets
  low: ['dogecoin', 'shiba-inu']     // Less critical
});

// Check utilization
const stats = wsManager.getStats();
console.log(`WebSocket Utilization: ${stats.utilizationPercentage.toFixed(2)}%`);
console.log(`Available slots: ${wsManager.getAvailableCapacity()}`);
```

### 4. Monitor in Production

#### Option A: Use the Built-in Metrics Server

```bash
# Production mode
export NODE_ENV=production
export COINGECKO_API_KEY_PROD=your_prod_key
export COINMARKETCAP_API_KEY_PROD=your_prod_key
export COINMARKETCAP_COMMERCIAL_LICENSE=true

# Start metrics server
node dist/examples/metrics-server.example.js
```

Access at:
- Dashboard: http://localhost:9090/metrics/summary
- Prometheus: http://localhost:9090/metrics/prometheus
- Health: http://localhost:9090/health

#### Option B: Integrate with Your Existing Service

```typescript
import express from 'express';
import { getMetricsService } from '@coinet/market-prices';

const app = express();
const metricsService = getMetricsService(aggregator);

// Add metrics endpoints
app.get('/metrics', async (req, res) => {
  const metrics = await metricsService.getMetrics();
  res.json(metrics);
});

app.get('/metrics/prometheus', async (req, res) => {
  const prometheus = await metricsService.getPrometheusMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(prometheus);
});
```

### 5. Configure Prometheus (Optional)

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'coinet-market-prices'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics/prometheus'
```

### 6. Set Up Grafana Dashboard (Optional)

Import the following metrics:
- `coinet_quota_used{provider="coingecko"}`
- `coinet_daily_requests{provider="coingecko"}`
- `coinet_rate_limit_queued{provider="coingecko"}`
- `coinet_cache_hit_rate`

---

## 📊 Key Metrics to Watch

### Quota Metrics
- **Current Usage %**: Should stay below 75% (warning threshold)
- **Daily Budget %**: Track against your plan limits
- **Credits Remaining**: CoinGecko/CMC specific

### Rate Limit Metrics
- **Queued Requests**: High queue = approaching limit
- **Throttled Status**: Should be `false` in production

### Cache Metrics
- **Hit Rate**: Target > 60% for good performance
- **TTL per Type**: Verify correct TTL application

### WebSocket Metrics
- **Utilization %**: How much of 1000 slots used
- **Active Connections**: Should be ≤ 10
- **Priority Distribution**: Check recommended vs current

---

## 🔧 Troubleshooting

### Issue: Quota alerts firing immediately

**Cause**: Budgets may be set too low

**Fix**: Adjust thresholds in your code:
```typescript
import { getQuotaMonitor } from '@coinet/market-prices';

const monitor = getQuotaMonitor();
monitor.setThresholds(DataSource.COINGECKO, {
  warningPercentage: 80,    // Alert at 80% instead of 75%
  criticalPercentage: 95,   // Critical at 95% instead of 90%
  dailyBudget: 50000,       // Adjust for your plan
});
```

### Issue: WebSocket not connecting

**Check**:
1. `ENABLE_WEBSOCKET=true` in environment
2. Valid API key with WebSocket access
3. Tier supports WebSocket (Pro tier or higher)

**Debug**:
```typescript
const wsManager = getWebSocketManager(config, apiKey);
console.log('WS Health:', wsManager.isHealthy());
```

### Issue: Cache hit rate too low

**Cause**: TTLs may be too aggressive

**Fix**: Extend TTLs for less critical data:
```typescript
cache.setTTLTiers({
  metadata: 1800,      // 30 minutes instead of 10
  nonCritical: 3600,   // 1 hour instead of 30 minutes
});
```

---

## 📚 Next Steps

1. ✅ **Verify all improvements work** with the tests above
2. ✅ **Set up monitoring** (metrics server or integration)
3. ✅ **Configure alerts** for quota thresholds
4. 🚀 **Choose next section** to implement:
   - Section 2: DEX & DeFi (DexScreener missing)
   - Section 3: Token Unlocks (Messari/The Tie)
   - Section 4: On-Chain (Alchemy/QuickNode)
   - Section 5: Derivatives (CoinGlass/Laevitas)

---

## 🎯 Success Criteria

You've successfully implemented Section 1 improvements if:

- ✅ Separate dev/prod API keys configured
- ✅ Quota monitoring alerts working
- ✅ Metrics endpoint accessible
- ✅ Cache hit rate > 50%
- ✅ WebSocket utilization visible
- ✅ No linter errors
- ✅ Commercial license acknowledged (if production)

**All good? Time to move forward! 🚀**

