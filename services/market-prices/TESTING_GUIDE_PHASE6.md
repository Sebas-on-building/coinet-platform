# Phase 6 Testing Guide

**Testing Security, Monitoring & CI/CD Features**

## 🚀 Quick Start

All changes have been pushed to `feature/ai-data-feeder` branch. Railway will automatically deploy.

---

## 1. Verify Railway Deployment

### Check Deployment Status

1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select `market-prices` service
3. Check **Deployments** tab - should show latest commit
4. Verify deployment is **Active** and healthy

### Test Health Endpoint

```bash
# Production
curl https://market-prices-production.up.railway.app/api/health | jq

# Expected response:
{
  "status": "healthy",
  "service": "market-prices",
  "timestamp": "2025-11-29T...",
  "uptime": 123.45
}
```

---

## 2. Test Security Features

### Enhanced Key Rotation

```bash
# In Codespace or local
cd services/market-prices

# Check key rotation status (requires API keys in env)
npm run security:rotate-keys

# Rotate specific provider
npm run security:rotate-keys -- --provider=coingecko
```

**What to verify:**
- ✅ Keys rotate automatically on rate limit errors
- ✅ Health status shows key metrics
- ✅ Rotation history is tracked

### Schema Validation

The schema validator is integrated into normalizers. It will:
- ✅ Detect API changes automatically
- ✅ Log unknown fields as warnings
- ✅ Transform types when possible
- ✅ Emit events for monitoring

**Check logs for:**
```
Schema validation failed: coingecko_price
Unknown field detected: new_field_name
```

---

## 3. Test Monitoring & Metrics

### Prometheus Metrics Endpoint

```bash
# If metrics server is running (port 9090)
curl http://localhost:9090/metrics | grep defi

# Or check Railway logs for metrics
```

**Key metrics to verify:**
- `defi_dexscreener_requests_total`
- `defi_defillama_requests_total`
- `defi_sentiment_accuracy`
- `defi_aggregation_latency_seconds`
- `alert_cache_hit_rate_below_threshold`

### DeFi Metrics

```bash
# Test DeFi features to generate metrics
npm run test:defi-features

# Check metrics are recorded
npm run alerts:status
```

**Expected metrics:**
- DexScreener requests tracked
- DeFiLlama protocols tracked
- Sentiment analyses recorded
- Token discovery scans logged

---

## 4. Test Alert System

### Check Alert Status

```bash
# View current alerts
npm run alerts:status

# View with history
npm run alerts:status -- --history

# View configured rules
npm run alerts:status -- --rules
```

### Trigger Test Alerts

**Low Cache Hit Rate Alert:**
```bash
# Clear cache to trigger alert
npm run cache:clear

# Wait 1 minute, then check
npm run alerts:status
```

**Expected:**
- ⚠️ Alert fired: `LowCacheHitRate`
- Status: `firing`
- Severity: `warning`

### Alert Channels

Configured channels (if env vars set):
- ✅ Console (always enabled)
- ✅ Webhook (`ALERT_WEBHOOK_URL`)
- ✅ Slack (`SLACK_WEBHOOK_URL`)
- ✅ PagerDuty (`PAGERDUTY_INTEGRATION_KEY`)

---

## 5. Test CI/CD Workflows

### Manual Trigger

1. Go to GitHub Actions: https://github.com/Sebas-on-building/coinet-platform/actions
2. Select **Benchmark & Efficiency Tests**
3. Click **Run workflow**
4. Choose benchmark type:
   - `quick` - Fast test (5 min)
   - `full` - Comprehensive (15 min)
   - `defi` - DeFi-specific tests
   - `all` - Everything

### Verify Workflow Runs

**Check for:**
- ✅ Benchmark job completes
- ✅ DeFi benchmark runs (if selected)
- ✅ Efficiency check passes
- ✅ Results uploaded as artifacts
- ✅ PR comment created (if PR exists)

### Quarterly Review

**Scheduled:** Q1, Q2, Q3, Q4 (1st of month at 00:00 UTC)

**Manual trigger:**
1. Go to **Quarterly Performance Review** workflow
2. Click **Run workflow**
3. Options:
   - Generate report: `true`
   - Update docs: `true`

**Expected outputs:**
- ✅ Quarterly benchmark results
- ✅ Performance report generated
- ✅ Documentation updated
- ✅ Notifications sent (if configured)

---

## 6. Test Utility Scripts

### Cache Management

```bash
# Clear all cache
npm run cache:clear

# Clear specific pattern
npm run cache:clear -- --pattern="prices:*"

# Dry run (see what would be deleted)
npm run cache:clear -- --dry-run
```

### Key Rotation

```bash
# Rotate all keys
npm run security:rotate-keys

# Rotate specific provider
npm run security:rotate-keys -- --provider=coingecko
```

### Alert Status

```bash
# Current status
npm run alerts:status

# With history
npm run alerts:status -- --history --limit=50

# Show rules
npm run alerts:status -- --rules
```

---

## 7. Verify Documentation

### Check Files Exist

```bash
# In Codespace
cd services/market-prices

# Verify files
ls -la MAINTENANCE_PLAN.md
ls -la EFFICIENCY_REPORT.md
ls -la QUARTERLY_REPORT_*.md 2>/dev/null || echo "No quarterly reports yet"
```

### Review Maintenance Plan

```bash
# View maintenance plan
cat MAINTENANCE_PLAN.md | head -50

# Check schedules
grep -A 5 "Weekly Tasks" MAINTENANCE_PLAN.md
```

---

## 8. Integration Testing

### Full Service Test

```bash
# Start service locally
npm run dev

# In another terminal, test endpoints
curl http://localhost:3000/api/health | jq

# Test metrics (if metrics server enabled)
curl http://localhost:9090/metrics | grep coinet

# Check alerts
npm run alerts:status
```

### Railway Production Test

```bash
# Health check
curl https://market-prices-production.up.railway.app/api/health | jq

# Check Railway logs for:
# - Key rotation events
# - Schema validation warnings
# - Alert triggers
# - Metrics collection
```

---

## 9. Expected Behaviors

### ✅ Security

- Keys rotate automatically after 3 consecutive rate limits
- Schema validation logs unknown fields
- Key health monitored every 30 seconds
- Cooldown periods enforced after rotation

### ✅ Monitoring

- DeFi metrics recorded for all operations
- Cache hit rate tracked and alerted
- Error rates monitored
- Latency percentiles calculated

### ✅ Alerts

- Cache hit rate <90% triggers warning
- Error rate >5% triggers warning
- Error rate >20% triggers critical
- Provider unhealthy triggers warning

### ✅ CI/CD

- Benchmarks run on push
- DeFi tests included
- Efficiency threshold checked (50x)
- Quarterly reviews scheduled

---

## 10. Troubleshooting

### Alerts Not Firing

**Check:**
1. Alert manager started: `npm run alerts:status`
2. Metrics being collected: Check Prometheus endpoint
3. Thresholds configured: Review alert rules
4. Notification channels enabled: Check env vars

### Metrics Not Appearing

**Check:**
1. DeFi features being used: Run `npm run test:defi-features`
2. Metrics server running: Port 9090 accessible
3. Prometheus scraping: Check scrape config

### Key Rotation Not Working

**Check:**
1. API keys configured: `COINGECKO_API_KEY`, etc.
2. Enhanced rotation initialized: Check logs
3. Rate limits being hit: Check provider status
4. Multiple keys available: Need 2+ keys per provider

### CI/CD Not Running

**Check:**
1. Workflow files in `.github/workflows/`
2. Branch protection rules
3. GitHub Actions enabled
4. Path filters correct

---

## 11. Success Criteria

### ✅ All Tests Pass

- [ ] Health endpoint responds
- [ ] Key rotation works
- [ ] Schema validation detects changes
- [ ] DeFi metrics recorded
- [ ] Alerts fire correctly
- [ ] CI/CD workflows run
- [ ] Documentation accessible
- [ ] Utility scripts work

### ✅ Production Ready

- [ ] Railway deployment successful
- [ ] No critical alerts
- [ ] Metrics being collected
- [ ] Benchmarks passing
- [ ] Documentation complete

---

## 📝 Next Steps

1. **Monitor for 24 hours** - Watch for alerts and metrics
2. **Review logs** - Check for schema validation warnings
3. **Run benchmarks** - Verify efficiency metrics
4. **Test alerts** - Trigger and verify notifications
5. **Update docs** - Add any findings to maintenance plan

---

**Last Updated:** November 29, 2025  
**Phase:** 6 - Security, Monitoring & CI/CD  
**Status:** ✅ Complete & Ready for Testing

