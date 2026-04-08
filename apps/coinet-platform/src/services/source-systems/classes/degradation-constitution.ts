/**
 * L1.6 Degradation Constitution
 *
 * Per-class degradation trigger definitions for levels D0–D4.
 * Each class defines the exact conditions that push it into each degradation
 * level, the visibility loss type, confidence penalty range, downstream blocks,
 * and whether directional claims survive.
 */

import { TRUTH_CLASSES, type TruthClass } from '../registry';
import type { DegradationLevel, VisibilityLoss, DownstreamComponent } from './degradation-types';

// ═══════════════════════════════════════════════════════════════════════════════
// CLASS DEGRADATION PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export interface LevelProfile {
  triggers: string[];
  visibilityLoss: VisibilityLoss;
  confidencePenaltyRange: [number, number];
  blockedComponents: DownstreamComponent[];
  directionalClaimsAllowed: boolean;
}

export interface ClassDegradationProfile {
  classId: TruthClass;
  d1: LevelProfile;
  d2: LevelProfile;
  d3: LevelProfile;
  d4: LevelProfile;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PER-CLASS PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

export const CLASS_DEGRADATION_PROFILES: Record<TruthClass, ClassDegradationProfile> = {
  [TRUTH_CLASSES.MARKET_SURFACE]: {
    classId: TRUTH_CLASSES.MARKET_SURFACE,
    d1: {
      triggers: ['freshness_slippage_minor', 'recovery_probation', 'confirmer_degraded'],
      visibilityLoss: 'FIELD_PARTIAL', confidencePenaltyRange: [0.03, 0.10],
      blockedComponents: ['CONFIDENCE_BANDS'], directionalClaimsAllowed: true,
    },
    d2: {
      triggers: ['market_cap_unavailable', 'supply_contested', 'ohlcv_stale'],
      visibilityLoss: 'CLASS_PARTIAL', confidencePenaltyRange: [0.10, 0.20],
      blockedComponents: ['CONFIDENCE_BANDS', 'SCORE_OUTPUT'], directionalClaimsAllowed: true,
    },
    d3: {
      triggers: ['spot_price_divergence_unresolved', 'owner_degraded_no_confirmer'],
      visibilityLoss: 'CLASS_DIRECTIONAL_LOSS', confidencePenaltyRange: [0.20, 0.35],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'SCORE_OUTPUT', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
    d4: {
      triggers: ['spot_price_integrity_broken', 'owner_absent_no_fallback', 'illegal_substitution'],
      visibilityLoss: 'DOMAIN_UNSPEAKABLE', confidencePenaltyRange: [0.35, 1.0],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
  },

  [TRUTH_CLASSES.DEX_EMERGENCE]: {
    classId: TRUTH_CLASSES.DEX_EMERGENCE,
    d1: {
      triggers: ['discovery_lag_minor', 'pool_freshness_slippage'],
      visibilityLoss: 'FIELD_PARTIAL', confidencePenaltyRange: [0.03, 0.08],
      blockedComponents: ['CONFIDENCE_BANDS'], directionalClaimsAllowed: true,
    },
    d2: {
      triggers: ['pool_liquidity_exactness_missing', 'emergence_structure_incomplete'],
      visibilityLoss: 'CLASS_PARTIAL', confidencePenaltyRange: [0.08, 0.18],
      blockedComponents: ['CONFIDENCE_BANDS', 'SCORE_OUTPUT'], directionalClaimsAllowed: true,
    },
    d3: {
      triggers: ['dex_owner_degraded', 'emergence_class_unsafe_for_thesis'],
      visibilityLoss: 'CLASS_DIRECTIONAL_LOSS', confidencePenaltyRange: [0.18, 0.30],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'SCORE_OUTPUT', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
    d4: {
      triggers: ['pool_identity_integrity_broken', 'no_dex_authority_available'],
      visibilityLoss: 'DOMAIN_UNSPEAKABLE', confidencePenaltyRange: [0.30, 1.0],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
  },

  [TRUTH_CLASSES.DERIVATIVES_PRESSURE]: {
    classId: TRUTH_CLASSES.DERIVATIVES_PRESSURE,
    d1: {
      triggers: ['freshness_slippage_minor', 'recovery_probation', 'partial_venue_coverage'],
      visibilityLoss: 'FIELD_PARTIAL', confidencePenaltyRange: [0.05, 0.12],
      blockedComponents: ['CONFIDENCE_BANDS'], directionalClaimsAllowed: true,
    },
    d2: {
      triggers: ['liquidation_field_suppressed', 'funding_current_liquidation_stale'],
      visibilityLoss: 'CLASS_PARTIAL', confidencePenaltyRange: [0.12, 0.22],
      blockedComponents: ['CONFIDENCE_BANDS', 'SCORE_OUTPUT'], directionalClaimsAllowed: true,
    },
    d3: {
      triggers: ['owner_absent_no_fallback', 'multiple_mission_critical_fields_missing'],
      visibilityLoss: 'CLASS_DIRECTIONAL_LOSS', confidencePenaltyRange: [0.22, 0.35],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'SCORE_OUTPUT', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
    d4: {
      triggers: ['time_basis_broken_on_funding', 'illegal_substitution_attempt', 'integrity_broken_core_field'],
      visibilityLoss: 'DOMAIN_UNSPEAKABLE', confidencePenaltyRange: [0.35, 1.0],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
  },

  [TRUTH_CLASSES.PROTOCOL_SUBSTANCE]: {
    classId: TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
    d1: {
      triggers: ['fees_revenue_cadence_lagging', 'confirmer_stale'],
      visibilityLoss: 'FIELD_PARTIAL', confidencePenaltyRange: [0.03, 0.10],
      blockedComponents: ['CONFIDENCE_BANDS'], directionalClaimsAllowed: true,
    },
    d2: {
      triggers: ['one_metric_suppressed', 'tvl_methodology_parity_unresolved'],
      visibilityLoss: 'CLASS_PARTIAL', confidencePenaltyRange: [0.10, 0.20],
      blockedComponents: ['CONFIDENCE_BANDS', 'SCORE_OUTPUT'], directionalClaimsAllowed: true,
    },
    d3: {
      triggers: ['protocol_fundamentals_unsafe_for_thesis', 'owner_methodology_break'],
      visibilityLoss: 'CLASS_DIRECTIONAL_LOSS', confidencePenaltyRange: [0.20, 0.35],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'SCORE_OUTPUT', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
    d4: {
      triggers: ['protocol_substance_integrity_broken', 'no_methodology_authority'],
      visibilityLoss: 'DOMAIN_UNSPEAKABLE', confidencePenaltyRange: [0.35, 1.0],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
  },

  [TRUTH_CLASSES.ONCHAIN_BEHAVIOR]: {
    classId: TRUTH_CLASSES.ONCHAIN_BEHAVIOR,
    d1: {
      triggers: ['transfer_lag_minor', 'indexer_slightly_behind'],
      visibilityLoss: 'FIELD_PARTIAL', confidencePenaltyRange: [0.03, 0.10],
      blockedComponents: ['CONFIDENCE_BANDS'], directionalClaimsAllowed: true,
    },
    d2: {
      triggers: ['wallet_flow_fields_unavailable', 'smart_money_interpretation_weakened'],
      visibilityLoss: 'CLASS_PARTIAL', confidencePenaltyRange: [0.10, 0.20],
      blockedComponents: ['CONFIDENCE_BANDS', 'SCORE_OUTPUT'], directionalClaimsAllowed: true,
    },
    d3: {
      triggers: ['onchain_unsafe_for_accumulation_thesis', 'native_chain_state_unreachable'],
      visibilityLoss: 'CLASS_DIRECTIONAL_LOSS', confidencePenaltyRange: [0.20, 0.35],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'SCORE_OUTPUT', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
    d4: {
      triggers: ['raw_onchain_integrity_broken', 'chain_state_unspeakable'],
      visibilityLoss: 'DOMAIN_UNSPEAKABLE', confidencePenaltyRange: [0.35, 1.0],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
  },

  [TRUTH_CLASSES.STRUCTURAL_SAFETY]: {
    classId: TRUTH_CLASSES.STRUCTURAL_SAFETY,
    d1: {
      triggers: ['some_checks_stale', 'broad_visibility_intact'],
      visibilityLoss: 'FIELD_PARTIAL', confidencePenaltyRange: [0.05, 0.12],
      blockedComponents: ['CONFIDENCE_BANDS'], directionalClaimsAllowed: true,
    },
    d2: {
      triggers: ['structural_view_partial', 'safety_verdict_weakened'],
      visibilityLoss: 'CLASS_PARTIAL', confidencePenaltyRange: [0.12, 0.25],
      blockedComponents: ['CONFIDENCE_BANDS', 'SCORE_OUTPUT'], directionalClaimsAllowed: true,
    },
    d3: {
      triggers: ['safety_domain_incomplete', 'cannot_support_positive_safety_claim'],
      visibilityLoss: 'CLASS_DIRECTIONAL_LOSS', confidencePenaltyRange: [0.25, 0.40],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'SCORE_OUTPUT', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
    d4: {
      triggers: ['safety_verdict_withheld', 'goplus_absent_no_substitute', 'integrity_broken_security'],
      visibilityLoss: 'DOMAIN_UNSPEAKABLE', confidencePenaltyRange: [0.40, 1.0],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
  },

  [TRUTH_CLASSES.NARRATIVE_ATTENTION]: {
    classId: TRUTH_CLASSES.NARRATIVE_ATTENTION,
    d1: {
      triggers: ['one_attention_surface_degraded', 'social_slight_lag'],
      visibilityLoss: 'FIELD_PARTIAL', confidencePenaltyRange: [0.02, 0.08],
      blockedComponents: ['CONFIDENCE_BANDS'], directionalClaimsAllowed: true,
    },
    d2: {
      triggers: ['social_present_event_confirmation_weak', 'news_source_degraded'],
      visibilityLoss: 'CLASS_PARTIAL', confidencePenaltyRange: [0.08, 0.15],
      blockedComponents: ['CONFIDENCE_BANDS', 'SCORE_OUTPUT'], directionalClaimsAllowed: true,
    },
    d3: {
      triggers: ['narrative_unsafe_for_thesis_confirmation', 'multiple_attention_surfaces_down'],
      visibilityLoss: 'CLASS_DIRECTIONAL_LOSS', confidencePenaltyRange: [0.15, 0.25],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'SCORE_OUTPUT', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
    d4: {
      triggers: ['narrative_truth_suppressed', 'all_attention_sources_broken'],
      visibilityLoss: 'DOMAIN_UNSPEAKABLE', confidencePenaltyRange: [0.25, 1.0],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
  },

  [TRUTH_CLASSES.ENTITY_CONTEXT]: {
    classId: TRUTH_CLASSES.ENTITY_CONTEXT,
    d1: {
      triggers: ['mild_label_uncertainty', 'one_coprimary_stale'],
      visibilityLoss: 'FIELD_PARTIAL', confidencePenaltyRange: [0.03, 0.10],
      blockedComponents: ['CONFIDENCE_BANDS'], directionalClaimsAllowed: true,
    },
    d2: {
      triggers: ['contested_attribution_contextual', 'partial_entity_blindness'],
      visibilityLoss: 'CLASS_PARTIAL', confidencePenaltyRange: [0.10, 0.20],
      blockedComponents: ['CONFIDENCE_BANDS', 'SCORE_OUTPUT'], directionalClaimsAllowed: true,
    },
    d3: {
      triggers: ['entity_unsafe_for_thesis_identity_claims', 'coprimary_material_disagreement'],
      visibilityLoss: 'CLASS_DIRECTIONAL_LOSS', confidencePenaltyRange: [0.20, 0.30],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'SCORE_OUTPUT', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
    d4: {
      triggers: ['identity_claim_locked', 'no_entity_authority_available'],
      visibilityLoss: 'DOMAIN_UNSPEAKABLE', confidencePenaltyRange: [0.30, 1.0],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
  },

  [TRUTH_CLASSES.REASONING_EXPRESSION]: {
    classId: TRUTH_CLASSES.REASONING_EXPRESSION,
    d1: {
      triggers: ['upstream_d1_in_critical_class', 'disclosure_expanded'],
      visibilityLoss: 'NONE', confidencePenaltyRange: [0.02, 0.05],
      blockedComponents: ['CONFIDENCE_BANDS'], directionalClaimsAllowed: true,
    },
    d2: {
      triggers: ['upstream_d2_in_multiple_classes', 'explanation_simplified'],
      visibilityLoss: 'FIELD_PARTIAL', confidencePenaltyRange: [0.05, 0.15],
      blockedComponents: ['CONFIDENCE_BANDS', 'EXPLANATION_LAYER'], directionalClaimsAllowed: true,
    },
    d3: {
      triggers: ['upstream_d3_in_thesis_critical_class', 'model_cannot_synthesize_thesis'],
      visibilityLoss: 'CLASS_DIRECTIONAL_LOSS', confidencePenaltyRange: [0.15, 0.30],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
    d4: {
      triggers: ['upstream_d4_in_any_required_class', 'output_blocked'],
      visibilityLoss: 'DOMAIN_UNSPEAKABLE', confidencePenaltyRange: [0.30, 1.0],
      blockedComponents: ['SCENARIO_ENGINE', 'JUDGMENT_LAYER', 'CHAT_SYSTEM', 'SCORE_OUTPUT', 'EXPLANATION_LAYER', 'CONFIDENCE_BANDS'],
      directionalClaimsAllowed: false,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getClassProfile(classId: TruthClass): ClassDegradationProfile | undefined {
  return CLASS_DEGRADATION_PROFILES[classId];
}

export function getLevelProfile(classId: TruthClass, level: DegradationLevel): LevelProfile | undefined {
  const profile = CLASS_DEGRADATION_PROFILES[classId];
  if (!profile) return undefined;
  if (level === 'D0_NORMAL') return undefined;
  return profile[level.toLowerCase().substring(0, 2) as 'd1' | 'd2' | 'd3' | 'd4'];
}

export function getAllClassProfiles(): ClassDegradationProfile[] {
  return Object.values(CLASS_DEGRADATION_PROFILES);
}
