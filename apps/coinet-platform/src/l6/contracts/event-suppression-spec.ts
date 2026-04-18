/**
 * L6.6 — Event Suppression Specification
 *
 * §6.6.6.4 — Suppression is first-class. Each event family binds to a
 * declared suppression family with explicit cooldown, retrigger threshold,
 * escalation threshold, and suppression mode.
 */

import { L6EventFamilyId } from './event-family-definition';

export enum L6EventSuppressionMode {
  HARD_COOLDOWN = 'HARD_COOLDOWN',
  RETRIGGER_AFTER_MATERIAL_DELTA = 'RETRIGGER_AFTER_MATERIAL_DELTA',
  SEVERITY_ESCALATION_ONLY = 'SEVERITY_ESCALATION_ONLY',
  GROUP_SUPPRESSION_SIBLING_SCOPES = 'GROUP_SUPPRESSION_SIBLING_SCOPES',
  QUARANTINE_ON_INSTABILITY = 'QUARANTINE_ON_INSTABILITY',
}

export const ALL_SUPPRESSION_MODES: readonly L6EventSuppressionMode[] =
  Object.values(L6EventSuppressionMode);

export interface L6EventSuppressionSpec {
  readonly suppression_family_id: string;
  readonly event_family_id: L6EventFamilyId;
  readonly mode: L6EventSuppressionMode;
  readonly cooldown_duration_ms: number;
  readonly retrigger_threshold: number | null;
  readonly escalation_threshold: number | null;
  readonly suppression_group: string;
  readonly quarantine_after_instability_count: number | null;
  readonly policy_version: string;
}

export const REQUIRED_SUPPRESSION_FIELDS: readonly (keyof L6EventSuppressionSpec)[] = [
  'suppression_family_id', 'event_family_id', 'mode',
  'cooldown_duration_ms', 'suppression_group', 'policy_version',
];
