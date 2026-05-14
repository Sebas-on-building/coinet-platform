/**
 * L11.8 — Attribution read service (§11.8.12)
 */

import { L11ReadRequest, L11ReadSurfaceId } from '../contracts/l11-read-surface';
import { admitL11Read, L11ReadAdmission } from './l11-read-service-base';

export function admitL11AttributionRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.SCORE_ATTRIBUTION_BY_SCORE_ID,
  });
}
