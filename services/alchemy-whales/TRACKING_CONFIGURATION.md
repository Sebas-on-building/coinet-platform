# 🎯 Address Tracking & Filter Configuration Guide

## Overview

This guide shows you how to configure which addresses to track and what filters to use for whale detection and memecoin monitoring.

---

## 📊 Part 1: Whale Thresholds (Automatic Detection)

### How It Works

The service automatically detects whale transactions based on USD value thresholds. You don't need to specify addresses - it finds them automatically!

### Configuration (Railway Variables)

| Name | Value | Description |
|------|-------|-------------|
| `WHALE_THRESHOLD_USD` | `100000` | Transactions > $100K trigger alerts |
| `LARGE_WHALE_THRESHOLD_USD` | `1000000` | Transactions > $1M are "large whales" |
| `MEGA_WHALE_THRESHOLD_USD` | `10000000` | Transactions > $10M are "mega whales" |

### Example Configuration

```bash
# Add to Railway → alchemy-whales → Variables

WHALE_THRESHOLD_USD=100000          # $100K+ transactions
LARGE_WHALE_THRESHOLD_USD=1000000   # $1M+ transactions  
MEGA_WHALE_THRESHOLD_USD=10000000   # $10M+ transactions
```

### What Gets Tracked Automatically

- ✅ Any transaction > $100K (whale)
- ✅ Any transaction > $1M (large whale)
- ✅ Any transaction > $10M (mega whale)
- ✅ Both sender and receiver addresses
- ✅ All chains (Ethereum, Polygon, Arbitrum, Optimism, Base)

---

## 🎯 Part 2: Specific Address Tracking

### Known Whale Addresses to Track

Here are some famous whale addresses you might want to monitor:

#### Ethereum Whales

```bash
# Vitalik Buterin (Ethereum Founder)
TRACK_ADDRESS_ETH_1=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# Binance Hot Wallet
TRACK_ADDRESS_ETH_2=0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE

# Coinbase Hot Wallet
TRACK_ADDRESS_ETH_3=0x71660c4005BA85c37ccec55d0C4493E66Fe775d3

# FTX Exchange (if still active)
TRACK_ADDRESS_ETH_4=0x2FAF487A4414Fe77e2327C0qv

# Tether Treasury
TRACK_ADDRESS_ETH_5=0x5754284f345afc66a98fbB0a0Afe71e0F007B949
```

#### Solana Whales (for Memecoin Detection)

```bash
# Known Solana whale addresses
TRACK_ADDRESS_SOL_1=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
TRACK_ADDRESS_SOL_2=GjJyeC1rB1pDvFqFMjJjGdJvKZvKZvKZvKZvKZvKZvKZvK
```

### How to Add Address Tracking

**Option 1: Via Database (Recommended)**

The service stores tracked addresses in the `whale_profiles` table. Addresses are automatically added when they make whale transactions.

**Option 2: Via Environment Variables**

Create a configuration file or add to Railway:

```bash
# Comma-separated list of addresses to track
TRACKED_ADDRESSES_ETH=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045,0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE
TRACKED_ADDRESSES_POLYGON=0x...
TRACKED_ADDRESSES_ARBITRUM=0x...
```

---

## 🔍 Part 3: Filter Configuration

### Transfer Category Filters

Filter by transaction type:

| Filter | Description | Example |
|--------|-------------|---------|
| `EXTERNAL` | Regular transfers | ETH/USDT transfers |
| `INTERNAL` | Contract calls | DEX swaps, DeFi interactions |
| `ERC20` | Token transfers | USDT, USDC transfers |
| `ERC721` | NFT transfers | NFT sales |
| `ERC1155` | Multi-token transfers | Gaming NFTs |

### Configuration

```bash
# Only track ERC20 token transfers (ignore NFTs)
FILTER_CATEGORIES=EXTERNAL,ERC20

# Track everything except internal calls
FILTER_CATEGORIES=EXTERNAL,ERC20,ERC721,ERC1155

# Only track NFT sales
FILTER_CATEGORIES=ERC721,ERC1155
```

### Value Filters

```bash
# Minimum transaction value (USD)
MIN_TRANSACTION_VALUE_USD=50000    # Only track $50K+ transactions

# Maximum transaction value (USD)  
MAX_TRANSACTION_VALUE_USD=100000000 # Ignore transactions > $100M
```

### Address Filters

```bash
# Exclude specific addresses (e.g., known exchanges)
EXCLUDE_ADDRESSES=0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE,0x71660c4005BA85c37ccec55d0C4493E66Fe775d3

# Only track specific addresses
INCLUDE_ADDRESSES_ONLY=true
TRACKED_ADDRESSES=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

---

## 🚀 Part 4: Memecoin Detection (Solana)

### Pump.fun Token Detection

For Solana memecoin detection, configure filters for new token launches:

```bash
# Solana Memecoin Filters
SOLANA_TRACK_NEW_TOKENS=true
SOLANA_MIN_LIQUIDITY_USD=10000      # Minimum liquidity to track
SOLANA_MAX_TOKEN_AGE_HOURS=24       # Only track tokens < 24 hours old
SOLANA_MIN_TRADING_VOLUME_USD=50000 # Minimum trading volume
```

### Pump.fun Contract Addresses

```bash
# Pump.fun Program ID (for filtering)
SOLANA_PUMPFUN_PROGRAM_ID=6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P

# Track all Pump.fun launches
SOLANA_TRACK_PUMPFUN=true
```

### Social Signal Filters

```bash
# Minimum Twitter mentions
MIN_TWITTER_MENTIONS=100

# Minimum Reddit upvotes
MIN_REDDIT_UPVOTES=50

# Minimum Telegram members
MIN_TELEGRAM_MEMBERS=1000
```

---

## 📋 Complete Railway Configuration

### Add These to Railway → `alchemy-whales` → Variables

```bash
# ========================================
# Whale Thresholds
# ========================================
WHALE_THRESHOLD_USD=100000
LARGE_WHALE_THRESHOLD_USD=1000000
MEGA_WHALE_THRESHOLD_USD=10000000

# ========================================
# Transfer Filters
# ========================================
FILTER_CATEGORIES=EXTERNAL,ERC20,ERC721
MIN_TRANSACTION_VALUE_USD=50000
EXCLUDE_ADDRESSES=0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE

# ========================================
# Solana Memecoin Detection
# ========================================
SOLANA_TRACK_NEW_TOKENS=true
SOLANA_MIN_LIQUIDITY_USD=10000
SOLANA_MAX_TOKEN_AGE_HOURS=24
SOLANA_TRACK_PUMPFUN=true
SOLANA_PUMPFUN_PROGRAM_ID=6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P

# ========================================
# Cross-Validation (for large transfers)
# ========================================
CROSS_VALIDATION_THRESHOLD_USD=100000  # Cross-validate transfers > $100K
CROSS_VALIDATION_MAX_DISCREPANCY=5     # Max 5% difference
CROSS_VALIDATION_MIN_CONFIDENCE=85     # Min 85% confidence
```

---

## 🎯 Recommended Configurations

### Configuration 1: Conservative (Low Alerts)

```bash
WHALE_THRESHOLD_USD=500000           # Only $500K+ transactions
FILTER_CATEGORIES=EXTERNAL,ERC20     # Ignore NFTs
MIN_TRANSACTION_VALUE_USD=100000     # Minimum $100K
```

**Use Case**: Focus on large institutional moves only

### Configuration 2: Balanced (Default)

```bash
WHALE_THRESHOLD_USD=100000           # $100K+ transactions
FILTER_CATEGORIES=EXTERNAL,ERC20,ERC721
MIN_TRANSACTION_VALUE_USD=50000      # Minimum $50K
```

**Use Case**: Track significant moves, including NFT sales

### Configuration 3: Aggressive (Many Alerts)

```bash
WHALE_THRESHOLD_USD=50000            # $50K+ transactions
FILTER_CATEGORIES=EXTERNAL,ERC20,ERC721,ERC1155,INTERNAL
MIN_TRANSACTION_VALUE_USD=10000      # Minimum $10K
```

**Use Case**: Track all significant activity, including DeFi interactions

### Configuration 4: Memecoin Focus (Solana)

```bash
SOLANA_TRACK_NEW_TOKENS=true
SOLANA_MIN_LIQUIDITY_USD=5000        # Lower threshold for memecoins
SOLANA_MAX_TOKEN_AGE_HOURS=12         # Very new tokens only
SOLANA_MIN_TRADING_VOLUME_USD=20000   # Lower volume threshold
MIN_TWITTER_MENTIONS=50               # Lower social threshold
```

**Use Case**: Catch memecoins early, before they pump

---

## 📊 Monitoring Specific Addresses

### Example: Track Vitalik's Wallet

```bash
# Add to Railway variables
TRACK_ADDRESS_ETH_VITALIK=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
ALERT_ON_VITALIK_MOVES=true
```

### Example: Track Exchange Deposits

```bash
# Track when whales deposit to exchanges (potential sell signal)
TRACK_EXCHANGE_ADDRESSES=true
EXCHANGE_ADDRESSES=0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE,0x71660c4005BA85c37ccec55d0C4493E66Fe775d3
ALERT_ON_EXCHANGE_DEPOSITS=true
```

---

## 🔔 Alert Configuration

### Webhook Alerts

```bash
# Webhook URL for alerts
WEBHOOK_URL=https://your-webhook-url.com/alerts
WEBHOOK_SECRET=your-secret-key

# Alert thresholds
ALERT_ON_WHALE=true
ALERT_ON_LARGE_WHALE=true
ALERT_ON_MEGA_WHALE=true
ALERT_ON_MEMECOIN=true
```

### Email Alerts (if configured)

```bash
ENABLE_EMAIL_ALERTS=true
EMAIL_ALERT_THRESHOLD_USD=1000000  # Only email for $1M+ transactions
```

---

## 🧪 Testing Your Configuration

### Test Whale Detection

```bash
# In Codespace, run:
cd services/alchemy-whales
npm run example:quicknode

# Check logs for:
✅ Whale detected: $150,000 transfer
✅ Large whale detected: $2,000,000 transfer
```

### Test Memecoin Detection

```bash
# Monitor Solana for new tokens
# Check logs for:
✅ New token detected on Pump.fun
✅ Memecoin alert: Token < 24h old, $50K liquidity
```

---

## 📈 Performance Tips

### Optimize Query Frequency

```bash
# How often to check for new transactions
BLOCK_CHECK_INTERVAL_MS=12000        # Every 12 seconds (Ethereum block time)
SOLANA_CHECK_INTERVAL_MS=400         # Every 400ms (Solana block time)
```

### Reduce API Calls

```bash
# Use caching to reduce API calls
ENABLE_CACHING=true
CACHE_TTL_SECONDS=300                # Cache for 5 minutes

# Batch queries
BATCH_SIZE=100                       # Process 100 transfers at once
BATCH_INTERVAL_MS=5000               # Batch every 5 seconds
```

---

## ✅ Quick Start Checklist

- [ ] Set whale thresholds (`WHALE_THRESHOLD_USD`, etc.)
- [ ] Configure transfer filters (`FILTER_CATEGORIES`)
- [ ] Set Solana memecoin filters (if using Solana)
- [ ] Add known whale addresses (optional)
- [ ] Configure webhook alerts (optional)
- [ ] Test configuration locally
- [ ] Deploy to Railway
- [ ] Monitor logs for alerts

---

## 🆘 Troubleshooting

### No Alerts Being Generated?

1. Check thresholds are set correctly
2. Verify API keys are working
3. Check logs for errors
4. Ensure addresses are making transactions

### Too Many Alerts?

1. Increase `WHALE_THRESHOLD_USD`
2. Add more addresses to `EXCLUDE_ADDRESSES`
3. Filter by category (`FILTER_CATEGORIES`)

### Missing Memecoin Alerts?

1. Verify Solana QuickNode endpoint is configured
2. Check `SOLANA_TRACK_NEW_TOKENS=true`
3. Lower `SOLANA_MIN_LIQUIDITY_USD` if needed

---

**Last Updated**: November 2024  
**Service**: `alchemy-whales`  
**Integration**: Alchemy + QuickNode + Solana

