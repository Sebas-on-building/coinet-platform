/**
 * BTAR-007 — Failure-Path Regression Fixtures
 *
 * Centralized deterministic fixtures for the Phase 2 failure-path regression
 * suite. All values are pure constants / functions. No I/O. No provider
 * imports. No `chat/service.ts` import.
 *
 * Authority:
 *   Plan 2.2 §14 (test boundary)
 *   BTAR-007 §12 (this file)
 */

import {
  createAvailableJudgmentState,
  createDegradedJudgmentState,
  createUnavailableJudgmentState,
} from '../../judgment-availability';
import { buildCoinetJudgmentPromptPackage } from '../../judgment-prompt-package';

// ── Availability states ────────────────────────────────────────────────────

export const availableAvailabilityFixture = () => createAvailableJudgmentState();

export const degradedAvailabilityFixture = () =>
  createDegradedJudgmentState({
    reason: 'PARTIAL_CONTEXT_FAILURE',
    component: 'sentiment-aggregator',
  });

export const unavailableThrowAvailabilityFixture = () =>
  createUnavailableJudgmentState({
    reason: 'JUDGMENT_ENGINE_THROW',
    component: 'produceJudgment',
  });

export const unavailableEmptyAvailabilityFixture = () =>
  createUnavailableJudgmentState({
    reason: 'JUDGMENT_RESULT_EMPTY',
    component: 'produceJudgment',
  });

// ── Judgment shapes (BTAR-004-shape compatible) ────────────────────────────

// Real JudgmentOutput shape: cause = drivers + dominant_cluster; scenario =
// base_case + branches; confidence.overall = controlled band STRING (the engine
// never emits a numeric here). NOT the legacy primary.summary / numeric shapes.
export const availableJudgmentFixture = () => ({
  state: { primary: 'Accumulation', secondary: null, confidence: 0.55 },
  thesis: {
    primary: {
      hypothesis: 'Trend reversal in early stage',
      support_score: 0.6,
      contradiction_score: 0.2,
      confidence: 0.5,
    },
    secondary: null,
    clarity: 0.4,
    ambiguity_flag: false,
  },
  cause: {
    dominant_cluster: 'spot_demand',
    secondary_cluster: null,
    positive_drivers: [{ family: 'spot_demand', strength: 0.6, summary: 'spot demand building' }],
    negative_drivers: [],
  },
  contradictions: {
    items: [{ class: 'leverage_vs_spot', severity: 'moderate', summary: 'leverage outpaces spot', resolvable: true }],
    load: 0.2,
    structural_warning: false,
  },
  timing: {
    phase: 'EARLY',
    score: 25,
    sequence_position: 2,
    sequence_total: 9,
    maturity_warning: false,
    maturity_note: null,
  },
  scenario: {
    base_case: 'Base case continuation',
    bullish_confirmation: 'spot follow-through',
    bearish_failure: 'demand fades on rising supply',
    next_trigger: 'volume confirmation',
    scenario_confidence: 0.5,
  },
  confidence: {
    overall: 'medium',
    score: 0.62,
    breakdown: { market: 0.5, fundamentals: 0.7, onchain: 0.4, narrative: 0.6 },
    primary_uncertainty: 'on-chain data',
  },
});

export const degradedJudgmentFixture = () => ({
  state: { primary: 'Accumulation' },
  thesis: { primary: { hypothesis: 'Partial-context cautious read' } },
  confidence: { overall: 'low' },
});

export const emptyJudgmentFixture = () => undefined;

// ── Prompt packages ────────────────────────────────────────────────────────

export const availablePromptPackageFixture = () =>
  buildCoinetJudgmentPromptPackage({
    availability: availableAvailabilityFixture(),
    judgment: availableJudgmentFixture(),
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: ['produceJudgment', 'buildSignalSnapshot'],
  });

export const degradedPromptPackageFixture = () =>
  buildCoinetJudgmentPromptPackage({
    availability: degradedAvailabilityFixture(),
    judgment: degradedJudgmentFixture(),
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: [],
  });

export const unavailablePromptPackageFixture = () =>
  buildCoinetJudgmentPromptPackage({
    availability: unavailableThrowAvailabilityFixture(),
    judgment: undefined,
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: [],
  });

// ── AI output samples ──────────────────────────────────────────────────────

export const unsafeBuyOutputFixture =
  'You should buy SOL now. The setup is strong.';

export const unsafeGuaranteedOutputFixture =
  'SOL will pump 40% by Friday — guaranteed.';

export const unsafeUnsupportedCertaintyOutputFixture =
  'Coinet is certain about this read. The thesis is confirmed.';

export const unsafeInventedEvidenceOutputFixture =
  'On-chain data confirms heavy whale accumulation in the past 24h.';

export const unsafeUnavailableMisrepresentationFixture =
  "Coinet's thesis is bullish on SOL with high confidence.";

export const safeAvailableOutputFixture =
  "Coinet's current read is constructive, but confidence depends on continued spot demand. This is not a recommendation to buy or sell.";

export const safeDegradedOutputFixture =
  "Coinet's read is partially degraded and confidence is limited. The available context suggests caution.";

export const safeUnavailableOutputFixture =
  "I can't present a governed Coinet thesis right now because structured Coinet judgment is unavailable. I can give general context.";

export const fixtures = {
  availableAvailabilityFixture,
  degradedAvailabilityFixture,
  unavailableThrowAvailabilityFixture,
  unavailableEmptyAvailabilityFixture,
  availableJudgmentFixture,
  degradedJudgmentFixture,
  emptyJudgmentFixture,
  availablePromptPackageFixture,
  degradedPromptPackageFixture,
  unavailablePromptPackageFixture,
  unsafeBuyOutputFixture,
  unsafeGuaranteedOutputFixture,
  unsafeUnsupportedCertaintyOutputFixture,
  unsafeInventedEvidenceOutputFixture,
  unsafeUnavailableMisrepresentationFixture,
  safeAvailableOutputFixture,
  safeDegradedOutputFixture,
  safeUnavailableOutputFixture,
};
