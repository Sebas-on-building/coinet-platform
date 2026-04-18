/**
 * L5.1 Purpose — State Classes
 *
 * Defines the four legal classes of state that Layer 5 governs.
 * Every write entering L5 must resolve to exactly one primary class
 * before any store-specific routing occurs. This is the foundational
 * type system for all persistence law.
 *
 * §5.1.7 — The Four State Classes
 * §5.1.8 — State-Class Routing Law
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STATE CLASS ENUM
// ═══════════════════════════════════════════════════════════════════════════════

export enum L5StateClass {
  /**
   * Durable, governed, operationally authoritative state.
   * Legal source of current truth for its assigned class.
   * Examples: canonical current records, score registries, watchlists,
   * manifests, audit metadata, replay control, archive pointers.
   */
  RELATIONAL_AUTHORITY = 'RELATIONAL_AUTHORITY',

  /**
   * Append-dominant temporal facts and analytical sequences.
   * Value is historical scan, windowing, aggregation, comparison,
   * and replay-assisted analytics — not legal current authority.
   * Examples: price history, OHLCV, TVL history, score histories.
   */
  TIME_SERIES_ANALYTICAL_HISTORY = 'TIME_SERIES_ANALYTICAL_HISTORY',

  /**
   * Short-lived execution state whose value is speed, windowed
   * reaction, dedupe, throttling, or recent materialization.
   * Loss degrades speed only — never truth.
   * Examples: hot metric snapshots, dedupe tokens, alert cooldowns.
   */
  EPHEMERAL_HOT_STATE = 'EPHEMERAL_HOT_STATE',

  /**
   * Unchangeable evidence-bearing artifacts preserved for replay,
   * forensics, backfill reproducibility, and traceability.
   * Examples: raw payloads, normalized envelopes, model I/O,
   * forensic exports, reproducibility bundles.
   */
  IMMUTABLE_ARCHIVE_STATE = 'IMMUTABLE_ARCHIVE_STATE',
}

export const ALL_STATE_CLASSES: readonly L5StateClass[] = [
  L5StateClass.RELATIONAL_AUTHORITY,
  L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,
  L5StateClass.EPHEMERAL_HOT_STATE,
  L5StateClass.IMMUTABLE_ARCHIVE_STATE,
];

// ═══════════════════════════════════════════════════════════════════════════════
// STATE CLASS PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StateClassProperties {
  readonly stateClass: L5StateClass;
  readonly isDurable: boolean;
  readonly isAuthorityBearing: boolean;
  readonly isEphemeral: boolean;
  readonly isImmutable: boolean;
  readonly lossConsequence: StateLossConsequence;
  readonly requiresMutationControl: boolean;
  readonly requiresRetentionPolicy: boolean;
  readonly requiresDeduplication: boolean;
  readonly supportsProjection: boolean;
}

export type StateLossConsequence =
  | 'TRUTH_LOSS'
  | 'HISTORY_LOSS'
  | 'SPEED_DEGRADATION'
  | 'EVIDENCE_LOSS';

const STATE_CLASS_PROPERTIES: Record<L5StateClass, StateClassProperties> = {
  [L5StateClass.RELATIONAL_AUTHORITY]: {
    stateClass: L5StateClass.RELATIONAL_AUTHORITY,
    isDurable: true,
    isAuthorityBearing: true,
    isEphemeral: false,
    isImmutable: false,
    lossConsequence: 'TRUTH_LOSS',
    requiresMutationControl: true,
    requiresRetentionPolicy: true,
    requiresDeduplication: true,
    supportsProjection: true,
  },
  [L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY]: {
    stateClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,
    isDurable: true,
    isAuthorityBearing: false,
    isEphemeral: false,
    isImmutable: false,
    lossConsequence: 'HISTORY_LOSS',
    requiresMutationControl: false,
    requiresRetentionPolicy: true,
    requiresDeduplication: true,
    supportsProjection: true,
  },
  [L5StateClass.EPHEMERAL_HOT_STATE]: {
    stateClass: L5StateClass.EPHEMERAL_HOT_STATE,
    isDurable: false,
    isAuthorityBearing: false,
    isEphemeral: true,
    isImmutable: false,
    lossConsequence: 'SPEED_DEGRADATION',
    requiresMutationControl: false,
    requiresRetentionPolicy: false,
    requiresDeduplication: false,
    supportsProjection: false,
  },
  [L5StateClass.IMMUTABLE_ARCHIVE_STATE]: {
    stateClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,
    isDurable: true,
    isAuthorityBearing: false,
    isEphemeral: false,
    isImmutable: true,
    lossConsequence: 'EVIDENCE_LOSS',
    requiresMutationControl: false,
    requiresRetentionPolicy: true,
    requiresDeduplication: true,
    supportsProjection: false,
  },
};

export function getStateClassProperties(sc: L5StateClass): StateClassProperties {
  return STATE_CLASS_PROPERTIES[sc];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURPOSE CLASSIFICATION — THE PRE-ROUTING CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export interface L5PurposeClassification {
  /** Exactly one primary state class. Resolved before any store routing. */
  readonly primaryStateClass: L5StateClass;

  /** Is this write's primary class durable (survives process restart)? */
  readonly isDurable: boolean;

  /** Must this write support time-of-belief reconstruction? */
  readonly isReplayRequired: boolean;

  /** Does this write carry legal authority for its state class? */
  readonly isAuthorityBearing: boolean;

  /** Is this write ephemeral (loss degrades speed only)? */
  readonly isEphemeral: boolean;

  /** Must this write produce or reference an immutable archive artifact? */
  readonly archiveRequired: boolean;

  /** Could late-arriving data at this classification mutate current belief? */
  readonly lateArrivalSensitive: boolean;

  /** Secondary state classes this write may project into. */
  readonly projectionTargets: readonly L5StateClass[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE DOCTRINE — ONE CLASS, ONE LEGAL HOME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Authority Home Registry.
 * Each fact-class that is authority-bearing must have exactly one
 * declared authority home. This registry is the enforcement surface
 * for INV-5.1-C (every authority-bearing state has one legal home).
 */
export interface AuthorityHomeDeclaration {
  readonly factClass: string;
  readonly stateClass: L5StateClass;
  readonly authorityStoreId: string;
  readonly registeredAt: string;
}

const _authorityHomes = new Map<string, AuthorityHomeDeclaration>();

export function declareAuthorityHome(decl: AuthorityHomeDeclaration): { success: boolean; error?: string } {
  const existing = _authorityHomes.get(decl.factClass);
  if (existing) {
    if (existing.authorityStoreId !== decl.authorityStoreId) {
      return {
        success: false,
        error: `DUAL_AUTHORITY: factClass '${decl.factClass}' already has authority home '${existing.authorityStoreId}', cannot also declare '${decl.authorityStoreId}'`,
      };
    }
    return { success: true };
  }
  _authorityHomes.set(decl.factClass, decl);
  return { success: true };
}

export function getAuthorityHome(factClass: string): AuthorityHomeDeclaration | undefined {
  return _authorityHomes.get(factClass);
}

export function getAllAuthorityHomes(): readonly AuthorityHomeDeclaration[] {
  return [..._authorityHomes.values()];
}

export function hasAuthorityHome(factClass: string): boolean {
  return _authorityHomes.has(factClass);
}

export function resetStateClassRegistry(): void {
  _authorityHomes.clear();
}
