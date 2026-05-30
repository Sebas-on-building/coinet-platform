/**
 * Bridge Comparison Ledger — Emitter
 *
 * §37 / §38 — Runs AJP.1 + CIP.0.5 (spawned), parses their fingerprints
 * and final status, and emits a normalized comparison ledger that the
 * future reconciliation matrix will consume.
 *
 * Honest non-comparability is preserved: dimensions that legitimately
 * cannot be compared between the two systems are marked explicitly.
 */

import { execFileSync } from 'child_process';
import * as path from 'path';
import { fnv1a } from '../l13/context/_fnv1a';
import { BridgeEpisodeFamily } from '../integration/bridge-certification/contracts/bridge-synthetic-episode';
import type {
  BridgeComparisonLedger,
  BridgeEpisodeComparison,
} from '../integration/bridge-certification/contracts/bridge-comparison-evidence';

const POLICY_V = 'bridge.ledger.v1';
const TS_NODE = path.resolve(__dirname, '..', '..', 'node_modules', '.bin', 'ts-node');
const TS_CONFIG = path.resolve(__dirname, '..', '..', 'tsconfig.json');

function runScript(script: string): { passed: number; failed: number; fingerprint: string; raw: string } {
  let out = '';
  try {
    out = execFileSync(TS_NODE, ['--transpile-only', '-P', TS_CONFIG, path.join(__dirname, script)], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e: any) {
    out = (e?.stdout?.toString() ?? '') + (e?.stderr?.toString() ?? '');
  }
  const p = out.match(/Passed:\s+(\d+)/);
  const f = out.match(/Failed:\s+(\d+)/);
  const fp = out.match(/(?:ajp1|cip05)\.fp\.[a-f0-9]+/);
  return {
    passed: p ? parseInt(p[1], 10) : 0,
    failed: f ? parseInt(f[1], 10) : 1,
    fingerprint: fp ? fp[0] : 'unknown.fp',
    raw: out,
  };
}

console.log('Bridge Comparison Ledger Emitter');
console.log('');
console.log('── Running AJP.1 ──');
const ajp1 = runScript('test-ajp1-active-judgment-pipeline.ts');
console.log(`  AJP.1: ${ajp1.passed} passed / ${ajp1.failed} failed (fp: ${ajp1.fingerprint})`);
console.log('');
console.log('── Running CIP.0.5 ──');
const cip05 = runScript('test-cip05-certified-runtime.ts');
console.log(`  CIP.0.5: ${cip05.passed} passed / ${cip05.failed} failed (fp: ${cip05.fingerprint})`);
console.log('');

if (ajp1.failed > 0 || cip05.failed > 0) {
  console.log('One or both bridge certifications failed. Ledger emission BLOCKED.');
  process.exit(1);
}

// Per-episode comparison — captured at the *family* level since neither
// cert exposes raw per-episode digests through stdout. Future work: have
// both certs emit JSON artifacts to .artifacts/ for proper digest joining.
const families: ReadonlyArray<BridgeEpisodeFamily> = [
  BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION,
  BridgeEpisodeFamily.LEVA_FRAGILITY_INVALIDATION,
  BridgeEpisodeFamily.UNLK_POST_UNLOCK_DIGESTION,
  BridgeEpisodeFamily.MOCKUSD_IDENTITY_CONTESTATION,
];

const episodeComparisons: BridgeEpisodeComparison[] = families.map(family => {
  const ajpDigestRef = `ajp1.run.${family}.v0`;
  const cipDigestRef = `cip05.run.${family}.v0`;

  // Per §38: explicit non-comparable dimensions.
  const nonComparable: string[] = [
    'L13_RUNTIME_GOVERNANCE', // active uses real Anthropic, certified uses INTERNAL_MOCK
    'L9_TIMING_ENGINE',       // active uses services/judgment/timing-engine, certified path skips L9
    'L11_SCORING_RUNTIME',    // active uses OmniScore, certified L11 DAG is dormant
    'L12_SCENARIO_RUNTIME',   // active uses in-service scenarios, certified L12 DAG is dormant
    'PRODUCT_DELIVERY_CHANNEL', // active has no L14.3 channel runtime wired
  ];
  const comparable: string[] = [
    'L8_REGIME_CLASSIFICATION', // active uses L8 wrapper; comparable on regime posture
    'L10_HYPOTHESIS_RANKING',   // active uses L10 wrapper; comparable on primary hypothesis
    'SCOPE_HONESTY',            // both must declare not-CIP.1
    'EPISODE_DIFFERENTIATION',  // both must distinguish SOLX vs LEVA vs UNLK
    'DETERMINISM',              // both must produce stable fingerprints
  ];

  // Family-specific overlap/divergence notes.
  let overlap: string[] = [];
  let divergence: string[] = [];
  let priority: 'P0' | 'P1' | 'P2' | 'P3' = 'P2';
  switch (family) {
    case BridgeEpisodeFamily.SOLX_SPOT_LED_CONTINUATION:
      overlap = [
        'both systems classify constructive regime via L8 wrapper',
        'both systems produce primary hypothesis from L10 ranker',
      ];
      divergence = [
        'active emits real explanation text via services/explanations (Anthropic)',
        'certified path emits governed AlertOutcomeEvaluation through L14.5',
      ];
      priority = 'P2';
      break;
    case BridgeEpisodeFamily.LEVA_FRAGILITY_INVALIDATION:
      overlap = [
        'both systems detect elevated contradiction load',
        'both systems narrow confidence below SOLX clean case',
      ];
      divergence = [
        'active confidence calculation uses in-service formula',
        'certified path applies L13.5 expression governance + L14.5 evaluation',
      ];
      priority = 'P1';
      break;
    case BridgeEpisodeFamily.UNLK_POST_UNLOCK_DIGESTION:
      overlap = [
        'both systems produce hypothesis sensitive to unlock pressure',
      ];
      divergence = [
        'active scenario builder treats unlock as in-service variant',
        'certified L12 scenario template engine (dormant) would represent this via post-event template',
      ];
      priority = 'P1';
      break;
    case BridgeEpisodeFamily.MOCKUSD_IDENTITY_CONTESTATION:
      overlap = [
        'both systems acknowledge low data completeness',
      ];
      divergence = [
        'active product has no constitutional L3 identity gating',
        'certified path blocks delivery via entitlement+restriction profile (L14.3 disposition = SUPPRESS_WITH_RECORD)',
      ];
      priority = 'P0'; // identity-level divergence is highest priority for reconciliation
      break;
  }

  return {
    episode_family: family,
    ajp1_run_digest_ref: ajpDigestRef,
    cip05_run_digest_ref: cipDigestRef,
    comparable_dimensions: comparable,
    non_comparable_dimensions: nonComparable,
    preliminary_overlap_notes: overlap,
    preliminary_divergence_notes: divergence,
    matrix_priority_hint: priority,
    reconciliation_required: true,
  };
});

const divergenceSignals: string[] = [
  'ACTIVE_AI_PATH_NOT_L13_GOVERNED',           // real Anthropic vs certified L13
  'ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9',   // in-service timing vs L9 DAG
  'ACTIVE_PIPELINE_LACKS_CERTIFIED_IDENTITY_GATING', // no L3 gate in active
  'CERTIFIED_RUNTIME_DEPENDS_ON_SYNTHETIC_UPSTREAM',  // CIP.0.5 declared
  'CIP05_L13_RUNTIME_INVOCATION_DEFERRED_TO_CIP06',   // CIP.0.5 declared
  'PRODUCT_DELIVERY_NOT_YET_FULLY_L14_WIRED',  // no L14.3 channel adapters in active
];

const ledgerId = `bridge.ledger.${fnv1a([
  ajp1.fingerprint, cip05.fingerprint,
  episodeComparisons.map(e => e.episode_family).join(','),
  POLICY_V,
].join('|'))}`;

const ledger: BridgeComparisonLedger = {
  ledger_id: ledgerId,
  ajp1_artifact_ref: `ajp1.artifact.${ajp1.fingerprint}`,
  cip05_artifact_ref: `cip05.artifact.${cip05.fingerprint}`,
  episode_comparisons: episodeComparisons,
  divergence_signal_refs: divergenceSignals,
  ajp1_fingerprint: ajp1.fingerprint,
  cip05_fingerprint: cip05.fingerprint,
  generated_at: new Date().toISOString(),
  lineage_refs: ['bridge.lineage'],
  replay_hash: ledgerId,
};

console.log('═══════════════════════════════════════════════════════════════');
console.log('BRIDGE COMPARISON LEDGER');
console.log(`  ledger_id:             ${ledger.ledger_id}`);
console.log(`  ajp1_fingerprint:      ${ledger.ajp1_fingerprint}`);
console.log(`  cip05_fingerprint:     ${ledger.cip05_fingerprint}`);
console.log(`  episode comparisons:   ${ledger.episode_comparisons.length}`);
console.log(`  divergence signals:    ${ledger.divergence_signal_refs.length}`);
console.log('');
console.log('Per-episode reconciliation priorities:');
for (const c of ledger.episode_comparisons) {
  console.log(`  ${c.matrix_priority_hint}  ${c.episode_family}`);
  for (const o of c.preliminary_overlap_notes) console.log(`     overlap:    ${o}`);
  for (const d of c.preliminary_divergence_notes) console.log(`     divergence: ${d}`);
}
console.log('');
console.log('Standing divergence signals:');
for (const s of ledger.divergence_signal_refs) console.log(`  - ${s}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Bridge ledger emission complete. Both certs green.');
console.log('Next step: write apps/coinet-platform/docs/reconciliation-matrix.md from this ledger.');
