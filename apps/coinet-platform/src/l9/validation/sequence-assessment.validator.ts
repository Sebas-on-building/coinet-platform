/**
 * L9.2 — Sequence Assessment Validator
 *
 * §9.2.8.4 — A SequenceAssessment is illegal if:
 *   - primary sequence state is absent
 *   - sequence family is absent
 *   - ordered refs are absent
 *   - lead-lag posture is absent
 *   - phase posture is absent
 *   - decay posture is absent
 *   - replay lineage is absent
 *   - ambiguity/staleness/degradation is silently ignored
 *   - required L7 or L8 posture was not consumed
 *
 * This validator composes family + coexistence + completeness checks
 * into a single report callable from runtime and tests.
 */

import { L9SequenceAssessment } from '../contracts/sequence-assessment';
import { L9SequenceObjectViolationCode } from '../contracts/sequence-output-class';
import {
  validateL9SequenceFamily,
} from './sequence-family.validator';
import {
  validateL9IntraFamilyCoexistence,
} from './sequence-coexistence.validator';
import {
  L9SequenceFamilyRegistry,
  getDefaultL9SequenceFamilyRegistry,
} from '../registry/sequence-family.registry';
import {
  L9SequenceStateRegistry,
  getDefaultL9SequenceStateRegistry,
} from '../registry/sequence-state.registry';
import { L9SequenceConfidenceBand } from '../contracts/sequence-assessment';
import { L9DecayClass } from '../contracts/decay-profile';

export interface L9AssessmentValidationIssue {
  readonly code: L9SequenceObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L9AssessmentValidationReport {
  readonly valid: boolean;
  readonly issues: readonly L9AssessmentValidationIssue[];
}

function inRange01(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= 1;
}

function bandForScore(score: number): L9SequenceConfidenceBand {
  if (score >= 0.9) return L9SequenceConfidenceBand.FULL;
  if (score >= 0.75) return L9SequenceConfidenceBand.HIGH;
  if (score >= 0.5) return L9SequenceConfidenceBand.MODERATE;
  return L9SequenceConfidenceBand.LOW;
}

function decayClassForScore(score: number): L9DecayClass {
  if (score >= 0.75) return L9DecayClass.DEPRECATED;
  if (score >= 0.5) return L9DecayClass.DECAYING;
  if (score >= 0.25) return L9DecayClass.AGING;
  return L9DecayClass.FRESH;
}

export interface L9AssessmentValidationInput {
  readonly assessment: L9SequenceAssessment;
  /** §9.2.4.9 — Whether a post-event window is anchored. */
  readonly postEventAnchorPresent: boolean;
  /** §9.2.4.2 — Whether the subject declared regime refs as required by family. */
  readonly regimeRefsPresent: boolean;
}

export function validateL9SequenceAssessment(
  input: L9AssessmentValidationInput,
  familyRegistry: L9SequenceFamilyRegistry = getDefaultL9SequenceFamilyRegistry(),
  stateRegistry: L9SequenceStateRegistry = getDefaultL9SequenceStateRegistry(),
): L9AssessmentValidationReport {
  const issues: L9AssessmentValidationIssue[] = [];
  const a = input.assessment;

  // Identity
  if (!a.sequence_assessment_id) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_ID,
      message: 'sequence_assessment_id is required',
    });
  }
  if (!a.sequence_subject_id) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_SUBJECT,
      message: 'sequence_subject_id is required',
    });
  }

  // Family and primary state legality
  const famReport = validateL9SequenceFamily(
    {
      family: a.sequence_family,
      sequenceState: a.primary_sequence_state,
      scope_type: a.scope_type,
    },
    familyRegistry,
    stateRegistry,
  );
  for (const i of famReport.issues) issues.push(i);
  if (!a.primary_sequence_state) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_PRIMARY_STATE,
      message: 'primary_sequence_state is required',
    });
  }

  // Secondary state family check
  if (a.secondary_sequence_state !== null) {
    if (a.secondary_sequence_state === a.primary_sequence_state) {
      issues.push({
        code: L9SequenceObjectViolationCode.ASSESSMENT_SECONDARY_EQUALS_PRIMARY,
        message: 'secondary_sequence_state must differ from primary_sequence_state',
      });
    } else {
      if (!stateRegistry.belongsToFamily(a.secondary_sequence_state, a.sequence_family)) {
        issues.push({
          code: L9SequenceObjectViolationCode.ASSESSMENT_SECONDARY_WRONG_FAMILY,
          message:
            `secondary_sequence_state ${a.secondary_sequence_state} does not belong to family ${a.sequence_family}`,
        });
      }
    }
  }

  // Coexistence law
  const coexReport = validateL9IntraFamilyCoexistence({
    family: a.sequence_family,
    primary: a.primary_sequence_state,
    secondary: a.secondary_sequence_state,
    declaredClass: a.coexistence_class,
    postEventAnchorPresent: input.postEventAnchorPresent,
  });
  for (const i of coexReport.issues) issues.push(i);

  // Object-completeness (§9.2.8.4)
  if (a.ordered_signal_refs.length === 0) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_ORDERED_REFS,
      message: 'ordered_signal_refs must not be empty',
    });
  }
  if (!a.sequence_chain_ref) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_CHAIN,
      message: 'sequence_chain_ref is required',
    });
  }
  if (a.lead_lag_relations.length === 0) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_LEAD_LAG,
      message: 'lead_lag_relations must not be empty (lead-lag is first-class)',
    });
  }
  if (!a.phase_state_ref || !a.phase_class) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_PHASE,
      message: 'phase_state_ref and phase_class are required',
    });
  }
  if (!a.decay_profile_ref) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_DECAY,
      message: 'decay_profile_ref is required',
    });
  }
  if (
    (stateRegistry.requiresPostEventAnchor(a.primary_sequence_state) ||
      familyRegistry.requiresPostEventAnchor(a.sequence_family)) &&
    a.post_event_window_refs.length === 0
  ) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_POST_EVENT_WINDOW,
      message: 'post_event_window_refs required for this family/state',
    });
  }

  // Conditioning and contradiction
  if (a.validation_refs.length === 0) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_VALIDATION_REFS,
      message: 'validation_refs must not be empty (L7 posture must be consumed)',
    });
  }
  if (familyRegistry.requiresRegimeConditioning(a.sequence_family)) {
    if (a.regime_refs.length === 0 || !input.regimeRefsPresent) {
      issues.push({
        code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_REGIME_REFS,
        message: 'regime_refs required for regime-conditioned family',
      });
    }
  }
  if (!a.restriction_profile_ref) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_RESTRICTION_PROFILE,
      message: 'restriction_profile_ref is required',
    });
  }

  // Lineage and replay
  if (!a.evidence_pack_ref) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_EVIDENCE_PACK,
      message: 'evidence_pack_ref is required',
    });
  }
  if (!a.input_snapshot_ref) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_INPUT_SNAPSHOT,
      message: 'input_snapshot_ref is required',
    });
  }
  if (!a.compute_run_id) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_COMPUTE_RUN,
      message: 'compute_run_id is required',
    });
  }
  if (!a.replay_hash) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_REPLAY_HASH,
      message: 'replay_hash is required',
    });
  }
  if (
    !a.lineage_refs ||
    a.lineage_refs.length === 0
  ) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_LINEAGE,
      message: 'lineage_refs must not be empty',
    });
  }
  if (!a.policy_version) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_POLICY_VERSION,
      message: 'policy_version is required',
    });
  }

  // Causal restraint flags
  if (
    !a.causal_restraint_flags ||
    !a.causal_restraint_flags.chain_is_temporal_only ||
    !a.causal_restraint_flags.hypothesis_excluded ||
    !a.causal_restraint_flags.judgment_excluded ||
    !a.causal_restraint_flags.scenario_excluded ||
    !a.causal_restraint_flags.recommendation_excluded
  ) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_MISSING_CAUSAL_RESTRAINT,
      message: 'causal_restraint_flags missing or incomplete',
    });
  }

  // Scores in range / band consistency
  if (!inRange01(a.sequence_confidence_score)) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_CONFIDENCE_OUT_OF_RANGE,
      message: `sequence_confidence_score=${a.sequence_confidence_score} out of [0,1]`,
    });
  } else if (bandForScore(a.sequence_confidence_score) !== a.sequence_confidence_band) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_CONFIDENCE_BAND_INCONSISTENT,
      message: `sequence_confidence_band ${a.sequence_confidence_band} inconsistent with score ${a.sequence_confidence_score}`,
    });
  }
  if (!inRange01(a.sequence_decay_score)) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_DECAY_SCORE_OUT_OF_RANGE,
      message: `sequence_decay_score=${a.sequence_decay_score} out of [0,1]`,
    });
  } else if (decayClassForScore(a.sequence_decay_score) !== a.sequence_decay_class) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_DECAY_CLASS_INCONSISTENT,
      message: `sequence_decay_class ${a.sequence_decay_class} inconsistent with score ${a.sequence_decay_score}`,
    });
  }
  if (!inRange01(a.ambiguity_score)) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_AMBIGUITY_SCORE_OUT_OF_RANGE,
      message: `ambiguity_score=${a.ambiguity_score} out of [0,1]`,
    });
  }
  if (!inRange01(a.sequence_completeness_score)) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_COMPLETENESS_SCORE_OUT_OF_RANGE,
      message: `sequence_completeness_score=${a.sequence_completeness_score} out of [0,1]`,
    });
  }
  if (!inRange01(a.staleness_score)) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_STALENESS_SCORE_OUT_OF_RANGE,
      message: `staleness_score=${a.staleness_score} out of [0,1]`,
    });
  }
  if (!inRange01(a.degradation_score)) {
    issues.push({
      code: L9SequenceObjectViolationCode.ASSESSMENT_DEGRADATION_SCORE_OUT_OF_RANGE,
      message: `degradation_score=${a.degradation_score} out of [0,1]`,
    });
  }

  return { valid: issues.length === 0, issues };
}

export { bandForScore as l9BandForConfidenceScore, decayClassForScore as l9DecayClassForScore };
