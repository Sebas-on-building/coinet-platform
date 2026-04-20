/**
 * L9.3 — Sequence Subject Contract Validator
 *
 * §9.3.2.9 — Enforces completeness and legality of an
 * `L9SequenceSubjectContract`: identity, scope, inputs, temporal rules,
 * sequence rules, confidence/restriction derivation, persistence/
 * evidence policy, and production-extension fields.
 */

import {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import {
  isL9RegisteredSequenceFamily,
  l9FamilyAllowsScope,
  l9FamilyRequiresPostEventAnchor,
  l9FamilyRequiresRegimeConditioning,
} from '../contracts/sequence-family';
import {
  isL9RegisteredSequenceState,
  l9StateBelongsToFamily,
} from '../contracts/sequence-state';
import { containsL9ForbiddenNaming } from '../contracts/l9-boundary';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9SubjectContractIssue {
  readonly code: L9SequenceContractViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L9SubjectContractReport {
  readonly valid: boolean;
  readonly issues: readonly L9SubjectContractIssue[];
}

const ISO_TS =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

function requireNonEmpty(
  issues: L9SubjectContractIssue[],
  code: L9SequenceContractViolationCode,
  field: string,
  value: unknown,
): void {
  if (value === undefined || value === null ||
      (typeof value === 'string' && value.length === 0)) {
    issues.push({ code, message: `${field} missing` });
  }
}

export function validateL9SequenceSubjectContract(
  subject: L9SequenceSubjectContract,
): L9SubjectContractReport {
  const issues: L9SubjectContractIssue[] = [];

  // Identity (§9.3.2.2)
  requireNonEmpty(issues,
    L9SequenceContractViolationCode.SUBJECT_MISSING_IDENTITY,
    'sequence_subject_id', subject.sequence_subject_id);
  requireNonEmpty(issues,
    L9SequenceContractViolationCode.SUBJECT_MISSING_TEMPLATE,
    'sequence_template_id', subject.sequence_template_id);
  requireNonEmpty(issues,
    L9SequenceContractViolationCode.SUBJECT_MISSING_VERSION,
    'sequence_version', subject.sequence_version);

  if (!subject.sequence_family ||
      !isL9RegisteredSequenceFamily(subject.sequence_family)) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_FAMILY,
      message:
        `sequence_family missing or unregistered: ${subject.sequence_family}`,
    });
  }

  // Versioning (§9.3.7.1)
  if (!subject.subject_contract_version ||
      !SEMVER.test(subject.subject_contract_version)) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_CONTRACT_VERSION,
      message:
        `subject_contract_version missing or not semver: ${subject.subject_contract_version}`,
    });
  }
  if (!subject.schema_version) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_SCHEMA_VERSION,
      message: 'schema_version missing',
    });
  }
  if (!subject.policy_version) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_POLICY_VERSION,
      message: 'policy_version missing',
    });
  }

  // Scope (§9.3.2.2)
  if (!subject.scope_type || !subject.scope_id) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_SCOPE,
      message: 'scope_type or scope_id missing',
    });
  }
  if (!subject.scope_granularity) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_SCOPE_GRANULARITY,
      message: 'scope_granularity missing',
    });
  }
  if (subject.sequence_family && subject.scope_type &&
      isL9RegisteredSequenceFamily(subject.sequence_family) &&
      !l9FamilyAllowsScope(subject.sequence_family, subject.scope_type)) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_SCOPE_ILLEGAL_FOR_FAMILY,
      message:
        `scope_type ${subject.scope_type} is not legal for family ${subject.sequence_family}`,
    });
  }

  // Allowed state set (§9.3.2.8)
  if (!subject.allowed_sequence_state_set ||
      subject.allowed_sequence_state_set.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_ALLOWED_STATE_SET,
      message: 'allowed_sequence_state_set must be non-empty',
    });
  } else if (subject.sequence_family &&
      isL9RegisteredSequenceFamily(subject.sequence_family)) {
    for (const s of subject.allowed_sequence_state_set) {
      if (!isL9RegisteredSequenceState(s) ||
          !l9StateBelongsToFamily(s, subject.sequence_family)) {
        issues.push({
          code: L9SequenceContractViolationCode.SUBJECT_STATE_NOT_IN_FAMILY,
          message:
            `allowed_sequence_state_set contains state ${s} not in family ${subject.sequence_family}`,
        });
      }
    }
  }

  // Inputs (§9.3.2.3)
  if (!subject.required_validation_inputs ||
      subject.required_validation_inputs.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_VALIDATION_INPUTS,
      message: 'required_validation_inputs empty (L7 handoff refs required)',
    });
  }
  if (!subject.required_event_inputs ||
      subject.required_event_inputs.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_EVENT_INPUTS,
      message: 'required_event_inputs empty',
    });
  }
  if (!subject.required_feature_inputs ||
      subject.required_feature_inputs.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_FEATURE_INPUTS,
      message: 'required_feature_inputs empty',
    });
  }

  // Regime inputs required for families that are regime-conditioned.
  if (subject.sequence_family &&
      isL9RegisteredSequenceFamily(subject.sequence_family) &&
      l9FamilyRequiresRegimeConditioning(subject.sequence_family) &&
      (!subject.required_regime_inputs ||
        subject.required_regime_inputs.length === 0)) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_REGIME_INPUTS,
      message:
        `family ${subject.sequence_family} requires regime conditioning but required_regime_inputs is empty`,
    });
  }

  // Input-family mix: evidence_only inputs must not be used as required
  if (subject.required_validation_inputs) {
    for (const r of subject.required_validation_inputs) {
      if (r.evidence_only) {
        issues.push({
          code: L9SequenceContractViolationCode.SUBJECT_INPUT_FAMILY_MIX,
          message:
            `required_validation_inputs contains evidence_only ref: ${r.ref}`,
        });
      }
      if (r.context_only) {
        issues.push({
          code: L9SequenceContractViolationCode.SUBJECT_INPUT_FAMILY_MIX,
          message:
            `required_validation_inputs contains context_only ref: ${r.ref}`,
        });
      }
      if (r.family !== 'L7_VALIDATION' && r.family !== 'L7_CONFIDENCE' &&
          r.family !== 'L7_CONTRADICTION' && r.family !== 'L7_RESTRICTION') {
        issues.push({
          code: L9SequenceContractViolationCode.SUBJECT_INPUT_FAMILY_MIX,
          message:
            `required_validation_inputs[${r.ref}] must be an L7 family, got ${r.family}`,
        });
      }
    }
  }
  if (subject.required_regime_inputs) {
    for (const r of subject.required_regime_inputs) {
      if (r.family !== 'L8_REGIME') {
        issues.push({
          code: L9SequenceContractViolationCode.SUBJECT_INPUT_FAMILY_MIX,
          message:
            `required_regime_inputs[${r.ref}] must be L8_REGIME family, got ${r.family}`,
        });
      }
    }
  }

  // Temporal (§9.3.2.4)
  if (!subject.as_of || !ISO_TS.test(subject.as_of)) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_TEMPORAL,
      message: `as_of missing or not ISO-8601: ${subject.as_of}`,
    });
  }
  if (!subject.sequence_window || !subject.sequence_window.window_id ||
      !subject.sequence_window.as_of ||
      subject.sequence_window.lookback_seconds <= 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_SEQUENCE_WINDOW,
      message: 'sequence_window incomplete or non-positive lookback',
    });
  }
  if (!subject.lead_lag_window || !subject.lead_lag_window.window_id ||
      subject.lead_lag_window.max_lag_ms <= 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_LEAD_LAG_WINDOW,
      message: 'lead_lag_window incomplete',
    });
  }
  if (!subject.decay_window_spec) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_DECAY_WINDOW_SPEC,
      message: 'decay_window_spec missing',
    });
  } else if (subject.decay_window_spec.required &&
      (subject.decay_window_spec.lookback_seconds <= 0 ||
        subject.decay_window_spec.max_time_burden_ms <= 0)) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_DECAY_WINDOW_SPEC,
      message:
        'decay_window_spec required but lookback_seconds/max_time_burden_ms not positive',
    });
  }
  if (!subject.post_event_window_spec) {
    issues.push({
      code:
        L9SequenceContractViolationCode.SUBJECT_MISSING_POST_EVENT_WINDOW_SPEC,
      message: 'post_event_window_spec missing',
    });
  } else if (subject.sequence_family &&
      isL9RegisteredSequenceFamily(subject.sequence_family) &&
      l9FamilyRequiresPostEventAnchor(subject.sequence_family) &&
      !subject.post_event_window_spec.required) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_POST_EVENT_SPEC_INCOMPLETE,
      message:
        `family ${subject.sequence_family} requires post-event anchor but post_event_window_spec.required is false`,
    });
  }
  if (typeof subject.freshness_budget_seconds !== 'number' ||
      subject.freshness_budget_seconds <= 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_TEMPORAL,
      message:
        `freshness_budget_seconds must be > 0, got ${subject.freshness_budget_seconds}`,
    });
  }
  if (!subject.staleness_policy) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_TEMPORAL,
      message: 'staleness_policy missing',
    });
  }

  // Sequence rules (§9.3.2.5)
  if (!subject.sequence_selection_rules ||
      subject.sequence_selection_rules.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_SEQUENCE_RULES,
      message: 'sequence_selection_rules empty',
    });
  }
  if (!subject.lead_lag_rules || subject.lead_lag_rules.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_LEAD_LAG_RULES,
      message: 'lead_lag_rules empty',
    });
  }
  if (!subject.phase_rules || subject.phase_rules.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_PHASE_RULES,
      message: 'phase_rules empty',
    });
  }
  if (!subject.decay_rules || subject.decay_rules.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_DECAY_RULES,
      message: 'decay_rules empty',
    });
  }

  // Confidence + restriction derivation (§9.3.2.6)
  if (!subject.confidence_derivation_spec ||
      !subject.confidence_derivation_spec.policy_id ||
      !subject.confidence_derivation_spec.policy_version ||
      !subject.confidence_derivation_spec.required_factors ||
      subject.confidence_derivation_spec.required_factors.length === 0) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_CONFIDENCE_SPEC,
      message: 'confidence_derivation_spec incomplete',
    });
  }
  if (!subject.restriction_derivation_spec ||
      !subject.restriction_derivation_spec.policy_id ||
      !subject.restriction_derivation_spec.default_reliance_band) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_RESTRICTION_SPEC,
      message: 'restriction_derivation_spec incomplete',
    });
  } else if (
    subject.restriction_derivation_spec.forbid_decisive_when_ambiguous !== true
  ) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_RESTRICTION_SPEC,
      message:
        'restriction_derivation_spec.forbid_decisive_when_ambiguous must be true',
    });
  }

  // Persistence + evidence (§9.3.2.7)
  if (!subject.materialization_policy) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_PERSISTENCE_POLICY,
      message: 'materialization_policy missing',
    });
  }
  if (!subject.evidence_pack_policy) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_EVIDENCE_POLICY,
      message: 'evidence_pack_policy missing',
    });
  }

  // Production extensions (§9.3.2.8)
  if (!subject.restriction_consumption_policy) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_RESTRICTION_POLICY,
      message: 'restriction_consumption_policy missing',
    });
  } else {
    const rcp = subject.restriction_consumption_policy;
    if (rcp.required && rcp.expected_rights.length === 0) {
      issues.push({
        code:
          L9SequenceContractViolationCode.SUBJECT_MISSING_RESTRICTION_POLICY,
        message:
          'restriction_consumption_policy.required true but expected_rights empty',
      });
    }
  }
  if (!subject.regime_consumption_policy) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_REGIME_POLICY,
      message: 'regime_consumption_policy missing',
    });
  } else if (subject.sequence_family &&
      isL9RegisteredSequenceFamily(subject.sequence_family) &&
      l9FamilyRequiresRegimeConditioning(subject.sequence_family)) {
    const rcp = subject.regime_consumption_policy;
    if (!rcp.required || rcp.min_regime_refs <= 0) {
      issues.push({
        code: L9SequenceContractViolationCode.SUBJECT_MISSING_REGIME_POLICY,
        message:
          `family ${subject.sequence_family} requires regime conditioning but regime_consumption_policy is weak`,
      });
    }
  }
  if (!subject.validation_consumption_policy) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_VALIDATION_POLICY,
      message: 'validation_consumption_policy missing',
    });
  } else {
    const vcp = subject.validation_consumption_policy;
    if (vcp.required && vcp.min_validation_refs <= 0) {
      issues.push({
        code:
          L9SequenceContractViolationCode.SUBJECT_MISSING_VALIDATION_POLICY,
        message:
          'validation_consumption_policy.required true but min_validation_refs <= 0',
      });
    }
  }
  if (!subject.ambiguity_cleanliness_policy ||
      subject.ambiguity_cleanliness_policy.forbid_clean_single_when_ambiguous !==
        true) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_AMBIGUITY_POLICY,
      message:
        'ambiguity_cleanliness_policy missing or forbid_clean_single_when_ambiguous not true',
    });
  }
  if (!subject.causal_restraint_policy ||
      subject.causal_restraint_policy.treat_adjacency_as_temporal_only !== true ||
      subject.causal_restraint_policy.forbid_causal_certainty_semantics !==
        true) {
    issues.push({
      code:
        L9SequenceContractViolationCode.SUBJECT_MISSING_CAUSAL_RESTRAINT_POLICY,
      message: 'causal_restraint_policy missing or weak',
    });
  }
  if (!subject.chain_integrity_requirements ||
      subject.chain_integrity_requirements.forbid_clean_when_chain_damaged !==
        true ||
      subject.chain_integrity_requirements.minimum_completeness_score < 0) {
    issues.push({
      code:
        L9SequenceContractViolationCode.SUBJECT_MISSING_CHAIN_INTEGRITY_POLICY,
      message: 'chain_integrity_requirements missing or weak',
    });
  }

  // Lineage
  if (!subject.lineage_policy ||
      subject.lineage_policy.requires_trace_id !== true ||
      subject.lineage_policy.requires_manifest_id !== true) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_LINEAGE_POLICY,
      message: 'lineage_policy missing or weaker than L9 minimum',
    });
  }
  if (!subject.lineage_refs || !subject.lineage_refs.trace_id ||
      !subject.lineage_refs.manifest_id) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_MISSING_LINEAGE_REFS,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }

  // Judgment leak in descriptive fields (§9.3.10.1-G)
  if (containsL9ForbiddenNaming(subject.description ?? '') ||
      containsL9ForbiddenNaming(subject.created_by ?? '')) {
    issues.push({
      code: L9SequenceContractViolationCode.SUBJECT_JUDGMENT_LEAK,
      message:
        'subject description/created_by contains forbidden judgment/scenario/recommendation semantics',
    });
  }

  return { valid: issues.length === 0, issues };
}
