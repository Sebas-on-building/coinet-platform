# OmniScore Engine Structure

## 🎯 Single Source of Truth

**All consumers MUST import from `services/omniscore/index.ts`**

```typescript
// ✅ CORRECT
import { 
  calculateOmniScoreProduction,
  toOmniScoreSnapshot,
  getOmniScoreSnapshot,
  OMNISCORE_ENGINE_VERSION 
} from '../services/omniscore';

// ❌ WRONG - Never import directly from versioned files
import { calculateOmniScoreProduction } from '../services/omniscore-v2.3';
```

## 📁 Structure

```
services/
├── omniscore/
│   ├── index.ts              ← PUBLIC ENTRYPOINT (use this!)
│   ├── current/              ← Current engine (v2.4.1)
│   │   ├── engine.ts
│   │   ├── data-fetcher.ts
│   │   ├── debug-view.ts
│   │   └── visualizer.ts
│   └── legacy/               ← Old versions (for reference only)
│       ├── v2_2/
│       └── v2_3_4/
├── omniscore-v2.3.ts         ← CURRENT (will be moved to current/)
├── omniscore-data-fetcher-v23.ts
├── omniscore-debug-view.ts
└── omniscore-visualizer.ts
```

## 🔒 Version Enforcement

The engine includes runtime guards:

1. **Version Assertion**: `assertEngineVersion()` throws if version mismatch
2. **Canonical Snapshot**: `OmniScoreSnapshot` is the only format consumers should use
3. **Version Constant**: `OMNISCORE_ENGINE_VERSION = '2.4.1'`

## 📊 Current Engine: v2.4.1

- **Formula**: Baseline+Tilt (v2.4)
  - `POS = QS + K_OS×(OS-50) - K_RISK×(Risk-50) + floor`
- **Fundamentals Floor**: QS≥90→70, QS≥85→60, QS≥75→50
- **Smoothing Reset**: Version-aware (resets on engine version change)

## 🚫 What NOT to Do

1. ❌ Import from `omniscore-v2.3.ts` directly
2. ❌ Import from `omniscore/legacy/**`
3. ❌ Use `OmniScoreProductionResponse` directly (use `OmniScoreSnapshot`)
4. ❌ Hardcode version strings (use `OMNISCORE_ENGINE_VERSION`)

## ✅ Migration Checklist

- [ ] Update all imports to use `services/omniscore/index.ts`
- [ ] Replace `OmniScoreProductionResponse` with `OmniScoreSnapshot` in UI/chat
- [ ] Verify version consistency in tests
- [ ] Add ESLint rule to block legacy imports (optional)

## 🧪 Testing

Run snapshot shape test to ensure consistency:

```bash
npm test -- omniscore-snapshot-shape
```

This ensures `toOmniScoreSnapshot()` always produces valid shapes.
