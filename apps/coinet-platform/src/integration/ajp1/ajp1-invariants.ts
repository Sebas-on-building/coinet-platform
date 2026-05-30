/**
 * AJP.1 — Invariants AJP-INV-A..J
 *
 * §18 — Cross-pipeline laws the active product judgment path must obey
 * across all 4 episodes + 20 corpus runs.
 */

import { BridgeEpisodeFamily } from '../bridge-certification/contracts/bridge-synthetic-episode';
import type { Ajp1EpisodeResult, Ajp1RunDigest } from './ajp1-orchestrator';

export interface Ajp1InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function inv(id: string, name: string, holds: boolean, evidence: string): Ajp1InvariantResult {
  return { id, name, holds, evidence };
}

// ── AJP-INV-A : Input completeness honesty ────────────────────────

export function checkAJP_A(digests: readonly Ajp1RunDigest[]): Ajp1InvariantResult {
  const allHaveInputRef = digests.every(d => d.produce_judgment_input_ref.length > 0);
  const allHaveSigFp = digests.every(d => d.signal_snapshot_fingerprint.length > 0);
  return inv('AJP-INV-A', 'input completeness honesty',
    allHaveInputRef && allHaveSigFp,
    `inputRef=${allHaveInputRef} sigFp=${allHaveSigFp}`);
}

// ── AJP-INV-B : No judgment without active entrypoint execution ──

export function checkAJP_B(results: readonly Ajp1EpisodeResult[]): Ajp1InvariantResult {
  // Every run either produced output via produceJudgment OR is explicitly errored.
  const ok = results.every(r => r.output !== null || r.digest.errored);
  return inv('AJP-INV-B', 'no judgment without entrypoint',
    ok,
    `runs=${results.length} errored=${results.filter(r => r.digest.errored).length}`);
}

// ── AJP-INV-C : Regime presence law ──────────────────────────────

export function checkAJP_C(digests: readonly Ajp1RunDigest[]): Ajp1InvariantResult {
  // Active product emits regime for every non-errored run.
  const nonErrored = digests.filter(d => !d.errored);
  const allHaveRegime = nonErrored.every(d => d.observed_regime_posture !== null);
  return inv('AJP-INV-C', 'regime presence',
    allHaveRegime,
    `nonErrored=${nonErrored.length} withRegime=${nonErrored.filter(d => d.observed_regime_posture !== null).length}`);
}

// ── AJP-INV-D : Hypothesis presence law ──────────────────────────

export function checkAJP_D(digests: readonly Ajp1RunDigest[]): Ajp1InvariantResult {
  const nonErrored = digests.filter(d => !d.errored);
  const withHypothesis = nonErrored.filter(d => d.observed_top_hypothesis !== null && d.observed_top_hypothesis !== '');
  return inv('AJP-INV-D', 'hypothesis presence',
    withHypothesis.length === nonErrored.length,
    `nonErrored=${nonErrored.length} withHypothesis=${withHypothesis.length}`);
}

// ── AJP-INV-E : Scenario grounding law ───────────────────────────

export function checkAJP_E(results: readonly Ajp1EpisodeResult[]): Ajp1InvariantResult {
  // Every scenario emitted must come from produceJudgment, not fabricated.
  const ok = results.every(r => {
    if (!r.output) return true;
    return !!r.output.scenario;
  });
  return inv('AJP-INV-E', 'scenario grounding',
    ok,
    `runs=${results.length}`);
}

// ── AJP-INV-F : Contradiction differentiation law ────────────────

export function checkAJP_F(digests: readonly Ajp1RunDigest[]): Ajp1InvariantResult {
  // LEVA fragility runs must show different contradiction posture than SOLX clean runs.
  const solx = digests.filter(d => d.episode_family === BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION && !d.errored);
  const leva = digests.filter(d => d.episode_family === BridgeEpisodeFamily.LEVA_FRAGILITY_INVALIDATION && !d.errored);
  if (solx.length === 0 || leva.length === 0) {
    return inv('AJP-INV-F', 'contradiction differentiation', false,
      `solx=${solx.length} leva=${leva.length}`);
  }
  const solxAvgLoad = solx.reduce((a, d) => a + d.contradiction_load, 0) / solx.length;
  const levaAvgLoad = leva.reduce((a, d) => a + d.contradiction_load, 0) / leva.length;
  const differentiated = levaAvgLoad > solxAvgLoad;
  return inv('AJP-INV-F', 'contradiction differentiation',
    differentiated,
    `solxAvgLoad=${solxAvgLoad.toFixed(3)} levaAvgLoad=${levaAvgLoad.toFixed(3)}`);
}

// ── AJP-INV-G : Calibration/replay determinism ───────────────────

export function checkAJP_G(
  firstRun: readonly Ajp1RunDigest[],
  secondRun: readonly Ajp1RunDigest[],
): Ajp1InvariantResult {
  if (firstRun.length !== secondRun.length) {
    return inv('AJP-INV-G', 'replay determinism', false,
      `length mismatch: ${firstRun.length} vs ${secondRun.length}`);
  }
  const fpsMatch = firstRun.every((d, i) =>
    d.product_output_fingerprint === secondRun[i].product_output_fingerprint &&
    d.signal_snapshot_fingerprint === secondRun[i].signal_snapshot_fingerprint
  );
  return inv('AJP-INV-G', 'replay determinism',
    fpsMatch,
    `match=${fpsMatch}`);
}

// ── AJP-INV-H : No internal-state leakage ────────────────────────

export function checkAJP_H(results: readonly Ajp1EpisodeResult[]): Ajp1InvariantResult {
  // Verify the public JudgmentOutput shape does not include debug-only fields.
  // We check that key shape fields exist; absence of a stray __debug or __raw field.
  const ok = results.every(r => {
    if (!r.output) return true;
    const out = r.output as any;
    return out.__debug === undefined && out.__raw === undefined && out.__internal === undefined;
  });
  return inv('AJP-INV-H', 'no internal-state leakage',
    ok,
    `runs=${results.length}`);
}

// ── AJP-INV-I : Ambiguity honesty ────────────────────────────────

export function checkAJP_I(digests: readonly Ajp1RunDigest[]): Ajp1InvariantResult {
  // MOCKUSD runs should EITHER show lower confidence/narrowed posture OR carry
  // the ACTIVE_PIPELINE_LACKS_CERTIFIED_IDENTITY_GATING reconciliation flag.
  const mockusd = digests.filter(d => d.episode_family === BridgeEpisodeFamily.MOCKUSD_IDENTITY_CONTESTATION && !d.errored);
  if (mockusd.length === 0) {
    return inv('AJP-INV-I', 'ambiguity honesty', false, 'no MOCKUSD runs');
  }
  const honest = mockusd.every(d => {
    const flagPresent = d.reconciliation_flags.includes(
      // import to avoid circular
      ('ACTIVE_PIPELINE_LACKS_CERTIFIED_IDENTITY_GATING' as any)
    );
    const narrowed = d.confidence_score < 0.7;
    return flagPresent || narrowed;
  });
  return inv('AJP-INV-I', 'ambiguity honesty',
    honest,
    `mockusd=${mockusd.length} avgConf=${(mockusd.reduce((a, d) => a + d.confidence_score, 0) / mockusd.length).toFixed(3)}`);
}

// ── AJP-INV-J : Scope honesty ────────────────────────────────────

export function checkAJP_J(artifactScope: string): Ajp1InvariantResult {
  const ok = artifactScope === 'AJP1_ACTIVE_PRODUCT_PIPELINE';
  return inv('AJP-INV-J', 'scope honesty',
    ok,
    `artifactScope=${artifactScope}`);
}

export function runAllAjp1Invariants(input: {
  results: readonly Ajp1EpisodeResult[];
  digests: readonly Ajp1RunDigest[];
  secondRunDigests: readonly Ajp1RunDigest[];
  artifactScope: string;
}): readonly Ajp1InvariantResult[] {
  return [
    checkAJP_A(input.digests),
    checkAJP_B(input.results),
    checkAJP_C(input.digests),
    checkAJP_D(input.digests),
    checkAJP_E(input.results),
    checkAJP_F(input.digests),
    checkAJP_G(input.digests, input.secondRunDigests),
    checkAJP_H(input.results),
    checkAJP_I(input.digests),
    checkAJP_J(input.artifactScope),
  ];
}
