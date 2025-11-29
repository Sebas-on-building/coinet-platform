# 🔗 Finding Your Railway URL

## Quick Steps

### Option 1: Railway Dashboard (Easiest)

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Login if needed

2. **Find Your Service**
   - Select your project
   - Look for `market-prices` service
   - Click on it

3. **Get Public Domain**
   - In the service page, look for **"Public Domain"** section
   - If no domain exists, click **"Generate Domain"**
   - Copy the URL (format: `market-prices-production-XXXX.up.railway.app`)

4. **Test Health Endpoint**
   ```bash
   # Replace YOUR-URL with the actual URL from Railway
   curl https://YOUR-URL.up.railway.app/api/health
   
   # Or with pretty JSON output
   curl https://YOUR-URL.up.railway.app/api/health | jq
   ```

### Option 2: Railway CLI

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
cd services/market-prices
railway link

# Get service URL
railway status

# Or use the helper script
bash scripts/find-railway-url.sh
```

---

## Expected Health Check Response

```json
{
  "status": "healthy",
  "service": "market-prices",
  "timestamp": "2025-11-29T17:30:00.000Z",
  "uptime": 123.45
}
```

---

## Troubleshooting

### "Not Found" Error

**Cause:** Wrong URL or service not deployed

**Solution:**
1. Verify URL in Railway Dashboard
2. Check service is deployed (Deployments tab)
3. Verify service is running (Logs tab)

### "Connection Refused" or Timeout

**Cause:** Service not running or crashed

**Solution:**
1. Check Railway logs for errors
2. Verify environment variables are set
3. Check build succeeded in Railway dashboard

### Service Not Deployed Yet

**To Deploy:**

1. **Via Dashboard:**
   - Railway Dashboard → New Project
   - Deploy from GitHub repo
   - Select `coinet-platform` repository
   - Set root directory: `services/market-prices`

2. **Via CLI:**
   ```bash
   railway up
   ```

---

## Health Endpoint Paths

The service exposes two health endpoints:

- `/api/health` ✅ (Recommended)
- `/health` ✅ (Alternative)

Both return the same response.

---

## Quick Test Script

Run this in your Codespace:

```bash
# Replace YOUR-URL with actual Railway URL
RAILWAY_URL="YOUR-URL.up.railway.app"

# Test health endpoint
curl -s "https://$RAILWAY_URL/api/health" | jq

# Expected output:
# {
#   "status": "healthy",
#   "service": "market-prices",
#   "timestamp": "...",
#   "uptime": ...
# }
```

---

## Need Help?

1. Check Railway Dashboard → Logs tab for errors
2. Verify service is deployed (Deployments tab)
3. Check environment variables are set correctly
4. Verify build succeeded (no TypeScript errors)

---

**Next Step:** Once you have the URL, test it with:
```bash
curl https://YOUR-ACTUAL-URL.up.railway.app/api/health
```

