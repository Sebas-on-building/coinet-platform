/**
 * L8.4 — Regime Execution Context
 *
 * The in-run state every engine reads from and writes into. Holds:
 *   - the immutable `L8RegimeRun` header
 *   - subject contracts currently in-scope
 *   - intermediate artifacts produced by each engine
 *   - a sealed final-output bag once the run completes
 *
 * Engines never mutate state they do not own. Writes are always through
 * the `seal*` helpers so tests can assert on the exact stage order.
 */

import type { L8RegimeRun } from './regime-compute-run';
import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type { L8RegimeOutputContract } from '../contracts/regime-output.contract';
import type { L8RegimeConfidenceContract } from '../contracts/regime-confidence.contract';
import type { L8RegimeTransitionContract } from '../contracts/regime-transition.contract';
import type {
  L8RegimeMultiplierProfileContract,
} from '../contracts/regime-multiplier-profile.contract';
import type {
  L8RegimeClass,
} from '../contracts/regime-class';

/**
 * §8.4.4.5 — Resolved regime input set. Produced by the input resolver
 * and consumed by the candidate/transition/quality engines.
 */
export type L8InputReadinessClass =
  | 'COMPLETE_CURRENT'
  | 'COMPLETE_STALE'
  | 'PARTIAL_CURRENT'
  | 'PARTIAL_STALE'
  | 'DEGRADED'
  | 'BLOCKED';

export const ALL_L8_INPUT_READINESS_CLASSES: readonly L8InputReadinessClass[] = [
  'COMPLETE_CURRENT',
  'COMPLETE_STALE',
  'PARTIAL_CURRENT',
  'PARTIAL_STALE',
  'DEGRADED',
  'BLOCKED',
];

export interface L8ResolvedRegimeInputSet {
  readonly regime_subject_id: string;
  readonly legal_support_refs: readonly string[];
  readonly legal_challenge_refs: readonly string[];
  readonly missing_required_refs: readonly string[];
  readonly stale_refs: readonly string[];
  readonly degraded_refs: readonly string[];
  readonly usable_validation_refs: readonly string[];
  readonly blocked_validation_refs: readonly string[];
  readonly readiness_class: L8InputReadinessClass;
  readonly replay_hash_contribution: string;
}

/**
 * §8.4.5.3 — Regime candidate object.
 */
export type L8CandidateStrengthBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'DOMINANT';

export const ALL_L8_CANDIDATE_STRENGTH_BANDS:
  readonly L8CandidateStrengthBand[] = ['LOW', 'MEDIUM', 'HIGH', 'DOMINANT'];

export interface L8RegimeCandidate {
  readonly candidate_id: string;
  readonly regime_subject_id: string;
  readonly regime_family: string;
  readonly regime_class: L8RegimeClass;
  readonly candidate_strength_score: number; // 0..1
  readonly candidate_strength_band: L8CandidateStrengthBand;
  readonly supporting_surface_refs: readonly string[];
  readonly contradicting_surface_refs: readonly string[];
  readonly candidate_reason_codes: readonly string[];
  readonly template_ref: string;
  readonly lineage_refs: readonly string[];
}

/**
 * §8.4.5.4-8 — Quality engine outputs, kept strictly separate by domain.
 */
export interface L8TransitionOutput {
  readonly regime_subject_id: string;
  readonly transition_risk_score: number; // 0..1
  readonly coexistence_hint: 'CLEAN_SINGLE' | 'PRIMARY_PLUS_SECONDARY' |
    'TRANSITIONAL_OVERLAP' | 'AMBIGUOUS_MULTI_CANDIDATE' | 'ILLEGAL_COLLISION';
  readonly signature_refs: readonly string[];
  readonly candidate_flip_refs: readonly string[];
  readonly instability_reasons: readonly string[];
}

export interface L8QualityOutput {
  readonly domain: 'AMBIGUITY' | 'STALENESS' | 'DEGRADATION';
  readonly regime_subject_id: string;
  readonly score: number; // 0..1
  readonly reasons: readonly string[];
  readonly affected_surface_refs: readonly string[];
  readonly blocks_classification: boolean;
}

/**
 * §8.4.6.1 — Classification output. Only the classification engine may
 * emit one of these.
 */
export interface L8ClassificationOutput {
  readonly regime_subject_id: string;
  readonly regime_family: string;
  readonly primary_regime: L8RegimeClass;
  readonly secondary_regime: L8RegimeClass | null;
  readonly coexistence_class: 'CLEAN_SINGLE' | 'PRIMARY_PLUS_SECONDARY' |
    'TRANSITIONAL_OVERLAP' | 'AMBIGUOUS_MULTI_CANDIDATE' | 'ILLEGAL_COLLISION';
  readonly transition_risk_class:
    'STABLE' | 'MILD' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  readonly rationale_codes: readonly string[];
  readonly readiness_class: L8InputReadinessClass;
}

/**
 * §8.4.7.1 — Evidence pack produced by the evidence builder.
 */
export interface L8RegimeEvidencePack {
  readonly evidence_pack_id: string;
  readonly regime_subject_id: string;
  readonly candidate_refs: readonly string[];
  readonly transition_ref: string | null;
  readonly ambiguity_ref: string | null;
  readonly staleness_ref: string | null;
  readonly degradation_ref: string | null;
  readonly classification_ref: string;
  readonly confidence_ref: string;
  readonly multiplier_ref: string;
  readonly consumed_validation_refs: readonly string[];
  readonly supporting_surface_refs: readonly string[];
  readonly contradicting_surface_refs: readonly string[];
  readonly input_snapshot_ref: string;
  readonly compute_run_lineage: readonly string[];
  readonly replay_hash: string;
}

export interface L8RegimeExecutionContext {
  readonly run: L8RegimeRun;
  readonly subjects: Map<string, L8RegimeSubjectContract>;
  readonly resolved_inputs: Map<string, L8ResolvedRegimeInputSet>;
  readonly candidates: Map<string, readonly L8RegimeCandidate[]>;
  readonly transitions: Map<string, L8TransitionOutput>;
  readonly qualities: Map<string, readonly L8QualityOutput[]>;
  readonly classifications: Map<string, L8ClassificationOutput>;
  readonly confidences: Map<string, L8RegimeConfidenceContract>;
  readonly multipliers: Map<string, L8RegimeMultiplierProfileContract>;
  readonly transition_contracts: Map<string, L8RegimeTransitionContract>;
  readonly evidence_packs: Map<string, L8RegimeEvidencePack>;
  readonly outputs: Map<string, L8RegimeOutputContract>;
  readonly stage_seal: Set<string>;
}

export function createL8ExecutionContext(
  run: L8RegimeRun,
): L8RegimeExecutionContext {
  return {
    run,
    subjects: new Map(),
    resolved_inputs: new Map(),
    candidates: new Map(),
    transitions: new Map(),
    qualities: new Map(),
    classifications: new Map(),
    confidences: new Map(),
    multipliers: new Map(),
    transition_contracts: new Map(),
    evidence_packs: new Map(),
    outputs: new Map(),
    stage_seal: new Set(),
  };
}

export function sealL8Stage(
  ctx: L8RegimeExecutionContext,
  stage: string,
): void {
  ctx.stage_seal.add(stage);
}

export function isL8StageSealed(
  ctx: L8RegimeExecutionContext,
  stage: string,
): boolean {
  return ctx.stage_seal.has(stage);
}
