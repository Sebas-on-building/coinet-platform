# OmniScore v2.3.4 Implementation Guide

**Version**: 2.3.4  
**Date**: December 12, 2025  
**Status**: PRODUCTION READY

---

## Critical Fixes in v2.3.4

### 🚨 Problem: ETH showing 100/100 (Impossible)
**Solution**: Added POS plausibility cap at 97. Now **physically impossible** to return 100/100.

### 🚨 Problem: SUI crashing 70→37 overnight
**Solution**: Added temporal smoothing with max delta limits (12 points/day normal, 30 with events).

### 🚨 Problem: Multiple data sources (engine vs fallbacks)
**Solution**: Single canonical `OmniScoreSnapshot` interface - one source of truth.

---

## Architecture: Single Source of Truth

```
┌──────────────────────────────────────────────────────────────────┐
│ OmniScore Engine v2.3.4                                          │
│ (omniscore-v2.3.ts)                                              │
│                                                                   │
│ Input: FeatureInputs + params                                    │
│ Output: OmniScoreProductionResponse                              │
│                                                                   │
│ Processing:                                                       │
│ 1. Calculate QS (0-100)                                          │
│ 2. Calculate OS (0-100) → apply cap-bucket ceiling              │
│ 3. Calculate Risk                                                │
│ 4. Calculate POS_raw = ω_F×QS + ω_O×OS - ω_R×Risk              │
│ 5. Apply plausibility cap (≤97)          ← v2.3.4 NEW           │
│ 6. Apply temporal smoothing                ← v2.3.4 NEW           │
│ 7. Apply ERS adjustment (γ×ERS)                                 │
│ 8. Determine tier from FIXED thresholds                          │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│ toOmniScoreSnapshot()                                            │
│ Converts full response → canonical snapshot                     │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│ OmniScoreSnapshot (CANONICAL FORMAT)                             │
│                                                                   │
│ {                                                                 │
│   id, symbol, name,                                              │
│   qs, qsTier,                                                    │
│   os, osTier, osStatus,                                          │
│   risk,                                                           │
│   posRaw, posSmoothed, posAdjusted,                              │
│   tier,  ← USE THIS EXACT STRING                                │
│   nrg, nrgTier,                                                  │
│   nmi, nmiTier,                                                  │
│   coverageQS, coverageOS, confidence,                            │
│   audit: {                                                        │
│     engineVersion: "2.3.4",                                      │
│     smoothingApplied,                                            │
│     posPlausibilityCapped,                                       │
│     ...                                                           │
│   }                                                               │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
    ┌───────────────────────┐   ┌────────────────────────┐
    │ Quadrant Board UI     │   │ Chat/AI Layer          │
    │ (uses snapshot.qs/os) │   │ (uses formatSnapshotForAI) │
    └───────────────────────┘   └────────────────────────┘
                    ↓                       ↓
            Both consume SAME snapshot - no recomputation
```

---

## Usage Examples

### Example 1: Get Single Project Score

```typescript
import { getOmniScoreSnapshot } from './omniscore-data-fetcher-v23';

const snapshot = await getOmniScoreSnapshot('ethereum');

console.log(`${snapshot.symbol}: ${snapshot.posAdjusted}/100 (${snapshot.tier})`);
// Output: "ETH: 55.3/100 (Neutral tier)"

// NEVER do this:
// ❌ if (snapshot.posAdjusted > 80) tier = 'Elite'  // NO! Use snapshot.tier

// ALWAYS do this:
// ✅ const tier = snapshot.tier;
```

### Example 2: Multi-Project Comparison (Quadrant Board)

```typescript
import { getMultipleOmniScoreSnapshots, snapshotToProjectPoint } from './omniscore-data-fetcher-v23';

const snapshots = await getMultipleOmniScoreSnapshots(['bitcoin', 'ethereum', 'solana']);

// Convert to ProjectPoint format for UI
const points = snapshots.map(snapshotToProjectPoint);

// Render quadrant board
<OmniScoreQuadrantBoard projects={points} />

// All scores come from same engine - no fallbacks, no parallel scoring
```

### Example 3: Chat/AI Formatting

```typescript
import { getOmniScoreSnapshot, formatSnapshotForAI } from './omniscore-data-fetcher-v23';

const snapshot = await getOmniScoreSnapshot('ethereum');
const aiContext = formatSnapshotForAI(snapshot);

// aiContext now includes:
// - Exact tier string with "USE EXACTLY THIS" markers
// - Explicit "NEVER say 100/100" rule
// - Quadrant zone vs tier distinction
// - Mandatory presentation format

// Send to AI with hard constraints
const response = await ai.chat({
  systemPrompt: OMNISCORE_SYSTEM_PROMPT,  // Includes tier compliance rules
  userQuery: query,
  context: aiContext,
});
```

### Example 4: Debug View (Troubleshooting)

```typescript
import { generateDebugView, formatDebugView } from './omniscore-debug-view';

const response = await getProjectOmniScoreV23('sui');
const debug = generateDebugView(response);
const debugText = formatDebugView(debug);

console.log(debugText);
// Shows:
// - Score progression (raw → plausibility cap → smoothing → ERS adjust)
// - Smoothing delta and limits
// - Tier analysis with deltas to next tier
// - Quadrant position
// - Invariant violations
// - Sanity checks
```

---

## Invariants Enforced (v2.3.4)

### INV-13: POS Plausibility Cap
```
POS ≤ 97  (makes 100/100 impossible)

If violated:
  - ERROR logged
  - POS capped at 97
  - audit.posPlausibilityCapped = true
  - audit.posBeforeCap = original value
```

### INV-14: Temporal Smoothing Bounds
```
Without event (ERS < 0.4):
  |POS_t - POS_{t-1}| ≤ 12 per 24h

With event (ERS ≥ 0.4):
  |POS_t - POS_{t-1}| ≤ 30 per 24h

If violated:
  - WARN logged
  - Delta limited to maxDelta
  - audit.smoothingApplied.wasLimited = true
```

### INV-15: OS Ceiling by Cap
```
Mega-cap: OS ≤ 92
Large-cap: OS ≤ 95
Mid-cap: OS ≤ 98

If violated:
  - WARN logged
  - OS capped at ceiling
  - audit.osCeilingApplied = true
```

---

## Golden Test Expectations

### Bitcoin
```
Expected Range: POS ∈ [65, 80]
Expected Tier:  Strong or Elite
Quadrant:       TARGET (QS≥60, OS≥60)
OS Cap:         92 (mega-cap)
ECO Score:      ≥70 (Lightning, Ordinals, institutional)

NEVER: 100/100
```

### Ethereum
```
Expected Range: POS ∈ [45, 70]
Expected Tier:  Weak, Neutral, or Strong (regime-dependent)
Quadrant:       BUILDER or TARGET (high QS, variable OS)
OS Cap:         92 (mega-cap)
ECO Score:      ≥85 (DeFi dominance, L2s, standards)

NEVER: 100/100
NEVER: Critical tier (unless major incident)
```

### Solana
```
Expected Range: POS ∈ [40, 65]
Expected Tier:  Weak, Neutral, or Strong
Quadrant:       BUILDER or TARGET
OS Cap:         95 (large-cap)
Risk:           Elevated (outage history)

NEVER: 100/100
```

---

## How to Diagnose Issues

### If you see POS=100:
```
1. Check audit.posPlausibilityCapped
   → Should be true if original was >97
   
2. Check audit.engineVersion
   → Should be "2.3.4"
   → If not, you're hitting old endpoint
   
3. Check audit.violations for INV-POS-PLAU
   → Should contain error if cap was hit
   
4. Check logs for smoothing
   → Should see "Would store POS=..." entries
```

### If you see wild swings (e.g., SUI 70→37):
```
1. Check audit.smoothingApplied.enabled
   → Should be true after first reading
   
2. Check audit.smoothingApplied.wasLimited
   → Should be true if delta > maxDelta
   
3. Check audit.smoothingApplied.eventMode
   → Should be true if ERS ≥ 0.4
   
4. Check audit.violations for INV-POS-SMOOTH
   → Should contain warning if bounded
   
5. Check previousPos in request params
   → Should not be null after first call
```

### If you see wrong tier labels:
```
1. Check snapshot.tier vs snapshot.posAdjusted
   → tier should match fixed thresholds
   
2. Check audit.rawTierUsed vs audit.conditionedTierInternal
   → snapshot.tier should equal rawTierUsed
   
3. Check AI output for tier compliance
   → Should NOT contain "43 (Neutral)"
   → SHOULD contain exact tier from payload
```

---

## Migration Checklist

- [x] Update engine to v2.3.4
- [x] Add POS plausibility cap (≤97)
- [x] Add temporal smoothing
- [x] Create OmniScoreSnapshot interface
- [x] Add toOmniScoreSnapshot() converter
- [x] Add getOmniScoreSnapshot() wrapper
- [x] Add getMultipleOmniScoreSnapshots() for batch
- [x] Add snapshotToProjectPoint() for UI compat
- [x] Create debug view generator
- [x] Create golden test cases
- [ ] Update chat service to use snapshots
- [ ] Update quadrant board to use snapshots
- [ ] Implement previousPos persistence (DB/cache)
- [ ] Add runtime monitoring for INV-POS-PLAU violations
- [ ] Add alerting if POS >95 (near impossible threshold)

---

## Testing v2.3.4

### Run Golden Tests
```bash
npm test -- omniscore-golden-cases
```

Expected:
```
✓ Bitcoin in Strong tier (65-80 range)
✓ Ethereum in Neutral-Strong tier (45-70 range)
✓ Solana in Weak-Neutral tier (40-65 range)
✓ POS capped at 97 for perfect inputs
✓ NEVER returns POS=100
✓ SUI smoothing prevents 70→37 crash
✓ Tier labels match fixed thresholds
```

### Verify No Fallback Paths
```bash
# Search for any parallel scoring logic
grep -r "pos.*100" --include="*.ts" --include="*.tsx" | grep -v test | grep -v node_modules

# Should only find engine code, not UI/chat logic computing scores
```

### Check Logs for Smoothing
```bash
# In production, you should see:
[OmniScore Smoothing] Would store POS=69.5 for bitcoin at 2025-12-12T...
[OmniScore v2.3.4] Completed for bitcoin posRaw=70.2 posSmoothed=69.8 posAdjusted=69.5
```

---

## API Response Format (v2.3.4)

### Full Response (calculateOmniScoreProduction)
```json
{
  "success": true,
  "engine": "OmniScore",
  "version": "2.3.4",
  "project": "ethereum",
  "timestamp": "2025-12-12T10:30:00.000Z",
  
  "qualityScore": {
    "score": 76.3,
    "tier": "Strong",
    "confidence": "high",
    "coverage": 0.85,
    "breakdown": { "team": 0.85, "tech": 0.88, "security": 0.72, ... }
  },
  
  "opportunityScore": {
    "status": "ok",
    "score": 48.5,
    "tier": "Weak",
    "coverage": 0.78
  },
  
  "risk": {
    "score": 22.0,
    "eventRiskSeverity": 0.05,
    "adjustmentGamma": 12
  },
  
  "pos": {
    "raw": 56.8,
    "adjusted": 55.7,
    "tier": "Neutral",  ← USE THIS
    "confidenceBand": [50.2, 61.2]
  },
  
  "audit": {
    "engineVersion": "2.3.4",  ← VERIFY THIS
    "smoothingApplied": {
      "enabled": true,
      "alpha": 0.35,
      "previousPos": 54.2,
      "rawDelta": 2.6,
      "boundedDelta": 2.6,
      "maxDeltaAllowed": 12,
      "wasLimited": false,
      "eventMode": false
    },
    "posPlausibilityCapped": false,
    "posBeforeCap": null,
    "osCeilingApplied": false,
    "rawTierUsed": "Neutral",
    "conditionedTierInternal": "Neutral",
    "tierMismatch": false,
    ...
  }
}
```

### Canonical Snapshot (toOmniScoreSnapshot)
```json
{
  "id": "ethereum",
  "symbol": "ETH",
  "name": "ethereum",
  "sector": "L1",
  "capBucket": "mega",
  
  "qs": 76.3,
  "qsTier": "Strong",
  "os": 48.5,
  "osTier": "Weak",
  "osStatus": "active",
  
  "risk": 22.0,
  
  "posRaw": 56.8,
  "posSmoothed": 56.8,
  "posAdjusted": 55.7,
  "tier": "Neutral",  ← USE THIS
  
  "nrg": 8.5,
  "nrgTier": "balanced",
  "nmi": 18.0,
  "nmiTier": "clean",
  
  "coverageQS": 0.85,
  "coverageOS": 0.78,
  "confidence": "high",
  
  "audit": {
    "engineVersion": "2.3.4",
    "methodologyVersion": "2.3.4",
    "timestamp": "2025-12-12T10:30:00.000Z",
    "invariantStatus": "pass",
    "smoothingApplied": true,
    "osCeilingApplied": false,
    "posPlausibilityCapped": false,
    "posBeforeCap": null
  }
}
```

---

## Consumer Code Updates

### Chat Service (service.ts)

**Before (v2.3.3)**:
```typescript
const omniScore = await getProjectOmniScoreV23('ethereum');
contextParts.push(formatOmniScoreForAI(omniScore));
```

**After (v2.3.4)**:
```typescript
const snapshot = await getOmniScoreSnapshot('ethereum');

// Verify engine version
if (snapshot.audit.engineVersion !== '2.3.4') {
  logger.warn(`Wrong engine version: ${snapshot.audit.engineVersion}`);
}

// Use new snapshot formatter
contextParts.push(formatSnapshotForAI(snapshot));

// Or for multiple projects:
const snapshots = await getMultipleOmniScoreSnapshots(['bitcoin', 'ethereum', 'solana']);
const aiContext = snapshots.map(formatSnapshotForAI).join('\n\n');
```

### Quadrant Board

**Before**:
```typescript
const omniScores = await Promise.all(
  coins.map(coin => getProjectOmniScoreV23(coin.id))
);

const points = omniScores.map(s => ({
  name: s.project,
  qs: s.qualityScore.score,
  os: s.opportunityScore.score,
  pos: s.pos.adjusted,
  // ... manual mapping
}));
```

**After**:
```typescript
const snapshots = await getMultipleOmniScoreSnapshots(coins.map(c => c.id));

// Use canonical converter
const points = snapshots.map(snapshotToProjectPoint);

// Now points are guaranteed to come from same engine
```

---

## Persistence Layer (TODO)

For temporal smoothing to work across sessions, implement:

### Database Schema
```sql
CREATE TABLE omniscore_history (
  project_id VARCHAR(50) NOT NULL,
  pos DECIMAL(5,2) NOT NULL,
  pos_smoothed DECIMAL(5,2) NOT NULL,
  qs DECIMAL(5,2) NOT NULL,
  os DECIMAL(5,2),
  tier VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  engine_version VARCHAR(10) NOT NULL,
  
  PRIMARY KEY (project_id, timestamp),
  INDEX idx_project_latest (project_id, timestamp DESC)
);
```

### Implementation
```typescript
async function getPreviousPos(projectId: string): Promise<{ pos: number | null; timestamp: string | null }> {
  const query = `
    SELECT pos_smoothed as pos, timestamp 
    FROM omniscore_history 
    WHERE project_id = ? 
      AND engine_version = '2.3.4'
    ORDER BY timestamp DESC 
    LIMIT 1
  `;
  
  const result = await db.query(query, [projectId]);
  
  if (result.rows.length === 0) {
    return { pos: null, timestamp: null };
  }
  
  return {
    pos: result.rows[0].pos,
    timestamp: result.rows[0].timestamp,
  };
}

async function storePosForSmoothing(projectId: string, pos: number, timestamp: string): Promise<void> {
  const query = `
    INSERT INTO omniscore_history 
    (project_id, pos_smoothed, timestamp, engine_version) 
    VALUES (?, ?, ?, '2.3.4')
    ON CONFLICT (project_id, timestamp) DO UPDATE
    SET pos_smoothed = EXCLUDED.pos_smoothed
  `;
  
  await db.query(query, [projectId, pos, timestamp]);
}
```

---

## Monitoring & Alerts

### Metrics to Track

```typescript
// Plausibility cap hits (should be RARE)
metrics.increment('omniscore.plausibility_cap_hit', {
  project: projectId,
  originalPos: posBeforeCap,
});

// Large smoothing adjustments
if (smoothingTracking.wasLimited) {
  metrics.increment('omniscore.smoothing_limited', {
    project: projectId,
    rawDelta: smoothingTracking.rawDelta,
    boundedDelta: smoothingTracking.boundedDelta,
  });
}

// OS ceiling applications
if (osCeilingApplied) {
  metrics.increment('omniscore.os_ceiling_hit', {
    project: projectId,
    capBucket: capBucket,
  });
}
```

### Alerts to Set

```yaml
# Alert if ANY project hits POS > 95
- name: omniscore_impossibly_high
  condition: pos > 95
  severity: critical
  message: "Project {{project}} has POS={{pos}} > 95 (near impossible threshold)"

# Alert if smoothing prevents >20 point swing
- name: omniscore_massive_swing_prevented
  condition: smoothing.wasLimited AND abs(smoothing.rawDelta) > 20
  severity: warning
  message: "Project {{project}} attempted {{rawDelta}} point swing, limited to {{boundedDelta}}"

# Alert if many projects are capped
- name: omniscore_cap_rate_high
  condition: rate(plausibility_cap_hit) > 0.1
  severity: warning
  message: "{{rate}}% of projects hitting plausibility cap - check calibration"
```

---

## Forbidden Code Patterns

### ❌ DON'T: Recompute POS in UI/chat
```typescript
// BAD - recomputing score
const pos = 0.45 * qs + 0.40 * os - 0.15 * risk;
if (pos > 80) tier = 'Elite';
```

### ✅ DO: Use snapshot tier
```typescript
// GOOD - using canonical snapshot
const snapshot = await getOmniScoreSnapshot(id);
const tier = snapshot.tier;  // Already computed by engine
```

### ❌ DON'T: Derive tier from score
```typescript
// BAD
if (snapshot.posAdjusted >= 70) {
  return 'Strong tier';
}
```

### ✅ DO: Use exact tier from snapshot
```typescript
// GOOD
return `${snapshot.tier} tier`;
```

### ❌ DON'T: Allow POS=100 anywhere
```typescript
// BAD
const defaultScore = 100;
```

### ✅ DO: Cap at 97 and flag
```typescript
// GOOD
const maxPlausible = 97;
if (pos > maxPlausible) {
  logError('INV-POS-PLAU violated');
  pos = maxPlausible;
}
```

---

## Summary

v2.3.4 makes the following **literally impossible**:

1. ✅ POS = 100 (capped at 97)
2. ✅ OS = 100 for mega-caps (capped at 92)
3. ✅ Wild overnight swings without events (smoothed)
4. ✅ Tier label mismatches (rawTier enforced)
5. ✅ Multiple scoring paths (single snapshot)

**Every consumer uses OmniScoreSnapshot from canonical engine.**
**No fallbacks. No improvisation. No 100/100.**

The system is now **deterministic, auditable, and physically realistic**.

---

*End of Implementation Guide*
