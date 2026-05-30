/**
 * P3-BTAR-001 — Synthetic Episode Validation Helpers
 *
 * Pure validation for SyntheticEpisodeInput objects.
 * No provider imports. No network calls. No env reads (except a tiny denylist probe
 * for forbidden API-key strings inside fixture content, never an env-var read).
 *
 * Authority:
 *   - Plan 3.0 §7–§8 (episode + oracle concept)
 *   - Plan 3.0 §12 (no-API rule)
 *
 * Owner: Phase 3 (P3-BTAR-001).
 */

import type {
  ExpectedJudgmentOracle,
  SyntheticEpisodeInput,
  SyntheticEpisodeSignals,
  SyntheticEpisodeValidationResult,
} from './synthetic-episode.types';

// -----------------------------------------------------------------------------
// Forbidden real-provider keys (spec §20). If any fixture object contains these
// keys at any depth, the fixture is INVALID — synthetic episodes must never
// resemble real provider payloads.
// -----------------------------------------------------------------------------

export const FORBIDDEN_PROVIDER_PAYLOAD_KEYS: ReadonlyArray<string> = [
  'coingecko_id',
  'coinglass_id',
  'nansen_label',
  'arkham_entity',
  'alchemy_response',
  'quicknode_payload',
  'api_key',
  'authorization',
  'bearer',
  'headers',
  'raw_response',
  'provider_payload',
];

// -----------------------------------------------------------------------------
// Required signal-group keys.
// -----------------------------------------------------------------------------

const REQUIRED_SIGNAL_GROUPS: ReadonlyArray<keyof SyntheticEpisodeSignals> = [
  'spot',
  'derivatives',
  'onchain',
  'sentiment',
  'fundamentals',
  'risk',
  'liquidity',
];

// -----------------------------------------------------------------------------
// validateSyntheticEpisode — never throws; returns errors + warnings.
// -----------------------------------------------------------------------------

export function validateSyntheticEpisode(
  episode: SyntheticEpisodeInput,
): SyntheticEpisodeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // -- identity / narrative -------------------------------------------------
  if (!episode.episode_id || episode.episode_id.trim().length === 0) {
    errors.push('episode_id is required');
  }
  if (!episode.title || episode.title.trim().length === 0) {
    errors.push('title is required');
  }
  if (!episode.description || episode.description.trim().length === 0) {
    errors.push('description is required');
  }

  // -- regime ---------------------------------------------------------------
  if (!episode.market_regime) {
    errors.push('market_regime is required');
  }

  // -- signal groups --------------------------------------------------------
  if (!episode.signals || typeof episode.signals !== 'object') {
    errors.push('signals is required');
  } else {
    const signalsAsRecord = episode.signals as unknown as Record<string, unknown>;
    for (const group of REQUIRED_SIGNAL_GROUPS) {
      const value = signalsAsRecord[group];
      if (!value || typeof value !== 'object') {
        errors.push(`signals.${group} is required`);
      }
    }
  }

  // -- expected oracle ------------------------------------------------------
  if (!episode.expected_oracle || typeof episode.expected_oracle !== 'object') {
    errors.push('expected_oracle is required');
  } else {
    const oracleErrors = validateExpectedOracle(episode.expected_oracle);
    errors.push(...oracleErrors);
  }

  // -- forbidden provider payload keys (deep) -------------------------------
  const forbiddenHits = findForbiddenProviderKeys(episode);
  for (const hit of forbiddenHits) {
    errors.push(`forbidden provider payload key found at: ${hit}`);
  }

  // -- tags (errors include "missing tags" per spec §11) --------------------
  if (!Array.isArray(episode.tags)) {
    errors.push('tags is required (array)');
  } else if (episode.tags.length === 0) {
    errors.push('tags is required (non-empty)');
  } else if (episode.tags.length < 2) {
    warnings.push('very low tag count (recommend at least 2)');
  }

  // -- warnings -------------------------------------------------------------
  if (!episode.asset_symbol) {
    warnings.push('asset_symbol is not provided');
  }
  if (!Array.isArray(episode.blind_spots) || episode.blind_spots.length === 0) {
    warnings.push('blind_spots is empty');
  }
  if (
    !Array.isArray(episode.degraded_components) ||
    episode.degraded_components.length === 0
  ) {
    warnings.push('degraded_components is empty');
  }
  if (episode.expected_oracle?.expected_confidence_band === 'VERY_HIGH') {
    warnings.push('expected_confidence_band is VERY_HIGH (rare; double-check intent)');
  }
  if (!episode.signals?.event_context) {
    warnings.push('event_context is not provided');
  }

  return {
    valid: errors.length === 0,
    episode_id: episode.episode_id ?? '',
    errors,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// validateExpectedOracle — returns only error strings (warnings handled above).
// -----------------------------------------------------------------------------

function validateExpectedOracle(oracle: ExpectedJudgmentOracle): string[] {
  const errors: string[] = [];

  if (!oracle.expected_state || oracle.expected_state.trim().length === 0) {
    errors.push('expected_oracle.expected_state is required');
  }
  if (!oracle.expected_cause_family || oracle.expected_cause_family.trim().length === 0) {
    errors.push('expected_oracle.expected_cause_family is required');
  }
  if (!oracle.expected_thesis_direction || oracle.expected_thesis_direction.trim().length === 0) {
    errors.push('expected_oracle.expected_thesis_direction is required');
  }
  if (!oracle.expected_timing_phase) {
    errors.push('expected_oracle.expected_timing_phase is required');
  }
  if (!oracle.expected_scenario_type || oracle.expected_scenario_type.trim().length === 0) {
    errors.push('expected_oracle.expected_scenario_type is required');
  }
  if (!oracle.expected_confidence_band) {
    errors.push('expected_oracle.expected_confidence_band is required');
  }
  if (!Array.isArray(oracle.required_contradictions) || oracle.required_contradictions.length === 0) {
    errors.push('expected_oracle.required_contradictions is required (non-empty array)');
  }
  if (!Array.isArray(oracle.forbidden_claims) || oracle.forbidden_claims.length === 0) {
    errors.push('expected_oracle.forbidden_claims is required (non-empty array)');
  }
  if (
    !Array.isArray(oracle.required_reasoning_notes) ||
    oracle.required_reasoning_notes.length === 0
  ) {
    errors.push('expected_oracle.required_reasoning_notes is required (non-empty array)');
  }

  return errors;
}

// -----------------------------------------------------------------------------
// findForbiddenProviderKeys — deep walk; returns dotted paths of any hits.
// -----------------------------------------------------------------------------

function findForbiddenProviderKeys(
  value: unknown,
  path = 'episode',
  hits: string[] = [],
  seen: WeakSet<object> = new WeakSet(),
): string[] {
  if (value === null || value === undefined) return hits;
  if (typeof value !== 'object') return hits;
  if (seen.has(value as object)) return hits;
  seen.add(value as object);

  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      findForbiddenProviderKeys(item, `${path}[${idx}]`, hits, seen);
    });
    return hits;
  }

  for (const [key, sub] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_PROVIDER_PAYLOAD_KEYS.includes(key)) {
      hits.push(childPath);
    }
    findForbiddenProviderKeys(sub, childPath, hits, seen);
  }

  return hits;
}

// -----------------------------------------------------------------------------
// validateSyntheticEpisodeCorpus — per-episode validation + duplicate-ID detection.
// -----------------------------------------------------------------------------

export function validateSyntheticEpisodeCorpus(
  episodes: SyntheticEpisodeInput[],
): SyntheticEpisodeValidationResult[] {
  const seenIds = new Map<string, number>();
  for (const ep of episodes) {
    const id = ep.episode_id ?? '';
    seenIds.set(id, (seenIds.get(id) ?? 0) + 1);
  }

  return episodes.map((ep) => {
    const result = validateSyntheticEpisode(ep);
    const id = ep.episode_id ?? '';
    const count = seenIds.get(id) ?? 0;
    if (id && count > 1) {
      result.errors.push(`duplicate episode_id in corpus: "${id}" (seen ${count} times)`);
      result.valid = false;
    }
    return result;
  });
}

// -----------------------------------------------------------------------------
// assertSyntheticEpisodeCorpusValid — throws if any episode is invalid.
// -----------------------------------------------------------------------------

export function assertSyntheticEpisodeCorpusValid(
  episodes: SyntheticEpisodeInput[],
): void {
  const results = validateSyntheticEpisodeCorpus(episodes);
  const invalid = results.filter((r) => !r.valid);
  if (invalid.length === 0) return;

  const summary = invalid
    .map((r) => `  - ${r.episode_id || '<missing id>'}: ${r.errors.join('; ')}`)
    .join('\n');
  throw new Error(
    `assertSyntheticEpisodeCorpusValid: ${invalid.length} invalid episode(s):\n${summary}`,
  );
}
