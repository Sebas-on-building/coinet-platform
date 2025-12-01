# 🚂 Railway Deployment Check

## Option 1: Login to Railway CLI (Recommended)

```bash
# Login to Railway
railway login

# After login, check status
railway status

# Check if service is linked
cd services/market-prices
railway link

# View deployment logs
railway logs --tail 50

# Get your service URL
railway domain
```

## Option 2: Check Railway Dashboard (Easier)

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your project** (coinet-platform)
3. **Check the "Market Prices" service**:
   - Look for deployment status (green = deployed, yellow = deploying, red = failed)
   - Check the "Logs" tab for any errors
   - Verify environment variables are set

## Option 3: Quick Health Check (If Service is Deployed)

```bash
# Get your Railway URL from dashboard, then test:
curl https://your-service.railway.app/api/health

# Or if you have the domain:
railway domain
# Then test with the returned URL
```

## Common Railway Issues & Fixes

### If service isn't deploying:

1. **Check Root Directory**:
   - Railway Dashboard → Service → Settings
   - Root Directory should be: `services/market-prices`

2. **Check Build Command**:
   - Should be: `npm run build` (or auto-detected)

3. **Check Start Command**:
   - Should be: `npm start` or `node dist/index.js`

4. **Check Environment Variables**:
   - Railway Dashboard → Service → Variables
   - Ensure all required vars are set

### Manual Deploy via Dashboard:

1. Go to Railway Dashboard
2. Select your service
3. Click **"Deploy"** button
4. Watch logs for deployment progress

---

## Quick Status Check Commands

```bash
# Login (one-time)
railway login

# Then run these:
railway status          # Overall project status
railway logs            # View recent logs
railway domain          # Get service URL
railway variables       # List environment variables
```

---

## Expected Deployment Output

When Railway deploys successfully, you should see in logs:

```
✅ Building...
✅ Installing dependencies...
✅ Running build...
✅ Starting service...
🚀 Server listening on port 3000
✅ Market data aggregator initialized successfully
```

---

## If Deployment Fails

Check logs for common issues:
- Missing environment variables
- Build errors
- Port configuration issues
- Database connection errors

Fix in Railway Dashboard → Variables or Settings.

