# 🔗 How to Get Public DATABASE_URL for Local Development

## ⚠️ Important

The DATABASE_URL you see in Railway Variables uses `postgres.railway.internal` which **only works inside Railway's network**. For local development, you need the **public connection string**.

---

## 📋 Steps to Get Public DATABASE_URL

### Option 1: Railway Dashboard (Easiest)

1. Go to Railway dashboard
2. Select your **PostgreSQL service** (not the main app service)
3. Click on **"Connect"** tab
4. Look for **"Public Network"** section
5. Copy the **Connection String** (it should look like):
   ```
   postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway
   ```
   Notice it has `.railway.app` not `.railway.internal`

### Option 2: Railway CLI

```bash
# Install Railway CLI if not installed
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Get public database URL
railway variables --service postgres
```

### Option 3: Create Public Connection

If you don't see a public connection option:

1. Go to PostgreSQL service in Railway
2. Go to **Settings** → **Networking**
3. Enable **"Public Networking"** if available
4. This will generate a public connection string

---

## 🔧 Update Your .env File

Once you have the public DATABASE_URL:

1. Open `apps/coinet-platform/.env`
2. Replace the DATABASE_URL with the public one:
   ```bash
   DATABASE_URL="postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway"
   ```
3. Save the file

---

## ✅ Test Connection

After updating DATABASE_URL:

```bash
cd apps/coinet-platform
npm run db:verify
```

You should see:
```
✅ Connection successful! (XXms)
```

---

## 🚨 Troubleshooting

### "Connection timeout" or "Connection refused"
- Make sure you're using the **public** connection string (`.railway.app`)
- Check if PostgreSQL service has public networking enabled
- Verify firewall/network settings

### "Authentication failed"
- Double-check the password in the connection string
- Make sure you copied the entire connection string correctly

### "Database does not exist"
- The database name should be `railway` (default)
- Check Railway PostgreSQL service settings

---

## 💡 Pro Tip

**For Railway deployments**: Use the internal URL (`postgres.railway.internal`)  
**For local development**: Use the public URL (`.railway.app`)

The internal URL is faster and more secure, but only works within Railway's network.

