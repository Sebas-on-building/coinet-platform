/**
 * L6.4 — WindowBuilder
 *
 * §6.4.5 — One shared window library. Every window carries a deterministic
 * identity so the same (type, scope, anchor, policy version) always produces
 * the same window_id. This is what lets replay agree with live compute.
 */

import { createHash } from 'crypto';
import { L6ScopeRef } from '../runtime/dag-node';

export enum L6WindowType {
  SHORT_HORIZON = 'SHORT_HORIZON',
  MEDIUM_HORIZON = 'MEDIUM_HORIZON',
  LONG_HORIZON = 'LONG_HORIZON',
  BASELINE = 'BASELINE',
  SCHEDULED_EVENT = 'SCHEDULED_EVENT',
  CONFIRMATION = 'CONFIRMATION',
}

export const ALL_WINDOW_TYPES: readonly L6WindowType[] = Object.values(L6WindowType);

export interface L6Window {
  readonly window_id: string;
  readonly window_type: L6WindowType;
  readonly scope: L6ScopeRef;
  readonly start: string;
  readonly end: string;
  readonly as_of: string;
  readonly build_policy_version: string;
  readonly data_coverage: number;
  readonly late_data_inclusion_flag: boolean;
}

export interface L6WindowSpec {
  readonly window_type: L6WindowType;
  readonly duration_seconds: number;
  readonly anchor: 'WALL_CLOCK' | 'AS_OF' | 'SCHEDULED';
  readonly late_data_inclusion_flag: boolean;
  readonly build_policy_version: string;
}

export class WindowBuilder {
  /**
   * Build a window deterministically. `coverage` is the fraction of expected
   * data points that are actually present, range [0,1]; the caller passes it
   * in because it requires input-surface knowledge the builder does not have.
   */
  build(
    spec: L6WindowSpec,
    scope: L6ScopeRef,
    as_of: string,
    coverage: number,
  ): L6Window {
    if (coverage < 0 || coverage > 1) {
      throw new Error(`[L6.4] WindowBuilder: coverage out of range: ${coverage}`);
    }
    const endMs = Date.parse(as_of);
    if (!Number.isFinite(endMs)) {
      throw new Error(`[L6.4] WindowBuilder: invalid as_of "${as_of}".`);
    }
    const startMs = endMs - spec.duration_seconds * 1000;
    const start = new Date(startMs).toISOString();
    const end = new Date(endMs).toISOString();

    const idMaterial = [
      spec.window_type,
      scope.scope_type,
      scope.scope_id,
      start,
      end,
      spec.build_policy_version,
      spec.anchor,
      spec.late_data_inclusion_flag ? '1' : '0',
    ].join('|');

    const window_id = 'win_' + createHash('sha256').update(idMaterial).digest('hex').slice(0, 24);

    return {
      window_id,
      window_type: spec.window_type,
      scope,
      start,
      end,
      as_of,
      build_policy_version: spec.build_policy_version,
      data_coverage: coverage,
      late_data_inclusion_flag: spec.late_data_inclusion_flag,
    };
  }

  /**
   * Determinism check: same inputs → same window_id.
   */
  static sameIdentity(a: L6Window, b: L6Window): boolean {
    return a.window_id === b.window_id;
  }
}
