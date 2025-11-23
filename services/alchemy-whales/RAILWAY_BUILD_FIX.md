# 🔧 Railway Build Fix - Use Nixpacks Instead of Dockerfile

## ❌ Problem

Railway is detecting the Dockerfile which uses `npm ci`, but the project uses `pnpm` with `pnpm-lock.yaml`. This causes build failures.

## ✅ Solution: Use Nixpacks Builder

### Step 1: Change Builder in Railway Settings

1. Go to Railway Dashboard → Your Service → **Settings** tab
2. Find **"Build"** section
3. Find **"Builder"** dropdown
4. Change from **"Dockerfile"** to **"Nixpacks"**
5. **Save**

### Step 2: Verify Root Directory

Make sure **Root Directory** is set to: `services/alchemy-whales`

### Step 3: Redeploy

Railway will automatically redeploy with Nixpacks builder.

---

## 🔄 Alternative: Update Nixpacks Config

If Nixpacks doesn't work automatically, we can update `nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "pnpm"]

[phases.install]
cmds = ["pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["pnpm run build"]

[start]
cmd = "node dist/index.js"
```

---

## 🎯 Quick Fix Steps

### In Railway Dashboard:

1. **Settings** → **Build** section
2. **Builder**: Change to **"Nixpacks"**
3. **Root Directory**: `services/alchemy-whales`
4. **Save** → Auto-redeploys

---

## ✅ Expected Result

After switching to Nixpacks:

```
✅ Detected Node.js project
✅ Installing dependencies with pnpm
✅ Building TypeScript
✅ Service started
```

---

## 🆘 If Nixpacks Still Fails

### Option 1: Create package-lock.json (Quick Fix)

Run this in Codespace:

```bash
cd services/alchemy-whales
npm install --package-lock-only
git add package-lock.json
git commit -m "fix: Add package-lock.json for Railway Dockerfile builds"
git push
```

Then Railway can use Dockerfile with npm.

### Option 2: Use Custom Build Command

In Railway Settings → Build:
- **Custom Build Command**: `cd services/alchemy-whales && pnpm install && pnpm run build`
- **Start Command**: `cd services/alchemy-whales && node dist/index.js`

---

## 📋 Recommended Solution

**Best**: Use **Nixpacks** builder (Railway's auto-detection)
- ✅ Works with monorepos
- ✅ Auto-detects pnpm
- ✅ No Dockerfile needed

**Steps**:
1. Settings → Build → Builder → **Nixpacks**
2. Save
3. Wait for redeploy

---

## 🎉 That's It!

After switching to Nixpacks, Railway will:
- ✅ Auto-detect Node.js
- ✅ Use pnpm (if detected)
- ✅ Build successfully
- ✅ Deploy your service

**Most Important**: Change Builder from "Dockerfile" to "Nixpacks"! 🚀

