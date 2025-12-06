# 🔍 How to Find PostgreSQL DATABASE_URL in Railway

## 📍 Where to Look

The DATABASE_URL is in the **PostgreSQL service**, NOT in the `coinet-platform` service.

---

## 🎯 Step-by-Step Instructions

### Step 1: Go Back to Railway Dashboard

From the `coinet-platform` service settings page:
- Click **"← Back"** or the **Railway logo** at the top
- This takes you to your project dashboard

### Step 2: Find PostgreSQL Service

In your project dashboard, you should see multiple services:
- `coinet-platform` (your app)
- `Postgres` or `PostgreSQL` (your database) ← **This is what you need!**

### Step 3: Click on PostgreSQL Service

Click on the **PostgreSQL service** card/tile

### Step 4: Go to "Connect" Tab

Once in the PostgreSQL service:
- Click on the **"Connect"** tab (usually at the top)
- You'll see connection options

### Step 5: Get Public Connection String

Look for **"Public Network"** section:
- You'll see a connection string like:
  ```
  postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway
  ```
- **Copy this entire string** (it should have `.railway.app` not `.railway.internal`)

---

## 🖼️ Visual Guide

```
Railway Dashboard
├── coinet-platform (your app) ← You're here
└── Postgres (database) ← Go here!
    └── Connect tab
        └── Public Network
            └── Connection String ← Copy this!
```

---

## ⚠️ Important Notes

### Internal vs Public URL

**Internal URL** (what you saw in Variables):
```
postgresql://...@postgres.railway.internal:5432/railway
```
- ✅ Works inside Railway (for your deployed app)
- ❌ Does NOT work from your local machine

**Public URL** (what you need for local dev):
```
postgresql://...@containers-us-west-XXX.railway.app:5432/railway
```
- ✅ Works from anywhere (including your local machine)
- ✅ Use this for `npm run db:verify` and `npm run db:backup`

---

## 🔧 Alternative: Use Railway CLI

If you can't find the public connection string:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Get database URL (will show public URL)
railway variables --service postgres
```

---

## ✅ After Getting the URL

1. **Update your `.env` file**:
   ```bash
   cd apps/coinet-platform
   nano .env  # or use your preferred editor
   ```

2. **Replace DATABASE_URL**:
   ```bash
   DATABASE_URL="postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway"
   ```

3. **Test connection**:
   ```bash
   npm run db:verify
   ```

---

## 🚨 Can't Find Public Connection?

If you don't see a "Public Network" option:

1. Go to PostgreSQL service → **Settings**
2. Look for **"Networking"** section
3. Enable **"Public Networking"** if available
4. This will generate a public connection string

---

## 💡 Quick Summary

1. **Go back** to Railway dashboard (click back button)
2. **Find** PostgreSQL service (separate from coinet-platform)
3. **Click** on PostgreSQL service
4. **Go to** "Connect" tab
5. **Copy** Public Network connection string
6. **Paste** into your `.env` file

That's it! 🎉

