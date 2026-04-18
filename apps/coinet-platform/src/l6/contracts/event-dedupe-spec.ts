/**
 * L6.6 — Event Dedupe Specification
 *
 * §6.6.6 — Events are deduped by (family_id, scope, trigger_window_id,
 * version, lifecycle_group). This prevents repeated spam while preserving
 * event truth.
 */

import { L6EventFamilyId } from './event-family-definition';
import { L6ScopeType } from './primitive-contract';

export interface L6EventDedupeKeySpec {
  readonly family_id: L6EventFamilyId;
  readonly scope_type: L6ScopeType;
  readonly scope_id: string;
  readonly trigger_window_id: string;
  readonly version: string;
  readonly lifecycle_group: string;
  readonly suppression_namespace: string | null;
}

export const REQUIRED_DEDUPE_KEY_FIELDS: readonly (keyof L6EventDedupeKeySpec)[] = [
  'family_id', 'scope_type', 'scope_id',
  'trigger_window_id', 'version', 'lifecycle_group',
];

export function canonicalDedupeKey(spec: L6EventDedupeKeySpec): string {
  const parts = [
    spec.family_id,
    spec.scope_type,
    spec.scope_id,
    spec.trigger_window_id,
    spec.version,
    spec.lifecycle_group,
  ];
  if (spec.suppression_namespace) parts.push(spec.suppression_namespace);
  return parts.join('|');
}
