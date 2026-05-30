/**
 * AJP.1 — Orchestrator
 *
 * §17 — Run digest, episode/corpus orchestration, fingerprint emission.
 * Drives services/judgment/produceJudgment() with synthetic inputs and
 * normalizes the output into matrix-ready digests.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import { produceJudgment, type ProduceJudgmentInput } from '../../services/judgment';
import type { JudgmentOutput } from '../../services/judgment/types';
import { BridgeEpisodeFamily } from '../bridge-certification/contracts/bridge-synthetic-episode';
import { BridgeReconciliationFlag } from '../bridge-certification/contracts/bridge-certification-scope';

const POLICY_V = 'ajp1.v1';

export interface Ajp1RunDigest {
  readonly run_id: string;
  readonly episode_family: BridgeEpisodeFamily;
  readonly variant: number;
  readonly produce_judgment_input_ref: string;
  readonly signal_snapshot_fingerprint: string;
  readonly observed_state_primary: string;
  readonly observed_regime_posture: string | null;
  readonly observed_top_hypothesis: string | null;
  readonly observed_timing_phase: string;
  readonly observed_scenario_id: string;
  readonly contradiction_load: number;
  readonly contradiction_detected: boolean;
  readonly confidence_score: number;
  readonly confidence_present: boolean;
  readonly product_output_fingerprint: string;
  readonly reconciliation_flags: readonly BridgeReconciliationFlag[];
  readonly errored: boolean;
  readonly error_message?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

function signalSnapshotFingerprint(input: ProduceJudgmentInput): string {
  const s = input.signals;
  return `ajp1.sig.${fnv1a([
    String(s.price_momentum_24h), String(s.price_momentum_1h),
    String(s.volume_24h), String(s.buy_sell_ratio), String(s.liquidity),
    String(s.pair_age_hours ?? ''), String(s.leverage_pressure),
    String(s.funding_rate), String(s.liquidation_density),
    String(s.fundamentals_strength), String(s.tvl_trend), String(s.revenue_quality),
    String(s.whale_activity), String(s.exchange_inflow), String(s.exchange_outflow),
    String(s.security_risk), String(s.holder_concentration),
    String(s.narrative_intensity), String(s.sentiment), String(s.unlock_pressure),
    String(s.data_completeness), String(s.data_freshness),
    String([...(s._missing ?? [])].sort().join(',')),
    POLICY_V,
  ].join('|'))}`;
}

function productOutputFingerprint(out: JudgmentOutput): string {
  return `ajp1.out.${fnv1a([
    out.state?.primary ?? '',
    String(out.state?.confidence ?? ''),
    out.regime?.macro?.posture ?? '',
    out.thesis?.primary?.hypothesis ?? '',
    out.timing?.phase ?? '',
    // BTAR-TC-001: scenario_id not present on scenario type; using base_case as stable identifier proxy.
    out.scenario?.base_case ?? '',
    String(out.contradictions?.load ?? ''),
    String(out.confidence?.score ?? ''),
    POLICY_V,
  ].join('|'))}`;
}

function deriveReconciliationFlags(
  family: BridgeEpisodeFamily,
  out: JudgmentOutput,
): readonly BridgeReconciliationFlag[] {
  const flags: BridgeReconciliationFlag[] = [];
  // L9 is not in active path — every AJP.1 run carries this fact.
  flags.push(BridgeReconciliationFlag.ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9);
  // Active AI path goes through services/explanations, not certified L13.
  flags.push(BridgeReconciliationFlag.ACTIVE_AI_PATH_NOT_L13_GOVERNED);
  // Delivery is not yet wired to certified L14 channels.
  flags.push(BridgeReconciliationFlag.PRODUCT_DELIVERY_NOT_YET_FULLY_L14_WIRED);
  // Identity contestation: active product has no constitutional L3 gating.
  if (family === BridgeEpisodeFamily.MOCKUSD_IDENTITY_CONTESTATION &&
      !out.identity_confidence) {
    flags.push(BridgeReconciliationFlag.ACTIVE_PIPELINE_LACKS_CERTIFIED_IDENTITY_GATING);
  }
  return flags;
}

// ── Episode runner ───────────────────────────────────────────────

export interface Ajp1EpisodeResult {
  readonly run_id: string;
  readonly family: BridgeEpisodeFamily;
  readonly variant: number;
  readonly output: JudgmentOutput | null;
  readonly digest: Ajp1RunDigest;
  readonly assertions_passed: number;
  readonly assertions_failed: number;
}

export function runAjp1Episode(
  family: BridgeEpisodeFamily,
  variant: number,
  input: ProduceJudgmentInput,
): Ajp1EpisodeResult {
  const run_id = `ajp1.run.${fnv1a([family, String(variant), POLICY_V].join('|'))}`;
  const inputRef = `ajp1.input.${fnv1a([input.entity_id, input.symbol, String(variant), POLICY_V].join('|'))}`;
  let output: JudgmentOutput | null = null;
  let errored = false;
  let errorMessage: string | undefined;

  try {
    output = produceJudgment(input);
  } catch (e: any) {
    errored = true;
    errorMessage = e?.message ?? String(e);
  }

  const sigFp = signalSnapshotFingerprint(input);
  const outFp = output ? productOutputFingerprint(output) : `ajp1.out.errored.${run_id}`;
  const flags = output ? deriveReconciliationFlags(family, output) : [];

  const digest: Ajp1RunDigest = {
    run_id,
    episode_family: family,
    variant,
    produce_judgment_input_ref: inputRef,
    signal_snapshot_fingerprint: sigFp,
    observed_state_primary: output?.state?.primary ?? '',
    observed_regime_posture: output?.regime?.macro?.posture ?? null,
    observed_top_hypothesis: output?.thesis?.primary?.hypothesis ?? null,
    observed_timing_phase: output?.timing?.phase ?? '',
    // BTAR-TC-001: scenario_id not present on scenario type; using base_case as stable identifier proxy.
    observed_scenario_id: output?.scenario?.base_case ?? '',
    contradiction_load: Number(output?.contradictions?.load ?? 0),
    contradiction_detected: Number(output?.contradictions?.load ?? 0) > 0.1,
    confidence_score: Number(output?.confidence?.score ?? 0),
    confidence_present: !!output?.confidence,
    product_output_fingerprint: outFp,
    reconciliation_flags: flags,
    errored,
    error_message: errorMessage,
    lineage_refs: ['ajp1.lineage'],
    replay_hash: fnv1a([run_id, sigFp, outFp, errored ? '1' : '0', POLICY_V].join('|')),
  };

  return { run_id, family, variant, output, digest, assertions_passed: 0, assertions_failed: 0 };
}

// ── Aggregate fingerprint ────────────────────────────────────────

export function deriveAjp1AggregateFingerprint(digests: readonly Ajp1RunDigest[]): string {
  const sorted = [...digests].sort((a, b) => a.run_id.localeCompare(b.run_id));
  return `ajp1.fp.${fnv1a(sorted.map(d => d.replay_hash).join('|'))}`;
}
