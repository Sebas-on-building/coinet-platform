/**
 * L13.10 — Output Read Service
 *
 * §13.10.29 / §13.10.30 — Governed read surface for current AI
 * output authority records. Never exposes raw storage authority.
 */

import type { L13CurrentAIOutputRecord } from '../contracts/l13-current-output-record';
import {
  getAllL13CurrentAIOutputs,
  getL13CurrentAIOutputByOutputId,
} from './l13-durable-store';

export function readL13CurrentAIOutputByOutputId(
  outputId: string,
): L13CurrentAIOutputRecord | undefined {
  return getL13CurrentAIOutputByOutputId(outputId);
}

export function readL13CurrentAIOutputByRequestId(
  requestId: string,
): L13CurrentAIOutputRecord | undefined {
  return getAllL13CurrentAIOutputs().find(r => r.request_id === requestId);
}

export function readL13CurrentAIOutputByRunId(
  runId: string,
): L13CurrentAIOutputRecord | undefined {
  return getAllL13CurrentAIOutputs().find(r => r.runtime_run_id === runId);
}
