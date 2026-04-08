/**
 * Layer 3 — Master Certification Harness
 *
 * Runs all Layer 3 test bands and reports certification state.
 *
 * Band A: Constitutional unit tests (L3.1–L3.6 individual suites)
 * Band B: Cross-layer system tests
 * Band C: Adversarial tests
 * Band D: Mutation control band
 * Band E: Property-based fuzzing
 *
 * Reports three certification states:
 *   - Constitutional Green: all layer-local suites green
 *   - Production Green: cross-layer + adversarial + enforcement green
 *   - Forensic Green: mutation + rollback + ancestry + replay green
 */

import { execSync } from 'child_process';
import * as path from 'path';

const DIST_DIR = path.resolve(__dirname, '..');

interface SuiteResult {
  name: string;
  band: string;
  passed: number;
  failed: number;
  time: number;
}

function parseResults(output: string): { passed: number; failed: number } {
  const m1 = output.match(/(\d+)\s+passed,\s+(\d+)\s+failed/);
  if (m1) return { passed: parseInt(m1[1]), failed: parseInt(m1[2]) };
  const m2 = output.match(/Passed:\s*(\d+)\s+Failed:\s*(\d+)/i);
  if (m2) return { passed: parseInt(m2[1]), failed: parseInt(m2[2]) };
  const m3 = output.match(/TOTAL:\s*(\d+)\s*\|[^|]*?(\d+)\s*\|[^|]*?(\d+)/);
  if (m3) return { passed: parseInt(m3[2]), failed: parseInt(m3[3]) };
  const mp = output.match(/passed:\s*(\d+)/i);
  const mf = output.match(/failed:\s*(\d+)/i);
  if (mp || mf) return { passed: mp ? parseInt(mp[1]) : 0, failed: mf ? parseInt(mf[1]) : 0 };
  return { passed: 0, failed: 0 };
}

function runSuite(script: string, name: string, band: string): SuiteResult {
  const start = Date.now();
  try {
    const output = execSync(`node ${path.join(DIST_DIR, 'scripts', script)}`, {
      encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const { passed, failed } = parseResults(output);
    return { name, band, passed, failed, time: Date.now() - start };
  } catch (e: any) {
    const output = (e.stdout || '') + (e.stderr || '');
    const { passed, failed } = parseResults(output);
    return { name, band, passed, failed: failed || 1, time: Date.now() - start };
  }
}

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║       LAYER 3 — MASTER CERTIFICATION HARNESS             ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log('║  Target: 950+ assertions, 0 failures                    ║');
console.log('║  Certification: Constitutional → Production → Forensic  ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const results: SuiteResult[] = [];

// ── Band A: Constitutional unit tests ────────────────────────────────────────
console.log('═══ BAND A: Constitutional Unit Tests ═══');
results.push(runSuite('test-l31-ontology.js', 'L3.1 Ontology', 'A'));
results.push(runSuite('test-l32-identity-resolution.js', 'L3.2 Identity Resolution', 'A'));
results.push(runSuite('test-l33-entity-confidence.js', 'L3.3-A Confidence Core', 'A'));
results.push(runSuite('test-l33-confidence-gate.js', 'L3.3-B Confidence Gate', 'A'));
results.push(runSuite('test-l34-reconciliation.js', 'L3.4 Reconciliation', 'A'));
results.push(runSuite('test-l35-metric-namespace.js', 'L3.5 Metric Namespace', 'A'));
results.push(runSuite('test-l36-versioning-mutation.js', 'L3.6 Versioning & Mutation', 'A'));

// ── Band B-E: Master certification tests ─────────────────────────────────────
console.log('\n═══ BAND B: Cross-Layer System Tests ═══');
results.push(runSuite('test-l3-master-cross-layer.js', 'Cross-Layer', 'B'));

console.log('═══ BAND C: Adversarial Tests ═══');
results.push(runSuite('test-l3-master-adversarial.js', 'Adversarial', 'C'));

console.log('═══ BAND D: Mutation Control Band ═══');
results.push(runSuite('test-l3-master-mutation-control.js', 'Mutation Control', 'D'));

console.log('═══ BAND E: Property-Based Fuzzing ═══');
results.push(runSuite('test-l3-master-fuzzing.js', 'Fuzzing', 'E'));

// ── Results ──────────────────────────────────────────────────────────────────
console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                    CERTIFICATION REPORT                  ║');
console.log('╠═══════════════════════════════════════════════════════════╣');

let totalPassed = 0;
let totalFailed = 0;
let totalTime = 0;

for (const r of results) {
  const status = r.failed === 0 ? '✅' : '❌';
  const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
  console.log(`║  ${status} ${pad(r.name, 32)} ${String(r.passed).padStart(4)} passed  ${String(r.failed).padStart(3)} failed  ${String(r.time).padStart(5)}ms ║`);
  totalPassed += r.passed;
  totalFailed += r.failed;
  totalTime += r.time;
}

console.log('╠═══════════════════════════════════════════════════════════╣');
console.log(`║  TOTAL: ${String(totalPassed + totalFailed).padStart(5)} assertions — ${String(totalPassed).padStart(5)} passed, ${String(totalFailed).padStart(4)} failed      ║`);
console.log(`║  TIME:  ${String(totalTime).padStart(5)}ms                                          ║`);
console.log('╠═══════════════════════════════════════════════════════════╣');

const bandA = results.filter(r => r.band === 'A');
const bandBCE = results.filter(r => r.band === 'B' || r.band === 'C' || r.band === 'E');
const bandD = results.filter(r => r.band === 'D');

const constitutionalGreen = bandA.every(r => r.failed === 0);
const productionGreen = constitutionalGreen && bandBCE.every(r => r.failed === 0);
const forensicGreen = productionGreen && bandD.every(r => r.failed === 0);

console.log(`║  Constitutional Green: ${constitutionalGreen ? '✅ YES' : '❌ NO '}                                ║`);
console.log(`║  Production Green:     ${productionGreen ? '✅ YES' : '❌ NO '}                                ║`);
console.log(`║  Forensic Green:       ${forensicGreen ? '✅ YES' : '❌ NO '}                                ║`);
console.log('╚═══════════════════════════════════════════════════════════╝');

if (totalPassed >= 950) {
  console.log(`\n  🏆 CERTIFICATION TARGET MET: ${totalPassed} assertions ≥ 950`);
} else {
  console.log(`\n  ⚠  CERTIFICATION TARGET NOT MET: ${totalPassed} < 950`);
}

if (totalFailed > 0) {
  console.log(`\n  ${totalFailed} FAILURES — Layer 3 is NOT certified.\n`);
  process.exit(1);
} else {
  console.log(`\n  Layer 3 is CERTIFIED.\n`);
}
