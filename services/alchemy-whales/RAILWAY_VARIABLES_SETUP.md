# 🔧 Railway Variables Setup for alchemy-whales

**Status:** Variables need to be added  
**Current:** Alert notification variables are missing

---

## 📊 Current Situation

You have two services in Railway:
1. **`ingenious-learning`** - Has 57 variables (AI, Alchemy, QuickNode, Solana)
2. **`astonishing-simplicity`** - Has 6 variables (Solana/QuickNode)

**Missing:** Alert notification variables (Telegram, Email, Discord, Slack)

---

## 🎯 Which Service Should Get Alert Variables?

### Option 1: If `ingenious-learning` IS `alchemy-whales`
- Add alert variables to **`ingenious-learning`**
- This service already has all the AI/Solana variables

### Option 2: If `alchemy-whales` is separate
- Create new service: **`alchemy-whales`**
- Add all variables there
- OR use shared variables

### Option 3: Use Shared Variables (Recommended)
- Add alert variables as **Shared Variables**
- All services can use them
- Keeps variables in sync

---

## ✅ Add Alert Notification Variables

### Step 1: Go to Variables

**For `ingenious-learning` service:**
1. Railway Dashboard > **ingenious-learning** > **Variables** tab
2. Click **"New Variable"**

**OR for Shared Variables:**
1. Railway Dashboard > **Project Settings** > **Shared Variables**
2. Click **"New Variable"**

---

### Step 2: Add These Variables

**Copy & Paste these one by one:**

```bash
# === TELEGRAM (RECOMMENDED - EASIEST) ===
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=YOUR_CHAT_ID_HERE

# === EMAIL (OPTIONAL) ===
EMAIL_ENABLED=false
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=Coinet Alerts <your.email@gmail.com>
EMAIL_TO=recipient@example.com

# === DISCORD (OPTIONAL) ===
DISCORD_ENABLED=false
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK

# === SLACK (OPTIONAL) ===
SLACK_ENABLED=false
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_WEBHOOK

# === RATE LIMITING ===
MIN_ALERT_INTERVAL_SECONDS=30
MAX_ALERTS_PER_HOUR=50

# === ALERT THRESHOLDS ===
ALERT_ON_CRITICAL=true
ALERT_ON_HIGH_RISK=true
ALERT_ON_HIGH_POTENTIAL=true
ALERT_ON_NEW_TOKEN=false
```

---

### Step 3: Get Telegram Credentials

**Get Telegram Bot Token:**
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Follow instructions
4. Copy the token

**Get Chat ID:**
1. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
2. Send a message to your bot
3. Refresh the page
4. Find `"chat":{"id":123456789}` - that's your chat ID

---

## 🔄 Using Shared Variables (Recommended)

### Benefits:
- ✅ Variables sync across all services
- ✅ Update once, applies everywhere
- ✅ Easier to manage

### How to Create Shared Variable:

1. **Go to:** Railway Dashboard > **Project Settings** > **Shared Variables**
2. **Click:** "New Variable"
3. **Add:** `TELEGRAM_ENABLED=true`
4. **Repeat** for all alert variables

### Promote Existing Variable to Shared:

1. Go to service variables (e.g., `ingenious-learning` > Variables)
2. Find variable (e.g., `TELEGRAM_ENABLED`)
3. Click **⋮** (three dots) next to variable
4. Select **"Promote to Shared Variable"**

---

## 📋 Complete Variable Checklist

### Already Have (in ingenious-learning):
- ✅ `AI_ULTIMATE_FRAUD_ENABLED`
- ✅ `QUICKNODE_SOLANA_HTTP_URL`
- ✅ `QUICKNODE_SOLANA_WS_URL`
- ✅ `SOLANA_REALTIME_MONITORING`
- ✅ `FRAUD_RISK_THRESHOLD`
- ✅ `HIGH_POTENTIAL_THRESHOLD`
- ✅ `ALERT_ON_HIGH_POTENTIAL`
- ✅ `ALERT_ON_NEW_TOKEN`

### Need to Add:
- ❌ `TELEGRAM_ENABLED`
- ❌ `TELEGRAM_BOT_TOKEN`
- ❌ `TELEGRAM_CHAT_ID`
- ❌ `EMAIL_ENABLED` (optional)
- ❌ `DISCORD_ENABLED` (optional)
- ❌ `SLACK_ENABLED` (optional)
- ❌ `MIN_ALERT_INTERVAL_SECONDS`
- ❌ `MAX_ALERTS_PER_HOUR`
- ❌ `ALERT_ON_CRITICAL`
- ❌ `ALERT_ON_HIGH_RISK`

---

## 🚀 Quick Setup (5 Minutes)

### Minimum Required Variables:

Add these 3 variables to **`ingenious-learning`**:

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

**That's it!** The service will start sending alerts.

---

## ✅ After Adding Variables

1. **Redeploy Service:**
   - Railway will auto-redeploy
   - OR manually: Railway > ingenious-learning > Deployments > "Redeploy"

2. **Check Logs:**
   - Railway > ingenious-learning > **Logs**
   - Look for: `✅ Alert Notification Service initialized`

3. **Test Alert:**
   - Wait for a new Solana token detection
   - Or check logs for token detections
   - You should receive a Telegram alert

---

## 🎯 Recommended Setup

### Use Shared Variables:

1. **Create Shared Variables:**
   - `TELEGRAM_ENABLED=true`
   - `TELEGRAM_BOT_TOKEN=your_token`
   - `TELEGRAM_CHAT_ID=your_chat_id`
   - `MIN_ALERT_INTERVAL_SECONDS=30`
   - `MAX_ALERTS_PER_HOUR=50`
   - `ALERT_ON_CRITICAL=true`
   - `ALERT_ON_HIGH_RISK=true`

2. **Benefits:**
   - All services can use alerts
   - Update once, sync everywhere
   - Easier management

---

## 📝 Variable Reference

See `RAILWAY_ALERT_VARS.txt` for complete list of all alert variables.

---

**Status:** Ready to add variables  
**Next Step:** Add alert variables to `ingenious-learning` or create shared variables

