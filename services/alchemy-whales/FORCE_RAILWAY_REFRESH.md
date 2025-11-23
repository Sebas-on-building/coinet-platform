# 🔄 Force Railway to Refresh railway.json

## ❌ Current Issue

Railway UI shows build command as `pnpm install --frozen-lockfile && pnpm run build` even though `railway.json` has been updated to use `npm install && npm run build`.

Railway might be caching the old value or not refreshing from the config file.

## ✅ Solutions (Try in Order)

### Solution 1: Clear Custom Build Command in Railway UI

1. Go to Railway Dashboard → `alchemy-whales` → **Settings**
2. Find **"Custom Build Command"** field
3. **DELETE/CLEAR** the value completely (make it empty)
4. Click **"Update"** or **"Save"**
5. Railway will use Dockerfile's default build process (`npm ci && npm run build`)

### Solution 2: Manually Update Build Command

1. Railway Dashboard → `alchemy-whales` → **Settings**
2. **Custom Build Command**: Change to:
   ```
   npm install && npm run build
   ```
3. Click **"Update"**
4. Railway will redeploy

### Solution 3: Force Refresh by Updating railway.json Again

If Railway isn't picking up the changes, we can add a comment to force a refresh:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Solution 4: Switch Builder to Nixpacks

Since we updated `nixpacks.toml` to use npm:

1. Railway Dashboard → **Settings** → **Build**
2. **Builder**: Change from **"Dockerfile"** to **"Nixpacks"**
3. **Custom Build Command**: Leave empty (will use `nixpacks.toml`)
4. Click **"Update"**

## 🎯 Recommended Action

**BEST**: Clear the custom build command and let Dockerfile handle it (Solution 1)

The Dockerfile already has the correct commands:
- `npm ci` for install
- `npm run build` for build

This is the most reliable approach.

---

**Status**: ⚠️ **RAILWAY UI NEEDS MANUAL UPDATE**

