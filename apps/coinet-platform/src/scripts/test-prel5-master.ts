/**
 * Pre-L5 Integrated Systems Certification — Master Orchestrator
 *
 * Runs all certification bands (B through H) in sequence after compilation.
 * Band A (local regression) is represented by existing L3/L4 masters.
 *
 * Usage: node dist/scripts/test-prel5-master.js [--no-compile]
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.join(__dirname, '..', '..');
const SCRIPTS_DIR = __dirname;

const BANDS = [
  { name: 'Band A — L4 Local Regression',        file: 'test-layer1-master.js',             args: ['--no-compile'] },
  { name: 'Band B — Cross-Layer Truth Chain',     file: 'test-prel5-truth-chain.js',         args: [] },
  { name: 'Band C — Temporal and Replay Chain',   file: 'test-prel5-temporal-replay.js',     args: [] },
  { name: 'Band D — Propagation and Spillover',   file: 'test-prel5-propagation-chain.js',   args: [] },
  { name: 'Band E — Query and Package Chain',     file: 'test-prel5-query-package-chain.js', args: [] },
  { name: 'Band F — Adversarial Anti-Fake',       file: 'test-prel5-adversarial.js',         args: [] },
  { name: 'Band G — Mutation and Forensic Chain', file: 'test-prel5-mutation-forensics.js',  args: [] },
  { name: 'Band H — Performance and Soak',        file: 'test-prel5-performance-soak.js',    args: [] },
];

function compile(): boolean {
  console.log('\n═══ Pre-L5 Master: TypeScript compile ═══\n');
  const r = spawnSync('npx', ['tsc', '--project', 'tsconfig.json'], {
    cwd: ROOT, stdio: 'inherit', shell: true,
  });
  if (r.status !== 0) {
    console.error('\n  COMPILE FAILED — fix errors before certification.\n');
    return false;
  }
  return true;
}

function runBand(name: string, jsFile: string, extraArgs: string[]): { code: number; durationMs: number } {
  const full = path.join(SCRIPTS_DIR, jsFile);
  if (!fs.existsSync(full)) {
    console.error(`\n  Missing: ${full}\n`);
    return { code: 1, durationMs: 0 };
  }
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ${name}`);
  console.log(`${'═'.repeat(64)}\n`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [full, ...extraArgs], { cwd: ROOT, stdio: 'inherit' });
  return { code: r.status ?? 1, durationMs: Date.now() - t0 };
}

function main() {
  const skipCompile = process.argv.includes('--no-compile');
  if (!skipCompile && !compile()) {
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   PRE-L5 INTEGRATED SYSTEMS CERTIFICATION — FULL SUITE        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const results: { name: string; code: number; durationMs: number }[] = [];

  for (const band of BANDS) {
    const r = runBand(band.name, band.file, band.args);
    results.push({ name: band.name, ...r });
    if (r.code !== 0) {
      console.error(`\n  BAND FAILED: ${band.name} (exit ${r.code})\n`);
    }
  }

  const failed = results.filter(r => r.code !== 0);
  const passed = results.filter(r => r.code === 0);
  const totalMs = results.reduce((s, r) => s + r.durationMs, 0);

  console.log('\n' + '═'.repeat(64));
  console.log('  PRE-L5 CERTIFICATION SUMMARY');
  console.log('═'.repeat(64));
  for (const r of results) {
    const status = r.code === 0 ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${r.name}  (${r.durationMs}ms)`);
  }
  console.log('═'.repeat(64));
  console.log(`  Bands passed: ${passed.length} / ${BANDS.length}`);
  console.log(`  Bands failed: ${failed.length}`);
  console.log(`  Total time:   ${totalMs}ms`);
  console.log('═'.repeat(64));

  if (failed.length === 0) {
    console.log('\n  PRE-L5 CERTIFICATION: PASSED\n');
  } else {
    console.log('\n  PRE-L5 CERTIFICATION: NOT PASSED\n');
    console.log('  Failed bands:');
    for (const f of failed) {
      console.log(`    - ${f.name}`);
    }
    console.log('');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main();
