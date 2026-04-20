/**
 * L9.5 — Change Point Policy
 *
 * §9.5.7 — A change point is a governed temporal break, not "any new
 * event". This file freezes trigger families, materiality thresholds,
 * and required anchors per change-point class so the engine cannot
 * launder noise or convenience as a typed break.
 */

import { L9ChangePointClass, L9ChangePointSeverity } from './change-point';

/**
 * §9.5.7.3 — Materiality class for a change point. Derived from
 * `severity_score` so engines never re-band it themselves.
 */
export enum L9ChangePointMateriality {
  TRIVIAL = 'TRIVIAL',
  WEAK = 'WEAK',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
  DECISIVE = 'DECISIVE',
}

export const ALL_L9_CHANGE_POINT_MATERIALITIES:
  readonly L9ChangePointMateriality[] =
    Object.values(L9ChangePointMateriality);

/**
 * §9.5.7.3-4 — Required trigger-family class. Every change point must
 * carry a trigger from a registered family — an unanchored break is
 * rejected (§9.5.7.5).
 */
export enum L9ChangePointTriggerFamily {
  CONTRADICTION_BUNDLE = 'CONTRADICTION_BUNDLE',
  REGIME_TRANSITION = 'REGIME_TRANSITION',
  UNLOCK_EVENT = 'UNLOCK_EVENT',
  LIQUIDATION_EVENT = 'LIQUIDATION_EVENT',
  SECURITY_EVENT = 'SECURITY_EVENT',
  NARRATIVE_BREAKOUT = 'NARRATIVE_BREAKOUT',
  PHASE_SHIFT_EVIDENCE = 'PHASE_SHIFT_EVIDENCE',
  LEAD_LAG_INVERSION = 'LEAD_LAG_INVERSION',
  DECAY_DOMINANCE = 'DECAY_DOMINANCE',
  POST_EVENT_ENTRY = 'POST_EVENT_ENTRY',
  POST_EVENT_EXIT = 'POST_EVENT_EXIT',
}

export const ALL_L9_CHANGE_POINT_TRIGGER_FAMILIES:
  readonly L9ChangePointTriggerFamily[] =
    Object.values(L9ChangePointTriggerFamily);

/**
 * §9.5.7.4 — Which trigger families are legal for each change-point
 * class. Any emission outside this set is an illegal change point
 * (§9.5.7.5).
 */
export const L9_LEGAL_TRIGGER_FAMILIES_PER_CP:
  Readonly<Record<L9ChangePointClass, readonly L9ChangePointTriggerFamily[]>> = {
    [L9ChangePointClass.INITIATING]: [
      L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
      L9ChangePointTriggerFamily.NARRATIVE_BREAKOUT,
    ],
    [L9ChangePointClass.CONFIRMING]: [
      L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
      L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    ],
    [L9ChangePointClass.REINFORCING]: [
      L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
    ],
    [L9ChangePointClass.REVERSING]: [
      L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
      L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
      L9ChangePointTriggerFamily.REGIME_TRANSITION,
    ],
    [L9ChangePointClass.LATE_PARTICIPATION]: [
      L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    ],
    [L9ChangePointClass.CROWDING_ONSET]: [
      L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
      L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    ],
    [L9ChangePointClass.REFLEXIVE_ACCELERATION]: [
      L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
      L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    ],
    [L9ChangePointClass.CONTRADICTION_SHOCK]: [
      L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
    ],
    [L9ChangePointClass.UNLOCK_EVENT]: [
      L9ChangePointTriggerFamily.UNLOCK_EVENT,
    ],
    [L9ChangePointClass.LIQUIDATION_EVENT]: [
      L9ChangePointTriggerFamily.LIQUIDATION_EVENT,
    ],
    [L9ChangePointClass.SECURITY_SHOCK]: [
      L9ChangePointTriggerFamily.SECURITY_EVENT,
    ],
    [L9ChangePointClass.LEAD_LAG_INVERSION]: [
      L9ChangePointTriggerFamily.LEAD_LAG_INVERSION,
    ],
    [L9ChangePointClass.PHASE_SHIFT]: [
      L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
      L9ChangePointTriggerFamily.REGIME_TRANSITION,
    ],
    [L9ChangePointClass.DECAY_ONSET]: [
      L9ChangePointTriggerFamily.DECAY_DOMINANCE,
    ],
  };

/**
 * §9.5.7.4 — Change-point classes that require an event anchor (i.e.
 * a concrete on-chain or market event) rather than purely inferred
 * evidence.
 */
export const L9_CP_CLASSES_REQUIRING_EVENT_ANCHOR:
  readonly L9ChangePointClass[] = [
    L9ChangePointClass.UNLOCK_EVENT,
    L9ChangePointClass.LIQUIDATION_EVENT,
    L9ChangePointClass.SECURITY_SHOCK,
    L9ChangePointClass.CONTRADICTION_SHOCK,
  ];

/**
 * §9.5.7.4 — Change-point classes that require both prior and next
 * phase refs (they are phase-boundary events).
 */
export const L9_CP_CLASSES_REQUIRING_PHASE_BOUNDS:
  readonly L9ChangePointClass[] = [
    L9ChangePointClass.PHASE_SHIFT,
    L9ChangePointClass.CROWDING_ONSET,
    L9ChangePointClass.REFLEXIVE_ACCELERATION,
    L9ChangePointClass.DECAY_ONSET,
    L9ChangePointClass.INITIATING,
    L9ChangePointClass.CONFIRMING,
  ];

/**
 * §9.5.7.6 — Minimum `severity_score` required for a change point of
 * the given class to be material. Anything below is `TRIVIAL` noise.
 */
export const L9_CP_MATERIALITY_MINIMUM_SEVERITY:
  Readonly<Record<L9ChangePointClass, number>> = {
    [L9ChangePointClass.INITIATING]: 0.20,
    [L9ChangePointClass.CONFIRMING]: 0.20,
    [L9ChangePointClass.REINFORCING]: 0.15,
    [L9ChangePointClass.REVERSING]: 0.40,
    [L9ChangePointClass.LATE_PARTICIPATION]: 0.20,
    [L9ChangePointClass.CROWDING_ONSET]: 0.30,
    [L9ChangePointClass.REFLEXIVE_ACCELERATION]: 0.40,
    [L9ChangePointClass.CONTRADICTION_SHOCK]: 0.50,
    [L9ChangePointClass.UNLOCK_EVENT]: 0.10,
    [L9ChangePointClass.LIQUIDATION_EVENT]: 0.30,
    [L9ChangePointClass.SECURITY_SHOCK]: 0.50,
    [L9ChangePointClass.LEAD_LAG_INVERSION]: 0.25,
    [L9ChangePointClass.PHASE_SHIFT]: 0.30,
    [L9ChangePointClass.DECAY_ONSET]: 0.30,
  };

/**
 * §9.5.7.3 — Band a 0..1 `severity_score` into an
 * `L9ChangePointMateriality`.
 */
export function classifyL9ChangePointMateriality(
  severity_score: number,
): L9ChangePointMateriality {
  if (!Number.isFinite(severity_score) || severity_score < 0) {
    return L9ChangePointMateriality.TRIVIAL;
  }
  if (severity_score < 0.15) return L9ChangePointMateriality.TRIVIAL;
  if (severity_score < 0.30) return L9ChangePointMateriality.WEAK;
  if (severity_score < 0.55) return L9ChangePointMateriality.MODERATE;
  if (severity_score < 0.80) return L9ChangePointMateriality.STRONG;
  return L9ChangePointMateriality.DECISIVE;
}

/**
 * §9.5.7.4 — Is the given severity band strong enough to count as a
 * material change point for the class?
 */
export function isL9ChangePointMaterial(
  cls: L9ChangePointClass,
  severity_score: number,
): boolean {
  const min = L9_CP_MATERIALITY_MINIMUM_SEVERITY[cls];
  return Number.isFinite(severity_score) && severity_score >= min;
}

/** §9.5.7.4 — Is `trigger` a legal trigger family for change-point `cls`? */
export function isL9LegalChangePointTrigger(
  cls: L9ChangePointClass,
  trigger: L9ChangePointTriggerFamily,
): boolean {
  return L9_LEGAL_TRIGGER_FAMILIES_PER_CP[cls].includes(trigger);
}

/** §9.5.7.4 — Does this class require an event anchor? */
export function l9ChangePointRequiresEventAnchor(
  cls: L9ChangePointClass,
): boolean {
  return L9_CP_CLASSES_REQUIRING_EVENT_ANCHOR.includes(cls);
}

/** §9.5.7.4 — Does this class require both prior and next phase refs? */
export function l9ChangePointRequiresPhaseBounds(
  cls: L9ChangePointClass,
): boolean {
  return L9_CP_CLASSES_REQUIRING_PHASE_BOUNDS.includes(cls);
}

/**
 * §9.5.7.3 — Map a change-point materiality band to an
 * `L9ChangePointSeverity` band for cross-policy compatibility.
 */
export function materialityToSeverity(
  m: L9ChangePointMateriality,
): L9ChangePointSeverity {
  switch (m) {
    case L9ChangePointMateriality.TRIVIAL:
    case L9ChangePointMateriality.WEAK:
      return L9ChangePointSeverity.MINOR;
    case L9ChangePointMateriality.MODERATE:
      return L9ChangePointSeverity.MODERATE;
    case L9ChangePointMateriality.STRONG:
      return L9ChangePointSeverity.MAJOR;
    case L9ChangePointMateriality.DECISIVE:
      return L9ChangePointSeverity.DECISIVE;
  }
}
