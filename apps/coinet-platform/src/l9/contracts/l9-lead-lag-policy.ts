/**
 * L9.5 — Lead-Lag Policy
 *
 * §9.5.5 — The semantic meaning of lead-lag. This is layered on top of
 * the L9.3 raw-spacing banding (`L9LagClass`), which only bands raw ms.
 * L9.5 defines the *meaning* of a lag within a family: whether it is an
 * immediate confirmation, a late entrant, too late for early proof, or
 * semantically void.
 *
 * Lead-lag is NOT causality (§9.5.5.3 / INV-9.1-E).
 */

import { L9SequenceFamily } from './sequence-family';
import {
  L9LagContradictionPosture,
} from './lead-lag-relation';

/**
 * §9.5.5.4 — Canonical semantic lag classes. These live one abstraction
 * above the raw-duration `L9LagClass` bands. An ordered-signal resolver
 * uses these to decide whether a lag still supports early structure,
 * only supports lateness/crowding, or is semantically useless.
 */
export enum L9SemanticLagClass {
  IMMEDIATE = 'IMMEDIATE',
  SHORT_LAG = 'SHORT_LAG',
  MEDIUM_LAG = 'MEDIUM_LAG',
  LONG_LAG = 'LONG_LAG',
  LATE_CONFIRMATION = 'LATE_CONFIRMATION',
  TOO_LATE_FOR_EARLY_PROOF = 'TOO_LATE_FOR_EARLY_PROOF',
  UNRESOLVED_LAG = 'UNRESOLVED_LAG',
}

export const ALL_L9_SEMANTIC_LAG_CLASSES: readonly L9SemanticLagClass[] =
  Object.values(L9SemanticLagClass);

/**
 * §9.5.5.5 — Quality posture. Summarizes whether the lead-lag relation
 * is structurally useful, narrowed, or void.
 */
export enum L9LeadLagQualityClass {
  STRUCTURALLY_MEANINGFUL = 'STRUCTURALLY_MEANINGFUL',
  WEAK_BUT_USABLE = 'WEAK_BUT_USABLE',
  NARROWED_BY_CONTRADICTION = 'NARROWED_BY_CONTRADICTION',
  NARROWED_BY_DECAY = 'NARROWED_BY_DECAY',
  SEMANTICALLY_VOID = 'SEMANTICALLY_VOID',
  BLOCKED = 'BLOCKED',
}

export const ALL_L9_LEAD_LAG_QUALITY_CLASSES:
  readonly L9LeadLagQualityClass[] =
    Object.values(L9LeadLagQualityClass);

/**
 * §9.5.5.2 — Per-family admissibility thresholds. Any lag outside
 * `max_admissible_ms` is `UNRESOLVED_LAG` / `SEMANTICALLY_VOID`; any
 * below `immediate_ceiling_ms` is `IMMEDIATE`. Same-family templates
 * may tune these values by reference but not inline their own.
 */
export interface L9LeadLagAdmissibility {
  readonly family: L9SequenceFamily;
  readonly immediate_ceiling_ms: number;
  readonly short_ceiling_ms: number;
  readonly medium_ceiling_ms: number;
  readonly long_ceiling_ms: number;
  readonly late_confirmation_ceiling_ms: number;
  readonly too_late_ceiling_ms: number;
  readonly max_admissible_ms: number;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * §9.5.5.2 — Frozen per-family admissibility table. Engines must look
 * up thresholds here, never hand-code ms values.
 */
export const L9_LEAD_LAG_ADMISSIBILITY:
  readonly L9LeadLagAdmissibility[] = [
    {
      family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
      immediate_ceiling_ms: 5 * MIN,
      short_ceiling_ms: HOUR,
      medium_ceiling_ms: 12 * HOUR,
      long_ceiling_ms: 3 * DAY,
      late_confirmation_ceiling_ms: 7 * DAY,
      too_late_ceiling_ms: 14 * DAY,
      max_admissible_ms: 30 * DAY,
    },
    {
      family: L9SequenceFamily.NARRATIVE_LED,
      immediate_ceiling_ms: 2 * MIN,
      short_ceiling_ms: 30 * MIN,
      medium_ceiling_ms: 6 * HOUR,
      long_ceiling_ms: DAY,
      late_confirmation_ceiling_ms: 3 * DAY,
      too_late_ceiling_ms: 7 * DAY,
      max_admissible_ms: 14 * DAY,
    },
    {
      family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
      immediate_ceiling_ms: 30_000,
      short_ceiling_ms: 15 * MIN,
      medium_ceiling_ms: HOUR,
      long_ceiling_ms: 6 * HOUR,
      late_confirmation_ceiling_ms: 24 * HOUR,
      too_late_ceiling_ms: 3 * DAY,
      max_admissible_ms: 7 * DAY,
    },
    {
      family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
      immediate_ceiling_ms: 5 * MIN,
      short_ceiling_ms: HOUR,
      medium_ceiling_ms: 6 * HOUR,
      long_ceiling_ms: DAY,
      late_confirmation_ceiling_ms: 3 * DAY,
      too_late_ceiling_ms: 7 * DAY,
      max_admissible_ms: 14 * DAY,
    },
    {
      family: L9SequenceFamily.ECOSYSTEM_ROTATION,
      immediate_ceiling_ms: 10 * MIN,
      short_ceiling_ms: 2 * HOUR,
      medium_ceiling_ms: 12 * HOUR,
      long_ceiling_ms: 2 * DAY,
      late_confirmation_ceiling_ms: 5 * DAY,
      too_late_ceiling_ms: 10 * DAY,
      max_admissible_ms: 21 * DAY,
    },
    {
      family: L9SequenceFamily.SHOCK_AND_RECOVERY,
      immediate_ceiling_ms: MIN,
      short_ceiling_ms: 15 * MIN,
      medium_ceiling_ms: HOUR,
      long_ceiling_ms: 6 * HOUR,
      late_confirmation_ceiling_ms: DAY,
      too_late_ceiling_ms: 3 * DAY,
      max_admissible_ms: 14 * DAY,
    },
  ];

/** §9.5.5.2 — Look up admissibility thresholds for a family. */
export function getL9LeadLagAdmissibility(
  family: L9SequenceFamily,
): L9LeadLagAdmissibility | undefined {
  return L9_LEAD_LAG_ADMISSIBILITY.find(a => a.family === family);
}

/**
 * §9.5.5.4 — Classify a raw lag in ms into a semantic lag class for the
 * given family. Negative or NaN spacings classify as `UNRESOLVED_LAG`.
 */
export function classifyL9SemanticLag(
  family: L9SequenceFamily,
  lag_ms: number,
): L9SemanticLagClass {
  if (!Number.isFinite(lag_ms) || lag_ms < 0) {
    return L9SemanticLagClass.UNRESOLVED_LAG;
  }
  const a = getL9LeadLagAdmissibility(family);
  if (!a) return L9SemanticLagClass.UNRESOLVED_LAG;
  if (lag_ms <= a.immediate_ceiling_ms) return L9SemanticLagClass.IMMEDIATE;
  if (lag_ms <= a.short_ceiling_ms) return L9SemanticLagClass.SHORT_LAG;
  if (lag_ms <= a.medium_ceiling_ms) return L9SemanticLagClass.MEDIUM_LAG;
  if (lag_ms <= a.long_ceiling_ms) return L9SemanticLagClass.LONG_LAG;
  if (lag_ms <= a.late_confirmation_ceiling_ms) {
    return L9SemanticLagClass.LATE_CONFIRMATION;
  }
  if (lag_ms <= a.too_late_ceiling_ms) {
    return L9SemanticLagClass.TOO_LATE_FOR_EARLY_PROOF;
  }
  return L9SemanticLagClass.UNRESOLVED_LAG;
}

/**
 * §9.5.5.7 — "Early vs late" law. Returns true when the lag still
 * supports early-structure claims; returns false when the lag only
 * confirms lateness or crowding.
 */
export function l9LagSupportsEarlyStructure(
  cls: L9SemanticLagClass,
): boolean {
  return cls === L9SemanticLagClass.IMMEDIATE ||
         cls === L9SemanticLagClass.SHORT_LAG ||
         cls === L9SemanticLagClass.MEDIUM_LAG ||
         cls === L9SemanticLagClass.LONG_LAG;
}

/**
 * §9.5.5.7 — A lag that only supports lateness or crowding (or is
 * semantically void).
 */
export function l9LagSupportsOnlyLateness(
  cls: L9SemanticLagClass,
): boolean {
  return cls === L9SemanticLagClass.LATE_CONFIRMATION ||
         cls === L9SemanticLagClass.TOO_LATE_FOR_EARLY_PROOF;
}

/**
 * §9.5.5.2 — Is the spacing inside the admissible window for the family?
 * This is the pure admissibility check; quality posture is computed
 * separately by `deriveL9LeadLagQuality`.
 */
export function isL9LagAdmissible(
  family: L9SequenceFamily,
  lag_ms: number,
): boolean {
  if (!Number.isFinite(lag_ms) || lag_ms < 0) return false;
  const a = getL9LeadLagAdmissibility(family);
  if (!a) return false;
  return lag_ms <= a.max_admissible_ms;
}

/**
 * §9.5.5.6 — Lead-lag quality posture. Combines the raw semantic lag
 * class with contradiction posture and decay adjustment to produce one
 * legal quality posture.
 */
export function deriveL9LeadLagQuality(input: {
  readonly family: L9SequenceFamily;
  readonly lag_ms: number;
  readonly contradiction_posture: L9LagContradictionPosture;
  readonly decay_adjustment: number; // 0..1 — higher = more decayed
  readonly scope_aligned: boolean;
  readonly lineage_complete: boolean;
}): {
  readonly semantic_lag_class: L9SemanticLagClass;
  readonly quality_class: L9LeadLagQualityClass;
  readonly narrowing_reasons: readonly string[];
} {
  const reasons: string[] = [];
  const semantic = classifyL9SemanticLag(input.family, input.lag_ms);
  let quality: L9LeadLagQualityClass;

  if (!input.scope_aligned) {
    reasons.push('SCOPE_MISMATCH');
    return {
      semantic_lag_class: semantic,
      quality_class: L9LeadLagQualityClass.BLOCKED,
      narrowing_reasons: reasons,
    };
  }
  if (!input.lineage_complete) {
    reasons.push('LINEAGE_INCOMPLETE');
    return {
      semantic_lag_class: semantic,
      quality_class: L9LeadLagQualityClass.BLOCKED,
      narrowing_reasons: reasons,
    };
  }
  if (!isL9LagAdmissible(input.family, input.lag_ms)) {
    reasons.push('LAG_OUTSIDE_ADMISSIBLE_WINDOW');
    return {
      semantic_lag_class: L9SemanticLagClass.UNRESOLVED_LAG,
      quality_class: L9LeadLagQualityClass.SEMANTICALLY_VOID,
      narrowing_reasons: reasons,
    };
  }
  if (input.contradiction_posture === L9LagContradictionPosture.DECISIVE) {
    reasons.push('DECISIVE_CONTRADICTION_VOIDS_RELATION');
    quality = L9LeadLagQualityClass.SEMANTICALLY_VOID;
  } else if (input.contradiction_posture ===
             L9LagContradictionPosture.MATERIAL) {
    reasons.push('MATERIAL_CONTRADICTION');
    quality = L9LeadLagQualityClass.NARROWED_BY_CONTRADICTION;
  } else if (input.decay_adjustment >= 0.7) {
    reasons.push('HIGH_DECAY_ADJUSTMENT');
    quality = L9LeadLagQualityClass.NARROWED_BY_DECAY;
  } else if (semantic === L9SemanticLagClass.TOO_LATE_FOR_EARLY_PROOF) {
    reasons.push('LAG_TOO_LATE_FOR_EARLY_PROOF');
    quality = L9LeadLagQualityClass.WEAK_BUT_USABLE;
  } else if (semantic === L9SemanticLagClass.LATE_CONFIRMATION) {
    reasons.push('LATE_CONFIRMATION');
    quality = L9LeadLagQualityClass.WEAK_BUT_USABLE;
  } else if (input.contradiction_posture === L9LagContradictionPosture.MILD) {
    reasons.push('MILD_CONTRADICTION');
    quality = L9LeadLagQualityClass.WEAK_BUT_USABLE;
  } else if (input.decay_adjustment >= 0.3) {
    reasons.push('MODERATE_DECAY_ADJUSTMENT');
    quality = L9LeadLagQualityClass.WEAK_BUT_USABLE;
  } else {
    quality = L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL;
  }

  return {
    semantic_lag_class: semantic,
    quality_class: quality,
    narrowing_reasons: reasons,
  };
}
