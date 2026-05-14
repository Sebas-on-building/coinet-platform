/**
 * L11.8 — Historical score read service (§11.8.12)
 *
 * Governs `SCORE_HISTORY_BY_SCOPE_WINDOW`. Adapters dispatch to L5
 * ClickHouse historical fact tables.
 */

import { L11ReadRequest, L11ReadSurfaceId } from '../contracts/l11-read-surface';
import { admitL11Read, L11ReadAdmission } from './l11-read-service-base';

export function admitL11HistoricalScoreRead(
  request: L11ReadRequest,
): L11ReadAdmission {
  return admitL11Read({
    request,
    expected_surface: L11ReadSurfaceId.SCORE_HISTORY_BY_SCOPE_WINDOW,
  });
}
