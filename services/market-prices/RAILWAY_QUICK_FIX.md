# Railway Deployment - Quick Fix Guide

## ✅ Current Configuration Status

Your Railway service is correctly configured:
- ✅ Root directory: `services/market-prices`
- ✅ Branch: `feature/ai-data-feeder`
- ✅ Healthcheck path: `/api/health`
- ✅ Start command: `node dist/index.js`

## 🔧 Missing: Public Domain

**Problem:** No public domain has been generated yet.

**Solution:** 
1. In Railway dashboard → `market-prices` service
2. Go to **Networking** section
3. Under **Public Networking**, click **"Generate Domain"**
4. Railway will create a URL like: `market-prices-production-XXXX.up.railway.app`

## 🧪 Test After Generating Domain

Once you have the domain:

```bash
# Replace YOUR-DOMAIN with the actual domain Railway generated
curl https://YOUR-DOMAIN.up.railway.app/api/health | jq
```

Expected response:
```json
{
  "status": "healthy",
  "service": "market-prices",
  "timestamp": "2025-11-29T...",
  "uptime": 123.45
}
```

## 📋 Check Deployment Status

Before testing, verify:
1. **Deployments tab** - Is there a recent successful deployment?
2. **Logs tab** - Are there any errors during startup?
3. **Metrics tab** - Is the service running?

## 🚨 Common Issues

### 404 "Application not found"
- **Cause:** No public domain generated OR wrong URL
- **Fix:** Generate domain in Railway dashboard

### 503 Service Unavailable
- **Cause:** Service starting up or health check failing
- **Fix:** Check logs for errors, wait a few minutes

### Connection Timeout
- **Cause:** Service crashed or not deployed
- **Fix:** Check deployment logs, verify environment variables

## 🔍 Verify Service is Running

Check the **Deployments** tab:
- Look for a deployment with status "Active" or "Success"
- Check the timestamp - should be recent (after your last push)
- Click on the deployment to see logs

## 📝 Next Steps

1. ✅ Generate public domain (click "Generate Domain")
2. ✅ Wait for deployment to complete (check Deployments tab)
3. ✅ Test health endpoint with the new URL
4. ✅ If errors, check logs and share them
