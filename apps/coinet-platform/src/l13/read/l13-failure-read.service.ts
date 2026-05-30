/**
 * L13.10 — Failure Read Service
 *
 * §13.10.29 / §13.10.30 — Governed read surface for output failure
 * records.
 */

import type { L13AIOutputFailureRecord } from '../contracts/l13-output-failure-record';
import {
  getAllL13AIOutputFailures,
  getL13AIOutputFailuresByRunId,
} from './l13-durable-store';

export function readL13AIOutputFailuresByRunId(
  runId: string,
): readonly L13AIOutputFailureRecord[] {
  return getL13AIOutputFailuresByRunId(runId);
}

export function readAllL13AIOutputFailures():
  readonly L13AIOutputFailureRecord[] {
  return getAllL13AIOutputFailures();
}
