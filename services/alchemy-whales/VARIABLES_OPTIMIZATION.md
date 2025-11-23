# 🔧 Variables Optimization Guide

**Date:** 2025-11-22  
**Status:** Variables need optimization

---

## 📊 Current Variable Distribution

### `alchemy-whales` Service (15 variables) ✅

**Has:**
- ✅ `AI_ULTIMATE_FRAUD_ENABLED`
- ✅ `ALERT_ON_CRITICAL`
- ✅ `ALERT_ON_HIGH_POTENTIAL`
- ✅ `ALERT_ON_HIGH_RISK`
- ✅ `ALERT_ON_NEW_TOKEN`
- ✅ `MAX_ALERTS_PER_HOUR`
- ✅ `MIN_ALERT_INTERVAL_SECONDS`
- ✅ `QUICKNODE_ENABLED`
- ✅ `QUICKNODE_SOLANA_CU_PER_SEC`
- ✅ `QUICKNODE_SOLANA_HTTP_URL`
- ✅ `QUICKNODE_SOLANA_WS_URL`
- ✅ `SOLANA_REALTIME_MONITORING`
- ✅ `TELEGRAM_BOT_TOKEN`
- ✅ `TELEGRAM_CHAT_ID`
- ✅ `TELEGRAM_ENABLED`

**Status:** ✅ **COMPLETE** - Has all needed variables!

---

### `ai-data-feeder` Service (64 variables)

**Has:**
- ✅ All AI variables (AI_*)
- ✅ All Alchemy API keys (ALCHEMY_API_KEY_*)
- ✅ Alert variables (ALERT_ON_*)
- ✅ CryptoPanic variables (CRYPTOPANIC_*)
- ✅ QuickNode variables (QUICKNODE_*)
- ✅ Solana variables (SOLANA_*)
- ✅ Telegram variables (TELEGRAM_*)
- ✅ Threshold variables (FRAUD_RISK_THRESHOLD, HIGH_POTENTIAL_THRESHOLD)
- ✅ Whale tracking variables (WHALE_THRESHOLD_USD, etc.)

**Status:** ✅ **COMPLETE** - Has all needed variables!

---

### `coinet-platform` Service (0 variables)

**Has:**
- ❌ No variables (just Railway defaults)

**Status:** ⚠️ **EMPTY** - No variables needed (or not configured)

---

## 🔍 Analysis: Variable Duplication

### Variables in BOTH Services:

**Shared Variables (should be shared):**
- `AI_ULTIMATE_FRAUD_ENABLED` (in both)
- `ALERT_ON_CRITICAL` (in both)
- `ALERT_ON_HIGH_POTENTIAL` (in both)
- `ALERT_ON_HIGH_RISK` (in both)
- `ALERT_ON_NEW_TOKEN` (in both)
- `MAX_ALERTS_PER_HOUR` (in both)
- `MIN_ALERT_INTERVAL_SECONDS` (in both)
- `QUICKNODE_ENABLED` (in both)
- `QUICKNODE_SOLANA_CU_PER_SEC` (in both)
- `QUICKNODE_SOLANA_HTTP_URL` (in both)
- `QUICKNODE_SOLANA_WS_URL` (in both)
- `SOLANA_REALTIME_MONITORING` (in both)
- `TELEGRAM_BOT_TOKEN` (in both)
- `TELEGRAM_CHAT_ID` (in both)
- `TELEGRAM_ENABLED` (in both)

**These should be SHARED VARIABLES!**

---

## ✅ Recommended Actions

### Option 1: Use Shared Variables (Recommended)

**Benefits:**
- ✅ Update once, applies everywhere
- ✅ No duplication
- ✅ Easier to manage
- ✅ Prevents inconsistencies

**Steps:**

1. **Go to:** Railway Dashboard > **Project Settings** > **Shared Variables**

2. **Promote these variables to shared:**
   - `AI_ULTIMATE_FRAUD_ENABLED`
   - `ALERT_ON_CRITICAL`
   - `ALERT_ON_HIGH_POTENTIAL`
   - `ALERT_ON_HIGH_RISK`
   - `ALERT_ON_NEW_TOKEN`
   - `MAX_ALERTS_PER_HOUR`
   - `MIN_ALERT_INTERVAL_SECONDS`
   - `QUICKNODE_ENABLED`
   - `QUICKNODE_SOLANA_CU_PER_SEC`
   - `QUICKNODE_SOLANA_HTTP_URL`
   - `QUICKNODE_SOLANA_WS_URL`
   - `SOLANA_REALTIME_MONITORING`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `TELEGRAM_ENABLED`

3. **How to promote:**
   - Go to service variables
   - Click **⋮** (three dots) next to variable
   - Select **"Promote to Shared Variable"**
   - Repeat for all shared variables

---

### Option 2: Keep Service-Specific Variables (Current Setup)

**If you prefer service-specific variables:**

**Keep as-is:**
- ✅ `alchemy-whales` has its 15 variables (complete)
- ✅ `ai-data-feeder` has its 64 variables (complete)
- ✅ Both services work independently

**No changes needed** - Current setup works fine!

---

## 🎯 Variables That Should Be Service-Specific

### `alchemy-whales` Only Needs:
- ✅ All current 15 variables (already have them)

### `ai-data-feeder` Only Needs:
- ✅ AI variables (AI_*)
- ✅ CryptoPanic variables (CRYPTOPANIC_*)
- ✅ Alchemy API keys (if used by this service)
- ✅ Tracked coins (TRACKED_COINS)

### Variables That Can Be Shared:
- ✅ QuickNode variables (QUICKNODE_*)
- ✅ Solana variables (SOLANA_*)
- ✅ Telegram variables (TELEGRAM_*)
- ✅ Alert variables (ALERT_ON_*)
- ✅ AI Ultimate Fraud (AI_ULTIMATE_FRAUD_ENABLED)

---

## 📋 Missing Variables Check

### `alchemy-whales` Missing Variables:

**Optional (not critical):**
- ❌ `FRAUD_RISK_THRESHOLD` (has defaults in code)
- ❌ `HIGH_POTENTIAL_THRESHOLD` (has defaults in code)
- ❌ `SOLANA_MIN_LIQUIDITY_USD` (has defaults in code)
- ❌ `SOLANA_MAX_TOKEN_AGE_SECONDS` (has defaults in code)
- ❌ `SOLANA_BLOCK_CHECK_INTERVAL_MS` (has defaults in code)

**These have defaults in code, so not required.**

---

## ✅ Current Status Summary

### `alchemy-whales` Service:
- ✅ **Status:** COMPLETE
- ✅ **Variables:** All 15 needed variables present
- ✅ **Action:** No changes needed (or promote to shared)

### `ai-data-feeder` Service:
- ✅ **Status:** COMPLETE
- ✅ **Variables:** All 64 needed variables present
- ✅ **Action:** No changes needed (or promote duplicates to shared)

### `coinet-platform` Service:
- ⚠️ **Status:** EMPTY
- ⚠️ **Variables:** None (may not need any)
- ✅ **Action:** Leave as-is (unless this service needs variables)

---

## 🚀 Recommended Next Steps

### Step 1: Promote Duplicate Variables to Shared (Optional)

**If you want cleaner management:**

1. Go to Railway > Project Settings > Shared Variables
2. Promote duplicate variables (listed above)
3. Both services will use shared values
4. Update once, applies everywhere

### Step 2: Verify Services Are Working

**Check logs:**
- Railway > `alchemy-whales` > Logs
- Railway > `ai-data-feeder` > Logs
- Verify both are running correctly

### Step 3: Add Missing Optional Variables (If Needed)

**For `alchemy-whales`, optionally add:**
```bash
FRAUD_RISK_THRESHOLD=60
HIGH_POTENTIAL_THRESHOLD=80
SOLANA_MIN_LIQUIDITY_USD=10000
SOLANA_MAX_TOKEN_AGE_SECONDS=60
SOLANA_BLOCK_CHECK_INTERVAL_MS=400
```

**These have defaults, so only add if you want custom values.**

---

## 📊 Variable Summary

| Service | Variables | Status | Action |
|---------|-----------|--------|--------|
| `alchemy-whales` | 15 | ✅ Complete | None needed |
| `ai-data-feeder` | 64 | ✅ Complete | None needed |
| `coinet-platform` | 0 | ⚠️ Empty | Leave as-is |

---

## ✅ Conclusion

**Current Setup:**
- ✅ Both services have all needed variables
- ✅ Both services are correctly configured
- ✅ No critical variables missing

**Optional Improvements:**
- 🔄 Promote duplicate variables to shared (cleaner management)
- ➕ Add optional threshold variables to `alchemy-whales` (if custom values needed)

**Status:** ✅ **NO CHANGES REQUIRED** - Everything is working!

---

**Recommendation:** Keep current setup, or promote duplicates to shared variables for easier management.

