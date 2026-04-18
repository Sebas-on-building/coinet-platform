/**
 * L7.2 — Validation Subject Contract
 *
 * §7.2.4 — A ValidationSubject is the unit of truth-testing. It is a
 * governed, replay-safe object — never a freeform narrative sentence.
 */

import type { L7MaterialityClass } from './validation-materiality';
import type { L7ValidationWindow } from './validation-window';
import type {
  L7ValidationSubjectClass,
  L7SubjectScopeType,
  L7SupportPattern,
} from './validation-subject-class';

export type L7RiskOverhangType =
  | 'UNLOCK'
  | 'LIQUIDITY_WEAKNESS'
  | 'CROWDING'
  | 'REGULATORY'
  | 'SECURITY'
  | 'CENTRALIZATION'
  | 'DEPEG_RISK'
  | 'STABLECOIN_RISK'
  | 'BRIDGE_RISK'
  | 'GOVERNANCE_RISK';

export type L7EvidencePackPolicy = 'REQUIRED' | 'OPTIONAL' | 'ON_MATERIAL_CONFLICT';

/**
 * Minimum evidence requirements declared at subject time. Consumed by the
 * subject-kind validator and later by the confidence engine.
 */
export interface L7EvidenceRequirements {
  readonly min_support_surfaces: number;
  readonly min_challenge_surfaces: number;
  readonly required_support_patterns: readonly L7SupportPattern[];
  readonly required_challenge_patterns: readonly L7SupportPattern[];
  readonly evidence_pack_policy: L7EvidencePackPolicy;
}

/**
 * Declared regime posture. L7 does not decide regime; it declares which
 * regime compatibility must later be assessed.
 */
export interface L7RegimeAssumptionProfile {
  readonly declared: boolean;
  readonly regime_tags: readonly string[];
  readonly compatibility_mode: 'REQUIRED' | 'PREFERRED' | 'NONE';
}

/**
 * Tolerance profiles. These make incompleteness/ambiguity/staleness/
 * degradation handling deterministic downstream (§7.2.4.3).
 */
export interface L7ToleranceProfile {
  readonly max_stale_seconds: number | null;
  readonly max_missing_required_surfaces: number;
  readonly max_ambiguity_score: number | null;
  readonly max_degradation_score: number | null;
}

/**
 * §7.2.4.1 + §7.2.4.3 — The full validation subject contract.
 */
export interface L7ValidationSubject {
  // Identity (§7.2.4.2 Identity fields)
  readonly validation_subject_id: string;
  readonly subject_class: L7ValidationSubjectClass;
  readonly hybrid_subject_classes: readonly L7ValidationSubjectClass[];
  readonly claim_family: string;
  readonly claim_name: string;
  readonly claim_version: string;
  readonly subject_template_id: string;

  // Scope (§7.2.4.2 Scope fields)
  readonly scope_type: L7SubjectScopeType;
  readonly scope_id: string;

  // Time (§7.2.4.2 Time field)
  readonly as_of: string;
  readonly validation_window: L7ValidationWindow;

  // Primitive refs (§7.2.4.2 Primitive reference fields)
  readonly supporting_primitive_refs: readonly string[];
  readonly required_confirmation_surfaces: readonly string[];
  readonly required_challenge_surfaces: readonly string[];
  readonly support_minimums: {
    readonly support: number;
    readonly challenge: number;
  };
  readonly challenge_minimums: {
    readonly support: number;
    readonly challenge: number;
  };

  // Materiality (§7.2.4.2 Materiality field)
  readonly materiality_class: L7MaterialityClass;

  // Evidence (§7.2.4.2 Evidence field + §7.2.4.3)
  readonly evidence_requirements: L7EvidenceRequirements;
  readonly subject_evidence_pack_policy: L7EvidencePackPolicy;

  // Risk overhang (§7.2.4.2)
  readonly expected_risk_overhang_types: readonly L7RiskOverhangType[];

  // Regime posture (§7.2.4.2)
  readonly regime_assumption_profile: L7RegimeAssumptionProfile;

  // Tolerance profiles (§7.2.4.3)
  readonly ambiguity_tolerance_profile: L7ToleranceProfile;
  readonly staleness_tolerance_profile: L7ToleranceProfile;
  readonly incompleteness_tolerance_profile: L7ToleranceProfile;
  readonly degradation_tolerance_profile: L7ToleranceProfile;

  // Materialization policy (§7.2.4.3)
  readonly subject_materialization_policy: 'EAGER' | 'ON_DEMAND' | 'REPLAY_ONLY';

  // Lineage (§7.2.4.2 Lineage field)
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };

  // Authoring / provenance
  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

/**
 * Deterministic stable subject identity. We avoid external hash libraries
 * by using a small FNV-1a that is sufficient for object identity here —
 * replay hashing elsewhere uses the shared canonical hash helper.
 */
function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface SubjectIdInputs {
  readonly claim_family: string;
  readonly claim_name: string;
  readonly claim_version: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
}

export function buildValidationSubjectId(i: SubjectIdInputs): string {
  const key =
    `${i.claim_family}|${i.claim_name}|${i.claim_version}|${i.scope_type}|${i.scope_id}|${i.as_of}`;
  return `vsub_${fnv1aHex(key)}_${fnv1aHex(i.claim_name + i.scope_id)}`;
}

export function buildSubjectTemplateId(claim_family: string, claim_name: string, claim_version: string): string {
  return `vsubtpl_${fnv1aHex(`${claim_family}|${claim_name}|${claim_version}`)}`;
}
