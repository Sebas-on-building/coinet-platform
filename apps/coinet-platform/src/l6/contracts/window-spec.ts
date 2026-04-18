/**
 * L6.5 — Window Specification
 *
 * §6.5.3 — Every windowed computation must compose from one governed library.
 * This module defines:
 *   - the standard duration presets (5m through 90d)
 *   - the window class taxonomy (rolling / aligned / event-confirmation / …)
 *   - the `L6TemporalWindowSpec` contract a primitive must declare
 *
 * The L6.4 runtime `WindowBuilder` constructs instances from these specs.
 */

import { L6CoverageRequirementClass } from './materialization-policy';

/**
 * Standard durations in milliseconds. These are the only durations a governed
 * primitive may declare directly. Ad hoc durations must still register a
 * custom `L6StandardWindowDuration.CUSTOM` variant with policy approval.
 */
export enum L6StandardWindowDuration {
  FIVE_MIN = 'FIVE_MIN',
  FIFTEEN_MIN = 'FIFTEEN_MIN',
  ONE_HOUR = 'ONE_HOUR',
  FOUR_HOUR = 'FOUR_HOUR',
  TWELVE_HOUR = 'TWELVE_HOUR',
  ONE_DAY = 'ONE_DAY',
  THREE_DAY = 'THREE_DAY',
  SEVEN_DAY = 'SEVEN_DAY',
  THIRTY_DAY = 'THIRTY_DAY',
  NINETY_DAY = 'NINETY_DAY',
  CUSTOM = 'CUSTOM',
}

export const ALL_STANDARD_WINDOW_DURATIONS: readonly L6StandardWindowDuration[] =
  Object.values(L6StandardWindowDuration);

export const STANDARD_WINDOW_DURATION_MS: Readonly<Record<L6StandardWindowDuration, number | null>> = Object.freeze({
  [L6StandardWindowDuration.FIVE_MIN]: 5 * 60 * 1000,
  [L6StandardWindowDuration.FIFTEEN_MIN]: 15 * 60 * 1000,
  [L6StandardWindowDuration.ONE_HOUR]: 60 * 60 * 1000,
  [L6StandardWindowDuration.FOUR_HOUR]: 4 * 60 * 60 * 1000,
  [L6StandardWindowDuration.TWELVE_HOUR]: 12 * 60 * 60 * 1000,
  [L6StandardWindowDuration.ONE_DAY]: 24 * 60 * 60 * 1000,
  [L6StandardWindowDuration.THREE_DAY]: 3 * 24 * 60 * 60 * 1000,
  [L6StandardWindowDuration.SEVEN_DAY]: 7 * 24 * 60 * 60 * 1000,
  [L6StandardWindowDuration.THIRTY_DAY]: 30 * 24 * 60 * 60 * 1000,
  [L6StandardWindowDuration.NINETY_DAY]: 90 * 24 * 60 * 60 * 1000,
  [L6StandardWindowDuration.CUSTOM]: null,
});

export function isGovernedDuration(d: L6StandardWindowDuration): boolean {
  return d !== L6StandardWindowDuration.CUSTOM;
}

/**
 * §6.5.3.4 — Window class taxonomy. `L6WindowClass` classifies a window by its
 * *use*; `L6TemporalWindowSpec.window_type` (L6.4's `L6WindowType`) remains
 * the runtime shape label (SHORT/MEDIUM/LONG_HORIZON/BASELINE/CONFIRMATION).
 */
export enum L6WindowClass {
  ROLLING = 'ROLLING',
  ALIGNED = 'ALIGNED',
  EVENT_CONFIRMATION = 'EVENT_CONFIRMATION',
  SCHEDULED = 'SCHEDULED',
  BASELINE = 'BASELINE',
  PEER_COMPARISON = 'PEER_COMPARISON',
  REPLAY = 'REPLAY',
}

export const ALL_WINDOW_CLASSES: readonly L6WindowClass[] = Object.values(L6WindowClass);

export enum L6WindowAnchorPolicy {
  WALL_CLOCK = 'WALL_CLOCK',
  AS_OF = 'AS_OF',
  SCHEDULED_BOUNDARY = 'SCHEDULED_BOUNDARY',
  EVENT_ANCHOR = 'EVENT_ANCHOR',
}

export const ALL_WINDOW_ANCHOR_POLICIES: readonly L6WindowAnchorPolicy[] = Object.values(L6WindowAnchorPolicy);

export enum L6WindowAlignmentPolicy {
  NONE = 'NONE',
  MINUTE = 'MINUTE',
  HOUR = 'HOUR',
  DAY_UTC = 'DAY_UTC',
  SESSION_UTC = 'SESSION_UTC',
  CUSTOM = 'CUSTOM',
}

export const ALL_WINDOW_ALIGNMENT_POLICIES: readonly L6WindowAlignmentPolicy[] = Object.values(L6WindowAlignmentPolicy);

export enum L6LateDataInclusionPolicy {
  EXCLUDE = 'EXCLUDE',
  INCLUDE_IF_WITHIN_GRACE = 'INCLUDE_IF_WITHIN_GRACE',
  INCLUDE_ALWAYS = 'INCLUDE_ALWAYS',
}

export const ALL_LATE_DATA_INCLUSION_POLICIES: readonly L6LateDataInclusionPolicy[] =
  Object.values(L6LateDataInclusionPolicy);

/**
 * The contract a primitive declares to compose a legal window.
 */
export interface L6TemporalWindowSpec {
  readonly spec_id: string;
  readonly window_class: L6WindowClass;
  readonly duration: L6StandardWindowDuration;
  readonly duration_ms: number;
  readonly anchor_policy: L6WindowAnchorPolicy;
  readonly alignment_policy: L6WindowAlignmentPolicy;
  readonly late_data_inclusion_policy: L6LateDataInclusionPolicy;
  readonly coverage_requirement: L6CoverageRequirementClass;
  readonly min_coverage_ratio: number;
  readonly policy_version: string;
}

export const REQUIRED_WINDOW_SPEC_FIELDS: readonly (keyof L6TemporalWindowSpec)[] = [
  'spec_id', 'window_class', 'duration', 'duration_ms',
  'anchor_policy', 'alignment_policy', 'late_data_inclusion_policy',
  'coverage_requirement', 'min_coverage_ratio', 'policy_version',
];
