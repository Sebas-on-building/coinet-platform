# 🚀 Exact Deployment Commands

## Step 1: Push to GitHub (Syncs to Codespaces)

```bash
# Navigate to project root
cd /Users/sebastian/Desktop/Arbeit/Coinet

# Check what files changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "fix: Remove duplicate files, fix benchmark configs, integrate key-rotation system

- Removed duplicate alert-integrations.service 2.ts
- Fixed free-tier-benchmark.ts ServiceConfig creation
- Fixed load-test.ts exports
- Added key-rotation exports to index.ts
- All TypeScript compilation errors resolved
- Ready for production deployment"

# Push to GitHub (this syncs to Codespaces automatically)
# You're currently on: feature/ai-data-feeder
git push origin feature/ai-data-feeder

# Or if you want to push to main:
# git push origin main
```

## Step 2: Deploy to Railway

### Option A: Automatic Deploy (Recommended - via GitHub)

If Railway is connected to your GitHub repo:

1. **Railway will auto-deploy** when you push to `main` branch
2. **Check Railway Dashboard**: https://railway.app/dashboard
3. **Verify deployment** in Railway logs

### Option B: Manual Deploy via Railway CLI

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project (if not already linked)
cd services/market-prices
railway link

# Deploy
railway up

# Or deploy with specific environment
railway up --environment production
```

### Option C: Deploy via Railway Dashboard

1. Go to: https://railway.app/dashboard
2. Click your project → **Market Prices Service**
3. Click **"Deploy"** button
4. Railway will pull latest from GitHub and deploy

## Step 3: Set Environment Variables in Railway

```bash
# Via Railway CLI
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set COINGECKO_API_KEY=your_key_here
railway variables set COINMARKETCAP_API_KEY=your_key_here
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
railway variables set REDIS_URL=${{Redis.REDIS_URL}}
railway variables set CACHE_TTL=30
railway variables set ENABLE_WEBSOCKET=false
railway variables set ENABLE_CMC_FALLBACK=true
```

**Or via Dashboard:**
1. Go to Railway Dashboard → Your Service → **Variables**
2. Add each variable manually

## Step 4: Verify Deployment

```bash
# Get your Railway URL
railway domain

# Test health endpoint
curl https://your-service.railway.app/api/health

# Check logs
railway logs

# Or via dashboard
# Railway Dashboard → Your Service → Logs
```

## Quick One-Liner (All Steps)

```bash
cd /Users/sebastian/Desktop/Arbeit/Coinet && \
git add . && \
git commit -m "fix: Remove duplicates, fix benchmarks, integrate key-rotation" && \
git push origin feature/ai-data-feeder && \
echo "✅ Pushed to GitHub (Codespaces will sync automatically)" && \
echo "🚀 Railway will auto-deploy if connected to GitHub repo"
```

## Troubleshooting

### If Railway doesn't auto-deploy:
```bash
cd services/market-prices
railway up --detach
```

### If you need to check Railway status:
```bash
railway status
```

### If deployment fails, check logs:
```bash
railway logs --tail 100
```

### To view Railway service URL:
```bash
railway domain
```

---

## Summary

**GitHub/Codespaces**: `git push origin main`  
**Railway**: Auto-deploys from GitHub, or `railway up`

Both platforms will sync automatically once you push to GitHub! 🎉
