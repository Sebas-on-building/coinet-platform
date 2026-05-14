/**
 * L11.2 — Score-Direction Registry (§11.2.15)
 *
 * Asserts that every production family registers exactly one
 * direction class and that the registered direction matches the
 * canonical map declared in `score-direction.ts`. Direction-mixing
 * descriptions are rejected at registration time.
 */

import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
} from '../contracts/score-family';
import {
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  detectL11DirectionMixingDoctrine,
} from '../contracts/score-direction';

export interface L11ScoreDirectionEntry {
  readonly score_family: L11ScoreFamily;
  readonly direction_class: L11ScoreFamilyDirectionClass;
  readonly higher_means: string;
  readonly lower_means: string;
  readonly mixed_direction_description?: string;
  readonly policy_version: string;
}

export const L11_DIRECTION_REGISTRY_ENTRIES: readonly L11ScoreDirectionEntry[] = [
  {
    score_family: L11ScoreFamily.OPPORTUNITY,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.OPPORTUNITY],
    higher_means: 'higher is more constructive opportunity quality',
    lower_means: 'lower is weaker opportunity quality',
    policy_version: 'l11.2.direction.v1',
  },
  {
    score_family: L11ScoreFamily.RISK,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.RISK],
    higher_means: 'higher is more dangerous',
    lower_means: 'lower is less dangerous',
    policy_version: 'l11.2.direction.v1',
  },
  {
    score_family: L11ScoreFamily.TIMING,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.TIMING],
    higher_means: 'higher is more timely',
    lower_means: 'lower is less timely',
    policy_version: 'l11.2.direction.v1',
  },
  {
    score_family: L11ScoreFamily.THESIS_COHERENCE,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.THESIS_COHERENCE],
    higher_means: 'higher is more coherent thesis stack',
    lower_means: 'lower is more conflicted thesis stack',
    policy_version: 'l11.2.direction.v1',
  },
  {
    score_family: L11ScoreFamily.SIGNAL_CONFIDENCE,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.SIGNAL_CONFIDENCE],
    higher_means: 'higher is more reliable signal stack',
    lower_means: 'lower is less reliable signal stack',
    policy_version: 'l11.2.direction.v1',
  },
  {
    score_family: L11ScoreFamily.MARKET_STRUCTURE,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.MARKET_STRUCTURE],
    higher_means: 'higher is structurally healthier',
    lower_means: 'lower is structurally weaker',
    policy_version: 'l11.2.direction.v1',
  },
  {
    score_family: L11ScoreFamily.WHALE_CONVICTION,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.WHALE_CONVICTION],
    higher_means: 'higher is more constructive whale-behavior alignment',
    lower_means: 'lower is weaker whale-behavior alignment',
    policy_version: 'l11.2.direction.v1',
  },
  {
    score_family: L11ScoreFamily.UNLOCK_RISK,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.UNLOCK_RISK],
    higher_means: 'higher is more supply-overhang risk',
    lower_means: 'lower is less supply-overhang risk',
    policy_version: 'l11.2.direction.v1',
  },
];

export interface L11ScoreDirectionRegistryIssue {
  readonly family: L11ScoreFamily | null;
  readonly reason: string;
}

export interface L11ScoreDirectionRegistryReport {
  readonly ok: boolean;
  readonly entries: number;
  readonly issues: readonly L11ScoreDirectionRegistryIssue[];
}

export function buildL11ScoreDirectionRegistryReport(
  entries: readonly L11ScoreDirectionEntry[] = L11_DIRECTION_REGISTRY_ENTRIES,
): L11ScoreDirectionRegistryReport {
  const issues: L11ScoreDirectionRegistryIssue[] = [];
  const seen = new Set<L11ScoreFamily>();

  for (const e of entries) {
    if (seen.has(e.score_family)) {
      issues.push({
        family: e.score_family,
        reason: 'duplicate direction registration',
      });
      continue;
    }
    seen.add(e.score_family);

    const expected = L11_REQUIRED_DIRECTION_BY_FAMILY[e.score_family];
    if (e.direction_class !== expected) {
      issues.push({
        family: e.score_family,
        reason: `direction mismatch: expected ${expected}, got ${e.direction_class}`,
      });
    }
    if (
      e.mixed_direction_description &&
      detectL11DirectionMixingDoctrine(e.mixed_direction_description)
    ) {
      issues.push({
        family: e.score_family,
        reason: 'direction registration declares mixed direction semantics',
      });
    }
  }

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    if (!seen.has(f)) {
      issues.push({
        family: f,
        reason: 'production family missing direction registration',
      });
    }
  }

  return { ok: issues.length === 0, entries: entries.length, issues };
}

export function getL11ScoreDirectionForFamily(
  family: L11ScoreFamily,
): L11ScoreFamilyDirectionClass | null {
  const e = L11_DIRECTION_REGISTRY_ENTRIES.find(x => x.score_family === family);
  return e ? e.direction_class : null;
}
