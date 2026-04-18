/**
 * L5.4 Universal Write Contract — Derivation Kinds
 */

export enum L5DerivationKind {
  ORIGINAL = 'ORIGINAL',
  DERIVED = 'DERIVED',
  REPLAY_RECREATED = 'REPLAY_RECREATED',
  REPAIR_REEMITTED = 'REPAIR_REEMITTED',
  BACKFILL_NORMALIZED = 'BACKFILL_NORMALIZED',
}

export const ALL_DERIVATION_KINDS: readonly L5DerivationKind[] = Object.values(L5DerivationKind);

export function isDerived(kind: L5DerivationKind): boolean {
  return kind !== L5DerivationKind.ORIGINAL;
}
