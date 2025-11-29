# 🔧 Codespace Merge Conflict Fix

**Issue:** `package-lock.json` merge conflict  
**Solution:** Stash local changes, pull, then reinstall

---

## Quick Fix Commands

Run these in Codespace:

```bash
cd /workspaces/coinet-platform

# Stash local package-lock.json changes
git stash push services/market-prices/package-lock.json -m "Stash local package-lock"

# Pull latest changes
git pull origin feature/ai-data-feeder

# Go to service directory
cd services/market-prices

# Reinstall dependencies (will regenerate package-lock.json)
npm install --legacy-peer-deps

# Build
npm run build

# Test real-time systems
npm run test:realtime
```

---

## Alternative: Reset package-lock.json

If stashing doesn't work:

```bash
cd /workspaces/coinet-platform

# Discard local package-lock.json changes
git checkout -- services/market-prices/package-lock.json

# Pull latest
git pull origin feature/ai-data-feeder

# Reinstall
cd services/market-prices
npm install --legacy-peer-deps
npm run build
npm run test:realtime
```

---

## Verify Scripts Are Available

After pulling, check:

```bash
npm run | grep realtime
```

Should show:
- `test:realtime`
- `test:realtime:full`

---

## Expected Test Results

```bash
npm run test:realtime
```

Should show:
```
🎉 ALL TESTS PASSED - REAL-TIME SYSTEMS READY!
   Pass Rate: 100.0%
   Avg Latency: 0.00ms
   Throughput: 5000+ tasks/sec
   Cache Hit Rate: 100.0%
```

---

**Status:** Ready to sync ✅

