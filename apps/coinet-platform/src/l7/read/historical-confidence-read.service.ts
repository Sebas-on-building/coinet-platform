/**
 * L7.6 — Historical Confidence Read Service
 *
 * §7.6.7.7 — "Confidence history by subject/scope/window" surface.
 * Confidence transitions are an append-only sequence so downstream
 * layers can reason over reliance over time. Persistence is L5's
 * responsibility (§7.6.7.4).
 */

import { L7ValidationConfidenceDecision } from '../contracts/validation-confidence.policy';

export interface L7ConfidenceHistoryWindow {
  readonly subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly from_iso: string;
  readonly to_iso: string;
}

export interface L7HistoricalConfidenceReadSurface {
  getConfidenceHistory(
    window: L7ConfidenceHistoryWindow,
  ): Promise<readonly L7ValidationConfidenceDecision[]>;
}

export class L7InMemoryHistoricalConfidenceReadService
  implements L7HistoricalConfidenceReadSurface
{
  private readonly transitions = new Map<string, L7ValidationConfidenceDecision[]>();

  append(
    decision: L7ValidationConfidenceDecision,
    scope: { readonly scope_type: string; readonly scope_id: string },
  ): void {
    const k = keyOf(decision.validation_subject_id, scope.scope_type, scope.scope_id);
    const arr = this.transitions.get(k) ?? [];
    arr.push(decision);
    this.transitions.set(k, arr);
  }

  async getConfidenceHistory(
    window: L7ConfidenceHistoryWindow,
  ): Promise<readonly L7ValidationConfidenceDecision[]> {
    const k = keyOf(window.subject_id, window.scope_type, window.scope_id);
    const arr = this.transitions.get(k) ?? [];
    return arr.slice();
  }
}

function keyOf(subjectId: string, scopeType: string, scopeId: string): string {
  return `${scopeType}|${scopeId}|${subjectId}`;
}
