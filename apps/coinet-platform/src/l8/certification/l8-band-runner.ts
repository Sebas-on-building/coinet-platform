/**
 * L8.9 — Band Runner
 *
 * §8.9.6 — Low-level orchestration mechanic each L8 band uses to
 * record assertions and emit a typed `L8BandOutcome` for the master
 * certification harness.
 */

import { L8CertificationBand } from './l8-certification-band';
import { L8BandOutcome } from './l8-certification-report';

export interface L8BandAssertionRecorder {
  assert(cond: boolean, label: string): void;
  readonly passed: number;
  readonly failed: number;
  readonly failures: readonly string[];
}

export function createL8Recorder(): L8BandAssertionRecorder {
  let p = 0;
  let f = 0;
  const failures: string[] = [];
  return {
    assert(cond: boolean, label: string): void {
      if (cond) p++;
      else { f++; failures.push(label); }
    },
    get passed() { return p; },
    get failed() { return f; },
    get failures() { return failures; },
  };
}

export interface L8BandDefinition {
  readonly band: L8CertificationBand;
  readonly run: (recorder: L8BandAssertionRecorder) => void | Promise<void>;
}

export async function runL8Band(
  def: L8BandDefinition,
): Promise<L8BandOutcome> {
  const recorder = createL8Recorder();
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
    blocking_violations:
      recorder.failed === 0 ? [] : [...recorder.failures],
  };
}

export async function runL8Bands(
  defs: readonly L8BandDefinition[],
): Promise<readonly L8BandOutcome[]> {
  const outcomes: L8BandOutcome[] = [];
  for (const d of defs) outcomes.push(await runL8Band(d));
  return outcomes;
}
