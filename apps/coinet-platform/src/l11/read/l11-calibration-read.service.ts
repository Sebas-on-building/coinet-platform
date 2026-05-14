/**
 * L11.8 — Calibration read service (§11.8.12)
 */

import { L11ReadRequest, L11ReadSurfaceId } from '../contracts/l11-read-surface';
import { admitL11Read, L11ReadAdmission } from './l11-read-service-base';

export function admitL11CalibrationHooksRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.SCORE_CALIBRATION_HOOKS_BY_SCORE_ID,
  });
}

export function admitL11CalibrationTargetRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.CALIBRATION_TARGET_BY_SCORE_FAMILY,
  });
}
