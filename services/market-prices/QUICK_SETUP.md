# ⚡ Quick Redis Setup (Copy & Paste)

## Step 1: Navigate to service directory

```bash
cd services/market-prices
```

## Step 2: Find Redis container name

```bash
docker ps -a | grep redis
```

Look for the container name (might be `coinet-redis-1`, `redis-cache`, or something else)

## Step 3: Start Redis (if stopped)

```bash
# Replace CONTAINER_NAME with actual name from step 2
docker start CONTAINER_NAME
```

## Step 4: Set environment variables

```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=
```

## Step 5: Test Redis connection

```bash
# Replace CONTAINER_NAME with actual name
docker exec CONTAINER_NAME redis-cli ping
# Should return: PONG
```

## Step 6: Restart your service

```bash
# Stop current service (Ctrl+C)
npm start
```

## Step 7: Verify cache is connected

```bash
curl http://localhost:3000/api/debug | jq '.cache'
```

Should show `"connected": true`

---

## All-in-One (if Redis container is `coinet-redis-1`)

```bash
cd services/market-prices
docker start coinet-redis-1
export REDIS_HOST=localhost && export REDIS_PORT=6379 && export REDIS_PASSWORD=
docker exec coinet-redis-1 redis-cli ping
# Should return: PONG
# Then restart your service
```

---

**Once Redis is connected, cache hit rate should jump to 80-95%!** 🎉

