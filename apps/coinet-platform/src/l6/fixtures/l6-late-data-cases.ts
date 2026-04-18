/**
 * L6.8 — Late-Data Cases
 *
 * §6.8.4.2 Band E — Canonical late-data scenarios used to verify that
 * silent overwrite is blocked and that governed rematerialization is
 * explicit (§6.8.3.8, §6.8.7.2).
 */

import { L6MaterializationMode } from '../contracts/l6-persistence-surface';

export enum L6LateDataClass {
  WITHIN_WARMUP = 'WITHIN_WARMUP',
  WITHIN_WINDOW = 'WITHIN_WINDOW',
  AFTER_WINDOW_BEFORE_DONE = 'AFTER_WINDOW_BEFORE_DONE',
  AFTER_DONE_WITHIN_CORRECTION = 'AFTER_DONE_WITHIN_CORRECTION',
  AFTER_CORRECTION_HORIZON = 'AFTER_CORRECTION_HORIZON',
}

export interface L6LateDataCase {
  readonly case_id: string;
  readonly class: L6LateDataClass;
  readonly description: string;
  readonly allowed_modes: readonly L6MaterializationMode[];
  readonly must_block_current_overwrite: boolean;
  readonly must_append_history: boolean;
  readonly must_tag_as_repaired: boolean;
}

export const LATE_DATA_CASES: readonly L6LateDataCase[] = Object.freeze([
  {
    case_id: 'ld.within_warmup',
    class: L6LateDataClass.WITHIN_WARMUP,
    description: 'Late fact arrives while baseline is still warming up — absorb silently.',
    allowed_modes: [L6MaterializationMode.LIVE_MATERIALIZATION],
    must_block_current_overwrite: false,
    must_append_history: true,
    must_tag_as_repaired: false,
  },
  {
    case_id: 'ld.within_window',
    class: L6LateDataClass.WITHIN_WINDOW,
    description: 'Late fact lands inside still-open window — natural recompute path.',
    allowed_modes: [L6MaterializationMode.LIVE_MATERIALIZATION],
    must_block_current_overwrite: false,
    must_append_history: true,
    must_tag_as_repaired: false,
  },
  {
    case_id: 'ld.after_window_before_done',
    class: L6LateDataClass.AFTER_WINDOW_BEFORE_DONE,
    description: 'Window closed but not yet finalized — legal correction path.',
    allowed_modes: [
      L6MaterializationMode.LIVE_MATERIALIZATION,
      L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION,
    ],
    must_block_current_overwrite: false,
    must_append_history: true,
    must_tag_as_repaired: true,
  },
  {
    case_id: 'ld.after_done_within_correction',
    class: L6LateDataClass.AFTER_DONE_WITHIN_CORRECTION,
    description: 'Window finalized but within correction horizon — must use governed rematerialization.',
    allowed_modes: [L6MaterializationMode.LATE_DATA_GOVERNED_REMATERIALIZATION],
    must_block_current_overwrite: true,
    must_append_history: true,
    must_tag_as_repaired: true,
  },
  {
    case_id: 'ld.after_correction_horizon',
    class: L6LateDataClass.AFTER_CORRECTION_HORIZON,
    description: 'Past correction horizon — history append only, no current touch.',
    allowed_modes: [L6MaterializationMode.REPAIR_MATERIALIZATION],
    must_block_current_overwrite: true,
    must_append_history: true,
    must_tag_as_repaired: true,
  },
]);

export function isModeAllowedForLateDataClass(
  cls: L6LateDataClass,
  mode: L6MaterializationMode,
): boolean {
  const c = LATE_DATA_CASES.find(x => x.class === cls);
  return !!c && c.allowed_modes.includes(mode);
}
