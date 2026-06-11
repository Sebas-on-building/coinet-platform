/**
 * BTAR-005 — AI Output Safety / Expression Gate Unit Tests
 *
 * Authority:
 *   Plan 2.1 §2.4 / §7 (TF taxonomy)
 *   Plan 2.2 §14 (test boundary) / §14.3 (no-real-provider-call)
 *   BTAR-005 §13.1 (this test file)
 *
 * Test boundary discipline (Plan 2.2 §14.3):
 *   No real provider calls occurred. This file exercises only the pure
 *   deterministic gate. No chat-service import. No AI-service import. No
 *   external-API client.
 */

import { describe, it, expect } from 'vitest';

import {
  evaluateAIOutputSafety,
  applyAIOutputSafetyGate,
  buildSafeOutputFromGateResult,
  detectDirectFinancialAdvice,
  detectGuaranteedOutcomeLanguage,
  detectUnsupportedCertainty,
  detectUnavailableJudgmentMisrepresentation,
} from '../ai-output-safety-gate';
import { buildCoinetJudgmentPromptPackage } from '../judgment-prompt-package';
import {
  createAvailableJudgmentState,
  createDegradedJudgmentState,
  createUnavailableJudgmentState,
} from '../judgment-availability';

const availablePkg = () =>
  buildCoinetJudgmentPromptPackage({
    availability: createAvailableJudgmentState(),
    judgment: {
      state: { primary: 'Accumulation' },
      thesis: { primary: { hypothesis: 'Trend reversal in early stage' } },
      confidence: { overall: 0.62 },
    },
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: ['produceJudgment'],
  });

const availablePkgNoGrounding = () =>
  buildCoinetJudgmentPromptPackage({
    availability: createAvailableJudgmentState(),
    judgment: undefined,
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: [],
  });

const degradedPkg = () =>
  buildCoinetJudgmentPromptPackage({
    availability: createDegradedJudgmentState({
      reason: 'PARTIAL_CONTEXT_FAILURE',
      component: 'sentiment',
    }),
    judgment: undefined,
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: [],
  });

const unavailablePkg = () =>
  buildCoinetJudgmentPromptPackage({
    availability: createUnavailableJudgmentState({
      reason: 'JUDGMENT_ENGINE_THROW',
      component: 'produceJudgment',
    }),
    judgment: undefined,
    scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    source_refs: [],
  });

describe('AI output safety gate (BTAR-005)', () => {
  // ── ALLOW path ─────────────────────────────────────────────────────────
  describe('ALLOW path', () => {
    it('allows careful AVAILABLE thesis language with disclaimer', () => {
      const result = evaluateAIOutputSafety({
        output:
          "Coinet's current read is constructive, but confidence depends on continued spot demand. This is not a recommendation to buy or sell.",
        judgmentPackage: availablePkg(),
      });
      expect(result.decision).toBe('ALLOW');
      expect(result.violations).toEqual([]);
    });

    it('allows UNAVAILABLE answer with proper unavailable disclosure', () => {
      const result = evaluateAIOutputSafety({
        output:
          "I can't present a governed Coinet thesis right now because structured Coinet judgment is unavailable. I can give general context.",
        judgmentPackage: unavailablePkg(),
      });
      expect(result.decision).toBe('ALLOW');
    });

    it('allows DEGRADED answer that discloses degradation', () => {
      const result = evaluateAIOutputSafety({
        output:
          "Coinet's read is partially degraded and confidence is limited. The available context suggests caution.",
        judgmentPackage: degradedPkg(),
      });
      expect(result.decision).toBe('ALLOW');
    });
  });

  // ── BLOCK / REWRITE: direct financial advice ───────────────────────────
  describe('DIRECT_FINANCIAL_ADVICE', () => {
    it('flags "you should buy SOL now"', () => {
      const result = evaluateAIOutputSafety({
        output: 'You should buy SOL now. The setup looks strong.',
        judgmentPackage: availablePkg(),
      });
      expect(result.violations).toContain('DIRECT_FINANCIAL_ADVICE');
      expect(result.decision).toBe('REWRITE_REQUIRED');
      expect(result.safe_output).toBeDefined();
    });

    it('flags "sell now"', () => {
      expect(detectDirectFinancialAdvice('Sell now while you still can.')).toBe(true);
    });

    it('does NOT flag "this is not a recommendation to buy or sell"', () => {
      expect(
        detectDirectFinancialAdvice(
          'This is not a recommendation to buy or sell. It is educational context.',
        ),
      ).toBe(false);
    });
  });

  // ── BLOCK: guaranteed outcomes ─────────────────────────────────────────
  describe('GUARANTEED_OUTCOME_LANGUAGE', () => {
    it('flags "will pump"', () => {
      const result = evaluateAIOutputSafety({
        output: 'SOL will pump tomorrow.',
        judgmentPackage: availablePkg(),
      });
      expect(result.violations).toContain('GUARANTEED_OUTCOME_LANGUAGE');
      expect(result.decision).toBe('BLOCK_OR_CLARIFY');
      expect(result.safe_output).toBeDefined();
    });

    it('flags "guaranteed"', () => {
      expect(detectGuaranteedOutcomeLanguage('Guaranteed 5x by end of month.')).toBe(true);
    });
  });

  // ── UNSUPPORTED_CERTAINTY ──────────────────────────────────────────────
  describe('UNSUPPORTED_CERTAINTY under DEGRADED', () => {
    it('flags "Coinet is certain" under DEGRADED', () => {
      const result = evaluateAIOutputSafety({
        output: 'Coinet is certain about this read. The thesis is confirmed.',
        judgmentPackage: degradedPkg(),
      });
      expect(result.violations).toContain('UNSUPPORTED_CERTAINTY');
    });

    it('detector triggers on "high conviction"', () => {
      expect(detectUnsupportedCertainty('There is high conviction here.')).toBe(true);
    });
  });

  // ── MISSING DISCLOSURES ────────────────────────────────────────────────
  describe('MISSING_DEGRADATION_DISCLOSURE', () => {
    it('DEGRADED + plain answer flags the missing disclosure but does NOT clobber (warns)', () => {
      const result = evaluateAIOutputSafety({
        output: 'The market is looking constructive for BTC over the next week.',
        judgmentPackage: degradedPkg(),
      });
      // Phase 2.5: a disclosure-only miss (no substantive violation) is now a
      // logged warning, not a canned-string replacement — so a compliant
      // (often non-English) answer survives. Substance stays hard (below).
      expect(result.violations).toContain('MISSING_DEGRADATION_DISCLOSURE');
      expect(result.decision).toBe('ALLOW_WITH_WARNINGS');
      expect(result.safe_output).toBeUndefined();
    });
  });

  describe('MISSING_UNAVAILABLE_DISCLOSURE + GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE', () => {
    it('UNAVAILABLE + plain thesis flags both missing-disclosure and governed-claim', () => {
      const result = evaluateAIOutputSafety({
        output: "Coinet's thesis is bullish on SOL with high confidence.",
        judgmentPackage: unavailablePkg(),
      });
      expect(result.violations).toContain('MISSING_UNAVAILABLE_DISCLOSURE');
      expect(result.violations).toContain('GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE');
      expect(result.decision).toBe('REWRITE_REQUIRED');
      expect(result.safe_output).toBeDefined();
    });

    it('UNAVAILABLE detector forbids governed thesis claims', () => {
      expect(
        detectUnavailableJudgmentMisrepresentation(
          "Coinet's thesis is that BTC is in accumulation.",
          unavailablePkg(),
        ),
      ).toBe(true);
    });

    it('UNAVAILABLE detector forbids "the structured judgment shows"', () => {
      expect(
        detectUnavailableJudgmentMisrepresentation(
          'The structured judgment shows a bullish setup.',
          unavailablePkg(),
        ),
      ).toBe(true);
    });
  });

  // ── CONFIDENCE_INFLATION ───────────────────────────────────────────────
  describe('CONFIDENCE_INFLATION', () => {
    it('DEGRADED + "high confidence" flags inflation', () => {
      const result = evaluateAIOutputSafety({
        output:
          'There is high confidence in this setup. Degraded though it may be, the read is strong.',
        judgmentPackage: degradedPkg(),
      });
      expect(result.violations).toContain('CONFIDENCE_INFLATION');
    });
  });

  // ── INVENTED_EVIDENCE_LANGUAGE ─────────────────────────────────────────
  describe('INVENTED_EVIDENCE_LANGUAGE', () => {
    it('AVAILABLE package with no source_refs + "on-chain confirms" flags invented evidence', () => {
      const result = evaluateAIOutputSafety({
        output: 'On-chain data confirms heavy whale accumulation in the past 24h.',
        judgmentPackage: availablePkgNoGrounding(),
      });
      expect(result.violations).toContain('INVENTED_EVIDENCE_LANGUAGE');
    });

    it('AVAILABLE package WITH grounding does NOT flag', () => {
      const result = evaluateAIOutputSafety({
        output: 'On-chain data confirms heavy whale accumulation.',
        judgmentPackage: availablePkg(), // has source_refs + judgment fields
      });
      expect(result.violations).not.toContain('INVENTED_EVIDENCE_LANGUAGE');
    });
  });

  // ── Safe rewrite ───────────────────────────────────────────────────────
  describe('Safe rewriter', () => {
    it('produces deterministic safe_output for direct financial advice', () => {
      const input = {
        output: 'You should buy SOL now.',
        judgmentPackage: availablePkg(),
      };
      const result1 = evaluateAIOutputSafety(input);
      const result2 = evaluateAIOutputSafety(input);
      expect(result1.safe_output).toBe(result2.safe_output);
      expect(result1.safe_output).toMatch(/can'?t provide buy or sell instructions/i);
    });

    it('produces canonical unavailable rewrite for governed-claim-while-unavailable', () => {
      const input = {
        output: "Coinet's thesis is bullish on SOL.",
        judgmentPackage: unavailablePkg(),
      };
      const result = evaluateAIOutputSafety(input);
      expect(result.safe_output).toMatch(/structured Coinet judgment is unavailable/i);
    });

    it('produces cautious degraded rewrite when a SUBSTANTIVE violation co-occurs under DEGRADED', () => {
      // Disclosure-only no longer clobbers, so to exercise the DEGRADED rewrite
      // we need a substantive violation (confidence inflation) alongside it.
      const input = {
        output: 'BTC is set up for a strong move higher with high confidence.',
        judgmentPackage: degradedPkg(),
      };
      const result = evaluateAIOutputSafety(input);
      expect(result.violations).toContain('CONFIDENCE_INFLATION');
      expect(result.decision).toBe('REWRITE_REQUIRED');
      expect(result.safe_output).toMatch(/partially degraded/i);
    });

    it('returns undefined safe_output for ALLOW decisions', () => {
      const safe = buildSafeOutputFromGateResult(
        {
          output: 'Constructive read, not a recommendation.',
          judgmentPackage: availablePkg(),
        },
        {
          decision: 'ALLOW',
          reasons: [],
          violations: [],
          required_edits: [],
          policy_version: 'ai-output-safety-gate.v1',
        },
      );
      expect(safe).toBeUndefined();
    });
  });

  // ── Result envelope ────────────────────────────────────────────────────
  describe('Result envelope', () => {
    it('returns policy_version ai-output-safety-gate.v1', () => {
      const result = evaluateAIOutputSafety({
        output: 'Constructive read; this is not a recommendation.',
        judgmentPackage: availablePkg(),
      });
      expect(result.policy_version).toBe('ai-output-safety-gate.v1');
    });

    it('returns structured violations[] array always', () => {
      const result = evaluateAIOutputSafety({
        output: 'Hello.',
        judgmentPackage: availablePkg(),
      });
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('applyAIOutputSafetyGate substitutes safe_output when present', () => {
      const { output } = applyAIOutputSafetyGate({
        output: 'You should buy SOL now.',
        judgmentPackage: availablePkg(),
      });
      expect(output).not.toMatch(/you should buy sol now/i);
    });

    it('applyAIOutputSafetyGate passes through when ALLOW', () => {
      const original = "Coinet's current read is constructive. This is not a recommendation to buy or sell.";
      const { output } = applyAIOutputSafetyGate({
        output: original,
        judgmentPackage: availablePkg(),
      });
      expect(output).toBe(original);
    });
  });

  // ── Phase 2.5: disclosure-only relaxation + multilingual hardening ──────────
  // The disclosure clobber is relaxed so a compliant in-language mentor answer
  // survives — but ONLY after the substantive detectors are hardened so a fake
  // claim / buy-sell directive / guarantee in another language still gets caught.
  describe('disclosure-only relaxation (no clobber)', () => {
    it('UNAVAILABLE + German compliant scope answer → ALLOW_WITH_WARNINGS, not clobbered', () => {
      const result = evaluateAIOutputSafety({
        // honest scope + regime context in German, NO governed thesis claim
        output:
          'Ich erstelle noch kein vollständiges Markturteil — meine Urteile sind pro Token. Fear & Greed steht bei 14/100, BTC dominance 58%. Ob du generell kaufst, ist deine Entscheidung.',
        judgmentPackage: unavailablePkg(),
      });
      expect(result.violations).toContain('MISSING_UNAVAILABLE_DISCLOSURE');
      expect(result.violations).not.toContain('GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE');
      expect(result.decision).toBe('ALLOW_WITH_WARNINGS');
      expect(result.safe_output).toBeUndefined();
    });

    it('UNAVAILABLE + English mentor scope phrasing → ALLOW (disclosure recognized)', () => {
      const result = evaluateAIOutputSafety({
        output:
          "I don't produce a full market verdict yet — my judgments are per-token. Fear & Greed is 14/100.",
        judgmentPackage: unavailablePkg(),
      });
      expect(result.decision).toBe('ALLOW');
    });
  });

  describe('multilingual hardening — substance still caught in other languages', () => {
    it('German governed-thesis claim under UNAVAILABLE → still REWRITE', () => {
      const result = evaluateAIOutputSafety({
        output: 'Coinets These ist bullisch für den Gesamtmarkt.',
        judgmentPackage: unavailablePkg(),
      });
      expect(result.violations).toContain('GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE');
      expect(result.decision).toBe('REWRITE_REQUIRED');
      expect(result.safe_output).toBeDefined();
    });

    it('German "kauf jetzt" direct advice → still caught', () => {
      expect(detectDirectFinancialAdvice('Kauf jetzt, bevor es zu spät ist.')).toBe(true);
      expect(detectDirectFinancialAdvice('Du solltest jetzt verkaufen.')).toBe(true);
    });

    it('German guarantee language → still caught (block)', () => {
      const result = evaluateAIOutputSafety({
        output: 'Der Markt wird steigen, garantiert.',
        judgmentPackage: availablePkg(),
      });
      expect(result.violations).toContain('GUARANTEED_OUTCOME_LANGUAGE');
      expect(result.decision).toBe('BLOCK_OR_CLARIFY');
    });

    it('Spanish / French / Turkish direct advice → caught', () => {
      expect(detectDirectFinancialAdvice('Compra ahora, no esperes.')).toBe(true);
      expect(detectDirectFinancialAdvice('Achète maintenant.')).toBe(true);
      expect(detectDirectFinancialAdvice('Şimdi al!')).toBe(true);
    });
  });
});
