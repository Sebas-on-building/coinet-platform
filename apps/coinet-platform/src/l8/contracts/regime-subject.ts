/**
 * L8.2 — Regime Subject Contract
 *
 * §8.2.1.2 / §8.2.8 — A regime subject is the governed anchor for a
 * regime state: it declares the family, scope, and time window under
 * which a regime classification will be produced.
 *
 * Subjects are declared separately from states so L8.3+ can build and
 * persist templated subjects per-family without reinventing identity.
 */

import { L8RegimeFamily, L8RegimeScopeType } from './regime-family';

/**
 * A subject is scoped to one family; cross-family coexistence is
 * represented by multiple subjects at the same (scope, time).
 */
export interface L8RegimeSubject {
  readonly regime_subject_id: string;
  readonly regime_family: L8RegimeFamily;
  readonly scope_type: L8RegimeScopeType;
  readonly scope_id: string;
  readonly as_of: string;
  /**
   * §8.2.8.2 — Template identity. Every regime state must link to a
   * subject template so regime construction remains reproducible.
   */
  readonly regime_template_id: string;
  readonly regime_template_version: string;
  /**
   * §8.2.6.5 — Lifecycle integrity applies only to families flagged
   * `lifecycleIntegrity`. Non-lifecycle families set this to `false`.
   */
  readonly lifecycle_aware: boolean;
  readonly description: string;
}

/**
 * Deterministic FNV-1a for local subject identity. The shared canonical
 * hash helper handles replay-hash elsewhere.
 */
function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface L8RegimeSubjectIdInputs {
  readonly regime_family: L8RegimeFamily;
  readonly scope_type: L8RegimeScopeType;
  readonly scope_id: string;
  readonly as_of: string;
}

export function buildL8RegimeSubjectId(i: L8RegimeSubjectIdInputs): string {
  const key = `${i.regime_family}|${i.scope_type}|${i.scope_id}|${i.as_of}`;
  return `rsub_${fnv1aHex(key)}_${fnv1aHex(i.scope_id + i.regime_family)}`;
}

export function buildL8RegimeTemplateId(
  family: L8RegimeFamily,
  templateName: string,
  templateVersion: string,
): string {
  return `rtpl_${fnv1aHex(`${family}|${templateName}|${templateVersion}`)}`;
}
