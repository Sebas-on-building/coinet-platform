/**
 * L11.2 — Score Band-Policy Registry (§11.2.15)
 *
 * One default band policy per production family, all built from the
 * canonical 5-band quintile thresholds. Reserved families ship a
 * policy too (so doctrine remains complete) but their policy is
 * marked reserved and the family registry blocks emission.
 */

import {
  L11ScoreFamily,
  ALL_L11_SCORE_FAMILIES,
  L11_PRODUCTION_SCORE_FAMILIES,
} from '../contracts/score-family';
import {
  L11ScoreBandPolicy,
  L11_DEFAULT_BAND_THRESHOLDS,
  L11_BAND_POLICY_VERSION,
  checkL11BandThresholdIntegrity,
} from '../contracts/score-band-policy';
import {
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11ScoreFamilyDirectionClass,
} from '../contracts/score-direction';

function policyIdFor(family: L11ScoreFamily): string {
  return `l11d.band_policy.${family.toLowerCase()}.v1`;
}

export const L11_BAND_POLICIES: readonly L11ScoreBandPolicy[] =
  ALL_L11_SCORE_FAMILIES.map(family => ({
    band_policy_id: policyIdFor(family),
    score_family: family,
    policy_version: L11_BAND_POLICY_VERSION,
    min_score: 0,
    max_score: 100,
    thresholds: L11_DEFAULT_BAND_THRESHOLDS,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[family],
  }));

export interface L11BandPolicyRegistryIssue {
  readonly family: L11ScoreFamily | null;
  readonly band_policy_id: string | null;
  readonly reason: string;
}

export interface L11BandPolicyRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly issues: readonly L11BandPolicyRegistryIssue[];
}

export function buildL11BandPolicyRegistryReport(
  policies: readonly L11ScoreBandPolicy[] = L11_BAND_POLICIES,
): L11BandPolicyRegistryReport {
  const issues: L11BandPolicyRegistryIssue[] = [];
  const seenIds = new Set<string>();
  const seenFamilies = new Set<L11ScoreFamily>();

  for (const p of policies) {
    if (seenIds.has(p.band_policy_id)) {
      issues.push({
        family: p.score_family,
        band_policy_id: p.band_policy_id,
        reason: 'duplicate band policy id',
      });
      continue;
    }
    seenIds.add(p.band_policy_id);

    if (seenFamilies.has(p.score_family)) {
      issues.push({
        family: p.score_family,
        band_policy_id: p.band_policy_id,
        reason: 'duplicate band policy for family',
      });
      continue;
    }
    seenFamilies.add(p.score_family);

    if (p.min_score !== 0 || p.max_score !== 100) {
      issues.push({
        family: p.score_family,
        band_policy_id: p.band_policy_id,
        reason: 'band policy must cover [0, 100]',
      });
    }

    const integrity = checkL11BandThresholdIntegrity(p.thresholds);
    if (!integrity.ok) {
      issues.push({
        family: p.score_family,
        band_policy_id: p.band_policy_id,
        reason: `threshold integrity failure: ${integrity.reason}`,
      });
    }

    const expectedDirection = L11_REQUIRED_DIRECTION_BY_FAMILY[p.score_family];
    if (p.direction_class !== expectedDirection) {
      issues.push({
        family: p.score_family,
        band_policy_id: p.band_policy_id,
        reason: `direction mismatch: expected ${expectedDirection}, got ${p.direction_class}`,
      });
    }

    if (!p.policy_version) {
      issues.push({
        family: p.score_family,
        band_policy_id: p.band_policy_id,
        reason: 'missing policy_version',
      });
    }
  }

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    if (!seenFamilies.has(f)) {
      issues.push({
        family: f,
        band_policy_id: null,
        reason: 'production family missing band policy',
      });
    }
  }

  return { ok: issues.length === 0, count: policies.length, issues };
}

export function getL11BandPolicyForFamily(
  family: L11ScoreFamily,
): L11ScoreBandPolicy | null {
  return L11_BAND_POLICIES.find(p => p.score_family === family) ?? null;
}

export function getL11BandPolicyDirection(
  family: L11ScoreFamily,
): L11ScoreFamilyDirectionClass | null {
  const p = getL11BandPolicyForFamily(family);
  return p ? p.direction_class : null;
}
