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

export const availableJudgmentFixture = () => ({
  state: { primary: 'Accumulation' },
  thesis: { primary: { hypothesis: 'Trend reversal in early stage' } },
  contradictions: { items: [{ kind: 'test-contradiction' }] },
  timing: { phase: 'EARLY' },
  scenario: { primary: { summary: 'Base case continuation' } },
  confidence: { overall: 0.62 },
});

export const degradedJudgmentFixture = () => ({
  state: { primary: 'Accumulation' },
  thesis: { primary: { hypothesis: 'Partial-context cautious read' } },
  confidence: { overall: 0.42 },
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
