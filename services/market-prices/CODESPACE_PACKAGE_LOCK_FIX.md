# Fix package-lock.json Conflict in Codespace

## Quick Fix

```bash
cd /workspaces/coinet-platform

# Stash local changes
git stash

# Pull latest
git pull origin feature/ai-data-feeder

# Go to service directory
cd services/market-prices

# Regenerate package-lock.json (just to be safe)
rm package-lock.json
npm install

# Verify build works
npm run build
```

## Alternative: Overwrite Local Changes

If you don't need local changes:

```bash
cd /workspaces/coinet-platform

# Discard local changes
git checkout -- services/market-prices/package-lock.json

# Pull latest
git pull origin feature/ai-data-feeder

# Regenerate if needed
cd services/market-prices
npm install
```

## Why This Happens

- Local `package-lock.json` was modified (maybe from `npm install`)
- Remote `package-lock.json` was updated with `@tensorflow/tfjs-node`
- Git sees conflict and prevents overwrite

## Solution: Use Remote Version

The remote version is correct (includes all dependencies). Just overwrite local:

```bash
git checkout -- services/market-prices/package-lock.json
git pull origin feature/ai-data-feeder
```

