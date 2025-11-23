# 🗄️ Railway PostgreSQL Database Setup Guide

## 🎯 Quick Summary

1. **Add PostgreSQL** → Click "+ New" → "Database" → "Add PostgreSQL"
2. **Share DATABASE_URL** → PostgreSQL service → Variables → Share with `coinet-platform`
3. **Run Migrations** → `coinet-platform` service → Deployments → Run Command → `npx prisma migrate deploy --schema=./prisma/schema.prisma`
4. **Verify** → Check `/api/health` endpoint

---

## Step-by-Step Instructions

### 1. Add PostgreSQL Database Service in Railway

1. **Go to your Railway project dashboard**
   - Navigate to: https://railway.app/dashboard
   - Select your project (the one containing `coinet-platform`)

2. **Add a new service**
   - Click the **"+ New"** button (top right)
   - Select **"Database"** from the dropdown
   - Choose **"Add PostgreSQL"**

3. **Wait for database provisioning**
   - Railway will automatically provision a PostgreSQL database
   - This takes ~30-60 seconds
   - You'll see a new service card appear in your project

### 2. Connect Database to coinet-platform Service

Railway automatically creates a `DATABASE_URL` environment variable when you add a PostgreSQL database. However, you need to **share** it with your `coinet-platform` service:

1. **Open the PostgreSQL service**
   - Click on the PostgreSQL service card in your project

2. **Go to Variables tab**
   - Click on the **"Variables"** tab in the PostgreSQL service

3. **Find DATABASE_URL**
   - You'll see `DATABASE_URL` listed (it's automatically created)
   - Click the **"..."** menu (three dots) next to `DATABASE_URL`
   - Select **"Add to Service"** or **"Share Variable"**

4. **Select coinet-platform service**
   - A dialog will appear showing all services in your project
   - Check the box next to **"coinet-platform"**
   - Click **"Add"** or **"Confirm"**

### 3. Verify Connection

After sharing the variable, Railway will automatically redeploy your `coinet-platform` service with the new `DATABASE_URL`.

1. **Check deployment logs**
   - Go to the `coinet-platform` service
   - Click on **"Deployments"** tab
   - View the latest deployment logs
   - You should see: `✅ Database connected` instead of the warning

2. **Test the health endpoint**
   - Visit: `https://your-service.railway.app/api/health`
   - The response should show:
     ```json
     {
       "ok": true,
       "database": {
         "healthy": true,
         "configured": true
       }
     }
     ```

### 4. Run Database Migrations

**Option A: Via Railway Web Interface (Recommended)**

1. **Go to coinet-platform service**
   - Click on the `coinet-platform` service card

2. **Open Deployments tab**
   - Click on **"Deployments"** tab
   - Find the latest deployment (should be active/green)

3. **Run migration command**
   - Click the **"..."** menu (three dots) on the deployment card
   - Select **"Run Command"** or **"Execute Command"**
   - Enter: `npx prisma migrate deploy --schema=./prisma/schema.prisma`
   - Click **"Run"**

4. **Verify migration**
   - Check the command output
   - You should see: `✅ Applied migration: xxxxxx`

**Option B: Via Railway CLI**

1. **Install Railway CLI** (if not installed):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and link project**:
   ```bash
   railway login
   railway link
   ```

3. **Run migrations**:
   ```bash
   cd apps/coinet-platform
   railway run npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

**Option C: Using Setup Script**

1. **Run the setup script**:
   ```bash
   cd apps/coinet-platform
   railway run bash setup-database.sh
   ```

   This script will:
   - Verify DATABASE_URL is set
   - Generate Prisma Client
   - Run migrations
   - Verify database connection

### Alternative: Manual Variable Setup

If you prefer to set the variable manually:

1. **Get the DATABASE_URL**
   - Go to PostgreSQL service → **Variables** tab
   - Copy the `DATABASE_URL` value (it looks like: `postgresql://user:password@host:port/database`)

2. **Add to coinet-platform service**
   - Go to `coinet-platform` service → **Variables** tab
   - Click **"+ New Variable"**
   - Name: `DATABASE_URL`
   - Value: Paste the connection string
   - Click **"Add"**

## ✅ Verification Checklist

- [ ] PostgreSQL service added to Railway project
- [ ] `DATABASE_URL` variable shared with `coinet-platform` service
- [ ] `coinet-platform` service redeployed successfully
- [ ] Health check shows `database.healthy: true`
- [ ] No more `DATABASE_URL not configured` warnings in logs
- [ ] Database migrations run (if needed)

## 🔍 Troubleshooting

### Issue: "Database connection failed"
- **Check**: Is `DATABASE_URL` shared correctly?
- **Solution**: Verify the variable exists in `coinet-platform` service variables

### Issue: "Health check timeout"
- **Check**: Is the database service running?
- **Solution**: Ensure PostgreSQL service is active (green status)

### Issue: "Prisma schema not found"
- **Check**: Is `prisma/schema.prisma` in the correct location?
- **Solution**: Verify the file exists at `apps/coinet-platform/prisma/schema.prisma`

### Issue: "Migration failed"
- **Check**: Database permissions
- **Solution**: Railway's PostgreSQL databases have full permissions by default, so this is rare

## 📊 Database Schema Overview

Your Prisma schema includes:
- **Conversations & Messages**: Chat history storage
- **Agents**: AI agent configurations
- **Alerts**: User alert configurations
- **Insights**: AI-generated insights
- **UserPreferences**: User settings

All tables will be created automatically when you run migrations.

## 🚀 Next Steps

After database is connected:
1. Run migrations to create tables
2. Test the chat API to verify database writes
3. Check `/api/status` endpoint for database stats
4. Monitor database usage in Railway dashboard

