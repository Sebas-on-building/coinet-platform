# ✅ Verify Production Deployments - app.coinet.ai

**Quick guide to verify your production deployments are running 24/7**

---

## 🎯 What You Need to Check

### 1. Railway Backend (Runs 24/7)

**Dashboard**: https://railway.app/dashboard

**Check**:
1. Go to `coinet-platform` project
2. Click on `coinet-platform` service
3. **Deployments** tab → Latest should be "Active" (green)
4. **Logs** tab → Should show server running
5. **Settings** → **Networking** → Should have public domain

**Test**:
```bash
# Replace with your actual Railway URL
curl https://your-railway-url.railway.app/api/health
```

**Expected**: `{"ok":true,"service":"coinet-platform"...}`

---

### 2. Vercel Frontend (Runs 24/7)

**Dashboard**: https://vercel.com/dashboard

**Check**:
1. Go to your project (likely `coinet-platform` or `client-web`)
2. **Deployments** tab → Latest should be "Ready" (green)
3. **Domains** tab → `app.coinet.ai` should be listed
4. **Settings** → **Environment Variables** → `VITE_API_URL` should be set

**Test**:
- Open: https://app.coinet.ai
- Should load chat interface
- Try sending a message

---

## 🚀 Quick Verification Script

Run this script to test both:

```bash
# Set your URLs (if different from defaults)
export RAILWAY_BACKEND_URL="https://your-railway-url.railway.app"
export VERCEL_FRONTEND_URL="https://app.coinet.ai"

# Run verification
./verify-production.sh
```

Or test manually:

```bash
# Backend health
curl https://your-railway-url.railway.app/api/health

# Backend status
curl https://your-railway-url.railway.app/api/status

# Frontend
curl https://app.coinet.ai
```

---

## ✅ Production Checklist

### Railway Backend
- [ ] Service deployed and active
- [ ] Health endpoint responding
- [ ] Database connected
- [ ] Environment variables set
- [ ] Auto-deploy enabled (GitHub integration)

### Vercel Frontend
- [ ] Project deployed and ready
- [ ] Domain `app.coinet.ai` configured
- [ ] Environment variable `VITE_API_URL` set to Railway backend
- [ ] Auto-deploy enabled (GitHub integration)
- [ ] Frontend loads at https://app.coinet.ai

---

## 🔧 If Something Isn't Working

### Backend Not Responding

1. **Check Railway Logs**:
   - Railway Dashboard → Service → Logs
   - Look for errors or crashes

2. **Common Fixes**:
   - Missing `DATABASE_URL` → Add in Railway Settings
   - Build failed → Check build logs
   - Service crashed → Check logs, restart service

3. **Trigger Redeploy**:
   - Push to GitHub (triggers auto-deploy)
   - Or Railway Dashboard → Deployments → "Redeploy"

### Frontend Not Loading

1. **Check Vercel Logs**:
   - Vercel Dashboard → Project → Deployments → Latest → Logs

2. **Common Fixes**:
   - Missing `VITE_API_URL` → Add in Vercel Environment Variables
   - Build failed → Check build logs
   - Domain not configured → Add in Vercel Domains

3. **Trigger Redeploy**:
   - Push to GitHub (triggers auto-deploy)
   - Or Vercel Dashboard → Deployments → "Redeploy"

---

## 📊 Production URLs Reference

### Backend (Railway)
- **Health**: `https://your-railway-url.railway.app/api/health`
- **Status**: `https://your-railway-url.railway.app/api/status`
- **Diagnostic**: `https://your-railway-url.railway.app/api/diagnostic?symbol=BTC`
- **Chat API**: `https://your-railway-url.railway.app/api/chat`

### Frontend (Vercel)
- **Main App**: https://app.coinet.ai
- **Should connect to**: Railway backend URL

---

## 🎯 Key Points

✅ **Both run 24/7** - Independent of your Mac  
✅ **Auto-deploy** - Pushes to GitHub trigger deployments  
✅ **Health checks** - Both platforms monitor service health  
✅ **Auto-restart** - Services restart automatically on failure  

**Your production is cloud-based and always running!** 🚀

---

## 📞 Quick Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Production App**: https://app.coinet.ai
- **GitHub Repo**: https://github.com/Sebas-on-building/coinet-platform

