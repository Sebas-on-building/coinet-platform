/**
 * Chat verdict projection — maps the governed CoinetJudgmentPromptPackage into
 * the stable `ChatVerdict` DTO sent to the client.
 *
 * Why a DTO (not the raw package): the package carries prompt-engineering
 * internals (allowed_claims, package_id, source_refs) that should not be part
 * of the client API contract. This projection exposes only what the UI needs,
 * and preserves the package's governance invariant:
 *   - UNAVAILABLE  -> no `fields` (the client can never render a fabricated
 *     verdict; the package itself omits `judgment` when not AVAILABLE).
 *
 * Pure: no I/O, no time, no randomness. Never throws, never invents.
 */

import type { CoinetJudgmentPromptPackage } from './judgment-prompt-package.types';
import type { ChatVerdict } from './types';

export function toChatVerdict(pkg: CoinetJudgmentPromptPackage): ChatVerdict {
  const status = pkg.judgment_status;

  // Governance invariant: an UNAVAILABLE package may NEVER surface judgment
  // fields (the client can't render a fabricated verdict). AVAILABLE/DEGRADED
  // may surface fields cautiously, per the package's expression rules — but the
  // builder only populates `judgment` for AVAILABLE today, so DEGRADED naturally
  // yields no fields. This defensive gate guarantees the invariant holds even
  // if a future package change populates `judgment` on an UNAVAILABLE package.
  const j = status === 'UNAVAILABLE' ? undefined : pkg.judgment;

  const fields = j
    ? {
        ...(j.state ? { state: j.state } : {}),
        ...(j.cause ? { cause: j.cause } : {}),
        ...(j.thesis ? { thesis: j.thesis } : {}),
        ...(j.contradiction_summary
          ? { contradiction_summary: j.contradiction_summary }
          : {}),
        ...(j.timing_phase ? { timing_phase: j.timing_phase } : {}),
        ...(j.scenario_summary ? { scenario_summary: j.scenario_summary } : {}),
        ...(j.confidence_band ? { confidence_band: j.confidence_band } : {}),
      }
    : undefined;

  const disclosures = pkg.expression_rules.required_disclosures;

  return {
    status,
    ...(pkg.scope.asset_symbol ? { symbol: pkg.scope.asset_symbol } : {}),
    ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
    ...(disclosures.length > 0 ? { disclosures: [...disclosures] } : {}),
    policyVersion: pkg.policy_version,
  };
}
