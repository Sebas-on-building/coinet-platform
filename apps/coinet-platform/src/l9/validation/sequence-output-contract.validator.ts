/**
 * L9.3 — Sequence Output Contract Validator
 *
 * §9.3.3.4 — Output-law rules.
 * §9.3.3.5 — Cleanliness law.
 * §9.3.3.6 — State-pair law.
 */

import { L9SequenceOutputContract } from '../contracts/sequence-output.contract';
import {
  isL9RegisteredSequenceFamily,
  l9FamilyAllowsScope,
  l9FamilyRequiresPostEventAnchor,
} from '../contracts/sequence-family';
import {
  isL9RegisteredSequenceState,
  l9StateBelongsToFamily,
  l9StateRequiresPostEventAnchor,
  l9StateAllowsCleanSingle,
} from '../contracts/sequence-state';
import { L9SequenceConfidenceBand } from '../contracts/sequence-assessment';
import {
  L9SequenceCoexistenceClass,
  decideL9Coexistence,
} from '../contracts/sequence-coexistence';
import { L9PhaseProgressionClass } from '../contracts/phase-state';
import { L9DecayClass } from '../contracts/decay-profile';
import { containsL9ForbiddenNaming } from '../contracts/l9-boundary';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9OutputContractIssue {
  readonly code: L9SequenceContractViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L9OutputContractReport {
  readonly valid: boolean;
  readonly issues: readonly L9OutputContractIssue[];
}

const ISO_TS =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

function inRange01(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
}

function bandConsistent(
  score: number,
  band: L9SequenceConfidenceBand,
): boolean {
  // Frozen banding: LOW < 0.35 ≤ MODERATE < 0.65 ≤ HIGH < 0.9 ≤ FULL
  if (band === L9SequenceConfidenceBand.LOW) return score < 0.35;
  if (band === L9SequenceConfidenceBand.MODERATE) {
    return score >= 0.35 && score < 0.65;
  }
  if (band === L9SequenceConfidenceBand.HIGH) {
    return score >= 0.65 && score < 0.9;
  }
  if (band === L9SequenceConfidenceBand.FULL) return score >= 0.9;
  return false;
}

function phaseClassConsistent(
  score: number,
  cls: L9PhaseProgressionClass,
): boolean {
  if (cls === L9PhaseProgressionClass.INITIATING) return score < 0.25;
  if (cls === L9PhaseProgressionClass.DEVELOPING) {
    return score >= 0.25 && score < 0.5;
  }
  if (cls === L9PhaseProgressionClass.CONFIRMED) {
    return score >= 0.5 && score < 0.75;
  }
  if (cls === L9PhaseProgressionClass.MATURING) {
    return score >= 0.75 && score < 0.9;
  }
  if (cls === L9PhaseProgressionClass.TERMINAL) return score >= 0.9;
  return false;
}

function decayClassConsistent(
  score: number,
  cls: L9DecayClass,
): boolean {
  if (cls === L9DecayClass.FRESH) return score < 0.2;
  if (cls === L9DecayClass.AGING) return score >= 0.2 && score < 0.5;
  if (cls === L9DecayClass.DECAYING) return score >= 0.5 && score < 0.8;
  if (cls === L9DecayClass.DEPRECATED) return score >= 0.8;
  return false;
}

const OUTPUT_CLEANLINESS_LIMITS = {
  ambiguity_material: 0.3,
  staleness_material: 0.3,
  degradation_material: 0.3,
  decay_high: 0.6,
  chain_incomplete: 0.7, // sequence_completeness_score < 0.7 → incomplete
} as const;

export function validateL9SequenceOutputContract(
  out: L9SequenceOutputContract,
): L9OutputContractReport {
  const issues: L9OutputContractIssue[] = [];

  // Identity + versioning
  if (!out.sequence_result_id) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_IDENTITY,
      message: 'sequence_result_id missing',
    });
  }
  if (!out.sequence_subject_id) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_SUBJECT_REF,
      message: 'sequence_subject_id missing',
    });
  }
  if (!out.subject_contract_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_SUBJECT_CONTRACT_REF,
      message: 'subject_contract_ref missing',
    });
  }
  if (!out.output_contract_version || !SEMVER.test(out.output_contract_version)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_CONTRACT_VERSION,
      message:
        `output_contract_version missing or not semver: ${out.output_contract_version}`,
    });
  }
  if (!out.schema_version) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_SCHEMA_VERSION,
      message: 'schema_version missing',
    });
  }
  if (!out.policy_version) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_POLICY_VERSION,
      message: 'policy_version missing',
    });
  }

  // Family + state
  if (!out.sequence_family || !isL9RegisteredSequenceFamily(out.sequence_family)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_FAMILY,
      message:
        `sequence_family missing or unregistered: ${out.sequence_family}`,
    });
  }
  if (!out.primary_sequence_state ||
      !isL9RegisteredSequenceState(out.primary_sequence_state)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_PRIMARY_STATE,
      message:
        `primary_sequence_state missing or unregistered: ${out.primary_sequence_state}`,
    });
  } else if (out.sequence_family &&
      isL9RegisteredSequenceFamily(out.sequence_family) &&
      !l9StateBelongsToFamily(out.primary_sequence_state, out.sequence_family)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_PRIMARY_STATE,
      message:
        `primary_sequence_state ${out.primary_sequence_state} not in family ${out.sequence_family}`,
    });
  }

  // Scope + time
  if (!out.scope_type || !out.scope_id) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_SCOPE,
      message: 'scope_type or scope_id missing',
    });
  } else if (out.sequence_family &&
      isL9RegisteredSequenceFamily(out.sequence_family) &&
      !l9FamilyAllowsScope(out.sequence_family, out.scope_type)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_SCOPE,
      message:
        `scope_type ${out.scope_type} not legal for family ${out.sequence_family}`,
    });
  }
  if (!out.as_of || !ISO_TS.test(out.as_of)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_TIME_ANCHOR,
      message: `as_of missing or not ISO-8601: ${out.as_of}`,
    });
  }

  // Confidence
  if (!inRange01(out.sequence_confidence_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_CONFIDENCE_OUT_OF_RANGE,
      message:
        `sequence_confidence_score out of [0,1]: ${out.sequence_confidence_score}`,
    });
  } else if (out.sequence_confidence_band &&
      !bandConsistent(
        out.sequence_confidence_score,
        out.sequence_confidence_band,
      )) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_CONFIDENCE_BAND_INCONSISTENT,
      message:
        `sequence_confidence_band ${out.sequence_confidence_band} inconsistent with score ${out.sequence_confidence_score}`,
    });
  }

  // Phase
  if (!inRange01(out.phase_progression_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_PHASE_SCORE_OUT_OF_RANGE,
      message:
        `phase_progression_score out of [0,1]: ${out.phase_progression_score}`,
    });
  } else if (out.phase_progression_class &&
      !phaseClassConsistent(
        out.phase_progression_score,
        out.phase_progression_class,
      )) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_PHASE_CLASS_INCONSISTENT,
      message:
        `phase_progression_class ${out.phase_progression_class} inconsistent with score ${out.phase_progression_score}`,
    });
  }

  // Decay
  if (!inRange01(out.sequence_decay_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_DECAY_SCORE_OUT_OF_RANGE,
      message:
        `sequence_decay_score out of [0,1]: ${out.sequence_decay_score}`,
    });
  } else if (out.sequence_decay_class &&
      !decayClassConsistent(
        out.sequence_decay_score,
        out.sequence_decay_class,
      )) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_DECAY_CLASS_INCONSISTENT,
      message:
        `sequence_decay_class ${out.sequence_decay_class} inconsistent with score ${out.sequence_decay_score}`,
    });
  }

  // Sub-object refs
  if (!out.lead_lag_profile_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_LEAD_LAG_PROFILE,
      message: 'lead_lag_profile_ref missing',
    });
  }
  if (!out.ordered_signal_refs || out.ordered_signal_refs.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_ORDERED_REFS,
      message: 'ordered_signal_refs empty',
    });
  }
  if (!out.sequence_chain_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_CHAIN_REF,
      message: 'sequence_chain_ref missing',
    });
  }
  if (!out.phase_state_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_PHASE_REF,
      message: 'phase_state_ref missing',
    });
  }
  if (!out.decay_profile_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_DECAY_REF,
      message: 'decay_profile_ref missing',
    });
  }

  // Post-event refs: required if state/family requires post-event anchor.
  const postEventNeeded =
    (!!out.sequence_family &&
      isL9RegisteredSequenceFamily(out.sequence_family) &&
      l9FamilyRequiresPostEventAnchor(out.sequence_family)) ||
    (!!out.primary_sequence_state &&
      isL9RegisteredSequenceState(out.primary_sequence_state) &&
      l9StateRequiresPostEventAnchor(out.primary_sequence_state));
  if (postEventNeeded &&
      (!out.post_event_window_refs || out.post_event_window_refs.length === 0)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_POST_EVENT_REFS,
      message:
        'post_event_window_refs empty but family/state requires post-event anchor',
    });
  }

  // Conditioning
  if (!out.restriction_profile_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_RESTRICTION_PROFILE,
      message: 'restriction_profile_ref missing',
    });
  }
  if (!out.validation_refs || out.validation_refs.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_VALIDATION_REFS,
      message: 'validation_refs empty (L7 consumption required)',
    });
  }
  if (!out.evidence_pack_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_EVIDENCE_PACK_REF,
      message: 'evidence_pack_ref missing',
    });
  }
  if (!out.input_snapshot_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_INPUT_SNAPSHOT_REF,
      message: 'input_snapshot_ref missing',
    });
  }
  if (!out.compute_run_id) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_RUN_ID,
      message: 'compute_run_id missing',
    });
  }
  if (!out.replay_hash) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_REPLAY_HASH,
      message: 'replay_hash missing',
    });
  }

  // Lineage
  if (!out.lineage_refs || !out.lineage_refs.trace_id ||
      !out.lineage_refs.manifest_id) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }

  // Materialization
  if (!out.materialization_mode) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_MATERIALIZATION_MODE,
      message: 'materialization_mode missing',
    });
  }

  // Causal restraint (§9.3.3.3 / INV-9.3-G)
  if (!out.causal_restraint_flags ||
      out.causal_restraint_flags.chain_is_temporal_only !== true ||
      out.causal_restraint_flags.hypothesis_excluded !== true ||
      out.causal_restraint_flags.judgment_excluded !== true ||
      out.causal_restraint_flags.scenario_excluded !== true ||
      out.causal_restraint_flags.recommendation_excluded !== true) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_CAUSAL_RESTRAINT,
      message: 'causal_restraint_flags missing or weak',
    });
  } else if (!out.causal_restraint_flags.adjacency_is_not_causality_disclaimer) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_CAUSAL_RESTRAINT,
      message:
        'causal_restraint_flags.adjacency_is_not_causality_disclaimer missing',
    });
  }

  // Coexistence + integrity flags
  if (!out.coexistence_class) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_COEXISTENCE_CLASS,
      message: 'coexistence_class missing',
    });
  }
  if (!out.chain_integrity_flags) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_INTEGRITY_FLAGS,
      message: 'chain_integrity_flags missing',
    });
  }

  // State-pair law (§9.3.3.6)
  if (out.secondary_sequence_state !== null &&
      out.secondary_sequence_state !== undefined) {
    if (out.secondary_sequence_state === out.primary_sequence_state) {
      issues.push({
        code: L9SequenceContractViolationCode.OUTPUT_SECONDARY_EQUALS_PRIMARY,
        message: 'secondary_sequence_state equals primary',
      });
    }
    if (out.sequence_family &&
        isL9RegisteredSequenceFamily(out.sequence_family) &&
        !l9StateBelongsToFamily(
          out.secondary_sequence_state,
          out.sequence_family,
        )) {
      issues.push({
        code: L9SequenceContractViolationCode.OUTPUT_SECONDARY_WRONG_FAMILY,
        message:
          `secondary_sequence_state ${out.secondary_sequence_state} not in family ${out.sequence_family}`,
      });
    }
  }
  if (out.sequence_family && isL9RegisteredSequenceFamily(out.sequence_family) &&
      out.primary_sequence_state &&
      isL9RegisteredSequenceState(out.primary_sequence_state) &&
      out.coexistence_class) {
    const decision = decideL9Coexistence(
      out.sequence_family,
      out.primary_sequence_state,
      out.secondary_sequence_state ?? null,
      out.coexistence_class,
    );
    if (!decision.allowed) {
      issues.push({
        code: L9SequenceContractViolationCode.OUTPUT_SECONDARY_WRONG_FAMILY,
        message:
          `coexistence not legal: declared=${out.coexistence_class} required=${decision.requiredClass ?? 'N/A'} reason=${decision.reason}`,
      });
    }
  }

  // Cleanliness law (§9.3.3.5)
  const declaredClean =
    out.coexistence_class === L9SequenceCoexistenceClass.CLEAN_SINGLE;
  if (declaredClean && out.primary_sequence_state &&
      isL9RegisteredSequenceState(out.primary_sequence_state) &&
      !l9StateAllowsCleanSingle(out.primary_sequence_state)) {
    issues.push({
      code: L9SequenceContractViolationCode.CLEAN_WHILE_AMBIGUOUS,
      message:
        `state ${out.primary_sequence_state} disallows CLEAN_SINGLE emission`,
    });
  }
  if (declaredClean && inRange01(out.ambiguity_score) &&
      out.ambiguity_score >= OUTPUT_CLEANLINESS_LIMITS.ambiguity_material) {
    issues.push({
      code: L9SequenceContractViolationCode.CLEAN_WHILE_AMBIGUOUS,
      message:
        `CLEAN_SINGLE with ambiguity_score ${out.ambiguity_score} ≥ material`,
    });
  }
  if (declaredClean && inRange01(out.staleness_score) &&
      out.staleness_score >= OUTPUT_CLEANLINESS_LIMITS.staleness_material) {
    issues.push({
      code: L9SequenceContractViolationCode.CLEAN_WHILE_STALE,
      message:
        `CLEAN_SINGLE with staleness_score ${out.staleness_score} ≥ material`,
    });
  }
  if (declaredClean && inRange01(out.degradation_score) &&
      out.degradation_score >=
        OUTPUT_CLEANLINESS_LIMITS.degradation_material) {
    issues.push({
      code: L9SequenceContractViolationCode.CLEAN_WHILE_DEGRADED,
      message:
        `CLEAN_SINGLE with degradation_score ${out.degradation_score} ≥ material`,
    });
  }
  if (declaredClean && inRange01(out.sequence_decay_score) &&
      out.sequence_decay_score >= OUTPUT_CLEANLINESS_LIMITS.decay_high) {
    issues.push({
      code: L9SequenceContractViolationCode.CLEAN_WHILE_DECAY_HIGH,
      message:
        `CLEAN_SINGLE with sequence_decay_score ${out.sequence_decay_score} ≥ high`,
    });
  }
  if (declaredClean && inRange01(out.sequence_completeness_score) &&
      out.sequence_completeness_score <
        OUTPUT_CLEANLINESS_LIMITS.chain_incomplete) {
    issues.push({
      code: L9SequenceContractViolationCode.CLEAN_WHILE_CHAIN_INCOMPLETE,
      message:
        `CLEAN_SINGLE with sequence_completeness_score ${out.sequence_completeness_score} < threshold`,
    });
  }
  if (declaredClean && postEventNeeded &&
      (!out.post_event_window_refs || out.post_event_window_refs.length === 0)) {
    issues.push({
      code: L9SequenceContractViolationCode.CLEAN_WHILE_POST_EVENT_MISSING,
      message:
        'CLEAN_SINGLE without post-event anchors though family/state requires them',
    });
  }
  if (out.chain_integrity_flags && out.chain_integrity_flags.length > 0 &&
      declaredClean) {
    issues.push({
      code: L9SequenceContractViolationCode.CLEAN_WHILE_CHAIN_INCOMPLETE,
      message:
        `CLEAN_SINGLE while chain_integrity_flags=[${out.chain_integrity_flags.join(',')}] non-empty`,
    });
  }

  // Posture required checks
  if (!inRange01(out.ambiguity_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.AMBIGUITY_POSTURE_REQUIRED,
      message: 'ambiguity_score missing or out of range',
    });
  }
  if (!inRange01(out.staleness_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_SCORE_OUT_OF_RANGE,
      message: 'staleness_score missing or out of range',
    });
  }
  if (!inRange01(out.degradation_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.DEGRADATION_POSTURE_REQUIRED,
      message: 'degradation_score missing or out of range',
    });
  }
  if (!inRange01(out.sequence_completeness_score)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_SCORE_OUT_OF_RANGE,
      message: 'sequence_completeness_score missing or out of range',
    });
  }

  // Restriction posture required (INV-9.3-D)
  if (!out.restriction_profile_ref) {
    issues.push({
      code: L9SequenceContractViolationCode.RESTRICTION_POSTURE_REQUIRED,
      message: 'restriction_profile_ref must be attached on every output',
    });
  }

  // Judgment/scenario/recommendation leakage in any free-form string refs
  // (L9 outputs should carry IDs, not prose; leak-detect anyway).
  const leakStrings = [
    out.sequence_result_id, out.compute_run_id,
    ...(out.ordered_signal_refs ?? []),
  ].filter((s): s is string => typeof s === 'string');
  if (leakStrings.some(containsL9ForbiddenNaming)) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_JUDGMENT_LEAK,
      message:
        'output identifiers contain forbidden judgment/scenario/recommendation semantics',
    });
  }

  // Runtime integrity flags present
  if (!out.runtime_integrity_flags) {
    issues.push({
      code: L9SequenceContractViolationCode.OUTPUT_MISSING_INTEGRITY_FLAGS,
      message: 'runtime_integrity_flags missing',
    });
  }

  return { valid: issues.length === 0, issues };
}
