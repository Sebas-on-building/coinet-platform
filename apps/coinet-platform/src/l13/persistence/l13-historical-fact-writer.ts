/**
 * L13.10 — Historical Fact Writer
 *
 * §13.10.12 — Builds an immutable `L13HistoricalAIOutputFact` and
 * its append envelope. Append-only.
 */

import {
  L13HistoricalFactFamily,
} from '../contracts/l13-historical-fact-family';
import type { L13HistoricalAIOutputFact } from '../contracts/l13-historical-output-fact';
import { L13DurableSurfaceId, type L13PersistenceEnvelope } from '../contracts/l13-persistence-surface';
import { L13PersistenceClass, L13PersistenceWriteIntent } from '../contracts/l13-persistence-class';
import {
  L13MaterializationMode,
  L13StorageAuthorityClass,
} from '../contracts/l13-storage-authority';
import { buildL13PersistenceEnvelope } from './l13-persistence-envelope';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.persistence.v1';

export interface L13HistoricalOutputFactWriterInput {
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
  readonly created_at?: string;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

export interface L13HistoricalOutputFactWriteResult {
  readonly fact: L13HistoricalAIOutputFact;
  readonly envelope: L13PersistenceEnvelope;
}

export function writeL13HistoricalAIOutputFact(
  input: L13HistoricalOutputFactWriterInput,
): L13HistoricalOutputFactWriteResult {
  const evidence = input.evidence_refs ?? [];
  const lineage = input.lineage_refs ?? ['l13.persistence.lineage'];
  const replayHash = fnv1a(
    [
      'TS_AI_OUTPUT_FACT_V1',
      input.output_id,
      input.request_id,
      input.runtime_run_id,
      input.product_answer_mode,
      input.output_class,
      String(input.emitted),
      String(input.refusal_emitted),
      String(input.blocked),
      input.grounding_readiness,
      input.expression_readiness,
      input.mode_readiness,
      input.style_readiness,
      input.safety_decision,
      String(input.user_feedback_count_at_snapshot ?? 0),
      POLICY_V,
    ].join('|'),
  );
  const fact: L13HistoricalAIOutputFact = {
    historical_fact_id: `l13.hist.out.${replayHash}`,
    fact_family: L13HistoricalFactFamily.TS_AI_OUTPUT_FACT_V1,
    output_id: input.output_id,
    request_id: input.request_id,
    runtime_run_id: input.runtime_run_id,
    product_answer_mode: input.product_answer_mode,
    output_class: input.output_class,
    emitted: input.emitted,
    refusal_emitted: input.refusal_emitted,
    blocked: input.blocked,
    grounding_readiness: input.grounding_readiness,
    expression_readiness: input.expression_readiness,
    mode_readiness: input.mode_readiness,
    style_readiness: input.style_readiness,
    safety_decision: input.safety_decision,
    user_feedback_count_at_snapshot: input.user_feedback_count_at_snapshot,
    created_at: input.created_at ?? new Date().toISOString(),
    evidence_refs: evidence,
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  const envelope = buildL13PersistenceEnvelope({
    surface_id: L13DurableSurfaceId.TS_AI_OUTPUT_FACT_V1,
    persistence_class: L13PersistenceClass.HISTORICAL_AI_OUTPUT_FACT,
    materialization_mode: L13MaterializationMode.HISTORICAL_FACT_APPEND,
    storage_authority_class: L13StorageAuthorityClass.TIME_SERIES_APPEND,
    source_artifact_ref: fact.historical_fact_id,
    durable_record_ref: fact.historical_fact_id,
    write_intent: L13PersistenceWriteIntent.APPEND_HISTORICAL_FACT,
    append_safe_required: true,
    current_authority_update: false,
    lineage_refs: lineage,
  });
  return { fact, envelope };
}
