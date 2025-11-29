# 🚀 Quick Start - Get Server Running NOW

## ⚡ Fastest Way to Start (3 commands)

```bash
cd apps/coinet-platform

# 1. Install dependencies
pnpm install

# 2. Generate Prisma client (even without DB)
pnpm db:generate

# 3. Start server - USE THIS ONE:
node -r ts-node/register src/index.ts
```

## 🎯 Why This Works

The `node -r ts-node/register` approach bypasses any TypeScript watch mode issues and directly runs the TypeScript file.

## ✅ Expected Output

You should see:
```
🔍 Verifying database connection...
⚠️  DATABASE_URL not configured. Server will start but database features will be unavailable.
🚀 Coinet Platform started { port: 3000, environment: 'development' }
📍 Health: http://0.0.0.0:3000/api/health
📍 Status: http://0.0.0.0:3000/api/status
📍 Chat API: http://0.0.0.0:3000/api/chat
```

## 🔄 Alternative: Build First Then Run

If the above doesn't work:

```bash
# Build TypeScript to JavaScript
pnpm build

# Run the compiled JavaScript
pnpm start
```

## 🐛 If Still Stuck

1. **Check you're in right directory**:
   ```bash
   pwd
   # Should show: .../apps/coinet-platform
   ```

2. **Kill any running TypeScript processes**:
   ```bash
   pkill -f "tsc --watch"
   pkill -f "ts-node"
   ```

3. **Try the direct node approach**:
   ```bash
   node -r ts-node/register src/index.ts
   ```

4. **Or check what's actually running**:
   ```bash
   ps aux | grep -i typescript
   ```

---

**The direct `node -r ts-node/register` command should work immediately!** 🎉

