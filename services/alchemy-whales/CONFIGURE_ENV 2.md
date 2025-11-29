# 🔧 Configure Environment Variables

## Quick Setup Guide

### Step 1: Create/Edit .env File

```bash
# In Codespace, navigate to the service directory
cd services/alchemy-whales

# Create .env file from example (if it doesn't exist)
cp docs/QUICKNODE_ENV_EXAMPLE.txt .env

# Or edit existing .env file
code .env
```

### Step 2: Add Your API Keys

Edit the `.env` file and replace the placeholder values:

#### For Alchemy:
```bash
ALCHEMY_API_KEY_ETH=your_real_alchemy_key_here
ALCHEMY_API_KEY_POLYGON=your_polygon_key_here
ALCHEMY_API_KEY_ARBITRUM=your_arbitrum_key_here
ALCHEMY_API_KEY_OPTIMISM=your_optimism_key_here
ALCHEMY_API_KEY_BASE=your_base_key_here
```

#### For QuickNode:
```bash
QUICKNODE_ENABLED=true
QUICKNODE_ETH_HTTP_URL=https://your-endpoint.quiknode.pro/xxxxx/
QUICKNODE_ETH_CU_PER_SEC=300
QUICKNODE_POLYGON_HTTP_URL=https://your-polygon-endpoint.quiknode.pro/xxxxx/
QUICKNODE_POLYGON_CU_PER_SEC=300
# ... add other chains as needed
```

### Step 3: Verify Configuration

```bash
# Check that .env file exists and has your keys
cat .env | grep -E "(ALCHEMY|QUICKNODE)" | head -10

# Run examples to test
npm run example:quicknode
```

## Getting API Keys

### Alchemy API Keys
1. Sign up at https://www.alchemy.com/
2. Create apps for each chain (Ethereum, Polygon, Arbitrum, Optimism, Base)
3. Copy API keys from dashboard
4. Add to `.env` file

### QuickNode API Keys
1. Sign up at https://www.quicknode.com/
2. Create endpoints for desired chains
3. Copy HTTP URLs from dashboard
4. Note your compute units per second (CU/sec) from your plan
5. Add to `.env` file

## Environment Variable Reference

See `docs/QUICKNODE_ENV_EXAMPLE.txt` for complete list of all available environment variables.

## Security Notes

⚠️ **Never commit `.env` file to git!**

The `.env` file is already in `.gitignore` and will not be committed. Keep your API keys secure.

## Testing Configuration

After configuring, test with:

```bash
# Run examples
npm run example:quicknode

# Or build and start service
npm run build
npm start
```

## Troubleshooting

### Examples skip with "endpoints not configured"
- Check that `QUICKNODE_ENABLED=true` is set
- Verify endpoint URLs don't contain "your-" placeholder
- Ensure URLs are complete (include trailing slash)

### "No Alchemy client available"
- Verify Alchemy API keys are set correctly
- Check that keys don't contain "demo-key" or "your_" placeholder
- Ensure `REQUIRE_API_KEYS=false` for development

### Redis connection errors
- Redis is optional for examples
- Set `REDIS_HOST` and `REDIS_PORT` if using Redis
- Examples will work without Redis (some features disabled)

