# Railway Deployment - Service URLs

## 🌐 Public URL

**Health Endpoint:**
```
https://market-prices-production.up.railway.app/api/health
```

**Test Command:**
```bash
curl https://market-prices-production.up.railway.app/api/health | jq
```

## ✅ Service Status

- **Status:** ✅ Healthy
- **Public Domain:** `market-prices-production.up.railway.app`
- **Port:** 8080 (Railway automatically sets `PORT` env var)
- **Health Check Path:** `/api/health`

## 📋 Quick Test

```bash
# Health check
curl https://market-prices-production.up.railway.app/api/health

# With pretty JSON output
curl https://market-prices-production.up.railway.app/api/health | jq

# Check service status
curl https://market-prices-production.up.railway.app/api/health | jq .status
```

## 🔧 Configuration

- **Root Directory:** `services/market-prices`
- **Branch:** `feature/ai-data-feeder`
- **Start Command:** `node dist/index.js`
- **Health Check:** `/api/health`
- **Health Check Timeout:** 300 seconds

## 📊 Expected Response

```json
{
  "status": "healthy",
  "service": "market-prices",
  "timestamp": "2025-11-29T09:36:29.513Z",
  "uptime": 593.86
}
```

## 🚀 Next Steps

1. ✅ Service is deployed and healthy
2. ✅ Public domain is configured
3. ✅ Health endpoint is accessible
4. 🔄 Monitor deployments in Railway dashboard
5. 🔄 Check logs if issues arise

## 🔍 Monitoring

- **Railway Dashboard:** https://railway.app/dashboard
- **Deployments:** Check for recent successful deployments
- **Logs:** Monitor startup and runtime logs
- **Metrics:** Track CPU, memory, and network usage

