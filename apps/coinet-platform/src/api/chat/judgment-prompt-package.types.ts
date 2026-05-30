/**
 * BTAR-004 — CoinetJudgmentPromptPackage Type Contract
 *
 * Defines the typed package the live chat path uses to bridge structured
 * judgment into the AI prompt. The LLM still receives text, but that text is
 * deterministically rendered from this package — not from ad-hoc ASCII
 * stuffing.
 *
 * Authority:
 *   Plan 2.0 §5    (target architecture)
 *   Plan 2.0 §3.6  (prompt-package replacement requires FRP — see FRP-001)
 *   Plan 2.1 §1.2  (mission clauses)
 *   Plan 2.2 §7.2  (P2-S09 new file)
 *   BTAR-004 §8    (this type contract)
 *   FRP-001        (formal replacement of formatJudgmentForAI authority)
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 type imports.
 *   - No full telemetry / calibration object (that is OOS-008).
 *   - No AI output safety gate decisions (BTAR-005).
 *   - No new judgment engine fields invented (BTAR may only project existing ones).
 *
 * Honesty pin (BTAR-004 §1.1; FRP-001 §8):
 *   The LLM still receives text. The text is deterministically rendered from
 *   the typed package. This file defines the package — not a runtime contract
 *   the LLM directly consumes.
 */

import type { JudgmentAvailabilityState } from './judgment-availability.types';

export type CoinetJudgmentPromptPackagePolicyVersion =
  'coinet-judgment-prompt-package.v1';

export type CoinetJudgmentScopeKind = 'MARKET' | 'ASSET' | 'UNKNOWN';

export interface CoinetJudgmentPromptPackageScope {
  kind: CoinetJudgmentScopeKind;
  asset_symbol?: string;
  asset_name?: string;
  market_context_ref?: string;
}

/**
 * Projection of judgment fields safe for AI prompt rendering. Every field is
 * optional. The builder MUST NOT invent values that are not present on the
 * underlying judgment object.
 */
export interface CoinetJudgmentPromptPackageJudgment {
  state?: string;
  thesis?: string;
  cause?: string;
  contradiction_summary?: string;
  timing_phase?: string;
  scenario_summary?: string;
  confidence_band?: string;
}

export interface CoinetJudgmentPromptPackageDegradation {
  reasons: string[];
  failed_components: string[];
  degraded_components: string[];
  disclosure_required: boolean;
}

export interface CoinetJudgmentPromptPackageExpressionRules {
  allowed_claims: string[];
  forbidden_claims: string[];
  required_disclosures: string[];
}

export interface CoinetJudgmentPromptPackage {
  package_id: string;
  policy_version: CoinetJudgmentPromptPackagePolicyVersion;
  judgment_status: JudgmentAvailabilityState;
  scope: CoinetJudgmentPromptPackageScope;
  judgment?: CoinetJudgmentPromptPackageJudgment;
  degradation: CoinetJudgmentPromptPackageDegradation;
  expression_rules: CoinetJudgmentPromptPackageExpressionRules;
  source_refs: string[];
}

/**
 * Input to the package builder. `judgment` is intentionally typed as `unknown`
 * so the builder can safely project fields from whatever shape the judgment
 * engine returns without coupling this module to JudgmentOutput.
 */
export interface BuildCoinetJudgmentPromptPackageInput {
  availability: import('./judgment-availability.types').JudgmentAvailabilityResult;
  judgment?: unknown;
  scope?: Partial<CoinetJudgmentPromptPackageScope>;
  source_refs?: string[];
  /**
   * Optional deterministic package_id override (used by tests to assert
   * deterministic output across runs).
   */
  package_id?: string;
}
