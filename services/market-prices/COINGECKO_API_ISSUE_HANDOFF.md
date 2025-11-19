# 🚨 CoinGecko API Issue - Handoff Document

## 📍 Problem Summary

The CoinGecko API integration has **two critical issues** that prevent it from working:

1. **Rate Limiter Retrying 400 Errors**: The rate limiter is incorrectly retrying 400 Bad Request errors, causing infinite retry loops
2. **CoinGecko API Contradictory Errors**: CoinGecko returns contradictory error messages (says "Pro key" on free endpoint, then "Demo key" on pro endpoint)

## 🔍 Issue #1: Rate Limiter Retrying 400 Errors

### Location
**File**: `/workspaces/coinet-platform/services/market-prices/src/middleware/rateLimiter.ts`  
**Method**: `schedule()` (lines ~69-169)

### Problem
The rate limiter's `schedule()` method is retrying 400 Bad Request errors, which should **never** be retried (they're permanent client errors, not transient failures).

### Evidence from Logs
```
warn: Retrying task for coingecko after error {"attempt":1,"delay":2000,"error":"...400 error...","maxRetries":3}
warn: Retrying task for coingecko after error {"attempt":2,"delay":4000,"error":"...400 error...","maxRetries":3}
warn: Retrying task for coingecko after error {"attempt":3,"delay":8000,"error":"...400 error...","maxRetries":3}
```

### Root Cause
The status code extraction logic in `schedule()` method (lines 92-98) is not correctly identifying 400 errors. The code uses `||` (OR) operator which can fail with falsy values, and the status code from `ProviderError` may not be extracted correctly.

### Attempted Fixes
1. ✅ Added debug logging (but logs never appeared - suggests fix wasn't applied to running code)
2. ✅ Changed `||` to `??` (nullish coalescing) in status code extraction
3. ✅ Added comprehensive error property checking
4. ⚠️ **Issue**: Fixes were made in wrong workspace (`/Users/sebastian/Desktop/Arbeit/Coinet`) instead of `/workspaces/coinet-platform`

### Required Fix
**File**: `/workspaces/coinet-platform/services/market-prices/src/middleware/rateLimiter.ts`

**Lines to replace**: 90-124 (status code extraction and client error check)

**Replace with**:
```typescript
          // Extract status code - check ProviderError.statusCode first, then nested properties
          // ProviderError has statusCode as a direct property
          const statusCode = 
            error.statusCode ??                    // ProviderError.statusCode (most common)
            error.status ??                        // Some errors use 'status' instead
            error.originalError?.statusCode ??    // Nested ProviderError
            error.originalError?.status ??        // Nested error status
            error.response?.status ??              // Axios error response
            error.originalError?.response?.status ?? // Nested Axios error
            undefined;

          // Debug logging to see what we're getting
          logger.warn(`[DEBUG] Error details for ${source}`, {
            statusCode,
            errorType: error.constructor?.name,
            hasStatusCode: !!error.statusCode,
            hasStatus: !!error.status,
            hasOriginalError: !!error.originalError,
            originalErrorStatusCode: error.originalError?.statusCode,
            originalErrorStatus: error.originalError?.status,
            responseStatus: error.response?.status,
            originalResponseStatus: error.originalError?.response?.status,
            errorKeys: Object.keys(error),
            fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          });

          // Don't retry client errors (4xx except 429) - these are permanent failures
          const isClientError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 && statusCode !== 429;
          
          if (isClientError) {
            logger.warn(`Not retrying ${source} - client error ${statusCode} is not retryable`, {
              error: error.message,
              statusCode,
              errorType: error.constructor?.name,
            });
            throw error; // Don't retry, throw immediately
          }
```

**Key Changes**:
- Changed `||` to `??` (nullish coalescing) to properly handle falsy values
- Added comprehensive debug logging
- Explicit check for 400-499 status codes (excluding 429)

---

## 🔍 Issue #2: CoinGecko API Contradictory Error Messages

### Location
**File**: `/workspaces/coinet-platform/services/market-prices/test-api-connection.ts`  
**Function**: `testCoinGeckoAPI()` (lines 85-173)

### Problem
CoinGecko API returns contradictory error messages:
- When calling **free endpoint** (`api.coingecko.com`): Returns error saying "If you are using Pro API key, please change your root URL from api.coingecko.com to pro-api.coingecko.com"
- When calling **pro endpoint** (`pro-api.coingecko.com`): Returns error saying "If you are using Demo API key, please change your root URL from pro-api.coingecko.com to api.coingecko.com"

This creates an **infinite loop** where the code switches endpoints but both fail.

### Evidence from Logs
```
Initial API URL: https://api.coingecko.com/api/v3
error: CoinGecko API error: 400 {"error":"If you are using Pro API key, please change your root URL from api.coingecko.com to pro-api.coingecko.com..."}
⚠️  API says this is a Pro key. Switching to Pro endpoint...
error: CoinGecko API error: 400 {"error":"If you are using Demo API key, please change your root URL from pro-api.coingecko.com to api.coingecko.com..."}
```

### Root Cause
**This is an external API issue** - CoinGecko's API is returning contradictory error messages. The API key appears to be misconfigured on CoinGecko's side, or there's a bug in their error handling.

### Current Implementation
The test script has endpoint switching logic with `maxSwitches = 2` to prevent infinite loops, but it still fails because both endpoints return errors.

### API Key Details
- **API Key**: `CG-KMHRG7f...` (27 characters)
- **Key Format**: Starts with `CG-` (CoinGecko Pro key format)
- **Status**: Unknown - may be invalid, expired, or misconfigured

### Possible Solutions
1. **Verify API Key**: Check if the API key is valid and active in CoinGecko dashboard
2. **Contact CoinGecko Support**: This appears to be an API-side issue
3. **Disable CoinGecko Temporarily**: Use CoinMarketCap as primary until resolved
4. **Try Without API Key**: Test if free tier works without authentication

---

## 📊 Current Status

### What Works
- ✅ CoinMarketCap API key is configured: `d478c01ca7b24e3d81498aee109ad010`
- ✅ CoinMarketCap client code is implemented
- ✅ Test script structure is in place
- ✅ Rate limiter infrastructure exists

### What Doesn't Work
- ❌ CoinGecko API connection (400 errors on both endpoints)
- ❌ Rate limiter correctly identifying 400 errors (still retrying them)
- ❌ CoinMarketCap test never runs (because CoinGecko test fails first)

### Test Script Issue
**File**: `/workspaces/coinet-platform/services/market-prices/test-api-connection.ts`

The `runTests()` function (line 217) needs to be updated to continue testing CoinMarketCap even if CoinGecko fails. A fix was attempted but may not have been applied to the correct workspace.

**Required Change**: Wrap `testCoinGeckoAPI()` in try-catch so CoinMarketCap test always runs.

---

## 🛠️ Quick Fix Commands

### Fix Rate Limiter (Issue #1)
```bash
cd /workspaces/coinet-platform/services/market-prices
# Open src/middleware/rateLimiter.ts
# Replace lines 90-124 with the code above
```

### Fix Test Script (to test CoinMarketCap)
```bash
cd /workspaces/coinet-platform/services/market-prices
# Open test-api-connection.ts
# Wrap testCoinGeckoAPI() in try-catch in runTests() function
```

### Verify Fixes Applied
```bash
cd /workspaces/coinet-platform/services/market-prices
grep -n "\[DEBUG\] Error details" src/middleware/rateLimiter.ts
grep -n "CoinGecko test failed, continuing" test-api-connection.ts
```

---

## 📝 Files Involved

1. **`src/middleware/rateLimiter.ts`** - Rate limiting logic (needs fix)
2. **`test-api-connection.ts`** - API connection test script (needs fix)
3. **`src/providers/coingecko-rest.ts`** - CoinGecko REST client (working, but API returns errors)
4. **`src/providers/coinmarketcap-rest.ts`** - CoinMarketCap REST client (should work, untested)

---

## 🎯 Next Steps for Next Agent

1. **Apply Rate Limiter Fix**: Update `/workspaces/coinet-platform/services/market-prices/src/middleware/rateLimiter.ts` with the code above
2. **Fix Test Script**: Update `test-api-connection.ts` to continue testing CoinMarketCap even if CoinGecko fails
3. **Test CoinMarketCap**: Verify CoinMarketCap API works independently
4. **Investigate CoinGecko API Key**: Check if API key is valid/active
5. **Consider Disabling CoinGecko**: Add feature flag to disable CoinGecko temporarily

---

## 🔗 Related Documentation

- `HANDOFF_DOCUMENT.md` - Original handoff document
- `QUICK_FIX_GUIDE.md` - Quick fix instructions
- `RATE_LIMITER_FIX.md` - Rate limiter fix details
- `APPLY_FIX_COMMANDS.md` - Commands to apply fixes

---

## ⚠️ Important Notes

- **Workspace Path**: Always use `/workspaces/coinet-platform` NOT `/Users/sebastian/Desktop/Arbeit/Coinet`
- **CoinMarketCap API Key**: Already configured and should work
- **CoinGecko API Key**: May be invalid or misconfigured (external issue)
- **Rate Limiter**: Fix is ready but needs to be applied to correct workspace

---

**Last Updated**: 2025-11-08  
**Status**: Blocked - Needs fixes applied to correct workspace

