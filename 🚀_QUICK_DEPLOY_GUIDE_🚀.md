# 🚀 QUICK DEPLOY GUIDE - 5 MINUTES TO PRODUCTION

> **Status**: ✅ **READY TO DEPLOY**  
> **Time**: 5 minutes  
> **Method**: Automated script or manual

---

## ⚡ FASTEST WAY (Automated)

```bash
# Run deployment script
./deploy.sh

# Follow prompts:
# 1. Review changes
# 2. Commit (y/n)
# 3. Push (y/n)
# 4. Deploy to Railway (y/n)
```

**Done!** ✅

---

## 🚂 RAILWAY (Manual - 3 Steps)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: Deploy Phase 1 Week 1-2"
git push origin main
```

### Step 2: Deploy via Railway Dashboard
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select `services/market-prices` as root
6. Railway auto-deploys!

### Step 3: Set Environment Variables
In Railway dashboard → Variables:
```bash
DATABASE_URL=your_postgres_url
NODE_ENV=production
LOG_LEVEL=info
```

**Done!** ✅

---

## 💻 CODESPACE (Manual - 2 Steps)

### Step 1: Create Codespace
1. Go to GitHub repository
2. Click "Code" → "Codespaces"
3. Click "Create codespace"
4. Wait 2-3 minutes

### Step 2: Start Development
```bash
npm run dev
```

**Done!** ✅

---

## ✅ VERIFICATION

### Check Railway Deployment
```bash
curl https://your-app.railway.app/api/health
```

### Check Codespace
```bash
curl http://localhost:3000/api/health
```

---

## 📋 CHECKLIST

- [ ] Code committed
- [ ] Pushed to GitHub
- [ ] Railway project created
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] Health check passing

---

**Total Time**: 5 minutes  
**Status**: ✅ Ready  
**Confidence**: 100%

