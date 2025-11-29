# 🔧 Codespace Sync Fix Guide

## Issue: Git Pull Conflict with package-lock.json

When pulling Phase D changes, you may encounter a conflict with `package-lock.json` due to local dependency changes.

## Solution

### Option 1: Stash Local Changes (Recommended)

```bash
# Stash local changes
git stash

# Pull latest changes
git pull origin feature/ai-data-feeder

# Reinstall dependencies (this will regenerate package-lock.json)
cd services/alchemy-whales
npm install

# Run tests
npm run test:phase-d
```

### Option 2: Reset package-lock.json

```bash
# Discard local changes to package-lock.json
git checkout -- services/alchemy-whales/package-lock.json

# Pull latest changes
git pull origin feature/ai-data-feeder

# Reinstall dependencies
cd services/alchemy-whales
npm install

# Run tests
npm run test:phase-d
```

### Option 3: Commit Local Changes First

```bash
# Commit local changes
git add services/alchemy-whales/package-lock.json
git commit -m "chore: Update package-lock.json"

# Pull with merge
git pull origin feature/ai-data-feeder

# Resolve any merge conflicts if they occur
# Then reinstall dependencies
cd services/alchemy-whales
npm install

# Run tests
npm run test:phase-d
```

## Quick Fix Commands

Run these commands in order:

```bash
# 1. Stash local changes
git stash

# 2. Pull latest changes
git pull origin feature/ai-data-feeder

# 3. Navigate to service directory
cd services/alchemy-whales

# 4. Install dependencies (regenerates package-lock.json)
npm install

# 5. Verify scripts are available
npm run

# 6. Run Phase D tests
npm run test:phase-d
```

## Verify Installation

After pulling and installing, verify the scripts exist:

```bash
cd services/alchemy-whales
npm run | grep phase-d
# Should show: test:phase-d
```

## Expected Scripts

After successful pull, you should have these scripts:

```bash
npm run test:phase-d        # Phase D comprehensive test
npm run stress-test         # Stress test runner
npm run stress-test:quick   # Quick stress test
npm run stress-test:full    # Full stress test
npm run stress-test:extreme # Extreme stress test
```

## Troubleshooting

### If scripts still missing:

```bash
# Check package.json has the scripts
cat package.json | grep "test:phase-d"

# If missing, manually add to package.json scripts section:
# "test:phase-d": "npx ts-node scripts/test-phase-d.ts"

# Then reinstall
npm install
```

### If npm install fails:

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

**Last Updated**: Phase D Deployment

