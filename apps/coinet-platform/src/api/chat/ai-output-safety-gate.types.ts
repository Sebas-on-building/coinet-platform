/**
 * BTAR-005 — AI Output Safety / Expression Gate Type Contract
 *
 * The deterministic gate that reviews the final LLM-generated answer before
 * user delivery. Consumes the BTAR-004 `CoinetJudgmentPromptPackage` (which
 * already encodes the truth class + expression rules) and produces a four-
 * decision verdict with structured violations + optional safe-rewrite.
 *
 * Authority:
 *   Plan 2.1 §2.4 (forbidden AI behaviors); §7 (TF taxonomy — TF-003/005/006/001)
 *   Plan 2.2 §7.4 (P2-S11 new file class)
 *   BTAR-005 §8   (this type contract)
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 imports.
 *   - No second LLM call.
 *   - No compliance platform, no legal-policy engine, no trading-recommendation system.
 *   - All evaluator + rewriter logic must be pure / deterministic.
 *
 * This is a final AI expression gate, not a new AI service, not a compliance
 * platform, and not a replacement for the judgment engine.
 */

import type { CoinetJudgmentPromptPackage } from './judgment-prompt-package.types';

export type AIOutputGateDecision =
  | 'ALLOW'
  | 'ALLOW_WITH_WARNINGS'
  | 'REWRITE_REQUIRED'
  | 'BLOCK_OR_CLARIFY';

export type AIOutputSafetyViolation =
  | 'DIRECT_FINANCIAL_ADVICE'
  | 'GUARANTEED_OUTCOME_LANGUAGE'
  | 'UNSUPPORTED_CERTAINTY'
  | 'MISSING_DEGRADATION_DISCLOSURE'
  | 'MISSING_UNAVAILABLE_DISCLOSURE'
  | 'GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE'
  | 'CONFIDENCE_INFLATION'
  | 'INVENTED_EVIDENCE_LANGUAGE'
  | 'PACKAGE_CONTRADICTION'
  | 'UNKNOWN_SAFETY_RISK';

export type AIOutputSafetyGatePolicyVersion = 'ai-output-safety-gate.v1';

export interface AIOutputSafetyGateInput {
  output: string;
  judgmentPackage: CoinetJudgmentPromptPackage;
}

export interface AIOutputSafetyGateResult {
  decision: AIOutputGateDecision;
  reasons: string[];
  violations: AIOutputSafetyViolation[];
  required_edits: string[];
  safe_output?: string;
  policy_version: AIOutputSafetyGatePolicyVersion;
}

export interface AIOutputSafetyGateOptions {
  enableSafeRewrite: boolean;
}
