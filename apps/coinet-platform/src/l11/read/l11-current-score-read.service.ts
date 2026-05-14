/**
 * L11.8 — Current score read service (§11.8.12)
 *
 * Governs the `CURRENT_SCORE_SNAPSHOT_BY_SCOPE` and
 * `CURRENT_SCORE_FAMILY_BY_SCOPE` read surfaces. Returns admission
 * decision; adapters dispatch to L5 Postgres current registries.
 */

import { L11ReadRequest, L11ReadSurfaceId } from '../contracts/l11-read-surface';
import { admitL11Read, L11ReadAdmission } from './l11-read-service-base';

export function admitL11CurrentScoreSnapshotRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.CURRENT_SCORE_SNAPSHOT_BY_SCOPE,
  });
}

export function admitL11CurrentScoreFamilyRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.CURRENT_SCORE_FAMILY_BY_SCOPE,
  });
}
