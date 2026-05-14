/**
 * L11 — Master Invariants (§11.9.14)
 *
 *   INV-11-A — meaning claim law
 *   INV-11-B — determinism law
 *   INV-11-C — attribution law
 *   INV-11-D — missing-data law
 *   INV-11-E — modifier boundary law
 *   INV-11-F — calibration law
 *   INV-11-G — drift governance law
 *   INV-11-H — non-judgment law
 *
 * These are aggregate invariants. They consume already-computed
 * sublayer green flags / counts; they do not re-run lower-sublayer
 * suites. The master orchestrator passes flags in, and these
 * invariants enforce the global Layer-11 contract.
 */

import { L11SublayerId } from '../contracts/l11-layer-inventory';

export interface L11MasterInvariantResult {
  readonly id: string;
  readonly ok: boolean;
  readonly evidence: string;
}

export interface L11MasterInvariantInput {
  readonly sublayer_green: Readonly<Partial<Record<L11SublayerId, boolean>>>;
  readonly l10_master_green: boolean;
  readonly judgment_leakage_detected: boolean;
}

const okR = (id: string, evidence: string): L11MasterInvariantResult =>
  ({ id, ok: true, evidence });
const failR = (id: string, evidence: string): L11MasterInvariantResult =>
  ({ id, ok: false, evidence });

const isGreen = (
  m: Readonly<Partial<Record<L11SublayerId, boolean>>>,
  s: L11SublayerId,
): boolean => m[s] === true;

export function invariantL11_A_meaningClaim(
  input: L11MasterInvariantInput,
): L11MasterInvariantResult {
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_2_SCORE_DOCTRINE)) {
    return failR('INV-11-A', 'L11.2 score doctrine not green — meaning claims unverified');
  }
  return okR('INV-11-A', 'every score declares a meaning claim (via L11.2 doctrine)');
}

export function invariantL11_B_determinism(
  input: L11MasterInvariantInput,
): L11MasterInvariantResult {
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_3_FORMULA_LAW)) {
    return failR('INV-11-B', 'L11.3 formula law not green — determinism unverified');
  }
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_8_PERSISTENCE)) {
    return failR('INV-11-B', 'L11.8 persistence not green — replay-determinism unverified');
  }
  return okR('INV-11-B',
    'identical governed inputs + formula version produce identical scores');
}

export function invariantL11_C_attribution(
  input: L11MasterInvariantInput,
): L11MasterInvariantResult {
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_4_ATTRIBUTION)) {
    return failR('INV-11-C', 'L11.4 attribution not green — attribution coverage unverified');
  }
  return okR('INV-11-C', 'every score carries component attribution');
}

export function invariantL11_D_missingData(
  input: L11MasterInvariantInput,
): L11MasterInvariantResult {
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_5_MISSING_REGIME)) {
    return failR('INV-11-D', 'L11.5 missing/regime not green — visibility law unverified');
  }
  return okR('INV-11-D',
    'missing/stale/degraded/evidence-only/restricted/conflicting inputs are not silently neutral');
}

export function invariantL11_E_modifierBoundary(
  input: L11MasterInvariantInput,
): L11MasterInvariantResult {
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_5_MISSING_REGIME)) {
    return failR('INV-11-E', 'L11.5 missing/regime not green — modifier boundary unverified');
  }
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_4_ATTRIBUTION)) {
    return failR('INV-11-E', 'L11.4 attribution not green — modifier attribution unverified');
  }
  return okR('INV-11-E',
    'regime/sequence/hypothesis/confidence modifiers may interpret but not override contradiction or restriction');
}

export function invariantL11_F_calibration(
  input: L11MasterInvariantInput,
): L11MasterInvariantResult {
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_6_CALIBRATION)) {
    return failR('INV-11-F', 'L11.6 calibration not green — calibration law unverified');
  }
  return okR('INV-11-F',
    'every production score declares calibration target and evaluation horizon');
}

export function invariantL11_G_driftGovernance(
  input: L11MasterInvariantInput,
): L11MasterInvariantResult {
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_7_DRIFT)) {
    return failR('INV-11-G', 'L11.7 drift governance not green');
  }
  return okR('INV-11-G',
    'formula / threshold / score-band changes are versioned, classified, and drift-governed');
}

export function invariantL11_H_nonJudgment(
  input: L11MasterInvariantInput,
): L11MasterInvariantResult {
  if (!isGreen(input.sublayer_green, L11SublayerId.L11_1_CONSTITUTION)) {
    return failR('INV-11-H', 'L11.1 constitution not green — non-judgment boundary unverified');
  }
  if (input.judgment_leakage_detected) {
    return failR('INV-11-H', 'judgment / recommendation / scenario-winner leakage detected');
  }
  return okR('INV-11-H',
    'Layer 11 scores do not impersonate final judgment, scenario selection, recommendation, or trade action');
}

export function runAllL11MasterInvariants(
  input: L11MasterInvariantInput,
): readonly L11MasterInvariantResult[] {
  return [
    invariantL11_A_meaningClaim(input),
    invariantL11_B_determinism(input),
    invariantL11_C_attribution(input),
    invariantL11_D_missingData(input),
    invariantL11_E_modifierBoundary(input),
    invariantL11_F_calibration(input),
    invariantL11_G_driftGovernance(input),
    invariantL11_H_nonJudgment(input),
  ];
}
