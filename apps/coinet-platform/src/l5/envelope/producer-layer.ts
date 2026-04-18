/**
 * L5.4 Universal Write Contract — Producer Layers
 */

export enum L5ProducerLayer {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  L4 = 'L4',
  L5_INTERNAL = 'L5_INTERNAL',
  L6 = 'L6',
  L7 = 'L7',
  USER_APP = 'USER_APP',
  INTERNAL_WORKER = 'INTERNAL_WORKER',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  BACKFILL = 'BACKFILL',
}

export const ALL_PRODUCER_LAYERS: readonly L5ProducerLayer[] = Object.values(L5ProducerLayer);
