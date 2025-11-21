# 🚀 Solana QuickNode Setup - Complete Guide

## ✅ Your Solana Endpoint is Ready!

You've successfully created your Solana Mainnet Beta endpoint. Here's how to configure it:

## 📝 Add to .env File

Add these lines to your `services/alchemy-whales/.env` file:

```bash
# ========================================
# QuickNode Solana Configuration
# ========================================
QUICKNODE_ENABLED=true

# Solana Mainnet Beta
QUICKNODE_SOLANA_HTTP_URL=https://weathered-hidden-slug.solana-mainnet.quiknode.pro/44683f819e68e9ba0907456706dd559c8f4c7656/
QUICKNODE_SOLANA_WS_URL=wss://weathered-hidden-slug.solana-mainnet.quiknode.pro/44683f819e68e9ba0907456706dd559c8f4c7656/
QUICKNODE_SOLANA_CU_PER_SEC=300
```

## 🔧 Quick Setup Commands

### In Codespace:

```bash
# 1. Navigate to service directory
cd services/alchemy-whales

# 2. Edit .env file
code .env
# OR
nano .env

# 3. Add the Solana configuration above

# 4. Save and exit

# 5. Test the configuration
npm run example:quicknode
```

## ✅ Verify Configuration

After adding to .env, verify it's loaded:

```bash
# Check environment variables are loaded
cat .env | grep SOLANA

# Should show:
# QUICKNODE_SOLANA_HTTP_URL=https://weathered-hidden-slug...
# QUICKNODE_SOLANA_WS_URL=wss://weathered-hidden-slug...
# QUICKNODE_SOLANA_CU_PER_SEC=300
```

## 🎯 Next Steps

### 1. Enable QuickNode Addons (Recommended)

Go back to QuickNode dashboard and enable:
- ✅ **Pump Fun API** (FREE) - For memecoin detection
- ✅ **Solana Token Price & Liquidity Pools API** (FREE) - For price tracking
- ✅ **Metis Jupiter Swap API** (FREE) - For swap monitoring

### 2. Test Your Setup

```bash
# Run examples to test Solana integration
npm run example:quicknode

# Should now show Solana examples running (not skipping)
```

### 3. Add Ethereum (Optional but Recommended)

For whale tracking, also add Ethereum:
- Create Ethereum endpoint in QuickNode
- Add to .env:
  ```bash
  QUICKNODE_ETH_HTTP_URL=https://your-ethereum-endpoint.quiknode.pro/xxxxx/
  QUICKNODE_ETH_CU_PER_SEC=300
  ```

## 🔐 Security Notes

⚠️ **Important**: 
- Your endpoint URL contains authentication tokens
- Never commit `.env` file to git (already in .gitignore)
- Keep your endpoint URL secure
- If exposed, regenerate endpoint in QuickNode dashboard

## 📊 What You Can Do Now

With Solana configured, you can:

1. **Detect Memecoins** - Track new token launches on Pump.fun
2. **Monitor Prices** - Real-time Solana token prices
3. **Track Liquidity** - Monitor liquidity pools
4. **Viral Trends** - Catch memecoins before they pump
5. **Whale Activity** - Track large Solana transactions

## 🎉 You're Ready!

Your Solana QuickNode endpoint is configured. The examples will now work with real Solana data!

---

**Next**: Enable Pump Fun API addon for memecoin detection! 🚀

