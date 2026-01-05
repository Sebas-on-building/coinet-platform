# 🎯 Coinet Retention System - Setup Guide

## Overview

The Intelligence Ritual retention system is now fully implemented. This guide covers setup, migration, and deployment.

## ⚠️ Prisma Compatibility Issue

**Current Status:** Prisma 5.22.0 has compatibility issues with Node.js v22+

**Error:** `TypeError: (0 , import_debug.default) is not a function`

**Solutions:**

### Option 1: Downgrade Node.js (Recommended for now)
```bash
# Using nvm
nvm install 20
nvm use 20

# Then run
cd apps/coinet-platform
npm run db:generate
```

### Option 2: Upgrade Prisma (Future)
```bash
cd apps/coinet-platform
npm install prisma@latest @prisma/client@latest
npm run db:generate
```

## 📋 Setup Steps

### 1. Database Migration

After fixing the Prisma/Node compatibility issue:

```bash
# Generate Prisma client
cd apps/coinet-platform
npm run db:generate

# Create and run migration
npm run db:migrate

# Or apply the manual SQL migration
psql $DATABASE_URL < prisma/migrations/RETENTION_SYSTEM_MIGRATION.sql
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Retention System
CRON_SECRET=your-secure-cron-secret-key-here
RETENTION_ENABLED=true

# Optional: Override defaults
MAX_PUSH_NOTIFICATIONS_PER_DAY=2
MIN_NOTIFICATION_INTERVAL_HOURS=6
```

### 3. Install Dependencies (if using node-cron)

```bash
cd apps/coinet-platform
npm install node-cron @types/node-cron
```

### 4. Initialize Retention System

In your main `index.ts`:

```typescript
import { setupRetentionCronJobs } from './services/retention/cron-config';

// After app initialization
if (process.env.RETENTION_ENABLED === 'true') {
  setupRetentionCronJobs();
  console.log('✅ Retention system initialized');
}
```

## 🧪 Testing

### Test API Endpoints

```bash
# Set environment variables
export API_URL=http://localhost:3000
export TEST_USER_ID=your-test-user-id
export CRON_SECRET=your-cron-secret

# Run tests
cd apps/coinet-platform
ts-node scripts/test-retention-api.ts
```

### Manual API Testing

```bash
# Session start
curl -X GET "http://localhost:3000/api/retention/session-start?trigger=organic" \
  -H "x-user-id: test-user-123"

# Query completed
curl -X POST "http://localhost:3000/api/retention/query-completed" \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is BTC OmniScore?","symbols":["BTC"],"intent":"quick_answer"}'

# Get rewards
curl -X GET "http://localhost:3000/api/retention/rewards" \
  -H "x-user-id: test-user-123"

# Run scheduled job (requires CRON_SECRET)
curl -X POST "http://localhost:3000/api/retention/scheduled-jobs" \
  -H "x-cron-key: your-cron-secret" \
  -H "Content-Type: application/json" \
  -d '{"jobType":"hourly_maintenance"}'
```

## ⏰ Scheduled Jobs Setup

### Option 1: Node-Cron (Internal)

Already configured in `cron-config.ts`. Just call `setupRetentionCronJobs()` on app startup.

### Option 2: External Cron (Production)

Add to system crontab (`crontab -e`):

```cron
# Retention System Jobs
0 * * * * curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET" -H "Content-Type: application/json" -d '{"jobType":"hourly_maintenance"}'
0 6 * * * curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET" -H "Content-Type: application/json" -d '{"jobType":"morning_digest"}'
0 20 * * * curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET" -H "Content-Type: application/json" -d '{"jobType":"evening_ritual"}'
0 0 * * * curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET" -H "Content-Type: application/json" -d '{"jobType":"daily_metrics"}'
0 0 * * 0 curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET" -H "Content-Type: application/json" -d '{"jobType":"weekly_analysis"}'
```

### Option 3: Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: retention-hourly
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: retention-job
            image: your-app-image
            command:
            - curl
            - -X
            - POST
            - http://your-service/api/retention/scheduled-jobs
            - -H
            - "X-Cron-Key: $(CRON_SECRET)"
            - -H
            - "Content-Type: application/json"
            - -d
            - '{"jobType":"hourly_maintenance"}'
            env:
            - name: CRON_SECRET
              valueFrom:
                secretKeyRef:
                  name: retention-secrets
                  key: cron-secret
          restartPolicy: OnFailure
```

## 📊 Monitoring

### Check Metrics

```bash
curl http://localhost:3000/api/retention/metrics
```

### Check Failures

```bash
curl http://localhost:3000/api/retention/failures
```

### View Cron Job Status

```typescript
import { getCronJobStatus } from './services/retention/cron-config';
const status = getCronJobStatus();
console.log(status);
```

## 🔧 Troubleshooting

### Prisma Client Not Generated

**Symptom:** TypeScript errors about missing Prisma models

**Solution:** 
1. Fix Node.js/Prisma compatibility (see above)
2. Run `npm run db:generate`
3. Restart TypeScript server

### Database Tables Missing

**Symptom:** API returns 500 errors

**Solution:**
1. Run migration: `npm run db:migrate`
2. Or apply SQL manually: `psql $DATABASE_URL < prisma/migrations/RETENTION_SYSTEM_MIGRATION.sql`

### Scheduled Jobs Not Running

**Symptom:** No logs from cron jobs

**Solution:**
1. Check `RETENTION_ENABLED` env var is set
2. Verify `setupRetentionCronJobs()` is called
3. Check cron job status: `getCronJobStatus()`
4. For external cron, verify CRON_SECRET matches

### API Returns 401 Unauthorized

**Symptom:** Scheduled jobs endpoint returns 401

**Solution:**
1. Check `X-Cron-Key` header matches `CRON_SECRET` env var
2. Verify `CRON_SECRET` is set in environment

## 📚 API Documentation

See `apps/coinet-platform/src/api/retention/routes.ts` for full API documentation.

### Key Endpoints:

- `GET /api/retention/session-start` - Initialize session
- `POST /api/retention/query-completed` - Process query
- `GET /api/retention/notifications` - Get notifications
- `GET /api/retention/rewards` - Get rewards
- `GET /api/retention/ritual-card` - Get daily ritual card
- `POST /api/retention/investment/:action` - Record investment
- `GET /api/retention/lifecycle` - Get lifecycle state
- `GET /api/retention/metrics` - Get metrics (admin)
- `POST /api/retention/scheduled-jobs` - Run scheduled jobs (cron)

## ✅ Verification Checklist

- [ ] Prisma client generated successfully
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] API endpoints responding
- [ ] Scheduled jobs configured
- [ ] Test script passes
- [ ] Monitoring endpoints accessible

## 🎉 Next Steps

1. **Fix Prisma/Node compatibility** (see above)
2. **Run migrations** to create database tables
3. **Test API endpoints** using the test script
4. **Configure scheduled jobs** (internal or external cron)
5. **Monitor metrics** to track retention performance
6. **Iterate** based on user feedback and metrics

---

**Status:** ✅ System fully implemented, awaiting Prisma client generation and database migration.
