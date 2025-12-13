/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 OMNISCORE CANONICAL ENTRYPOINT                                        ║
 * ║                                                                               ║
 * ║   This is the SINGLE SOURCE OF TRUTH for OmniScore engine.                  ║
 * ║   All consumers MUST import from here, never from legacy/versioned files.    ║
 * ║                                                                               ║
 * ║   Current Engine: v2.4.1 (Baseline+Tilt Formula)                             ║
 * ║                                                                               ║
 * ║   ⚠️ DO NOT import from:                                                     ║
 * ║   - ../omniscore-v2.3.ts (use this entrypoint instead)                      ║
 * ║   - ../omniscore-v2.2.ts (legacy)                                            ║
 * ║   - ../omniscore/legacy/** (legacy versions)                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

// Core engine exports
export * from '../omniscore-v2.3';

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
export { OMNISCORE_ENGINE_VERSION } from '../omniscore-v2.3';
