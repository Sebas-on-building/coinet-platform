# CoinGecko API Endpoint Detection Fix

## Problem

The test script was incorrectly detecting which endpoint to use based on CoinGecko's error messages. CoinGecko's error messages are misleading:

- When using a **Demo key on the free endpoint**, CoinGecko returns: *"If you are using Pro API key, please change your root URL from api.coingecko.com to pro-api.coingecko.com"*
- When using a **Demo key on the pro endpoint**, CoinGecko returns: *"If you are using Demo API key, please change your root URL from pro-api.coingecko.com to api.coingecko.com"*

The old code was looking for "Pro API key" or "Demo API key" in the error message, which caused it to:
1. Start with free endpoint
2. See "Pro API key" in error → incorrectly switch to pro endpoint
3. See "Demo API key" in error → incorrectly switch back to free endpoint
4. Create an infinite loop

## Solution

Instead of detecting the key type mentioned in the error, we now detect **which endpoint CoinGecko says you're currently using** by looking for:
- `"from api.coingecko.com"` → currently on free endpoint, switch to pro
- `"from pro-api.coingecko.com"` → currently on pro endpoint, switch to free

## Implementation

The fix is in `test-api-connection.ts`:

```typescript
function detectCurrentEndpoint(errorMessage: string): 'free' | 'pro' | null {
  // CoinGecko error messages mention which endpoint you're currently using
  // Look for "from api.coingecko.com" (free) or "from pro-api.coingecko.com" (pro)
  if (errorMessage.includes('from api.coingecko.com')) {
    return 'free';
  }
  if (errorMessage.includes('from pro-api.coingecko.com')) {
    return 'pro';
  }
  return null;
}
```

## Testing

Run the test script:

```bash
cd services/market-prices
npx tsx test-api-connection.ts
```

The script will:
1. Start with the free endpoint
2. If it gets an error saying "from api.coingecko.com", switch to pro endpoint
3. If it gets an error saying "from pro-api.coingecko.com", switch to free endpoint
4. Successfully connect to the correct endpoint

## Files Changed

- `services/market-prices/test-api-connection.ts` - Fixed endpoint detection logic

## Key Insight

**Always detect what CoinGecko says you're CURRENTLY using, not what key type it thinks you have.**

The error message format is:
- `"If you are using [KEY TYPE], please change your root URL from [CURRENT ENDPOINT] to [CORRECT ENDPOINT]"`

We detect `[CURRENT ENDPOINT]` and switch to `[CORRECT ENDPOINT]`.

