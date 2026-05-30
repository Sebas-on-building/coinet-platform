/**
 * L13.10 — Historical AI Output Fact
 *
 * §13.10.12 — Append-safe time-series snapshot of every emitted /
 * refused / blocked output. Never mutated.
 */

import { L13HistoricalFactFamily } from './l13-historical-fact-family';

export interface L13HistoricalAIOutputFact {
  readonly historical_fact_id: string;
  readonly fact_family: L13HistoricalFactFamily.TS_AI_OUTPUT_FACT_V1;
  readonly output_id: string;
  readonly request_id: string;
  readonly runtime_run_id: string;
  readonly product_answer_mode: string;
  readonly output_class: string;
  readonly emitted: boolean;
  readonly refusal_emitted: boolean;
  readonly blocked: boolean;
  readonly grounding_readiness: string;
  readonly expression_readiness: string;
  readonly mode_readiness: string;
  readonly style_readiness: string;
  readonly safety_decision: string;
  readonly user_feedback_count_at_snapshot?: number;
  readonly created_at: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}
