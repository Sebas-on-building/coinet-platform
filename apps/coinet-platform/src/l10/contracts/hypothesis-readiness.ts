/**
 * L10.7 — Hypothesis Readiness
 *
 * §10.7.7 — Canonical reliance readiness classes summarize — but do
 * not replace — the confidence profile, cap chain, spread profile,
 * and restriction rights (INV-10.7-G).
 *
 * Readiness answers the single-line question later layers actually
 * need: "how usable is the current primary explanation?".
 *
 * Classes (§10.7.7.1):
 *   STRONG_PRIMARY        — robust
 *   NARROWED_PRIMARY      — legal but narrowed
 *   DEGRADED_PRIMARY      — primary survives but evidence posture is degraded
 *   UNRESOLVED_COMPETITION — competition too alive to resolve
 *   BLOCKED               — unusable
 */

import {
  L10HypothesisRelianceConfidenceBand,
} from './hypothesis-confidence.policy';
import {
  L10HypothesisCapReadinessHint,
} from './hypothesis-cap-chain';
import {
  L10HypothesisRestrictionRight,
} from './hypothesis-restriction-rights';
import { L10SpreadClass } from './hypothesis-spread-profile';

/**
 * §10.7.7.1 — Reliance-grade readiness classes. Named
 * `L10HypothesisRelianceReadinessClass` to stay disjoint from the
 * L10.2 `L10HypothesisReadinessClass` (DRAFT / PROVISIONAL / READY
 * for assessment objects). L10.7 readiness summarizes the *reliance*
 * posture on the ranked explanatory competition, not the editorial
 * completeness of an assessment object.
 */
export enum L10HypothesisRelianceReadinessClass {
  STRONG_PRIMARY = 'STRONG_PRIMARY',
  NARROWED_PRIMARY = 'NARROWED_PRIMARY',
  DEGRADED_PRIMARY = 'DEGRADED_PRIMARY',
  UNRESOLVED_COMPETITION = 'UNRESOLVED_COMPETITION',
  BLOCKED = 'BLOCKED',
}

export const ALL_L10_HYPOTHESIS_RELIANCE_READINESS_CLASSES:
  readonly L10HypothesisRelianceReadinessClass[] =
    Object.values(L10HypothesisRelianceReadinessClass);

/**
 * §10.7.7.3 — Deterministic readiness summarizer. Accepts the capped
 * band, cap-chain hint, spread class, and a small set of
 * posture booleans (evidence_only, final_judgment_blocked, active
 * invalidation, material missing confirmations).
 *
 * First-principle ordering of the switch (§10.7.7.4):
 *   - BLOCKED beats everything
 *   - UNRESOLVED beats narrowed/degraded/strong when competition alive
 *   - STRONG_PRIMARY requires wide/moderate spread AND HIGH band
 *     AND no active invalidation AND no material missing confirmations
 *   - otherwise fallback to NARROWED / DEGRADED
 */
export function summarizeL10HypothesisRelianceReadiness(args: {
  band: L10HypothesisRelianceConfidenceBand;
  cap_hint: L10HypothesisCapReadinessHint;
  spread_class: L10SpreadClass;
  has_evidence_only_right: boolean;
  has_final_judgment_blocked_right: boolean;
  active_invalidation: boolean;
  material_missing_confirmations: boolean;
}): L10HypothesisRelianceReadinessClass {
  // §10.7.7.5 — BLOCKED dominates.
  if (
    args.has_final_judgment_blocked_right ||
    args.has_evidence_only_right ||
    args.cap_hint === L10HypothesisCapReadinessHint.BLOCKED ||
    args.band === L10HypothesisRelianceConfidenceBand.UNRESOLVED
  ) {
    return L10HypothesisRelianceReadinessClass.BLOCKED;
  }

  // §10.7.7.5 — UNRESOLVED spread or tied ranking → competition alive.
  if (args.spread_class === L10SpreadClass.TIED) {
    return L10HypothesisRelianceReadinessClass.UNRESOLVED_COMPETITION;
  }

  // §10.7.7.5 — STRONG_PRIMARY preconditions.
  const strongLegal =
    args.band === L10HypothesisRelianceConfidenceBand.HIGH &&
    (args.spread_class === L10SpreadClass.WIDE ||
      args.spread_class === L10SpreadClass.MODERATE) &&
    !args.active_invalidation &&
    !args.material_missing_confirmations &&
    args.cap_hint === L10HypothesisCapReadinessHint.CLEAN;
  if (strongLegal) return L10HypothesisRelianceReadinessClass.STRONG_PRIMARY;

  // §10.7.7.5 — LOW band → degraded.
  if (args.band === L10HypothesisRelianceConfidenceBand.LOW) {
    return L10HypothesisRelianceReadinessClass.DEGRADED_PRIMARY;
  }

  // §10.7.7.5 — Heavily-narrowed cap hint while medium/high band →
  // degraded (evidence posture materially reduces trust).
  if (args.cap_hint === L10HypothesisCapReadinessHint.HEAVILY_NARROWED) {
    return L10HypothesisRelianceReadinessClass.DEGRADED_PRIMARY;
  }

  return L10HypothesisRelianceReadinessClass.NARROWED_PRIMARY;
}

/**
 * §10.7.7.4 — Readiness "dignity" rank. Used by validators when
 * comparing declared readiness against the derived one (a readiness
 * may be downgraded by policy but never upgraded silently).
 */
export const L10_HYPOTHESIS_RELIANCE_READINESS_RANK: Readonly<
  Record<L10HypothesisRelianceReadinessClass, number>
> = {
  [L10HypothesisRelianceReadinessClass.BLOCKED]: 0,
  [L10HypothesisRelianceReadinessClass.UNRESOLVED_COMPETITION]: 1,
  [L10HypothesisRelianceReadinessClass.DEGRADED_PRIMARY]: 2,
  [L10HypothesisRelianceReadinessClass.NARROWED_PRIMARY]: 3,
  [L10HypothesisRelianceReadinessClass.STRONG_PRIMARY]: 4,
};

/**
 * §10.7.7.5 — Rights incompatible with a `STRONG_PRIMARY` readiness.
 * Presence of any of these forces at least narrowed.
 */
export const L10_HYPOTHESIS_RELIANCE_READINESS_STRONG_BLOCKERS:
  readonly L10HypothesisRestrictionRight[] = [
    L10HypothesisRestrictionRight.EVIDENCE_ONLY,
    L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
    L10HypothesisRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED,
    L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
  ];
