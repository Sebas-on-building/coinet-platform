# 🔧 Railway Deployment Fix

## ❌ Problem

Railway is analyzing the **root directory** instead of `services/ai-data-feeder/`.

Error: `The app contents that Railpack analyzed contains: ./ ├── apps/ └── services/`

## ✅ Solution

### Option 1: Set Root Directory in Railway (Easiest)

In Railway dashboard:

1. Go to your `ai-data-feeder` service
2. Click **Settings** tab
3. Scroll to **"Root Directory"**
4. Set it to: `services/ai-data-feeder`
5. **Save**
6. **Redeploy**

Railway will now look in the correct directory!

---

### Option 2: Use Dockerfile (More Reliable)

The service already has a `Dockerfile`. Make sure Railway uses it:

1. Railway → Service → Settings
2. **Build Command**: Leave empty (uses Dockerfile)
3. **Root Directory**: `services/ai-data-feeder`
4. **Start Command**: `node dist/index.js`

---

### Option 3: Create railway.json in Root (Alternative)

If Railway still doesn't detect it, create `railway.json` in the **root**:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "services/ai-data-feeder/Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "always"
  }
}
```

---

## 🎯 Recommended: Set Root Directory

**Easiest fix:**

1. Railway → `ai-data-feeder` service → **Settings**
2. **Root Directory**: `services/ai-data-feeder`
3. **Save** → **Redeploy**

That's it! ✅

---

## 📋 What Railway Needs

Railway needs to see:
```
services/ai-data-feeder/
├── package.json ✅
├── tsconfig.json ✅
├── Dockerfile ✅
└── src/
```

Set **Root Directory** to `services/ai-data-feeder` and Railway will find everything!

