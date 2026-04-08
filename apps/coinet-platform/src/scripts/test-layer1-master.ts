/**
 * Layer 1 Master Test Runner
 *
 * Compiles the app (tsc) then runs every Layer 1 suite in sequence.
 * Use: from apps/coinet-platform — `pnpm test:layer1` or after `npx tsc`:
 *       `node dist/scripts/test-layer1-master.js`
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.join(__dirname, '..', '..');
const SCRIPTS_DIR = __dirname;

const SUITES = [
  { name: 'L1.1 Doctrine', file: 'test-l11-doctrine.js' },
  { name: 'L1.2 Authority', file: 'test-l12-authority.js' },
  { name: 'L1.3 Substitution', file: 'test-l13-substitution.js' },
  { name: 'L1.4 Field/Class Health', file: 'test-l14-health.js' },
  { name: 'L1.4 Quantum Source Health', file: 'test-l14-source-health.js' },
  { name: 'L1.4.1 Speech Control', file: 'test-l14-speech-control.js' },
  { name: 'L1.5 Platform Conflicts', file: 'test-l15-conflicts.js' },
  { name: 'L1.5 Quantum Conflict Resolver', file: 'test-l15-conflict-resolution.js' },
  { name: 'L1.6 Degradation', file: 'test-l16-degradation.js' },
  { name: 'L1 Cross-Layer + Stress', file: 'test-layer1-cross-layer.js' },
];

function compile(): boolean {
  console.log('\n═══ Layer 1 Master: TypeScript compile ═══\n');
  const r = spawnSync('npx', ['tsc', '--project', 'tsconfig.json'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) {
    console.error('\n❌ tsc failed — fix compile errors before Layer 1 suite.\n');
    return false;
  }
  return true;
}

function runSuite(name: string, jsFile: string): number {
  const full = path.join(SCRIPTS_DIR, jsFile);
  if (!fs.existsSync(full)) {
    console.error(`\n❌ Missing compiled suite: ${full}\n`);
    return 1;
  }
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'═'.repeat(60)}\n`);
  const r = spawnSync(process.execPath, [full], { cwd: ROOT, stdio: 'inherit' });
  return r.status ?? 1;
}

function main() {
  const skipCompile = process.argv.includes('--no-compile');
  if (!skipCompile && !compile()) {
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     COINET LAYER 1 — FULL REGRESSION + CROSS-LAYER        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results: { name: string; code: number }[] = [];
  for (const s of SUITES) {
    const code = runSuite(s.name, s.file);
    results.push({ name: s.name, code });
    if (code !== 0) {
      console.error(`\n❌ Suite failed: ${s.name} (exit ${code})\n`);
      break;
    }
  }

  const failed = results.filter(r => r.code !== 0);
  const ok = results.filter(r => r.code === 0);

  console.log('\n' + '═'.repeat(60));
  console.log('  LAYER 1 MASTER SUMMARY');
  console.log('═'.repeat(60));
  for (const r of results) {
    console.log(`  ${r.code === 0 ? '✅' : '❌'} ${r.name}`);
  }
  console.log('═'.repeat(60));
  console.log(`  Passed: ${ok.length} / ${SUITES.length}  Failed: ${failed.length}`);
  console.log('═'.repeat(60) + '\n');

  process.exit(failed.length > 0 ? 1 : 0);
}

main();
