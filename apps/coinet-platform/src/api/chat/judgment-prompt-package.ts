/**
 * BTAR-004 — CoinetJudgmentPromptPackage Builder + Renderer + Invariant Check
 *
 * Replaces the fragile ASCII judgment-to-AI bridge with a typed package and a
 * deterministic text renderer. The chat service builds a package, the renderer
 * emits a deterministic plain-text block, and that block becomes the AI
 * prompt context for structured judgment.
 *
 * Authority:
 *   Plan 2.1 §2.1 first principle
 *   Plan 2.2 §7.2 (P2-S09 new file class)
 *   BTAR-004 §§9–14
 *   FRP-001 (this is the new authoritative chat bridge for structured judgment)
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 imports.
 *   - No AI output safety gate (BTAR-005).
 *   - No I/O, no time, no randomness — all functions are pure.
 *
 * Honesty pin (BTAR-004 §1.1; FRP-001 §8):
 *   The LLM still receives text. The text is deterministically rendered from
 *   the typed package. The package is the authority for what the AI sees.
 *
 * This is a bounded live-path trust modification, not a chat service rewrite.
 * This is a prompt bridge replacement, not a new judgment engine and not a
 * new AI service.
 */

import type {
  BuildCoinetJudgmentPromptPackageInput,
  CoinetJudgmentPromptPackage,
  CoinetJudgmentPromptPackageDegradation,
  CoinetJudgmentPromptPackageExpressionRules,
  CoinetJudgmentPromptPackageJudgment,
  CoinetJudgmentPromptPackageScope,
} from './judgment-prompt-package.types';
import type { JudgmentAvailabilityResult } from './judgment-availability.types';

const POLICY_VERSION = 'coinet-judgment-prompt-package.v1' as const;

// ──────────────────────────────────────────────────────────────────────────
// Expression rule presets (Plan 2.1 §3 truth classes → §11 in BTAR-004)
// ──────────────────────────────────────────────────────────────────────────

export function buildAvailableExpressionRules(): CoinetJudgmentPromptPackageExpressionRules {
  return {
    allowed_claims: [
      'You may explain the structured Coinet judgment provided in this package.',
      'You may state the current thesis, state, cause, contradiction, timing, scenario, and confidence band if present in this package.',
      'You may explain how the judgment was derived using only fields shown in this package.',
    ],
    forbidden_claims: [
      'Do not present financial advice.',
      'Do not guarantee outcomes.',
      'Do not invent evidence or numbers outside this package.',
      'Do not claim certainty beyond the confidence band shown in this package.',
    ],
    required_disclosures: [],
  };
}

export function buildDegradedExpressionRules(
  reasons: string[],
): CoinetJudgmentPromptPackageExpressionRules {
  return {
    allowed_claims: [
      'You may explain the available structured Coinet judgment cautiously.',
      'You may describe the limitations and missing components disclosed in this package.',
      'You may state that confidence is capped or partial when this package indicates so.',
    ],
    forbidden_claims: [
      'Do not present the read as complete.',
      'Do not overstate confidence.',
      'Do not hide degraded or missing components.',
      'Do not invent evidence to fill gaps.',
    ],
    required_disclosures: [
      'Disclose that the structured Coinet judgment is degraded.',
      ...(reasons.length > 0
        ? [`Disclose the degradation reason(s): ${reasons.join(', ')}.`]
        : []),
    ],
  };
}

export function buildUnavailableExpressionRules(): CoinetJudgmentPromptPackageExpressionRules {
  return {
    allowed_claims: [
      'You may explain that a structured Coinet judgment is not available for this request.',
      'You may provide general crypto context only if you clearly separate it from Coinet structured judgment.',
    ],
    forbidden_claims: [
      'Do not claim Coinet has a structured thesis for this request.',
      'Do not claim Coinet has structured confidence for this request.',
      'Do not claim Coinet has a structured contradiction or scenario for this request.',
      'Do not claim Coinet has a structured timing read for this request.',
      'Do not state a Coinet judgment as if produceJudgment succeeded.',
    ],
    required_disclosures: [
      'Disclose that structured Coinet judgment is unavailable.',
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Package builder
// ──────────────────────────────────────────────────────────────────────────

export function buildCoinetJudgmentPromptPackage(
  input: BuildCoinetJudgmentPromptPackageInput,
): CoinetJudgmentPromptPackage {
  const availability = input.availability;
  const scope = resolveScope(input.scope);
  const sourceRefs = input.source_refs ?? [];

  const status = availability.state;

  const degradation: CoinetJudgmentPromptPackageDegradation = {
    reasons: [...availability.reasons],
    failed_components: [...availability.failedComponents],
    degraded_components: [...availability.degradedComponents],
    disclosure_required: availability.userDisclosureRequired,
  };

  let judgmentProjection: CoinetJudgmentPromptPackageJudgment | undefined;
  let expressionRules: CoinetJudgmentPromptPackageExpressionRules;

  if (status === 'AVAILABLE') {
    judgmentProjection = projectJudgmentFields(input.judgment);
    expressionRules = buildAvailableExpressionRules();
  } else if (status === 'DEGRADED') {
    judgmentProjection = projectJudgmentFields(input.judgment);
    expressionRules = buildDegradedExpressionRules(availability.reasons);
  } else {
    // UNAVAILABLE — invariant: no judgment fields may be present.
    judgmentProjection = undefined;
    expressionRules = buildUnavailableExpressionRules();
  }

  const packageId =
    input.package_id ?? buildDeterministicPackageId(status, scope);

  const pkg: CoinetJudgmentPromptPackage = {
    package_id: packageId,
    policy_version: POLICY_VERSION,
    judgment_status: status,
    scope,
    ...(judgmentProjection !== undefined ? { judgment: judgmentProjection } : {}),
    degradation,
    expression_rules: expressionRules,
    source_refs: [...sourceRefs],
  };

  // Self-check invariants before returning.
  assertCoinetJudgmentPromptPackageInvariants(pkg);
  return pkg;
}

// ──────────────────────────────────────────────────────────────────────────
// Invariant assertion (Plan 2.1 §4 availability law; BTAR-004 §10)
// ──────────────────────────────────────────────────────────────────────────

export function assertCoinetJudgmentPromptPackageInvariants(
  pkg: CoinetJudgmentPromptPackage,
): void {
  // Invariant 1 — policy version always present.
  if (pkg.policy_version !== POLICY_VERSION) {
    throw new Error(
      `CoinetJudgmentPromptPackage invariant 1 violated: policy_version must be '${POLICY_VERSION}', got '${pkg.policy_version}'.`,
    );
  }

  // Invariant 2 — UNAVAILABLE cannot contain fake judgment.
  if (pkg.judgment_status === 'UNAVAILABLE') {
    if (pkg.judgment !== undefined && hasAnyJudgmentField(pkg.judgment)) {
      throw new Error(
        'CoinetJudgmentPromptPackage invariant 2 violated: UNAVAILABLE package must not contain judgment fields.',
      );
    }
    const forbidden = pkg.expression_rules.forbidden_claims.join(' ');
    if (
      !/structured thesis/i.test(forbidden) ||
      !/structured confidence/i.test(forbidden)
    ) {
      throw new Error(
        'CoinetJudgmentPromptPackage invariant 2 violated: UNAVAILABLE package must forbid governed thesis/confidence claims.',
      );
    }
    const disclosures = pkg.expression_rules.required_disclosures.join(' ');
    if (!/structured coinet judgment is unavailable/i.test(disclosures)) {
      throw new Error(
        'CoinetJudgmentPromptPackage invariant 2 violated: UNAVAILABLE package must require the unavailable disclosure.',
      );
    }
  }

  // Invariant 3 — DEGRADED must disclose limitations.
  if (pkg.judgment_status === 'DEGRADED') {
    if (!pkg.degradation.disclosure_required) {
      throw new Error(
        'CoinetJudgmentPromptPackage invariant 3 violated: DEGRADED package must have degradation.disclosure_required = true.',
      );
    }
    if (pkg.expression_rules.required_disclosures.length === 0) {
      throw new Error(
        'CoinetJudgmentPromptPackage invariant 3 violated: DEGRADED package must include at least one required disclosure.',
      );
    }
    const forbidden = pkg.expression_rules.forbidden_claims.join(' ');
    if (!/overstate confidence/i.test(forbidden)) {
      throw new Error(
        'CoinetJudgmentPromptPackage invariant 3 violated: DEGRADED package must forbid overstating confidence.',
      );
    }
  }

  // Invariant 4 — AVAILABLE allowance / boundary.
  if (pkg.judgment_status === 'AVAILABLE') {
    // AVAILABLE may include any judgment fields. No additional constraint
    // beyond invariant 1 and renderer determinism — the burden of "do not
    // invent" is enforced by the projector below + the AVAILABLE expression
    // rules' "Do not invent evidence ..." forbidden_claim.
  }

  // Invariant 5 — deterministic policy version + non-null arrays.
  if (
    !Array.isArray(pkg.degradation.reasons) ||
    !Array.isArray(pkg.degradation.failed_components) ||
    !Array.isArray(pkg.degradation.degraded_components) ||
    !Array.isArray(pkg.expression_rules.allowed_claims) ||
    !Array.isArray(pkg.expression_rules.forbidden_claims) ||
    !Array.isArray(pkg.expression_rules.required_disclosures) ||
    !Array.isArray(pkg.source_refs)
  ) {
    throw new Error(
      'CoinetJudgmentPromptPackage invariant 5 violated: all list fields must be arrays.',
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Renderer — deterministic text for AI prompt context (BTAR-004 §12 / §14)
// ──────────────────────────────────────────────────────────────────────────

export function renderCoinetJudgmentPromptPackageForAI(
  pkg: CoinetJudgmentPromptPackage,
): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('STRUCTURED COINET JUDGMENT PACKAGE');
  lines.push(`Policy Version: ${pkg.policy_version}`);
  lines.push(`Judgment Status: ${pkg.judgment_status}`);
  lines.push(`Scope: ${renderScope(pkg.scope)}`);

  if (pkg.judgment !== undefined && hasAnyJudgmentField(pkg.judgment)) {
    lines.push('Judgment:');
    if (pkg.judgment.state) lines.push(`  State: ${pkg.judgment.state}`);
    if (pkg.judgment.thesis) lines.push(`  Thesis: ${pkg.judgment.thesis}`);
    if (pkg.judgment.cause) lines.push(`  Cause: ${pkg.judgment.cause}`);
    if (pkg.judgment.contradiction_summary)
      lines.push(`  Contradiction: ${pkg.judgment.contradiction_summary}`);
    if (pkg.judgment.timing_phase)
      lines.push(`  Timing: ${pkg.judgment.timing_phase}`);
    if (pkg.judgment.scenario_summary)
      lines.push(`  Scenario: ${pkg.judgment.scenario_summary}`);
    if (pkg.judgment.confidence_band)
      lines.push(`  Confidence: ${pkg.judgment.confidence_band}`);
  } else if (pkg.judgment_status === 'UNAVAILABLE') {
    lines.push('Judgment:');
    lines.push('  (No governed judgment fields are available.)');
  }

  if (
    pkg.degradation.reasons.length > 0 ||
    pkg.degradation.failed_components.length > 0 ||
    pkg.degradation.degraded_components.length > 0
  ) {
    lines.push('Degradation:');
    if (pkg.degradation.reasons.length > 0)
      lines.push(`  Reasons: ${pkg.degradation.reasons.join(', ')}`);
    if (pkg.degradation.failed_components.length > 0)
      lines.push(
        `  Failed Components: ${pkg.degradation.failed_components.join(', ')}`,
      );
    if (pkg.degradation.degraded_components.length > 0)
      lines.push(
        `  Degraded Components: ${pkg.degradation.degraded_components.join(', ')}`,
      );
    lines.push(
      `  Disclosure Required: ${pkg.degradation.disclosure_required ? 'true' : 'false'}`,
    );
  }

  lines.push('Allowed Claims:');
  for (const c of pkg.expression_rules.allowed_claims) {
    lines.push(`  - ${c}`);
  }
  lines.push('Forbidden Claims:');
  for (const c of pkg.expression_rules.forbidden_claims) {
    lines.push(`  - ${c}`);
  }
  if (pkg.expression_rules.required_disclosures.length > 0) {
    lines.push('Required Disclosures:');
    for (const d of pkg.expression_rules.required_disclosures) {
      lines.push(`  - ${d}`);
    }
  }
  if (pkg.source_refs.length > 0) {
    lines.push('Source References:');
    for (const s of pkg.source_refs) {
      lines.push(`  - ${s}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────

function resolveScope(
  scope: Partial<CoinetJudgmentPromptPackageScope> | undefined,
): CoinetJudgmentPromptPackageScope {
  if (!scope) {
    return { kind: 'UNKNOWN' };
  }
  const kind = scope.kind ?? 'UNKNOWN';
  const out: CoinetJudgmentPromptPackageScope = { kind };
  if (scope.asset_symbol !== undefined) out.asset_symbol = scope.asset_symbol;
  if (scope.asset_name !== undefined) out.asset_name = scope.asset_name;
  if (scope.market_context_ref !== undefined)
    out.market_context_ref = scope.market_context_ref;
  return out;
}

function renderScope(scope: CoinetJudgmentPromptPackageScope): string {
  if (scope.kind === 'ASSET') {
    const sym = scope.asset_symbol ?? 'UNKNOWN';
    return scope.asset_name ? `ASSET / ${sym} (${scope.asset_name})` : `ASSET / ${sym}`;
  }
  if (scope.kind === 'MARKET') {
    return scope.market_context_ref ? `MARKET / ${scope.market_context_ref}` : 'MARKET';
  }
  return 'UNKNOWN';
}

function buildDeterministicPackageId(
  status: string,
  scope: CoinetJudgmentPromptPackageScope,
): string {
  const statusSlug = status.toLowerCase();
  const scopeSlug =
    scope.kind === 'ASSET'
      ? `asset_${(scope.asset_symbol ?? 'unknown').toLowerCase()}`
      : scope.kind === 'MARKET'
      ? 'market'
      : 'unknown';
  return `pkg_chat_${statusSlug}_${scopeSlug}_v1`;
}

/**
 * Safely project judgment fields from an unknown judgment object. Never throws.
 * Never invents. Missing fields remain undefined.
 */
function projectJudgmentFields(
  judgment: unknown,
): CoinetJudgmentPromptPackageJudgment | undefined {
  if (judgment === undefined || judgment === null || typeof judgment !== 'object') {
    return undefined;
  }
  const j = judgment as Record<string, unknown>;
  const out: CoinetJudgmentPromptPackageJudgment = {};

  const statePrimary = safeStringPath(j, ['state', 'primary']);
  if (statePrimary) out.state = statePrimary;

  const thesisHypothesis = safeStringPath(j, ['thesis', 'primary', 'hypothesis']);
  if (thesisHypothesis) out.thesis = thesisHypothesis;

  const causeSummary = deriveCauseSummary(j);
  if (causeSummary) out.cause = causeSummary;

  const contradictionItems = (j.contradictions as { items?: unknown[] } | undefined)?.items;
  if (Array.isArray(contradictionItems) && contradictionItems.length > 0) {
    out.contradiction_summary = `${contradictionItems.length} contradiction(s) present`;
  }

  const timingPhase =
    safeStringPath(j, ['timing', 'phase']) ??
    safeStringPath(j, ['timing', 'current_phase']);
  if (timingPhase) out.timing_phase = timingPhase;

  const scenarioSummary = deriveScenarioSummary(j);
  if (scenarioSummary) out.scenario_summary = scenarioSummary;

  const confidenceOverall = (j.confidence as { overall?: unknown } | undefined)?.overall;
  if (typeof confidenceOverall === 'number') {
    out.confidence_band = describeConfidenceBand(confidenceOverall);
  } else if (typeof confidenceOverall === 'string') {
    out.confidence_band = confidenceOverall;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function safeStringPath(
  obj: Record<string, unknown>,
  path: string[],
): string | undefined {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === undefined || cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  if (typeof cur === 'string' && cur.length > 0) return cur;
  return undefined;
}

/**
 * Derive a single-line cause summary from a JudgmentCause shape
 * ({ dominant_cluster, positive_drivers[], negative_drivers[] }, each driver
 * { family, strength, summary }). Read-only, pure, never invents:
 *   1. driver whose family === dominant_cluster (its summary),
 *   2. else the highest-strength driver's summary,
 *   3. else the dominant_cluster value as a label.
 */
function deriveCauseSummary(j: Record<string, unknown>): string | undefined {
  const cause = j.cause;
  if (cause === undefined || cause === null || typeof cause !== 'object') {
    return undefined;
  }
  const c = cause as Record<string, unknown>;
  const dominant =
    typeof c.dominant_cluster === 'string' && c.dominant_cluster.length > 0
      ? c.dominant_cluster
      : undefined;

  const drivers: Record<string, unknown>[] = [];
  for (const key of ['positive_drivers', 'negative_drivers']) {
    const arr = c[key];
    if (Array.isArray(arr)) {
      for (const d of arr) {
        if (d && typeof d === 'object') drivers.push(d as Record<string, unknown>);
      }
    }
  }

  const summaryOf = (d: Record<string, unknown>): string | undefined =>
    typeof d.summary === 'string' && d.summary.length > 0 ? d.summary : undefined;

  // 1. driver aligned with the dominant cluster
  if (dominant) {
    for (const d of drivers) {
      if (d.family === dominant) {
        const s = summaryOf(d);
        if (s) return s;
      }
    }
  }

  // 2. highest-strength driver that has a summary
  let best: { strength: number; summary: string } | undefined;
  for (const d of drivers) {
    const s = summaryOf(d);
    if (!s) continue;
    const strength = typeof d.strength === 'number' ? d.strength : -Infinity;
    if (best === undefined || strength > best.strength) {
      best = { strength, summary: s };
    }
  }
  if (best) return best.summary;

  // 3. dominant cluster label fallback
  return dominant;
}

/**
 * Derive a single-line scenario summary from a JudgmentScenario shape
 * ({ base_case, bullish_confirmation, bearish_failure, next_trigger, ... }).
 * base_case is the natural summary; fall back to next_trigger. Never invents.
 */
function deriveScenarioSummary(j: Record<string, unknown>): string | undefined {
  const scenario = j.scenario;
  if (scenario === undefined || scenario === null || typeof scenario !== 'object') {
    return undefined;
  }
  const s = scenario as Record<string, unknown>;
  if (typeof s.base_case === 'string' && s.base_case.length > 0) return s.base_case;
  if (typeof s.next_trigger === 'string' && s.next_trigger.length > 0) {
    return s.next_trigger;
  }
  return undefined;
}

function hasAnyJudgmentField(j: CoinetJudgmentPromptPackageJudgment): boolean {
  return (
    !!j.state ||
    !!j.thesis ||
    !!j.cause ||
    !!j.contradiction_summary ||
    !!j.timing_phase ||
    !!j.scenario_summary ||
    !!j.confidence_band
  );
}

function describeConfidenceBand(overall: number): string {
  if (overall >= 0.75) return `HIGH (${overall.toFixed(2)})`;
  if (overall >= 0.5) return `MODERATE (${overall.toFixed(2)})`;
  if (overall >= 0.25) return `LOW (${overall.toFixed(2)})`;
  return `VERY_LOW (${overall.toFixed(2)})`;
}

// Re-export the availability type for convenience to callers.
export type { JudgmentAvailabilityResult };
