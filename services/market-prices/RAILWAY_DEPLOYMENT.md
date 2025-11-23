# Railway Deployment Guide - Market Prices Service

## 🚀 Quick Deploy to Railway

### Prerequisites
- Railway account connected to GitHub
- Repository pushed to GitHub (✅ Done)
- Environment variables configured

### Step 1: Create New Service in Railway

1. Go to Railway dashboard
2. Click "New Project" or select existing project
3. Click "New Service" → "GitHub Repo"
4. Select `coinet-platform` repository
5. Select `services/market-prices` as the root directory

### Step 2: Configure Build Settings

Railway will auto-detect the service. Configure:

**Build Command:**
```bash
cd services/market-prices && npm install && npm run build
```

**Start Command:**
```bash
cd services/market-prices && node dist/index.js
```

**Health Check Path:**
```
/health
```

### Step 3: Set Environment Variables

Add these environment variables in Railway dashboard:

#### Required Variables
```bash
# Environment
NODE_ENV=production

# CoinGecko
COINGECKO_API_KEY_PROD=your_production_api_key
COINGECKO_TIER=pro
COINGECKO_RATE_LIMIT_PER_MINUTE=1000
COINGECKO_API_URL=https://pro-api.coingecko.com/api/v3
COINGECKO_PRO_API_URL=https://pro-api.coingecko.com/api/v3
COINGECKO_WS_URL=wss://ws.coingecko.com/v1

# CoinMarketCap
COINMARKETCAP_API_KEY_PROD=your_production_api_key
COINMARKETCAP_COMMERCIAL_LICENSE=true
COINMARKETCAP_RATE_LIMIT_PER_MINUTE=250
COINMARKETCAP_API_URL=https://pro-api.coinmarketcap.com/v1

# Database (TimescaleDB)
TIMESCALE_HOST=your_timescale_host
TIMESCALE_PORT=5432
TIMESCALE_DATABASE=coinet
TIMESCALE_USER=your_user
TIMESCALE_PASSWORD=your_password

# Redis Cache
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Service Configuration
CACHE_TTL_SECONDS=30
FAILOVER_RETRY_DELAY_MS=5000
MAX_RETRY_ATTEMPTS=3
LOG_LEVEL=info

# Feature Flags
ENABLE_WEBSOCKET=true
ENABLE_REST_FALLBACK=true
ENABLE_CMC_FALLBACK=true

# WebSocket Configuration
COINGECKO_MAX_CONCURRENT_WS=10
COINGECKO_MAX_SUBSCRIPTIONS_PER_CHANNEL=100
COINGECKO_WS_RECONNECT_INTERVAL_MS=5000
COINGECKO_WS_HEARTBEAT_INTERVAL_MS=30000

# Metrics Server (Optional)
METRICS_PORT=9090

# Alert Integrations (Optional)
ALERT_INTEGRATIONS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_key
```

### Step 4: Deploy

1. Railway will automatically deploy on push to `main` branch
2. Monitor deployment logs in Railway dashboard
3. Check health endpoint: `https://your-service.railway.app/health`

### Step 5: Verify Deployment

```bash
# Health check
curl https://your-service.railway.app/health

# Metrics (if metrics server enabled)
curl https://your-service.railway.app/metrics/summary
```

## 📋 Railway-Specific Configuration

### Create `railway.json` in `services/market-prices/`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "on_failure",
    "restartPolicyMaxRetries": 3
  }
}
```

### Dockerfile Alternative

If using Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY services/market-prices/package*.json ./
RUN npm ci --only=production

# Copy source
COPY services/market-prices/ ./

# Build
RUN npm run build

# Expose ports
EXPOSE 3000 9090

# Start
CMD ["node", "dist/index.js"]
```

## 🔍 Monitoring

### Health Endpoints
- `/health` - Service health check
- `/metrics` - Comprehensive metrics (JSON)
- `/metrics/prometheus` - Prometheus format
- `/metrics/summary` - Dashboard summary

### Railway Metrics
Railway will automatically track:
- CPU usage
- Memory usage
- Network traffic
- Request latency

## 🚨 Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Verify all dependencies in `package.json`
- Check build logs in Railway

### Service Won't Start
- Verify all required environment variables are set
- Check start command is correct
- Review logs for errors

### Health Check Fails
- Ensure `/health` endpoint is accessible
- Check database and Redis connections
- Verify API keys are valid

### High Memory Usage
- Reduce `COINGECKO_MAX_CONCURRENT_WS` if needed
- Adjust cache TTL
- Monitor quota usage

## 📊 Recommended Railway Settings

### Resource Limits
- **Memory:** 512MB minimum, 1GB recommended
- **CPU:** 0.5 vCPU minimum, 1 vCPU recommended
- **Disk:** 1GB

### Scaling
- **Horizontal:** Enable if needed
- **Vertical:** Increase resources if hitting limits

## 🔐 Security Notes

1. **Never commit API keys** - Use Railway secrets
2. **Use production keys** - Set `NODE_ENV=production`
3. **Enable commercial license** - Set `COINMARKETCAP_COMMERCIAL_LICENSE=true`
4. **Secure Redis** - Use password-protected Redis
5. **Monitor quotas** - Set up alerts for quota thresholds

## ✅ Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Railway service created
- [ ] Environment variables configured
- [ ] Build command set
- [ ] Start command set
- [ ] Health check path configured
- [ ] Service deployed successfully
- [ ] Health endpoint responding
- [ ] Metrics endpoint accessible (if enabled)
- [ ] Alerts configured (if enabled)

## 🎉 Success Indicators

✅ Service status: **Running**  
✅ Health check: **200 OK**  
✅ Database: **Connected**  
✅ Cache: **Connected**  
✅ Providers: **Healthy**  
✅ Metrics: **Available**

---

**Ready to deploy!** 🚀

