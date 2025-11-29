# 🔐 Railway Environment Variables - QuickNode Integration

## ✅ Quick Setup Guide

### Minimum Required Variables

For basic operation with Solana memecoin detection:

```bash
# QuickNode Solana (REQUIRED for memecoin detection)
QUICKNODE_ENABLED=true
QUICKNODE_SOLANA_HTTP_URL=https://your-solana-endpoint.quiknode.pro/xxxxx/
QUICKNODE_SOLANA_WS_URL=wss://your-solana-endpoint.quiknode.pro/xxxxx/
QUICKNODE_SOLANA_CU_PER_SEC=300

# Alchemy (REQUIRED for whale tracking)
ALCHEMY_API_KEY_ETH=your_ethereum_key
ALCHEMY_API_KEY_POLYGON=your_polygon_key
ALCHEMY_API_KEY_ARBITRUM=your_arbitrum_key
ALCHEMY_API_KEY_OPTIMISM=your_optimism_key
ALCHEMY_API_KEY_BASE=your_base_key

# Database (REQUIRED)
DATABASE_HOST=your_postgres_host
DATABASE_PORT=5432
DATABASE_NAME=coinet_whales
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_SSL=true

# Redis (OPTIONAL but recommended)
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Webhook (REQUIRED)
WEBHOOK_SECRET=your_secure_random_secret

# Environment
NODE_ENV=production
```

---

## 📋 Complete Variable List

### QuickNode Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `QUICKNODE_ENABLED` | ✅ Yes | Enable QuickNode integration | `true` |
| `QUICKNODE_SOLANA_HTTP_URL` | ✅ Yes | Solana HTTP endpoint | `https://xxx.quiknode.pro/xxxxx/` |
| `QUICKNODE_SOLANA_WS_URL` | ⚪ Optional | Solana WebSocket endpoint | `wss://xxx.quiknode.pro/xxxxx/` |
| `QUICKNODE_SOLANA_CU_PER_SEC` | ⚪ Optional | Solana compute units/sec | `300` |
| `QUICKNODE_ETH_HTTP_URL` | ⚪ Optional | Ethereum HTTP endpoint | `https://xxx.quiknode.pro/xxxxx/` |
| `QUICKNODE_ETH_WS_URL` | ⚪ Optional | Ethereum WebSocket endpoint | `wss://xxx.quiknode.pro/xxxxx/` |
| `QUICKNODE_ETH_CU_PER_SEC` | ⚪ Optional | Ethereum compute units/sec | `300` |
| `QUICKNODE_DEFAULT_CU_PER_SEC` | ⚪ Optional | Default CU/sec for all chains | `300` |

### Alchemy Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `ALCHEMY_API_KEY_ETH` | ✅ Yes | Ethereum API key |
| `ALCHEMY_API_KEY_POLYGON` | ✅ Yes | Polygon API key |
| `ALCHEMY_API_KEY_ARBITRUM` | ✅ Yes | Arbitrum API key |
| `ALCHEMY_API_KEY_OPTIMISM` | ✅ Yes | Optimism API key |
| `ALCHEMY_API_KEY_BASE` | ✅ Yes | Base API key |

### Provider Orchestration

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_PROVIDER` | `alchemy` | Primary provider (`alchemy` or `quicknode`) |
| `ENABLE_LOAD_BALANCING` | `true` | Enable load balancing between providers |
| `ENABLE_FALLBACK` | `true` | Enable automatic fallback |
| `QUOTA_AWARE_ROUTING` | `true` | Route based on quota utilization |

### Cross-Validation

| Variable | Default | Description |
|----------|---------|-------------|
| `CROSS_VALIDATION_ENABLED` | `true` | Enable cross-validation |
| `CROSS_VALIDATION_THRESHOLD_USD` | `100000` | Validate transfers > $100K |
| `CROSS_VALIDATION_MAX_DISCREPANCY` | `5` | Max 5% difference allowed |
| `CROSS_VALIDATION_MIN_CONFIDENCE` | `85` | Minimum 85% confidence |

---

## 🚀 How to Add Variables in Railway

### Method 1: Railway Dashboard (Recommended)

1. Go to https://railway.app/dashboard
2. Select your project → `alchemy-whales` service
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add each variable:
   - **Name**: `QUICKNODE_SOLANA_HTTP_URL`
   - **Value**: `https://your-endpoint.quiknode.pro/xxxxx/`
6. Click **Add**
7. Repeat for all variables

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
cd services/alchemy-whales
railway link

# Set variables
railway variables set QUICKNODE_ENABLED=true
railway variables set QUICKNODE_SOLANA_HTTP_URL=https://your-endpoint.quiknode.pro/xxxxx/
railway variables set QUICKNODE_SOLANA_WS_URL=wss://your-endpoint.quiknode.pro/xxxxx/
railway variables set QUICKNODE_SOLANA_CU_PER_SEC=300
```

---

## 🔐 Security Best Practices

### ✅ DO:
- ✅ Use Railway's **Variables** tab (encrypted at rest)
- ✅ Use strong, random secrets for `WEBHOOK_SECRET`
- ✅ Rotate API keys regularly
- ✅ Use different keys for production vs development
- ✅ Enable `REQUIRE_API_KEYS=true` in production

### ❌ DON'T:
- ❌ Commit `.env` files to git
- ❌ Share API keys in chat/email
- ❌ Use the same keys across environments
- ❌ Hardcode secrets in code

---

## 📊 Priority Order

### Phase 1: Essential (Deploy Now)
```bash
QUICKNODE_ENABLED=true
QUICKNODE_SOLANA_HTTP_URL=...
ALCHEMY_API_KEY_ETH=...
DATABASE_HOST=...
WEBHOOK_SECRET=...
NODE_ENV=production
```

### Phase 2: Recommended (Add Soon)
```bash
QUICKNODE_SOLANA_WS_URL=...
REDIS_HOST=...
ENABLE_LOAD_BALANCING=true
ENABLE_FALLBACK=true
```

### Phase 3: Optional (Add Later)
```bash
QUICKNODE_ETH_HTTP_URL=...
QUICKNODE_POLYGON_HTTP_URL=...
CROSS_VALIDATION_ENABLED=true
QUOTA_AWARE_ROUTING=true
```

---

## ✅ Verification

After adding variables, verify they're loaded:

```bash
# In Railway logs, you should see:
✅ QuickNode client initialized for solana-mainnet
✅ Alchemy client manager initialized
✅ Rate limiter manager initialized
```

---

## 🆘 Troubleshooting

### Variables Not Loading?
- Check variable names match exactly (case-sensitive)
- Ensure no extra spaces in values
- Verify Railway service is linked correctly

### QuickNode Not Working?
- Verify `QUICKNODE_ENABLED=true`
- Check endpoint URL is complete (includes trailing `/`)
- Ensure endpoint doesn't contain `your-` placeholder

### Missing Variables?
- Check Railway → Variables tab
- Verify all required variables are set
- Check logs for specific missing variable errors

---

**Last Updated**: November 2024  
**Service**: `alchemy-whales`  
**Integration**: QuickNode + Solana

