/**
 * L6.8 — Band Runner
 *
 * §6.8.4.4 — Master orchestrator mechanics. A band runner accepts a set of
 * band definitions, runs each, and returns a typed `L6BandOutcome` for the
 * certification artifact. Used by `test-l6-master.ts` and by in-process
 * invariant tests.
 */

import {
  L6CertificationBand,
} from './l6-certification-level';
import { L6BandOutcome } from './l6-certification-report';

export interface L6BandAssertionRecorder {
  assert(cond: boolean, label: string): void;
  readonly passed: number;
  readonly failed: number;
  readonly failures: readonly string[];
}

export function createRecorder(): L6BandAssertionRecorder {
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

export interface L6BandDefinition {
  readonly band: L6CertificationBand;
  readonly run: (recorder: L6BandAssertionRecorder) => void | Promise<void>;
}

export async function runBand(def: L6BandDefinition): Promise<L6BandOutcome> {
  const recorder = createRecorder();
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

export async function runBands(
  defs: readonly L6BandDefinition[],
): Promise<readonly L6BandOutcome[]> {
  const outcomes: L6BandOutcome[] = [];
  for (const d of defs) {
    outcomes.push(await runBand(d));
  }
  return outcomes;
}
