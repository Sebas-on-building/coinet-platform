/**
 * L8.5 — Lower-Layer Consumption Validator
 *
 * §8.5.8.1 / §8.5.8.2 — Runtime check of the lower-layer consumption
 * law. Accepts a spec of claimed runtime behaviours and rejects:
 *   - L7 bypass
 *   - L6 revalidation
 *   - hidden rights widening
 *   - silent contradiction downgrade
 *   - consuming blocked validation emissions
 *   - judgment/scenario surfaces pulled in as regime inputs
 *   - cross-scope leakage
 */

import { L8RegimeInputViolationCode } from '../contracts/regime-consumption-rights';

export interface L8LowerLayerConsumptionSpec {
  readonly componentId: string;
  readonly claimedBehaviors: readonly string[];
}

export interface L8LowerLayerConsumptionIssue {
  readonly code: L8RegimeInputViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8LowerLayerConsumptionReport {
  readonly valid: boolean;
  readonly issues: readonly L8LowerLayerConsumptionIssue[];
}

/**
 * Behaviour pattern → violation code. Mirrors the L8.1 boundary
 * validator but focuses on INPUT consumption misuse.
 */
const L8_LOWER_LAYER_PATTERNS:
  readonly [RegExp, L8RegimeInputViolationCode, string][] = [
    [/ignore[_ ]restriction/i,
      L8RegimeInputViolationCode.LOWER_LAYER_RIGHTS_WIDENED,
      'ignores restriction posture'],
    [/widen[_ ]l7[_ ]?rights/i,
      L8RegimeInputViolationCode.LOWER_LAYER_RIGHTS_WIDENED,
      'widens L7 rights locally'],
    [/re[_-]?validate[_ ]claim/i,
      L8RegimeInputViolationCode.LOWER_LAYER_L7_BYPASS,
      'revalidates L7 claim'],
    [/live[_ ]from[_ ]l6/i,
      L8RegimeInputViolationCode.LOWER_LAYER_L6_REVALIDATION,
      'live L6 revalidation'],
    [/repair[_ ]l7[_ ]validation/i,
      L8RegimeInputViolationCode.LOWER_LAYER_L7_BYPASS,
      'silent L7 validation repair'],
    [/downgrade[_ ]contradiction/i,
      L8RegimeInputViolationCode.LOWER_LAYER_CONTRADICTION_DOWNGRADED,
      'silently downgrades contradiction'],
    [/consume[_ ]blocked[_ ]validation/i,
      L8RegimeInputViolationCode.LOWER_LAYER_BLOCKED_CONSUMED,
      'consumes blocked validation emission'],
    [/from[_ ]raw[_ ](feed|websocket|provider)/i,
      L8RegimeInputViolationCode.ADMISSIBILITY_RAW_INPUT_BYPASS,
      'raw ungated ingestion'],
    [/judgment[_ ]as[_ ]input/i,
      L8RegimeInputViolationCode.JUDGMENT_SURFACE_LEAK,
      'consumes judgment surface'],
    [/scenario[_ ]as[_ ]input/i,
      L8RegimeInputViolationCode.JUDGMENT_SURFACE_LEAK,
      'consumes scenario surface'],
    [/cross[_ ]scope[_ ]leak/i,
      L8RegimeInputViolationCode.SCOPE_MISMATCH,
      'cross-scope leakage'],
    [/family[_ ]mismatch/i,
      L8RegimeInputViolationCode.FAMILY_MISMATCH,
      'family mismatch'],
  ];

export function validateLowerLayerConsumption(
  spec: L8LowerLayerConsumptionSpec,
): L8LowerLayerConsumptionReport {
  const issues: L8LowerLayerConsumptionIssue[] = [];
  for (const b of spec.claimedBehaviors) {
    for (const [pattern, code, label] of L8_LOWER_LAYER_PATTERNS) {
      if (pattern.test(b)) {
        issues.push({
          code,
          message: `behavior "${b}" triggers ${label}`,
          details: { componentId: spec.componentId, behavior: b },
        });
      }
    }
  }
  return { valid: issues.length === 0, issues };
}
