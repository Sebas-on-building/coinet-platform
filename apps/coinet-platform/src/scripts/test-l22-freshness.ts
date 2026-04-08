/**
 * L2.2 — Freshness Ontology Test Suite
 *
 * Timing · Family · Usage-right · Policy · Edge-case · Anti-fake
 */

import {
  L22_VERSION,
  type FreshnessEvaluationInput,
  type FreshnessDecisionRecord,
} from '../services/connector-layer/freshness-ontology';
import {
  findPolicy, getAllPolicies, DEFAULT_POLICY,
} from '../services/connector-layer/freshness-policy-map';
import {
  resolveDominantClock, computeTimingAges, assignFreshnessState,
  applyTransportGapEscalation, applyClaimUsageOverride,
} from '../services/connector-layer/freshness-state-machine';
import {
  evaluateFreshness, evaluateForUsage, evaluateMultipleFields,
  verifyRightsHonesty, isUsableForLive, isDisplayable, worstState,
  clearEvaluationLedger, getEvaluationLedger,
} from '../services/connector-layer/freshness-evaluator';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; return; }
  failed++;
  console.error(`  ✗ ${msg}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function ts(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

const NOW = Date.now();

function makeInput(overrides: Partial<FreshnessEvaluationInput> = {}): FreshnessEvaluationInput {
  return {
    envelopeId: `env-${Math.random().toString(36).slice(2, 10)}`,
    sourceClass: 'market_data',
    fieldFamily: 'price.spot',
    routeMode: 'realtime',
    observedTimestamp: new Date(NOW - 5_000).toISOString(),
    publishedTimestamp: new Date(NOW - 3_000).toISOString(),
    receivedTimestamp: new Date(NOW - 1_000).toISOString(),
    ingestedTimestamp: new Date(NOW).toISOString(),
    timingCompleteness: 'full',
    envelopeKind: 'observation',
    isBackfill: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║   L2.2 FRESHNESS ONTOLOGY — CONSTITUTIONAL TEST SUITE           ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

clearEvaluationLedger();

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1: Version & ontology constants
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 1: Version & ontology constants ──');
assert(L22_VERSION === '1.0.0', 'L22_VERSION is 1.0.0');
assert(getAllPolicies().length >= 10, 'At least 10 policies defined');
assert(DEFAULT_POLICY.policyId === 'default', 'Default policy exists');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2: Policy lookup
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 2: Policy lookup ──');
const spotPolicy = findPolicy('market_data', 'price.spot', 'realtime');
assert(spotPolicy.policyId === 'rt-crit-spot-price', 'Spot price policy found');
assert(spotPolicy.freshnessFamily === 'REALTIME', 'Spot is REALTIME family');
assert(spotPolicy.freshnessClass === 'REALTIME_CRITICAL', 'Spot is REALTIME_CRITICAL');
assert(spotPolicy.criticality === 'MISSION_CRITICAL', 'Spot is MISSION_CRITICAL');

const fundingPolicy = findPolicy('derivatives', 'derivatives.funding', 'realtime');
assert(fundingPolicy.policyId === 'rt-crit-derivatives-funding', 'Funding policy found');

const tvlPolicy = findPolicy('fundamentals', 'protocol.tvl', 'scheduled');
assert(tvlPolicy.policyId === 'sch-high-protocol-tvl', 'TVL policy found');
assert(tvlPolicy.freshnessFamily === 'SCHEDULED', 'TVL is SCHEDULED family');

const narrativePolicy = findPolicy('narrative', 'narrative.attention', 'scheduled');
assert(narrativePolicy.policyId === 'sch-mod-narrative', 'Narrative policy found');

const histPolicy = findPolicy('*', '*', 'backfill');
assert(histPolicy.freshnessFamily === 'HISTORICAL', 'Backfill maps to HISTORICAL');

const unknownPolicy = findPolicy('unknown_class', 'unknown_field');
assert(unknownPolicy.policyId === 'default', 'Unknown source+field falls to default');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3: Dominant clock resolution
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 3: Dominant clock resolution ──');
const fullInput = makeInput();
assert(resolveDominantClock(fullInput) === 'OBSERVED', 'Full timing → OBSERVED');

const noObserved = makeInput({ observedTimestamp: undefined });
assert(resolveDominantClock(noObserved) === 'PUBLISHED', 'No observed → PUBLISHED');

const onlyIngested = makeInput({ observedTimestamp: undefined, publishedTimestamp: undefined });
assert(resolveDominantClock(onlyIngested) === 'INGESTED', 'Only ingested → INGESTED');

const minimalTiming = makeInput({ observedTimestamp: undefined, publishedTimestamp: undefined, timingCompleteness: 'minimal' });
assert(resolveDominantClock(minimalTiming) === 'UNKNOWN', 'Minimal timing → UNKNOWN');

const backfillInput = makeInput({ isBackfill: true });
assert(resolveDominantClock(backfillInput) === 'HISTORICAL_PIN', 'Backfill with observed → HISTORICAL_PIN');

const backfillNoObs = makeInput({ isBackfill: true, observedTimestamp: undefined });
assert(resolveDominantClock(backfillNoObs) === 'UNKNOWN', 'Backfill no observed → UNKNOWN');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4: Timing age computation
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 4: Timing age computation ──');
const ages = computeTimingAges(fullInput, NOW);
assert(ages.observationAgeMs != null, 'observationAgeMs computed');
assert(ages.publicationAgeMs != null, 'publicationAgeMs computed');
assert(ages.ingestionAgeMs != null, 'ingestionAgeMs computed');
assert(ages.transportGapMs != null, 'transportGapMs computed');
assert(ages.publicationGapMs != null, 'publicationGapMs computed');
assert(ages.observationAgeMs! >= 4_000 && ages.observationAgeMs! <= 6_500, `observationAge ~5s (got ${ages.observationAgeMs})`);
assert(ages.transportGapMs! >= 4_000 && ages.transportGapMs! <= 6_000, `transportGap ~5s (got ${ages.transportGapMs})`);

const agesNoObs = computeTimingAges(noObserved, NOW);
assert(agesNoObs.observationAgeMs == null, 'No observed → no observationAge');
assert(agesNoObs.transportGapMs == null, 'No observed → no transportGap');
assert(agesNoObs.publicationAgeMs != null, 'publicationAge still computed');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5: Realtime state machine — F0 through F4
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 5: Realtime state transitions ──');

{
  const inp = makeInput({ observedTimestamp: new Date(NOW - 5_000).toISOString() });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F0_CURRENT', 'RT 5s old → F0_CURRENT');
  assert(r.rights.includes('LIVE_SCORING_ALLOWED'), 'F0 has LIVE_SCORING');
  assert(r.confidencePenalty === 0, 'F0 no penalty');
  assert(!r.disclosureRequired, 'F0 no disclosure');
}
{
  const inp = makeInput({ observedTimestamp: new Date(NOW - 20_000).toISOString() });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F1_SLIPPING', 'RT 20s old → F1_SLIPPING');
  assert(r.rights.includes('LIVE_SCORING_ALLOWED'), 'F1 still has LIVE_SCORING');
  assert(r.confidencePenalty > 0, 'F1 has penalty');
  assert(r.disclosureRequired, 'F1 requires disclosure');
}
{
  const inp = makeInput({ observedTimestamp: new Date(NOW - 60_000).toISOString() });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F2_STALE_BUT_USABLE', 'RT 60s old → F2');
  assert(!r.rights.includes('LIVE_SCORING_ALLOWED'), 'F2 no LIVE_SCORING');
  assert(r.rights.includes('DISPLAY_ALLOWED'), 'F2 has DISPLAY');
  assert(r.disclosureText != null, 'F2 has disclosure text');
}
{
  const inp = makeInput({ observedTimestamp: new Date(NOW - 200_000).toISOString() });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F3_STALE_AND_CONSTRAINED', 'RT 200s old → F3');
  assert(!r.rights.includes('LIVE_SCORING_ALLOWED'), 'F3 no LIVE_SCORING');
  assert(!r.rights.includes('CONTRADICTION_EVIDENCE_ALLOWED'), 'F3 no CONTRADICTION_EVIDENCE');
  assert(r.rights.includes('DISPLAY_ALLOWED'), 'F3 still DISPLAY');
}
{
  const inp = makeInput({ observedTimestamp: new Date(NOW - 600_000).toISOString() });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F4_UNUSABLE', 'RT 600s old → F4');
  assert(!r.rights.includes('DISPLAY_ALLOWED'), 'F4 no DISPLAY');
  assert(r.rights.includes('AUDIT_ONLY'), 'F4 AUDIT_ONLY');
  assert(r.confidencePenalty === 1.0, 'F4 full penalty');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 6: Scheduled state machine — cadence-based
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 6: Scheduled state transitions ──');
{
  const inp = makeInput({
    sourceClass: 'fundamentals', fieldFamily: 'protocol.tvl', routeMode: 'scheduled',
    observedTimestamp: new Date(NOW - 300_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F0_CURRENT', 'TVL 5min old → F0 (cadence 10min)');
  assert(r.freshnessFamily === 'SCHEDULED', 'Scheduled family');
}
{
  const inp = makeInput({
    sourceClass: 'fundamentals', fieldFamily: 'protocol.tvl', routeMode: 'scheduled',
    observedTimestamp: new Date(NOW - 900_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F1_SLIPPING', 'TVL 15min old → F1 (cadence slipping)');
}
{
  const inp = makeInput({
    sourceClass: 'fundamentals', fieldFamily: 'protocol.tvl', routeMode: 'scheduled',
    observedTimestamp: new Date(NOW - 2_400_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F2_STALE_BUT_USABLE', 'TVL 40min old → F2 (cadence behind)');
}
{
  const inp = makeInput({
    sourceClass: 'fundamentals', fieldFamily: 'protocol.tvl', routeMode: 'scheduled',
    observedTimestamp: new Date(NOW - 7_200_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F3_STALE_AND_CONSTRAINED', 'TVL 2h old → F3');
}
{
  const inp = makeInput({
    sourceClass: 'fundamentals', fieldFamily: 'protocol.tvl', routeMode: 'scheduled',
    observedTimestamp: new Date(NOW - 20_000_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F4_UNUSABLE', 'TVL 5.5h old → F4');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 7: Historical family — no live-age logic
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 7: Historical freshness ──');
{
  const inp = makeInput({
    isBackfill: true, routeMode: 'backfill',
    observedTimestamp: new Date(NOW - 86_400_000 * 365).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F0_CURRENT', 'Historical 1yr old → F0_CURRENT (pinned)');
  assert(r.dominantClock === 'HISTORICAL_PIN', 'Historical dominant clock is HISTORICAL_PIN');
  assert(r.rights.includes('HISTORICAL_REPLAY_ALLOWED'), 'Historical has REPLAY');
  assert(!r.rights.includes('LIVE_SCORING_ALLOWED'), 'Historical no LIVE_SCORING');
}
{
  const inp = makeInput({
    isBackfill: true, routeMode: 'backfill',
    observedTimestamp: undefined,
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F5_UNKNOWN', 'Historical no observed → F5_UNKNOWN');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 8: Unknown clock → F5
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 8: Unknown clock handling ──');
{
  const inp = makeInput({
    observedTimestamp: undefined, publishedTimestamp: undefined,
    timingCompleteness: 'minimal',
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F5_UNKNOWN', 'Minimal timing → F5_UNKNOWN');
  assert(r.dominantClock === 'UNKNOWN', 'Clock is UNKNOWN');
  assert(r.disclosureRequired, 'F5 requires disclosure');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 9: Observed time dominates ingested time
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 9: Observed time dominates ──');
{
  const inp = makeInput({
    observedTimestamp: new Date(NOW - 300_000).toISOString(),
    ingestedTimestamp: new Date(NOW - 1_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.dominantClock === 'OBSERVED', 'OBSERVED dominates even when ingested is fresh');
  assert(r.freshnessState !== 'F0_CURRENT', 'Old observation not F0 despite fresh ingestion');
  assert(r.freshnessState === 'F4_UNUSABLE' || r.freshnessState === 'F3_STALE_AND_CONSTRAINED' || r.freshnessState === 'F2_STALE_BUT_USABLE',
    'Fast ingestion does NOT rescue old observation');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 10: Transport gap escalation
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 10: Transport gap escalation ──');
{
  const inp = makeInput({
    observedTimestamp: new Date(NOW - 3_000).toISOString(),
    ingestedTimestamp: new Date(NOW).toISOString(),
  });
  const a = computeTimingAges(inp, NOW);
  const { state } = applyTransportGapEscalation('F0_CURRENT', a, spotPolicy, []);
  assert(state === 'F0_CURRENT', 'Normal transport gap → no escalation');
}
{
  const inp = makeInput({
    observedTimestamp: new Date(NOW - 3_000).toISOString(),
    ingestedTimestamp: new Date(NOW + 20_000).toISOString(),
  });
  const a = computeTimingAges(inp, NOW);
  const { state, reasons } = applyTransportGapEscalation('F0_CURRENT', a, spotPolicy, []);
  assert(state === 'F1_SLIPPING', 'High transport gap 23s (>3x 5s limit) → F1');
  assert(reasons.some(r => r.includes('TRANSPORT_GAP')), 'Transport gap reason attached');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 11: Claim-usage override
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 11: Claim-usage override ──');
{
  const inp = makeInput({ observedTimestamp: new Date(NOW - 60_000).toISOString() });
  const display = evaluateForUsage(inp, 'DISPLAY', NOW);
  assert(display.freshnessState === 'F2_STALE_BUT_USABLE', 'F2 for stale spot');

  const scoring = evaluateForUsage(
    { ...inp, envelopeId: `env-scoring-${Date.now()}` },
    'LIVE_SCORING', NOW,
  );
  assert(scoring.reasonCodes.some(r => r.includes('USAGE_NOT_PERMITTED')),
    'F2 blocks LIVE_SCORING claim usage');
}
{
  const inp = makeInput({ observedTimestamp: new Date(NOW - 5_000).toISOString() });
  const scenario = evaluateForUsage(inp, 'SCENARIO_CONFIRMATION', NOW);
  assert(!scenario.reasonCodes.some(r => r.includes('USAGE_NOT_PERMITTED')),
    'F0 allows SCENARIO_CONFIRMATION');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 12: Same envelope — different uses, different rights
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 12: Same envelope, different use rights ──');
{
  const base = makeInput({
    sourceClass: 'fundamentals', fieldFamily: 'protocol.tvl', routeMode: 'scheduled',
    observedTimestamp: new Date(NOW - 2_400_000).toISOString(),
  });
  const forDisplay = evaluateForUsage({ ...base, envelopeId: 'tvl-display' }, 'DISPLAY', NOW);
  const forScoring = evaluateForUsage({ ...base, envelopeId: 'tvl-scoring' }, 'LIVE_SCORING', NOW);

  assert(forDisplay.freshnessState === 'F2_STALE_BUT_USABLE', 'TVL 40min → F2');
  assert(!forDisplay.reasonCodes.some(r => r.includes('USAGE_NOT_PERMITTED')), 'F2 allows DISPLAY');
  assert(forScoring.reasonCodes.some(r => r.includes('USAGE_NOT_PERMITTED')),
    'Same F2 TVL blocks LIVE_SCORING — same data, different rights');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 13: Multi-field evaluation
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 13: Multi-field evaluation ──');
{
  const base = {
    envelopeId: 'multi-field-test',
    sourceClass: 'market_data',
    routeMode: 'realtime' as const,
    observedTimestamp: new Date(NOW - 5_000).toISOString(),
    publishedTimestamp: new Date(NOW - 3_000).toISOString(),
    receivedTimestamp: new Date(NOW - 1_000).toISOString(),
    ingestedTimestamp: new Date(NOW).toISOString(),
    timingCompleteness: 'full' as const,
    envelopeKind: 'observation',
    isBackfill: false,
  };
  const results = evaluateMultipleFields(base, ['price.spot', 'derivatives.funding'], NOW);
  assert(results.length === 2, 'Multi-field returns 2 records');
  assert(results[0].fieldFamily === 'price.spot', 'First record is spot');
  assert(results[1].fieldFamily === 'derivatives.funding', 'Second record is funding');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 14: Field-family-specific thresholds differ
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 14: Field-family-specific thresholds ──');
{
  const spotInp = makeInput({
    observedTimestamp: new Date(NOW - 25_000).toISOString(),
  });
  const spotR = evaluateFreshness(spotInp, NOW);

  const labelInp = makeInput({
    sourceClass: 'entity', fieldFamily: 'entity.labels', routeMode: 'scheduled',
    observedTimestamp: new Date(NOW - 25_000).toISOString(),
  });
  const labelR = evaluateFreshness(labelInp, NOW);

  assert(spotR.freshnessState === 'F1_SLIPPING', 'Spot 25s → F1_SLIPPING');
  assert(labelR.freshnessState === 'F0_CURRENT', 'Entity labels 25s → F0_CURRENT (longer cadence)');
  assert(spotR.freshnessState !== labelR.freshnessState,
    'Different field families have different thresholds');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 15: Criticality affects policy selection
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 15: Criticality in policy ──');
{
  const secPolicy = findPolicy('security', 'security.token.flags', 'scheduled');
  assert(secPolicy.criticality === 'MISSION_CRITICAL', 'Security flags are MISSION_CRITICAL');
  const narrPolicy = findPolicy('narrative', 'narrative.attention', 'scheduled');
  assert(narrPolicy.criticality === 'CONTEXTUAL', 'Narrative is CONTEXTUAL');
  assert(secPolicy.currentMaxMs < narrPolicy.staleButUsableMaxMs,
    'Mission-critical has tighter thresholds than contextual');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 16: Edge case — newly ingested but old observation
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 16: Edge cases ──');
{
  const inp = makeInput({
    observedTimestamp: new Date(NOW - 600_000).toISOString(),
    ingestedTimestamp: new Date(NOW).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F4_UNUSABLE', 'Newly ingested but 10min-old observation → F4');
  assert(r.dominantClock === 'OBSERVED', 'Observed clock dominates');
}
{
  const inp = makeInput({
    observedTimestamp: undefined,
    publishedTimestamp: new Date(NOW - 5_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.dominantClock === 'PUBLISHED', 'Missing observed → published dominates');
  assert(r.freshnessState === 'F0_CURRENT' || r.freshnessState === 'F1_SLIPPING',
    'Published 5s ago → still usable');
}
{
  const inp = makeInput({
    isBackfill: true, routeMode: 'backfill',
    observedTimestamp: new Date(NOW - 86_400_000 * 30).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(!r.rights.includes('LIVE_SCORING_ALLOWED'), 'Historical artifact blocked from live scoring');
  assert(r.rights.includes('HISTORICAL_REPLAY_ALLOWED'), 'Historical artifact has REPLAY right');
}
{
  const inp = makeInput({
    sourceClass: 'entity', fieldFamily: 'entity.labels', routeMode: 'scheduled',
    observedTimestamp: new Date(NOW - 1_200_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessState === 'F1_SLIPPING', 'Low-crit enrichment 20min → F1 (lenient cadence)');
  assert(r.rights.includes('DISPLAY_ALLOWED'), 'Slightly stale enrichment still displayable');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 17: Realtime route carrying scheduled snapshot
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 17: Route-mode vs field-family interaction ──');
{
  const inp = makeInput({
    sourceClass: 'fundamentals', fieldFamily: 'protocol.tvl', routeMode: 'scheduled',
    observedTimestamp: new Date(NOW - 300_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessFamily === 'SCHEDULED', 'TVL via scheduled → SCHEDULED family');
  assert(r.freshnessState === 'F0_CURRENT', 'TVL 5min inside cadence → F0');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 18: Evaluation ledger
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 18: Evaluation ledger ──');
{
  const ledger = getEvaluationLedger();
  assert(ledger.length > 10, `Ledger has ${ledger.length} entries`);
  assert(ledger.every(r => r.evaluatedAt.length > 0), 'Every record has evaluatedAt');
  assert(ledger.every(r => r.envelopeId.length > 0), 'Every record has envelopeId');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 19: Summary utilities
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 19: Summary utilities ──');
{
  const inp = makeInput({ observedTimestamp: new Date(NOW - 5_000).toISOString() });
  const r = evaluateFreshness(inp, NOW);
  assert(isUsableForLive(r), 'F0 isUsableForLive');
  assert(isDisplayable(r), 'F0 isDisplayable');

  const inp2 = makeInput({ observedTimestamp: new Date(NOW - 600_000).toISOString() });
  const r2 = evaluateFreshness(inp2, NOW);
  assert(!isUsableForLive(r2), 'F4 not usable for live');
  assert(!isDisplayable(r2), 'F4 not displayable');

  assert(worstState([r, r2]) === 'F4_UNUSABLE', 'worstState returns F4');
  assert(worstState([]) === 'F5_UNKNOWN', 'worstState empty → F5');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 20: Rights per state (policy-level correctness)
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 20: Rights per state from policy ──');
{
  for (const p of getAllPolicies()) {
    const f4rights = p.rightsByState.F4_UNUSABLE;
    assert(!f4rights.includes('LIVE_SCORING_ALLOWED'),
      `Policy ${p.policyId} F4 must not have LIVE_SCORING`);
    assert(!f4rights.includes('DISPLAY_ALLOWED'),
      `Policy ${p.policyId} F4 must not have DISPLAY`);
    assert(!f4rights.includes('SCENARIO_CONFIRMATION_ALLOWED'),
      `Policy ${p.policyId} F4 must not have SCENARIO_CONFIRMATION`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 21: Anti-fake — freshness-rights-honesty
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 21: ANTI-FAKE — freshness-rights-honesty ──');
{
  const ledger = getEvaluationLedger();
  let totalViolations = 0;
  for (const record of ledger) {
    const violations = verifyRightsHonesty(record);
    if (violations.length > 0) {
      totalViolations += violations.length;
      console.error(`  Honesty violation for ${record.envelopeId}: ${violations.join('; ')}`);
    }
  }
  assert(totalViolations === 0,
    `Rights-honesty: 0 violations across ${ledger.length} records (found ${totalViolations})`);
}
{
  const f0 = evaluateFreshness(makeInput({ observedTimestamp: new Date(NOW - 3_000).toISOString() }), NOW);
  assert(verifyRightsHonesty(f0).length === 0, 'F0 is rights-honest');

  const f2 = evaluateFreshness(makeInput({ observedTimestamp: new Date(NOW - 60_000).toISOString() }), NOW);
  assert(verifyRightsHonesty(f2).length === 0, 'F2 is rights-honest');

  const f4 = evaluateFreshness(makeInput({ observedTimestamp: new Date(NOW - 600_000).toISOString() }), NOW);
  assert(verifyRightsHonesty(f4).length === 0, 'F4 is rights-honest');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 22: Anti-fake — rights must change when state changes
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 22: ANTI-FAKE — state change forces rights change ──');
{
  const f0 = evaluateFreshness(makeInput({ observedTimestamp: new Date(NOW - 3_000).toISOString() }), NOW);
  const f4 = evaluateFreshness(makeInput({ observedTimestamp: new Date(NOW - 600_000).toISOString() }), NOW);

  assert(f0.freshnessState !== f4.freshnessState, 'States differ');
  const f0rights = new Set(f0.rights);
  const f4rights = new Set(f4.rights);
  let differ = false;
  for (const r of f0rights) if (!f4rights.has(r)) differ = true;
  for (const r of f4rights) if (!f0rights.has(r)) differ = true;
  assert(differ, 'F0 and F4 must have different rights — state change must change rights');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 23: Penalties are monotonically non-decreasing with degradation
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 23: Penalty monotonicity ──');
{
  const ages = [3_000, 20_000, 60_000, 200_000, 600_000];
  let lastPenalty = -1;
  for (const age of ages) {
    const r = evaluateFreshness(makeInput({
      observedTimestamp: new Date(NOW - age).toISOString(),
    }), NOW);
    assert(r.confidencePenalty >= lastPenalty,
      `Penalty at ${age}ms (${r.confidencePenalty}) >= previous (${lastPenalty})`);
    lastPenalty = r.confidencePenalty;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 24: Disclosure required for every non-F0 state
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 24: Disclosure invariant ──');
{
  const states: Array<{ age: number; expected: boolean }> = [
    { age: 3_000, expected: false },
    { age: 20_000, expected: true },
    { age: 60_000, expected: true },
    { age: 200_000, expected: true },
    { age: 600_000, expected: true },
  ];
  for (const { age, expected } of states) {
    const r = evaluateFreshness(makeInput({
      observedTimestamp: new Date(NOW - age).toISOString(),
    }), NOW);
    assert(r.disclosureRequired === expected,
      `Age ${age}ms → disclosure=${expected} (state=${r.freshnessState})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 25: On-demand freshness
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 25: On-demand freshness ──');
{
  const inp = makeInput({
    sourceClass: 'market_data', fieldFamily: 'price.spot', routeMode: 'on_demand',
    observedTimestamp: new Date(NOW - 60_000).toISOString(),
  });
  const r = evaluateFreshness(inp, NOW);
  assert(r.freshnessFamily === 'SCHEDULED' || r.freshnessFamily === 'REALTIME' || r.freshnessFamily === 'ON_DEMAND',
    'On-demand mapped to valid family');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
if (failed === 0) {
  console.log(`║  ✅ ALL ${passed} TESTS PASSED — L2.2 Freshness Ontology verified     ║`);
} else {
  console.log(`║  ❌ ${failed} FAILED / ${passed} passed                                     ║`);
}
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

if (failed > 0) process.exit(1);
