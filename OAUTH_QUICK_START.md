# 🚀 Quick Start: Get OAuth Credentials

## Step 1: Google OAuth Setup (5 minutes)

### 1.1 Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click **"Select a project"** → **"New Project"**
3. Name: `Coinet AI` → Click **"Create"**

### 1.2 Enable Google+ API
1. Go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"**
3. Click **"Enable"**

### 1.3 Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** → Click **"Create"**
3. Fill in:
   - **App name**: `Coinet AI`
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **"Save and Continue"**
5. **Scopes**: Click **"Add or Remove Scopes"**
   - Select: `.../auth/userinfo.email`
   - Select: `.../auth/userinfo.profile`
   - Click **"Update"** → **"Save and Continue"**
6. **Test users**: Add your email → **"Save and Continue"**
7. **Summary**: Click **"Back to Dashboard"**

### 1.4 Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. **Application type**: `Web application`
4. **Name**: `Coinet AI Web`
5. **Authorized redirect URIs**: Add:
   ```
   https://api.coinet.ai/auth/google/callback
   ```
6. Click **"Create"**
7. **Copy these values:**
   - **Client ID**: `xxxxx.apps.googleusercontent.com` ← This is `GOOGLE_CLIENT_ID`
   - **Client secret**: `GOCSPX-xxxxx` ← This is `GOOGLE_CLIENT_SECRET`

---

## Step 2: GitHub OAuth Setup (3 minutes)

### 2.1 Create GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `Coinet AI`
   - **Homepage URL**: `https://app.coinet.ai`
   - **Authorization callback URL**: `https://api.coinet.ai/auth/github/callback`
4. Click **"Register application"**

### 2.2 Get Credentials
1. You'll see:
   - **Client ID**: `xxxxx` ← This is `GITHUB_CLIENT_ID`
2. Click **"Generate a new client secret"**
   - **Client secret**: `xxxxx` ← This is `GITHUB_CLIENT_SECRET`
   - ⚠️ **Copy this immediately** - you can't see it again!

---

## Step 3: Add to Railway

1. Go to Railway Dashboard → Your `coinet-platform` service
2. Click **"Variables"** tab
3. Click **"+ New Variable"** for each:

```
GOOGLE_CLIENT_ID = xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = GOCSPX-xxxxx
GITHUB_CLIENT_ID = xxxxx
GITHUB_CLIENT_SECRET = xxxxx
```

4. Click **"Deploy"** or wait for auto-deploy

---

## ✅ Verify It Works

1. Visit: https://app.coinet.ai/auth
2. Click **"Google"** or **"GitHub"** button
3. Should redirect to OAuth provider (not show error)

---

## 🔧 Troubleshooting

### "OAUTH_NOT_CONFIGURED" error
- Check Railway variables are set correctly
- Restart Railway service after adding variables

### "redirect_uri_mismatch" (Google)
- Verify callback URL in Google Console matches exactly:
  - `https://api.coinet.ai/auth/google/callback`
- No trailing slashes!

### "redirect_uri_mismatch" (GitHub)
- Verify callback URL in GitHub settings matches exactly:
  - `https://api.coinet.ai/auth/github/callback`

### Still not working?
- Check Railway deployment logs for errors
- Verify environment variables are visible in Railway dashboard
- Ensure OAuth apps are not in "testing" mode (Google) or have proper scopes
