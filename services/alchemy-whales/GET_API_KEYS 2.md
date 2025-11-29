# 🔑 How to Get Alchemy API Keys

## Quick Steps

1. **Go to Alchemy Dashboard**: https://dashboard.alchemy.com/
2. **Sign up or Log in**
3. **Create a new app** for each chain you want to monitor:
   - Ethereum Mainnet
   - Polygon
   - Arbitrum
   - Optimism
   - Base
4. **Copy the API Key** from each app
5. **Add to your `.env` file**:

```env
ALCHEMY_API_KEY_ETH=your_actual_ethereum_key_here
ALCHEMY_API_KEY_POLYGON=your_actual_polygon_key_here
ALCHEMY_API_KEY_ARBITRUM=your_actual_arbitrum_key_here
ALCHEMY_API_KEY_OPTIMISM=your_actual_optimism_key_here
ALCHEMY_API_KEY_BASE=your_actual_base_key_here
```

## Free Tier Limits

Alchemy's free tier includes:
- 300M compute units per month
- 100 requests per second
- Perfect for development and testing

## For Testing (Start Without Keys)

If you just want to test the service structure without API keys:

```bash
# Add to .env
REQUIRE_API_KEYS=false
NODE_ENV=development
```

The service will start but won't be able to fetch data from Alchemy.

## Verify Keys Work

After adding keys, restart the service:

```bash
node dist/index.js
```

You should see:
```
✅ Configuration validated successfully
🚀 Alchemy Whales Service is running!
```

