/**
 * L7.2 — Validation Window
 *
 * §7.2.4.2 — `validation_window` defines the temporal envelope of the
 * claim. Windows must be replay-safe and version-anchored.
 */

export type L7ValidationWindowKind =
  | 'POINT_IN_TIME'
  | 'ROLLING_WINDOW'
  | 'CALENDAR_WINDOW'
  | 'EVENT_ANCHORED_WINDOW';

export interface L7ValidationWindow {
  readonly kind: L7ValidationWindowKind;
  readonly anchor_ts: string;
  readonly lookback_seconds: number;
  readonly lookforward_seconds: number;
  readonly calendar_tag: string | null;
  readonly event_anchor_ref: string | null;
  readonly timezone: string;
}

export interface WindowValidationResult {
  readonly valid: boolean;
  readonly reasons: readonly string[];
}

export function validateValidationWindow(w: L7ValidationWindow): WindowValidationResult {
  const reasons: string[] = [];
  if (!w.kind) reasons.push('missing kind');
  if (!w.anchor_ts) reasons.push('missing anchor_ts');
  if (w.lookback_seconds < 0) reasons.push('lookback_seconds must be >= 0');
  if (w.lookforward_seconds < 0) reasons.push('lookforward_seconds must be >= 0');
  if (w.kind === 'POINT_IN_TIME' && (w.lookback_seconds !== 0 || w.lookforward_seconds !== 0)) {
    reasons.push('POINT_IN_TIME windows must have zero lookback/lookforward');
  }
  if (w.kind === 'ROLLING_WINDOW' && w.lookback_seconds === 0) {
    reasons.push('ROLLING_WINDOW requires lookback_seconds > 0');
  }
  if (w.kind === 'CALENDAR_WINDOW' && !w.calendar_tag) {
    reasons.push('CALENDAR_WINDOW requires calendar_tag');
  }
  if (w.kind === 'EVENT_ANCHORED_WINDOW' && !w.event_anchor_ref) {
    reasons.push('EVENT_ANCHORED_WINDOW requires event_anchor_ref');
  }
  if (!w.timezone) reasons.push('missing timezone');
  return { valid: reasons.length === 0, reasons };
}
