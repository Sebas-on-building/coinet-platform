# 🚀 Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd apps/coinet-platform
npm install
```

## Step 2: Generate Prisma Client

```bash
npm run db:generate
```

## Step 3: Set Up Environment Variables

Create a `.env` file in `apps/coinet-platform/`:

```bash
# Required
DATABASE_URL="postgresql://user:password@host:5432/database"
PORT=3000

# AI Service (at least one required)
XAI_API_KEY="your-grok-api-key"
# OR
OPENAI_API_KEY="sk-your-openai-key"

# Recommended (for full features)
COINGECKO_API_KEY="your-key"
COINGLASS_API_KEY="your-key"
CRYPTOPANIC_API_KEY="your-key"
CMC_API_KEY="your-key"

# External Services
MARKET_PRICES_URL="https://market-prices-production.up.railway.app"
ALCHEMY_WHALES_URL="https://alchemy-whales-production.up.railway.app"
```

### Getting DATABASE_URL from Railway

1. Go to Railway dashboard
2. Select your PostgreSQL service
3. Go to "Variables" tab
4. Copy the `DATABASE_URL` value
5. Paste it into your `.env` file

## Step 4: Verify Database Connection

```bash
npm run db:verify
```

You should see:
```
✅ Connection successful! (XXms)

📈 Database Statistics:
   Conversations: X
   Messages: X
   Unique Users: X
```

## Step 5: Create Your First Backup

```bash
npm run db:backup
```

This creates a backup in `backups/` directory.

---

## Troubleshooting

### "DATABASE_URL not set"
- Create `.env` file (see Step 3)
- Get DATABASE_URL from Railway dashboard
- Make sure `.env` is in `apps/coinet-platform/` directory

### "ts-node: command not found"
- Run `npm install` first
- Scripts now use `npx` which should work automatically

### "Connection failed"
- Verify DATABASE_URL is correct
- Check Railway PostgreSQL service is running
- Test connection: `psql $DATABASE_URL`

---

## Next Steps

- ✅ Install dependencies
- ✅ Generate Prisma client
- ✅ Set up environment variables
- ✅ Verify database connection
- ✅ Create first backup
- ✅ Read `PROJECT_CONTEXT.md` for project overview
- ✅ Read `BACKUP_STRATEGY.md` for backup details

