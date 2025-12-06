# ✅ Production Setup Checklist - app.coinet.ai

**Ensure your production deployments run 24/7 independently of your Mac**

---

## 🎯 Critical Configuration

### 1. Railway Backend Configuration

**Location**: Railway Dashboard → `coinet-platform` service

**Required Settings**:
- ✅ **Root Directory**: `apps/coinet-platform`
- ✅ **Build Command**: Auto-detected (from `railway.json`)
- ✅ **Start Command**: Auto-detected (from `railway.json`)
- ✅ **Health Check**: `/api/health`
- ✅ **Auto-Deploy**: Enabled (GitHub integration)

**Required Environment Variables**:
```bash
DATABASE_URL=postgresql://...          # ✅ From PostgreSQL service
PORT=3000                              # ✅ Auto-set by Railway
XAI_API_KEY=...                        # ⚠️ Optional (for AI features)
COINGECKO_API_KEY=...                  # ⚠️ Optional (better rate limits)
COINGLASS_API_KEY=...                  # ⚠️ Optional (liquidation data)
MARKET_PRICES_URL=https://...          # ✅ External service URL
ALCHEMY_WHALES_URL=https://...         # ✅ External service URL
```

**How to Verify**:
1. Railway Dashboard → Service → **Settings**
2. Check **Root Directory** = `apps/coinet-platform`
3. Check **Environment Variables** tab → All variables set
4. Check **Deployments** tab → Latest deployment "Active"

---

### 2. Vercel Frontend Configuration

**Location**: Vercel Dashboard → Your project

**Required Settings**:
- ✅ **Root Directory**: `apps/client-web`
- ✅ **Framework Preset**: Vite
- ✅ **Build Command**: `npm run build` (auto-detected)
- ✅ **Output Directory**: `dist` (auto-detected)
- ✅ **Auto-Deploy**: Enabled (GitHub integration)

**Required Environment Variables**:
```bash
VITE_API_URL=https://your-railway-backend.railway.app
```

**Critical**: This MUST be your Railway backend URL!

**Custom Domain**:
- ✅ **Domain**: `app.coinet.ai`
- Configured in Vercel Dashboard → **Domains** tab

**How to Verify**:
1. Vercel Dashboard → Project → **Settings**
2. Check **Root Directory** = `apps/client-web`
3. Check **Environment Variables** → `VITE_API_URL` set to Railway backend
4. Check **Domains** → `app.coinet.ai` listed
5. Check **Deployments** → Latest deployment "Ready"

---

## 🔍 Quick Verification Steps

### Step 1: Check Railway Backend

```bash
# Get your Railway URL from dashboard, then test:
curl https://your-railway-url.railway.app/api/health
```

**Expected**: `{"ok":true,"service":"coinet-platform"...}`

**If failed**:
- Check Railway Dashboard → Logs
- Verify environment variables
- Check deployment status

### Step 2: Check Vercel Frontend

1. **Open**: https://app.coinet.ai
2. **Check**: Page loads (chat interface)
3. **Test**: Send a message (should connect to backend)

**If failed**:
- Check Vercel Dashboard → Deployments → Logs
- Verify `VITE_API_URL` environment variable
- Check domain configuration

### Step 3: Test Full Flow

1. Open https://app.coinet.ai
2. Send message: "What is the price of BTC?"
3. Should get response from Railway backend

---

## 🚨 Common Issues & Fixes

### Issue: Frontend can't connect to backend

**Symptoms**:
- Frontend loads but chat doesn't work
- Network errors in browser console
- CORS errors

**Fix**:
1. **Verify `VITE_API_URL`** in Vercel:
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Must be: `https://your-railway-url.railway.app`
   - **No trailing slash!**

2. **Redeploy Frontend**:
   - Vercel Dashboard → Deployments → Latest → "Redeploy"
   - Or push to GitHub (triggers auto-deploy)

3. **Check CORS**:
   - Railway backend CORS already configured for `app.coinet.ai`
   - Should work automatically

### Issue: Backend not responding

**Symptoms**:
- Health endpoint returns error
- 503 Service Unavailable
- Connection timeout

**Fix**:
1. **Check Railway Logs**:
   - Railway Dashboard → Service → Logs
   - Look for errors or crashes

2. **Verify Environment Variables**:
   - Railway Dashboard → Service → Variables
   - Check `DATABASE_URL` is set correctly

3. **Restart Service**:
   - Railway Dashboard → Service → Settings → "Restart"

### Issue: Domain not working

**Symptoms**:
- `app.coinet.ai` shows 404 or doesn't load

**Fix**:
1. **Check Vercel Domain Configuration**:
   - Vercel Dashboard → Project → Domains
   - Verify `app.coinet.ai` is added
   - Check DNS records (should be auto-configured)

2. **Verify DNS**:
   - Domain should point to Vercel
   - Vercel auto-configures DNS when domain added

---

## 📋 Production Deployment Checklist

### Before First Deploy

- [ ] Railway project created
- [ ] PostgreSQL service added to Railway
- [ ] Backend service configured (root: `apps/coinet-platform`)
- [ ] All environment variables set in Railway
- [ ] Vercel project created
- [ ] Frontend service configured (root: `apps/client-web`)
- [ ] `VITE_API_URL` set in Vercel (points to Railway backend)
- [ ] Domain `app.coinet.ai` added to Vercel
- [ ] GitHub integration enabled (auto-deploy)

### After Deploy

- [ ] Railway backend health check passes
- [ ] Vercel frontend loads at `app.coinet.ai`
- [ ] Frontend can connect to backend
- [ ] Chat messages work end-to-end
- [ ] Database connection verified (45 conversations, 98 messages)

---

## 🎯 Key Points

✅ **Both services run 24/7** - Independent of your Mac  
✅ **Auto-deploy enabled** - Pushes to GitHub trigger deployments  
✅ **Health monitoring** - Both platforms monitor service health  
✅ **Auto-restart** - Services restart automatically on failure  

**Your production is cloud-based and always running!** 🚀

---

## 📞 Quick Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Production App**: https://app.coinet.ai
- **GitHub Repo**: https://github.com/Sebas-on-building/coinet-platform

---

## 🔧 Manual Deployment (If Needed)

### Railway Backend

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
cd apps/coinet-platform
railway link

# Deploy
railway up
```

### Vercel Frontend

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd apps/client-web
vercel --prod
```

---

**Everything is configured for production!** Just verify in dashboards that deployments are active. 🎉

