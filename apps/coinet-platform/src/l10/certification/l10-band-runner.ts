/**
 * L10.9 — Band Runner
 *
 * §10.9.10 — Low-level orchestration mechanic each L10 band uses to
 * record assertions and emit a typed `L10BandOutcome` for the master
 * certification harness.
 */

import { L10CertificationBand } from './l10-certification-band';
import { L10BandOutcome } from './l10-certification-report';

export interface L10BandAssertionRecorder {
  assert(cond: boolean, label: string): void;
  readonly passed: number;
  readonly failed: number;
  readonly failures: readonly string[];
}

export function createL10Recorder(): L10BandAssertionRecorder {
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

export interface L10BandDefinition {
  readonly band: L10CertificationBand;
  readonly run: (recorder: L10BandAssertionRecorder) => void | Promise<void>;
}

export async function runL10Band(
  def: L10BandDefinition,
): Promise<L10BandOutcome> {
  const recorder = createL10Recorder();
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

export async function runL10Bands(
  defs: readonly L10BandDefinition[],
): Promise<readonly L10BandOutcome[]> {
  const outcomes: L10BandOutcome[] = [];
  for (const d of defs) outcomes.push(await runL10Band(d));
  return outcomes;
}
