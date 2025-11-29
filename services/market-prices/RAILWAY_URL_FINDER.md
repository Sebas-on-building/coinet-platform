# Finding Your Railway URL

## Step 1: Check Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project (or create one if needed)
3. Find the `market-prices` service
4. Click on the service

## Step 2: Get the Public URL

In the service page, you'll see:
- **Public Domain** section
- Click "Generate Domain" if no domain exists
- Your URL will look like: `market-prices-production-XXXX.up.railway.app`

## Step 3: Test the Health Endpoint

Once you have the correct URL:

```bash
# Replace YOUR-SERVICE-NAME with your actual Railway service name
curl https://YOUR-SERVICE-NAME.up.railway.app/api/health

# Or with jq for pretty output
curl https://YOUR-SERVICE-NAME.up.railway.app/api/health | jq
```

## Expected Response

```json
{
  "status": "healthy",
  "service": "market-prices",
  "timestamp": "2025-11-29T...",
  "uptime": 123.45
}
```

## If Service Isn't Deployed Yet

### Option 1: Deploy via Railway Dashboard

1. Go to Railway Dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `coinet-platform` repository
4. Select `services/market-prices` as root directory
5. Railway will auto-detect and deploy

### Option 2: Use Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

## Check Deployment Status

In Railway dashboard, check:
- **Deployments** tab - see recent deployments
- **Logs** tab - see build and runtime logs
- **Metrics** tab - see resource usage

## Common Issues

### 404 "Application not found"
- Service not deployed yet
- Wrong URL
- Service name mismatch

### 503 Service Unavailable
- Service is starting up
- Health check failing
- Check logs for errors

### Connection Timeout
- Service crashed
- Check logs for startup errors
- Verify environment variables

