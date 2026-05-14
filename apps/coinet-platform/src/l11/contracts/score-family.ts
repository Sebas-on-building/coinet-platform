/**
 * L11.2 — Score Family Enumeration (§11.2.3 / §11.2.8)
 *
 * Layer 11 launches with exactly eight production-emissible score
 * families and seven reserved second-wave families. Reserved families
 * may exist in registries and documentation but may never emit
 * production score outputs (§11.2.4.3 / §11.2.8.2).
 */

export enum L11ScoreFamily {
  // ── Production families (§11.2.3, §11.2.7) ──
  OPPORTUNITY = 'OPPORTUNITY',
  RISK = 'RISK',
  TIMING = 'TIMING',
  THESIS_COHERENCE = 'THESIS_COHERENCE',
  SIGNAL_CONFIDENCE = 'SIGNAL_CONFIDENCE',
  MARKET_STRUCTURE = 'MARKET_STRUCTURE',
  WHALE_CONVICTION = 'WHALE_CONVICTION',
  UNLOCK_RISK = 'UNLOCK_RISK',

  // ── Reserved families (§11.2.8) — never production-emissible ──
  NARRATIVE_QUALITY = 'NARRATIVE_QUALITY',
  FUNDAMENTAL_SUBSTANCE = 'FUNDAMENTAL_SUBSTANCE',
  LIQUIDITY_QUALITY = 'LIQUIDITY_QUALITY',
  MANIPULATION_RISK = 'MANIPULATION_RISK',
  ECOSYSTEM_BETA = 'ECOSYSTEM_BETA',
  CONTINUATION_QUALITY = 'CONTINUATION_QUALITY',
  REVERSAL_RISK = 'REVERSAL_RISK',
}

export const ALL_L11_SCORE_FAMILIES: readonly L11ScoreFamily[] =
  Object.values(L11ScoreFamily);

export const L11_PRODUCTION_SCORE_FAMILIES: readonly L11ScoreFamily[] = [
  L11ScoreFamily.OPPORTUNITY,
  L11ScoreFamily.RISK,
  L11ScoreFamily.TIMING,
  L11ScoreFamily.THESIS_COHERENCE,
  L11ScoreFamily.SIGNAL_CONFIDENCE,
  L11ScoreFamily.MARKET_STRUCTURE,
  L11ScoreFamily.WHALE_CONVICTION,
  L11ScoreFamily.UNLOCK_RISK,
];

export const L11_RESERVED_SCORE_FAMILIES: readonly L11ScoreFamily[] = [
  L11ScoreFamily.NARRATIVE_QUALITY,
  L11ScoreFamily.FUNDAMENTAL_SUBSTANCE,
  L11ScoreFamily.LIQUIDITY_QUALITY,
  L11ScoreFamily.MANIPULATION_RISK,
  L11ScoreFamily.ECOSYSTEM_BETA,
  L11ScoreFamily.CONTINUATION_QUALITY,
  L11ScoreFamily.REVERSAL_RISK,
];

export function isL11ProductionScoreFamily(f: L11ScoreFamily): boolean {
  return L11_PRODUCTION_SCORE_FAMILIES.includes(f);
}

export function isL11ReservedScoreFamily(f: L11ScoreFamily): boolean {
  return L11_RESERVED_SCORE_FAMILIES.includes(f);
}
