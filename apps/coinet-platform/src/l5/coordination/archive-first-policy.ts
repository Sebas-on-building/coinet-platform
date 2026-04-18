/**
 * L5.5 Write Coordination — Archive-First Policy
 *
 * §5.5.4.5 — Step 4: Archive-first branch
 * §5.5.12.4 — Object storage primary for immutable archive
 */

import { L5WriteClass } from '../envelope';
import type { ResolvedStorageEnvelope } from '../envelope';

export interface ArchiveFirstDecision {
  readonly archiveFirstRequired: boolean;
  readonly reasons: readonly string[];
}

export function evaluateArchiveFirstPolicy(env: ResolvedStorageEnvelope): ArchiveFirstDecision {
  const reasons: string[] = [];

  if (env.write_class === L5WriteClass.IMMUTABLE_ARCHIVE) {
    reasons.push('write_class is IMMUTABLE_ARCHIVE');
  }
  if (env.archive_required && env.routing.primary_authority_store === 'OBJECT_STORAGE') {
    reasons.push('archive_required with OBJECT_STORAGE primary authority');
  }
  if (env.write_class === L5WriteClass.AUDIT_EVENT && env.archive_required) {
    reasons.push('audit event with archive_required policy');
  }
  if (env.replay_required && env.archive_required) {
    reasons.push('replay_required demands immutable evidence before authority');
  }

  return {
    archiveFirstRequired: reasons.length > 0,
    reasons,
  };
}
