# Codespace & Railway Sync Guide

> **Status:** Ready for deployment
> **Date:** 2025-12-01

---

## 🚀 Quick Start

### Step 1: Sync to Codespace

```bash
# In Codespace terminal
cd /workspaces/coinet-platform

# Pull latest changes
git pull origin feature/ai-data-feeder

# If you get package-lock.json conflicts:
git stash
git pull origin feature/ai-data-feeder
cd services/market-prices
npm install
```

### Step 2: Verify Everything Works

```bash
cd services/market-prices

# Install dependencies
npm install

# Build TypeScript
npm run build

# Quick validation
npm run validate:all
```

### Step 3: Deploy to Railway

**Option A: Railway CLI (Recommended)**

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login to Railway
railway login

# Link to existing project or create new
cd services/market-prices
railway link

# Deploy
railway up
```

**Option B: GitHub Integration (Auto-deploy)**

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `coinet-platform` repository
5. Select `feature/ai-data-feeder` branch
6. Set root directory: `services/market-prices`
7. Railway will auto-deploy on every push!

---

## 📋 Pre-Deployment Checklist

- [ ] Code compiles (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Environment variables set in Railway:
  - `COINGECKO_API_KEY`
  - `CMC_API_KEY` (optional)
  - `PORT` (defaults to 3000)
  - `NODE_ENV=production`
- [ ] Health check endpoint works (`/api/health`)

---

## 🔧 Railway Configuration

The service is configured via `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  }
}
```

**Dockerfile** is also available for custom builds.

---

## 🌐 Environment Variables

Set these in Railway dashboard → Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `COINGECKO_API_KEY` | ✅ Yes | CoinGecko API key |
| `CMC_API_KEY` | ⚠️ Optional | CoinMarketCap (fallback) |
| `CRYPTOPANIC_API_KEY` | ⚠️ Optional | CryptoPanic news |
| `PORT` | ⚠️ Optional | Server port (default: 3000) |
| `NODE_ENV` | ⚠️ Optional | Set to `production` |
| `REDIS_URL` | ⚠️ Optional | Redis cache (if available) |
| `DATABASE_URL` | ⚠️ Optional | PostgreSQL (if available) |

---

## ✅ Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-service.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-01T...",
  "service": "market-prices"
}
```

### 2. Test Endpoints

```bash
# Price API
curl https://your-service.railway.app/api/prices?symbols=BTC,ETH

# Fusion API
curl https://your-service.railway.app/api/fusion/unified?symbol=BTC

# Metrics
curl https://your-service.railway.app/api/metrics
```

### 3. Monitor Logs

```bash
# Via Railway CLI
railway logs

# Or in Railway dashboard → Deployments → View Logs
```

---

## 🐛 Troubleshooting

### Issue: Build fails in Railway

**Solution:**
- Check Railway logs for errors
- Verify `package.json` has all dependencies
- Ensure `npm ci` works locally

### Issue: Service crashes on start

**Solution:**
- Check environment variables are set
- Verify `COINGECKO_API_KEY` is valid
- Check Railway logs for error messages

### Issue: Health check fails

**Solution:**
- Verify `/api/health` endpoint exists
- Check service starts successfully
- Increase `healthcheckTimeout` in `railway.json`

### Issue: Rate limit errors

**Solution:**
- CoinGecko free tier: 30 calls/min
- Service uses caching to stay within limits
- Monitor via `/api/metrics` endpoint

---

## 📊 Monitoring

### Railway Metrics

Railway provides:
- CPU usage
- Memory usage
- Network I/O
- Request logs

### Custom Metrics

Access via `/api/metrics`:
- API call counts
- Cache hit rate
- Response times
- Error rates

---

## 🔄 Continuous Deployment

### Auto-Deploy Setup

1. Connect GitHub repo to Railway
2. Select branch: `feature/ai-data-feeder` (or `main` when merged)
3. Set root directory: `services/market-prices`
4. Railway auto-deploys on every push!

### Manual Deploy

```bash
railway up
```

---

## 📝 Next Steps

After successful deployment:

1. ✅ Run 24h production test:
   ```bash
   npm run test:production:24h
   ```

2. ✅ Monitor metrics:
   ```bash
   curl https://your-service.railway.app/api/metrics
   ```

3. ✅ Set up alerts (optional):
   - Railway webhooks
   - Prometheus integration
   - Slack notifications

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ Health check returns `200 OK`
- ✅ Price API returns data
- ✅ Fusion API works
- ✅ No errors in Railway logs
- ✅ Service stays up for 24h+

---

*Last updated: 2025-12-01*
