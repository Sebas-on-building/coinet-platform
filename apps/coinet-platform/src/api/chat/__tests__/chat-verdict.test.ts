/**
 * chat-verdict — Unit tests for toChatVerdict()
 *
 * Pure unit tests of the deterministic package→DTO projection. No chat-service
 * import, no AI-service import, no external-API client. The governance invariant
 * (UNAVAILABLE → no fields) is asserted both through the real builder and via a
 * pathological hand-built package, so a future builder change can't leak fields.
 */

import { describe, it, expect } from 'vitest';

import { toChatVerdict } from '../chat-verdict';
import { buildCoinetJudgmentPromptPackage } from '../judgment-prompt-package';
import {
  createAvailableJudgmentState,
  createDegradedJudgmentState,
  createUnavailableJudgmentState,
} from '../judgment-availability';
import type { CoinetJudgmentPromptPackage } from '../judgment-prompt-package.types';

const FULL_JUDGMENT = {
  state: { primary: 'thin_liquidity_risk' },
  thesis: { primary: { hypothesis: 'leverage_driven_squeeze' } },
  cause: { primary: { summary: 'forced de-leveraging into thin books' } },
  contradictions: { items: [{}] },
  timing: { phase: 'LATE' },
  scenario: { primary: { summary: 'continuation risk if support breaks' } },
  confidence: { overall: 0.2 },
};

describe('toChatVerdict', () => {
  describe('AVAILABLE', () => {
    const pkg = buildCoinetJudgmentPromptPackage({
      availability: createAvailableJudgmentState(),
      judgment: FULL_JUDGMENT,
      scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      source_refs: ['produceJudgment', 'buildSignalSnapshot'],
    });
    const verdict = toChatVerdict(pkg);

    it('carries AVAILABLE status, symbol, and policy version', () => {
      expect(verdict.status).toBe('AVAILABLE');
      expect(verdict.symbol).toBe('BTC');
      expect(verdict.policyVersion).toBe('coinet-judgment-prompt-package.v1');
    });

    it('projects the structured judgment fields', () => {
      expect(verdict.fields).toBeDefined();
      expect(verdict.fields?.state).toBe('thin_liquidity_risk');
      expect(verdict.fields?.thesis).toBe('leverage_driven_squeeze');
      expect(verdict.fields?.cause).toContain('de-leveraging');
      expect(verdict.fields?.contradiction_summary).toContain('contradiction');
      expect(verdict.fields?.timing_phase).toBe('LATE');
      expect(verdict.fields?.scenario_summary).toContain('continuation');
      expect(verdict.fields?.confidence_band).toBeTruthy();
    });

    it('does not leak internal package fields', () => {
      expect(verdict).not.toHaveProperty('package_id');
      expect(verdict).not.toHaveProperty('expression_rules');
      expect(verdict).not.toHaveProperty('source_refs');
    });
  });

  describe('UNAVAILABLE (governance invariant)', () => {
    const pkg = buildCoinetJudgmentPromptPackage({
      availability: createUnavailableJudgmentState({
        reason: 'JUDGMENT_RESULT_EMPTY',
        component: 'produceJudgment',
      }),
      judgment: undefined,
      scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    });
    const verdict = toChatVerdict(pkg);

    it('reports UNAVAILABLE with NO judgment fields', () => {
      expect(verdict.status).toBe('UNAVAILABLE');
      expect(verdict.fields).toBeUndefined();
    });

    it('surfaces required disclosures for the client', () => {
      expect(verdict.disclosures?.length ?? 0).toBeGreaterThan(0);
      expect(verdict.disclosures?.join(' ')).toMatch(/unavailable/i);
    });
  });

  describe('DEGRADED', () => {
    const pkg = buildCoinetJudgmentPromptPackage({
      availability: createDegradedJudgmentState({
        reason: 'PARTIAL_CONTEXT_FAILURE',
        component: 'onchain',
      }),
      judgment: FULL_JUDGMENT,
      scope: { kind: 'ASSET', asset_symbol: 'BTC' },
    });
    const verdict = toChatVerdict(pkg);

    it('reports DEGRADED status with disclosures', () => {
      expect(verdict.status).toBe('DEGRADED');
      expect(verdict.disclosures?.length ?? 0).toBeGreaterThan(0);
    });
  });

  it('omits fields even if an UNAVAILABLE package pathologically carries judgment', () => {
    // Defensive gate: a hand-built package that violates the builder's own rule
    // (UNAVAILABLE yet judgment present) must still produce no client fields.
    const rogue: CoinetJudgmentPromptPackage = {
      package_id: 'pkg_rogue',
      policy_version: 'coinet-judgment-prompt-package.v1',
      judgment_status: 'UNAVAILABLE',
      scope: { kind: 'ASSET', asset_symbol: 'BTC' },
      judgment: { state: 'should_not_surface', thesis: 'should_not_surface' },
      degradation: {
        reasons: [],
        failed_components: [],
        degraded_components: [],
        disclosure_required: true,
      },
      expression_rules: {
        allowed_claims: [],
        forbidden_claims: [],
        required_disclosures: ['Disclose that structured Coinet judgment is unavailable.'],
      },
      source_refs: [],
    };
    const verdict = toChatVerdict(rogue);
    expect(verdict.status).toBe('UNAVAILABLE');
    expect(verdict.fields).toBeUndefined();
  });
});
