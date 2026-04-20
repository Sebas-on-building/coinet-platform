/**
 * L9.9 — Band Runner
 *
 * §9.9.6 — Low-level orchestration mechanic each L9 band uses to
 * record assertions and emit a typed `L9BandOutcome` for the master
 * certification harness.
 */

import { L9CertificationBand } from './l9-certification-band';
import { L9BandOutcome } from './l9-certification-report';

export interface L9BandAssertionRecorder {
  assert(cond: boolean, label: string): void;
  readonly passed: number;
  readonly failed: number;
  readonly failures: readonly string[];
}

export function createL9Recorder(): L9BandAssertionRecorder {
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

export interface L9BandDefinition {
  readonly band: L9CertificationBand;
  readonly run: (recorder: L9BandAssertionRecorder) => void | Promise<void>;
}

export async function runL9Band(
  def: L9BandDefinition,
): Promise<L9BandOutcome> {
  const recorder = createL9Recorder();
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

export async function runL9Bands(
  defs: readonly L9BandDefinition[],
): Promise<readonly L9BandOutcome[]> {
  const outcomes: L9BandOutcome[] = [];
  for (const d of defs) outcomes.push(await runL9Band(d));
  return outcomes;
}
