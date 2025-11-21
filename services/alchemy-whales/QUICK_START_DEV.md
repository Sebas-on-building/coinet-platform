# 🚀 Quick Start - Development Mode

## Start Without Database/Cache (For Testing)

Add these to your `.env` file:

```env
# Development mode settings
NODE_ENV=development
REQUIRE_API_KEYS=false
REQUIRE_DATABASE=false
REQUIRE_CACHE=false
```

Then start:

```bash
# Pull latest
git pull origin feature/ai-data-feeder

# Rebuild
npx tsc -p tsconfig.json

# Start
node dist/index.js
```

## What Works Without Database/Cache

✅ Service starts successfully  
✅ Webhook server runs (port 3001)  
✅ Health check endpoint (port 8080)  
✅ Metrics endpoint (port 9090)  
✅ Monitoring server  
⚠️  Database features disabled  
⚠️  Cache features disabled  
⚠️  Alchemy API calls disabled (need API keys)  

## Verify It's Running

```bash
# Health check
curl http://localhost:8080/health

# Metrics
curl http://localhost:9090/metrics

# Info
curl http://localhost:8080/info
```

## Full Setup (When Ready)

1. **Setup PostgreSQL**:
   ```bash
   createdb coinet_whales
   psql -U postgres -d coinet_whales -f src/database/schema.sql
   ```

2. **Setup Redis** (optional):
   ```bash
   # Redis should be running on localhost:6379
   ```

3. **Add API Keys** to `.env`:
   ```env
   REQUIRE_API_KEYS=true
   REQUIRE_DATABASE=true
   REQUIRE_CACHE=true
   ALCHEMY_API_KEY_ETH=your_key
   DATABASE_PASSWORD=your_password
   ```

4. **Restart service**

