# 🚀 Fresh Start Guide - Complete Setup

Run these commands in your **GitHub Codespace** terminal:

---

## Terminal 1: Start Backend

```bash
cd /workspaces/coinet-platform/apps/coinet-platform

# Make sure .env exists with database
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres.jhzacgfyhvbwolyguvsx:Coinetv12738%2B%2B@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
PORT=3000
NODE_ENV=production
EOF

# Start backend
pnpm start
```

**Expected output:**
```
✅ Database connected {"latency":1800}
🚀 Coinet Platform started {"port":3000}
📍 Chat API: http://0.0.0.0:3000/api/chat
```

**Keep this terminal open!**

---

## Terminal 2: Start Frontend

```bash
cd /workspaces/coinet-platform/apps/client-web

# Start Vite
npx vite --port 8080 --host --force
```

**Expected output:**
```
VITE v5.4.21  ready in xxx ms

➜  Local:   http://localhost:8080/
➜  Network: http://10.0.0.x:8080/
```

**Keep this terminal open!**

---

## Terminal 3: Test Backend

```bash
# Test health
curl http://localhost:3000/api/health | jq .

# Test chat
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{"message":"Test"}' | jq .
```

**Expected:** Both should return JSON successfully

---

## Open Browser

1. Go to **PORTS** tab in Codespace
2. Find port **8080**
3. Click the forwarded address (like `https://...8080.app.github.dev`)
4. **Hard refresh**: Cmd+Shift+R
5. **Open Console**: F12 → Console tab
6. **Look for**: `🔗 Backend API URL: https://...3000.app.github.dev`
7. **Send a message**

---

## If You See "Failed to fetch"

Paste the **browser console output** here - it will show the exact error!

---

**Start with Terminal 1 (backend), then Terminal 2 (frontend), then open browser!** 🚀

