/**
 * L5.4 Universal Write Contract — Ingress Modes
 */

export enum L5IngressMode {
  REALTIME = 'REALTIME',
  BATCH = 'BATCH',
  BACKFILL = 'BACKFILL',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  USER_ACTION = 'USER_ACTION',
  INTERNAL_DERIVATION = 'INTERNAL_DERIVATION',
}

export const ALL_INGRESS_MODES: readonly L5IngressMode[] = Object.values(L5IngressMode);
