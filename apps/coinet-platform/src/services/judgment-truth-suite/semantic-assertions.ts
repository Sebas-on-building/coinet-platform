/**
 * P3-BTAR-004 — Semantic Assertion Engine
 *
 * Deterministic judge: compares `SyntheticActualJudgment` to
 * `ExpectedJudgmentOracle` across 10 semantic checks + 1 readiness check.
 *
 * No AI. No real APIs. No provider imports. No live data.
 * Pure text/enum comparison with small deterministic family tables.
 *
 * Authority:
 *   - Plan 3.0 §1, §3, §6, §9, §11, §12
 *   - P3-BTAR-004 §5..§22 (check rules), §6/§23 (outcome + score discipline)
 *
 * Owner: Phase 3 (P3-BTAR-004).
 */

import type {
  ExpectedJudgmentOracle,
  ExpectedConfidenceBand,
  ExpectedTimingPhase,
} from './synthetic-episode.types';
import type {
  JudgmentTruthRunnerResult,
  SyntheticActualJudgment,
} from './judgment-truth-runner.types';
import type {
  JudgmentSemanticAssertionResult,
  RunSemanticAssertionsInput,
  SemanticAssertionCheckId,
  SemanticAssertionCheckResult,
  SemanticAssertionOutcome,
  SemanticAssertionsPolicyVersion,
} from './semantic-assertions.types';

const POLICY_VERSION: SemanticAssertionsPolicyVersion = 'semantic-assertions.v1';

// -----------------------------------------------------------------------------
// Score deltas (§6 / §23)
// -----------------------------------------------------------------------------

const SCORE_DELTA: Record<SemanticAssertionOutcome, number> = {
  PASS: 0,
  WARNING: -5,
  FAIL: -15,
  CRITICAL_FAIL: -30,
};

// -----------------------------------------------------------------------------
// Confidence-band order (§19)
// -----------------------------------------------------------------------------

const CONFIDENCE_ORDER: Record<ExpectedConfidenceBand, number> = {
  VERY_LOW: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  VERY_HIGH: 4,
};

function confidenceIndex(value: string): number | undefined {
  const upper = value.toUpperCase() as ExpectedConfidenceBand;
  return CONFIDENCE_ORDER[upper];
}

// -----------------------------------------------------------------------------
// Normalization helpers
// -----------------------------------------------------------------------------

export function normalizeJudgmentText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return normalizeJudgmentText(value).split(' ').filter((t) => t.length > 2);
}

export function containsNormalizedNeedle(
  haystack: string | string[],
  needle: string,
): boolean {
  const n = normalizeJudgmentText(needle);
  if (!n) return false;
  const hay = Array.isArray(haystack) ? haystack : [haystack];
  return hay.some((h) => normalizeJudgmentText(h).includes(n));
}

// -----------------------------------------------------------------------------
// Negation-aware forbidden-claim matcher (§20).
//
// A forbidden phrase that appears immediately after a negation word ("not",
// "no", "without", "absence of", or "not yet") is not a positive claim and
// MUST NOT count as a forbidden-claim hit. Mirrors the negation guard already
// used in Phase 2's AI output safety gate so the truth-suite stays honest:
// "constructive but not yet confirmed breakout" does NOT claim a confirmed
// breakout.
// -----------------------------------------------------------------------------

const NEGATION_PREFIXES = ['not yet', 'not a', 'not an', 'not', 'no', 'without', 'absence of', 'never'];

function forbiddenClaimAppearsPositively(haystack: string, claim: string): boolean {
  const hay = normalizeJudgmentText(haystack);
  const needle = normalizeJudgmentText(claim);
  if (!needle) return false;
  let from = 0;
  while (from < hay.length) {
    const idx = hay.indexOf(needle, from);
    if (idx === -1) return false;
    // Look backward up to 30 chars for a negation prefix.
    const back = hay.slice(Math.max(0, idx - 30), idx).trim();
    const negated = NEGATION_PREFIXES.some((p) => {
      const re = new RegExp(`(^|\\s)${p}(\\s|$)`);
      return re.test(back);
    });
    if (!negated) return true;
    from = idx + needle.length;
  }
  return false;
}

function tokenOverlapRatio(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hits = 0;
  for (const t of tb) {
    if (ta.has(t)) hits++;
  }
  return hits / Math.min(ta.size, tb.size);
}

// -----------------------------------------------------------------------------
// State / cause / scenario family inversion tables (§13/§14/§18)
//
// Each entry is a list of phrase pairs that, when both appear (one in expected
// and one in actual), indicate a dangerously inverted family — a CRITICAL_FAIL.
// All comparisons happen on normalized text.
// -----------------------------------------------------------------------------

interface InversionPair {
  a: string[];
  b: string[];
  reason: string;
}

const STATE_INVERSION_TABLE: InversionPair[] = [
  { a: ['fragile', 'leverage', 'fragility'], b: ['clean accumulation', 'healthy expansion'], reason: 'fragile expansion mistaken for clean accumulation' },
  { a: ['risk off', 'contraction'], b: ['risk on', 'expansion'], reason: 'risk-off mistaken for risk-on' },
  { a: ['sentiment only', 'narrative driven'], b: ['fundamental rerating', 'fundamental improvement'], reason: 'sentiment-only mistaken for fundamental rerating' },
  { a: ['distribution', 'late distribution'], b: ['accumulation', 'early accumulation'], reason: 'distribution mistaken for accumulation' },
  { a: ['exhausted', 'late euphoric'], b: ['early', 'fresh'], reason: 'late/exhausted mistaken for early/fresh' },
  { a: ['security risk', 'invalidating'], b: ['constructive', 'safe', 'accumulation'], reason: 'security-risk override mistaken for constructive' },
];

const CAUSE_INVERSION_TABLE: InversionPair[] = [
  { a: ['leverage', 'leverage assisted'], b: ['spot led', 'spot demand'], reason: 'leverage-assisted mistaken for spot-led' },
  { a: ['unlock', 'pre unlock'], b: ['clean demand', 'spot led accumulation'], reason: 'unlock-risk cause mistaken for clean demand' },
  { a: ['security', 'exploit', 'protocol layer security'], b: ['accumulation', 'demand expansion'], reason: 'security-event cause mistaken for accumulation' },
  { a: ['sentiment only', 'narrative driven'], b: ['fundamental improvement', 'fundamentals led'], reason: 'sentiment-only cause mistaken for fundamentals-led' },
  { a: ['whale distribution'], b: ['whale accumulation'], reason: 'distribution cause mistaken for accumulation' },
];

const SCENARIO_INVERSION_TABLE: InversionPair[] = [
  { a: ['unwind', 'sharp unwind', 'liquidation'], b: ['clean continuation', 'continuation if'], reason: 'unwind risk mistaken for continuation' },
  { a: ['unlock driven', 'distribution driven', 'mean reversion'], b: ['breakout continuation', 'continuation if'], reason: 'distribution scenario mistaken for breakout continuation' },
  { a: ['security event', 'thesis cannot proceed', 'invalidating'], b: ['normal accumulation', 'continuation if'], reason: 'security override scenario mistaken for normal continuation' },
];

function matchesInversion(
  expectedText: string,
  actualText: string,
  table: InversionPair[],
): InversionPair | undefined {
  const eNorm = normalizeJudgmentText(expectedText);
  const aNorm = normalizeJudgmentText(actualText);
  for (const pair of table) {
    const eHit = pair.a.some((p) => eNorm.includes(normalizeJudgmentText(p)));
    const aHit = pair.b.some((p) => aNorm.includes(normalizeJudgmentText(p)));
    if (eHit && aHit) return pair;
  }
  return undefined;
}

// -----------------------------------------------------------------------------
// Timing adjacency (§17)
// -----------------------------------------------------------------------------

const TIMING_ORDER: Record<ExpectedTimingPhase, number> = {
  EARLY: 0,
  MID: 1,
  LATE: 2,
  EXHAUSTED: 3,
  INVALIDATING: 4,
  UNCLEAR: 5,
};

function timingDistance(expected: string, actual: string): number | undefined {
  const e = TIMING_ORDER[expected.toUpperCase() as ExpectedTimingPhase];
  const a = TIMING_ORDER[actual.toUpperCase() as ExpectedTimingPhase];
  if (e === undefined || a === undefined) return undefined;
  if (e === TIMING_ORDER.UNCLEAR || a === TIMING_ORDER.UNCLEAR) {
    return e === a ? 0 : 99;
  }
  return Math.abs(e - a);
}

// -----------------------------------------------------------------------------
// Check builders
// -----------------------------------------------------------------------------

function buildCheck(
  check_id: SemanticAssertionCheckId,
  outcome: SemanticAssertionOutcome,
  expected: string | string[],
  actual: string | string[],
  message: string,
): SemanticAssertionCheckResult {
  return {
    check_id,
    outcome,
    score_delta: SCORE_DELTA[outcome],
    expected,
    actual,
    message,
  };
}

// -----------------------------------------------------------------------------
// 11 individual checks
// -----------------------------------------------------------------------------

function checkStateAlignment(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  const expected = oracle.expected_state;
  const got = actual.state;
  if (normalizeJudgmentText(expected) === normalizeJudgmentText(got)) {
    return buildCheck('STATE_ALIGNMENT', 'PASS', expected, got, 'state matches oracle');
  }
  const inversion = matchesInversion(expected, got, STATE_INVERSION_TABLE);
  if (inversion) {
    return buildCheck(
      'STATE_ALIGNMENT',
      'CRITICAL_FAIL',
      expected,
      got,
      `state is dangerously inverted: ${inversion.reason}`,
    );
  }
  const overlap = tokenOverlapRatio(expected, got);
  if (overlap >= 0.5) {
    return buildCheck('STATE_ALIGNMENT', 'WARNING', expected, got, 'state partially aligned but not exact');
  }
  return buildCheck('STATE_ALIGNMENT', 'FAIL', expected, got, 'state does not align with oracle');
}

function checkCauseFamilyAlignment(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  const expected = oracle.expected_cause_family;
  const got = actual.cause_family;
  if (normalizeJudgmentText(expected) === normalizeJudgmentText(got)) {
    return buildCheck('CAUSE_FAMILY_ALIGNMENT', 'PASS', expected, got, 'cause family matches oracle');
  }
  const inversion = matchesInversion(expected, got, CAUSE_INVERSION_TABLE);
  if (inversion) {
    return buildCheck(
      'CAUSE_FAMILY_ALIGNMENT',
      'CRITICAL_FAIL',
      expected,
      got,
      `cause family is dangerously inverted: ${inversion.reason}`,
    );
  }
  const overlap = tokenOverlapRatio(expected, got);
  if (overlap >= 0.5) {
    return buildCheck('CAUSE_FAMILY_ALIGNMENT', 'WARNING', expected, got, 'cause family partially aligned');
  }
  return buildCheck('CAUSE_FAMILY_ALIGNMENT', 'FAIL', expected, got, 'cause family does not align');
}

function checkThesisDirectionAlignment(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  const expected = oracle.expected_thesis_direction;
  const got = actual.thesis_direction;
  if (normalizeJudgmentText(expected) === normalizeJudgmentText(got)) {
    return buildCheck('THESIS_DIRECTION_ALIGNMENT', 'PASS', expected, got, 'thesis direction matches');
  }

  // Strong directional opposites.
  const expectedNorm = normalizeJudgmentText(expected);
  const actualNorm = normalizeJudgmentText(got);
  const expectedBearish = /(bear|distribution|invalidat|unwind|breakdown|downside|fragile)/.test(expectedNorm);
  const expectedBullish = /(bull|constructive|continuation|expansion|breakout|upside|accumulation)/.test(expectedNorm);
  const actualBearish = /(bear|distribution|invalidat|unwind|breakdown|downside)/.test(actualNorm);
  const actualBullish = /(bull|constructive|continuation|expansion|breakout|upside|accumulation)/.test(actualNorm);

  if ((expectedBearish && actualBullish) || (expectedBullish && actualBearish)) {
    return buildCheck(
      'THESIS_DIRECTION_ALIGNMENT',
      'CRITICAL_FAIL',
      expected,
      got,
      'thesis direction is opposite to oracle',
    );
  }

  const overlap = tokenOverlapRatio(expected, got);
  if (overlap >= 0.5) {
    return buildCheck('THESIS_DIRECTION_ALIGNMENT', 'WARNING', expected, got, 'thesis direction partially aligned');
  }
  return buildCheck('THESIS_DIRECTION_ALIGNMENT', 'FAIL', expected, got, 'thesis direction does not align');
}

function checkRequiredContradictionCoverage(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  const required = oracle.required_contradictions;
  if (required.length === 0) {
    return buildCheck(
      'REQUIRED_CONTRADICTION_COVERAGE',
      'PASS',
      required,
      actual.contradictions,
      'no required contradictions',
    );
  }
  let covered = 0;
  const missing: string[] = [];
  for (const req of required) {
    const reqTokens = tokens(req);
    const reqKey = reqTokens.slice(0, Math.min(3, reqTokens.length)).join(' ');
    const found = actual.contradictions.some((c) => {
      if (containsNormalizedNeedle(c, req)) return true;
      if (reqKey && containsNormalizedNeedle(c, reqKey)) return true;
      return tokenOverlapRatio(c, req) >= 0.7;
    });
    if (found) covered++;
    else missing.push(req);
  }
  if (covered === required.length) {
    return buildCheck('REQUIRED_CONTRADICTION_COVERAGE', 'PASS', required, actual.contradictions, 'all required contradictions covered');
  }
  if (covered === 0) {
    return buildCheck(
      'REQUIRED_CONTRADICTION_COVERAGE',
      'CRITICAL_FAIL',
      required,
      actual.contradictions,
      `all ${required.length} required contradictions missing`,
    );
  }
  if (required.length - covered >= 2) {
    return buildCheck(
      'REQUIRED_CONTRADICTION_COVERAGE',
      'FAIL',
      required,
      actual.contradictions,
      `${required.length - covered} required contradictions missing: ${missing.join('; ')}`,
    );
  }
  return buildCheck(
    'REQUIRED_CONTRADICTION_COVERAGE',
    'WARNING',
    required,
    actual.contradictions,
    `${required.length - covered} required contradiction missing: ${missing.join('; ')}`,
  );
}

function checkTimingPhaseAlignment(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  const expected = String(oracle.expected_timing_phase);
  const got = String(actual.timing_phase);
  const distance = timingDistance(expected, got);
  if (distance === undefined) {
    return buildCheck('TIMING_PHASE_ALIGNMENT', 'FAIL', expected, got, 'timing phase not recognized');
  }
  if (distance === 0) {
    return buildCheck('TIMING_PHASE_ALIGNMENT', 'PASS', expected, got, 'timing phase matches');
  }
  // Dangerous "early when expected late/exhausted/invalidating".
  const upperE = expected.toUpperCase();
  const upperA = got.toUpperCase();
  const dangerouslyEarly =
    (upperE === 'LATE' || upperE === 'EXHAUSTED' || upperE === 'INVALIDATING') &&
    (upperA === 'EARLY' || upperA === 'MID');
  if (dangerouslyEarly) {
    return buildCheck(
      'TIMING_PHASE_ALIGNMENT',
      'CRITICAL_FAIL',
      expected,
      got,
      'expected LATE/EXHAUSTED/INVALIDATING but actual is EARLY/MID',
    );
  }
  if (distance === 1) {
    return buildCheck('TIMING_PHASE_ALIGNMENT', 'WARNING', expected, got, 'adjacent timing phase');
  }
  return buildCheck('TIMING_PHASE_ALIGNMENT', 'FAIL', expected, got, 'wrong timing phase');
}

function checkScenarioTypeAlignment(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  const expected = oracle.expected_scenario_type;
  const got = actual.scenario_type;
  if (normalizeJudgmentText(expected) === normalizeJudgmentText(got)) {
    return buildCheck('SCENARIO_TYPE_ALIGNMENT', 'PASS', expected, got, 'scenario type matches');
  }
  const inversion = matchesInversion(expected, got, SCENARIO_INVERSION_TABLE);
  if (inversion) {
    return buildCheck(
      'SCENARIO_TYPE_ALIGNMENT',
      'CRITICAL_FAIL',
      expected,
      got,
      `scenario type is dangerously inverted: ${inversion.reason}`,
    );
  }
  const overlap = tokenOverlapRatio(expected, got);
  if (overlap >= 0.5) {
    return buildCheck('SCENARIO_TYPE_ALIGNMENT', 'WARNING', expected, got, 'scenario type partially aligned');
  }
  return buildCheck('SCENARIO_TYPE_ALIGNMENT', 'FAIL', expected, got, 'scenario type does not align');
}

function checkConfidenceBandCalibration(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  const expected = String(oracle.expected_confidence_band);
  const got = String(actual.confidence_band);
  const eIdx = confidenceIndex(expected);
  const aIdx = confidenceIndex(got);
  if (eIdx === undefined || aIdx === undefined) {
    return buildCheck('CONFIDENCE_BAND_CALIBRATION', 'FAIL', expected, got, 'unknown confidence band');
  }
  if (aIdx === eIdx) {
    return buildCheck('CONFIDENCE_BAND_CALIBRATION', 'PASS', expected, got, 'confidence band matches');
  }
  const diff = aIdx - eIdx;

  // Overconfidence dangers (§19).
  const expectedLow = eIdx <= CONFIDENCE_ORDER.LOW;
  const actualHigh = aIdx >= CONFIDENCE_ORDER.HIGH;
  if (expectedLow && actualHigh) {
    return buildCheck(
      'CONFIDENCE_BAND_CALIBRATION',
      'CRITICAL_FAIL',
      expected,
      got,
      'expected LOW/VERY_LOW but actual is HIGH/VERY_HIGH (severe overconfidence)',
    );
  }
  if (got.toUpperCase() === 'VERY_HIGH' && expected.toUpperCase() !== 'VERY_HIGH') {
    return buildCheck(
      'CONFIDENCE_BAND_CALIBRATION',
      'CRITICAL_FAIL',
      expected,
      got,
      'actual confidence VERY_HIGH without expected VERY_HIGH',
    );
  }
  if (diff >= 3) {
    return buildCheck(
      'CONFIDENCE_BAND_CALIBRATION',
      'CRITICAL_FAIL',
      expected,
      got,
      'confidence inflated by 3+ levels',
    );
  }
  if (diff === 2) {
    return buildCheck('CONFIDENCE_BAND_CALIBRATION', 'FAIL', expected, got, 'confidence inflated by 2 levels');
  }
  if (diff === -2) {
    return buildCheck('CONFIDENCE_BAND_CALIBRATION', 'FAIL', expected, got, 'confidence underbid by 2 levels');
  }
  if (diff === -3 || diff <= -3) {
    return buildCheck('CONFIDENCE_BAND_CALIBRATION', 'CRITICAL_FAIL', expected, got, 'confidence underbid by 3+ levels');
  }
  // diff === ±1
  return buildCheck('CONFIDENCE_BAND_CALIBRATION', 'WARNING', expected, got, 'confidence off by one band');
}

function checkForbiddenClaimAbsence(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  const fields: Array<string | string[]> = [
    actual.state,
    actual.cause_family,
    actual.thesis_direction,
    actual.thesis,
    actual.contradictions,
    String(actual.scenario_type),
    actual.reasoning_notes,
  ];
  const hits: string[] = [];
  for (const claim of oracle.forbidden_claims) {
    let positiveHit = false;
    for (const f of fields) {
      const fieldArr = Array.isArray(f) ? f : [String(f)];
      for (const entry of fieldArr) {
        if (forbiddenClaimAppearsPositively(entry, claim)) {
          positiveHit = true;
          break;
        }
      }
      if (positiveHit) break;
    }
    if (positiveHit) hits.push(claim);
  }
  if (hits.length === 0) {
    return buildCheck('FORBIDDEN_CLAIM_ABSENCE', 'PASS', oracle.forbidden_claims, [], 'no forbidden claims present');
  }
  // Forbidden claim plus HIGH/VERY_HIGH confidence → CRITICAL_FAIL.
  const aIdx = confidenceIndex(String(actual.confidence_band));
  if (aIdx !== undefined && aIdx >= CONFIDENCE_ORDER.HIGH) {
    return buildCheck(
      'FORBIDDEN_CLAIM_ABSENCE',
      'CRITICAL_FAIL',
      oracle.forbidden_claims,
      hits,
      'forbidden claim present with HIGH/VERY_HIGH confidence',
    );
  }
  return buildCheck(
    'FORBIDDEN_CLAIM_ABSENCE',
    'FAIL',
    oracle.forbidden_claims,
    hits,
    `forbidden claim(s) present: ${hits.join(', ')}`,
  );
}

function checkRequiredReasoningNoteCoverage(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  const required = oracle.required_reasoning_notes;
  if (required.length === 0) {
    return buildCheck(
      'REQUIRED_REASONING_NOTE_COVERAGE',
      'PASS',
      required,
      actual.reasoning_notes,
      'no required reasoning notes',
    );
  }
  let covered = 0;
  const missing: string[] = [];
  for (const note of required) {
    const noteTokens = tokens(note);
    const noteKey = noteTokens.slice(0, Math.min(3, noteTokens.length)).join(' ');
    const found = actual.reasoning_notes.some((rn) => {
      if (containsNormalizedNeedle(rn, note)) return true;
      if (noteKey && containsNormalizedNeedle(rn, noteKey)) return true;
      return tokenOverlapRatio(rn, note) >= 0.5;
    });
    if (found) covered++;
    else missing.push(note);
  }
  if (covered === required.length) {
    return buildCheck(
      'REQUIRED_REASONING_NOTE_COVERAGE',
      'PASS',
      required,
      actual.reasoning_notes,
      'all required reasoning notes covered',
    );
  }
  if (covered === 0) {
    return buildCheck(
      'REQUIRED_REASONING_NOTE_COVERAGE',
      'CRITICAL_FAIL',
      required,
      actual.reasoning_notes,
      `all ${required.length} required reasoning notes missing`,
    );
  }
  if (required.length - covered >= 2) {
    return buildCheck(
      'REQUIRED_REASONING_NOTE_COVERAGE',
      'FAIL',
      required,
      actual.reasoning_notes,
      `${required.length - covered} required reasoning notes missing: ${missing.join('; ')}`,
    );
  }
  return buildCheck(
    'REQUIRED_REASONING_NOTE_COVERAGE',
    'WARNING',
    required,
    actual.reasoning_notes,
    `${required.length - covered} required reasoning note missing: ${missing.join('; ')}`,
  );
}

const DEGRADED_PHRASES = [
  'degraded',
  'partial',
  'unavailable',
  'blind spot',
  'blindness',
  'capped',
  'incomplete evidence',
];

function oracleIndicatesDegradedEvidence(oracle: ExpectedJudgmentOracle): boolean {
  const eIdx = confidenceIndex(String(oracle.expected_confidence_band));
  const lowConfidence = eIdx !== undefined && eIdx <= CONFIDENCE_ORDER.LOW;
  const notesIndicate = oracle.required_reasoning_notes.some((n) =>
    DEGRADED_PHRASES.some((p) => containsNormalizedNeedle(n, p)),
  );
  const stateIndicates = DEGRADED_PHRASES.some((p) => containsNormalizedNeedle(oracle.expected_state, p));
  return notesIndicate || (lowConfidence && stateIndicates);
}

function checkDegradedEvidenceRespect(
  oracle: ExpectedJudgmentOracle,
  actual: SyntheticActualJudgment,
): SemanticAssertionCheckResult {
  if (!oracleIndicatesDegradedEvidence(oracle)) {
    return buildCheck(
      'DEGRADED_EVIDENCE_RESPECT',
      'PASS',
      'no degraded indicator in oracle',
      'n/a',
      'degraded evidence check not applicable',
    );
  }
  const mentions = DEGRADED_PHRASES.some((p) =>
    actual.reasoning_notes.some((rn) => containsNormalizedNeedle(rn, p)) ||
      containsNormalizedNeedle(actual.state, p),
  );
  const aIdx = confidenceIndex(String(actual.confidence_band));
  const highConf = aIdx !== undefined && aIdx >= CONFIDENCE_ORDER.HIGH;
  const cleanLanguage = /clean|confirmed|guaranteed/.test(
    normalizeJudgmentText(`${actual.state} ${actual.thesis_direction} ${actual.thesis}`),
  );

  if (!mentions && highConf) {
    return buildCheck(
      'DEGRADED_EVIDENCE_RESPECT',
      'CRITICAL_FAIL',
      'degraded evidence must be disclosed and confidence capped',
      `mentions=${mentions}, confidence=${actual.confidence_band}`,
      'degraded evidence ignored with HIGH/VERY_HIGH confidence',
    );
  }
  if (!mentions) {
    return buildCheck(
      'DEGRADED_EVIDENCE_RESPECT',
      'FAIL',
      'degraded evidence must be disclosed',
      `mentions=${mentions}, confidence=${actual.confidence_band}`,
      'degraded evidence not mentioned',
    );
  }
  if (highConf || cleanLanguage) {
    return buildCheck(
      'DEGRADED_EVIDENCE_RESPECT',
      'WARNING',
      'degraded evidence respected and confidence capped',
      `confidence=${actual.confidence_band}, cleanLanguage=${cleanLanguage}`,
      'degraded evidence mentioned but confidence/language not fully capped',
    );
  }
  return buildCheck(
    'DEGRADED_EVIDENCE_RESPECT',
    'PASS',
    'degraded evidence respected',
    `confidence=${actual.confidence_band}`,
    'degraded evidence respected and confidence capped',
  );
}

// -----------------------------------------------------------------------------
// Outcome + score aggregation (§6 / §23)
// -----------------------------------------------------------------------------

export function deriveOverallOutcome(
  checks: SemanticAssertionCheckResult[],
): SemanticAssertionOutcome {
  if (checks.some((c) => c.outcome === 'CRITICAL_FAIL')) return 'CRITICAL_FAIL';
  if (checks.some((c) => c.outcome === 'FAIL')) return 'FAIL';
  if (checks.some((c) => c.outcome === 'WARNING')) return 'WARNING';
  return 'PASS';
}

export function calculateSemanticScore(
  checks: SemanticAssertionCheckResult[],
): number {
  let score = 100;
  for (const c of checks) {
    score += c.score_delta;
  }
  return Math.max(0, Math.min(100, score));
}

// -----------------------------------------------------------------------------
// Engine entry point
// -----------------------------------------------------------------------------

export function runSemanticAssertions(
  input: RunSemanticAssertionsInput,
): JudgmentSemanticAssertionResult {
  const runner_result: JudgmentTruthRunnerResult = input.runner_result;
  const expected_oracle = runner_result.expected_oracle;
  const actual_judgment = runner_result.actual_judgment;

  const base = (
    extras: {
      checks: SemanticAssertionCheckResult[];
      actual?: SyntheticActualJudgment;
    },
  ): JudgmentSemanticAssertionResult => {
    const outcome = deriveOverallOutcome(extras.checks);
    const score = calculateSemanticScore(extras.checks);
    const failures = extras.checks.filter((c) => c.outcome === 'FAIL').map((c) => `${c.check_id}: ${c.message}`);
    const critical_failures = extras.checks
      .filter((c) => c.outcome === 'CRITICAL_FAIL')
      .map((c) => `${c.check_id}: ${c.message}`);
    const warnings = extras.checks.filter((c) => c.outcome === 'WARNING').map((c) => `${c.check_id}: ${c.message}`);
    return {
      policy_version: POLICY_VERSION,
      episode_id: runner_result.episode_id,
      title: runner_result.title,
      overall_outcome: outcome,
      score,
      semantic_assertions_run: true,
      check_results: extras.checks,
      failures,
      warnings,
      critical_failures,
      expected_oracle,
      actual_judgment: extras.actual,
      no_real_provider_calls: true,
    };
  };

  // Readiness gate (§12 / Plan-3.0-INV-01).
  const readinessProblems: string[] = [];
  if (runner_result.runner_status !== 'RUNNER_COMPLETED') {
    readinessProblems.push(`runner_status=${runner_result.runner_status}`);
  }
  if (runner_result.comparison_ready !== true) {
    readinessProblems.push('comparison_ready=false');
  }
  if (!actual_judgment) {
    readinessProblems.push('actual_judgment missing');
  }
  if (runner_result.semantic_assertions_run !== false) {
    readinessProblems.push('runner already claims semantic_assertions_run !== false');
  }

  if (readinessProblems.length > 0) {
    const readinessCheck = buildCheck(
      'RUNNER_RESULT_READINESS',
      'CRITICAL_FAIL',
      'comparison-ready runner result with actual_judgment',
      readinessProblems.join('; '),
      `runner result not ready for semantic scoring: ${readinessProblems.join('; ')}`,
    );
    return base({ checks: [readinessCheck], actual: actual_judgment });
  }

  const readinessCheck = buildCheck(
    'RUNNER_RESULT_READINESS',
    'PASS',
    'comparison-ready runner result with actual_judgment',
    `runner_status=${runner_result.runner_status}`,
    'runner result ready for semantic scoring',
  );

  // actual_judgment is guaranteed defined here.
  const actual = actual_judgment as SyntheticActualJudgment;

  const checks: SemanticAssertionCheckResult[] = [
    readinessCheck,
    checkStateAlignment(expected_oracle, actual),
    checkCauseFamilyAlignment(expected_oracle, actual),
    checkThesisDirectionAlignment(expected_oracle, actual),
    checkRequiredContradictionCoverage(expected_oracle, actual),
    checkTimingPhaseAlignment(expected_oracle, actual),
    checkScenarioTypeAlignment(expected_oracle, actual),
    checkConfidenceBandCalibration(expected_oracle, actual),
    checkForbiddenClaimAbsence(expected_oracle, actual),
    checkRequiredReasoningNoteCoverage(expected_oracle, actual),
    checkDegradedEvidenceRespect(expected_oracle, actual),
  ];

  return base({ checks, actual });
}

// -----------------------------------------------------------------------------
// Defensive validator (§31 completion-proof helper)
// -----------------------------------------------------------------------------

export function assertSemanticAssertionResultValid(
  result: JudgmentSemanticAssertionResult,
): void {
  if (result.policy_version !== POLICY_VERSION) {
    throw new Error(`assertSemanticAssertionResultValid: unexpected policy_version=${result.policy_version}`);
  }
  if (result.semantic_assertions_run !== true) {
    throw new Error('assertSemanticAssertionResultValid: semantic_assertions_run must be true');
  }
  if (result.no_real_provider_calls !== true) {
    throw new Error('assertSemanticAssertionResultValid: no_real_provider_calls must be true');
  }
  if (result.score < 0 || result.score > 100) {
    throw new Error(`assertSemanticAssertionResultValid: score out of range: ${result.score}`);
  }
  if (!Array.isArray(result.check_results) || result.check_results.length === 0) {
    throw new Error('assertSemanticAssertionResultValid: check_results must be a non-empty array');
  }
}
