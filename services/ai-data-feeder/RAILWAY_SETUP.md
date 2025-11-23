# 🚂 Railway Deployment Setup

## ⚠️ Current Issue

Railway can't find `services/ai-data-feeder` because the build context doesn't match.

## ✅ Solution: Choose ONE approach

### Option 1: Root Directory = `services/ai-data-feeder` (Recommended)

**Railway Settings:**
- **Root Directory**: `services/ai-data-feeder`
- **Dockerfile Path**: `Dockerfile` (default)

**What happens:**
- Railway builds from `services/ai-data-feeder/`
- Dockerfile copies `../market-prices` (sibling directory)
- Works with current `Dockerfile`

---

### Option 2: Root Directory = `/` (Repo Root)

**Railway Settings:**
- **Root Directory**: `/` (empty or root)
- **Dockerfile Path**: `services/ai-data-feeder/Dockerfile.root`

**What happens:**
- Railway builds from repo root
- Dockerfile copies `services/market-prices` and `services/ai-data-feeder`
- Rename `Dockerfile.root` to `Dockerfile` first

---

## 🎯 Recommended: Option 1

**Steps:**

1. Railway → Service → **Settings**
2. **Root Directory**: `services/ai-data-feeder`
3. **Dockerfile Path**: `Dockerfile` (or leave empty)
4. **Save** → **Redeploy**

That's it! ✅

---

## 🔍 How to Check Current Settings

Railway → Service → **Settings** → Scroll to **"Root Directory"**

- If it says `services/ai-data-feeder` → Use current `Dockerfile` ✅
- If it's empty or `/` → Use `Dockerfile.root` (rename it first)

---

## 📝 Quick Fix Command

If you want to switch to repo root approach:

```bash
cd services/ai-data-feeder
mv Dockerfile Dockerfile.service
mv Dockerfile.root Dockerfile
git add Dockerfile Dockerfile.service
git commit -m "Switch to root-based Dockerfile"
git push
```

Then set Railway Root Directory to `/` (empty).

---

**Current Dockerfile works when Root Directory = `services/ai-data-feeder`** ✅

