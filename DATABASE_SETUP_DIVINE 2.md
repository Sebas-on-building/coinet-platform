# 🚀 Divine Database Setup - Elon Musk Perfection

**Goal**: PostgreSQL database connected, migrated, and running in <5 minutes

---

## Option 1: Supabase (Recommended - Free & Fast)

### Step 1: Create Database
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `coinet-platform`
4. Database Password: Generate strong password (save it!)
5. Region: Choose closest to you
6. Click "Create new project" (takes ~2 min)

### Step 2: Get Connection String
1. Go to Project Settings → Database
2. Copy **Connection string (URI)**
3. Replace `[YOUR-PASSWORD]` with your actual password

Example:
```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijk.supabase.co:5432/postgres
```

---

## Option 2: Railway (Also Great)

### Step 1: Create Database
1. Go to https://railway.app
2. New Project → Add PostgreSQL
3. Wait ~30 seconds

### Step 2: Get Connection String
1. Click PostgreSQL service
2. Go to "Connect" tab
3. Copy "Postgres Connection URL"

Example:
```
postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway
```

---

## Setup in Codespace

### Step 1: Add DATABASE_URL

```bash
cd /workspaces/coinet-platform/apps/coinet-platform

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="your-connection-string-here"
PORT=3000
NODE_ENV=production
EOF
```

### Step 2: Run Migrations

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate:deploy

# Check database
pnpm db:studio &
```

### Step 3: Restart Backend

```bash
# Kill old process
lsof -ti:3000 | xargs kill -9

# Start with database
pnpm start
```

---

## Expected Success Output

```
✅ Database connected { latency: 45 }
🚀 Coinet Platform started { port: 3000 }
📍 Health: http://0.0.0.0:3000/api/health
📍 Status: http://0.0.0.0:3000/api/status
📍 Chat API: http://0.0.0.0:3000/api/chat
```

---

## Test Database

```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{"message":"Hello with database!"}' | jq .
```

Should return:
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg_...",
      "content": "...",
      "sources": [...]
    },
    "conversationId": "conv_..."
  }
}
```

---

**Choose Supabase or Railway, get the connection string, and I'll help you configure it!** 🚀

