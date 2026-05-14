/**
 * L11.2 — Score Direction Law (§11.2.6)
 *
 * Family-specific direction semantics. Each production score family
 * declares exactly one direction class. Direction-mixing inside a
 * single final score is forbidden (§11.2.6.3).
 *
 * Note: this is the doctrine-level family-direction enum. It is
 * distinct from the abstract L11.1 `L11ScoreDirectionClass` (which
 * only distinguishes better/worse/intense/uncertain). L11.2 enforces
 * the richer, family-specific direction semantics that production
 * formulas in L11.3 must honour.
 */

import { L11ScoreFamily } from './score-family';

export enum L11ScoreFamilyDirectionClass {
  HIGHER_IS_MORE_CONSTRUCTIVE = 'HIGHER_IS_MORE_CONSTRUCTIVE',
  HIGHER_IS_MORE_DANGEROUS = 'HIGHER_IS_MORE_DANGEROUS',
  HIGHER_IS_MORE_TIMELY = 'HIGHER_IS_MORE_TIMELY',
  HIGHER_IS_MORE_COHERENT = 'HIGHER_IS_MORE_COHERENT',
  HIGHER_IS_MORE_RELIABLE = 'HIGHER_IS_MORE_RELIABLE',
  HIGHER_IS_STRUCTURALLY_HEALTHIER = 'HIGHER_IS_STRUCTURALLY_HEALTHIER',
  HIGHER_IS_MORE_SUPPLY_RISK = 'HIGHER_IS_MORE_SUPPLY_RISK',
  HIGHER_IS_MORE_UNCERTAIN = 'HIGHER_IS_MORE_UNCERTAIN',
  FAMILY_DEFINED = 'FAMILY_DEFINED',
}

export const ALL_L11_SCORE_FAMILY_DIRECTION_CLASSES:
  readonly L11ScoreFamilyDirectionClass[] =
  Object.values(L11ScoreFamilyDirectionClass);

/**
 * §11.2.6.2 — Required direction mapping for the eight production
 * families. Any production family whose declared direction does not
 * match this map is rejected by `score-direction.validator.ts`.
 */
export const L11_REQUIRED_DIRECTION_BY_FAMILY:
  Readonly<Record<L11ScoreFamily, L11ScoreFamilyDirectionClass>> = {
  [L11ScoreFamily.OPPORTUNITY]:
    L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_CONSTRUCTIVE,
  [L11ScoreFamily.RISK]:
    L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
  [L11ScoreFamily.TIMING]:
    L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_TIMELY,
  [L11ScoreFamily.THESIS_COHERENCE]:
    L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_COHERENT,
  [L11ScoreFamily.SIGNAL_CONFIDENCE]:
    L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_RELIABLE,
  [L11ScoreFamily.MARKET_STRUCTURE]:
    L11ScoreFamilyDirectionClass.HIGHER_IS_STRUCTURALLY_HEALTHIER,
  [L11ScoreFamily.WHALE_CONVICTION]:
    L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_CONSTRUCTIVE,
  [L11ScoreFamily.UNLOCK_RISK]:
    L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_SUPPLY_RISK,
  // ── Reserved families default to FAMILY_DEFINED until ratified ──
  [L11ScoreFamily.NARRATIVE_QUALITY]:
    L11ScoreFamilyDirectionClass.FAMILY_DEFINED,
  [L11ScoreFamily.FUNDAMENTAL_SUBSTANCE]:
    L11ScoreFamilyDirectionClass.FAMILY_DEFINED,
  [L11ScoreFamily.LIQUIDITY_QUALITY]:
    L11ScoreFamilyDirectionClass.FAMILY_DEFINED,
  [L11ScoreFamily.MANIPULATION_RISK]:
    L11ScoreFamilyDirectionClass.FAMILY_DEFINED,
  [L11ScoreFamily.ECOSYSTEM_BETA]:
    L11ScoreFamilyDirectionClass.FAMILY_DEFINED,
  [L11ScoreFamily.CONTINUATION_QUALITY]:
    L11ScoreFamilyDirectionClass.FAMILY_DEFINED,
  [L11ScoreFamily.REVERSAL_RISK]:
    L11ScoreFamilyDirectionClass.FAMILY_DEFINED,
};

/**
 * §11.2.6.3 — Direction-mixing detector. Catches descriptions that
 * declare conflicting "higher means" semantics inside the same
 * non-decomposed score. Subcomponents must be carried by separate
 * component scores in L11.3.
 */
export function detectL11DirectionMixingDoctrine(description: string): boolean {
  const lower = description.toLowerCase();
  let count = 0;
  if (
    lower.includes('higher is better') ||
    lower.includes('higher = better') ||
    lower.includes('higher means better') ||
    lower.includes('higher is more constructive')
  ) count++;
  if (
    lower.includes('higher is worse') ||
    lower.includes('higher = worse') ||
    lower.includes('higher means worse') ||
    lower.includes('higher is more dangerous')
  ) count++;
  if (lower.includes('higher is more timely') && count > 0) return true;
  if (
    (lower.includes('higher is more reliable') ||
      lower.includes('higher means confidence')) &&
    count > 0
  ) return true;
  if (lower.includes('higher means risk') && count > 0) return true;
  return count > 1;
}
