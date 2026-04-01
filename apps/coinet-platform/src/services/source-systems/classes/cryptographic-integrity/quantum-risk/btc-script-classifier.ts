/**
 * Section 2 — BTC Script Classifier
 *
 * Input:  ScriptDistribution
 * Output: ExposureClassification
 * Failure: if input is null → return null (caller must degrade)
 *
 * Mapping (STRICT):
 *   p2pk  → exposed   (1.0)
 *   p2tr  → exposed   (1.0)
 *   p2pkh → semi_exposed (0.5 unless reuse known)
 *   p2wpkh → semi_exposed (0.3)
 *   p2sh  → unknown   (0.5)
 */

import type { ScriptDistribution, ExposureClassification } from './types';

export function classifyBtcScripts(
  dist: ScriptDistribution | null,
): ExposureClassification | null {
  if (!dist) return null;

  const exposed = dist.p2pk + dist.p2tr;
  const semi_exposed = dist.p2pkh + dist.p2wpkh;
  const safe = 0;
  const unknown = dist.p2sh + dist.unknown;

  return { exposed, semi_exposed, safe, unknown };
}

export const EXPOSURE_WEIGHTS = {
  exposed: 1.0,
  semi_exposed: 0.5,
  unknown: 0.3,
  safe: 0.0,
} as const;
