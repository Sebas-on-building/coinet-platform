/**
 * L6.4 — Execution Context
 *
 * §6.4.2.6 & §6.4.4.6 — Carries the per-run identity, scope watermarks, and
 * mode flags that every engine must consult before admitting a node to
 * compute. This is the one handle that makes a run reproducible.
 */

import { L6ComputeRun, L6ComputeRunMode } from './compute-run';
import { L6ScopeRef } from './dag-node';

export interface L6Watermark {
  readonly scope: L6ScopeRef;
  readonly primitive_id: string;
  readonly last_processed_as_of: string;
  readonly dirty: boolean;
}

export interface L6ExecutionContext {
  readonly compute_run: L6ComputeRun;
  readonly watermarks: ReadonlyMap<string, L6Watermark>;
  readonly journal: readonly L6JournalEntry[];
  readonly now: string;
}

export interface L6JournalEntry {
  readonly ts: string;
  readonly node_id: string;
  readonly phase:
    | 'PLAN'
    | 'READY'
    | 'RUN'
    | 'RESOLVE'
    | 'DEFER'
    | 'BLOCK'
    | 'DEGRADE'
    | 'FAIL'
    | 'SKIP';
  readonly detail: string;
}

export function watermarkKey(primitive_id: string, scope: L6ScopeRef): string {
  return `${primitive_id}|${scope.scope_type}:${scope.scope_id}`;
}

export function createExecutionContext(
  compute_run: L6ComputeRun,
  now: string = new Date().toISOString(),
): L6ExecutionContext {
  return {
    compute_run,
    watermarks: new Map(),
    journal: [],
    now,
  };
}

export function appendJournal(
  ctx: L6ExecutionContext,
  entry: L6JournalEntry,
): L6ExecutionContext {
  return {
    ...ctx,
    journal: [...ctx.journal, entry],
  };
}

export function isReplayOrRepair(ctx: L6ExecutionContext): boolean {
  return ctx.compute_run.mode === L6ComputeRunMode.REPLAY
    || ctx.compute_run.mode === L6ComputeRunMode.REPAIR;
}
