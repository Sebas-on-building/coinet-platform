# 🚀 Vercel Frontend Deployment Setup

## Critical Configuration Required

### Step 1: Set Root Directory in Vercel Dashboard

**This MUST be done in Vercel Dashboard - code changes won't fix it!**

1. Go to **Vercel Dashboard** → Your Project (`coinet-platform-client-web`)
2. Click **Settings** tab
3. Scroll to **General** section
4. Find **Root Directory** field
5. Click **Edit** or **Add Root Directory**
6. Set it to exactly: `apps/client-web`
7. Click **Save**

### Step 2: Verify Build Settings

After setting Root Directory, Vercel should auto-detect:
- ✅ **Framework**: Vite
- ✅ **Build Command**: `npm run build` (auto-detected)
- ✅ **Output Directory**: `dist` (auto-detected)
- ✅ **Install Command**: `npm install` (auto-detected)

### Step 3: Environment Variables

In Vercel Dashboard → **Settings** → **Environment Variables**, set:

```bash
VITE_API_URL=https://api.coinet.ai
```

### Step 4: Verify Deployment

After configuration:
1. Vercel will auto-redeploy
2. Check build logs - should show:
   ```
   ✓ Installing dependencies...
   ✓ Running build: npm run build
   ✓ Build completed
   ```
3. Test `https://app.coinet.ai/auth` - should load auth page

## What the vercel.json Does

The `apps/client-web/vercel.json` file handles:
- ✅ **Client-side routing**: Rewrites all routes to `/index.html` for React Router
- ✅ **Security headers**: Adds security headers to all responses
- ✅ **Framework detection**: Tells Vercel this is a Vite app

**It does NOT**:
- ❌ Set root directory (must be done in dashboard)
- ❌ Set build commands (Vercel auto-detects from package.json)

## Troubleshooting

### Build fails with "No such file or directory"
- **Cause**: Root Directory not set in Vercel dashboard
- **Fix**: Set Root Directory to `apps/client-web` in dashboard

### 404 errors on routes
- **Cause**: `vercel.json` rewrites not working
- **Fix**: Ensure `vercel.json` is in `apps/client-web/` directory

### API calls fail
- **Cause**: `VITE_API_URL` not set
- **Fix**: Set environment variable in Vercel dashboard
