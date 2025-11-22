# 🚨 CRITICAL: Railway Subdirectory Issue Fix

## Problem
Railway is detecting "src" as a subdirectory and building from `apps/coinet-platform/src` instead of `apps/coinet-platform`, so it can't find `package.json`.

## ✅ SOLUTION: Check Root Directory in Railway Settings

### Step 1: Go to Railway Dashboard

1. Open Railway Dashboard
2. Click on `coinet-platform` service
3. Click **Settings** tab
4. Scroll to **"Source"** section

### Step 2: Check Root Directory Value

Look at the **"Root Directory"** field. It might be set to:
- ❌ `apps/coinet-platform/src` (WRONG - too deep)
- ❌ Empty (WRONG - uses repo root)
- ✅ `apps/coinet-platform` (CORRECT!)

### Step 3: Fix Root Directory

**If it's wrong:**

1. Click **"Add Root Directory"** (or edit if it exists)
2. **DELETE** any existing value
3. Type exactly: `apps/coinet-platform`
4. **DO NOT** include `/src` at the end
5. Click **"Update"**

### Step 4: Verify

After setting root directory, Railway should see:

```
apps/coinet-platform/
├── package.json ✅ (Railway needs this!)
├── tsconfig.json ✅
├── railway.json ✅
├── .nvmrc ✅
├── src/
│   └── index.ts
└── prisma/
```

**NOT:**
```
apps/coinet-platform/src/
├── index.ts
❌ No package.json → Build fails
```

## 🔍 How to Verify Root Directory is Correct

### In Railway Build Logs, you should see:

**CORRECT (what you want):**
```
✓ Detected Node.js project
✓ Found package.json
✓ Installing dependencies...
```

**WRONG (current issue):**
```
Using subdirectory "src"
Nixpacks was unable to generate a build plan
The contents of the app directory are:
  index.ts
```

## 📋 Step-by-Step Fix

1. **Railway Dashboard** → `coinet-platform` → **Settings**
2. **Source** section → **Root Directory**
3. **Set to:** `apps/coinet-platform` (exactly this, no trailing slash)
4. **Save/Update**
5. **Redeploy** (or wait for auto-deploy)

## ⚠️ Common Mistakes

| Wrong | Correct |
|-------|---------|
| `apps/coinet-platform/src` | `apps/coinet-platform` |
| `apps/coinet-platform/` | `apps/coinet-platform` |
| Empty | `apps/coinet-platform` |
| `apps` | `apps/coinet-platform` |

## 🎯 Expected Result

After fixing root directory:

```
✓ Railway detects Node.js project
✓ Finds package.json
✓ Installs dependencies
✓ Builds TypeScript
✓ Starts service successfully
```

---

**The fix is simple: Set root directory to exactly `apps/coinet-platform` (no `/src` at the end)!**

