/**
 * P3-BTAR-006A — Active Synthetic Judgment Adapter Types
 *
 * Type contract for the bridge adapter that connects Coinet's active
 * `produceJudgment()` engine to the Phase 3 synthetic truth suite under
 * the no-provider / no-AI / no-DB / no-env rule.
 *
 * This module is pure types. The adapter implementation lives in
 * `active-synthetic-judgment-adapter.ts`.
 *
 * Authority:
 *   - Plan 3.0 §1, §3, §6, §9 (bridge BTAR), §11, §12
 *   - P3-BTAR-006A §9 (type contract), §10 (adapter implementation)
 *
 * Owner: Phase 3 (P3-BTAR-006A).
 */

import type { SyntheticJudgmentExecutorMetadata } from './judgment-truth-runner.types';

// -----------------------------------------------------------------------------
// 1. Policy version
// -----------------------------------------------------------------------------

export type ActiveSyntheticJudgmentAdapterPolicyVersion =
  | 'active-synthetic-judgment-adapter.v1';

// -----------------------------------------------------------------------------
// 2. Adapter readiness status
//
// `ADAPTER_READY`              — active engine is callable under no-provider rule
// `ADAPTER_BLOCKED_BY_INPUT_SHAPE`     — synthetic input cannot map safely
// `ADAPTER_BLOCKED_BY_PROVIDER_COUPLING` — active path requires provider/env/AI
// `ADAPTER_EXECUTION_FAILED`            — runtime failure during execution
// -----------------------------------------------------------------------------

export type ActiveSyntheticJudgmentAdapterStatus =
  | 'ADAPTER_READY'
  | 'ADAPTER_BLOCKED_BY_INPUT_SHAPE'
  | 'ADAPTER_BLOCKED_BY_PROVIDER_COUPLING'
  | 'ADAPTER_EXECUTION_FAILED';

// -----------------------------------------------------------------------------
// 3. Inspection result
//
// Returned by `inspectActiveSyntheticJudgmentAdapterReadiness()`. Pure
// metadata; no executor invocation. The honesty pin is that
// `requires_real_providers` / `requires_ai_model` / `requires_database_state`
// are derived from declared imports of the active engine path, not from
// runtime probing.
// -----------------------------------------------------------------------------

export interface ActiveSyntheticJudgmentAdapterInspectionResult {
  policy_version: ActiveSyntheticJudgmentAdapterPolicyVersion;
  status: ActiveSyntheticJudgmentAdapterStatus;
  active_entrypoint_name: string;
  active_entrypoint_path: string;
  accepts_synthetic_input: boolean;
  requires_real_providers: false;
  requires_ai_model: false;
  requires_database_state: false;
  risks: string[];
  blockers: string[];
}

// -----------------------------------------------------------------------------
// 4. Run summary (returned by the active executor wrapper after running the
//     full corpus through `runJudgmentTruthSuite` in ACTIVE_SYNTHETIC_ADAPTER
//     mode). Pinned literals enforce honesty about provider absence + the
//     fact that the active engine WAS connected (unlike HARNESS mode).
// -----------------------------------------------------------------------------

export interface ActiveSyntheticAdapterRunSummary {
  policy_version: ActiveSyntheticJudgmentAdapterPolicyVersion;
  corpus_size: number;
  active_judgment_engine_connected: true;
  execution_mode: 'ACTIVE_SYNTHETIC_ADAPTER';
  semantic_assertions_run: true;
  no_real_provider_calls: true;
  pass_count: number;
  warning_count: number;
  fail_count: number;
  critical_fail_count: number;
  triggered_flaw_remediation: boolean;
}

// -----------------------------------------------------------------------------
// 5. Re-export the executor metadata literal pins so adapter consumers
//     can structurally verify them at compile time.
// -----------------------------------------------------------------------------

export type { SyntheticJudgmentExecutorMetadata };
