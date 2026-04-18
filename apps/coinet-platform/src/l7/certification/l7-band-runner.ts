/**
 * L7.8 — Band Runner
 *
 * §7.8.3.2 Phase A / §7.8.8.1 — The band runner is the low-level
 * orchestration mechanic that each certification band uses to record
 * assertions and convert them into a typed `L7BandOutcome`. The master
 * certification (`l7-master-certification.ts`) composes bands through
 * this runner and feeds the outcomes into
 * `buildL7CertificationArtifact`.
 */

import { L7CertificationBand } from './l7-certification-band';
import { L7BandOutcome } from './l7-certification-report';

export interface L7BandAssertionRecorder {
  assert(cond: boolean, label: string): void;
  readonly passed: number;
  readonly failed: number;
  readonly failures: readonly string[];
}

export function createL7Recorder(): L7BandAssertionRecorder {
  let p = 0;
  let f = 0;
  const failures: string[] = [];
  return {
    assert(cond: boolean, label: string): void {
      if (cond) { p++; }
      else { f++; failures.push(label); }
    },
    get passed() { return p; },
    get failed() { return f; },
    get failures() { return failures; },
  };
}

export interface L7BandDefinition {
  readonly band: L7CertificationBand;
  readonly run: (recorder: L7BandAssertionRecorder) => void | Promise<void>;
}

export async function runL7Band(def: L7BandDefinition): Promise<L7BandOutcome> {
  const recorder = createL7Recorder();
  const t0 = Date.now();
  try {
    await def.run(recorder);
  } catch (err) {
    recorder.assert(false, `uncaught error: ${(err as Error).message}`);
  }
  const duration_ms = Date.now() - t0;
  return {
    band: def.band,
    passed: recorder.passed,
    failed: recorder.failed,
    duration_ms,
    ok: recorder.failed === 0,
    blocking_violations: recorder.failed === 0 ? [] : [...recorder.failures],
  };
}

export async function runL7Bands(
  defs: readonly L7BandDefinition[],
): Promise<readonly L7BandOutcome[]> {
  const outcomes: L7BandOutcome[] = [];
  for (const d of defs) {
    outcomes.push(await runL7Band(d));
  }
  return outcomes;
}
