# Quick Test Commands

## In Codespace - First Time Setup

```bash
# Navigate to project
cd /workspaces/coinet-platform

# Pull latest changes
git pull origin feature/ai-data-feeder

# Navigate to service
cd services/market-prices

# Install dependencies (if needed)
npm install

# Verify scripts are available
npm run | grep alerts
npm run | grep security
npm run | grep cache
```

## Test Commands

### 1. Alert Status
```bash
npm run alerts:status
npm run alerts:status -- --history
npm run alerts:status -- --rules
```

### 2. Cache Management
```bash
npm run cache:clear -- --dry-run
npm run cache:clear -- --pattern="prices:*"
```

### 3. Key Rotation
```bash
npm run security:rotate-keys
npm run security:rotate-keys -- --provider=coingecko
```

### 4. Health Check
```bash
npm run test:health
```

## If Scripts Not Found

### Check package.json
```bash
cat package.json | grep -A 3 "alerts:status"
```

### Verify script files exist
```bash
ls -la scripts/alert-status.ts
ls -la scripts/rotate-keys.ts
ls -la scripts/clear-cache.ts
```

### Reinstall dependencies
```bash
npm install
```

### Check TypeScript compilation
```bash
npm run build
```

## Troubleshooting

### Error: Cannot find module
```bash
# Install ts-node if missing
npm install --save-dev ts-node

# Or use npx
npx ts-node scripts/alert-status.ts
```

### Error: Script not found
```bash
# Verify package.json has the script
grep "alerts:status" package.json

# If missing, the file might not be synced
git status
git pull origin feature/ai-data-feeder
```

