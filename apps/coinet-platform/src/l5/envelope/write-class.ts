/**
 * L5.4 Universal Write Contract — Write Classes
 *
 * §5.4.8 — Write Class Doctrine
 */

export enum L5WriteClass {
  RELATIONAL_AUTHORITY = 'RELATIONAL_AUTHORITY',
  TIME_SERIES_FACT = 'TIME_SERIES_FACT',
  HOT_EPHEMERAL = 'HOT_EPHEMERAL',
  IMMUTABLE_ARCHIVE = 'IMMUTABLE_ARCHIVE',
  DERIVED_MATERIALIZATION = 'DERIVED_MATERIALIZATION',
  USER_STATE = 'USER_STATE',
  AUDIT_EVENT = 'AUDIT_EVENT',
}

export const ALL_WRITE_CLASSES: readonly L5WriteClass[] = Object.values(L5WriteClass);

export interface WriteClassRequirements {
  readonly writeClass: L5WriteClass;
  readonly requiresCanonicalSubject: boolean;
  readonly requiresMetricContract: boolean;
  readonly requiresExpiresAt: boolean;
  readonly requiresParentLineage: boolean;
  readonly requiresUserId: boolean;
  readonly requiresActorInfo: boolean;
  readonly defaultArchiveRequired: boolean;
  readonly defaultReplayRequired: boolean;
}

const REQUIREMENTS: Record<L5WriteClass, WriteClassRequirements> = {
  [L5WriteClass.RELATIONAL_AUTHORITY]: {
    writeClass: L5WriteClass.RELATIONAL_AUTHORITY,
    requiresCanonicalSubject: true, requiresMetricContract: false,
    requiresExpiresAt: false, requiresParentLineage: false,
    requiresUserId: false, requiresActorInfo: false,
    defaultArchiveRequired: false, defaultReplayRequired: true,
  },
  [L5WriteClass.TIME_SERIES_FACT]: {
    writeClass: L5WriteClass.TIME_SERIES_FACT,
    requiresCanonicalSubject: true, requiresMetricContract: true,
    requiresExpiresAt: false, requiresParentLineage: false,
    requiresUserId: false, requiresActorInfo: false,
    defaultArchiveRequired: false, defaultReplayRequired: false,
  },
  [L5WriteClass.HOT_EPHEMERAL]: {
    writeClass: L5WriteClass.HOT_EPHEMERAL,
    requiresCanonicalSubject: false, requiresMetricContract: false,
    requiresExpiresAt: true, requiresParentLineage: false,
    requiresUserId: false, requiresActorInfo: false,
    defaultArchiveRequired: false, defaultReplayRequired: false,
  },
  [L5WriteClass.IMMUTABLE_ARCHIVE]: {
    writeClass: L5WriteClass.IMMUTABLE_ARCHIVE,
    requiresCanonicalSubject: false, requiresMetricContract: false,
    requiresExpiresAt: false, requiresParentLineage: false,
    requiresUserId: false, requiresActorInfo: false,
    defaultArchiveRequired: true, defaultReplayRequired: true,
  },
  [L5WriteClass.DERIVED_MATERIALIZATION]: {
    writeClass: L5WriteClass.DERIVED_MATERIALIZATION,
    requiresCanonicalSubject: false, requiresMetricContract: false,
    requiresExpiresAt: false, requiresParentLineage: true,
    requiresUserId: false, requiresActorInfo: false,
    defaultArchiveRequired: false, defaultReplayRequired: false,
  },
  [L5WriteClass.USER_STATE]: {
    writeClass: L5WriteClass.USER_STATE,
    requiresCanonicalSubject: false, requiresMetricContract: false,
    requiresExpiresAt: false, requiresParentLineage: false,
    requiresUserId: true, requiresActorInfo: false,
    defaultArchiveRequired: false, defaultReplayRequired: false,
  },
  [L5WriteClass.AUDIT_EVENT]: {
    writeClass: L5WriteClass.AUDIT_EVENT,
    requiresCanonicalSubject: false, requiresMetricContract: false,
    requiresExpiresAt: false, requiresParentLineage: false,
    requiresUserId: false, requiresActorInfo: true,
    defaultArchiveRequired: true, defaultReplayRequired: true,
  },
};

export function getWriteClassRequirements(wc: L5WriteClass): WriteClassRequirements {
  return REQUIREMENTS[wc];
}
