# 🚀 How to Start the Server (Fixed)

The issue is that `ts-node` might not be installed yet. Use **Method 1** (recommended):

## ✅ Method 1: Build Then Run (ALWAYS WORKS)

```bash
cd apps/coinet-platform

# Step 1: Install dependencies (if not done)
pnpm install

# Step 2: Generate Prisma client
pnpm db:generate

# Step 3: Build TypeScript to JavaScript
pnpm build

# Step 4: Run the server
pnpm start
```

**Expected output:**
```
🚀 Coinet Platform started { port: 3000, environment: 'production' }
📍 Health: http://0.0.0.0:3000/api/health
📍 Chat API: http://0.0.0.0:3000/api/chat
```

## ✅ Method 2: Use the Script

```bash
cd apps/coinet-platform
bash START_SERVER.sh
```

This script does everything automatically.

## ✅ Method 3: One-Line Command

```bash
cd apps/coinet-platform && pnpm install && pnpm db:generate && pnpm build && pnpm start
```

---

## 🐛 Troubleshooting

### If `pnpm install` fails:
```bash
# Try from root directory
cd /workspaces/coinet-platform
pnpm install
cd apps/coinet-platform
```

### If build fails:
```bash
# Check if TypeScript is installed
pnpm list typescript

# If missing, install
pnpm add -D typescript @types/node
```

### If Prisma fails:
```bash
# Skip Prisma for now (server will start without DB)
# Just build
pnpm build
```

---

## ✅ Verify It's Running

After starting, test:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "ok": true,
  "service": "coinet-platform",
  "version": "1.0.0",
  ...
}
```

**Use Method 1 - it's the most reliable!** 🎯

