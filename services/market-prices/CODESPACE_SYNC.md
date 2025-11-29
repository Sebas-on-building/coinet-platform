# 🔄 Codespace Sync Instructions

## Issue: Local Changes Conflict

If you see this error:
```
error: Your local changes to the following files would be overwritten by merge:
        services/market-prices/package-lock.json
```

## Solution

### Option 1: Stash and Pull (Recommended)

```bash
# Stash your local changes
git stash

# Pull latest changes
git pull origin feature/ai-data-feeder

# Reinstall dependencies (to sync package-lock.json)
cd services/market-prices
npm install --legacy-peer-deps

# Build
npm run build
```

### Option 2: Reset and Pull (If stash doesn't work)

```bash
# Discard local changes to package-lock.json
git checkout -- services/market-prices/package-lock.json

# Pull latest changes
git pull origin feature/ai-data-feeder

# Reinstall dependencies
cd services/market-prices
npm install --legacy-peer-deps

# Build
npm run build
```

### Option 3: Force Pull (Last Resort)

```bash
# Reset to remote state
git fetch origin
git reset --hard origin/feature/ai-data-feeder

# Reinstall dependencies
cd services/market-prices
npm install --legacy-peer-deps

# Build
npm run build
```

---

## After Syncing

Once synced, you should be able to:

```bash
# Build successfully
npm run build

# Run tests
npm run test:unlocks

# Check health
npm run test:health
```

---

## What Was Fixed

1. ✅ Added CRYPTORANK to DataSource enum
2. ✅ Fixed notification-channels.ts type error
3. ✅ Fixed cryptorank-rest.ts DataSource references
4. ✅ Fixed WebSocket type error in rpc-manager.ts
5. ✅ Installed all missing dependencies

All fixes are in the latest commit: `b38bac03`

