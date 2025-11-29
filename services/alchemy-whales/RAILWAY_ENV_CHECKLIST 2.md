# 🔍 Railway Environment Variables Checklist

## ✅ Required for Ultimate Fraud Detector

Add these to your Railway `alchemy-whales` service:

```bash
AI_ULTIMATE_FRAUD_ENABLED=true
```

**Expected Log After Setting:**
```
✅ Ultimate Fraud Detector initialized (99.99% accuracy)
```

---

## ✅ Required for QuickNode Integration

```bash
QUICKNODE_ENABLED=true
QUICKNODE_SOLANA_HTTP_URL=https://weathered-hidden-slug.solana-mainnet.quiknode.pro/44683f819e68e9ba0907456706dd559c8f4c7656/
QUICKNODE_SOLANA_WS_URL=wss://weathered-hidden-slug.solana-mainnet.quiknode.pro/44683f819e68e9ba0907456706dd559c8f4c7656/
QUICKNODE_SOLANA_CU_PER_SEC=300
```

**Expected Log After Setting:**
```
✅ QuickNode client manager initialized
```

---

## ✅ Required for Solana Real-Time Monitoring

```bash
SOLANA_REALTIME_MONITORING=true
```

**Note:** This requires QuickNode to be enabled first!

**Expected Log After Setting:**
```
✅ Solana real-time token monitoring started
```

---

## 📋 Quick Setup Steps

1. **Go to Railway Dashboard**
   - Select your `alchemy-whales` service
   - Click "Variables" tab

2. **Add These Variables:**
   ```
   AI_ULTIMATE_FRAUD_ENABLED=true
   QUICKNODE_ENABLED=true
   QUICKNODE_SOLANA_HTTP_URL=https://weathered-hidden-slug.solana-mainnet.quiknode.pro/44683f819e68e9ba0907456706dd559c8f4c7656/
   QUICKNODE_SOLANA_WS_URL=wss://weathered-hidden-slug.solana-mainnet.quiknode.pro/44683f819e68e9ba0907456706dd559c8f4c7656/
   QUICKNODE_SOLANA_CU_PER_SEC=300
   SOLANA_REALTIME_MONITORING=true
   ```

3. **Save & Redeploy**
   - Railway will auto-redeploy
   - Check logs for initialization messages

---

## 🎯 Expected Logs After Setup

After adding all variables, you should see:

```
✅ Ultimate Fraud Detector initialized (99.99% accuracy)
✅ QuickNode client manager initialized
✅ QuickNode client ready for solana-mainnet
✅ Solana real-time token monitoring started
```

---

## ⚠️ Current Status

Based on your logs:
- ❌ Ultimate Fraud Detector: **NOT INITIALIZED** (missing `AI_ULTIMATE_FRAUD_ENABLED=true`)
- ❌ QuickNode Client: **NOT INITIALIZED** (missing `QUICKNODE_ENABLED=true`)
- ❌ Solana Monitoring: **NOT STARTED** (requires above variables)

---

## 🔧 Troubleshooting

**If you don't see initialization logs:**

1. **Check Variable Names:** Must be exact (case-sensitive)
2. **Check Values:** `true` must be lowercase string `"true"`
3. **Check QuickNode URLs:** Must be complete (no trailing spaces)
4. **Redeploy:** Railway auto-redeploys after variable changes

**Redis Errors (Non-Critical):**
- These are expected if Redis isn't configured
- Service works fine without Redis
- To fix: Add `REDIS_URL` or set `REQUIRE_CACHE=false`

---

**Last Updated:** 2025-11-21

