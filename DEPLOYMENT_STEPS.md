# 🚀 OmniScore v2.5.0 Deployment Steps

## ✅ Step 1: Create Migration Locally

**Run this locally** to generate the migration file:

```bash
cd apps/coinet-platform
npx prisma migrate dev --name add_omniscore_history
```

This will:
- ✅ Create the migration file in `prisma/migrations/`
- ✅ Apply it to your local database
- ✅ Generate the Prisma Client

**Commit the migration file**:
```bash
git add prisma/migrations/
git commit -m "feat: Add OmniScoreHistory table for temporal smoothing"
```

---

## 🚂 Step 2: Deploy to Railway

### Option A: Automatic (Recommended)

**Just push to GitHub** - Railway will auto-deploy:

```bash
git push origin main  # or your branch name
```

Railway will automatically:
1. ✅ Build your app
2. ✅ Run `npx prisma migrate deploy` (configured in `railway.json`)
3. ✅ Start your app

**Check deployment logs** in Railway dashboard to confirm migration ran.

### Option B: Manual Migration (if needed)

If you need to run migration manually:

1. **Via Railway Dashboard**:
   - Go to `coinet-platform` service
   - Click **"Deployments"** tab
   - Click **"..."** on latest deployment → **"Run Command"**
   - Enter: `npx prisma migrate deploy --schema=./prisma/schema.prisma`
   - Click **"Run"**

2. **Via Railway CLI**:
   ```bash
   railway run npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

---

## ⚙️ Step 3: Set Environment Variables in Railway

**DO NOT use `export` commands** - those are only for local testing.

**Set in Railway Dashboard**:

1. Go to Railway Dashboard → `coinet-platform` service
2. Click **"Variables"** tab
3. Click **"New Variable"** and add each:

### Initial Canary (5% rollout)

```
OMNISCORE_ROLLOUT_PERCENT=5
OMNISCORE_FAIL_CLOSED=true
OMNISCORE_SMOOTHING_PERSIST=true
OMNISCORE_METRICS_ENABLED=true
```

### After 24h monitoring → Increase to 25%

```
OMNISCORE_ROLLOUT_PERCENT=25
```

### After another 24h → Increase to 50%

```
OMNISCORE_ROLLOUT_PERCENT=50
```

### After final 24h → Full rollout

```
OMNISCORE_ROLLOUT_PERCENT=100
```

**Note**: Railway will automatically redeploy when you change variables.

---

## 📊 Step 4: Monitor Metrics

After deployment, check:

1. **Railway Logs**: Look for OmniScore calculation logs
2. **Metrics Endpoint** (if exposed): `/api/metrics` or similar
3. **Error Rates**: Monitor `omniscore_version_mismatch_total` (should be 0)
4. **Data Quality**: Monitor `omniscore_insufficient_data_total`

---

## 🔄 Rollback Plan

If issues occur:

1. **Quick Rollback**: Set `OMNISCORE_ROLLOUT_PERCENT=0` in Railway variables
2. **Full Rollback**: Revert to previous deployment in Railway dashboard
3. **Database Rollback**: 
   ```bash
   railway run npx prisma migrate resolve --rolled-back <migration_name>
   ```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Migration applied successfully (check Railway logs)
- [ ] `omniscore_history` table exists in database
- [ ] Environment variables set correctly
- [ ] Canary percentage working (5% of requests use new behavior)
- [ ] Metrics being collected
- [ ] No version mismatch errors
- [ ] No increase in error rates

---

## 🎯 Summary

**Local (one-time)**:
```bash
cd apps/coinet-platform
npx prisma migrate dev --name add_omniscore_history
git add prisma/migrations/
git commit -m "feat: Add OmniScoreHistory table"
git push
```

**Railway (automatic)**:
- Migrations run automatically on deploy ✅
- Set environment variables in dashboard ⚙️
- Monitor logs and metrics 📊
