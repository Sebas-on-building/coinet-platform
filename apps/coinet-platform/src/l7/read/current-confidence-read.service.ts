/**
 * L7.6 — Current Confidence Read Service
 *
 * §7.6.7.7 — Contracted read surface for "current confidence by
 * subject/scope". Layer 7 does not own physical storage (§7.6.7.4);
 * this interface is the downstream-facing contract that L5/L7.4
 * persistence layers must satisfy. A small in-memory implementation is
 * provided so tests and L7.6 invariants can exercise the surface
 * without hitting durable storage.
 */

import { L7ValidationConfidenceDecision } from '../contracts/validation-confidence.policy';

export interface L7CurrentConfidenceReadSurface {
  /**
   * Returns the most recent (subject_id, scope_type, scope_id)
   * confidence decision authority-of-record from Postgres.
   */
  getCurrentConfidence(args: {
    readonly subject_id: string;
    readonly scope_type: string;
    readonly scope_id: string;
  }): Promise<L7ValidationConfidenceDecision | null>;

  /**
   * Bulk lookup; ordering matches the input order.
   */
  getCurrentConfidenceBatch(
    args: ReadonlyArray<{
      readonly subject_id: string;
      readonly scope_type: string;
      readonly scope_id: string;
    }>,
  ): Promise<readonly (L7ValidationConfidenceDecision | null)[]>;
}

/**
 * In-memory implementation suitable for tests and invariant runs.
 * Production deployments must wire a Postgres-backed implementation
 * via L5 (§7.6.7.5).
 */
export class L7InMemoryCurrentConfidenceReadService
  implements L7CurrentConfidenceReadSurface
{
  private readonly store = new Map<string, L7ValidationConfidenceDecision>();

  upsert(
    decision: L7ValidationConfidenceDecision,
    scope: { readonly scope_type: string; readonly scope_id: string },
  ): void {
    this.store.set(keyOf(decision.validation_subject_id, scope.scope_type, scope.scope_id), decision);
  }

  async getCurrentConfidence(args: {
    readonly subject_id: string;
    readonly scope_type: string;
    readonly scope_id: string;
  }): Promise<L7ValidationConfidenceDecision | null> {
    return this.store.get(keyOf(args.subject_id, args.scope_type, args.scope_id)) ?? null;
  }

  async getCurrentConfidenceBatch(
    args: ReadonlyArray<{
      readonly subject_id: string;
      readonly scope_type: string;
      readonly scope_id: string;
    }>,
  ): Promise<readonly (L7ValidationConfidenceDecision | null)[]> {
    return Promise.all(args.map(a => this.getCurrentConfidence(a)));
  }
}

function keyOf(subjectId: string, scopeType: string, scopeId: string): string {
  return `${scopeType}|${scopeId}|${subjectId}`;
}
