/**
 * BTAR-003 — Judgment Availability Helper Unit Tests
 *
 * Authority:
 *   Plan 2.1 §4 (availability law)
 *   Plan 2.2 §14 (test boundary)
 *   BTAR-003 §12.1 (this test file)
 *
 * Test boundary discipline (Plan 2.2 §14.3):
 *   No real provider calls occurred.
 *
 * This is a pure unit test of the deterministic availability helper. It does
 * not import the chat service, does not import the AI service, and does not
 * import any external-API client.
 */

import { describe, it, expect } from 'vitest';

import {
  createAvailableJudgmentState,
  createDegradedJudgmentState,
  createUnavailableJudgmentState,
  buildDegradedJudgmentNoticeForAI,
  buildUnavailableJudgmentContextForAI,
} from '../judgment-availability';

describe('judgment-availability helper (BTAR-003)', () => {
  describe('createAvailableJudgmentState', () => {
    it('canUseStructuredJudgment is true', () => {
      const r = createAvailableJudgmentState();
      expect(r.canUseStructuredJudgment).toBe(true);
    });
    it('userDisclosureRequired is false', () => {
      const r = createAvailableJudgmentState();
      expect(r.userDisclosureRequired).toBe(false);
    });
    it('state is AVAILABLE', () => {
      expect(createAvailableJudgmentState().state).toBe('AVAILABLE');
    });
    it('policyVersion is judgment-availability.v1', () => {
      expect(createAvailableJudgmentState().policyVersion).toBe('judgment-availability.v1');
    });
  });

  describe('createUnavailableJudgmentState', () => {
    it('canUseStructuredJudgment is false', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_ENGINE_THROW',
        component: 'produceJudgment',
      });
      expect(r.canUseStructuredJudgment).toBe(false);
    });
    it('userDisclosureRequired is true', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_ENGINE_THROW',
        component: 'produceJudgment',
      });
      expect(r.userDisclosureRequired).toBe(true);
    });
    it('state is UNAVAILABLE', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_RESULT_EMPTY',
        component: 'produceJudgment',
      });
      expect(r.state).toBe('UNAVAILABLE');
    });
    it('captures the reason code', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_ENGINE_TIMEOUT',
        component: 'produceJudgment',
      });
      expect(r.unavailableReasons).toContain('JUDGMENT_ENGINE_TIMEOUT');
      expect(r.reasons).toContain('JUDGMENT_ENGINE_TIMEOUT');
    });
    it('captures the failed component', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_ENGINE_THROW',
        component: 'produceJudgment',
      });
      expect(r.failedComponents).toContain('produceJudgment');
    });
    it('captures error message when error provided', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_ENGINE_THROW',
        component: 'produceJudgment',
        error: new Error('engine exploded'),
      });
      expect(r.errorMessage).toBe('engine exploded');
    });
    it('omits errorMessage when no error is given', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_RESULT_EMPTY',
        component: 'produceJudgment',
      });
      expect(r.errorMessage).toBeUndefined();
    });
    it('policyVersion is judgment-availability.v1', () => {
      const r = createUnavailableJudgmentState({
        reason: 'UNKNOWN_JUDGMENT_FAILURE',
        component: 'x',
      });
      expect(r.policyVersion).toBe('judgment-availability.v1');
    });
  });

  describe('createDegradedJudgmentState', () => {
    it('canUseStructuredJudgment is true', () => {
      const r = createDegradedJudgmentState({
        reason: 'PARTIAL_CONTEXT_FAILURE',
        component: 'sentiment',
      });
      expect(r.canUseStructuredJudgment).toBe(true);
    });
    it('userDisclosureRequired is true', () => {
      const r = createDegradedJudgmentState({
        reason: 'PARTIAL_CONTEXT_FAILURE',
        component: 'sentiment',
      });
      expect(r.userDisclosureRequired).toBe(true);
    });
    it('state is DEGRADED', () => {
      expect(
        createDegradedJudgmentState({
          reason: 'STALE_CONTEXT',
          component: 'market-data',
        }).state,
      ).toBe('DEGRADED');
    });
    it('captures the reason and component', () => {
      const r = createDegradedJudgmentState({
        reason: 'LOW_CONFIDENCE_INPUTS',
        component: 'symbol-detector',
      });
      expect(r.degradedReasons).toContain('LOW_CONFIDENCE_INPUTS');
      expect(r.degradedComponents).toContain('symbol-detector');
    });
    it('policyVersion is judgment-availability.v1', () => {
      const r = createDegradedJudgmentState({
        reason: 'SOURCE_CONTEXT_PARTIAL',
        component: 'news',
      });
      expect(r.policyVersion).toBe('judgment-availability.v1');
    });
  });

  describe('buildUnavailableJudgmentContextForAI', () => {
    it('contains the canonical UNAVAILABLE marker', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_ENGINE_THROW',
        component: 'produceJudgment',
      });
      const ctx = buildUnavailableJudgmentContextForAI(r);
      expect(ctx).toContain('STRUCTURED COINET JUDGMENT: UNAVAILABLE');
    });
    it('contains the do-not-claim instruction', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_ENGINE_THROW',
        component: 'produceJudgment',
      });
      const ctx = buildUnavailableJudgmentContextForAI(r);
      expect(ctx).toContain(
        'Do not claim Coinet has a structured thesis, confidence, contradiction, scenario, or timing read.',
      );
    });
    it('contains the disclosure instruction', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_RESULT_EMPTY',
        component: 'produceJudgment',
      });
      const ctx = buildUnavailableJudgmentContextForAI(r);
      expect(ctx).toContain(
        'If answering, clearly disclose that this is not a governed Coinet judgment.',
      );
    });
    it('surfaces the reason code', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_ENGINE_TIMEOUT',
        component: 'produceJudgment',
      });
      expect(buildUnavailableJudgmentContextForAI(r)).toContain('JUDGMENT_ENGINE_TIMEOUT');
    });
    it('surfaces the failed component', () => {
      const r = createUnavailableJudgmentState({
        reason: 'JUDGMENT_ENGINE_THROW',
        component: 'produceJudgment',
      });
      expect(buildUnavailableJudgmentContextForAI(r)).toContain('produceJudgment');
    });
  });

  describe('buildDegradedJudgmentNoticeForAI', () => {
    it('contains the canonical DEGRADED marker', () => {
      const r = createDegradedJudgmentState({
        reason: 'PARTIAL_CONTEXT_FAILURE',
        component: 'sentiment',
      });
      const ctx = buildDegradedJudgmentNoticeForAI(r);
      expect(ctx).toContain('STRUCTURED COINET JUDGMENT: DEGRADED');
    });
    it('contains the disclose-limitation instruction', () => {
      const r = createDegradedJudgmentState({
        reason: 'PARTIAL_CONTEXT_FAILURE',
        component: 'sentiment',
      });
      const ctx = buildDegradedJudgmentNoticeForAI(r);
      expect(ctx).toContain('Disclose the limitation.');
    });
    it('contains the do-not-overstate-confidence instruction', () => {
      const r = createDegradedJudgmentState({
        reason: 'STALE_CONTEXT',
        component: 'market-data',
      });
      const ctx = buildDegradedJudgmentNoticeForAI(r);
      expect(ctx).toContain('Do not overstate confidence.');
    });
  });
});
