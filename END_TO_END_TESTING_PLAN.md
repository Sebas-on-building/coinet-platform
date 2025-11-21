# 🧪 COINET V1 - END-TO-END TESTING PLAN

**Purpose**: Comprehensive testing strategy to ensure Coinet V1 is 100% production-ready.

---

## 📋 TESTING OVERVIEW

### Testing Levels
1. **Unit Tests** (✅ Already implemented) - Individual function tests
2. **Integration Tests** (🟡 Partial) - Component interaction tests
3. **End-to-End Tests** (🔴 This document) - Full system flow tests
4. **Load Tests** (🔴 Optional) - Performance under high load
5. **Security Tests** (🟡 Basic) - Vulnerability scanning

### Success Criteria
- All critical paths tested and passing
- No unhandled errors in logs
- Response times within acceptable limits
- Real-time features working reliably
- Graceful degradation when services fail

---

## 🎯 TEST SCENARIOS

### Scenario 1: Data Ingestion → Signal Detection → Frontend Display

**Goal**: Verify the complete signal processing pipeline.

#### Steps:
1. **Start Backend**:
```bash
# Verify Railway deployment is running
curl https://your-railway-url.railway.app/api/health
# Expected: 200 OK with status "healthy"
```

2. **Monitor Data Ingestion**:
```bash
# Watch Railway logs (Logs tab in dashboard)
# Look for:
# "✅ Binance Stream connected!"
# "✅ Redis Event Bus connected"
# "📡 Market data received: BTCUSDT price=67500"
```

3. **Wait for Signal Detection** (5-15 minutes):
```bash
# Check for signal detection in logs:
# "🐋 Whale detected: 500 ETH moved from Binance"
# "📊 Breakout detected: BTCUSDT broke resistance at $68000"
# "🔥 Viral trend detected: Bitcoin mentions surged 300%"
```

4. **Verify Signal in Database**:
```bash
# Query signals API
curl https://your-railway-url.railway.app/api/signals?limit=10 | jq

# Expected: JSON array with at least 1 signal
```

5. **Test Frontend Display**:
   - Open frontend app
   - Verify signal appears in UI within 1-2 seconds
   - Check signal details (type, severity, confidence, explanation, action)
   - Verify color coding matches severity

#### Success Metrics:
- ✅ Signal detected within 5 minutes of market event
- ✅ Signal persisted in PostgreSQL
- ✅ Signal appeared in frontend UI
- ✅ All fields populated correctly
- ✅ No errors in logs

---

### Scenario 2: Real-Time WebSocket Signal Streaming

**Goal**: Verify WebSocket delivers signals instantly to frontend.

#### Steps:
1. **Open Browser DevTools** (F12)
2. **Navigate to Frontend App**
3. **Check WebSocket Connection**:
   - Go to Network tab → WS (WebSocket filter)
   - Verify connection shows "101 Switching Protocols"
   - Verify status is "Open"

4. **Monitor WebSocket Messages**:
   - In Console tab, log WebSocket messages:
   ```javascript
   const ws = new WebSocket('wss://your-railway-url.railway.app');
   ws.onmessage = (e) => console.log('Signal received:', JSON.parse(e.data));
   ```

5. **Wait for Signal** (or trigger manually):
   - Wait 5-10 minutes for natural signal
   - OR simulate signal in backend (developer mode)

6. **Verify Signal Appears Instantly**:
   - Signal should appear in console immediately
   - Signal should appear in UI within 1 second
   - No page refresh required

#### Success Metrics:
- ✅ WebSocket connection established < 1 second
- ✅ Signal delivered to client < 1 second after detection
- ✅ UI updates without page refresh
- ✅ No connection drops during 10-minute test

---

### Scenario 3: AI Analysis Request Flow

**Goal**: Verify multi-LLM orchestration and RAG system work end-to-end.

#### Prerequisites:
- `OPENAI_API_KEY` set in Railway environment variables

#### Steps:
1. **Request AI Analysis** (via API):
```bash
curl -X POST https://your-railway-url.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "new_token",
    "data": {
      "tokenAddress": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      "chainId": 1,
      "name": "Uniswap",
      "symbol": "UNI"
    }
  }'
```

2. **Monitor Backend Logs**:
   - Look for AI orchestration activity:
   ```
   🤖 AI Analysis requested: new_token
   📚 Building context from crypto knowledge base...
   🧠 Routing to OpenAI (GPT-4) for deep reasoning...
   ✅ AI Analysis completed (8.5s)
   ```

3. **Verify Response**:
```json
{
  "summary": "Uniswap (UNI) is a well-established DeFi protocol...",
  "sentiment": "bullish",
  "confidence": 88,
  "risks": ["Regulatory uncertainty", "Competition from CEXs"],
  "opportunities": ["V4 launch", "Institutional adoption"],
  "reasoning": [
    "Step 1: Analyzed smart contract security (audited by Trail of Bits)",
    "Step 2: Checked liquidity ($500M+ on Uniswap V3)",
    "Step 3: Reviewed social sentiment (positive on Twitter/Reddit)"
  ],
  "timestamp": "2025-10-27T12:34:56.789Z"
}
```

4. **Test Response Validation**:
   - Verify no hallucinations (check `validationScore` in logs)
   - Verify reasoning is logical (step-by-step)
   - Verify confidence score is calibrated (not always 100%)

#### Success Metrics:
- ✅ AI response received < 15 seconds
- ✅ Response includes summary, sentiment, risks, opportunities
- ✅ Reasoning steps are present and logical
- ✅ Confidence score between 50-95% (realistic)
- ✅ No errors in logs

---

### Scenario 4: Notification Delivery (Telegram + Email)

**Goal**: Verify alerts are delivered to users instantly.

#### Prerequisites:
- `TELEGRAM_BOT_TOKEN` set in Railway environment
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` set (optional)

#### Steps:
1. **Subscribe to Telegram Bot**:
   - Open Telegram
   - Search for your bot (e.g., `@CoinetAlertBot`)
   - Send `/start` command
   - Verify bot responds with welcome message

2. **Wait for High-Severity Signal**:
   - Monitor logs for `severity: "critical"` or `severity: "high"` signals
   - OR manually trigger alert in developer mode

3. **Verify Telegram Notification**:
   - Check Telegram for instant message
   - Expected format:
   ```
   🚨 CRITICAL WHALE ALERT

   Whale withdrawal: 500.00 ETH ($1.00M) from Binance
   
   Pattern: accumulation (5 txs in 24h)
   Direction: BULLISH 📈
   Confidence: 85%
   
   Suggested Action: BUY
   
   [View Details]
   ```

4. **Verify Email Notification** (if configured):
   - Check email inbox (may take 10-30 seconds)
   - Expected subject: `🚨 Coinet Alert: WHALE (Critical)`
   - HTML email with formatted signal details

#### Success Metrics:
- ✅ Telegram notification received < 2 seconds
- ✅ Email notification received < 30 seconds
- ✅ Notification format is clear and actionable
- ✅ Links work correctly (e.g., "View Details")
- ✅ No duplicate notifications

---

### Scenario 5: Error Handling & Circuit Breaker

**Goal**: Verify system degrades gracefully when external services fail.

#### Steps:
1. **Simulate Etherscan API Failure**:
   - Temporarily remove `ETHERSCAN_API_KEY` from Railway env vars
   - OR set it to an invalid value
   - Redeploy

2. **Monitor Logs**:
   - Look for circuit breaker activation:
   ```
   ❌ Etherscan API error: 401 Unauthorized
   ⚠️  Circuit breaker opened for Etherscan
   ℹ️  Whale tracking paused (other signals continue)
   ```

3. **Verify Other Signals Still Work**:
```bash
# Check if breakout/social signals still appear
curl https://your-railway-url.railway.app/api/signals?type=breakout
# Expected: Breakout signals still present
```

4. **Restore Service**:
   - Add correct `ETHERSCAN_API_KEY` back to Railway
   - Redeploy

5. **Verify Recovery**:
   - Look for circuit breaker closure:
   ```
   ✅ Etherscan API recovered
   ✅ Circuit breaker closed
   🐋 Whale tracking resumed
   ```

#### Success Metrics:
- ✅ Circuit breaker activates after 3-5 failed API calls
- ✅ Other signals continue working (not affected)
- ✅ No crashes or uncaught exceptions
- ✅ Circuit breaker closes automatically after service recovery
- ✅ Logs clearly indicate degraded state

---

### Scenario 6: Rate Limiting & API Budget Management

**Goal**: Verify rate limiters prevent excessive API usage.

#### Steps:
1. **Simulate High API Call Volume**:
```bash
# Make 100 rapid requests to trigger rate limiter
for i in {1..100}; do
  curl -s https://your-railway-url.railway.app/api/signals > /dev/null &
done
```

2. **Monitor Logs**:
   - Look for rate limiter activation:
   ```
   ⚠️  Rate limit exceeded: 60 requests/minute
   🛑 Request throttled (retry after 30s)
   ```

3. **Verify Response**:
```bash
curl -i https://your-railway-url.railway.app/api/signals
# Expected: 429 Too Many Requests
# Headers: Retry-After: 30
```

4. **Wait and Retry**:
   - Wait 60 seconds
   - Retry request
   - Verify it succeeds

#### Success Metrics:
- ✅ Rate limiter activates after 60 requests/minute (or configured limit)
- ✅ 429 status code returned with `Retry-After` header
- ✅ Requests resume normally after cooldown
- ✅ No crashes or memory leaks

---

### Scenario 7: Database Connection Failure & Recovery

**Goal**: Verify system handles database outages gracefully.

#### Steps:
1. **Simulate PostgreSQL Failure**:
   - In Railway Dashboard, temporarily pause PostgreSQL service
   - OR set `DATABASE_URL` to invalid value

2. **Monitor Backend Logs**:
   - Look for connection error handling:
   ```
   ❌ PostgreSQL connection lost
   ⚠️  Falling back to in-memory storage (signals not persisted)
   ℹ️  Real-time signals still broadcast via WebSocket
   ```

3. **Verify Frontend Still Works**:
   - Check WebSocket still delivers real-time signals
   - `/api/signals` may return empty or cached data

4. **Restore Database**:
   - Resume PostgreSQL service in Railway
   - OR restore correct `DATABASE_URL`

5. **Verify Recovery**:
   - Look for reconnection:
   ```
   ✅ PostgreSQL reconnected
   ✅ Persisting signals to database
   ```

#### Success Metrics:
- ✅ System continues running (no crashes)
- ✅ Real-time signals still work (via WebSocket)
- ✅ Graceful error messages in logs
- ✅ Auto-reconnects when database is restored

---

### Scenario 8: Frontend Reconnection After Network Interruption

**Goal**: Verify WebSocket auto-reconnects after network issues.

#### Steps:
1. **Open Frontend App**
2. **Verify WebSocket Connected** (green "Live" indicator)
3. **Simulate Network Interruption**:
   - Browser DevTools → Network tab → "Offline" checkbox
   - OR temporarily pause Railway backend

4. **Verify Disconnection Handling**:
   - UI should show "Offline" or "Reconnecting..." status
   - No crashes or blank screens

5. **Restore Network**:
   - Uncheck "Offline" in DevTools
   - OR resume Railway backend

6. **Verify Auto-Reconnection**:
   - WebSocket should reconnect within 5 seconds
   - UI should show "Live" status again
   - Signal feed should resume

#### Success Metrics:
- ✅ UI gracefully indicates offline status
- ✅ WebSocket auto-reconnects < 5 seconds after network restored
- ✅ No duplicate signals after reconnection
- ✅ No data loss (historical signals still visible)

---

## 🚀 LOAD TESTING (Optional but Recommended)

### Goal: Verify system handles high signal volume.

#### Tools:
- Apache Bench (`ab`)
- k6 (https://k6.io)
- Artillery (https://www.artillery.io)

#### Test 1: API Load Test
```bash
# Install Apache Bench (usually pre-installed on Mac/Linux)
ab -n 1000 -c 10 https://your-railway-url.railway.app/api/signals

# Expected results:
# - 1000 requests in < 10 seconds
# - 0% failed requests
# - Average response time < 100ms
```

#### Test 2: WebSocket Load Test
```bash
# Install k6
brew install k6  # Mac
# OR download from https://k6.io

# Create test script (websocket-load-test.js)
cat > websocket-load-test.js << 'EOF'
import ws from 'k6/ws';
import { check } from 'k6';

export default function () {
  const url = 'wss://your-railway-url.railway.app';
  
  const res = ws.connect(url, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe', signals: ['whale', 'social', 'breakout'] }));
    });

    socket.on('message', (data) => {
      check(data, { 'signal received': (d) => d.length > 0 });
    });

    socket.setTimeout(() => {
      socket.close();
    }, 60000); // 60 seconds
  });

  check(res, { 'WebSocket connected': (r) => r && r.status === 101 });
}
EOF

# Run load test (50 concurrent WebSocket connections)
k6 run --vus 50 --duration 60s websocket-load-test.js

# Expected results:
# - All connections succeed
# - No dropped connections
# - Signals delivered to all clients
```

#### Success Metrics:
- ✅ API: 1000 req/s with < 100ms average response
- ✅ WebSocket: 100+ concurrent connections stable
- ✅ Memory usage < 1 GB under load
- ✅ CPU usage < 80% under load

---

## 🔒 SECURITY TESTING (Basic)

### Test 1: SQL Injection
```bash
# Try to inject SQL in API parameters
curl "https://your-railway-url.railway.app/api/signals?id=1' OR '1'='1"
# Expected: 400 Bad Request (input validation blocks it)
```

### Test 2: XSS (Cross-Site Scripting)
```bash
# Try to inject script in signal data (via API)
curl -X POST https://your-railway-url.railway.app/api/signals \
  -d '{"explanation": "<script>alert(1)</script>"}' \
  -H "Content-Type: application/json"
# Expected: 400 Bad Request (sanitized)
```

### Test 3: Rate Limiting Bypass
```bash
# Try to bypass rate limiter with different IPs (spoofed headers)
for i in {1..100}; do
  curl -H "X-Forwarded-For: 192.168.1.$i" \
       https://your-railway-url.railway.app/api/signals > /dev/null &
done
# Expected: Rate limiter still activates (not fooled)
```

### Test 4: JWT Token Tampering
```bash
# Try to modify JWT token payload
curl -H "Authorization: Bearer INVALID_TOKEN" \
     https://your-railway-url.railway.app/api/signals
# Expected: 401 Unauthorized
```

#### Success Metrics:
- ✅ All injection attempts blocked
- ✅ XSS scripts sanitized
- ✅ Rate limiter can't be bypassed
- ✅ Invalid tokens rejected

---

## 📊 MONITORING & OBSERVABILITY

### Metrics to Track (During Testing)
1. **Response Times**:
   - API: < 100ms (p95)
   - WebSocket latency: < 50ms
   - AI analysis: < 15s

2. **Error Rates**:
   - API 5xx errors: < 0.1%
   - WebSocket connection failures: < 1%

3. **Resource Usage**:
   - Memory: < 500 MB (idle), < 1 GB (active)
   - CPU: < 30% (idle), < 70% (active)

4. **Signal Quality**:
   - Signal detection latency: < 5 seconds
   - False positive rate: < 20% (user feedback)
   - AI confidence accuracy: ±10% (validation)

### Tools for Monitoring
- **Railway Metrics** (built-in): CPU, memory, network
- **Logs**: Railway Logs tab (real-time streaming)
- **External** (optional):
  - Sentry: Error tracking
  - Grafana: Custom dashboards
  - Uptime Robot: Availability monitoring

---

## ✅ TESTING CHECKLIST

### Pre-Launch Testing
- [ ] Scenario 1: Data ingestion → signal detection → frontend (PASSED)
- [ ] Scenario 2: Real-time WebSocket streaming (PASSED)
- [ ] Scenario 3: AI analysis request flow (PASSED)
- [ ] Scenario 4: Notification delivery (PASSED)
- [ ] Scenario 5: Error handling & circuit breaker (PASSED)
- [ ] Scenario 6: Rate limiting (PASSED)
- [ ] Scenario 7: Database failure recovery (PASSED)
- [ ] Scenario 8: Frontend auto-reconnection (PASSED)

### Load Testing (Optional)
- [ ] API load test: 1000 req/s (PASSED or SKIPPED)
- [ ] WebSocket load test: 100 connections (PASSED or SKIPPED)

### Security Testing (Basic)
- [ ] SQL injection blocked (PASSED)
- [ ] XSS sanitized (PASSED)
- [ ] Rate limiter bypass prevented (PASSED)
- [ ] JWT tampering rejected (PASSED)

### Monitoring Setup
- [ ] Railway metrics enabled
- [ ] Logs streaming to dashboard
- [ ] Error tracking configured (Sentry optional)
- [ ] Uptime monitoring configured (optional)

### Documentation
- [ ] API documentation complete
- [ ] Frontend integration guide complete
- [ ] Environment variables documented
- [ ] Troubleshooting guide complete

---

## 🎉 LAUNCH READINESS CRITERIA

**Your system is ready for production launch when:**
1. ✅ All critical scenarios (1-8) pass successfully
2. ✅ No unhandled errors in 1-hour continuous test
3. ✅ WebSocket connections stable for 1+ hour
4. ✅ AI analysis works for 10+ different queries
5. ✅ Notifications delivered < 2 seconds consistently
6. ✅ Circuit breaker activates/recovers correctly
7. ✅ Frontend auto-reconnects reliably
8. ✅ Logs show no critical warnings

**If all checkboxes are ✅, you're ready to launch Coinet V1! 🚀**

---

## 📞 POST-LAUNCH MONITORING

### First 24 Hours
- [ ] Monitor Railway logs every 2 hours
- [ ] Check for any new error patterns
- [ ] Verify uptime > 99.5%
- [ ] Collect user feedback on signal accuracy

### First Week
- [ ] Daily log review
- [ ] Track API response times
- [ ] Monitor database growth (signals table)
- [ ] Analyze AI token usage (costs)

### First Month
- [ ] Weekly performance review
- [ ] Optimize slow queries (if any)
- [ ] Adjust rate limits based on usage
- [ ] Plan feature improvements based on feedback

---

**Built with ❤️ by the Coinet AI Team**  
**Last Updated**: October 27, 2025  
**Testing Tools**: curl, k6, Apache Bench, Browser DevTools

