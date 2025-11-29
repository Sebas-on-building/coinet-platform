# ⚡ Real-Time Solana Token Launch Monitoring with AI Fraud Detection

## 🎯 Overview

This guide shows you how to set up **millisecond-level** detection of new Solana tokens with **instant AI fraud analysis** using Coinet AI.

---

## 🚀 Part 1: Real-Time Monitoring Setup

### QuickNode WebSocket Configuration

For real-time monitoring, you need WebSocket connections:

| Name | Value |
|------|-------|
| `QUICKNODE_SOLANA_WS_URL` | `wss://weathered-hidden-slug.solana-mainnet.quiknode.pro/44683f819e68e9ba0907456706dd559c8f4c7656/` |

**Already configured!** ✅

### Real-Time Detection Settings

| Name | Value | Description |
|------|-------|-------------|
| `SOLANA_REALTIME_MONITORING` | `true` | Enable real-time WebSocket monitoring |
| `SOLANA_BLOCK_CHECK_INTERVAL_MS` | `400` | Check every 400ms (Solana block time) |
| `SOLANA_DETECTION_DELAY_MS` | `0` | Zero delay - detect immediately |
| `SOLANA_TRACK_PUMPFUN` | `true` | Monitor Pump.fun launches |
| `SOLANA_PUMPFUN_PROGRAM_ID` | `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P` | Pump.fun program ID |

---

## 🤖 Part 2: AI Fraud Detection Configuration

### Coinet AI Integration

The service integrates with Coinet AI to analyze tokens immediately upon launch.

### Fraud Detection Criteria

| Name | Value | Description |
|------|-------|-------------|
| `AI_FRAUD_DETECTION_ENABLED` | `true` | Enable AI fraud analysis |
| `AI_ANALYSIS_TIMEOUT_MS` | `5000` | Max 5 seconds for AI analysis |
| `AI_MIN_CONFIDENCE_SCORE` | `70` | Minimum confidence to trust analysis |

### Fraud Detection Signals

The AI analyzes these signals:

#### 1. Token Contract Analysis
```bash
# Contract red flags
AI_CHECK_CONTRACT_VERIFICATION=true      # Is contract verified?
AI_CHECK_OWNERSHIP_CONCENTRATION=true    # Is ownership too concentrated?
AI_CHECK_LIQUIDITY_LOCK=true            # Is liquidity locked?
AI_CHECK_MINT_AUTHORITY=true            # Can dev mint unlimited tokens?
```

#### 2. Social Media Analysis
```bash
# Social red flags
AI_CHECK_TWITTER_ACCOUNT_AGE=true       # Is Twitter account new?
AI_CHECK_TELEGRAM_MEMBERS=true          # Are Telegram members real?
AI_CHECK_REDDIT_HISTORY=true            # Does team have Reddit history?
AI_CHECK_INFLUENCER_PAYMENTS=true       # Are influencers being paid?
```

#### 3. Trading Pattern Analysis
```bash
# Trading red flags
AI_CHECK_WASH_TRADING=true              # Detect wash trading
AI_CHECK_BOT_ACTIVITY=true              # Detect bot activity
AI_CHECK_PRICE_MANIPULATION=true       # Detect price manipulation
AI_CHECK_LIQUIDITY_REMOVAL_RISK=true    # Risk of liquidity removal
```

#### 4. Team & Project Analysis
```bash
# Team red flags
AI_CHECK_TEAM_DOX=true                  # Is team doxxed?
AI_CHECK_PROJECT_WEBSITE=true           # Does project have website?
AI_CHECK_ROADMAP=true                   # Is there a roadmap?
AI_CHECK_AUDIT=true                     # Has project been audited?
```

---

## 📊 Part 3: Fraud Scoring System

### Risk Score Calculation

The AI generates a **Fraud Risk Score** (0-100):

| Score Range | Risk Level | Action |
|-------------|------------|--------|
| 0-30 | ✅ **Low Risk** | Safe to invest |
| 31-60 | ⚠️ **Medium Risk** | Proceed with caution |
| 61-80 | 🚨 **High Risk** | Likely scam |
| 81-100 | 🔴 **Critical Risk** | Definite scam |

### Potential Score Calculation

The AI also generates a **Potential Score** (0-100):

| Score Range | Potential | Description |
|-------------|-----------|-------------|
| 80-100 | 🚀 **High Potential** | Strong fundamentals |
| 60-79 | 📈 **Good Potential** | Solid project |
| 40-59 | 📊 **Average Potential** | Wait and see |
| 0-39 | ⬇️ **Low Potential** | Weak fundamentals |

---

## ⚙️ Part 4: Complete Railway Configuration

### Add These to Railway → `alchemy-whales` → Variables

```bash
# ========================================
# Real-Time Solana Monitoring
# ========================================
SOLANA_REALTIME_MONITORING=true
SOLANA_BLOCK_CHECK_INTERVAL_MS=400
SOLANA_DETECTION_DELAY_MS=0
SOLANA_TRACK_PUMPFUN=true
SOLANA_PUMPFUN_PROGRAM_ID=6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P

# ========================================
# Token Launch Filters
# ========================================
SOLANA_TRACK_NEW_TOKENS=true
SOLANA_MIN_LIQUIDITY_USD=1000          # Very low threshold for early detection
SOLANA_MAX_TOKEN_AGE_SECONDS=60        # Only tokens < 60 seconds old
SOLANA_MIN_TRADING_VOLUME_USD=1000     # Low volume threshold

# ========================================
# AI Fraud Detection
# ========================================
AI_FRAUD_DETECTION_ENABLED=true
AI_ANALYSIS_TIMEOUT_MS=5000
AI_MIN_CONFIDENCE_SCORE=70

# Contract Analysis
AI_CHECK_CONTRACT_VERIFICATION=true
AI_CHECK_OWNERSHIP_CONCENTRATION=true
AI_CHECK_LIQUIDITY_LOCK=true
AI_CHECK_MINT_AUTHORITY=true

# Social Analysis
AI_CHECK_TWITTER_ACCOUNT_AGE=true
AI_CHECK_TELEGRAM_MEMBERS=true
AI_CHECK_REDDIT_HISTORY=true
AI_CHECK_INFLUENCER_PAYMENTS=true

# Trading Analysis
AI_CHECK_WASH_TRADING=true
AI_CHECK_BOT_ACTIVITY=true
AI_CHECK_PRICE_MANIPULATION=true
AI_CHECK_LIQUIDITY_REMOVAL_RISK=true

# Team Analysis
AI_CHECK_TEAM_DOX=true
AI_CHECK_PROJECT_WEBSITE=true
AI_CHECK_ROADMAP=true
AI_CHECK_AUDIT=true

# ========================================
# Alert Thresholds
# ========================================
ALERT_ON_FRAUD_RISK=true
FRAUD_RISK_THRESHOLD=60               # Alert if fraud risk > 60
ALERT_ON_HIGH_POTENTIAL=true
HIGH_POTENTIAL_THRESHOLD=80           # Alert if potential > 80
ALERT_ON_NEW_TOKEN=true               # Alert on all new tokens
```

---

## 🔄 Part 5: Real-Time Detection Flow

### How It Works

```
1. Token Launches on Pump.fun
   ↓ (0ms delay)
2. QuickNode WebSocket detects new token
   ↓ (400ms - Solana block time)
3. Service captures token data:
   - Contract address
   - Creator address
   - Initial liquidity
   - Token metadata
   ↓ (Instant)
4. AI Analysis Starts (parallel):
   ├─ Contract Analysis
   ├─ Social Media Check
   ├─ Trading Pattern Analysis
   └─ Team & Project Analysis
   ↓ (Max 5 seconds)
5. Fraud Risk Score Generated
6. Potential Score Generated
7. Alert Sent (if thresholds met)
```

### Detection Speed

- **Detection Time**: < 1 second (first Solana block)
- **AI Analysis**: < 5 seconds
- **Total Time**: < 6 seconds from launch to analysis

---

## 📈 Part 6: AI Analysis Output

### Example Analysis Result

```json
{
  "tokenAddress": "ABC123...",
  "detectedAt": "2024-11-21T19:10:00.000Z",
  "ageSeconds": 0.4,
  "analysis": {
    "fraudRiskScore": 75,
    "fraudRiskLevel": "HIGH_RISK",
    "potentialScore": 35,
    "potentialLevel": "LOW_POTENTIAL",
    "confidence": 85,
    "redFlags": [
      "Contract not verified",
      "High ownership concentration (80% held by creator)",
      "No liquidity lock",
      "Twitter account created yesterday",
      "Wash trading detected"
    ],
    "greenFlags": [
      "Has website",
      "Telegram has 500+ members"
    ],
    "recommendation": "AVOID",
    "reasoning": "Multiple red flags indicate high scam probability. Ownership concentration and lack of contract verification are major concerns."
  }
}
```

---

## 🎯 Part 7: Recommended Configurations

### Configuration 1: Ultra-Aggressive (Catch Everything)

```bash
SOLANA_REALTIME_MONITORING=true
SOLANA_BLOCK_CHECK_INTERVAL_MS=400
SOLANA_MAX_TOKEN_AGE_SECONDS=10        # Only 10 seconds old!
SOLANA_MIN_LIQUIDITY_USD=100           # Very low threshold
AI_FRAUD_DETECTION_ENABLED=true
ALERT_ON_NEW_TOKEN=true                # Alert on ALL new tokens
```

**Use Case**: Catch tokens immediately, analyze everything

### Configuration 2: Balanced (Recommended)

```bash
SOLANA_REALTIME_MONITORING=true
SOLANA_BLOCK_CHECK_INTERVAL_MS=400
SOLANA_MAX_TOKEN_AGE_SECONDS=60        # 1 minute old
SOLANA_MIN_LIQUIDITY_USD=1000          # $1K minimum
AI_FRAUD_DETECTION_ENABLED=true
FRAUD_RISK_THRESHOLD=60                # Alert on medium+ risk
HIGH_POTENTIAL_THRESHOLD=80             # Alert on high potential
```

**Use Case**: Balance between catching early and filtering noise

### Configuration 3: Conservative (High Quality Only)

```bash
SOLANA_REALTIME_MONITORING=true
SOLANA_MAX_TOKEN_AGE_SECONDS=300       # 5 minutes old
SOLANA_MIN_LIQUIDITY_USD=10000         # $10K minimum
AI_FRAUD_DETECTION_ENABLED=true
FRAUD_RISK_THRESHOLD=40                # Only alert on low risk
HIGH_POTENTIAL_THRESHOLD=85            # Only high potential
```

**Use Case**: Focus on quality tokens only

---

## 🔔 Part 8: Alert Configuration

### Webhook Alerts

```bash
# Webhook for fraud alerts
WEBHOOK_URL_FRAUD=https://your-webhook.com/fraud-alerts
WEBHOOK_SECRET_FRAUD=your-secret-key

# Webhook for high potential tokens
WEBHOOK_URL_POTENTIAL=https://your-webhook.com/potential-alerts
WEBHOOK_SECRET_POTENTIAL=your-secret-key
```

### Alert Types

1. **Fraud Alert**: Sent when fraud risk > threshold
2. **High Potential Alert**: Sent when potential > threshold
3. **New Token Alert**: Sent on all new token launches
4. **Critical Alert**: Sent when fraud risk > 80

---

## 🧪 Part 9: Testing

### Test Real-Time Detection

```bash
# In Codespace, monitor logs:
cd services/alchemy-whales
npm run dev

# Watch for:
✅ New token detected: ABC123... (age: 0.4s)
🤖 AI Analysis started...
📊 Fraud Risk Score: 75 (HIGH_RISK)
📈 Potential Score: 35 (LOW_POTENTIAL)
🚨 Alert sent: Fraud detected
```

### Test AI Analysis

```bash
# Test with known scam token
curl -X POST http://localhost:3001/api/analyze-token \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "SCAM_TOKEN_ADDRESS",
    "chain": "solana"
  }'

# Should return fraud analysis
```

---

## 📊 Part 10: Monitoring Dashboard

### Key Metrics to Track

- **Tokens Detected**: Count of new tokens found
- **Average Detection Time**: Time from launch to detection
- **AI Analysis Time**: Time for AI to complete analysis
- **Fraud Detection Rate**: % of tokens flagged as fraud
- **False Positive Rate**: % of false fraud alerts
- **High Potential Rate**: % of tokens with high potential

---

## ✅ Quick Start Checklist

- [ ] Enable real-time monitoring (`SOLANA_REALTIME_MONITORING=true`)
- [ ] Configure WebSocket URL (`QUICKNODE_SOLANA_WS_URL`)
- [ ] Enable AI fraud detection (`AI_FRAUD_DETECTION_ENABLED=true`)
- [ ] Set fraud risk threshold (`FRAUD_RISK_THRESHOLD=60`)
- [ ] Set potential threshold (`HIGH_POTENTIAL_THRESHOLD=80`)
- [ ] Configure alert webhooks
- [ ] Test detection locally
- [ ] Deploy to Railway
- [ ] Monitor logs for alerts

---

## 🆘 Troubleshooting

### No Tokens Being Detected?

1. Check WebSocket connection is active
2. Verify `SOLANA_TRACK_PUMPFUN=true`
3. Check Pump.fun program ID is correct
4. Lower `SOLANA_MIN_LIQUIDITY_USD` threshold

### AI Analysis Taking Too Long?

1. Increase `AI_ANALYSIS_TIMEOUT_MS`
2. Check Coinet AI service is running
3. Verify API keys are configured
4. Reduce analysis complexity

### Too Many False Positives?

1. Increase `AI_MIN_CONFIDENCE_SCORE`
2. Adjust fraud detection criteria
3. Fine-tune AI model thresholds
4. Review and update fraud patterns

---

**Last Updated**: November 2024  
**Service**: `alchemy-whales`  
**Integration**: QuickNode Solana + Coinet AI + Real-Time Monitoring

