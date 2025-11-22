# 🚀 Create alchemy-whales Service in Railway

**Status:** Service needs to be created  
**Current:** Service not visible in Railway dashboard

---

## 📋 Step-by-Step: Create alchemy-whales Service

### Step 1: Open Railway Dashboard

1. Go to: https://railway.app/dashboard
2. Click on your **coinet-platform** project (the one showing "3 days ago")

---

### Step 2: Create New Service

**Option A: From GitHub Repository (Recommended)**

1. In the **coinet-platform** project, click **"+ New"** button
2. Select **"GitHub Repo"**
3. Choose your repository: `coinet-platform`
4. Railway will detect it's a monorepo

**Option B: From Template**

1. Click **"+ New"** button
2. Select **"Empty Service"**
3. Name it: `alchemy-whales`

---

### Step 3: Configure Service Settings

**Go to:** Railway > alchemy-whales > **Settings**

**Configure these settings:**

#### Root Directory (CRITICAL!)
- **Field:** "Root Directory" or "Source"
- **Value:** `services/alchemy-whales`
- **Purpose:** Tells Railway where your service code is located

#### Branch
- **Field:** "Branch"
- **Value:** `feature/ai-data-feeder` (or `main` if merged)
- **Purpose:** Which Git branch to deploy from

#### Build Command (Auto-detected)
- **Field:** "Build Command"
- **Value:** Leave empty (Railway auto-detects)
- **OR:** `cd services/alchemy-whales && npm install && npm run build`

#### Start Command (Auto-detected)
- **Field:** "Start Command"
- **Value:** Leave empty (Railway auto-detects)
- **OR:** `cd services/alchemy-whales && npm start`

---

### Step 4: Add Environment Variables

**Go to:** Railway > alchemy-whales > **Variables**

**Copy & Paste these variables:**

```bash
# === TELEGRAM (RECOMMENDED - EASIEST) ===
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=YOUR_CHAT_ID_HERE

# === RATE LIMITING ===
MIN_ALERT_INTERVAL_SECONDS=30
MAX_ALERTS_PER_HOUR=50

# === THRESHOLDS ===
FRAUD_RISK_THRESHOLD=60
HIGH_POTENTIAL_THRESHOLD=80

# === ALERT TYPES ===
ALERT_ON_NEW_TOKEN=false
ALERT_ON_HIGH_RISK=true
ALERT_ON_HIGH_POTENTIAL=true
ALERT_ON_CRITICAL=true

# === SERVICE CONFIG ===
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
```

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

### Step 5: Deploy

**Railway will automatically:**
1. ✅ Detect the service configuration
2. ✅ Pull code from GitHub
3. ✅ Build the service
4. ✅ Deploy it

**If auto-deploy is disabled:**
1. Go to: Railway > alchemy-whales > **Settings**
2. Enable **"Auto Deploy"**
3. Or manually: Railway > alchemy-whales > **Deployments** > **"Deploy"**

---

## ✅ Verification Checklist

After creating the service, verify:

- [ ] Service appears in Railway dashboard
- [ ] Root Directory is set to `services/alchemy-whales`
- [ ] Branch is set correctly
- [ ] Environment variables are added
- [ ] Build starts automatically
- [ ] Deployment succeeds

---

## 🔍 Check Deployment Logs

**Go to:** Railway > alchemy-whales > **Logs**

**Look for:**
```
✅ Alert Notification Service initialized
✅ Telegram notifications enabled
🚀 Alchemy Whales Service initialized successfully
```

---

## 🎯 Quick Reference

### Railway Dashboard
```
https://railway.app/dashboard
```

### Service Settings
```
Railway > coinet-platform > alchemy-whales > Settings
```

### Environment Variables
```
Railway > coinet-platform > alchemy-whales > Variables
```

### Deployment Logs
```
Railway > coinet-platform > alchemy-whales > Logs
```

---

## 🐛 Troubleshooting

### Issue: Service Not Appearing

**Solution:**
- Make sure you're in the **coinet-platform** project
- Click **"+ New"** to create a new service
- Select **"GitHub Repo"** and choose your repository

### Issue: Build Failing

**Solution:**
- Verify **Root Directory** is set to `services/alchemy-whales`
- Check that branch `feature/ai-data-feeder` exists
- Verify `package.json` exists in `services/alchemy-whales/`

### Issue: Service Not Starting

**Solution:**
- Check **Start Command** is correct
- Verify environment variables are set
- Check logs for error messages

---

## ✅ Once Created

After creating the service, you'll see:
- ✅ `alchemy-whales` service in your Railway dashboard
- ✅ Build logs showing compilation
- ✅ Deployment status
- ✅ Service logs

**Then follow:** `RAILWAY_DEPLOY_NOW.md` for complete deployment guide.

---

**Status:** Ready to create service in Railway  
**Next Step:** Create new service in Railway dashboard

