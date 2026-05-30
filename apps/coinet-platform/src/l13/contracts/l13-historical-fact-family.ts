/**
 * L13.10 — Historical Fact Family Contract
 *
 * §13.10.11 — Closed enumeration of time-series fact families
 * Layer 13 appends to. Historical facts are append-safe and
 * immutable (§13.10.9.1).
 */

export enum L13HistoricalFactFamily {
  TS_AI_OUTPUT_FACT_V1 = 'ts_ai_output_fact_v1',
  TS_AI_CLAIM_GROUNDING_V1 = 'ts_ai_claim_grounding_v1',
  TS_AI_BLOCKED_CLAIM_FACT_V1 = 'ts_ai_blocked_claim_fact_v1',
  TS_AI_FEEDBACK_V1 = 'ts_ai_feedback_v1',
  TS_AI_FEEDBACK_RESOLUTION_FACT_V1 = 'ts_ai_feedback_resolution_fact_v1',
  TS_AI_SAFETY_EVENT_V1 = 'ts_ai_safety_event_v1',
  TS_AI_OUTPUT_QUALITY_V1 = 'ts_ai_output_quality_v1',
  TS_AI_MODEL_RUN_FACT_V1 = 'ts_ai_model_run_fact_v1',
  TS_AI_FAILURE_FACT_V1 = 'ts_ai_failure_fact_v1',
}

export const ALL_L13_HISTORICAL_FACT_FAMILIES:
  readonly L13HistoricalFactFamily[] =
  Object.values(L13HistoricalFactFamily);
