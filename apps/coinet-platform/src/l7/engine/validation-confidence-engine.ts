/**
 * L7.4 — ValidationConfidenceEngine
 *
 * §7.4.7.4–§7.4.7.5 — Confidence derives *after* classification and
 * contradiction clustering. Required components (§7.3.5.2) and the cap
 * chain (§7.3.5.4) are populated deterministically from the subject
 * contract's `confidence_derivation_spec`.
 */

import type {
  L7ValidationSubjectContract,
  L7ConfidenceDerivationSpec,
} from '../contracts/validation-subject.contract';
import type {
  L7SupportRecord,
  L7ChallengeRecord,
  L7ClassificationOutput,
  L7EvaluationOutput,
} from '../runtime/l7-execution-context';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import type {
  L7ConfidenceAssessmentContract,
  L7ConfidenceComponentWeights,
} from '../contracts/confidence-assessment.contract';
import {
  L7ConfidenceBand,
  bandForScore,
  type L7ConfidenceComponents,
  type L7ConfidenceCap,
} from '../contracts/confidence-assessment';
import { L7ContradictionSeverity, compareSeverity } from '../contracts/contradiction-bundle';
import { canonicalValidationReplayHash } from '../validation/validation-replay-hash';
import { RUN_MODE_TO_REPLAY_IDENTITY, L7ValidationRunMode } from '../runtime/l7-validation-run';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface ConfidenceEngineInput {
  readonly subject: L7ValidationSubjectContract;
  readonly support: readonly L7SupportRecord[];
  readonly challenge: readonly L7ChallengeRecord[];
  readonly classification: L7ClassificationOutput;
  readonly contradiction_bundle: L7ContradictionBundleContract;
  readonly incompleteness: L7EvaluationOutput;
  readonly staleness: L7EvaluationOutput;
  readonly ambiguity: L7EvaluationOutput;
  readonly degradation: L7EvaluationOutput;
  readonly run_id: string;
  readonly run_mode: L7ValidationRunMode;
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly confidence_contract_version: string;
  readonly schema_version: string;
  readonly confidence_policy_version: string;
}

export function deriveConfidence(
  input: ConfidenceEngineInput,
): L7EngineResult<L7ConfidenceAssessmentContract> {
  const violations: L7RuntimeViolation[] = [];
  const s = input.subject;
  const spec: L7ConfidenceDerivationSpec = s.confidence_derivation_spec;

  const components: L7ConfidenceComponents = {
    source_trust_component: meanConfidence(input.support),
    freshness_component: freshnessComponent(input.support),
    feature_completeness_component: completenessComponent(input.support, input.incompleteness),
    cross_source_agreement_component: crossSourceAgreement(input.support, input.challenge),
    regime_compatibility_component: regimeComponent(s, input.classification),
    historical_reliability_component: 0.7,
    contradiction_penalty_component: Math.min(1, input.contradiction_bundle.aggregate_penalty_score),
  };

  const weights = normaliseWeights(spec);

  const posPortion =
    weights.source_trust_weight * components.source_trust_component +
    weights.freshness_weight * components.freshness_component +
    weights.feature_completeness_weight * components.feature_completeness_component +
    weights.cross_source_agreement_weight * components.cross_source_agreement_component +
    weights.regime_compatibility_weight * components.regime_compatibility_component +
    weights.historical_reliability_weight * components.historical_reliability_component;
  const penalty =
    weights.contradiction_penalty_weight * components.contradiction_penalty_component;
  const raw_score = clamp01(posPortion - penalty);

  const caps: L7ConfidenceCap[] = [];
  let capped = raw_score;

  // §7.3.5.4 — contradiction severity cap.
  if (compareSeverity(input.contradiction_bundle.highest_severity, L7ContradictionSeverity.SEVERE) >= 0) {
    const ceiling = input.contradiction_bundle.highest_severity === L7ContradictionSeverity.BLOCKING ? 0.2 : 0.4;
    if (capped > ceiling) {
      caps.push({ cap_code: 'CONTRADICTION_SEVERITY_CAP', applied: true, max_after_cap: ceiling, reason: `severity=${input.contradiction_bundle.highest_severity}` });
      capped = ceiling;
    } else {
      caps.push({ cap_code: 'CONTRADICTION_SEVERITY_CAP', applied: false, max_after_cap: ceiling, reason: `severity=${input.contradiction_bundle.highest_severity}` });
    }
  }

  if (input.staleness.blocks_classification || input.staleness.score > 0.5) {
    const ceiling = 0.5;
    if (capped > ceiling) {
      caps.push({ cap_code: 'STALENESS_CAP', applied: true, max_after_cap: ceiling, reason: `staleness score=${input.staleness.score.toFixed(3)}` });
      capped = ceiling;
    }
  }
  if (input.incompleteness.blocks_classification || input.incompleteness.score > 0.5) {
    const ceiling = 0.4;
    if (capped > ceiling) {
      caps.push({ cap_code: 'INCOMPLETENESS_CAP', applied: true, max_after_cap: ceiling, reason: `incompleteness score=${input.incompleteness.score.toFixed(3)}` });
      capped = ceiling;
    }
  }
  if (input.degradation.score > 0.5) {
    const ceiling = 0.45;
    if (capped > ceiling) {
      caps.push({ cap_code: 'DEGRADATION_CAP', applied: true, max_after_cap: ceiling, reason: `degradation score=${input.degradation.score.toFixed(3)}` });
      capped = ceiling;
    }
  }
  if (input.ambiguity.score > 0.5) {
    const ceiling = 0.5;
    if (capped > ceiling) {
      caps.push({ cap_code: 'AMBIGUITY_CAP', applied: true, max_after_cap: ceiling, reason: `ambiguity score=${input.ambiguity.score.toFixed(3)}` });
      capped = ceiling;
    }
  }

  const materiality_modifier = spec.materiality_modifier;
  const adjusted = clamp01(capped * (1 + (materiality_modifier - 1) * 0.25));

  const confidence_score = adjusted;
  const confidence_band = bandForScore(confidence_score);

  // §7.4.7.4 — contradiction penalty must be present when contradiction exists.
  if (
    input.contradiction_bundle.contradiction_records.length > 0 &&
    components.contradiction_penalty_component === 0
  ) {
    violations.push(v(L7RuntimeViolationCode.CONFIDENCE_MISSING_CONTRADICTION_PENALTY, s, 'contradiction present but penalty component is 0'));
  }
  if (confidence_score < 0 || confidence_score > 1) {
    violations.push(v(L7RuntimeViolationCode.CONFIDENCE_SCORE_OUT_OF_RANGE, s, `score ${confidence_score} out of [0,1]`));
  }
  if (violations.length > 0) return fail(violations);

  const confidence_assessment_id = `cna:${s.validation_subject_id}:${input.run_id}`;
  const replayHash = canonicalValidationReplayHash({
    subject_contract_ref: s.validation_subject_id,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    contract_versions: {
      subject: s.subject_contract_version,
      confidence: input.confidence_contract_version,
      policy: input.confidence_policy_version,
    },
    material_inputs_canonical: components,
    contradiction_bundle_id: input.contradiction_bundle.contradiction_bundle_id,
    confidence_factor_signature: { components, weights, caps },
    restriction_profile_id: null,
    mode: RUN_MODE_TO_REPLAY_IDENTITY[input.run_mode],
    compute_run_id: input.run_id,
  });

  const contract: L7ConfidenceAssessmentContract = {
    confidence_assessment_id,
    validation_subject_id: s.validation_subject_id,
    subject_contract_ref: s.validation_subject_id,
    confidence_contract_version: input.confidence_contract_version,
    schema_version: input.schema_version,
    confidence_policy_version: input.confidence_policy_version,
    raw_score,
    capped_score: capped,
    confidence_score,
    confidence_band: band(confidence_band),
    materiality_modifier,
    components,
    component_weights: weights,
    cap_chain: caps,
    restriction_profile_ref: null,
    rationale_codes: rationaleForBand(confidence_band, caps),
    lineage_refs: { trace_id: input.trace_id, manifest_id: input.manifest_id },
    compute_run_id: input.run_id,
    replay_hash: replayHash,
  };
  return ok(contract);
}

function band(b: L7ConfidenceBand): L7ConfidenceBand { return b; }

function normaliseWeights(spec: L7ConfidenceDerivationSpec): L7ConfidenceComponentWeights {
  const keys: (keyof L7ConfidenceComponentWeights)[] = [
    'source_trust_weight',
    'freshness_weight',
    'feature_completeness_weight',
    'cross_source_agreement_weight',
    'regime_compatibility_weight',
    'historical_reliability_weight',
    'contradiction_penalty_weight',
  ];
  const defaults = {
    source_trust_weight: 0.15,
    freshness_weight: 0.15,
    feature_completeness_weight: 0.15,
    cross_source_agreement_weight: 0.15,
    regime_compatibility_weight: 0.1,
    historical_reliability_weight: 0.1,
    contradiction_penalty_weight: 0.35,
  };
  const out = { ...defaults };
  for (const key of keys) {
    const k = weightKeyForSpecFactor(key);
    const w = spec.factor_weights[k];
    if (typeof w === 'number' && isFinite(w) && w >= 0) {
      out[key] = w;
    }
  }
  return out;
}

function weightKeyForSpecFactor(key: keyof L7ConfidenceComponentWeights): string {
  // map weight key → policy factor id as used in the subject contract.
  switch (key) {
    case 'source_trust_weight': return 'source_trust';
    case 'freshness_weight': return 'freshness';
    case 'feature_completeness_weight': return 'feature_completeness';
    case 'cross_source_agreement_weight': return 'cross_source_agreement';
    case 'regime_compatibility_weight': return 'regime_compatibility';
    case 'historical_reliability_weight': return 'historical_reliability';
    case 'contradiction_penalty_weight': return 'contradiction_penalty';
  }
}

function meanConfidence(support: readonly L7SupportRecord[]): number {
  if (support.length === 0) return 0;
  const m = { HIGH: 0.9, MEDIUM: 0.6, LOW: 0.3 };
  return support.reduce((acc, r) => acc + m[r.confidence_posture], 0) / support.length;
}

function freshnessComponent(support: readonly L7SupportRecord[]): number {
  if (support.length === 0) return 0;
  const m = { CURRENT: 1, RECENT: 0.75, STALE: 0.4, EXPIRED: 0.1 };
  return support.reduce((acc, r) => acc + m[r.freshness_class], 0) / support.length;
}

function completenessComponent(
  support: readonly L7SupportRecord[],
  incompleteness: L7EvaluationOutput,
): number {
  const base =
    support.length === 0
      ? 0
      : support.reduce((acc, r) => {
          const m = { FULL: 1, PARTIAL: 0.6, MISSING: 0 }[r.completeness_class];
          return acc + m;
        }, 0) / support.length;
  return clamp01(base * (1 - incompleteness.score));
}

function crossSourceAgreement(
  support: readonly L7SupportRecord[],
  challenge: readonly L7ChallengeRecord[],
): number {
  const supFamilies = new Set(support.map(r => r.family));
  const chFamilies = new Set(
    challenge.filter(c => c.challenge_class !== 'MISSING_CONFIRMATION').map(c => c.family),
  );
  const disagreeingFamilies = [...chFamilies].filter(f => supFamilies.has(f)).length;
  const totalSupport = Math.max(1, supFamilies.size);
  return clamp01(1 - disagreeingFamilies / totalSupport);
}

function regimeComponent(
  s: L7ValidationSubjectContract,
  classification: L7ClassificationOutput,
): number {
  if (!s.regime_assumption_profile.declared) return 0.7;
  if (classification.modifiers.includes('PARTIAL_REGIME_COMPATIBILITY')) return 0.4;
  return s.regime_assumption_profile.compatibility_mode === 'REQUIRED' ? 0.9 : 0.8;
}

function rationaleForBand(band: L7ConfidenceBand, caps: readonly L7ConfidenceCap[]): string[] {
  const r = [`band=${band}`];
  for (const c of caps) if (c.applied) r.push(`cap=${c.cap_code}`);
  return r.sort();
}

function clamp01(n: number): number {
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function v(code: L7RuntimeViolationCode, s: L7ValidationSubjectContract, detail: string): L7RuntimeViolation {
  return {
    code,
    source: 'validation-confidence-engine',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context: {},
  };
}
