/**
 * P3-BTAR-003 — Synthetic Episode Corpus Metadata
 *
 * Static metadata about the Phase 3 synthetic episode corpus: policy version,
 * target size band, and the list of required episode families that the corpus
 * MUST cover.
 *
 * This module is pure data + types. It does NOT score correctness, does NOT
 * import any real provider, and does NOT mutate any other module.
 *
 * Authority:
 *   - Plan 3.0 §1, §6, §7, §8, §9 (BTAR sequence — third entry), §12 (no-API rule)
 *   - P3-BTAR-003 §6 (required families)
 *   - P3-BTAR-003 §9 (corpus metadata)
 *
 * Owner: Phase 3 (P3-BTAR-003).
 */

// -----------------------------------------------------------------------------
// 1. Policy version
// -----------------------------------------------------------------------------

export const SYNTHETIC_EPISODE_CORPUS_POLICY_VERSION =
  'synthetic-episode-corpus.v1' as const;

export type SyntheticEpisodeCorpusPolicyVersion =
  typeof SYNTHETIC_EPISODE_CORPUS_POLICY_VERSION;

// -----------------------------------------------------------------------------
// 2. Target size
//
// Per P3-BTAR-003 §5 the corpus is 15–25 episodes with a recommended size of 18.
// `as const` pins the literals so tests cannot accidentally widen the band.
// -----------------------------------------------------------------------------

export const SYNTHETIC_EPISODE_CORPUS_TARGET_SIZE = {
  minimum: 15,
  maximum: 25,
  recommended: 18,
} as const;

export type SyntheticEpisodeCorpusTargetSize =
  typeof SYNTHETIC_EPISODE_CORPUS_TARGET_SIZE;

// -----------------------------------------------------------------------------
// 3. Required episode families
//
// FAM-001..FAM-015 are REQUIRED per P3-BTAR-003 §6.
// FAM-016..FAM-018 are recommended additions covered by the 18-episode target.
// `required: true` is the mechanical contract Class B tests enforce.
// -----------------------------------------------------------------------------

export interface SyntheticEpisodeFamilyDefinition {
  family_id: string;
  name: string;
  required: boolean;
}

export const REQUIRED_SYNTHETIC_EPISODE_FAMILIES: ReadonlyArray<SyntheticEpisodeFamilyDefinition> = [
  { family_id: 'FAM-001', name: 'Clean accumulation', required: true },
  { family_id: 'FAM-002', name: 'Early accumulation with weak sentiment', required: true },
  { family_id: 'FAM-003', name: 'Leverage-driven fake strength', required: true },
  { family_id: 'FAM-004', name: 'Spot-led healthy expansion', required: true },
  { family_id: 'FAM-005', name: 'Late euphoric momentum', required: true },
  { family_id: 'FAM-006', name: 'Unlock-risk distribution', required: true },
  { family_id: 'FAM-007', name: 'Fundamentals improving but timing late', required: true },
  { family_id: 'FAM-008', name: 'Whale accumulation with flat price', required: true },
  { family_id: 'FAM-009', name: 'Price pump with weak on-chain quality', required: true },
  { family_id: 'FAM-010', name: 'Sentiment-only pump', required: true },
  { family_id: 'FAM-011', name: 'Derivatives squeeze risk', required: true },
  { family_id: 'FAM-012', name: 'Liquidity-thin breakout', required: true },
  { family_id: 'FAM-013', name: 'Risk-off market despite asset strength', required: true },
  { family_id: 'FAM-014', name: 'Mixed signals / low confidence', required: true },
  { family_id: 'FAM-015', name: 'Degraded data / partial blindness', required: true },
  { family_id: 'FAM-016', name: 'Security-risk override', required: true },
  { family_id: 'FAM-017', name: 'Exchange inflow distribution risk', required: true },
  { family_id: 'FAM-018', name: 'Narrative catalyst with weak fundamentals', required: true },
];

// -----------------------------------------------------------------------------
// 4. Family coverage result
//
// Per-family coverage record. Tests use this to mechanically prove that every
// required family has ≥ 1 covering episode without hardcoding ID-to-family
// pairs inside the test file.
// -----------------------------------------------------------------------------

export interface SyntheticEpisodeFamilyCoverage {
  family_id: string;
  name: string;
  required: boolean;
  covered_by_episode_ids: string[];
}
