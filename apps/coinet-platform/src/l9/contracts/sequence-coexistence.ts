/**
 * L9.2 — Sequence Coexistence Law
 *
 * §9.2.7 — Multi-state coexistence is explicit and governed. A sequence
 * engine that forces one flat state becomes weak fast (§9.2.7.1). Two
 * kinds of coexistence must remain expressible:
 *
 *   A. Cross-family coexistence (different families may coexist cleanly).
 *   B. Intra-family coexistence (within one family, constrained).
 *
 * §9.2.7.5 — Certain intra-family pairings are illegal or must be
 * reclassified to TRANSITIONAL_OVERLAP / AMBIGUOUS_MULTI_STATE.
 */

import { L9SequenceFamily } from './sequence-family';
import { L9SequenceState, getL9SequenceStateDescriptor } from './sequence-state';

/**
 * §9.2.7.3 — Canonical coexistence classes. The engine's coexistence
 * posture for a SequenceAssessment must be drawn from exactly this set.
 */
export enum L9SequenceCoexistenceClass {
  /** A single, unambiguous state for this family at this subject/time. */
  CLEAN_SINGLE = 'CLEAN_SINGLE',
  /** A dominant primary plus a materially present secondary. */
  PRIMARY_PLUS_SECONDARY = 'PRIMARY_PLUS_SECONDARY',
  /** A transition is in progress between two intra-family states. */
  TRANSITIONAL_OVERLAP = 'TRANSITIONAL_OVERLAP',
  /** Multiple states remain plausible; ambiguity must remain explicit. */
  AMBIGUOUS_MULTI_STATE = 'AMBIGUOUS_MULTI_STATE',
  /** Illegal pairing — must be blocked before emission. */
  ILLEGAL_COLLISION = 'ILLEGAL_COLLISION',
}

export const ALL_L9_SEQUENCE_COEXISTENCE_CLASSES:
  readonly L9SequenceCoexistenceClass[] =
    Object.values(L9SequenceCoexistenceClass);

/**
 * §9.2.7.5 — Rule kind governing a specific state pair within a family.
 */
export type L9SequenceCoexistenceRuleKind =
  | 'ALLOWED'
  | 'TRANSITION_ONLY'
  | 'AMBIGUITY_ONLY'
  | 'ILLEGAL';

export interface L9SequenceCoexistenceRule {
  readonly family: L9SequenceFamily;
  readonly pair: readonly [L9SequenceState, L9SequenceState];
  readonly kind: L9SequenceCoexistenceRuleKind;
  readonly reason: string;
}

/**
 * §9.2.7.4 + §9.2.7.5 — Frozen intra-family rulebook. Any pair not
 * listed here is implicitly ALLOWED, unless cross-family in which case
 * the cross-family rule applies.
 */
export const L9_SEQUENCE_COEXISTENCE_RULES:
  readonly L9SequenceCoexistenceRule[] = [
  // ── ACCUMULATION_TO_EXPANSION ──
  {
    family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    pair: [
      L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
      L9SequenceState.EARLY_NARRATIVE_IGNITION,
    ],
    kind: 'TRANSITION_ONLY',
    reason: 'Accumulation → ignition is a progression, not a clean coexistence.',
  },
  {
    family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    pair: [
      L9SequenceState.EARLY_NARRATIVE_IGNITION,
      L9SequenceState.VALIDATED_EXPANSION,
    ],
    kind: 'TRANSITION_ONLY',
    reason: 'Ignition → validated expansion requires explicit transition.',
  },
  {
    family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    pair: [
      L9SequenceState.VALIDATED_EXPANSION,
      L9SequenceState.STRUCTURAL_CONFIRMATION_GAP,
    ],
    kind: 'ILLEGAL',
    reason: 'Validated expansion and structural confirmation gap contradict by definition.',
  },
  {
    family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    pair: [
      L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
      L9SequenceState.STRUCTURAL_CONFIRMATION_GAP,
    ],
    kind: 'AMBIGUITY_ONLY',
    reason: 'Early accumulation with structural gap must stay ambiguity-preserving.',
  },

  // ── NARRATIVE_LED ──
  {
    family: L9SequenceFamily.NARRATIVE_LED,
    pair: [
      L9SequenceState.DISTRIBUTION_UNDER_HYPE,
      L9SequenceState.FAILED_CONTINUATION,
    ],
    kind: 'ALLOWED',
    reason: 'Distribution under hype and failed continuation commonly coexist late-stage.',
  },

  // ── LEVERAGE_AND_REFLEXIVITY ──
  {
    family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    pair: [
      L9SequenceState.LEVERAGE_CROWDING_PHASE,
      L9SequenceState.LATE_STAGE_REFLEXIVITY,
    ],
    kind: 'ALLOWED',
    reason: 'Crowding and reflexivity commonly coexist in late-stage dynamics.',
  },
  {
    family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    pair: [
      L9SequenceState.LEVERAGE_CROWDING_PHASE,
      L9SequenceState.CROWDING_WITHOUT_CONFIRMATION,
    ],
    kind: 'AMBIGUITY_ONLY',
    reason: 'Crowding phase vs crowding without confirmation must stay ambiguity-preserving.',
  },
  {
    family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    pair: [
      L9SequenceState.LATE_STAGE_REFLEXIVITY,
      L9SequenceState.CROWDING_WITHOUT_CONFIRMATION,
    ],
    kind: 'ALLOWED',
    reason: 'Late reflexivity and crowding-without-confirmation commonly co-present.',
  },

  // ── OVERHANG_AND_DIGESTION ──
  {
    family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
    pair: [
      L9SequenceState.POST_SHOCK_DIGESTION,
      L9SequenceState.REACCUMULATION_ATTEMPT,
    ],
    kind: 'ALLOWED',
    reason: 'Digestion can legally coexist with an early, unvalidated reaccumulation attempt.',
  },

  // ── SHOCK_AND_RECOVERY ──
  {
    family: L9SequenceFamily.SHOCK_AND_RECOVERY,
    pair: [
      L9SequenceState.POST_SHOCK_DIGESTION,
      L9SequenceState.RECOVERY_UNDER_DAMAGE,
    ],
    kind: 'ALLOWED',
    reason: 'Post-shock digestion and recovery under damage often co-occur.',
  },

  // ── ECOSYSTEM_ROTATION ──
  {
    family: L9SequenceFamily.ECOSYSTEM_ROTATION,
    pair: [L9SequenceState.ROTATION_EARLY, L9SequenceState.ROTATION_VALIDATED],
    kind: 'TRANSITION_ONLY',
    reason: 'Early rotation → validated rotation requires explicit transition.',
  },
];

function pairEqualsStates(
  a: readonly [L9SequenceState, L9SequenceState],
  b: readonly [L9SequenceState, L9SequenceState],
): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

export function getL9CoexistenceRule(
  family: L9SequenceFamily,
  a: L9SequenceState,
  b: L9SequenceState,
): L9SequenceCoexistenceRule | undefined {
  return L9_SEQUENCE_COEXISTENCE_RULES.find(
    r => r.family === family && pairEqualsStates(r.pair, [a, b]),
  );
}

export interface L9CoexistenceDecision {
  readonly allowed: boolean;
  readonly declaredClass: L9SequenceCoexistenceClass;
  readonly requiredClass: L9SequenceCoexistenceClass | null;
  readonly rule: L9SequenceCoexistenceRule | null;
  readonly reason: string;
}

/**
 * §9.2.7.4 — Decide whether a declared coexistence class is consistent
 * with the intra-family rulebook for a (primary, secondary) pair.
 *
 * Rules:
 *   - secondary === null  ⇒ must be CLEAN_SINGLE and state must allow
 *                           clean-single (§9.2.6.5).
 *   - secondary === primary ⇒ always ILLEGAL_COLLISION.
 *   - ALLOWED rule        ⇒ PRIMARY_PLUS_SECONDARY / TRANSITIONAL_OVERLAP
 *                           / AMBIGUOUS_MULTI_STATE all legal.
 *   - TRANSITION_ONLY     ⇒ only TRANSITIONAL_OVERLAP legal.
 *   - AMBIGUITY_ONLY      ⇒ only AMBIGUOUS_MULTI_STATE legal.
 *   - ILLEGAL             ⇒ no declared class can rescue the pair.
 *   - no rule             ⇒ implicitly ALLOWED (not CLEAN_SINGLE nor
 *                           ILLEGAL_COLLISION).
 */
export function decideL9Coexistence(
  family: L9SequenceFamily,
  primary: L9SequenceState,
  secondary: L9SequenceState | null,
  declared: L9SequenceCoexistenceClass,
): L9CoexistenceDecision {
  // No secondary → must be CLEAN_SINGLE and state must allow it.
  if (secondary === null) {
    if (declared === L9SequenceCoexistenceClass.CLEAN_SINGLE) {
      const d = getL9SequenceStateDescriptor(primary);
      if (d && !d.cleanSingleAllowed) {
        return {
          allowed: false,
          declaredClass: declared,
          requiredClass: L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE,
          rule: null,
          reason:
            `state ${primary} is not allowed to emit as CLEAN_SINGLE (§9.2.6.5)`,
        };
      }
      return {
        allowed: true,
        declaredClass: declared,
        requiredClass: L9SequenceCoexistenceClass.CLEAN_SINGLE,
        rule: null,
        reason: 'no secondary declared',
      };
    }
    return {
      allowed: false,
      declaredClass: declared,
      requiredClass: L9SequenceCoexistenceClass.CLEAN_SINGLE,
      rule: null,
      reason:
        `secondary is null but coexistence_class=${declared} (must be CLEAN_SINGLE)`,
    };
  }

  if (primary === secondary) {
    return {
      allowed: false,
      declaredClass: declared,
      requiredClass: L9SequenceCoexistenceClass.ILLEGAL_COLLISION,
      rule: null,
      reason: 'secondary must differ from primary',
    };
  }

  const rule = getL9CoexistenceRule(family, primary, secondary);
  if (!rule) {
    if (declared === L9SequenceCoexistenceClass.CLEAN_SINGLE) {
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
        rule: null,
        reason:
          'secondary present but coexistence_class=CLEAN_SINGLE (must be PRIMARY_PLUS_SECONDARY)',
      };
    }
    if (declared === L9SequenceCoexistenceClass.ILLEGAL_COLLISION) {
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
        rule: null,
        reason: 'pair has no illegal rule declared',
      };
    }
    return {
      allowed: true,
      declaredClass: declared,
      requiredClass: null,
      rule: null,
      reason: 'no explicit rule — coexistence implicitly allowed',
    };
  }

  switch (rule.kind) {
    case 'ILLEGAL':
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L9SequenceCoexistenceClass.ILLEGAL_COLLISION,
        rule,
        reason: rule.reason,
      };
    case 'TRANSITION_ONLY':
      if (declared === L9SequenceCoexistenceClass.TRANSITIONAL_OVERLAP) {
        return {
          allowed: true,
          declaredClass: declared,
          requiredClass: L9SequenceCoexistenceClass.TRANSITIONAL_OVERLAP,
          rule,
          reason: rule.reason,
        };
      }
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L9SequenceCoexistenceClass.TRANSITIONAL_OVERLAP,
        rule,
        reason:
          `pair requires TRANSITIONAL_OVERLAP but declared ${declared}: ${rule.reason}`,
      };
    case 'AMBIGUITY_ONLY':
      if (declared === L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE) {
        return {
          allowed: true,
          declaredClass: declared,
          requiredClass: L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE,
          rule,
          reason: rule.reason,
        };
      }
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE,
        rule,
        reason:
          `pair requires AMBIGUOUS_MULTI_STATE but declared ${declared}: ${rule.reason}`,
      };
    case 'ALLOWED':
      if (
        declared === L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY ||
        declared === L9SequenceCoexistenceClass.TRANSITIONAL_OVERLAP ||
        declared === L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE
      ) {
        return {
          allowed: true,
          declaredClass: declared,
          requiredClass: null,
          rule,
          reason: rule.reason,
        };
      }
      return {
        allowed: false,
        declaredClass: declared,
        requiredClass: L9SequenceCoexistenceClass.PRIMARY_PLUS_SECONDARY,
        rule,
        reason:
          `ALLOWED pair cannot be declared ${declared}: ${rule.reason}`,
      };
  }
}

export function l9IsIllegalIntraFamilyPair(
  family: L9SequenceFamily,
  primary: L9SequenceState,
  secondary: L9SequenceState,
): boolean {
  const rule = getL9CoexistenceRule(family, primary, secondary);
  return rule?.kind === 'ILLEGAL';
}
