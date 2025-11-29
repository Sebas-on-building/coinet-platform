# 🚨 Railway Fix for coinet-platform

## Problem
Railway is trying to build from the **root directory** instead of `apps/coinet-platform`, causing build failures.

## ✅ Solution

### Step 1: Set Root Directory in Railway

**CRITICAL:** You must set the root directory:

1. Go to Railway Dashboard → `coinet-platform` Service
2. Click **Settings** tab
3. Scroll to **"Source"** section
4. Click **"Add Root Directory"** (or edit if exists)
5. Enter: `apps/coinet-platform`
6. Click **"Update"**

### Step 2: Verify Configuration

After setting root directory, Railway should detect:
- ✅ `package.json` found
- ✅ Node.js project detected
- ✅ Build command: `npm install && npm run build`
- ✅ Start command: `npm start` (from railway.json)

### Step 3: Redeploy

Railway will automatically redeploy, or manually trigger:
- Settings → **"Redeploy"**

## 📋 Expected Build Output

After setting root directory, you should see:

```
✓ package.json found
✓ Installing dependencies...
✓ Running build: npm run build
✓ TypeScript compilation successful
✓ Build complete
```

## 🔍 Current Issue

**What Railway sees now:**
```
Root directory: / (repo root)
├── apps/
├── services/
└── SERVICES_EXPLAINED.md
❌ No package.json at root → Build fails
```

**What Railway should see:**
```
Root directory: apps/coinet-platform
├── package.json ✅
├── tsconfig.json ✅
├── src/
└── railway.json ✅
✅ package.json found → Build succeeds
```

## ⚙️ Alternative: Use Dockerfile

If setting root directory doesn't work, Railway should auto-detect the `railway.dockerfile` at root, but that builds the entire monorepo. For a cleaner build, use the root directory method above.

## ✅ Files Added

- `apps/coinet-platform/railway.json` - Railway configuration
- This guide

## 🎯 Quick Fix Checklist

- [ ] Set root directory to `apps/coinet-platform` in Railway
- [ ] Verify build succeeds
- [ ] Check deploy logs show service starting
- [ ] Verify health endpoint: `/api/health`

---

**After setting root directory, Railway should build successfully!** 🚀

