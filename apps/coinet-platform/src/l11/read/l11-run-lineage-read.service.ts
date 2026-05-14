/**
 * L11.8 — Run lineage read service (§11.8.12)
 */

import { L11ReadRequest, L11ReadSurfaceId } from '../contracts/l11-read-surface';
import { admitL11Read, L11ReadAdmission } from './l11-read-service-base';

export function admitL11RunLineageRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.SCORE_LINEAGE_BY_RUN_ID,
  });
}
