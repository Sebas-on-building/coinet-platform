/**
 * L11.8 — Component breakdown read service (§11.8.12)
 */

import { L11ReadRequest, L11ReadSurfaceId } from '../contracts/l11-read-surface';
import { admitL11Read, L11ReadAdmission } from './l11-read-service-base';

export function admitL11ComponentBreakdownRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.SCORE_COMPONENT_BREAKDOWN_BY_SCORE_ID,
  });
}

export function admitL11ScoreModifiersRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.SCORE_MODIFIERS_BY_SCORE_ID,
  });
}

export function admitL11MissingDataProfileRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.SCORE_MISSING_DATA_PROFILE_BY_SCORE_ID,
  });
}
