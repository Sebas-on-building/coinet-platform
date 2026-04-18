/**
 * L7.4 — Execution Context
 *
 * The in-run state every engine reads from and writes into. Holds:
 *   - the immutable `L7ValidationRun` header
 *   - subject contracts currently in-scope
 *   - intermediate artifacts produced by each engine
 *   - a sealed final-output bag once the run completes
 *
 * Engines never mutate state they do not own. Writes are always through
 * the `bind*` helpers so tests can assert on the exact stage order.
 */

import type { L7ValidationRun } from './l7-validation-run';
import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import type { L7ConfidenceAssessmentContract } from '../contracts/confidence-assessment.contract';
import type { L7ClaimRestrictionProfileContract } from '../contracts/restriction-profile.contract';
import type { L7ValidationOutputContract } from '../contracts/validation-output.contract';

export interface L7SupportRecord {
  readonly support_ref: string;
  readonly family: string;
  readonly relevance_class: 'PRIMARY' | 'SECONDARY' | 'EVIDENCE_ONLY';
  readonly freshness_class: 'CURRENT' | 'RECENT' | 'STALE' | 'EXPIRED';
  readonly completeness_class: 'FULL' | 'PARTIAL' | 'MISSING';
  readonly confidence_posture: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly contribution_score: number;
  readonly lineage_refs: readonly string[];
  readonly hard_required: boolean;
}

export interface L7ChallengeRecord {
  readonly challenge_ref: string;
  readonly family: string;
  readonly challenge_class:
    | 'HARD_CONTRADICTION'
    | 'SOFT_TENSION'
    | 'RISK_OVERHANG'
    | 'MISSING_CONFIRMATION'
    | 'STALE_SUPPORT_CHALLENGE';
  readonly severity_candidate: 'INFO' | 'MINOR' | 'MATERIAL' | 'SEVERE' | 'BLOCKING';
  readonly temporal_posture: 'CURRENT' | 'STALE' | 'MISSING';
  readonly confidence_posture: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly blocks_confirmation: boolean;
  readonly caps_confidence_only: boolean;
  readonly lineage_refs: readonly string[];
}

export interface L7ContradictionCandidate {
  readonly candidate_id: string;
  readonly contradiction_family: string;
  readonly support_ref: string;
  readonly challenge_ref: string;
  readonly contradiction_class:
    | 'HARD_CONTRADICTION'
    | 'SOFT_TENSION'
    | 'RISK_OVERHANG'
    | 'MISSING_CONFIRMATION'
    | 'STALE_SUPPORT_CHALLENGE';
  readonly severity_candidate: 'INFO' | 'MINOR' | 'MATERIAL' | 'SEVERE' | 'BLOCKING';
  readonly temporal_posture: 'CURRENT' | 'STALE' | 'MISSING';
  readonly blocks_confirmation: boolean;
  readonly caps_confidence_only: boolean;
  readonly rationale: string;
  readonly lineage_refs: readonly string[];
}

export interface L7EvaluationOutput {
  readonly domain: 'INCOMPLETENESS' | 'STALENESS' | 'AMBIGUITY' | 'DEGRADATION';
  readonly score: number;
  readonly reasons: readonly string[];
  readonly affected_surface_refs: readonly string[];
  readonly blocks_classification: boolean;
}

export interface L7ClassificationOutput {
  readonly validation_subject_id: string;
  readonly validation_class:
    | 'CONFIRMED'
    | 'WEAKLY_CONFIRMED'
    | 'CONFLICTING'
    | 'INSUFFICIENT'
    | 'STALE'
    | 'AMBIGUOUS'
    | 'DEGRADED';
  readonly modifiers: readonly string[];
  readonly support_strength_score: number;
  readonly rationale_codes: readonly string[];
}

export interface L7EvidencePack {
  readonly evidence_pack_id: string;
  readonly validation_subject_id: string;
  readonly support_refs: readonly string[];
  readonly challenge_refs: readonly string[];
  readonly contradiction_bundle_id: string | null;
  readonly incompleteness_refs: readonly string[];
  readonly staleness_refs: readonly string[];
  readonly ambiguity_refs: readonly string[];
  readonly degradation_refs: readonly string[];
  readonly classification_ref: string;
  readonly confidence_ref: string;
  readonly restriction_ref: string;
  readonly input_snapshot_ref: string;
  readonly compute_run_lineage: readonly string[];
  readonly replay_hash: string;
}

export interface L7ExecutionContext {
  readonly run: L7ValidationRun;
  readonly subjects: Map<string, L7ValidationSubjectContract>;
  readonly supports: Map<string, readonly L7SupportRecord[]>;
  readonly challenges: Map<string, readonly L7ChallengeRecord[]>;
  readonly candidates: Map<string, readonly L7ContradictionCandidate[]>;
  readonly clusters: Map<string, L7ContradictionBundleContract>;
  readonly evaluations: Map<string, readonly L7EvaluationOutput[]>;
  readonly classifications: Map<string, L7ClassificationOutput>;
  readonly confidences: Map<string, L7ConfidenceAssessmentContract>;
  readonly restrictions: Map<string, L7ClaimRestrictionProfileContract>;
  readonly evidence_packs: Map<string, L7EvidencePack>;
  readonly outputs: Map<string, L7ValidationOutputContract>;
  readonly stage_seal: Set<string>;
}

export function createExecutionContext(run: L7ValidationRun): L7ExecutionContext {
  return {
    run,
    subjects: new Map(),
    supports: new Map(),
    challenges: new Map(),
    candidates: new Map(),
    clusters: new Map(),
    evaluations: new Map(),
    classifications: new Map(),
    confidences: new Map(),
    restrictions: new Map(),
    evidence_packs: new Map(),
    outputs: new Map(),
    stage_seal: new Set(),
  };
}

export function sealStage(ctx: L7ExecutionContext, stage: string): void {
  ctx.stage_seal.add(stage);
}

export function isStageSealed(ctx: L7ExecutionContext, stage: string): boolean {
  return ctx.stage_seal.has(stage);
}
