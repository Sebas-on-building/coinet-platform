/**
 * L9.5 — Temporal Surface Validator
 *
 * §9.5.3 — Enforces the time-surface lawbook: distinguishing all 11
 * canonical surfaces, rejecting collapse, and ensuring each comparison
 * purpose uses only its legal surfaces.
 */

import {
  L9TemporalReading,
  L9TemporalSurface,
  L9TemporalComparisonPurpose,
  L9_LEGAL_SURFACES_PER_PURPOSE,
  L9_TEMPORAL_SURFACE_KIND,
  L9TemporalSurfaceKind,
  scanL9TimeCollapses,
} from '../contracts/l9-temporal-surfaces';
import { L9TemporalSemanticTier } from '../contracts/l9-temporal-semantics-types';
import {
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
  violation,
} from './l9-temporal-semantic-violation-codes';

export interface L9TemporalSurfaceValidationInput {
  readonly reading: L9TemporalReading;
  /** The comparisons the engine intends to perform on this reading. */
  readonly declared_purposes: readonly L9TemporalComparisonPurpose[];
  /**
   * Surfaces the engine is actually using for each purpose. Keys are
   * purposes, values are the surface used. Used to detect
   * `TS_SURFACE_ILLEGAL_FOR_PURPOSE` (e.g. lead-lag via INGESTED_AT).
   */
  readonly surface_usage?:
    Partial<Record<L9TemporalComparisonPurpose, L9TemporalSurface>>;
}

export interface L9TemporalSurfaceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9TemporalSemanticViolation[];
}

/**
 * §9.5.3 — Run the surface validator.
 */
export function validateL9TemporalSurfaces(
  input: L9TemporalSurfaceValidationInput,
): L9TemporalSurfaceValidationResult {
  const violations: L9TemporalSemanticViolation[] = [];
  const r = input.reading;

  // §9.5.3.3 — as_of is required on every L9 temporal reading
  if (!r.as_of) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.TS_AS_OF_MISSING,
      L9TemporalSemanticTier.TIME_SURFACE,
      'temporal reading missing required as_of',
    ));
  }

  // §9.5.3.3 — collapse scan
  const collapses = scanL9TimeCollapses(r);
  for (const c of collapses) {
    switch (c) {
      case 'TS_OBSERVED_EQUALS_INGESTED_WITHOUT_ANCHOR':
        violations.push(violation(
          L9TemporalSemanticViolationCode
            .TS_OBSERVED_EQUALS_INGESTED_WITHOUT_ANCHOR,
          L9TemporalSemanticTier.TIME_SURFACE,
          'observed_at equals ingested_at without an effective or window anchor',
        ));
        break;
      case 'TS_AS_OF_COLLAPSED_TO_OBSERVED':
        violations.push(violation(
          L9TemporalSemanticViolationCode.TS_AS_OF_COLLAPSED_TO_OBSERVED,
          L9TemporalSemanticTier.TIME_SURFACE,
          'as_of is equal to observed_at without an effective_at',
        ));
        break;
      case 'TS_EFFECTIVE_WITHOUT_AS_OF':
        violations.push(violation(
          L9TemporalSemanticViolationCode.TS_EFFECTIVE_WITHOUT_AS_OF,
          L9TemporalSemanticTier.TIME_SURFACE,
          'effective_at declared without an as_of',
        ));
        break;
      case 'TS_POST_EVENT_HALF_BOUNDED':
        violations.push(violation(
          L9TemporalSemanticViolationCode.TS_POST_EVENT_HALF_BOUNDED,
          L9TemporalSemanticTier.TIME_SURFACE,
          'post_event_window_start/end must be emitted together',
        ));
        break;
    }
  }

  // §9.5.3.4 — surface-for-purpose legality
  const usage = input.surface_usage ?? {};
  for (const purpose of input.declared_purposes) {
    const surface = usage[purpose];
    if (!surface) continue;
    if (!L9_LEGAL_SURFACES_PER_PURPOSE[purpose].includes(surface)) {
      violations.push(violation(
        L9TemporalSemanticViolationCode.TS_SURFACE_ILLEGAL_FOR_PURPOSE,
        L9TemporalSemanticTier.TIME_SURFACE,
        `surface ${surface} is illegal for purpose ${purpose}`,
      ));
    }
    // §9.5.3.5 — disallow using INGESTED_AT for market-time purposes
    const kind = L9_TEMPORAL_SURFACE_KIND[surface];
    if (kind === L9TemporalSurfaceKind.SYSTEM_TIME &&
        (purpose === L9TemporalComparisonPurpose.LEAD_LAG_SPACING ||
         purpose === L9TemporalComparisonPurpose.CHANGE_POINT_BREAK ||
         purpose === L9TemporalComparisonPurpose.DECAY_ELAPSED)) {
      violations.push(violation(
        L9TemporalSemanticViolationCode
          .TS_MARKET_VS_SYSTEM_TIME_CONFUSION,
        L9TemporalSemanticTier.TIME_SURFACE,
        `system-time surface ${surface} used for market-time purpose ${purpose}`,
      ));
    }
  }

  return { ok: violations.length === 0, violations };
}
