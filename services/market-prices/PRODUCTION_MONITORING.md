# Production Monitoring Guide

**Comprehensive monitoring setup for the Market Prices Service**

---

## Quick Setup

### 1. Railway Environment Variables

Add these variables in your Railway service settings:

```bash
# Slack Notifications (recommended)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#market-prices-alerts
SLACK_MIN_SEVERITY=warning

# PagerDuty (for critical alerts)
PAGERDUTY_INTEGRATION_KEY=your-integration-key
PAGERDUTY_MIN_SEVERITY=critical

# Generic Webhook (optional)
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
ALERT_WEBHOOK_AUTH_TOKEN=your-bearer-token
```

---

## Cache TTL Configuration (Optimized for 95%+ Hit Rate)

The following TTL tiers are now optimized:

| Data Type | TTL | Description |
|-----------|-----|-------------|
| Realtime | 30s | WebSocket price updates |
| Default | 60s | General market data |
| Metadata | 30min | Coin metadata |
| Historical | 60min | OHLCV data |
| Non-Critical | 90min | Categories, lists |

### Environment Override

```bash
# Override base TTL (affects all tiers)
CACHE_TTL_SECONDS=60
```

---

## Notification Channels

### Slack Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_WEBHOOK_URL` | Yes | - | Incoming webhook URL |
| `SLACK_CHANNEL` | No | #alerts | Channel for alerts |
| `SLACK_USERNAME` | No | Coinet Alert Bot | Bot display name |
| `SLACK_ICON_EMOJI` | No | :warning: | Bot icon |
| `SLACK_MIN_SEVERITY` | No | warning | Minimum severity to send |
| `SLACK_MENTION_USERS` | No | - | Comma-separated user IDs |
| `SLACK_MENTION_GROUPS` | No | - | Comma-separated group IDs |

**Create Webhook:**
1. Go to Slack App Settings → Incoming Webhooks
2. Enable webhooks
3. Add new webhook to channel
4. Copy the webhook URL

**Example Slack alert:**
```
🚨 Alert FIRING
━━━━━━━━━━━━━━━━━━
LowCacheHitRate
Cache hit rate below 90%

Severity: WARNING
Source: cache_hit_ratio
Value: 85.5
Threshold: 90
```

### PagerDuty Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PAGERDUTY_INTEGRATION_KEY` | Yes | - | Events API v2 key |
| `PAGERDUTY_SERVICE_ID` | No | - | Service ID for routing |
| `PAGERDUTY_ESCALATION_POLICY` | No | - | Escalation policy ID |
| `PAGERDUTY_MIN_SEVERITY` | No | critical | Minimum severity |

**Create Integration:**
1. Go to PagerDuty → Services → Your Service
2. Integrations → Add integration
3. Select "Events API v2"
4. Copy the integration key

### Webhook Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ALERT_WEBHOOK_URL` | Yes | - | Webhook endpoint |
| `ALERT_WEBHOOK_METHOD` | No | POST | HTTP method |
| `ALERT_WEBHOOK_AUTH_TOKEN` | No | - | Bearer token |
| `ALERT_WEBHOOK_TIMEOUT` | No | 5000 | Timeout in ms |
| `ALERT_WEBHOOK_MIN_SEVERITY` | No | warning | Minimum severity |

**Webhook Payload:**
```json
{
  "status": "firing",
  "alert": {
    "id": "LowCacheHitRate-{...}",
    "name": "LowCacheHitRate",
    "severity": "warning",
    "message": "Cache hit rate below 90%",
    "source": "cache_hit_ratio",
    "value": 85.5,
    "threshold": 90
  },
  "timestamp": "2025-11-29T10:30:00.000Z",
  "service": "market-prices"
}
```

---

## Alert Rules

### Default Rules

| Rule | Severity | Condition | Duration |
|------|----------|-----------|----------|
| LowCacheHitRate | warning | cache_hit_ratio < 0.9 | 1 min |
| CriticalCacheHitRate | critical | cache_hit_ratio < 0.7 | 30 sec |
| HighErrorRate | warning | error_rate > 0.05 | 1 min |
| CriticalErrorRate | critical | error_rate > 0.2 | 30 sec |
| LowEfficiency | warning | efficiency_multiplier < 10 | 5 min |
| ProviderUnhealthy | warning | provider_health == 0 | 1 min |
| HighLatency | warning | response_time_p95 > 2s | 2 min |
| HighMemoryUsage | warning | memory_usage > 80% | 5 min |
| DexScreenerHighErrorRate | warning | dexscreener_error_rate > 0.1 | 2 min |
| SentimentAccuracyLow | warning | sentiment_accuracy < 0.7 | 10 min |
| StaleData | warning | data_freshness > 300s | 1 min |

---

## Prometheus Metrics

### Key Metrics to Monitor

```prometheus
# Cache Performance
coinet_market_prices_cache_hit_ratio
coinet_market_prices_cache_hits_total{cache_type="price"}
coinet_market_prices_cache_misses_total{cache_type="price"}

# Efficiency
coinet_market_prices_efficiency_multiplier
coinet_market_prices_queries_served_total
coinet_market_prices_actual_api_calls_total{provider="coingecko"}

# Provider Health
coinet_market_prices_provider_health{provider="coingecko"}
coinet_market_prices_provider_success_rate{provider="coingecko"}

# DeFi Metrics
coinet_market_prices_dexscreener_requests_total{status="success"}
coinet_market_prices_defillama_requests_total{status="success"}
coinet_market_prices_sentiment_accuracy{source="cryptopanic"}

# Alerts
coinet_market_prices_alerts_active{severity="critical"}
coinet_market_prices_alerts_fired_total{rule="LowCacheHitRate"}
```

### Grafana Dashboard

Import the following as a Grafana dashboard:

```json
{
  "title": "Market Prices Service",
  "panels": [
    {
      "title": "Cache Hit Rate",
      "type": "gauge",
      "targets": [{
        "expr": "coinet_market_prices_cache_hit_ratio * 100"
      }],
      "thresholds": [
        { "color": "red", "value": 70 },
        { "color": "yellow", "value": 90 },
        { "color": "green", "value": 95 }
      ]
    },
    {
      "title": "Efficiency Multiplier",
      "type": "gauge",
      "targets": [{
        "expr": "coinet_market_prices_efficiency_multiplier"
      }],
      "thresholds": [
        { "color": "red", "value": 10 },
        { "color": "yellow", "value": 25 },
        { "color": "green", "value": 50 }
      ]
    },
    {
      "title": "Active Alerts",
      "type": "stat",
      "targets": [{
        "expr": "sum(coinet_market_prices_alerts_active)"
      }]
    }
  ]
}
```

---

## Health Check Integration

### Railway Health Check

The service exposes `/api/health` for Railway health checks.

```bash
curl https://market-prices-production.up.railway.app/api/health
```

Response:
```json
{
  "status": "healthy",
  "service": "market-prices",
  "timestamp": "2025-11-29T10:30:00.000Z",
  "uptime": 3600.0
}
```

### External Monitoring

Configure uptime monitoring services:

| Service | Endpoint | Interval |
|---------|----------|----------|
| UptimeRobot | /api/health | 5 min |
| Pingdom | /api/health | 1 min |
| StatusCake | /api/health | 5 min |

---

## Runbook

### Alert: LowCacheHitRate

**Symptoms:** Cache hit rate below 90%

**Diagnosis:**
1. Check Redis connectivity
2. Review cache key distribution
3. Verify TTL settings
4. Check for cache stampede

**Resolution:**
```bash
# Check cache status
npm run cache:clear -- --dry-run

# Increase TTL if needed
# Set CACHE_TTL_SECONDS=90 in Railway
```

### Alert: CriticalErrorRate

**Symptoms:** API error rate above 20%

**Diagnosis:**
1. Check provider status pages
2. Review rate limit status
3. Verify API keys

**Resolution:**
```bash
# Check key health
npm run security:rotate-keys

# Check provider status
curl https://api.coingecko.com/api/v3/ping
```

### Alert: ProviderUnhealthy

**Symptoms:** Data provider not responding

**Diagnosis:**
1. Check provider status page
2. Verify API key validity
3. Test connectivity

**Resolution:**
1. Enable fallback providers
2. Rotate API keys if rate limited
3. Contact provider if persistent

---

## Testing Notifications

### Test Slack

```bash
# Set SLACK_WEBHOOK_URL in environment
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

# Run alert status to initialize
npm run alerts:status

# Trigger test alert (simulate low cache)
# Or wait for automatic detection
```

### Test PagerDuty

```bash
# Set PAGERDUTY_INTEGRATION_KEY
export PAGERDUTY_INTEGRATION_KEY="your-key"

# Trigger critical alert
# PagerDuty will receive the event
```

---

## Best Practices

1. **Start with Slack** for all alerts (warning+)
2. **Add PagerDuty** for critical/emergency only
3. **Set appropriate thresholds** to avoid alert fatigue
4. **Use silence periods** during maintenance
5. **Review alerts weekly** and adjust thresholds
6. **Keep runbooks updated** with resolution steps

---

## Environment Variables Summary

```bash
# Cache (optimized)
CACHE_TTL_SECONDS=60

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SLACK_CHANNEL=#market-prices-alerts
SLACK_MIN_SEVERITY=warning

# PagerDuty
PAGERDUTY_INTEGRATION_KEY=your-key
PAGERDUTY_MIN_SEVERITY=critical

# Webhook
ALERT_WEBHOOK_URL=https://your-endpoint.com
ALERT_WEBHOOK_AUTH_TOKEN=your-token
```

---

**Last Updated:** November 29, 2025

