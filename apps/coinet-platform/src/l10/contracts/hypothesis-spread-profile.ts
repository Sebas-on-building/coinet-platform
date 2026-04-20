/**
 * L10.2 — HypothesisSpreadProfile Contract
 *
 * §10.2.14 — Explicit separation / stability between leading candidates.
 * Spread must never be hidden inside confidence alone.
 */

import { fnv1aHexL10 } from './hypothesis-subject';
import { L10RankingStabilityClass } from './hypothesis-ranking';

export enum L10SpreadClass {
  WIDE = 'WIDE',
  MODERATE = 'MODERATE',
  NARROW = 'NARROW',
  TIED = 'TIED',
}

export const ALL_L10_SPREAD_CLASSES: readonly L10SpreadClass[] =
  Object.values(L10SpreadClass);

/**
 * §10.2.14 — Narrow / tied spreads force later layers to narrow
 * reliance. The resolver deterministically maps spread magnitude to
 * class.
 */
export function l10SpreadClassForGap(gap: number): L10SpreadClass {
  if (!Number.isFinite(gap) || gap < 0) return L10SpreadClass.TIED;
  if (gap < 0.05) return L10SpreadClass.TIED;
  if (gap < 0.15) return L10SpreadClass.NARROW;
  if (gap < 0.3) return L10SpreadClass.MODERATE;
  return L10SpreadClass.WIDE;
}

export interface L10HypothesisSpreadProfile {
  readonly spread_profile_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_ranking_ref: string;
  readonly as_of: string;

  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;
  readonly confidence_spread: number; // 0..1
  readonly spread_class: L10SpreadClass;
  readonly ranking_stability_class: L10RankingStabilityClass;
  readonly narrow_spread_flag: boolean;

  readonly evidence_pack_ref: string;
  readonly replay_hash: string;
  readonly lineage_refs: readonly string[];
}

export function buildL10SpreadProfileId(
  hypothesis_subject_id: string,
  as_of: string,
  compute_run_id: string,
): string {
  const key = `${hypothesis_subject_id}|${as_of}|${compute_run_id}`;
  return `hspread_${fnv1aHexL10(key)}_${fnv1aHexL10(hypothesis_subject_id)}`;
}
