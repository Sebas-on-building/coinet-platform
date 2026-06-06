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
  CoinetJudgmentContradictionItem,
  CoinetJudgmentDriver,
  CoinetJudgmentHorizon,
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
    appendJudgmentDepthLines(lines, pkg.judgment);
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

/**
 * Append the Phase-2 structured-depth lines to the rendered AI prompt. Each
 * block is emitted only when present, in a fixed deterministic order. Keeps the
 * AI prompt and the ChatVerdict card sourced from the same package.
 */
function appendJudgmentDepthLines(
  lines: string[],
  j: CoinetJudgmentPromptPackageJudgment,
): void {
  if (j.state_detail) {
    const parts: string[] = [];
    if (j.state_detail.secondary) parts.push(`secondary ${j.state_detail.secondary}`);
    if (j.state_detail.confidence !== undefined)
      parts.push(`state confidence ${j.state_detail.confidence}`);
    if (parts.length > 0) lines.push(`  State Detail: ${parts.join('; ')}`);
  }

  if (j.cause_detail) {
    if (j.cause_detail.dominant_cluster)
      lines.push(`  Cause Dominant Cluster: ${j.cause_detail.dominant_cluster}`);
    if (j.cause_detail.secondary_cluster)
      lines.push(`  Cause Secondary Cluster: ${j.cause_detail.secondary_cluster}`);
    for (const d of j.cause_detail.drivers ?? []) {
      const strength = d.strength !== undefined ? ` (${d.strength})` : '';
      lines.push(`  Cause Driver [${d.direction}] ${d.family}${strength}: ${d.summary ?? ''}`.trimEnd());
    }
  }

  if (j.thesis_detail) {
    const t = j.thesis_detail;
    const parts: string[] = [];
    if (t.support_score !== undefined) parts.push(`support ${t.support_score}`);
    if (t.contradiction_score !== undefined) parts.push(`contradiction ${t.contradiction_score}`);
    if (t.confidence !== undefined) parts.push(`confidence ${t.confidence}`);
    if (t.clarity !== undefined) parts.push(`clarity ${t.clarity}`);
    if (t.ambiguous !== undefined) parts.push(`ambiguous ${t.ambiguous}`);
    if (parts.length > 0) lines.push(`  Thesis Detail: ${parts.join(', ')}`);
    if (t.secondary) lines.push(`  Secondary Thesis: ${t.secondary}`);
  }

  if (j.contradiction_items && j.contradiction_items.length > 0) {
    lines.push('  Contradictions:');
    for (const c of j.contradiction_items) {
      const resolvable = c.resolvable !== undefined ? ` [${c.resolvable ? 'resolvable' : 'structural'}]` : '';
      const summary = c.summary ? `: ${c.summary}` : '';
      lines.push(`    - ${c.class} (${c.severity})${resolvable}${summary}`);
    }
  }
  if (j.contradiction_load !== undefined)
    lines.push(`  Contradiction Load: ${j.contradiction_load}`);
  if (j.contradiction_structural_warning !== undefined)
    lines.push(`  Structural Warning: ${j.contradiction_structural_warning}`);

  if (j.timing_detail) {
    const t = j.timing_detail;
    const parts: string[] = [];
    if (t.score !== undefined) parts.push(`score ${t.score}`);
    if (t.position !== undefined && t.total !== undefined)
      parts.push(`step ${t.position}/${t.total}`);
    if (t.maturity_warning !== undefined) parts.push(`maturity warning ${t.maturity_warning}`);
    if (parts.length > 0) lines.push(`  Timing Detail: ${parts.join(', ')}`);
    if (t.maturity_note) lines.push(`  Maturity Note: ${t.maturity_note}`);
  }

  if (j.scenario_detail) {
    const s = j.scenario_detail;
    if (s.bullish_confirmation) lines.push(`  Bullish Confirmation: ${s.bullish_confirmation}`);
    if (s.bearish_failure) lines.push(`  Bearish Failure: ${s.bearish_failure}`);
    if (s.next_trigger) lines.push(`  Next Trigger: ${s.next_trigger}`);
    if (s.confidence !== undefined) lines.push(`  Scenario Confidence: ${s.confidence}`);
    for (const h of s.horizons ?? []) {
      const segs: string[] = [];
      if (h.confirmation) segs.push(`confirm: ${h.confirmation}`);
      if (h.failure) segs.push(`fail: ${h.failure}`);
      if (h.trigger) segs.push(`trigger: ${h.trigger}`);
      if (h.invalidation) segs.push(`invalidation: ${h.invalidation}`);
      if (segs.length > 0) lines.push(`  Horizon ${h.horizon}: ${segs.join(' | ')}`);
    }
  }

  if (j.confidence_detail) {
    const c = j.confidence_detail;
    if (c.score !== undefined) lines.push(`  Confidence Score: ${c.score}`);
    if (c.breakdown) {
      const b = c.breakdown;
      const parts: string[] = [];
      if (b.market !== undefined) parts.push(`market ${b.market}`);
      if (b.fundamentals !== undefined) parts.push(`fundamentals ${b.fundamentals}`);
      if (b.onchain !== undefined) parts.push(`onchain ${b.onchain}`);
      if (b.narrative !== undefined) parts.push(`narrative ${b.narrative}`);
      if (parts.length > 0) lines.push(`  Confidence Breakdown: ${parts.join(', ')}`);
    }
    if (c.primary_uncertainty) lines.push(`  Primary Uncertainty: ${c.primary_uncertainty}`);
  }

  if (j.signal_24h) lines.push(`  24h Signal: ${j.signal_24h}`);
  if (j.failure_condition) lines.push(`  Failure Condition: ${j.failure_condition}`);
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

  const contradictionItemsRaw = (j.contradictions as { items?: unknown[] } | undefined)?.items;
  if (Array.isArray(contradictionItemsRaw) && contradictionItemsRaw.length > 0) {
    out.contradiction_summary = `${contradictionItemsRaw.length} contradiction(s) present`;
  }

  const timingPhase =
    safeStringPath(j, ['timing', 'phase']) ??
    safeStringPath(j, ['timing', 'current_phase']);
  if (timingPhase) out.timing_phase = timingPhase;

  const scenarioSummary = deriveScenarioSummary(j);
  if (scenarioSummary) out.scenario_summary = scenarioSummary;

  // confidence.overall is a controlled band string on the real engine output
  // (toConfidenceBand). The numeric path was dead code and has been removed.
  const confidenceOverall = (j.confidence as { overall?: unknown } | undefined)?.overall;
  if (typeof confidenceOverall === 'string' && confidenceOverall.length > 0) {
    out.confidence_band = confidenceOverall;
  }

  // ── Structured depth (Phase 2) — pure projections of existing fields ─────
  const stateDetail = projectStateDetail(j);
  if (stateDetail) out.state_detail = stateDetail;

  const causeDetail = projectCauseDetail(j);
  if (causeDetail) out.cause_detail = causeDetail;

  const thesisDetail = projectThesisDetail(j);
  if (thesisDetail) out.thesis_detail = thesisDetail;

  const contradictionItems = projectContradictionItems(j);
  if (contradictionItems) out.contradiction_items = contradictionItems;
  const contradictionLoad = numberPath(j, ['contradictions', 'load']);
  if (contradictionLoad !== undefined) out.contradiction_load = contradictionLoad;
  const structuralWarning = boolPath(j, ['contradictions', 'structural_warning']);
  if (structuralWarning !== undefined) {
    out.contradiction_structural_warning = structuralWarning;
  }

  const timingDetail = projectTimingDetail(j);
  if (timingDetail) out.timing_detail = timingDetail;

  const scenarioDetail = projectScenarioDetail(j);
  if (scenarioDetail) out.scenario_detail = scenarioDetail;

  const confidenceDetail = projectConfidenceDetail(j);
  if (confidenceDetail) out.confidence_detail = confidenceDetail;

  // ── Derived whitepaper fields (24h signal + failure condition) ──────────
  const signal24h = deriveSignal24h(j);
  if (signal24h) out.signal_24h = signal24h;

  const failureCondition = deriveFailureCondition(j);
  if (failureCondition) out.failure_condition = failureCondition;

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

// ── Phase 2 structured-detail projectors (pure, tolerant of unknown input) ──

function asObject(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;
}

function strOrUndef(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function numberPath(obj: Record<string, unknown>, path: string[]): number | undefined {
  let cur: unknown = obj;
  for (const key of path) {
    const o = asObject(cur);
    if (!o) return undefined;
    cur = o[key];
  }
  return numOrUndef(cur);
}

function boolPath(obj: Record<string, unknown>, path: string[]): boolean | undefined {
  let cur: unknown = obj;
  for (const key of path) {
    const o = asObject(cur);
    if (!o) return undefined;
    cur = o[key];
  }
  return typeof cur === 'boolean' ? cur : undefined;
}

function projectStateDetail(
  j: Record<string, unknown>,
): CoinetJudgmentPromptPackageJudgment['state_detail'] {
  const state = asObject(j.state);
  if (!state) return undefined;
  const out: NonNullable<CoinetJudgmentPromptPackageJudgment['state_detail']> = {};
  const secondary = strOrUndef(state.secondary);
  if (secondary) out.secondary = secondary;
  const confidence = numOrUndef(state.confidence);
  if (confidence !== undefined) out.confidence = confidence;
  return Object.keys(out).length > 0 ? out : undefined;
}

function projectCauseDetail(
  j: Record<string, unknown>,
): CoinetJudgmentPromptPackageJudgment['cause_detail'] {
  const cause = asObject(j.cause);
  if (!cause) return undefined;
  const out: NonNullable<CoinetJudgmentPromptPackageJudgment['cause_detail']> = {};
  const dominant = strOrUndef(cause.dominant_cluster);
  if (dominant) out.dominant_cluster = dominant;
  const secondary = strOrUndef(cause.secondary_cluster);
  if (secondary) out.secondary_cluster = secondary;

  const drivers: CoinetJudgmentDriver[] = [];
  const groups: Array<[string, 'positive' | 'negative']> = [
    ['positive_drivers', 'positive'],
    ['negative_drivers', 'negative'],
  ];
  for (const [key, direction] of groups) {
    const arr = cause[key];
    if (!Array.isArray(arr)) continue;
    for (const d of arr) {
      const o = asObject(d);
      const family = o ? strOrUndef(o.family) : undefined;
      if (!o || !family) continue;
      const driver: CoinetJudgmentDriver = { family, direction };
      const strength = numOrUndef(o.strength);
      if (strength !== undefined) driver.strength = strength;
      const summary = strOrUndef(o.summary);
      if (summary) driver.summary = summary;
      drivers.push(driver);
    }
  }
  if (drivers.length > 0) out.drivers = drivers;
  return Object.keys(out).length > 0 ? out : undefined;
}

function projectThesisDetail(
  j: Record<string, unknown>,
): CoinetJudgmentPromptPackageJudgment['thesis_detail'] {
  const thesis = asObject(j.thesis);
  if (!thesis) return undefined;
  const out: NonNullable<CoinetJudgmentPromptPackageJudgment['thesis_detail']> = {};
  const primary = asObject(thesis.primary);
  if (primary) {
    const support = numOrUndef(primary.support_score);
    if (support !== undefined) out.support_score = support;
    const contradiction = numOrUndef(primary.contradiction_score);
    if (contradiction !== undefined) out.contradiction_score = contradiction;
    const confidence = numOrUndef(primary.confidence);
    if (confidence !== undefined) out.confidence = confidence;
  }
  const secondary = asObject(thesis.secondary);
  const secondaryHyp = secondary ? strOrUndef(secondary.hypothesis) : undefined;
  if (secondaryHyp) out.secondary = secondaryHyp;
  const clarity = numOrUndef(thesis.clarity);
  if (clarity !== undefined) out.clarity = clarity;
  if (typeof thesis.ambiguity_flag === 'boolean') out.ambiguous = thesis.ambiguity_flag;
  return Object.keys(out).length > 0 ? out : undefined;
}

function projectContradictionItems(
  j: Record<string, unknown>,
): CoinetJudgmentContradictionItem[] | undefined {
  const contradictions = asObject(j.contradictions);
  const items = contradictions?.items;
  if (!Array.isArray(items)) return undefined;
  const out: CoinetJudgmentContradictionItem[] = [];
  for (const it of items) {
    const o = asObject(it);
    if (!o) continue;
    const cls = strOrUndef(o.class);
    const severity = strOrUndef(o.severity);
    // class + severity are the identifying pair; skip shapeless/placeholder items
    if (!cls || !severity) continue;
    const item: CoinetJudgmentContradictionItem = { class: cls, severity };
    const summary = strOrUndef(o.summary);
    if (summary) item.summary = summary;
    if (typeof o.resolvable === 'boolean') item.resolvable = o.resolvable;
    out.push(item);
  }
  return out.length > 0 ? out : undefined;
}

function projectTimingDetail(
  j: Record<string, unknown>,
): CoinetJudgmentPromptPackageJudgment['timing_detail'] {
  const timing = asObject(j.timing);
  if (!timing) return undefined;
  const out: NonNullable<CoinetJudgmentPromptPackageJudgment['timing_detail']> = {};
  const score = numOrUndef(timing.score);
  if (score !== undefined) out.score = score;
  const position = numOrUndef(timing.sequence_position);
  if (position !== undefined) out.position = position;
  const total = numOrUndef(timing.sequence_total);
  if (total !== undefined) out.total = total;
  if (typeof timing.maturity_warning === 'boolean') out.maturity_warning = timing.maturity_warning;
  const note = strOrUndef(timing.maturity_note);
  if (note) out.maturity_note = note;
  return Object.keys(out).length > 0 ? out : undefined;
}

function projectHorizons(v: unknown): CoinetJudgmentHorizon[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: CoinetJudgmentHorizon[] = [];
  for (const h of v) {
    const o = asObject(h);
    const horizon = o ? strOrUndef(o.horizon) : undefined;
    if (!o || !horizon) continue;
    const item: CoinetJudgmentHorizon = { horizon };
    const confirmation = strOrUndef(o.confirmation);
    if (confirmation) item.confirmation = confirmation;
    const failure = strOrUndef(o.failure);
    if (failure) item.failure = failure;
    const trigger = strOrUndef(o.trigger);
    if (trigger) item.trigger = trigger;
    const invalidation = strOrUndef(o.invalidation);
    if (invalidation) item.invalidation = invalidation;
    out.push(item);
  }
  return out.length > 0 ? out : undefined;
}

function projectScenarioDetail(
  j: Record<string, unknown>,
): CoinetJudgmentPromptPackageJudgment['scenario_detail'] {
  const scenario = asObject(j.scenario);
  if (!scenario) return undefined;
  const out: NonNullable<CoinetJudgmentPromptPackageJudgment['scenario_detail']> = {};
  const bull = strOrUndef(scenario.bullish_confirmation);
  if (bull) out.bullish_confirmation = bull;
  const bear = strOrUndef(scenario.bearish_failure);
  if (bear) out.bearish_failure = bear;
  const trigger = strOrUndef(scenario.next_trigger);
  if (trigger) out.next_trigger = trigger;
  const confidence = numOrUndef(scenario.scenario_confidence);
  if (confidence !== undefined) out.confidence = confidence;
  const horizons = projectHorizons(scenario.horizons);
  if (horizons) out.horizons = horizons;
  return Object.keys(out).length > 0 ? out : undefined;
}

function projectConfidenceDetail(
  j: Record<string, unknown>,
): CoinetJudgmentPromptPackageJudgment['confidence_detail'] {
  const confidence = asObject(j.confidence);
  if (!confidence) return undefined;
  const out: NonNullable<CoinetJudgmentPromptPackageJudgment['confidence_detail']> = {};
  const score = numOrUndef(confidence.score);
  if (score !== undefined) out.score = score;
  const bd = asObject(confidence.breakdown);
  if (bd) {
    const breakdown: NonNullable<
      NonNullable<CoinetJudgmentPromptPackageJudgment['confidence_detail']>['breakdown']
    > = {};
    for (const axis of ['market', 'fundamentals', 'onchain', 'narrative'] as const) {
      const val = numOrUndef(bd[axis]);
      if (val !== undefined) breakdown[axis] = val;
    }
    if (Object.keys(breakdown).length > 0) out.breakdown = breakdown;
  }
  const pu = strOrUndef(confidence.primary_uncertainty);
  if (pu) out.primary_uncertainty = pu;
  return Object.keys(out).length > 0 ? out : undefined;
}

/** The 24h horizon entry from scenario.horizons[], if present. */
function find24hHorizon(j: Record<string, unknown>): Record<string, unknown> | undefined {
  const scenario = asObject(j.scenario);
  const horizons = scenario?.horizons;
  if (!Array.isArray(horizons)) return undefined;
  for (const h of horizons) {
    const o = asObject(h);
    if (o && o.horizon === '24h') return o;
  }
  return undefined;
}

/**
 * 24h confirmation signal. Prefers the rich `horizons['24h']` (confirmation +
 * trigger); falls back to the guaranteed `scenario.bullish_confirmation`
 * (+ next_trigger). Pure projection — never invents.
 */
function deriveSignal24h(j: Record<string, unknown>): string | undefined {
  const h = find24hHorizon(j);
  if (h) {
    const confirmation = strOrUndef(h.confirmation);
    if (confirmation) {
      const trigger = strOrUndef(h.trigger);
      return trigger ? `${confirmation} ${trigger}` : confirmation;
    }
  }
  const scenario = asObject(j.scenario);
  const bull = scenario ? strOrUndef(scenario.bullish_confirmation) : undefined;
  if (!bull) return undefined;
  const trig = scenario ? strOrUndef(scenario.next_trigger) : undefined;
  return trig ? `${bull} ${trig}` : bull;
}

/**
 * Failure condition. Prefers `horizons['24h'].failure` (then `.invalidation`);
 * falls back to the guaranteed `scenario.bearish_failure`. Never invents.
 */
function deriveFailureCondition(j: Record<string, unknown>): string | undefined {
  const h = find24hHorizon(j);
  if (h) {
    const failure = strOrUndef(h.failure);
    if (failure) return failure;
    const invalidation = strOrUndef(h.invalidation);
    if (invalidation) return invalidation;
  }
  const scenario = asObject(j.scenario);
  return scenario ? strOrUndef(scenario.bearish_failure) : undefined;
}

function hasAnyJudgmentField(j: CoinetJudgmentPromptPackageJudgment): boolean {
  // Must cover EVERY field (headline + structured + derived) so the UNAVAILABLE
  // invariant (a package with no judgment) cannot be bypassed by a package that
  // carries only structured-depth fields. Keep in sync with the type.
  return (
    !!j.state ||
    !!j.thesis ||
    !!j.cause ||
    !!j.contradiction_summary ||
    !!j.timing_phase ||
    !!j.scenario_summary ||
    !!j.confidence_band ||
    !!j.state_detail ||
    !!j.cause_detail ||
    !!j.thesis_detail ||
    !!j.contradiction_items ||
    j.contradiction_load !== undefined ||
    j.contradiction_structural_warning !== undefined ||
    !!j.timing_detail ||
    !!j.scenario_detail ||
    !!j.confidence_detail ||
    !!j.signal_24h ||
    !!j.failure_condition
  );
}

// Re-export the availability type for convenience to callers.
export type { JudgmentAvailabilityResult };
