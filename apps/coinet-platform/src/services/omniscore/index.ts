/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 OMNISCORE v2.5.0 CANONICAL ENTRYPOINT                                 ║
 * ║                                                                               ║
 * ║   This is the SINGLE SOURCE OF TRUTH for OmniScore engine.                  ║
 * ║   All consumers MUST import from here, never from versioned files.           ║
 * ║                                                                               ║
 * ║   Current Engine: v2.5.0 (Convex Combination Formula)                        ║
 * ║   Formula: POS = 0.60×QS + 0.25×OS + 0.15×(100-Risk)                         ║
 * ║                                                                               ║
 * ║   Mathematical Properties:                                                    ║
 * ║   1. BOUNDEDNESS   - Score never exceeds input range                         ║
 * ║   2. CONVEXITY     - Weights sum to 1                                        ║
 * ║   3. MONOTONICITY  - ↑QS → ↑POS, ↓Risk → ↑POS                                ║
 * ║   4. FLOORING      - Blue-chips protected (QS≥90 → POS≥65)                   ║
 * ║   5. PLAUSIBILITY  - Cap at 97, 100/100 impossible                           ║
 * ║                                                                               ║
 * ║   ⚠️ DO NOT import from:                                                     ║
 * ║   - ../omniscore-v2.3.ts (deprecated)                                        ║
 * ║   - ../omniscore-v2.2.ts (legacy)                                            ║
 * ║   - ../omniscore/legacy/** (legacy versions)                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// Core engine exports (v2.5.0 Convex Combination)
export * from '../omniscore-v2.5';

// Re-export current data fetcher (v2.3)
export {
  getProjectOmniScoreV23,
  getOmniScoreSnapshot,
  getMultipleOmniScoreSnapshots,
  snapshotToProjectPoint,
  formatSnapshotForAI,
} from '../omniscore-data-fetcher-v23';

// Re-export debug view
export {
  generateDebugView,
  formatDebugView,
  formatSnapshotForAI as formatSnapshotForAIDebug,
} from '../omniscore-debug-view';

// Re-export visualizer
export * from '../omniscore-visualizer';

// Re-export constants
export * from '../omniscore-constants';

// Version constant for consumers to check
export { OMNISCORE_ENGINE_VERSION } from '../omniscore-v2.5';
