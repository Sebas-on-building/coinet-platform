# 🎯 SIMPLE START - Just Run These Commands

## Step-by-Step (Copy & Paste)

```bash
cd apps/coinet-platform

# 1. Install dependencies
pnpm install

# 2. Generate Prisma (optional, can skip if no DATABASE_URL)
pnpm db:generate 2>/dev/null || echo "Skipping Prisma (no DATABASE_URL)"

# 3. Build TypeScript
pnpm build

# 4. Start server
pnpm start
```

## That's It! ✅

After step 4, you should see:
```
🚀 Coinet Platform started
📍 Health: http://0.0.0.0:3000/api/health
📍 Chat API: http://0.0.0.0:3000/api/chat
```

## One-Liner (All Steps Together)

```bash
cd apps/coinet-platform && pnpm install && pnpm db:generate 2>/dev/null; pnpm build && pnpm start
```

---

**This is the simplest and most reliable method!** 🚀

