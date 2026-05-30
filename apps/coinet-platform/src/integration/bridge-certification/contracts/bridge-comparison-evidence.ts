/**
 * Bridge Comparison Evidence
 *
 * §37 / §38 — Matrix-ready comparison ledger feeding the future
 * reconciliation matrix between active product and certified runtime.
 */

import { BridgeEpisodeFamily } from './bridge-synthetic-episode';

export interface BridgeEpisodeComparison {
  readonly episode_family: BridgeEpisodeFamily;
  readonly ajp1_run_digest_ref: string;
  readonly cip05_run_digest_ref: string;
  readonly comparable_dimensions: readonly string[];
  readonly non_comparable_dimensions: readonly string[];
  readonly preliminary_overlap_notes: readonly string[];
  readonly preliminary_divergence_notes: readonly string[];
  readonly matrix_priority_hint: 'P0' | 'P1' | 'P2' | 'P3';
  readonly reconciliation_required: boolean;
}

export interface BridgeComparisonLedger {
  readonly ledger_id: string;
  readonly ajp1_artifact_ref: string;
  readonly cip05_artifact_ref: string;
  readonly episode_comparisons: readonly BridgeEpisodeComparison[];
  readonly divergence_signal_refs: readonly string[];
  readonly ajp1_fingerprint: string;
  readonly cip05_fingerprint: string;
  readonly generated_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
