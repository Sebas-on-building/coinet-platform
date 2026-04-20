/**
 * L10.5 — Evidence-Semantics Type Core
 *
 * §10.5.9.2 — Shared taxonomy for support, contradiction, confirmation,
 * invalidation, and shift-condition semantics. This file defines the
 * *meaning* vocabulary for explanatory evidence. All L10.5 validators,
 * registries, and audits consume these enums rather than re-inventing
 * their own classifications.
 */

// ──────────────────────────────────────────────────────────────────
// §10.5.2.3 — Support role taxonomy
// ──────────────────────────────────────────────────────────────────
export enum L10SupportRoleClass {
  PRIMARY_SUPPORT = 'PRIMARY_SUPPORT',
  SECONDARY_SUPPORT = 'SECONDARY_SUPPORT',
  CORROBORATIVE_SUPPORT = 'CORROBORATIVE_SUPPORT',
  CONDITIONAL_SUPPORT = 'CONDITIONAL_SUPPORT',
  DEGRADED_SUPPORT = 'DEGRADED_SUPPORT',
  STALE_SUPPORT = 'STALE_SUPPORT',
  MISSING_EXPECTED_SUPPORT = 'MISSING_EXPECTED_SUPPORT',
}
export const ALL_L10_SUPPORT_ROLE_CLASSES:
  readonly L10SupportRoleClass[] = Object.values(L10SupportRoleClass);

/**
 * §10.5.2.5 — Support roles that may anchor an explanation centrally.
 * Corroborative, conditional, degraded, stale, and missing support may
 * never be promoted to primary anchor status.
 */
export const L10_PRIMARY_CAPABLE_SUPPORT_ROLES:
  readonly L10SupportRoleClass[] = [
    L10SupportRoleClass.PRIMARY_SUPPORT,
    L10SupportRoleClass.SECONDARY_SUPPORT,
  ];

// ──────────────────────────────────────────────────────────────────
// §10.5.3.3 — Contradiction class taxonomy
// ──────────────────────────────────────────────────────────────────
export enum L10ContradictionClass {
  DIRECT_CONTRADICTION = 'DIRECT_CONTRADICTION',
  STRUCTURAL_CONTRADICTION = 'STRUCTURAL_CONTRADICTION',
  TEMPORAL_CONTRADICTION = 'TEMPORAL_CONTRADICTION',
  REGIME_CONDITIONED_CONTRADICTION = 'REGIME_CONDITIONED_CONTRADICTION',
  SEQUENCE_CONDITIONED_CONTRADICTION = 'SEQUENCE_CONDITIONED_CONTRADICTION',
  VALIDATION_CONTRADICTION = 'VALIDATION_CONTRADICTION',
  OVERHANG_CONTRADICTION = 'OVERHANG_CONTRADICTION',
  DEGRADED_COUNTEREVIDENCE = 'DEGRADED_COUNTEREVIDENCE',
  DECAYED_CONTRADICTION = 'DECAYED_CONTRADICTION',
}
export const ALL_L10_CONTRADICTION_CLASSES:
  readonly L10ContradictionClass[] = Object.values(L10ContradictionClass);

// ──────────────────────────────────────────────────────────────────
// §10.5.3.4 — Contradiction effect (narrowing vs blocking law)
// ──────────────────────────────────────────────────────────────────
export enum L10ContradictionEffectClass {
  NARROWING = 'NARROWING',
  BLOCKING = 'BLOCKING',
  DELAYING_CONFIRMATION = 'DELAYING_CONFIRMATION',
  DEGRADED_COUNTERWEIGHT = 'DEGRADED_COUNTERWEIGHT',
  DECAYED_HISTORICAL_CONTRADICTION = 'DECAYED_HISTORICAL_CONTRADICTION',
}
export const ALL_L10_CONTRADICTION_EFFECT_CLASSES:
  readonly L10ContradictionEffectClass[] =
    Object.values(L10ContradictionEffectClass);

/**
 * §10.5.3.5 — Temporal posture of a contradiction. A contradiction may
 * be real yet no longer dominant; this posture must be explicit, never
 * folded into a single pressure number.
 */
export enum L10ContradictionTemporalPosture {
  ACTIVE = 'ACTIVE',
  PARTIALLY_DECAYED = 'PARTIALLY_DECAYED',
  HISTORICAL_NON_DOMINANT = 'HISTORICAL_NON_DOMINANT',
  UNRESOLVED_DUE_TO_FRESHNESS = 'UNRESOLVED_DUE_TO_FRESHNESS',
}
export const ALL_L10_CONTRADICTION_TEMPORAL_POSTURES:
  readonly L10ContradictionTemporalPosture[] =
    Object.values(L10ContradictionTemporalPosture);

// ──────────────────────────────────────────────────────────────────
// §10.5.3.6 — Direct vs indirect contradiction
// ──────────────────────────────────────────────────────────────────
export enum L10ContradictionDirectness {
  DIRECT = 'DIRECT',
  INDIRECT = 'INDIRECT',
}

// ──────────────────────────────────────────────────────────────────
// §10.5.4.3 — Confirmation class taxonomy
// ──────────────────────────────────────────────────────────────────
export enum L10ConfirmationClass {
  CORE_CONFIRMATION = 'CORE_CONFIRMATION',
  UPGRADE_CONFIRMATION = 'UPGRADE_CONFIRMATION',
  STABILITY_CONFIRMATION = 'STABILITY_CONFIRMATION',
  SEQUENCE_CONFIRMATION = 'SEQUENCE_CONFIRMATION',
  REGIME_CONFIRMATION = 'REGIME_CONFIRMATION',
  RISK_RELIEF_CONFIRMATION = 'RISK_RELIEF_CONFIRMATION',
  MISSING_CONFIRMATION = 'MISSING_CONFIRMATION',
}
export const ALL_L10_CONFIRMATION_CLASSES:
  readonly L10ConfirmationClass[] = Object.values(L10ConfirmationClass);

/**
 * §10.5.4.6 — Confirmations that may drive a candidate *above* its
 * competitors (upgrade) are distinct from those that merely hold rank.
 */
export const L10_UPGRADE_CAPABLE_CONFIRMATION_CLASSES:
  readonly L10ConfirmationClass[] = [
    L10ConfirmationClass.CORE_CONFIRMATION,
    L10ConfirmationClass.UPGRADE_CONFIRMATION,
  ];

export enum L10ConfirmationPresence {
  REQUIRED = 'REQUIRED',
  PRESENT = 'PRESENT',
  MISSING = 'MISSING',
  DEGRADED = 'DEGRADED',
}
export const ALL_L10_CONFIRMATION_PRESENCE:
  readonly L10ConfirmationPresence[] =
    Object.values(L10ConfirmationPresence);

// ──────────────────────────────────────────────────────────────────
// §10.5.5.3 — Invalidation class taxonomy
// ──────────────────────────────────────────────────────────────────
export enum L10InvalidationClass {
  ACTIVE_INVALIDATION = 'ACTIVE_INVALIDATION',
  POTENTIAL_INVALIDATION = 'POTENTIAL_INVALIDATION',
  THRESHOLD_INVALIDATION = 'THRESHOLD_INVALIDATION',
  SEQUENCE_BREAK_INVALIDATION = 'SEQUENCE_BREAK_INVALIDATION',
  REGIME_BREAK_INVALIDATION = 'REGIME_BREAK_INVALIDATION',
  SUPPORT_COLLAPSE_INVALIDATION = 'SUPPORT_COLLAPSE_INVALIDATION',
  CONTRADICTION_DOMINANCE_INVALIDATION =
    'CONTRADICTION_DOMINANCE_INVALIDATION',
  UNRESOLVED_INVALIDATION = 'UNRESOLVED_INVALIDATION',
}
export const ALL_L10_INVALIDATION_CLASSES:
  readonly L10InvalidationClass[] = Object.values(L10InvalidationClass);

/**
 * §10.5.5.4 — Active invalidations are *already* partially present and
 * materially shape posture; potential invalidations describe only future
 * conditions.
 */
export const L10_ACTIVE_INVALIDATION_CLASSES:
  readonly L10InvalidationClass[] = [
    L10InvalidationClass.ACTIVE_INVALIDATION,
    L10InvalidationClass.CONTRADICTION_DOMINANCE_INVALIDATION,
    L10InvalidationClass.SUPPORT_COLLAPSE_INVALIDATION,
  ];

// ──────────────────────────────────────────────────────────────────
// §10.5.6.4 — Shift-condition class taxonomy
// ──────────────────────────────────────────────────────────────────
export enum L10ShiftConditionClass {
  SECONDARY_PROMOTION_CONDITION = 'SECONDARY_PROMOTION_CONDITION',
  PRIMARY_REINFORCEMENT_CONDITION = 'PRIMARY_REINFORCEMENT_CONDITION',
  PRIMARY_COLLAPSE_CONDITION = 'PRIMARY_COLLAPSE_CONDITION',
  SPREAD_NARROWING_CONDITION = 'SPREAD_NARROWING_CONDITION',
  SPREAD_WIDENING_CONDITION = 'SPREAD_WIDENING_CONDITION',
  COMPETITION_RESOLUTION_CONDITION = 'COMPETITION_RESOLUTION_CONDITION',
  UNRESOLVED_SHIFT_CONDITION = 'UNRESOLVED_SHIFT_CONDITION',
}
export const ALL_L10_SHIFT_CONDITION_CLASSES:
  readonly L10ShiftConditionClass[] =
    Object.values(L10ShiftConditionClass);

// ──────────────────────────────────────────────────────────────────
// §10.5.8.1 — Evidence-posture class (freshness / degradation / decay)
// ──────────────────────────────────────────────────────────────────
export enum L10EvidencePostureClass {
  CURRENT = 'CURRENT',
  STALE = 'STALE',
  DEGRADED = 'DEGRADED',
  DECAYED = 'DECAYED',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  BLOCKED = 'BLOCKED',
}
export const ALL_L10_EVIDENCE_POSTURE_CLASSES:
  readonly L10EvidencePostureClass[] =
    Object.values(L10EvidencePostureClass);

/**
 * §10.5.8.4 — Evidence postures that *may not* anchor a primary
 * explanation decisively. Stale/degraded/decayed/evidence-only/blocked
 * surfaces must remain narrowing, not decisive.
 */
export const L10_NON_DECISIVE_EVIDENCE_POSTURES:
  readonly L10EvidencePostureClass[] = [
    L10EvidencePostureClass.STALE,
    L10EvidencePostureClass.DEGRADED,
    L10EvidencePostureClass.DECAYED,
    L10EvidencePostureClass.EVIDENCE_ONLY,
    L10EvidencePostureClass.BLOCKED,
  ];

/**
 * §10.5.7.3 — Canonical semantic order. Every L10.5 pipeline must
 * compute evidence meaning in this order; no step may be skipped or
 * reordered.
 */
export enum L10EvidenceSemanticStage {
  S1_SUPPORT = 'S1_SUPPORT',
  S2_CONTRADICTION = 'S2_CONTRADICTION',
  S3_CONFIRMATION_GAPS = 'S3_CONFIRMATION_GAPS',
  S4_INVALIDATION_POSTURE = 'S4_INVALIDATION_POSTURE',
  S5_STABILITY_FRAGILITY = 'S5_STABILITY_FRAGILITY',
  S6_SHIFT_CONDITIONS = 'S6_SHIFT_CONDITIONS',
}
export const L10_EVIDENCE_SEMANTIC_STAGES:
  readonly L10EvidenceSemanticStage[] = [
    L10EvidenceSemanticStage.S1_SUPPORT,
    L10EvidenceSemanticStage.S2_CONTRADICTION,
    L10EvidenceSemanticStage.S3_CONFIRMATION_GAPS,
    L10EvidenceSemanticStage.S4_INVALIDATION_POSTURE,
    L10EvidenceSemanticStage.S5_STABILITY_FRAGILITY,
    L10EvidenceSemanticStage.S6_SHIFT_CONDITIONS,
  ];

/**
 * §10.5.7.5 — Candidate stability/fragility posture. Derived from the
 * interaction of support, contradiction, confirmation, and invalidation
 * — never folded back into a single "confidence" number.
 */
export enum L10CandidateStabilityClass {
  STABLE = 'STABLE',
  FRAGILE = 'FRAGILE',
  NARROWED = 'NARROWED',
  CAPPED = 'CAPPED',
  UNRESOLVED = 'UNRESOLVED',
}
export const ALL_L10_CANDIDATE_STABILITY_CLASSES:
  readonly L10CandidateStabilityClass[] =
    Object.values(L10CandidateStabilityClass);
