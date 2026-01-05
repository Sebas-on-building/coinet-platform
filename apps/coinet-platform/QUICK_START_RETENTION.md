# 🚀 Retention System Quick Start

## Current Status

✅ **Code Complete** - All retention system code is implemented  
⚠️ **Prisma Client** - Needs Node.js v20 or Prisma upgrade  
✅ **Migration SQL** - Ready to apply  
✅ **Cron Setup** - Integrated into main server  
✅ **API Routes** - All endpoints ready  

## Immediate Next Steps

### Option 1: Use Node.js v20 (Recommended)

```bash
# Install Node.js v20 using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install 20
nvm use 20

# Then run setup
cd apps/coinet-platform
./scripts/setup-retention.sh
```

### Option 2: Upgrade Prisma (Alternative)

```bash
cd apps/coinet-platform
npm install prisma@latest @prisma/client@latest --save-dev --save
npm run db:generate
npm run db:migrate
```

### Option 3: Apply SQL Migration Directly

If you have database access but Prisma isn't working:

```bash
# Set your database URL
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Apply migration
cd apps/coinet-platform
psql $DATABASE_URL < prisma/migrations/RETENTION_SYSTEM_MIGRATION.sql
```

## Environment Setup

Add to your `.env` file:

```env
# Retention System
RETENTION_ENABLED=true
CRON_SECRET=your-secure-random-secret-key-here

# Optional overrides
MAX_PUSH_NOTIFICATIONS_PER_DAY=2
MIN_NOTIFICATION_INTERVAL_HOURS=6
```

## Verify Installation

1. **Check Prisma Client:**
   ```bash
   cd apps/coinet-platform
   npm run db:generate
   # Should complete without errors
   ```

2. **Check Database Tables:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND (table_name LIKE '%Retention%' 
        OR table_name LIKE '%UserSession%' 
        OR table_name LIKE '%MarketRegime%');
   ```
   Should return 12 tables.

3. **Start Server:**
   ```bash
   npm run dev
   ```
   Look for: `✅ Retention system initialized with cron jobs`

4. **Test API:**
   ```bash
   curl http://localhost:3000/api/retention/session-start \
     -H "x-user-id: test-user-123"
   ```

## Cron Jobs

Cron jobs are automatically set up when `RETENTION_ENABLED=true`.

**Schedule:**
- **Hourly:** Trigger evaluation, rewards, failure detection
- **6am Daily:** Morning digest generation
- **8pm Daily:** Evening ritual generation  
- **Midnight Daily:** Metrics calculation, lifecycle updates
- **Sunday Midnight:** A/B test analysis, cohort retention

**Manual Trigger:**
```bash
curl -X POST http://localhost:3000/api/retention/scheduled-jobs \
  -H "x-cron-key: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"jobType":"hourly_maintenance"}'
```

## Testing

Run the test script:
```bash
export API_URL=http://localhost:3000
export TEST_USER_ID=test-user-123
export CRON_SECRET=your-cron-secret
npx ts-node scripts/test-retention-api.ts
```

## Troubleshooting

### Prisma Generate Fails
- **Error:** `TypeError: (0 , import_debug.default) is not a function`
- **Solution:** Use Node.js v20 or upgrade Prisma to v6+

### Migration Fails
- Check `DATABASE_URL` is correct
- Ensure database user has CREATE TABLE permissions
- Try applying SQL migration directly

### Cron Jobs Not Running
- Check `RETENTION_ENABLED=true` in `.env`
- Verify server logs show "Retention system initialized"
- Check cron job status in logs

### API Returns 500
- Check Prisma client was generated
- Verify database tables exist
- Check server logs for errors

## Files Created

- ✅ `prisma/migrations/RETENTION_SYSTEM_MIGRATION.sql` - Database migration
- ✅ `services/retention/*` - All retention services (10 files)
- ✅ `api/retention/routes.ts` - API endpoints
- ✅ `scripts/setup-retention.sh` - Setup script
- ✅ `scripts/test-retention-api.ts` - Test script
- ✅ `services/retention/SETUP.md` - Detailed setup guide

## Support

See `services/retention/SETUP.md` for detailed documentation.

---

**Status:** Ready for deployment after Prisma client generation! 🎉
