/**
 * L7.6 — Local Regime-Compatibility Engine
 *
 * §7.6.6 — Computes a BOUNDED local regime-compatibility score that
 * may be fed into the `REGIME_COMPATIBILITY` factor group of the
 * confidence engine.
 *
 * Hard constraints enforced here:
 *
 *   - the engine never returns a final regime classification
 *   - the engine ignores any input class the subject did not declare
 *   - the engine flags `used_without_declaration` so the validator
 *     can fail closed when a subject that did not declare regime
 *     compatibility tries to consume the factor
 *   - the score is clamped to [0,1] for safety
 */

import {
  L7LocalRegimeInput,
  L7LocalRegimeInputClass,
  L7LocalRegimeResult,
  postureForCompatibilityScore,
} from '../contracts/local-regime-compatibility';

export class L7LocalRegimeCompatibilityEngine {
  evaluate(input: L7LocalRegimeInput): L7LocalRegimeResult {
    const declared = new Set<L7LocalRegimeInputClass>(input.declared_input_classes);
    const inputs_considered: L7LocalRegimeInputClass[] = [];
    let sum = 0;
    let count = 0;
    for (const cls of declared) {
      const v = input.observations[cls];
      if (typeof v === 'number' && isFinite(v)) {
        inputs_considered.push(cls);
        sum += clamp01(v);
        count += 1;
      }
    }
    const usedWithoutDeclaration = declared.size === 0;
    const compatibility_score = count === 0 ? 0.5 : sum / count;
    return {
      subject_id: input.subject_id,
      compatibility_score,
      posture: postureForCompatibilityScore(compatibility_score),
      used_without_declaration: usedWithoutDeclaration,
      inputs_considered,
      rationale:
        `declared=${[...declared].sort().join(',') || '(none)'} ` +
        `considered=${inputs_considered.sort().join(',') || '(none)'} ` +
        `score=${compatibility_score.toFixed(3)}`,
    };
  }
}

function clamp01(n: number): number {
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
