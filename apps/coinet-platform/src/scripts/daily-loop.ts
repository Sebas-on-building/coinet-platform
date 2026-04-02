/**
 * Daily Loop Script — Phase 6 Edge Discovery
 *
 * Run daily:
 *   npx ts-node src/scripts/daily-loop.ts
 *
 * Flow:
 *   1. Run quantum risk pipeline
 *   2. Store snapshot
 *   3. Attach yesterday's outcome (if provided)
 *   4. Run calibration + edge report
 *   5. Run grounding validation
 *   6. Print summary
 */

import { runBtcQuantumRisk } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/pipeline';
import { recordOutcome } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/outcome-tracker';
import {
  buildCalibrationReport,
  evaluateQRSBand,
  buildEdgeReport,
} from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/evaluation';
import { getAllSnapshots } from '../services/source-systems/classes/cryptographic-integrity/quantum-risk/snapshot';
import {
  buildReasoningContext,
  serializeReasoningContext,
  validateGrounding,
} from '../services/reasoning-context';

const DIVIDER = '═'.repeat(70);
const SECTION = '─'.repeat(70);

function header(title: string) {
  console.log('');
  console.log(DIVIDER);
  console.log(`  ${title}`);
  console.log(DIVIDER);
}

function section(title: string) {
  console.log('');
  console.log(SECTION);
  console.log(`  ${title}`);
  console.log(SECTION);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. RUN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

header('DAILY LOOP — ' + new Date().toISOString().slice(0, 10));

section('1. QUANTUM RISK PIPELINE');
const result = runBtcQuantumRisk();
const s = result.snapshot;
console.log(`  QRS:        ${s.score.value}/100 (${s.judgment.state})`);
console.log(`  Confidence: ${(s.judgment.confidence * 100).toFixed(0)}%`);
console.log(`  Exposure:   ${(s.features.key_exposure_rate.value * 100).toFixed(1)}%`);
console.log(`  Dormant:    ${s.features.dormant_vulnerable_supply.base.toLocaleString()} BTC`);
console.log(`  Migration:  ${(s.features.pq_migration_progress.value * 100).toFixed(0)}%`);
console.log(`  Snapshot:   ${s.id}`);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ATTACH OUTCOME (if passed via CLI args)
// ═══════════════════════════════════════════════════════════════════════════════

section('2. OUTCOME ATTACHMENT');
const args = process.argv.slice(2);
const outcomeArg = args.find(a => a.startsWith('--outcome='));
if (outcomeArg) {
  try {
    const parts = outcomeArg.replace('--outcome=', '').split(',');
    const [snapshotId, window, priceChange, volatility, ...flags] = parts;
    recordOutcome(
      snapshotId,
      window as '24h' | '7d',
      parseFloat(priceChange),
      parseFloat(volatility),
      flags,
    );
    console.log(`  Recorded: ${snapshotId} @ ${window} → ${priceChange}% / vol=${volatility}`);
  } catch (e) {
    console.log(`  Error recording outcome: ${e}`);
  }
} else {
  console.log('  No outcome provided. Pass --outcome=SNAPSHOT_ID,24h,PRICE_CHANGE,VOLATILITY,FLAG1,FLAG2');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CALIBRATION REPORT
// ═══════════════════════════════════════════════════════════════════════════════

section('3. CALIBRATION');
const cal = buildCalibrationReport();
console.log(`  Snapshots:  ${cal.total_snapshots}`);
console.log(`  Outcomes:   ${cal.total_outcomes}`);
console.log(`  Coverage:   ${(cal.coverage_pct * 100).toFixed(0)}%`);
console.log('');
console.log('  Score bands:');
for (const b of cal.bands) {
  const ret = b.avg_price_change_24h !== null ? `${b.avg_price_change_24h.toFixed(2)}%` : 'n/a';
  const vol = b.avg_volatility_24h !== null ? `${(b.avg_volatility_24h * 100).toFixed(2)}%` : 'n/a';
  console.log(`    ${b.band}: n=${b.snapshot_count} | ret24h=${ret} | vol24h=${vol}`);
}
console.log('');
console.log('  State evaluation:');
for (const [state, ev] of Object.entries(cal.by_state)) {
  const ret = ev.avg_price_change_24h !== null ? `${ev.avg_price_change_24h.toFixed(2)}%` : 'n/a';
  const vol = ev.avg_volatility_24h !== null ? `${(ev.avg_volatility_24h * 100).toFixed(2)}%` : 'n/a';
  console.log(`    ${state}: n=${ev.count} | outcomes=${ev.outcomes} | ret24h=${ret} | vol24h=${vol}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EDGE REPORT
// ═══════════════════════════════════════════════════════════════════════════════

section('4. EDGE DETECTION');
const edge = buildEdgeReport();
console.log(`  Verdict: ${edge.verdict}`);
console.log(`  Summary: ${edge.summary}`);
if (edge.signals.length > 0) {
  console.log('');
  for (const sig of edge.signals) {
    const a = sig.value_a !== null ? sig.value_a.toFixed(3) : 'n/a';
    const b = sig.value_b !== null ? sig.value_b.toFixed(3) : 'n/a';
    const d = sig.delta !== null ? sig.delta.toFixed(3) : 'n/a';
    console.log(`    [${sig.signal_strength.toUpperCase()}] ${sig.dimension}`);
    console.log(`      ${sig.comparison}: ${a} vs ${b} (delta=${d})`);
    console.log(`      → ${sig.interpretation}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GROUNDING VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

section('5. GROUNDING VALIDATION');

const ctx = buildReasoningContext(
  'BTC',
  result,
  {
    marketData: { success: true },
    enterpriseMarketData: { success: false, error: 'not configured' },
    derivativesFinal: { success: false, error: 'no key' },
    sentiment: { success: true },
    enrichedNews: { success: true },
    socialV2Result: { success: false, error: 'no key' },
    whaleContext: { success: false, error: 'no key' },
  },
);

const serialized = serializeReasoningContext(ctx);

const testPrompts = [
  "What is Bitcoin's quantum risk right now?",
  "Why is BTC considered fragile or not?",
  "What data are you missing?",
  "What would change this risk?",
  "Is this actionable right now?",
];

const idealResponses = [
  `Bitcoin's Quantum Risk Score is 67/100, placing it in the "watchlist" category with 57% confidence. About 55.3% of BTC supply uses quantum-vulnerable key types, with approximately 3,345,685 BTC sitting in long-dormant exposed addresses. PQC migration progress is only at 10%. Both fast and slow quantum scenarios are triggered.`,
  `BTC is classified as "watchlist" rather than "structurally fragile" because while exposure is significant at 55.3%, the Quantum Risk Score of 67/100 sits below the fragile threshold. The dormant supply of 3,345,685 BTC represents real concentrated risk, but confidence is moderate at 57%. The system sees structural concern without immediate crisis.`,
  `The assessment is missing real-time data from several domains: Derivatives (blind), Social (blind), Whale/On-chain (blind), Protocol substance (blind), and Structural safety (blind). Market surface, sentiment, and news are available. These blind spots limit the system's ability to make strong claims about leverage conditions, on-chain behavior, or structural legitimacy.`,
  `This risk assessment would change if: PQC migration progress moves beyond the proposal stage (currently only 10%), which would reduce the migration component score. If the proportion of quantum-vulnerable key types dropped below current 55.3% through address migration to Taproot (p2tr). Or if dormant supply patterns shifted significantly from the current 3,345,685 BTC estimate.`,
  `With a confidence level of 57% and several data domains blind, this is informational but not directly actionable as a trading signal. Quantum risk is a long-horizon structural concern. The QRS of 67/100 suggests monitoring is warranted, but the system explicitly notes this should not be used as a short-term trading signal.`,
];

console.log('  Running 5 grounding checks against ideal responses...');
console.log('');

let totalPassed = 0;
let totalFailed = 0;
let hallucinations = 0;

for (let i = 0; i < testPrompts.length; i++) {
  const report = validateGrounding(testPrompts[i], idealResponses[i], ctx);
  totalPassed += report.passed;
  totalFailed += report.failed;
  hallucinations += report.hallucinations;

  const icon = report.verdict === 'CLEAN' ? '✓' : report.verdict === 'MINOR_ISSUE' ? '~' : '✗';
  console.log(`  ${icon} Prompt ${i + 1}: "${testPrompts[i].substring(0, 50)}..."`);
  console.log(`    Verdict: ${report.verdict} | Passed: ${report.passed}/${report.total_checks}`);
  if (report.hallucinations > 0) {
    for (const c of report.checks.filter(c => c.hallucinated)) {
      console.log(`    ⚠ ${c.detail}`);
    }
  }
}

console.log('');
console.log(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed, ${hallucinations} hallucinations`);

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

header('DAILY SUMMARY');
console.log(`  Date:           ${new Date().toISOString().slice(0, 10)}`);
console.log(`  QRS:            ${s.score.value}/100 (${s.judgment.state})`);
console.log(`  Confidence:     ${(s.judgment.confidence * 100).toFixed(0)}%`);
console.log(`  Snapshots:      ${cal.total_snapshots}`);
console.log(`  Outcomes:       ${cal.total_outcomes}`);
console.log(`  Edge verdict:   ${edge.verdict}`);
console.log(`  Grounding:      ${totalPassed}/${totalPassed + totalFailed} clean`);
console.log(`  Hallucinations: ${hallucinations}`);
console.log('');
console.log(DIVIDER);
