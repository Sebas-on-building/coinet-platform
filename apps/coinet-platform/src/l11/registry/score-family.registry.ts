/**
 * L11.2 — Score-Family Registry (§11.2.15)
 *
 * Authoritative registry of score families and their definitions.
 * Enforces:
 *   - exactly one definition per family
 *   - no duplicate families
 *   - production/reserved status integrity
 *   - production families must declare lower-layer surfaces
 *   - reserved families may not declare lower-layer dependency or
 *     output surfaces (they are doctrine placeholders only)
 */

import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
  L11_RESERVED_SCORE_FAMILIES,
} from '../contracts/score-family';
import {
  L11ScoreFamilyDefinition,
  L11_SCORE_FAMILY_DEFINITIONS,
  getL11ScoreFamilyDefinition,
} from '../contracts/score-family-catalogue';
import {
  L11ScoreProductionStatus,
  statusAllowsCurrentEmission,
  statusForbidsProductionEmission,
} from '../contracts/score-production-status';

export interface L11ScoreFamilyRegistryIssue {
  readonly family: L11ScoreFamily | null;
  readonly reason: string;
}

export interface L11ScoreFamilyRegistryReport {
  readonly ok: boolean;
  readonly definitions_count: number;
  readonly production_families: readonly L11ScoreFamily[];
  readonly reserved_families: readonly L11ScoreFamily[];
  readonly issues: readonly L11ScoreFamilyRegistryIssue[];
}

export function buildL11ScoreFamilyRegistryReport(
  defs: readonly L11ScoreFamilyDefinition[] = L11_SCORE_FAMILY_DEFINITIONS,
): L11ScoreFamilyRegistryReport {
  const issues: L11ScoreFamilyRegistryIssue[] = [];
  const seen = new Set<L11ScoreFamily>();
  const production: L11ScoreFamily[] = [];
  const reserved: L11ScoreFamily[] = [];

  for (const d of defs) {
    if (seen.has(d.score_family)) {
      issues.push({
        family: d.score_family,
        reason: 'duplicate score family registration',
      });
      continue;
    }
    seen.add(d.score_family);

    if (d.production_status === L11ScoreProductionStatus.PRODUCTION_ENABLED) {
      production.push(d.score_family);
      if (d.required_lower_layer_surfaces.length === 0) {
        issues.push({
          family: d.score_family,
          reason: 'production family declares no lower-layer dependency surfaces',
        });
      }
      if (d.required_output_surfaces.length === 0) {
        issues.push({
          family: d.score_family,
          reason: 'production family declares no output surfaces',
        });
      }
      if (d.required_disclosure_requirements.length === 0) {
        issues.push({
          family: d.score_family,
          reason: 'production family declares no required disclosures',
        });
      }
      if (!statusAllowsCurrentEmission(d.production_status)) {
        issues.push({
          family: d.score_family,
          reason: 'production family status does not permit current emission',
        });
      }
    } else if (statusForbidsProductionEmission(d.production_status)) {
      reserved.push(d.score_family);
      if (d.required_lower_layer_surfaces.length > 0) {
        issues.push({
          family: d.score_family,
          reason: 'reserved family must not declare lower-layer dependency surfaces',
        });
      }
      if (d.required_output_surfaces.length > 0) {
        issues.push({
          family: d.score_family,
          reason: 'reserved family must not declare output surfaces',
        });
      }
    }
  }

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    if (!seen.has(f)) {
      issues.push({ family: f, reason: 'expected production family missing from registry' });
    }
  }
  for (const f of L11_RESERVED_SCORE_FAMILIES) {
    if (!seen.has(f)) {
      issues.push({ family: f, reason: 'expected reserved family missing from registry' });
    }
  }

  return {
    ok: issues.length === 0,
    definitions_count: defs.length,
    production_families: production,
    reserved_families: reserved,
    issues,
  };
}

/**
 * §11.2.15.2 — Hard accessor for production families.
 * Returns `null` if the requested family is reserved or unknown.
 */
export function getL11ProductionScoreFamilyDefinition(
  family: L11ScoreFamily,
): L11ScoreFamilyDefinition | null {
  const d = getL11ScoreFamilyDefinition(family);
  if (!d) return null;
  if (d.production_status !== L11ScoreProductionStatus.PRODUCTION_ENABLED) return null;
  return d;
}
