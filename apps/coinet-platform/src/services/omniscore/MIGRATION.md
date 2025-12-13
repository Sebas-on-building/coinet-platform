# OmniScore Consumer Migration Guide

## Quick Migration

Update all imports from versioned files to the canonical entrypoint:

### Before ❌
```typescript
import { 
  calculateOmniScoreProduction,
  toOmniScoreSnapshot 
} from '../services/omniscore-v2.3';

import { getProjectOmniScoreV23 } from '../services/omniscore-data-fetcher-v23';
```

### After ✅
```typescript
import { 
  calculateOmniScoreProduction,
  toOmniScoreSnapshot,
  getProjectOmniScoreV23,
  getOmniScoreSnapshot,
  OMNISCORE_ENGINE_VERSION
} from '../services/omniscore';
```

## Files to Update

Based on grep results, update these files:

1. **`src/api/chat/service.ts`**
   - Replace `omniscore-v2.3` imports with `omniscore`

2. **`src/components/OmniScoreQuadrantBoard.tsx`**
   - Replace `omniscore-v2.3` imports with `omniscore`

3. **`src/services/omniscore-data-fetcher-v23.ts`**
   - Can keep internal import (entrypoint re-exports it anyway)

4. **`src/services/omniscore-visualizer.ts`**
   - Update to use entrypoint

5. **`src/services/omniscore-debug-view.ts`**
   - Update to use entrypoint

6. **All test files in `__tests__/`**
   - Update imports to use entrypoint

## Verification

After migration, verify:

1. **No direct imports from versioned files:**
   ```bash
   grep -r "from.*omniscore-v2" src/
   # Should return empty (except in entrypoint itself)
   ```

2. **Version consistency:**
   ```typescript
   import { OMNISCORE_ENGINE_VERSION } from '../services/omniscore';
   console.assert(OMNISCORE_ENGINE_VERSION === '2.4.1');
   ```

3. **Snapshot shape test passes:**
   ```bash
   npm test -- omniscore-snapshot-shape
   ```

## Benefits After Migration

✅ **Single source of truth** - No more version confusion  
✅ **Version guard** - Runtime assertion prevents mismatches  
✅ **Type safety** - Consistent `OmniScoreSnapshot` interface  
✅ **Future-proof** - Easy to update when engine changes  

## Rollback Plan

If issues arise, the entrypoint still re-exports from `omniscore-v2.3.ts`, so:
- Old imports continue to work
- No breaking changes
- Can migrate gradually
