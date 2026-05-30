/**
 * BTAR-006 — Chat AI Response Finalizer
 *
 * Bounded extraction of the inline BTAR-005 final-output gate orchestration
 * from `api/chat/service.ts`. Wraps `applyAIOutputSafetyGate` with a small
 * envelope that exposes `finalOutput` / `originalOutput` / `changed` / `gate`
 * so output-finalization behavior can be tested without importing the full
 * chat service.
 *
 * Authority:
 *   Plan 2.1 §1.2 ("testable" clause)
 *   Plan 2.2 §7.5 (P2-S12 new file class)
 *   BTAR-006 §8
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 imports.
 *   - No second LLM call.
 *   - No new safety logic; only orchestrates BTAR-005 gate.
 *   - Pure / deterministic. No I/O.
 *
 * These modules extract trust-critical seams only; they do not create a new
 * chat runtime, new AI service, or new judgment engine.
 */

import type { CoinetJudgmentPromptPackage } from './judgment-prompt-package.types';
import { applyAIOutputSafetyGate } from './ai-output-safety-gate';
import type { AIOutputSafetyGateResult } from './ai-output-safety-gate.types';

export interface FinalizeChatAIResponseInput {
  rawOutput: string;
  judgmentPackage: CoinetJudgmentPromptPackage;
}

export interface FinalizeChatAIResponseResult {
  finalOutput: string;
  originalOutput: string;
  changed: boolean;
  gate: AIOutputSafetyGateResult;
}

export function finalizeChatAIResponse(
  input: FinalizeChatAIResponseInput,
): FinalizeChatAIResponseResult {
  const { output, gate } = applyAIOutputSafetyGate({
    output: input.rawOutput,
    judgmentPackage: input.judgmentPackage,
  });
  return {
    finalOutput: output,
    originalOutput: input.rawOutput,
    changed: output !== input.rawOutput,
    gate,
  };
}
