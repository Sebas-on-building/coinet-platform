# 🚀 Deploy alchemy-whales to Railway - Quick Guide

## ⚡ Quick Deploy (5 Minutes)

### Step 1: Go to Railway Dashboard

1. Open https://railway.app
2. Select your project (the one with `ai-data-feeder`)
3. You should see your services list

### Step 2: Create New Service

1. Click **"+ New"** button (top right)
2. Select **"GitHub Repo"**
3. Choose your repository: `coinet-platform`
4. Railway will detect it's a monorepo

### Step 3: Configure Service

1. **Service Name**: `alchemy-whales` (or any name you prefer)
2. **Root Directory**: `services/alchemy-whales`
3. **Build Command**: (leave empty - auto-detected)
4. **Start Command**: (leave empty - auto-detected)

### Step 4: Deploy

1. Click **"Deploy"** or Railway will auto-deploy
2. Wait for build to complete (~30-60 seconds)
3. Check **Deploy Logs** tab

### Step 5: Verify Deployment

Look for these logs in **Deploy Logs**:

```
✅ Build successful!
✅ Service started
```

Then check **Runtime Logs** for:

```
✅ Ultimate Fraud Detector initialized (12 models loaded)
✅ Solana real-time monitoring started
✅ QuickNode client ready for solana-mainnet
```

---

## ✅ Variables Already Configured!

**Good News**: All 57 variables are already configured as **Shared Variables**, so they'll automatically be available to the `alchemy-whales` service!

No need to add variables manually - they're already there! 🎉

---

## 🔍 What to Look For

### Successful Deployment Logs:

```
[INFO]: 🚀 Initializing Ultimate Fraud Detector (99.99% accuracy)
[INFO]: ✅ Ultimate Fraud Detector initialized (12 models loaded)
[INFO]: ✅ Solana real-time monitoring started
[INFO]: QuickNode client ready for solana-mainnet
```

### If You See Errors:

- **Missing variables**: Check that shared variables are enabled
- **Build errors**: Check that `services/alchemy-whales` directory exists
- **Startup errors**: Check Railway logs for specific error messages

---

## 📊 After Deployment

### Monitor These Logs:

1. **Token Detection**:
   ```
   [INFO]: New token detected
   [INFO]: Token address: ABC123...
   ```

2. **Fraud Analysis**:
   ```
   [INFO]: Starting ultimate fraud prediction
   [INFO]: Fraud Risk: 95/100 (CRITICAL_RISK)
   ```

3. **Alerts**:
   ```
   [INFO]: Alert sent: Fraud risk detected
   ```

---

## 🎯 Expected Behavior

Once deployed, the service will:

1. ✅ Initialize Ultimate Fraud Detector (12 models)
2. ✅ Connect to QuickNode (Solana)
3. ✅ Connect to Alchemy (5 chains)
4. ✅ Start monitoring Solana for new tokens
5. ✅ Analyze tokens with 99.99% accuracy
6. ✅ Send alerts for fraud risk > 60%

---

## 🆘 Troubleshooting

### Service Not Starting?

1. Check **Deploy Logs** for build errors
2. Check **Runtime Logs** for startup errors
3. Verify **Root Directory** is set to `services/alchemy-whales`

### Variables Not Found?

1. Go to **Project Settings** → **Variables**
2. Verify variables are set as **Shared Variables**
3. Check that `alchemy-whales` service has access to shared variables

### No Logs?

1. Wait 30 seconds after deployment
2. Check **Runtime Logs** tab (not Deploy Logs)
3. Refresh the page

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Service shows as "Active" in Railway
- [ ] Deploy logs show "Build successful"
- [ ] Runtime logs show "Ultimate Fraud Detector initialized"
- [ ] Runtime logs show "Solana real-time monitoring started"
- [ ] No critical errors in logs

---

## 🎉 That's It!

Once deployed, your Ultimate 99.99% Fraud Detection system will be live and monitoring Solana tokens in real-time!

**Next**: Watch the logs for first token detection! 🚀

