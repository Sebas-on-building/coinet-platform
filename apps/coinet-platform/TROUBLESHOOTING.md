# 🔧 Troubleshooting Guide

## Issue: Server Stuck/Hanging on Startup

### Symptom
Running `pnpm dev` compiles successfully but then hangs or doesn't start.

### Cause
Most common cause: **Missing or invalid DATABASE_URL** causing Prisma to hang while trying to connect.

### Solutions

#### 1. Check DATABASE_URL

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# If empty, set it in .env file
```

#### 2. Create .env file

```bash
cd apps/coinet-platform
cp .env.example .env
```

Edit `.env` and set:

```bash
# For local development (if you have PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/coinet?schema=public"

# OR for testing without database (server will start but DB features disabled)
# Just leave it empty or comment it out
# DATABASE_URL=""
```

#### 3. For Quick Testing (No Database)

If you just want to test the server without database:

1. Comment out or remove `DATABASE_URL` from `.env`
2. The server will start but show warnings
3. Chat API endpoints may not work without DB

#### 4. Install Missing Dependencies

```bash
cd apps/coinet-platform
pnpm install
```

Make sure these are installed:
- `ts-node` (for dev script)
- `@prisma/client` 
- `prisma` (dev dependency)

#### 5. Generate Prisma Client

```bash
pnpm db:generate
```

This creates the Prisma client from schema.

#### 6. Check Port Availability

Make sure port 3000 is not in use:

```bash
# Check what's using port 3000
lsof -i :3000

# Or use a different port
PORT=3001 pnpm dev
```

---

## Issue: Database Connection Errors

### Error: `Can't reach database server`

**Solution**: Make sure PostgreSQL is running:
```bash
# macOS with Homebrew
brew services start postgresql

# Or check if running
pg_isready
```

### Error: `P1001: Can't reach database server at...`

**Solution**: Check your DATABASE_URL format:
```
# Correct format
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA

# Example
postgresql://postgres:password@localhost:5432/coinet?schema=public
```

---

## Issue: TypeScript Compilation Errors

### Error: `Cannot find module '@prisma/client'`

**Solution**:
```bash
pnpm db:generate
```

This generates the Prisma client from your schema.

### Error: `Cannot find module './db/client'`

**Solution**: Make sure all files are in the right place:
```bash
# Verify structure
ls -la src/db/
ls -la src/services/
ls -la src/api/chat/
```

---

## Issue: Module Not Found Errors

### Error: `Cannot find module 'zod'` or other dependencies

**Solution**:
```bash
# Install all dependencies
pnpm install

# If using pnpm workspace (monorepo)
cd ../..  # Go to root
pnpm install
```

---

## Quick Debug Steps

1. **Check environment**:
   ```bash
   echo $NODE_ENV
   echo $DATABASE_URL
   echo $PORT
   ```

2. **Verify file structure**:
   ```bash
   cd apps/coinet-platform
   ls -la src/
   ```

3. **Check logs**:
   Look for any error messages in the terminal output.

4. **Start with minimal config**:
   ```bash
   # Create minimal .env
   echo "PORT=3000" > .env
   pnpm dev
   ```

5. **Test database connection separately**:
   ```bash
   # If DATABASE_URL is set, test connection
   psql $DATABASE_URL -c "SELECT 1"
   ```

---

## Still Stuck?

1. Make sure you're in the right directory:
   ```bash
   cd apps/coinet-platform
   ```

2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

3. Check Prisma schema is valid:
   ```bash
   pnpm prisma validate
   ```

4. Generate Prisma client fresh:
   ```bash
   pnpm db:generate
   ```

5. Try building first:
   ```bash
   pnpm build
   pnpm start
   ```

---

**The server is now configured to start even without a database configured. It will show warnings but won't hang!** ✅

