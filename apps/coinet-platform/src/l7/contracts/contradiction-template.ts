/**
 * L7.5 — Contradiction Template
 *
 * §7.5.5 — Governed contradiction templates encode real market-story
 * failure patterns (e.g. "price up, but spot weak and perps crowded").
 * They are NOT prose examples. Each template is a first-class object
 * with deterministic metadata, legality rules, severity model, and
 * blocking/cap policies.
 *
 * §7.5.5.5 — Contradiction detection in L7.4 should detect through
 * these governed templates rather than one-off pattern code wherever
 * possible, to keep contradiction behavior stable and comparable.
 */

import { L7ContradictionSeverity } from './contradiction-bundle';
import { L7ContradictionFamilyClass } from './contradiction-family';
import { L7ValidationSubjectClass, L7SupportPattern } from './validation-subject-class';

export enum L7ContradictionTemplateSeverityModel {
  /** Severity is driven only by magnitude of support/challenge imbalance. */
  MAGNITUDE_DRIVEN = 'MAGNITUDE_DRIVEN',
  /** Severity is driven by co-occurrence of two or more material signals. */
  COOCCURRENCE_DRIVEN = 'COOCCURRENCE_DRIVEN',
  /** Severity is driven by an escalating time-to-event (unlock/security). */
  TIME_TO_EVENT_DRIVEN = 'TIME_TO_EVENT_DRIVEN',
  /** Severity is driven by a structural/quality score being below floor. */
  QUALITY_FLOOR_DRIVEN = 'QUALITY_FLOOR_DRIVEN',
}

export enum L7ContradictionTemplateBlockingPolicy {
  NEVER_BLOCKS = 'NEVER_BLOCKS',
  BLOCKS_ONLY_IF_SEVERE = 'BLOCKS_ONLY_IF_SEVERE',
  BLOCKS_IF_MATERIAL_OR_HIGHER = 'BLOCKS_IF_MATERIAL_OR_HIGHER',
  ALWAYS_BLOCKS = 'ALWAYS_BLOCKS',
}

export enum L7ContradictionTemplateCapPolicy {
  NEVER_CAPS = 'NEVER_CAPS',
  SOFT_CAP = 'SOFT_CAP',
  MATERIAL_CAP = 'MATERIAL_CAP',
  HARD_CAP = 'HARD_CAP',
}

/**
 * §7.5.5.2 — Required fields for a governed contradiction template.
 */
export interface L7ContradictionTemplate {
  readonly template_id: string;
  readonly template_name: string;
  readonly template_version: string;
  readonly contradiction_family: L7ContradictionFamilyClass;
  readonly applicable_subject_classes: readonly L7ValidationSubjectClass[];
  readonly applicable_validation_families: readonly string[];
  readonly required_support_surface_patterns: readonly L7SupportPattern[];
  readonly required_challenge_surface_patterns: readonly L7SupportPattern[];
  readonly minimum_materiality_posture: 'LOW' | 'STANDARD' | 'HIGH' | 'CRITICAL';
  readonly temporal_applicability_rules: {
    readonly max_support_age_ms?: number;
    readonly max_challenge_age_ms?: number;
    readonly event_horizon_ms?: number;
  };
  readonly severity_model_class: L7ContradictionTemplateSeverityModel;
  readonly baseline_severity: L7ContradictionSeverity;
  readonly blocking_policy: L7ContradictionTemplateBlockingPolicy;
  readonly cap_policy: L7ContradictionTemplateCapPolicy;
  readonly lineage_requirements: {
    readonly requires_support_lineage: boolean;
    readonly requires_challenge_lineage: boolean;
    readonly requires_event_lineage: boolean;
  };
  readonly status: 'EXPERIMENTAL' | 'PRODUCTION';
  readonly description: string;
}

/**
 * §7.5.5 — First production contradiction templates. These correspond
 * one-to-one to the governed failure patterns listed in §7.5.5.3.
 */
export const L7_CONTRADICTION_TEMPLATES: readonly L7ContradictionTemplate[] = [
  {
    template_id: 'ct:price-up-spot-weak-perps-crowded@1',
    template_name: 'Price up, but spot weak and perps crowded',
    template_version: '1.0.0',
    contradiction_family: L7ContradictionFamilyClass.PRICE_DERIVATIVES_CONTRADICTION,
    applicable_subject_classes: [
      L7ValidationSubjectClass.STATE_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
    ],
    applicable_validation_families: [
      'MARKET_STRENGTH_VALIDATION',
      'DERIVATIVES_CONTRADICTION_VALIDATION',
      'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    ],
    required_support_surface_patterns: ['PRICE_FAMILY'],
    required_challenge_surface_patterns: ['FUNDING_FAMILY', 'PARTICIPATION_FAMILY'],
    minimum_materiality_posture: 'STANDARD',
    temporal_applicability_rules: {
      max_support_age_ms: 3600_000,
      max_challenge_age_ms: 3600_000,
    },
    severity_model_class: L7ContradictionTemplateSeverityModel.COOCCURRENCE_DRIVEN,
    baseline_severity: L7ContradictionSeverity.MATERIAL,
    blocking_policy: L7ContradictionTemplateBlockingPolicy.BLOCKS_ONLY_IF_SEVERE,
    cap_policy: L7ContradictionTemplateCapPolicy.MATERIAL_CAP,
    lineage_requirements: {
      requires_support_lineage: true,
      requires_challenge_lineage: true,
      requires_event_lineage: false,
    },
    status: 'PRODUCTION',
    description:
      'Caps confidence, may flip to conflicting if crowding and participation weakness are both severe',
  },
  {
    template_id: 'ct:tvl-up-inflows-flat-revenue-weak@1',
    template_name: 'TVL up, but inflows flat and revenue weak',
    template_version: '1.0.0',
    contradiction_family: L7ContradictionFamilyClass.REVENUE_TVL_CONTRADICTION,
    applicable_subject_classes: [
      L7ValidationSubjectClass.SUBSTANCE_CLAIM,
      L7ValidationSubjectClass.FLOW_CLAIM,
      L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
    ],
    applicable_validation_families: [
      'PROTOCOL_SUBSTANCE_VALIDATION',
      'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    ],
    required_support_surface_patterns: ['TVL_FAMILY'],
    required_challenge_surface_patterns: ['FLOW_FAMILY', 'REVENUE_FAMILY'],
    minimum_materiality_posture: 'HIGH',
    temporal_applicability_rules: {
      max_support_age_ms: 86_400_000,
      max_challenge_age_ms: 86_400_000,
    },
    severity_model_class: L7ContradictionTemplateSeverityModel.COOCCURRENCE_DRIVEN,
    baseline_severity: L7ContradictionSeverity.SEVERE,
    blocking_policy: L7ContradictionTemplateBlockingPolicy.BLOCKS_IF_MATERIAL_OR_HIGHER,
    cap_policy: L7ContradictionTemplateCapPolicy.HARD_CAP,
    lineage_requirements: {
      requires_support_lineage: true,
      requires_challenge_lineage: true,
      requires_event_lineage: false,
    },
    status: 'PRODUCTION',
    description: 'Blocks substance confirmation',
  },
  {
    template_id: 'ct:social-hype-whales-distributing@1',
    template_name: 'Social hype up, but whales distributing',
    template_version: '1.0.0',
    contradiction_family: L7ContradictionFamilyClass.NARRATIVE_FLOW_CONTRADICTION,
    applicable_subject_classes: [
      L7ValidationSubjectClass.NARRATIVE_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
      L7ValidationSubjectClass.DIVERGENCE_CLAIM,
    ],
    applicable_validation_families: [
      'NARRATIVE_VALIDATION',
      'ACCUMULATION_VALIDATION',
      'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    ],
    required_support_surface_patterns: ['SENTIMENT_FAMILY'],
    required_challenge_surface_patterns: ['FLOW_FAMILY', 'ONCHAIN_FAMILY'],
    minimum_materiality_posture: 'STANDARD',
    temporal_applicability_rules: {
      max_support_age_ms: 14_400_000,
      max_challenge_age_ms: 21_600_000,
    },
    severity_model_class: L7ContradictionTemplateSeverityModel.COOCCURRENCE_DRIVEN,
    baseline_severity: L7ContradictionSeverity.SEVERE,
    blocking_policy: L7ContradictionTemplateBlockingPolicy.BLOCKS_IF_MATERIAL_OR_HIGHER,
    cap_policy: L7ContradictionTemplateCapPolicy.HARD_CAP,
    lineage_requirements: {
      requires_support_lineage: true,
      requires_challenge_lineage: true,
      requires_event_lineage: false,
    },
    status: 'PRODUCTION',
    description: 'Blocks clean narrative confirmation',
  },
  {
    template_id: 'ct:narrative-strong-unlock-near@1',
    template_name: 'Strong narrative, but major unlock near',
    template_version: '1.0.0',
    contradiction_family: L7ContradictionFamilyClass.UNLOCK_OVERHANG_CONTRADICTION,
    applicable_subject_classes: [
      L7ValidationSubjectClass.NARRATIVE_CLAIM,
      L7ValidationSubjectClass.RISK_OVERHANG_CLAIM,
      L7ValidationSubjectClass.STATE_CLAIM,
    ],
    applicable_validation_families: [
      'RISK_OVERHANG_VALIDATION',
      'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    ],
    required_support_surface_patterns: ['SENTIMENT_FAMILY', 'PRICE_FAMILY'],
    required_challenge_surface_patterns: ['EVENT_FAMILY', 'ONCHAIN_FAMILY'],
    minimum_materiality_posture: 'HIGH',
    temporal_applicability_rules: {
      max_support_age_ms: 86_400_000,
      event_horizon_ms: 14 * 86_400_000,
    },
    severity_model_class: L7ContradictionTemplateSeverityModel.TIME_TO_EVENT_DRIVEN,
    baseline_severity: L7ContradictionSeverity.SEVERE,
    blocking_policy: L7ContradictionTemplateBlockingPolicy.BLOCKS_ONLY_IF_SEVERE,
    cap_policy: L7ContradictionTemplateCapPolicy.HARD_CAP,
    lineage_requirements: {
      requires_support_lineage: true,
      requires_challenge_lineage: true,
      requires_event_lineage: true,
    },
    status: 'PRODUCTION',
    description:
      'Confirmed or weakly confirmed only with strong restriction profile; rarely score-clean',
  },
  {
    template_id: 'ct:smart-wallet-accumulation-liquidity-poor@1',
    template_name: 'Smart-wallet accumulation, but liquidity quality poor',
    template_version: '1.0.0',
    contradiction_family: L7ContradictionFamilyClass.WHALE_LIQUIDITY_CONTRADICTION,
    applicable_subject_classes: [
      L7ValidationSubjectClass.FLOW_CLAIM,
      L7ValidationSubjectClass.CHANGE_CLAIM,
      L7ValidationSubjectClass.STRUCTURAL_SUPPORT_CLAIM,
      L7ValidationSubjectClass.ALIGNMENT_CLAIM,
    ],
    applicable_validation_families: [
      'ACCUMULATION_VALIDATION',
      'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    ],
    required_support_surface_patterns: ['ONCHAIN_FAMILY', 'FLOW_FAMILY'],
    required_challenge_surface_patterns: ['LIQUIDITY_FAMILY'],
    minimum_materiality_posture: 'HIGH',
    temporal_applicability_rules: {
      max_support_age_ms: 21_600_000,
      max_challenge_age_ms: 21_600_000,
    },
    severity_model_class: L7ContradictionTemplateSeverityModel.QUALITY_FLOOR_DRIVEN,
    baseline_severity: L7ContradictionSeverity.MATERIAL,
    blocking_policy: L7ContradictionTemplateBlockingPolicy.BLOCKS_ONLY_IF_SEVERE,
    cap_policy: L7ContradictionTemplateCapPolicy.MATERIAL_CAP,
    lineage_requirements: {
      requires_support_lineage: true,
      requires_challenge_lineage: true,
      requires_event_lineage: false,
    },
    status: 'PRODUCTION',
    description: 'Caps reliance materially',
  },
];

export function getL7ContradictionTemplate(id: string): L7ContradictionTemplate | undefined {
  return L7_CONTRADICTION_TEMPLATES.find(t => t.template_id === id);
}

export function isL7ContradictionTemplateRegistered(id: string): boolean {
  return L7_CONTRADICTION_TEMPLATES.some(t => t.template_id === id);
}
