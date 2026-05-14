/**
 * L11.2 — Score Output Class Registry (§11.2.15)
 *
 * Records the eight legal Layer 11 score output surface classes from
 * L11.1 and the score-doctrine requirement that every production
 * family must declare each of them as a required output. Reserved
 * families may declare none.
 */

import {
  L11OutputSurfaceClass,
  ALL_L11_OUTPUT_SURFACE_CLASSES,
} from '../contracts/l11-constitutional-types';
import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
} from '../contracts/score-family';
import {
  L11_SCORE_FAMILY_DEFINITIONS,
  getL11ScoreFamilyDefinition,
} from '../contracts/score-family-catalogue';
import {
  L11ScoreProductionStatus,
} from '../contracts/score-production-status';

export const L11_REQUIRED_OUTPUT_CLASSES: readonly L11OutputSurfaceClass[] = [
  L11OutputSurfaceClass.SCORE_OUTPUT,
  L11OutputSurfaceClass.SCORE_COMPONENT_BREAKDOWN,
  L11OutputSurfaceClass.SCORE_ATTRIBUTION,
  L11OutputSurfaceClass.SCORE_MODIFIER_PROFILE,
  L11OutputSurfaceClass.SCORE_MISSING_DATA_PROFILE,
  L11OutputSurfaceClass.SCORE_CALIBRATION_HOOK,
  L11OutputSurfaceClass.SCORE_DRIFT_HOOK,
  L11OutputSurfaceClass.SCORE_EVIDENCE_READ_SURFACE,
];

export interface L11OutputClassRegistryIssue {
  readonly family: L11ScoreFamily | null;
  readonly reason: string;
}

export interface L11OutputClassRegistryReport {
  readonly ok: boolean;
  readonly checked_families: number;
  readonly recognised_classes: number;
  readonly issues: readonly L11OutputClassRegistryIssue[];
}

export function buildL11OutputClassRegistryReport(): L11OutputClassRegistryReport {
  const issues: L11OutputClassRegistryIssue[] = [];

  if (ALL_L11_OUTPUT_SURFACE_CLASSES.length !== L11_REQUIRED_OUTPUT_CLASSES.length) {
    issues.push({
      family: null,
      reason: `output surface count mismatch: constitutional=${ALL_L11_OUTPUT_SURFACE_CLASSES.length}, doctrine=${L11_REQUIRED_OUTPUT_CLASSES.length}`,
    });
  }
  for (const c of L11_REQUIRED_OUTPUT_CLASSES) {
    if (!ALL_L11_OUTPUT_SURFACE_CLASSES.includes(c)) {
      issues.push({
        family: null,
        reason: `doctrine output class ${c} is not registered as a constitutional output surface`,
      });
    }
  }

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    const def = getL11ScoreFamilyDefinition(f);
    if (!def) {
      issues.push({ family: f, reason: 'production family missing from catalogue' });
      continue;
    }
    for (const required of L11_REQUIRED_OUTPUT_CLASSES) {
      if (!def.required_output_surfaces.includes(required)) {
        issues.push({
          family: f,
          reason: `production family missing required output surface ${required}`,
        });
      }
    }
  }

  for (const def of L11_SCORE_FAMILY_DEFINITIONS) {
    if (
      def.production_status === L11ScoreProductionStatus.RESERVED &&
      def.required_output_surfaces.length > 0
    ) {
      issues.push({
        family: def.score_family,
        reason: 'reserved family declares output surfaces (must declare none)',
      });
    }
  }

  return {
    ok: issues.length === 0,
    checked_families: L11_PRODUCTION_SCORE_FAMILIES.length,
    recognised_classes: L11_REQUIRED_OUTPUT_CLASSES.length,
    issues,
  };
}

export function isL11RegisteredScoreOutputClass(c: L11OutputSurfaceClass): boolean {
  return L11_REQUIRED_OUTPUT_CLASSES.includes(c);
}
