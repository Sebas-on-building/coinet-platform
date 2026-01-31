# 🔧 Fix ai-data-feeder Builder Configuration

## Problem
Railway is trying to use `railway.dockerfile` which doesn't exist. It found:
- ✅ `Dockerfile` at `services/ai-data-feeder/Dockerfile`
- ✅ `nixpacks.toml` at `services/ai-data-feeder/nixpacks.toml`
- ❌ But trying to use `railway.dockerfile` (doesn't exist)

## Solution: Use Nixpacks Instead

The `railway.json` specifies Dockerfile builder, but Nixpacks is simpler and already configured.

### Option 1: Update railway.json (Recommended)

Change the builder from `dockerfile` to `NIXPACKS`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd services/ai-data-feeder && node dist/index.js",
    "restartPolicyType": "always"
  }
}
```

### Option 2: Use Railway Dashboard

1. Go to Railway Dashboard → **ai-data-feeder** service
2. **Settings** → **Build & Deploy**
3. **Builder**: Change to **Nixpacks** (if Dockerfile is selected)
4. **Save** → Auto-redeploys

### Option 3: Remove railway.json Builder Override

Delete or comment out the `build.builder` section in `railway.json` to let Railway auto-detect:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "deploy": {
    "startCommand": "cd services/ai-data-feeder && node dist/index.js",
    "restartPolicyType": "always"
  }
}
```

---

## Why Nixpacks?

- ✅ Already configured (`nixpacks.toml` exists)
- ✅ Simpler than Dockerfile
- ✅ Auto-detects Node.js projects
- ✅ Works better with monorepos

---

## Quick Fix

Update `services/ai-data-feeder/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "always"
  }
}
```

Then commit and push:
```bash
git add services/ai-data-feeder/railway.json
git commit -m "fix: Use Nixpacks builder for ai-data-feeder"
git push origin feature/ai-data-feeder
```

Railway will auto-redeploy! 🚀

