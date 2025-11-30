# 🚀 Quick Redis Setup Guide

## For Railway Production (Recommended)

### Step 1: Add Redis Service
1. Go to Railway dashboard
2. Click "New" → "Database" → "Add Redis"
3. Railway will create Redis automatically

### Step 2: Link to Market Prices Service
1. Go to your `market-prices` service
2. Click "Variables" tab
3. Railway automatically adds:
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`
   - `REDIS_URL`

### Step 3: Redeploy
Railway will automatically redeploy with Redis connection!

**That's it!** Redis is now connected. ✅

---

## For Local Testing

### Option A: Docker Compose (Easiest)

```bash
# Start Redis
docker-compose -f docker-compose.redis.yml up -d

# Check if running
docker ps | grep redis

# Stop Redis
docker-compose -f docker-compose.redis.yml down
```

### Option B: Docker Run

```bash
# Start Redis
docker run -d \
  --name redis-cache \
  -p 6379:6379 \
  redis:7-alpine

# Check if running
docker ps | grep redis

# Stop Redis
docker stop redis-cache
docker rm redis-cache
```

### Option C: Install Redis Locally

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

---

## Verify Redis is Working

### Test Connection
```bash
# Using redis-cli
redis-cli ping
# Should return: PONG

# Or test from Node.js
node -e "const redis = require('redis'); const client = redis.createClient({host: 'localhost', port: 6379}); client.ping().then(r => console.log(r)).then(() => process.exit(0));"
```

### Check in Your App
```bash
# After starting your service, check debug endpoint
curl http://localhost:3000/api/debug | jq '.cache'

# Should show:
# {
#   "connected": true,
#   "keys": 0,
#   "hitRate": 0
# }
```

---

## Environment Variables

### For Railway (Auto-configured)
Railway automatically sets these when you add Redis service:
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_URL`

### For Local Development
Create `.env` file:
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

## Troubleshooting

### "Cannot connect to Redis"
1. **Check if Redis is running:**
   ```bash
   docker ps | grep redis
   # or
   redis-cli ping
   ```

2. **Check environment variables:**
   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

3. **Check logs:**
   ```bash
   # Look for "Redis connected" in service logs
   # Or "Redis error" warnings
   ```

### "Redis connection refused"
- Redis isn't running
- Wrong host/port
- Firewall blocking connection

### Cache Still 0%?
- Redis must be running **before** starting the service
- Restart service after Redis is connected
- Check logs for Redis connection errors

---

## Quick Start Commands

```bash
# Railway (Production)
# Just add Redis service in dashboard - that's it!

# Local (Docker)
docker-compose -f docker-compose.redis.yml up -d

# Local (macOS)
brew install redis && brew services start redis

# Verify
redis-cli ping
```

---

**Once Redis is running, cache hit rate should jump to 80-95%!** 🎉

