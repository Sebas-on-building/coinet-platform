/**
 * L11.5 — Runtime Missing-Data Behaviour Law (§11.5.4)
 *
 * Distinct from L11.3's formula-time `L11MissingDataBehaviorClass`
 * (7 values). The L11.5 runtime enum has 8 values and adds
 * `REQUIRE_ATTRIBUTION_WARNING`, `EVIDENCE_ONLY_CLASSIFICATION`,
 * and `NO_EFFECT_WITH_DISCLOSURE`. The most-restrictive resolution
 * order in §11.5.4.3 is encoded as a stable priority array.
 */

import { L11MissingDataBehaviorClass } from './score-component';
import { L11MissingDataConditionClass } from './missing-data-condition';

export enum L11RuntimeMissingDataBehaviorClass {
  BLOCK_SCORE = 'BLOCK_SCORE',
  EVIDENCE_ONLY_CLASSIFICATION = 'EVIDENCE_ONLY_CLASSIFICATION',
  CAP_SCORE = 'CAP_SCORE',
  PENALIZE_SCORE = 'PENALIZE_SCORE',
  REDUCE_CONFIDENCE = 'REDUCE_CONFIDENCE',
  OMIT_OPTIONAL_COMPONENT = 'OMIT_OPTIONAL_COMPONENT',
  REQUIRE_ATTRIBUTION_WARNING = 'REQUIRE_ATTRIBUTION_WARNING',
  NO_EFFECT_WITH_DISCLOSURE = 'NO_EFFECT_WITH_DISCLOSURE',
}

export const ALL_L11_RUNTIME_MISSING_DATA_BEHAVIOR_CLASSES:
  readonly L11RuntimeMissingDataBehaviorClass[] =
  Object.values(L11RuntimeMissingDataBehaviorClass);

/**
 * §11.5.4.3 — Resolution order. Index 0 is most restrictive. When
 * a single input ends up with multiple candidate behaviours, the
 * lowest-index behaviour wins.
 */
export const L11_RUNTIME_BEHAVIOR_PRIORITY:
  readonly L11RuntimeMissingDataBehaviorClass[] = [
  L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE,
  L11RuntimeMissingDataBehaviorClass.EVIDENCE_ONLY_CLASSIFICATION,
  L11RuntimeMissingDataBehaviorClass.CAP_SCORE,
  L11RuntimeMissingDataBehaviorClass.PENALIZE_SCORE,
  L11RuntimeMissingDataBehaviorClass.REDUCE_CONFIDENCE,
  L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
  L11RuntimeMissingDataBehaviorClass.REQUIRE_ATTRIBUTION_WARNING,
  L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
];

/**
 * Resolve the most-restrictive runtime behaviour from a candidate
 * set. Empty input ⇒ NO_EFFECT_WITH_DISCLOSURE.
 */
export function resolveMostRestrictiveBehavior(
  candidates: readonly L11RuntimeMissingDataBehaviorClass[],
): L11RuntimeMissingDataBehaviorClass {
  let bestRank = L11_RUNTIME_BEHAVIOR_PRIORITY.length;
  for (const c of candidates) {
    const rank = L11_RUNTIME_BEHAVIOR_PRIORITY.indexOf(c);
    if (rank >= 0 && rank < bestRank) bestRank = rank;
  }
  if (bestRank === L11_RUNTIME_BEHAVIOR_PRIORITY.length) {
    return L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE;
  }
  return L11_RUNTIME_BEHAVIOR_PRIORITY[bestRank];
}

/**
 * §11.5.4 — Map an L11.3 formula-time behaviour to the L11.5
 * runtime behaviour. L11.3's `LOWER_CONFIDENCE` becomes
 * `REDUCE_CONFIDENCE`; `EVIDENCE_ONLY` becomes
 * `EVIDENCE_ONLY_CLASSIFICATION`; `REQUIRE_DISCLOSURE` becomes
 * `REQUIRE_ATTRIBUTION_WARNING`.
 */
export function mapL11FormulaBehaviorToRuntimeBehavior(
  b: L11MissingDataBehaviorClass,
): L11RuntimeMissingDataBehaviorClass {
  switch (b) {
    case L11MissingDataBehaviorClass.BLOCK_SCORE:
      return L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE;
    case L11MissingDataBehaviorClass.CAP_SCORE:
      return L11RuntimeMissingDataBehaviorClass.CAP_SCORE;
    case L11MissingDataBehaviorClass.PENALIZE_SCORE:
      return L11RuntimeMissingDataBehaviorClass.PENALIZE_SCORE;
    case L11MissingDataBehaviorClass.LOWER_CONFIDENCE:
      return L11RuntimeMissingDataBehaviorClass.REDUCE_CONFIDENCE;
    case L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT:
      return L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT;
    case L11MissingDataBehaviorClass.REQUIRE_DISCLOSURE:
      return L11RuntimeMissingDataBehaviorClass.REQUIRE_ATTRIBUTION_WARNING;
    case L11MissingDataBehaviorClass.EVIDENCE_ONLY:
      return L11RuntimeMissingDataBehaviorClass.EVIDENCE_ONLY_CLASSIFICATION;
    default:
      return L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE;
  }
}

/**
 * §11.5.4.2 — Behaviour-vs-condition legality matrix. Required and
 * critical conditions may never resolve to NO_EFFECT_WITH_DISCLOSURE;
 * evidence-only inputs may never act decisively
 * (BLOCK_SCORE/PENALIZE_SCORE/CAP_SCORE); restricted inputs may not
 * be promoted (BLOCK_SCORE/OMIT_OPTIONAL_COMPONENT both forbidden);
 * conflicting inputs may not omit (must surface attribution).
 */
const ILLEGAL_BEHAVIORS_BY_CONDITION:
  Readonly<Record<L11MissingDataConditionClass, readonly L11RuntimeMissingDataBehaviorClass[]>> = {
  [L11MissingDataConditionClass.ABSENT_REQUIRED_INPUT]: [
    L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
    L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
  ],
  [L11MissingDataConditionClass.ABSENT_OPTIONAL_INPUT]: [],
  [L11MissingDataConditionClass.STALE_REQUIRED_INPUT]: [
    L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
    L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
  ],
  [L11MissingDataConditionClass.STALE_OPTIONAL_INPUT]: [],
  [L11MissingDataConditionClass.DEGRADED_REQUIRED_INPUT]: [
    L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
  ],
  [L11MissingDataConditionClass.DEGRADED_OPTIONAL_INPUT]: [],
  [L11MissingDataConditionClass.EVIDENCE_ONLY_INPUT]: [
    L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE,
    L11RuntimeMissingDataBehaviorClass.PENALIZE_SCORE,
    L11RuntimeMissingDataBehaviorClass.CAP_SCORE,
  ],
  [L11MissingDataConditionClass.RESTRICTED_INPUT]: [
    L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
    L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
  ],
  [L11MissingDataConditionClass.CONFLICTING_INPUT]: [
    L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
    L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
  ],
  [L11MissingDataConditionClass.INSUFFICIENT_INPUT_SET]: [
    L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
    L11RuntimeMissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
  ],
  [L11MissingDataConditionClass.UNKNOWN_VISIBILITY_STATE]: [
    L11RuntimeMissingDataBehaviorClass.NO_EFFECT_WITH_DISCLOSURE,
  ],
};

export function isRuntimeBehaviorLegalForCondition(
  condition: L11MissingDataConditionClass,
  behavior: L11RuntimeMissingDataBehaviorClass,
): { ok: boolean; reason: string } {
  const illegal = ILLEGAL_BEHAVIORS_BY_CONDITION[condition] ?? [];
  if (illegal.includes(behavior)) {
    return {
      ok: false,
      reason: `behavior ${behavior} illegal for condition ${condition}`,
    };
  }
  return { ok: true, reason: 'ok' };
}

export function getIllegalBehaviorsForCondition(
  condition: L11MissingDataConditionClass,
): readonly L11RuntimeMissingDataBehaviorClass[] {
  return ILLEGAL_BEHAVIORS_BY_CONDITION[condition] ?? [];
}

/**
 * Convenience predicates for the readiness ladder (§11.5.5.4).
 */
export function isBlockingBehavior(
  b: L11RuntimeMissingDataBehaviorClass,
): boolean {
  return b === L11RuntimeMissingDataBehaviorClass.BLOCK_SCORE;
}

export function isCappingBehavior(
  b: L11RuntimeMissingDataBehaviorClass,
): boolean {
  return b === L11RuntimeMissingDataBehaviorClass.CAP_SCORE;
}

export function isPenalizingBehavior(
  b: L11RuntimeMissingDataBehaviorClass,
): boolean {
  return b === L11RuntimeMissingDataBehaviorClass.PENALIZE_SCORE;
}

export function isConfidenceReducingBehavior(
  b: L11RuntimeMissingDataBehaviorClass,
): boolean {
  return b === L11RuntimeMissingDataBehaviorClass.REDUCE_CONFIDENCE;
}

export function isEvidenceOnlyBehavior(
  b: L11RuntimeMissingDataBehaviorClass,
): boolean {
  return b === L11RuntimeMissingDataBehaviorClass.EVIDENCE_ONLY_CLASSIFICATION;
}
