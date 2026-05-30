/**
 * AJP.1 — Active Judgment Pipeline Synthetic Certification
 *
 * Bridge cert §9–§20. Drives services/judgment/produceJudgment() through
 * 4 episode families + 20 deterministic corpus runs, asserts 8 bands of
 * behavior, runs AJP-INV-A..J, and emits a matrix-ready artifact.
 *
 * SCOPE: ACTIVE_PRODUCT_PIPELINE_ONLY. Does NOT claim L5→L14 chain coverage.
 */

import { fnv1a } from '../l13/context/_fnv1a';
import { BridgeEpisodeFamily, ALL_BRIDGE_EPISODE_FAMILIES } from '../integration/bridge-certification/contracts/bridge-synthetic-episode';
import { BridgeCertificationScope } from '../integration/bridge-certification/contracts/bridge-certification-scope';
import { BRIDGE_EPISODES } from '../integration/bridge-certification/fixtures/shared-episode-catalogue';
import {
  buildAjp1Corpus,
  buildAjp1Input,
} from '../integration/ajp1/ajp1-fixtures';
import {
  deriveAjp1AggregateFingerprint,
  runAjp1Episode,
  type Ajp1EpisodeResult,
  type Ajp1RunDigest,
} from '../integration/ajp1/ajp1-orchestrator';
import { runAllAjp1Invariants } from '../integration/ajp1/ajp1-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; failures.push(msg); console.log(`  ✗ ${msg}`); }
}
function band(name: string): void { console.log(''); console.log(`── ${name} ──`); }

console.log('AJP.1 — Active Judgment Pipeline Synthetic Certification');
console.log('SCOPE: ACTIVE_PRODUCT_PIPELINE_ONLY (NOT CIP.1, NOT L5→L14)');

// ── BAND A : Scope and fixture legality ──────────────────────────
band('BAND A — scope and fixture legality');

{
  assert(BRIDGE_EPISODES.length === 4, 'A.1 4 bridge episodes registered');
  assert(ALL_BRIDGE_EPISODE_FAMILIES.length === 4, 'A.2 4 episode families enumerated');
  // Episode definitions complete.
  for (const ep of BRIDGE_EPISODES) {
    assert(!!ep.narrative_summary && ep.narrative_summary.length > 20,
      `A.3 episode ${ep.episode_family} has narrative summary`);
  }
  // 20-run corpus.
  const corpus = buildAjp1Corpus();
  assert(corpus.length === 20, `A.4 20-run corpus generated (got ${corpus.length})`);
  // Each family contributes 5 runs.
  for (const family of ALL_BRIDGE_EPISODE_FAMILIES) {
    const count = corpus.filter(e => e.family === family).length;
    assert(count === 5, `A.5 ${family} contributes 5 corpus runs`);
  }
  // Fixtures deterministic: same family/variant produces identical input.
  const a = buildAjp1Input(BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION, 0);
  const b = buildAjp1Input(BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION, 0);
  assert(a.entity_id === b.entity_id && a.signals.price_momentum_24h === b.signals.price_momentum_24h,
    'A.6 fixture builder deterministic');
}

// ── BAND B : Active entrypoint execution ─────────────────────────
band('BAND B — active entrypoint execution');

const episodeResults: Ajp1EpisodeResult[] = [];
const allDigests: Ajp1RunDigest[] = [];

{
  // Run the 4 primary episodes (variant 0).
  for (const family of ALL_BRIDGE_EPISODE_FAMILIES) {
    const input = buildAjp1Input(family, 0);
    const r = runAjp1Episode(family, 0, input);
    episodeResults.push(r);
    allDigests.push(r.digest);
    assert(!r.digest.errored, `B.1 ${family} episode 0 ran without throw`);
    assert(r.output !== null, `B.2 ${family} produced JudgmentOutput`);
  }
}

// ── BAND C : Episode semantic differentiation ────────────────────
band('BAND C — episode semantic differentiation');

{
  const byFamily = (f: BridgeEpisodeFamily) =>
    episodeResults.find(r => r.family === f && r.variant === 0)?.output;
  const solx = byFamily(BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION);
  const leva = byFamily(BridgeEpisodeFamily.LEVA_FRAGILITY_INVALIDATION);
  const unlk = byFamily(BridgeEpisodeFamily.UNLK_POST_UNLOCK_DIGESTION);
  const mockusd = byFamily(BridgeEpisodeFamily.MOCKUSD_IDENTITY_CONTESTATION);
  assert(solx && leva && unlk && mockusd, 'C.1 all 4 outputs present');
  if (solx && leva) {
    // LEVA should have more contradiction load than SOLX.
    const solxLoad = Number(solx.contradictions?.load ?? 0);
    const levaLoad = Number(leva.contradictions?.load ?? 0);
    assert(levaLoad >= solxLoad, `C.2 LEVA contradiction load (${levaLoad.toFixed(3)}) >= SOLX (${solxLoad.toFixed(3)})`);
    // LEVA confidence should be capped versus SOLX clean.
    const solxConf = Number(solx.confidence?.score ?? 0);
    const levaConf = Number(leva.confidence?.score ?? 0);
    assert(levaConf <= solxConf, `C.3 LEVA confidence (${levaConf.toFixed(3)}) <= SOLX (${solxConf.toFixed(3)})`);
  }
  if (unlk) {
    assert(!!unlk.thesis, 'C.4 UNLK has thesis');
    assert(!!unlk.scenario, 'C.5 UNLK has scenario');
  }
  if (mockusd) {
    // Verify data_completeness signal propagated as low coverage.
    // BTAR-TC-001: coverage_score not present on evidence type; derive coverage
    // proxy from existing evidence array shape (positive vs total).
    const ev = mockusd.evidence;
    const positives = ev?.positive?.length ?? 0;
    const total = positives + (ev?.unresolved?.length ?? 0) + (ev?.negative?.length ?? 0) + (ev?.stale?.length ?? 0);
    const coverage = total > 0 ? positives / total : 0;
    assert(coverage <= 0.5 || mockusd.quality_checks !== undefined,
      `C.6 MOCKUSD records low coverage or quality flag (coverage=${coverage})`);
  }
}

// ── BAND D : Regime / hypothesis / timing / scenario surfaces ────
band('BAND D — regime / hypothesis / timing / scenario surfaces');

{
  for (const r of episodeResults) {
    if (!r.output) continue;
    assert(!!r.output.regime?.macro?.posture, `D.1 ${r.family} has regime posture`);
    assert(!!r.output.thesis?.primary?.hypothesis, `D.2 ${r.family} has primary hypothesis`);
    assert(!!r.output.timing?.phase, `D.3 ${r.family} has timing phase`);
    assert(!!r.output.scenario, `D.4 ${r.family} has scenario`);
    assert(!!r.output.confidence, `D.5 ${r.family} has confidence`);
    assert(!!r.output.state, `D.6 ${r.family} has state`);
    assert(!!r.output.cause, `D.7 ${r.family} has cause`);
  }
}

// ── BAND E : Contradiction and uncertainty behavior ──────────────
band('BAND E — contradiction and uncertainty behavior');

{
  const leva = episodeResults.find(r => r.family === BridgeEpisodeFamily.LEVA_FRAGILITY_INVALIDATION)?.output;
  const unlk = episodeResults.find(r => r.family === BridgeEpisodeFamily.UNLK_POST_UNLOCK_DIGESTION)?.output;
  const mockusd = episodeResults.find(r => r.family === BridgeEpisodeFamily.MOCKUSD_IDENTITY_CONTESTATION)?.output;
  // LEVA contradiction present.
  if (leva) {
    const load = Number(leva.contradictions?.load ?? 0);
    assert(load > 0.05, `E.1 LEVA contradiction load > 0.05 (got ${load.toFixed(3)})`);
  }
  // UNLK event-conditioned narrowing or any present scenario.
  if (unlk) {
    assert(!!unlk.scenario, 'E.2 UNLK has scenario shape');
  }
  // MOCKUSD ambiguity recorded — low coverage flag or limited confidence.
  if (mockusd) {
    // BTAR-TC-001: coverage_score not present on evidence type; derive coverage
    // proxy from existing evidence array shape (positive vs total).
    const ev = mockusd.evidence;
    const positives = ev?.positive?.length ?? 0;
    const total = positives + (ev?.unresolved?.length ?? 0) + (ev?.negative?.length ?? 0) + (ev?.stale?.length ?? 0);
    const coverage = total > 0 ? positives / total : 0;
    const conf = Number(mockusd.confidence?.score ?? 0);
    assert(coverage <= 0.6 || conf < 0.85, `E.3 MOCKUSD ambiguity recorded (coverage=${coverage}, conf=${conf.toFixed(3)})`);
  }
}

// ── BAND F : Corpus stability ────────────────────────────────────
band('BAND F — corpus stability');

const corpus = buildAjp1Corpus();
const corpusResults: Ajp1EpisodeResult[] = [];
{
  for (const entry of corpus) {
    const r = runAjp1Episode(entry.family, entry.variant, entry.input);
    corpusResults.push(r);
    allDigests.push(r.digest);
  }
  const corpusErrored = corpusResults.filter(r => r.digest.errored).length;
  assert(corpusErrored === 0, `F.1 corpus ran without errors (${corpusErrored} errored)`);
  // Deterministic replay: re-run a sample and compare fingerprints.
  const sample = corpus[0];
  const replay = runAjp1Episode(sample.family, sample.variant, sample.input);
  const original = corpusResults[0];
  assert(replay.digest.product_output_fingerprint === original.digest.product_output_fingerprint,
    'F.2 corpus replay deterministic (same fingerprint for repeated run)');
  // Family grouping coherent: contradiction loads cluster by family.
  const solxLoads = corpusResults.filter(r => r.family === BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION)
    .map(r => r.digest.contradiction_load);
  const levaLoads = corpusResults.filter(r => r.family === BridgeEpisodeFamily.LEVA_FRAGILITY_INVALIDATION)
    .map(r => r.digest.contradiction_load);
  const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
  assert(avg(levaLoads) > avg(solxLoads),
    `F.3 LEVA avg contradiction load (${avg(levaLoads).toFixed(3)}) > SOLX (${avg(solxLoads).toFixed(3)})`);
}

// ── BAND G : Reconciliation evidence emission ────────────────────
band('BAND G — reconciliation evidence emission');

{
  // Every digest carries reconciliation flags.
  const allHaveFlags = allDigests.every(d => d.reconciliation_flags.length > 0);
  assert(allHaveFlags, 'G.1 every run carries reconciliation flags');
  // L9 divergence flag present on every run (active timing != L9).
  const allHaveL9Flag = allDigests.every(d =>
    d.reconciliation_flags.includes('ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9' as any));
  assert(allHaveL9Flag, 'G.2 every run flags ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9');
  // L13 governance divergence flag present.
  const allHaveL13Flag = allDigests.every(d =>
    d.reconciliation_flags.includes('ACTIVE_AI_PATH_NOT_L13_GOVERNED' as any));
  assert(allHaveL13Flag, 'G.3 every run flags ACTIVE_AI_PATH_NOT_L13_GOVERNED');
  // Fingerprint stable.
  const fp1 = deriveAjp1AggregateFingerprint(allDigests);
  const fp2 = deriveAjp1AggregateFingerprint(allDigests);
  assert(fp1 === fp2, 'G.4 aggregate fingerprint deterministic');
  assert(fp1.startsWith('ajp1.fp.'), `G.5 fingerprint prefix correct: ${fp1.substring(0, 16)}...`);
}

// ── BAND H : Invariants and final artifact ───────────────────────
band('BAND H — invariants and final artifact');

{
  // Re-run digests for AJP-INV-G determinism check.
  const secondRunDigests = [...episodeResults, ...corpusResults].map(r => {
    const replay = runAjp1Episode(r.family, r.variant, buildAjp1Input(r.family, r.variant));
    return replay.digest;
  });
  const invs = runAllAjp1Invariants({
    results: [...episodeResults, ...corpusResults],
    digests: allDigests,
    secondRunDigests,
    artifactScope: BridgeCertificationScope.AJP1_ACTIVE_PRODUCT_PIPELINE,
  });
  assert(invs.length === 10, `H.1 ten invariants executed (got ${invs.length})`);
  for (const i of invs) {
    assert(i.holds, `H.2 ${i.id} ${i.name} (${i.evidence})`);
  }
  // Artifact emission scope declaration.
  const artifact = {
    certification_scope: BridgeCertificationScope.AJP1_ACTIVE_PRODUCT_PIPELINE,
    is_unified_cip1: false as const,
    certifies_active_product_pipeline: true as const,
    certifies_constitutional_l5_l14_chain: false as const,
    episodes_green: episodeResults.filter(r => !r.digest.errored).length,
    episodes_total: episodeResults.length,
    corpus_green: corpusResults.filter(r => !r.digest.errored).length,
    corpus_total: corpusResults.length,
    invariants_green: invs.filter(i => i.holds).length,
    invariants_total: invs.length,
    fingerprint: deriveAjp1AggregateFingerprint(allDigests),
  };
  assert(artifact.is_unified_cip1 === false, 'H.3 artifact declares is_unified_cip1=false');
  assert(artifact.certifies_constitutional_l5_l14_chain === false, 'H.4 artifact declares no L5-L14 chain claim');
  assert(artifact.episodes_green === 4, `H.5 4/4 episodes green (got ${artifact.episodes_green})`);
  assert(artifact.corpus_green === 20, `H.6 20/20 corpus green (got ${artifact.corpus_green})`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('AJP.1 — ACTIVE_JUDGMENT_PIPELINE_GREEN');
  console.log(`  scope:                ${artifact.certification_scope}`);
  console.log(`  episodes:             ${artifact.episodes_green}/${artifact.episodes_total}`);
  console.log(`  corpus runs:          ${artifact.corpus_green}/${artifact.corpus_total}`);
  console.log(`  invariants:           ${artifact.invariants_green}/${artifact.invariants_total}`);
  console.log(`  fingerprint:          ${artifact.fingerprint}`);
  console.log(`  is_unified_cip1:      false`);
  console.log(`  certifies_constitutional_l5_l14: false`);
  console.log('═══════════════════════════════════════════════════════════════');
}

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
