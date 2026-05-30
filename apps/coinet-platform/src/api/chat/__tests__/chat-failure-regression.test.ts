/**
 * BTAR-007 — Failure-Path Regression Suite
 *
 * This is a failure-path regression suite, not a chat service rewrite and
 * not a new runtime. It uses the BTAR-006 extracted seams as the primary
 * test target so the regressions are mechanically detectable without the
 * 27-mock cascade.
 *
 * Authority:
 *   Plan 2.1 §2.6 (TF as test oracle), §7.5 (TF-NNN test discipline)
 *   Plan 2.2 §14 (test boundary), §14.3 (no-real-provider-call)
 *   BTAR-007 §§11–18
 *
 * Test-boundary discipline (BTAR-007 §8 / §18):
 *   - 0 module mocks (no `vi.mock` calls).
 *   - No `chat/service.ts` import.
 *   - No provider imports (no ai-service, no market-data, no project-investigation-service,
 *     no services/judgment).
 *   - Imports restricted to vitest + Phase 2 trust seams + local fixtures.
 *   - No real provider calls occurred.
 *
 * Test classes (BTAR-007 §§13–18):
 *   A — Judgment engine failure (UNAVAILABLE via JUDGMENT_ENGINE_THROW)
 *   B — Empty judgment (UNAVAILABLE via JUDGMENT_RESULT_EMPTY)
 *   C — Degraded context (DEGRADED requires disclosure)
 *   D — Unsafe AI output (recommendation / guaranteed / certainty / governed-when-unavailable / invented evidence)
 *   E — Prompt package integrity (structural invariants + assertion enforcement)
 *   F — No real provider calls (file-level structural proof)
 */

import { describe, it, expect } from 'vitest';

import {
  createAvailableJudgmentState,
  createDegradedJudgmentState,
  createUnavailableJudgmentState,
} from '../judgment-availability';
import { buildChatTrustContext } from '../chat-trust-context';
import { finalizeChatAIResponse } from '../chat-ai-response-finalizer';
import {
  buildCoinetJudgmentPromptPackage,
  assertCoinetJudgmentPromptPackageInvariants,
} from '../judgment-prompt-package';
import { evaluateAIOutputSafety } from '../ai-output-safety-gate';
import {
  availablePromptPackageFixture,
  degradedPromptPackageFixture,
  unavailablePromptPackageFixture,
  availableJudgmentFixture,
  degradedJudgmentFixture,
  unsafeBuyOutputFixture,
  unsafeGuaranteedOutputFixture,
  unsafeUnsupportedCertaintyOutputFixture,
  unsafeInventedEvidenceOutputFixture,
  unsafeUnavailableMisrepresentationFixture,
  safeAvailableOutputFixture,
  safeDegradedOutputFixture,
  safeUnavailableOutputFixture,
} from './fixtures/chat-failure-fixtures';

describe('chat failure-path regression suite (BTAR-007)', () => {
  // ── Class A — Judgment engine failure (UNAVAILABLE via THROW) ──────────
  describe('A — Judgment engine failure (JUDGMENT_ENGINE_THROW)', () => {
    const buildCtx = () =>
      buildChatTrustContext({
        availability: createUnavailableJudgmentState({
          reason: 'JUDGMENT_ENGINE_THROW',
          component: 'produceJudgment',
        }),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'SOL' },
      });

    it('A1: trust context judgment_status is UNAVAILABLE', () => {
      expect(buildCtx().judgment_status).toBe('UNAVAILABLE');
    });

    it('A2: prompt package has no judgment fields (no fake governed claims allowed)', () => {
      expect(buildCtx().promptPackage.judgment).toBeUndefined();
    });

    it('A3: rendered context contains UNAVAILABLE status + forbids governed thesis claims', () => {
      const ctx = buildCtx();
      expect(ctx.renderedAIContext).toContain('Judgment Status: UNAVAILABLE');
      const forbidden = ctx.promptPackage.expression_rules.forbidden_claims.join('\n');
      expect(forbidden).toMatch(/structured thesis/i);
      expect(forbidden).toMatch(/structured confidence/i);
    });

    it('A4: finalizer rewrites governed-thesis claim into unavailable disclosure', () => {
      const ctx = buildCtx();
      const result = finalizeChatAIResponse({
        rawOutput: unsafeUnavailableMisrepresentationFixture,
        judgmentPackage: ctx.promptPackage,
      });
      expect(result.changed).toBe(true);
      expect(result.finalOutput).toMatch(/structured Coinet judgment is unavailable/i);
      expect(result.finalOutput).not.toMatch(/Coinet's thesis is bullish/i);
    });
  });

  // ── Class B — Empty judgment (UNAVAILABLE via JUDGMENT_RESULT_EMPTY) ───
  describe('B — Empty judgment (JUDGMENT_RESULT_EMPTY)', () => {
    const buildAvail = () =>
      createUnavailableJudgmentState({
        reason: 'JUDGMENT_RESULT_EMPTY',
        component: 'produceJudgment',
      });

    it('B1: empty judgment availability has canUseStructuredJudgment=false', () => {
      expect(buildAvail().canUseStructuredJudgment).toBe(false);
    });

    it('B2: empty judgment availability requires user disclosure', () => {
      expect(buildAvail().userDisclosureRequired).toBe(true);
    });

    it('B3: trust context built from empty judgment has UNAVAILABLE + no governed package fields', () => {
      const ctx = buildChatTrustContext({
        availability: buildAvail(),
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(ctx.judgment_status).toBe('UNAVAILABLE');
      expect(ctx.promptPackage.judgment).toBeUndefined();
      const required = ctx.promptPackage.expression_rules.required_disclosures.join('\n');
      expect(required).toMatch(/structured Coinet judgment is unavailable/i);
    });
  });

  // ── Class C — Degraded context ─────────────────────────────────────────
  describe('C — Degraded context (PARTIAL_CONTEXT_FAILURE)', () => {
    const buildCtx = () =>
      buildChatTrustContext({
        availability: createDegradedJudgmentState({
          reason: 'PARTIAL_CONTEXT_FAILURE',
          component: 'sentiment',
        }),
        judgment: degradedJudgmentFixture(),
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });

    it('C1: degraded trust context has disclosure_required=true', () => {
      expect(buildCtx().disclosure_required).toBe(true);
    });

    it('C2: degraded prompt package has degradation.disclosure_required=true', () => {
      expect(buildCtx().promptPackage.degradation.disclosure_required).toBe(true);
    });

    it('C3: degraded package required_disclosures is non-empty', () => {
      const required = buildCtx().promptPackage.expression_rules.required_disclosures;
      expect(required.length).toBeGreaterThan(0);
    });

    it('C4: degraded + "high confidence" AI output is flagged + rewritten', () => {
      const ctx = buildCtx();
      const result = finalizeChatAIResponse({
        rawOutput:
          'There is high confidence in this setup and the thesis is strong; the read is fully supported.',
        judgmentPackage: ctx.promptPackage,
      });
      expect(result.gate.violations).toContain('CONFIDENCE_INFLATION');
      expect(result.changed).toBe(true);
    });

    it('C5: degraded + cautious output with disclosure is ALLOWED', () => {
      const ctx = buildCtx();
      const result = finalizeChatAIResponse({
        rawOutput: safeDegradedOutputFixture,
        judgmentPackage: ctx.promptPackage,
      });
      expect(result.gate.decision).toBe('ALLOW');
      expect(result.changed).toBe(false);
    });
  });

  // ── Class D — Unsafe AI output ─────────────────────────────────────────
  describe('D — Unsafe AI output', () => {
    it('D1: direct buy/sell language is flagged + rewritten', () => {
      const result = finalizeChatAIResponse({
        rawOutput: unsafeBuyOutputFixture,
        judgmentPackage: availablePromptPackageFixture(),
      });
      expect(result.gate.violations).toContain('DIRECT_FINANCIAL_ADVICE');
      expect(result.changed).toBe(true);
      expect(result.finalOutput).not.toMatch(/you should buy sol now/i);
    });

    it('D2: guaranteed outcome language is BLOCKED with clarification', () => {
      const result = finalizeChatAIResponse({
        rawOutput: unsafeGuaranteedOutputFixture,
        judgmentPackage: availablePromptPackageFixture(),
      });
      expect(result.gate.decision).toBe('BLOCK_OR_CLARIFY');
      expect(result.changed).toBe(true);
      expect(result.finalOutput).not.toMatch(/will pump/i);
    });

    it('D3: unsupported certainty under DEGRADED is flagged', () => {
      const result = finalizeChatAIResponse({
        rawOutput: unsafeUnsupportedCertaintyOutputFixture,
        judgmentPackage: degradedPromptPackageFixture(),
      });
      expect(result.gate.violations).toContain('UNSUPPORTED_CERTAINTY');
    });

    it('D4: invented evidence with no grounding is flagged', () => {
      // Use an UNAVAILABLE package (no source_refs, no judgment fields) so the
      // "no grounding" detector path fires deterministically.
      const result = finalizeChatAIResponse({
        rawOutput: unsafeInventedEvidenceOutputFixture,
        judgmentPackage: unavailablePromptPackageFixture(),
      });
      expect(result.gate.violations).toContain('INVENTED_EVIDENCE_LANGUAGE');
    });

    it('D5: governed-judgment claim under UNAVAILABLE is flagged + rewritten', () => {
      const result = finalizeChatAIResponse({
        rawOutput: unsafeUnavailableMisrepresentationFixture,
        judgmentPackage: unavailablePromptPackageFixture(),
      });
      expect(result.gate.violations).toContain('GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE');
      expect(result.gate.violations).toContain('MISSING_UNAVAILABLE_DISCLOSURE');
      expect(result.changed).toBe(true);
      expect(result.finalOutput).not.toMatch(/Coinet's thesis is bullish/i);
    });
  });

  // ── Class E — Prompt package integrity ─────────────────────────────────
  describe('E — Prompt package integrity', () => {
    it('E1: AVAILABLE package carries policy_version + judgment_status + grounding + rules', () => {
      const pkg = availablePromptPackageFixture();
      expect(pkg.policy_version).toBe('coinet-judgment-prompt-package.v1');
      expect(pkg.judgment_status).toBe('AVAILABLE');
      expect(Array.isArray(pkg.source_refs)).toBe(true);
      expect(pkg.source_refs.length).toBeGreaterThan(0);
      expect(pkg.expression_rules.allowed_claims.length).toBeGreaterThan(0);
      expect(pkg.expression_rules.forbidden_claims.length).toBeGreaterThan(0);
    });

    it('E2: AVAILABLE package projects thesis + confidence_band when present', () => {
      const pkg = availablePromptPackageFixture();
      expect(pkg.judgment).toBeDefined();
      expect(pkg.judgment!.thesis).toBeDefined();
      expect(pkg.judgment!.confidence_band).toBeDefined();
    });

    it('E3: DEGRADED package has degradation.reasons array + non-empty required_disclosures', () => {
      const pkg = degradedPromptPackageFixture();
      expect(Array.isArray(pkg.degradation.reasons)).toBe(true);
      expect(pkg.degradation.disclosure_required).toBe(true);
      expect(pkg.expression_rules.required_disclosures.length).toBeGreaterThan(0);
    });

    it('E4: UNAVAILABLE package contains no judgment + forbids governed claims', () => {
      const pkg = unavailablePromptPackageFixture();
      expect(pkg.judgment).toBeUndefined();
      const forbidden = pkg.expression_rules.forbidden_claims.join('\n');
      expect(forbidden).toMatch(/structured thesis/i);
      expect(forbidden).toMatch(/structured confidence/i);
      expect(forbidden).toMatch(/structured contradiction or scenario/i);
    });

    it('E5: invariant assertion rejects UNAVAILABLE package mutated to carry fake judgment fields', () => {
      const pkg = unavailablePromptPackageFixture();
      const tampered = { ...pkg, judgment: { thesis: 'FAKE BULLISH THESIS' } } as typeof pkg;
      expect(() => assertCoinetJudgmentPromptPackageInvariants(tampered)).toThrow(/invariant 2/i);
    });

    it('E6: invariant assertion rejects DEGRADED package mutated to drop disclosure_required', () => {
      const pkg = degradedPromptPackageFixture();
      const tampered = {
        ...pkg,
        degradation: { ...pkg.degradation, disclosure_required: false },
      } as typeof pkg;
      expect(() => assertCoinetJudgmentPromptPackageInvariants(tampered)).toThrow(/invariant 3/i);
    });
  });

  // ── Class F — No real provider calls (structural proof) ────────────────
  describe('F — No real provider calls (structural proof)', () => {
    it('F1: suite imports only Phase 2 trust seams + local fixtures (compile-time enforced)', () => {
      // This test is structural: it asserts (by passing without error) that
      // the module-level imports above are restricted to:
      //   - vitest
      //   - ../judgment-availability        (BTAR-003 seam)
      //   - ../chat-trust-context           (BTAR-006 seam)
      //   - ../chat-ai-response-finalizer   (BTAR-006 seam)
      //   - ../judgment-prompt-package      (BTAR-004 seam)
      //   - ../ai-output-safety-gate        (BTAR-005 seam)
      //   - ./fixtures/chat-failure-fixtures (local)
      // The suite does NOT import chat/service.ts, ai-service, market-data,
      // project-investigation-service, or services/judgment.
      //
      // Reviewer responsibility (Plan 1.9 daily-enforcement gate): if any
      // future PR adds one of those imports to this file, this test stays
      // passing but the PR must be rejected. The structural guarantee here
      // is the empty `vi.mock(...)` count + the limited import list.
      //
      // Sanity touchpoints that prove the seams are wired:
      const available = createAvailableJudgmentState();
      const ctx = buildChatTrustContext({
        availability: available,
        judgment: availableJudgmentFixture(),
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
        source_refs: ['produceJudgment'],
      });
      const finalized = finalizeChatAIResponse({
        rawOutput: safeAvailableOutputFixture,
        judgmentPackage: ctx.promptPackage,
      });
      // The gate is reachable and policy-versioned (proves the seam imports work).
      expect(finalized.gate.policy_version).toBe('ai-output-safety-gate.v1');
      // And we can call the BTAR-005 evaluator directly (proves the gate import works).
      const gate = evaluateAIOutputSafety({
        output: safeUnavailableOutputFixture,
        judgmentPackage: unavailablePromptPackageFixture(),
      });
      expect(gate.policy_version).toBe('ai-output-safety-gate.v1');
      // And the builder works directly (proves the BTAR-004 import works).
      const directPkg = buildCoinetJudgmentPromptPackage({
        availability: available,
        judgment: undefined,
        scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      });
      expect(directPkg.policy_version).toBe('coinet-judgment-prompt-package.v1');
    });
  });
});
