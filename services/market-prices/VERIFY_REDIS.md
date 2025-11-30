# ✅ Verify Redis Connection

## Your Redis Status

Based on your output, Redis **is already running**:
```
coinet-redis   redis:7-alpine   Up 57 minutes (healthy)   0.0.0.0:6379->6379/tcp
```

## Next Steps: Connect Your Service

### 1. Check Environment Variables

In your Codespace terminal, check if Redis env vars are set:

```bash
echo $REDIS_HOST
echo $REDIS_PORT
echo $REDIS_PASSWORD
```

### 2. Set Environment Variables (if not set)

```bash
# For Codespace (Redis running in Docker)
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=

# Or if using Railway Redis
export REDIS_HOST=<railway-redis-host>
export REDIS_PORT=6379
export REDIS_PASSWORD=<railway-redis-password>
```

### 3. Test Redis Connection

```bash
# Test from Node.js
node -e "
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined
});
client.on('error', (err) => console.log('Redis Error:', err));
client.on('connect', () => console.log('✅ Redis Connected!'));
client.ping().then(r => console.log('Ping:', r)).then(() => process.exit(0));
"
```

### 4. Restart Your Service

After setting environment variables:

```bash
# Stop current service
# Then restart with Redis env vars set
npm start
```

### 5. Verify Cache is Working

```bash
# Check debug endpoint
curl http://localhost:3000/api/debug | jq '.cache'

# Should show:
# {
#   "connected": true,
#   "keys": 0,
#   "hitRate": 0
# }
```

## Quick Test

Run this to verify everything:

```bash
# 1. Check Redis is running
docker ps | grep redis

# 2. Test Redis connection
docker exec coinet-redis redis-cli ping
# Should return: PONG

# 3. Set env vars
export REDIS_HOST=localhost
export REDIS_PORT=6379

# 4. Restart service and check logs for "Redis connected"
```

## Troubleshooting

### "Redis Error" in logs
- Check `REDIS_HOST` and `REDIS_PORT` are set correctly
- Verify Redis container is running: `docker ps | grep redis`
- Test connection: `docker exec coinet-redis redis-cli ping`

### Cache still 0%
- Redis must be connected **before** starting the service
- Check logs for "Redis connected" message
- Verify env vars are set: `env | grep REDIS`

### Service can't connect
- Make sure Redis is accessible from your service
- Check firewall/network settings
- Try `localhost` instead of `127.0.0.1`

---

**Once Redis is connected, cache hit rate should jump to 80-95%!** 🎉

