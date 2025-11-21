# 🚀 Quick Start Guide

## For Railway Deployment

### Option 1: Automated Script
```bash
cd services/alchemy-whales
./RAILWAY_DEPLOY.sh
```

### Option 2: Manual Commands
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Navigate to service
cd services/alchemy-whales

# Link to project (first time)
railway link

# Set environment variables
railway variables set ALCHEMY_API_KEY_ETH=your_key
railway variables set ALCHEMY_API_KEY_POLYGON=your_key
railway variables set ALCHEMY_API_KEY_ARBITRUM=your_key
railway variables set ALCHEMY_API_KEY_OPTIMISM=your_key
railway variables set ALCHEMY_API_KEY_BASE=your_key
railway variables set DATABASE_PASSWORD=your_password
railway variables set WEBHOOK_SECRET=$(openssl rand -hex 32)

# Deploy
railway up
```

## For Codespace Sync

### Quick Sync (Copy & Paste)
```bash
cd /workspaces/coinet-platform && \
git pull origin feature/ai-data-feeder && \
cd services/alchemy-whales && \
npm install && \
npm run build && \
cp .env.example .env && \
echo "✅ Synced! Edit .env file and run 'npm start'"
```

### Step by Step
1. **Pull latest code:**
   ```bash
   cd /workspaces/coinet-platform
   git pull origin feature/ai-data-feeder
   ```

2. **Install dependencies:**
   ```bash
   cd services/alchemy-whales
   npm install
   ```

3. **Build:**
   ```bash
   npm run build
   ```

4. **Configure:**
   ```bash
   cp .env.example .env
   code .env  # Edit with your API keys
   ```

5. **Start:**
   ```bash
   npm start
   ```

## Verify Deployment

### Railway
```bash
railway domain  # Get URL
curl https://your-app.railway.app/health
```

### Codespace
```bash
curl http://localhost:9090/health
curl http://localhost:9090/metrics
```

## Need Help?

- Railway: See `RAILWAY_SETUP.md`
- Codespace: See `SYNC_TO_CODESPACE.md`
- General: See `README.md`
