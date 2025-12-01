# ✅ COINET V1 - DEPLOYMENT VERIFICATION CHECKLIST

**Purpose**: Step-by-step checklist to verify Railway deployment is 100% operational.

---

## 🔍 PRE-DEPLOYMENT CHECKS

### 1. GitHub Repository Status
- [ ] Latest commit pushed to `main` branch
- [ ] Commit hash: `2442123` (or later)
- [ ] All files present in GitHub:
  - [ ] `Dockerfile`
  - [ ] `railway.json`
  - [ ] `pnpm-lock.yaml`
  - [ ] `packages/signal-intelligence/`
  - [ ] `packages/engine/`
  - [ ] `packages/ai-intelligence/`
  - [ ] `services/notifications/`
  - [ ] `services/frontend-api/`
  - [ ] `apps/coinet-platform/`

### 2. Railway Project Configuration
- [ ] Railway account logged in: https://railway.app/dashboard
- [ ] Project exists: `coinet-platform`
- [ ] GitHub repo connected
- [ ] Auto-deploy enabled on `main` branch

---

## 🚀 DEPLOYMENT STATUS CHECKS

### 3. Build Phase
**Location**: Railway Dashboard → Deployments → Latest → Build Logs

- [ ] Build started automatically after GitHub push
- [ ] Docker build completed without errors
- [ ] pnpm install completed (all dependencies resolved)
- [ ] Turbo build completed (all packages built)
- [ ] Build logs show: "✅ Build successful"

**Expected Log Output** (key lines):
```
#0 building with "default" instance using docker driver
...
#12 [stage-1 6/7] RUN pnpm install --frozen-lockfile --prod
#13 [stage-1 7/7] RUN pnpm turbo run build --filter=coinet-platform
...
Successfully built <image-id>
Successfully tagged <image-name>
```

### 4. Deploy Phase
**Location**: Railway Dashboard → Deployments → Latest → Deploy Logs

- [ ] Container started
- [ ] Health check passed
- [ ] Service marked as "Active" (green status)

**Expected Log Output**:
```
🚀 Coinet Platform starting...
✅ Engine initialized
✅ AI Intelligence initialized
✅ Notifications initialized
✅ Frontend API initialized
✅ All services initialized successfully
Server listening on port 8080
Health check passed: /api/health
```

**If Deployment Fails** (red status):
- Read Deploy Logs carefully
- Look for error messages (e.g., "Cannot find module", "ECONNREFUSED")
- See "Troubleshooting" section below

---

## 🧪 FUNCTIONAL VERIFICATION

### 5. Health Endpoint Test
**Purpose**: Verify the backend is responding.

```bash
# Get your Railway deployment URL from Dashboard (e.g., https://coinet-platform-production.up.railway.app)
export RAILWAY_URL="https://YOUR-URL.railway.app"

# Test health endpoint
curl $RAILWAY_URL/api/health
```

**Expected Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:34:56.789Z",
  "components": {
    "ingestion": { "status": "healthy", "message": "Binance stream active", "lastCheck": "..." },
    "processing": { "status": "healthy", "message": "All workers running", "lastCheck": "..." },
    "storage": { "status": "healthy", "message": "Redis and PostgreSQL connected", "lastCheck": "..." },
    "output": { "status": "healthy", "message": "API server running", "lastCheck": "..." }
  },
  "metrics": {
    "uptime": 123,
    "memoryUsage": 0.45,
    "cpuUsage": 0.12,
    "signalsPerSecond": 2.5
  }
}
```

**If Health Check Fails**:
- [ ] Check Deploy Logs for startup errors
- [ ] Verify `railway.json` has correct `healthcheckPath: "/api/health"`
- [ ] Verify Railway Custom Start Command is NOT overriding `railway.json`

---

### 6. Signals API Test
**Purpose**: Verify signal processing is working.

```bash
# Fetch recent signals (may be empty if just deployed)
curl $RAILWAY_URL/api/signals?limit=10
```

**Expected Response** (200 OK):
```json
{
  "signals": [
    {
      "id": "whale-0x1234...",
      "signalType": "whale",
      "severity": "high",
      "direction": "bullish",
      "confidence": 85,
      "explanation": "Whale withdrawal: 500.00 ETH ($1.00M) from Binance | Pattern: accumulation (5 txs in 24h) | Bullish signal: Whale accumulating",
      "timestamp": "2025-10-27T12:30:00.000Z",
      "suggestedAction": "buy"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

**If Empty `signals: []`**:
- ✅ **Normal** - System just started, waiting for first signals
- Wait 5-10 minutes for data ingestion to populate
- Check Deploy Logs for ingestion activity

---

### 7. WebSocket Connection Test
**Purpose**: Verify real-time signal streaming.

**Using Browser Console**:
```javascript
// Open browser console (F12)
const ws = new WebSocket('wss://YOUR-URL.railway.app');

ws.onopen = () => {
  console.log('✅ WebSocket connected!');
  ws.send(JSON.stringify({ type: 'subscribe', signals: ['whale', 'social', 'breakout'] }));
};

ws.onmessage = (event) => {
  console.log('📡 New signal:', JSON.parse(event.data));
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

ws.onclose = () => {
  console.log('🔌 WebSocket closed');
};
```

**Expected Behavior**:
- Connection opens immediately
- No errors in console
- After 5-10 minutes, signals start appearing in console

**If Connection Fails**:
- [ ] Check Railway logs for WebSocket errors
- [ ] Verify Railway supports WebSocket (it does by default)
- [ ] Check browser DevTools → Network → WS tab for errors

---

## ⚙️ ENVIRONMENT VARIABLES VERIFICATION

### 8. Required Environment Variables
**Location**: Railway Dashboard → `coinet-platform` service → Variables tab

**Critical Variables** (must be set):
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `REDIS_URL` - Redis connection string
- [ ] `NODE_ENV=production`
- [ ] `PORT=8080` (Railway default)

**Optional but Recommended** (for full functionality):
- [ ] `ETHERSCAN_API_KEY` - For whale tracking
- [ ] `OPENAI_API_KEY` - For AI analysis
- [ ] `TELEGRAM_BOT_TOKEN` - For Telegram alerts
- [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - For email alerts
- [ ] `JWT_SECRET` - For API authentication

**How to Get API Keys**:
- **Etherscan**: https://etherscan.io/myapikey (free tier: 5 calls/sec)
- **OpenAI**: https://platform.openai.com/api-keys (paid)
- **Telegram**: https://t.me/BotFather (free)
- **Google Gemini**: https://ai.google.dev/ (free tier available)

**After Adding Variables**:
- Railway will automatically trigger a new deployment
- Wait 2-3 minutes for redeploy
- Re-run verification checks

---

## 📊 MONITORING & LOGS

### 9. Real-Time Logs Monitoring
**Location**: Railway Dashboard → `coinet-platform` service → Logs tab

**What to Look For** (positive indicators):
```
✅ Coinet Platform starting...
✅ Engine initialized
✅ Binance Stream connected!
✅ Redis Event Bus connected
✅ PostgreSQL connected
✅ AI Intelligence Layer initialized
✅ Notifications Service initialized
✅ Frontend API started on port 8080
✅ All services initialized successfully
```

**What to Avoid** (error indicators):
```
❌ Error: Cannot find module '/app/apps/coinet-platform/dist/index.js'
❌ ECONNREFUSED - Redis connection failed
❌ ENOTFOUND - PostgreSQL host not found
❌ Error: Invalid API key
❌ Uncaught exception: ...
```

**If Errors Appear**:
- Copy full error message
- See "Troubleshooting" section below
- Share logs with development team if needed

---

### 10. Resource Usage Monitoring
**Location**: Railway Dashboard → `coinet-platform` service → Metrics tab

**Healthy Ranges**:
- **CPU Usage**: 10-30% (idle), 50-70% (active)
- **Memory Usage**: 200-500 MB (depending on signal volume)
- **Network**: Consistent inbound/outbound traffic (WebSocket activity)

**Warning Signs**:
- CPU > 90% sustained → May need scaling
- Memory > 1 GB → Possible memory leak
- No network activity → Ingestion may be stalled

---

## 🔧 TROUBLESHOOTING GUIDE

### Error: "Cannot find module '/app/apps/coinet-platform/dist/index.js'"
**Cause**: Railway's "Custom Start Command" is overriding `railway.json`

**Fix**:
1. Railway Dashboard → `coinet-platform` service → Settings
2. Scroll to "Custom Start Command"
3. If it shows anything OTHER than blank, **clear it** (delete the text)
4. Save
5. Manually trigger redeploy (Deployments → ⋮ menu → Redeploy)

---

### Error: "ERR_PNPM_LOCKFILE_BREAKING_CHANGE"
**Cause**: `pnpm-lock.yaml` is out of sync with `package.json`

**Fix** (run locally):
```bash
cd /path/to/coinet-platform
rm pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: regenerate pnpm lockfile"
git push origin main
```

Railway will auto-deploy the fix.

---

### Error: "ECONNREFUSED - Redis connection failed"
**Cause**: `REDIS_URL` is missing or incorrect

**Fix**:
1. Railway Dashboard → Add New → Database → Redis
2. Copy the `REDIS_URL` from the Redis service
3. Go to `coinet-platform` service → Variables → Add `REDIS_URL`
4. Paste the connection string
5. Save (auto-redeploys)

---

### Error: "ENOTFOUND - PostgreSQL host not found"
**Cause**: `DATABASE_URL` is missing or incorrect

**Fix**:
1. Railway Dashboard → Add New → Database → PostgreSQL
2. Copy the `DATABASE_URL` from the PostgreSQL service
3. Go to `coinet-platform` service → Variables → Add `DATABASE_URL`
4. Paste the connection string
5. Save (auto-redeploys)

---

### Error: "Health check timeout"
**Cause**: App is starting too slowly (> 300 seconds)

**Fix**:
1. Check Deploy Logs for slow operations (e.g., large dependency install)
2. Consider increasing health check timeout in `railway.json`:
   ```json
   {
     "healthcheckTimeout": 600
   }
   ```
3. Push to GitHub, wait for redeploy

---

### No Signals Appearing (Empty `signals: []`)
**Possible Causes**:
1. **System Just Started**: Wait 5-10 minutes for first signals
2. **Missing API Keys**: Add `ETHERSCAN_API_KEY`, `BINANCE_API_KEY`
3. **Rate Limiting**: Check logs for "Rate limit exceeded" messages
4. **Ingestion Errors**: Check logs for Binance/Etherscan connection errors

**Fix**:
- Wait patiently (first signals take time)
- Add missing API keys in Railway Variables
- Check Deploy Logs for ingestion status

---

### WebSocket Connection Fails
**Possible Causes**:
1. **Wrong URL**: Using `http://` instead of `wss://`
2. **CORS Issues**: Frontend domain not whitelisted
3. **Railway Proxy**: WebSocket not supported (rare)

**Fix**:
1. Use `wss://` (secure WebSocket), not `ws://`
2. Add frontend domain to CORS whitelist in `services/frontend-api/src/index.ts`:
   ```typescript
   app.use(cors({
     origin: ['https://your-frontend.com', 'http://localhost:3000']
   }));
   ```
3. Check Railway docs: https://docs.railway.app/guides/websockets

---

## ✅ FINAL VERIFICATION CHECKLIST

### All Systems Green ✅
- [ ] Railway deployment shows "Active" (green)
- [ ] Health endpoint returns `status: "healthy"`
- [ ] Signals API returns data (or empty array if just started)
- [ ] WebSocket connects successfully
- [ ] Environment variables all set
- [ ] Logs show no errors
- [ ] CPU/Memory usage normal
- [ ] No warnings in Railway Dashboard

### Ready for Frontend Integration ✅
- [ ] Backend URL documented: `https://YOUR-URL.railway.app`
- [ ] API endpoints tested:
  - [ ] `GET /api/health`
  - [ ] `GET /api/signals`
  - [ ] `GET /api/signals/:id`
- [ ] WebSocket URL tested: `wss://YOUR-URL.railway.app`
- [ ] Authentication tested (if JWT enabled)

### Ready for Production Launch ✅
- [ ] All critical environment variables set
- [ ] Monitoring enabled (Railway Metrics)
- [ ] Backup plan documented (rollback to previous deployment)
- [ ] Support contact documented (for urgent issues)
- [ ] User documentation prepared (API docs, WebSocket protocol)

---

## 🎉 SUCCESS CRITERIA

**Your deployment is 100% verified and ready for production when**:
1. ✅ Health endpoint returns `"status": "healthy"`
2. ✅ Signals API returns data (or gracefully handles empty state)
3. ✅ WebSocket connects and receives real-time updates
4. ✅ Logs show no errors or warnings
5. ✅ Resource usage is within healthy ranges
6. ✅ All critical environment variables are set

**If all boxes are checked, congratulations! 🚀 Coinet V1 is LIVE!**

---

## 📞 NEXT STEPS AFTER VERIFICATION

1. **Document Backend URL**: Share with frontend team
2. **Test Frontend Integration**: Connect UI to backend
3. **Monitor for 24 Hours**: Watch logs, metrics, user feedback
4. **Iterate**: Fix any issues that arise in production
5. **Scale**: Add more Railway instances if needed (paid plan)

---

**Built with ❤️ by the Coinet AI Team**  
**Last Updated**: October 27, 2025  
**Railway Dashboard**: https://railway.app/dashboard

