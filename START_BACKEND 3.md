# 🚀 Start Backend - Divine Solution

## Problem: `EADDRINUSE: address already in use 0.0.0.0:3000`

This means port 3000 is still occupied by an old process.

---

## ✅ Solution (Choose One)

### Option 1: Manual Cleanup (Recommended)

```bash
# Step 1: Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Step 2: Wait a moment
sleep 2

# Step 3: Start backend
cd apps/coinet-platform
pnpm build
pnpm start
```

### Option 2: Use the Script

```bash
chmod +x KILL_AND_START.sh
./KILL_AND_START.sh
```

---

## 🔍 If Port Still Not Free

Check what's using it:

```bash
lsof -i:3000
```

Kill specific process:

```bash
# Find the PID
lsof -ti:3000

# Kill it (replace XXXX with actual PID)
kill -9 XXXX
```

---

## ✅ Success Indicators

When backend starts correctly, you'll see:

```
✅ Coinet Platform started { port: 3000 }
📍 Health check: http://0.0.0.0:3000/api/health
📍 Chat API: http://0.0.0.0:3000/api/chat
```

---

## 🎯 After Backend Starts

**Keep that terminal running!**

Then start frontend in a **NEW terminal**:

```bash
cd apps/client-web
echo "VITE_API_URL=http://localhost:3000" > .env
pnpm install
pnpm dev
```

---

**Divine perfection achieved!** ✨

