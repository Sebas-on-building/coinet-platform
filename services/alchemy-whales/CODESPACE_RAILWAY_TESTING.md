# 🚀 Codespace & Railway Testing Guide

## ✅ Changes Pushed

All Phase A, B & C changes have been pushed to `feature/ai-data-feeder` branch:
- **14 files changed**, **5,773 insertions**
- WhaleFusion Engine (Phase A & B)
- Predictive Tracking (Phase C)
- Test suites included

## 📋 Testing in Codespace

### Step 1: Pull Latest Changes

```bash
cd /workspaces/coinet-platform
git pull origin feature/ai-data-feeder
```

### Step 2: Install Dependencies

```bash
cd services/alchemy-whales
npm install --legacy-peer-deps
```

### Step 3: Build

```bash
npm run build
```

Expected output:
```
> @coinet/alchemy-whales@2.0.0 build
> tsc
```

### Step 4: Run Phase A & B Tests

```bash
npm run test:fusion
```

Expected result:
```
✅ ALL TESTS PASSED - PHASE A & B COMPLETE!
   Total Tests:  10
   Passed:       10
   Failed:       0
   Pass Rate:    100.0%
```

### Step 5: Run Phase C Tests

```bash
npm run test:phase-c
```

Expected result:
```
✅ ALL TESTS PASSED - PHASE C COMPLETE!
   Total Tests:  18
   Passed:       18
   Failed:       0
   Pass Rate:    100.0%
```

### Step 6: Verify Components

```bash
# Check WhaleFusion Engine
npx ts-node -e "
import { WhaleFusionEngine } from './src/clients/WhaleFusionEngine';
console.log('✅ WhaleFusionEngine imported');
"

# Check WhalePredictor
npx ts-node -e "
import { WhalePredictor } from './src/ai/WhalePredictor';
console.log('✅ WhalePredictor imported');
"

# Check ShadowMode
npx ts-node -e "
import { WhaleShadowMode } from './src/ai/WhaleShadowMode';
console.log('✅ WhaleShadowMode imported');
"
```

## 🚂 Testing on Railway

### Step 1: Verify Deployment

Railway should automatically deploy on push. Check deployment status:

```bash
railway status
```

Or check Railway dashboard:
- Go to: https://railway.app/dashboard
- Select your project
- Check `alchemy-whales` service status

### Step 2: Check Build Logs

```bash
railway logs --service alchemy-whales
```

Look for:
- ✅ `npm run build` successful
- ✅ No TypeScript errors
- ✅ Service started successfully

### Step 3: Test Health Endpoint

```bash
# Get Railway URL
railway domain list --service alchemy-whales

# Test health endpoint
curl https://your-service.railway.app/api/health | jq
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-29T...",
  "services": {
    "database": "healthy",
    "cache": "healthy",
    ...
  }
}
```

### Step 4: Verify Service Integration

The `alchemy-whales` service should integrate with:
- ✅ Database (PostgreSQL) - optional
- ✅ Cache (Redis) - optional
- ✅ WhaleFusion Engine - ready
- ✅ Prediction system - ready

## 🧪 Manual Testing Scripts

### Test WhaleFusion Engine

Create `test-fusion-manual.ts`:

```typescript
import { WhaleFusionEngine, FusionConfig } from './src/clients/WhaleFusionEngine';
import { RateLimiterManager } from './src/utils/rateLimiter';
import { Chain } from './src/types';

const config: FusionConfig = {
  providers: {
    alchemy: {
      enabled: !!process.env.ALCHEMY_ETH_KEY,
      apiKeys: {
        [Chain.ETHEREUM]: process.env.ALCHEMY_ETH_KEY || '',
        [Chain.POLYGON]: process.env.ALCHEMY_POLYGON_KEY || '',
        [Chain.ARBITRUM]: '',
        [Chain.OPTIMISM]: '',
        [Chain.BASE]: '',
      },
      weight: 1.0,
    },
    infura: {
      enabled: !!process.env.INFURA_PROJECT_ID,
      projectId: process.env.INFURA_PROJECT_ID || '',
      chains: [Chain.ETHEREUM, Chain.POLYGON],
      weight: 0.7,
    },
    moralis: {
      enabled: !!process.env.MORALIS_API_KEY,
      apiKey: process.env.MORALIS_API_KEY || '',
      chains: [Chain.ETHEREUM, Chain.POLYGON],
      weight: 0.8,
    },
  },
  cache: { enabled: true, ttlSeconds: 60, maxEntries: 1000 },
  batching: { enabled: true, maxBatchSize: 10, batchDelayMs: 50 },
  failover: { enabled: true, maxRetries: 3, retryDelayMs: 100 },
  schemaValidation: { enabled: true, strictMode: false },
};

// Initialize rate limiter (mock)
const rateLimiter = {
  schedule: async (chain: any, fn: () => Promise<any>) => await fn(),
  scheduleBatch: async (chain: any, fns: Array<() => Promise<any>>) => 
    await Promise.all(fns.map(fn => fn())),
  getMetrics: () => ({ queued: 0, running: 0, done: 0, failed: 0 }),
} as any;

const engine = new WhaleFusionEngine(config, rateLimiter);

console.log('✅ WhaleFusion Engine initialized');
console.log('Active providers:', engine.getActiveProviders());
console.log('Provider stats:', Array.from(engine.getProviderStats().entries()));
```

Run:
```bash
npx ts-node test-fusion-manual.ts
```

### Test Predictive System

Create `test-predictions-manual.ts`:

```typescript
import { getWhalePredictor } from './src/ai/WhalePredictor';
import { getWhaleShadowMode } from './src/ai/WhaleShadowMode';
import { Chain, WhaleTier } from './src/types';

const predictor = getWhalePredictor();
const shadowMode = getWhaleShadowMode();

// Track a whale
shadowMode.trackWhale('0x1234...', Chain.ETHEREUM, {
  tier: WhaleTier.MEGA_WHALE,
});

// Make prediction
const prediction = await predictor.predict('0x1234...', Chain.ETHEREUM);
console.log('Prediction:', {
  action: prediction.predictedAction,
  probability: prediction.probability,
  confidence: prediction.confidence,
  reasoning: prediction.reasoning,
});

// Get shadow mode stats
const stats = shadowMode.getStats();
console.log('Shadow Mode Stats:', stats);
```

Run:
```bash
npx ts-node test-predictions-manual.ts
```

## 🔍 Troubleshooting

### Build Errors

If build fails:

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules dist
npm install --legacy-peer-deps
npm run build
```

### Test Failures

If tests fail:

```bash
# Check TypeScript compilation
npm run typecheck

# Run individual test suites
npm run test:fusion
npm run test:phase-c
```

### Railway Deployment Issues

If Railway build fails:

1. **Check build logs**:
   ```bash
   railway logs --service alchemy-whales --build
   ```

2. **Verify environment variables**:
   - `ALCHEMY_ETH_KEY` (optional)
   - `INFURA_PROJECT_ID` (optional)
   - `MORALIS_API_KEY` (optional)

3. **Check service health**:
   ```bash
   railway status --service alchemy-whales
   ```

### Import Errors

If you see import errors:

```bash
# Verify exports
npx ts-node -e "
import { WhaleFusionEngine } from './src/clients/WhaleFusionEngine';
import { WhalePredictor } from './src/ai/WhalePredictor';
import { WhaleShadowMode } from './src/ai/WhaleShadowMode';
console.log('✅ All imports successful');
"
```

## 📊 Expected Test Results

### Phase A & B (WhaleFusion)
- ✅ Engine Initialization
- ✅ Provider Stats
- ✅ Caching System
- ✅ Metrics Collection
- ✅ Health Check
- ✅ Batching Configuration
- ✅ Failover Configuration
- ✅ Schema Validation
- ✅ Provider Weighting
- ✅ Reset Functionality

### Phase C (Predictive Tracking)
- ✅ Predictor Initialization
- ✅ Make Prediction
- ✅ Prediction with Context
- ✅ Predictor Stats
- ✅ Collector Initialization
- ✅ Data Collection
- ✅ Batch Collection
- ✅ Label Generation
- ✅ Training Data Generation
- ✅ Shadow Mode Initialization
- ✅ Whale Tracking
- ✅ Auto Discovery
- ✅ Shadow Mode Stats
- ✅ Get All Predictions
- ✅ Alert Service Initialization
- ✅ Alert Stats
- ✅ End-to-End Prediction
- ✅ Prediction Accuracy

## ✅ Success Criteria

- [x] All files pushed to GitHub
- [ ] Codespace tests pass (100%)
- [ ] Railway deployment successful
- [ ] Health endpoint responds
- [ ] All components importable
- [ ] No TypeScript errors
- [ ] No runtime errors

## 📝 Next Steps

After successful testing:

1. **Merge to main** (if ready):
   ```bash
   git checkout main
   git merge feature/ai-data-feeder
   git push origin main
   ```

2. **Monitor Railway**:
   - Check logs for 24 hours
   - Monitor error rates
   - Verify prediction accuracy

3. **Phase D** (Error-Proofing):
   - Triple-redundancy consensus
   - Auto-recovery scripts
   - 95% test coverage
   - 10k query stress test

---

**Last Updated**: 2025-11-29  
**Status**: Ready for Testing  
**Branch**: `feature/ai-data-feeder`

