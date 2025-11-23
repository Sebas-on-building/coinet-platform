# 🚨 CRITICAL: Railway Root Directory Issue

## The Problem

Railway keeps detecting "src" as a subdirectory, which means it's trying to build from `apps/coinet-platform/src` instead of `apps/coinet-platform`.

## ✅ THE FIX: Set Root Directory in Railway UI

**This MUST be done in Railway Dashboard - code changes won't fix it!**

### Step-by-Step Instructions:

1. **Go to Railway Dashboard**
   - https://railway.app
   - Sign in

2. **Select Your Project**
   - Click on your project
   - Click on `coinet-platform` service

3. **Open Settings**
   - Click **"Settings"** tab (top right)
   - Scroll down to **"Source"** section

4. **Check Root Directory**
   - Look for **"Root Directory"** field
   - It might be:
     - Empty (wrong)
     - `apps/coinet-platform/src` (wrong)
     - Something else (probably wrong)

5. **Set Correct Root Directory**
   - Click **"Add Root Directory"** or **Edit** button
   - **DELETE** any existing value
   - Type exactly: `apps/coinet-platform`
   - **DO NOT** include:
     - `/src` at the end
     - Trailing slash `/`
     - Any other path
   - Click **"Update"** or **"Save"**

6. **Verify**
   - The Root Directory should now show: `apps/coinet-platform`
   - Railway will auto-redeploy

## 🔍 How to Verify It's Fixed

### In Railway Build Logs, you should see:

**✅ CORRECT (after fix):**
```
✓ Detected Node.js project
✓ Found package.json
✓ Installing dependencies...
✓ Running build: npm run build
```

**❌ WRONG (current):**
```
Using subdirectory "src"
Nixpacks was unable to generate a build plan
The contents of the app directory are:
  index.ts
```

## 📸 Visual Guide

### What Railway Should See:

```
Repository Root
├── apps/
│   └── coinet-platform/  ← Root Directory set here
│       ├── package.json ✅
│       ├── tsconfig.json ✅
│       ├── railway.json ✅
│       ├── src/
│       │   └── index.ts
│       └── prisma/
```

### What Railway Currently Sees (WRONG):

```
Repository Root
├── apps/
│   └── coinet-platform/
│       └── src/  ← Railway thinks THIS is the root
│           └── index.ts
│       ❌ package.json (not found here!)
```

## ⚠️ Important Notes

1. **Code changes won't fix this** - It's a Railway UI setting
2. **Must be done manually** - In Railway Dashboard
3. **Case-sensitive** - Use exact case: `apps/coinet-platform`
4. **No trailing slash** - Don't add `/` at the end
5. **No subdirectories** - Don't include `/src`

## 🎯 Quick Checklist

- [ ] Opened Railway Dashboard
- [ ] Went to `coinet-platform` service
- [ ] Opened Settings tab
- [ ] Found "Root Directory" field
- [ ] Set to exactly: `apps/coinet-platform`
- [ ] Saved/Updated
- [ ] Verified in build logs that it's working

## 🆘 Still Not Working?

If Railway still detects "src" after setting root directory:

1. **Double-check** the root directory value (no typos)
2. **Try clearing** the root directory field, save, then set it again
3. **Check** if there's a root-level `railway.json` interfering
4. **Contact** Railway support if issue persists

---

**The fix is 100% in Railway UI settings - set Root Directory to `apps/coinet-platform`!**

