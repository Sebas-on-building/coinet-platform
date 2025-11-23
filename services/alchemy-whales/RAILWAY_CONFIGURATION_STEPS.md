# 🚀 Railway Configuration Steps - alchemy-whales Service

## ⚡ Quick Configuration (Copy-Paste Ready)

### Step 1: Set Root Directory

**Find**: "Add Root Directory" field  
**Enter**: `services/alchemy-whales`  
**Click**: Save or it auto-saves

This tells Railway where your service code is located.

---

### Step 2: Verify Build Command (Optional)

Railway should auto-detect, but verify:

**Build Command**: (leave empty - auto-detected)  
**OR** if needed: `cd services/alchemy-whales && npm install && npm run build`

---

### Step 3: Verify Start Command (Optional)

Railway should auto-detect, but verify:

**Start Command**: (leave empty - auto-detected)  
**OR** if needed: `cd services/alchemy-whales && npm start`

---

### Step 4: Deploy

1. **Save** all settings
2. Railway will **auto-deploy** when you save
3. OR click **"Deploy"** button manually

---

## ✅ Configuration Checklist

- [ ] **Root Directory**: `services/alchemy-whales` ✅ (MOST IMPORTANT!)
- [ ] **Branch**: `main` or `feature/ai-data-feeder` (your choice)
- [ ] **Build Command**: (auto-detected - leave empty)
- [ ] **Start Command**: (auto-detected - leave empty)
- [ ] **Variables**: Already configured (shared variables)

---

## 🎯 What Each Setting Does

### Root Directory: `services/alchemy-whales`
- **Purpose**: Tells Railway where your service code is
- **Required**: ✅ YES - This is critical!
- **Value**: `services/alchemy-whales`

### Branch: `main` or `feature/ai-data-feeder`
- **Purpose**: Which Git branch to deploy from
- **Recommended**: `feature/ai-data-feeder` (has latest code)
- **OR**: `main` (if you've merged)

### Build Command: (auto-detected)
- **Purpose**: Command to build your service
- **Default**: Railway detects `package.json` and runs `npm install && npm run build`
- **Action**: Leave empty (auto-detection works)

### Start Command: (auto-detected)
- **Purpose**: Command to start your service
- **Default**: Railway detects `package.json` and runs `npm start`
- **Action**: Leave empty (auto-detection works)

---

## 🔍 After Configuration

### Check Deploy Logs

After saving, Railway will:
1. Pull code from GitHub
2. Build the service
3. Deploy it

**Look for**:
```
✅ Build successful!
✅ Service started
```

### Check Runtime Logs

**Look for**:
```
✅ Ultimate Fraud Detector initialized (12 models loaded)
✅ Solana real-time monitoring started
✅ QuickNode client ready for solana-mainnet
```

---

## 🆘 Troubleshooting

### Service Not Building?

1. **Check Root Directory**: Must be `services/alchemy-whales`
2. **Check Branch**: Make sure branch exists and has code
3. **Check Build Logs**: Look for specific error messages

### Service Not Starting?

1. **Check Runtime Logs**: Look for startup errors
2. **Check Variables**: Verify shared variables are accessible
3. **Check Start Command**: Should be auto-detected

### Variables Not Found?

1. Go to **Project Settings** → **Variables**
2. Verify variables are set as **Shared Variables**
3. Check that service has access to shared variables

---

## 📋 Complete Configuration Summary

```
Root Directory: services/alchemy-whales
Branch: feature/ai-data-feeder (or main)
Build Command: (empty - auto-detected)
Start Command: (empty - auto-detected)
Variables: ✅ Already configured (shared)
```

---

## ✅ Next Steps After Configuration

1. **Save** settings
2. **Wait** for deployment (~30-60 seconds)
3. **Check** Deploy Logs for build success
4. **Check** Runtime Logs for service startup
5. **Verify** Ultimate Fraud Detector initialized

---

## 🎉 That's It!

Once Root Directory is set to `services/alchemy-whales`, Railway will:
- ✅ Detect it's a Node.js service
- ✅ Run `npm install`
- ✅ Run `npm run build`
- ✅ Run `npm start`
- ✅ Deploy your Ultimate Fraud Detection system!

**Most Important**: Set **Root Directory** to `services/alchemy-whales`! 🚀

