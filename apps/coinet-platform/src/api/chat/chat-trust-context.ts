/**
 * BTAR-006 — Chat Trust Context Builder
 *
 * Bounded extraction of the inline BTAR-003/004 orchestration from
 * `api/chat/service.ts`. Produces a `ChatTrustContext` from a
 * `JudgmentAvailabilityResult` plus an optional raw judgment object,
 * combining BTAR-003 availability state with BTAR-004 package construction +
 * rendering — so the trust context can be built and tested without importing
 * the full chat service.
 *
 * Authority:
 *   Plan 2.1 §1.2 ("testable" clause)
 *   Plan 2.2 §7.5 (P2-S12 new file class)
 *   BTAR-006 §7
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 imports.
 *   - No new availability or package logic; only orchestrates BTAR-003/004 helpers.
 *   - No I/O, no time, no randomness — pure / deterministic.
 *
 * These modules extract trust-critical seams only; they do not create a new
 * chat runtime, new AI service, or new judgment engine.
 */

import type { JudgmentAvailabilityResult } from './judgment-availability.types';
import {
  buildCoinetJudgmentPromptPackage,
  renderCoinetJudgmentPromptPackageForAI,
} from './judgment-prompt-package';
import type {
  CoinetJudgmentPromptPackage,
  CoinetJudgmentPromptPackageScope,
} from './judgment-prompt-package.types';

export interface BuildChatTrustContextInput {
  availability: JudgmentAvailabilityResult;
  judgment?: unknown;
  scope?: Partial<CoinetJudgmentPromptPackageScope>;
  source_refs?: string[];
  /**
   * Optional deterministic package_id override (used by tests).
   */
  package_id?: string;
}

export interface ChatTrustContext {
  judgment_status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  judgment_available: boolean;
  disclosure_required: boolean;
  promptPackage: CoinetJudgmentPromptPackage;
  renderedAIContext: string;
  failed_components: string[];
  degraded_components: string[];
  reasons: string[];
  policy_versions: {
    availability: 'judgment-availability.v1';
    prompt_package: 'coinet-judgment-prompt-package.v1';
  };
}

export function buildChatTrustContext(
  input: BuildChatTrustContextInput,
): ChatTrustContext {
  const promptPackage = buildCoinetJudgmentPromptPackage({
    availability: input.availability,
    judgment: input.judgment,
    scope: input.scope,
    source_refs: input.source_refs,
    ...(input.package_id !== undefined ? { package_id: input.package_id } : {}),
  });

  const renderedAIContext = renderCoinetJudgmentPromptPackageForAI(promptPackage);

  const judgment_status = input.availability.state;
  const judgment_available = judgment_status !== 'UNAVAILABLE';

  return {
    judgment_status,
    judgment_available,
    disclosure_required: input.availability.userDisclosureRequired,
    promptPackage,
    renderedAIContext,
    failed_components: [...input.availability.failedComponents],
    degraded_components: [...input.availability.degradedComponents],
    reasons: [...input.availability.reasons],
    policy_versions: {
      availability: input.availability.policyVersion,
      prompt_package: promptPackage.policy_version,
    },
  };
}
