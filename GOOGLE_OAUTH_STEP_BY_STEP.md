# Google OAuth Setup - Step by Step (No API Needed!)

## ✅ Correct Steps (Updated)

**You DON'T need to enable Google+ API!** OAuth 2.0 works without it.

### Step 1: Create/Select Project
1. In Google Cloud Console, click the project dropdown (top bar)
2. Click **"New Project"** or select existing
3. Name: `Coinet AI`
4. Click **"Create"**

### Step 2: Configure OAuth Consent Screen
1. In the left menu, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** → Click **"Create"**
3. Fill in:
   - **App name**: `Coinet AI`
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **"Save and Continue"**
5. **Scopes**: Click **"Add or Remove Scopes"**
   - Search for: `userinfo.email`
   - Search for: `userinfo.profile`
   - Select both → Click **"Update"**
   - Click **"Save and Continue"**
6. **Test users**: Add your email → **"Save and Continue"**
7. **Summary**: Review → Click **"Back to Dashboard"**

### Step 3: Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"** (left menu)
2. Click **"+ CREATE CREDENTIALS"** (top)
3. Select **"OAuth client ID"**
4. If prompted, choose **"Web application"**
5. Fill in:
   - **Name**: `Coinet AI Web`
   - **Authorized redirect URIs**: Click **"+ ADD URI"**
   - Add: `https://api.coinet.ai/auth/google/callback`
   - (For local dev, also add: `http://localhost:3000/auth/google/callback`)
6. Click **"Create"**
7. **IMPORTANT**: Copy these values immediately:
   - **Your Client ID**: `xxxxx.apps.googleusercontent.com` ← `GOOGLE_CLIENT_ID`
   - **Your Client secret**: `GOCSPX-xxxxx` ← `GOOGLE_CLIENT_SECRET`
   - ⚠️ You can't see the secret again!

### Step 4: Add to Railway
1. Go to Railway Dashboard → Your service
2. **Variables** tab
3. Add:
   ```
   GOOGLE_CLIENT_ID = [paste your Client ID]
   GOOGLE_CLIENT_SECRET = [paste your Client secret]
   ```
4. Save → Railway will auto-deploy

## 🎯 That's It!

You don't need to enable any APIs. OAuth 2.0 works directly with the credentials.

## ⚠️ Common Mistakes

- ❌ Don't enable Google+ API (deprecated, not needed)
- ✅ Just create OAuth credentials (Step 3 above)
- ✅ Make sure redirect URI matches exactly: `https://api.coinet.ai/auth/google/callback`
