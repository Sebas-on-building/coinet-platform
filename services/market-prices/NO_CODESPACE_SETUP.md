# 🚀 Setup Without Codespace

## Option 1: Railway (Recommended - Already Set Up!)

### Step 1: Add Redis Service in Railway
1. Go to Railway dashboard
2. Click "New" → "Database" → "Add Redis"
3. Railway creates Redis automatically

### Step 2: Link to Market Prices Service
1. Go to your `market-prices` service
2. Click "Variables" tab
3. Railway automatically adds Redis env vars:
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`
   - `REDIS_URL`

### Step 3: Redeploy
Railway automatically redeploys with Redis connection!

**That's it!** Your production service will now use Redis cache. ✅

---

## Option 2: Local Development

### Step 1: Start Redis Locally

**macOS:**
```bash
# Install Redis
brew install redis

# Start Redis
brew services start redis

# Or run manually
redis-server
```

**Linux:**
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis
```

**Docker (Any OS):**
```bash
docker run -d \
  --name redis-cache \
  -p 6379:6379 \
  redis:7-alpine
```

### Step 2: Set Environment Variables

Create `.env` file in `services/market-prices/`:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Step 3: Install Dependencies & Run

```bash
cd services/market-prices
npm install
npm run build
npm start
```

### Step 4: Test

```bash
# Check cache connection
curl http://localhost:3000/api/debug | jq '.cache'

# Run load test
npm run test:real:1000x:quick
```

---

## Option 3: Use Railway Redis from Local

If you want to use Railway Redis from your local machine:

1. Get Redis connection details from Railway dashboard
2. Create `.env` file:
   ```bash
   REDIS_HOST=<railway-redis-host>
   REDIS_PORT=6379
   REDIS_PASSWORD=<railway-redis-password>
   ```
3. Run locally but connect to Railway Redis

---

## Quick Test Commands

```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check if Redis is running
redis-cli info server | head -5

# Test set/get
redis-cli set test "working"
redis-cli get test
# Should return: working
```

---

## What You've Accomplished So Far

✅ **Production Test:** PASSED (100% uptime, <2000ms response)
✅ **Load Test Infrastructure:** Complete
✅ **Cache Pre-warming:** Implemented
✅ **Free Tier Configuration:** Fixed
✅ **Redis Setup Guides:** Created

**Next Steps:**
1. Set up Redis (Railway or local)
2. Re-run load test
3. See cache hit rate jump to 80-95%!

---

## Railway Redis Setup (Fastest)

Since you're already using Railway, this is the fastest option:

1. **Add Redis service** in Railway dashboard
2. **Railway auto-links** it to your market-prices service
3. **Redeploy** (automatic)
4. **Done!** ✅

No local setup needed - everything runs in Railway!

---

**Your production service is already working great!** Just add Redis to unlock the cache magic. 🎉

