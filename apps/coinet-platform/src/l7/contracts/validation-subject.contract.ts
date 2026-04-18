/**
 * L7.3 — Validation Subject Contract
 *
 * §7.3.2 — The executable, versioned, replay-safe subject contract.
 * Supersedes the L7.2 object-level `L7ValidationSubject` for materialization
 * and runtime eligibility: L7.2's object type remains legal for internal
 * prototyping; L7.3's contract is the shape every engine must honour when
 * emitting or persisting a subject.
 */

import type { L7MaterialityClass } from './validation-materiality';
import type { L7ValidationWindow } from './validation-window';
import type {
  L7ValidationSubjectClass,
  L7SubjectScopeType,
  L7SupportPattern,
} from './validation-subject-class';
import type {
  L7EvidenceRequirements,
  L7RegimeAssumptionProfile,
  L7RiskOverhangType,
  L7ToleranceProfile,
  L7EvidencePackPolicy,
} from './validation-subject';
import type {
  L7ValidationIntent,
  L7StalenessPolicyClass,
} from './validation-runtime-status';

/**
 * Input reference spec. Runtime engines materialise support/challenge
 * from these typed refs rather than from bare string arrays.
 */
export interface L7ValidationInputRef {
  readonly ref: string;
  readonly family: L7SupportPattern;
  readonly required: boolean;
  readonly staleness_critical: boolean;
  readonly evidence_only: boolean;
}

/**
 * Confirmation / contradiction / incompleteness / ambiguity / degradation
 * rule identifiers. L7.3 does not implement the rules — later sublayers do —
 * but the contract must declare which rule ids a subject runs against so
 * replay and repair are deterministic (§7.3.2.4).
 */
export interface L7RuleRef {
  readonly rule_id: string;
  readonly rule_version: string;
}

/**
 * §7.3.2.4 `confidence_derivation_spec`. The subject *declares* how
 * confidence must be derived (required factors, weights, caps). The
 * confidence engine must honour this declaration.
 */
export interface L7ConfidenceDerivationSpec {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly required_factors: readonly string[];
  readonly factor_weights: Readonly<Record<string, number>>;
  readonly caps: readonly string[];
  readonly materiality_modifier: number;
}

/**
 * §7.3.2.4 `restriction_derivation_spec`. The subject *declares* how
 * downstream-use rights and reason codes are derived from validation
 * state. Prevents silent reinterpretation of downstream legality.
 */
export interface L7RestrictionDerivationSpec {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly deny_final_judgment_if_below_confidence: number | null;
  readonly require_contradiction_disclosure_if_severity_at_least: string | null;
  readonly downgrade_to_evidence_only_if_staleness_material: boolean;
  readonly require_additional_confirmation_if_support_incomplete: boolean;
}

/**
 * §7.3.2.5 — The full executable validation subject contract.
 */
export interface L7ValidationSubjectContract {
  // Identity (§7.3.2.2)
  readonly validation_subject_id: string;
  readonly claim_family: string;
  readonly claim_name: string;
  readonly claim_version: string;
  readonly subject_template_id: string;

  // Contract versioning (§7.3.2.3 + §7.3.7.2)
  readonly subject_contract_version: string;
  readonly schema_version: string;

  // Scope + semantics
  readonly scope_type: L7SubjectScopeType;
  readonly scope_id: string;
  readonly subject_class: L7ValidationSubjectClass;
  readonly hybrid_subject_classes: readonly L7ValidationSubjectClass[];
  readonly materiality_class: L7MaterialityClass;
  readonly validation_intent: L7ValidationIntent;

  // Inputs (§7.3.2.2 Inputs)
  readonly required_support_inputs: readonly L7ValidationInputRef[];
  readonly required_challenge_inputs: readonly L7ValidationInputRef[];
  readonly optional_context_inputs: readonly L7ValidationInputRef[];
  readonly evidence_only_inputs: readonly L7ValidationInputRef[];
  readonly support_minimums: { readonly support: number; readonly challenge: number };
  readonly challenge_minimums: { readonly support: number; readonly challenge: number };

  // Temporal (§7.3.2.2 Temporal logic)
  readonly as_of: string;
  readonly validation_window: L7ValidationWindow;
  readonly freshness_budget_seconds: number;
  readonly staleness_policy: L7StalenessPolicyClass;

  // Validation logic (§7.3.2.2)
  readonly confirmation_rules: readonly L7RuleRef[];
  readonly contradiction_rules: readonly L7RuleRef[];
  readonly incompleteness_rules: readonly L7RuleRef[];
  readonly ambiguity_rules: readonly L7RuleRef[];
  readonly degradation_rules: readonly L7RuleRef[];

  // Confidence + restriction derivation (§7.3.2.2)
  readonly confidence_derivation_spec: L7ConfidenceDerivationSpec;
  readonly restriction_derivation_spec: L7RestrictionDerivationSpec;

  // Persistence (§7.3.2.2)
  readonly materialization_policy: 'EAGER' | 'ON_DEMAND' | 'REPLAY_ONLY';
  readonly evidence_pack_policy: L7EvidencePackPolicy;
  readonly evidence_requirements: L7EvidenceRequirements;

  // Production extensions (§7.3.2.3)
  readonly regime_assumption_profile: L7RegimeAssumptionProfile;
  readonly expected_risk_overhang_types: readonly L7RiskOverhangType[];
  readonly ambiguity_tolerance_profile: L7ToleranceProfile;
  readonly incompleteness_tolerance_profile: L7ToleranceProfile;
  readonly degradation_tolerance_profile: L7ToleranceProfile;
  readonly staleness_tolerance_profile: L7ToleranceProfile;
  readonly subject_replay_mode_eligibility: readonly ('LIVE' | 'REPLAY' | 'REPAIR' | 'LATE_DATA')[];
  readonly subject_materialization_mode_eligibility: readonly ('EAGER' | 'ON_DEMAND' | 'REPLAY_ONLY')[];

  // Lineage
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };

  // Provenance
  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

export const L7_SUBJECT_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'validation_subject_id', 'claim_family', 'claim_name', 'claim_version',
  'subject_template_id', 'subject_contract_version', 'schema_version',
  'scope_type', 'scope_id',
  'subject_class', 'materiality_class', 'validation_intent',
  'required_support_inputs', 'required_challenge_inputs',
  'as_of', 'validation_window', 'freshness_budget_seconds', 'staleness_policy',
  'confirmation_rules', 'contradiction_rules',
  'incompleteness_rules', 'ambiguity_rules', 'degradation_rules',
  'confidence_derivation_spec', 'restriction_derivation_spec',
  'materialization_policy', 'evidence_pack_policy',
  'lineage_refs',
];
