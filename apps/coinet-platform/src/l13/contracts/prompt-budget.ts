/**
 * L13.2 — Prompt Budget Contract
 *
 * §13.2.11 — Token budget contract for the AI input package. Required
 * context may not be dropped to fit the budget; if it cannot fit
 * legally the package must block.
 */

import type { L13ContextClass } from './context-priority';
import { L13ContextCompressionStrategy } from './context-compression';

export interface L13PromptBudget {
  readonly prompt_budget_id: string;

  readonly max_context_tokens: number;
  readonly reserved_instruction_tokens: number;
  readonly reserved_output_tokens: number;

  readonly available_context_tokens: number;

  readonly compression_required: boolean;
  readonly compression_strategy: L13ContextCompressionStrategy;

  readonly minimum_required_context_classes: readonly L13ContextClass[];

  readonly dropped_context_refs: readonly string[];
  readonly preserved_context_refs: readonly string[];

  readonly compression_disclosure_required: boolean;

  readonly policy_version: string;
}
