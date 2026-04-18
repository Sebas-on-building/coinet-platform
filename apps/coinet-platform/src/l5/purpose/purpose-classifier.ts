/**
 * L5.1 Purpose — Write Purpose Classifier
 *
 * §5.1.8 — State-Class Routing Law
 *
 * Every write entering Layer 5 must be classified into exactly one
 * primary state class before any store-specific routing occurs.
 * This classifier is the single point of truth for that decision.
 *
 * If a write cannot be classified, it is rejected or quarantined.
 * Ambiguous state is the first step toward shadow architecture.
 */

import {
  L5StateClass,
  type L5PurposeClassification,
  getStateClassProperties,
} from './state-class';
import { L5PurposeError, L5PurposeErrorCode } from './purpose-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE DOMAIN — WHAT KIND OF FACT IS BEING WRITTEN
// ═══════════════════════════════════════════════════════════════════════════════

export type L5WriteDomain =
  | 'CANONICAL_RECORD'
  | 'SCORE_REGISTRY'
  | 'REPORT_REGISTRY'
  | 'WATCHLIST'
  | 'USER_SETTINGS'
  | 'AUDIT_EVENT'
  | 'MANIFEST'
  | 'OUTBOX'
  | 'ARCHIVE_POINTER'
  | 'REPLAY_CONTROL'
  | 'GRAPH_CONTEXT_REGISTRY'
  | 'PROPAGATION_REGISTRY'
  | 'PRICE_HISTORY'
  | 'OHLCV'
  | 'TVL_HISTORY'
  | 'FUNDING_HISTORY'
  | 'LIQUIDATION_AGGREGATE'
  | 'FEE_REVENUE_HISTORY'
  | 'SENTIMENT_VELOCITY'
  | 'WALLET_ACTIVITY'
  | 'FEATURE_HISTORY'
  | 'SCORE_HISTORY'
  | 'OI_HISTORY'
  | 'HOT_METRIC_SNAPSHOT'
  | 'RECENT_EVENT_WINDOW'
  | 'DEDUPE_TOKEN'
  | 'ALERT_COOLDOWN'
  | 'TRIGGER_STATE'
  | 'CONTEXT_CACHE'
  | 'WORKFLOW_THROTTLE'
  | 'SEQUENCE_WINDOW'
  | 'RAW_SOURCE_PAYLOAD'
  | 'NORMALIZED_ENVELOPE'
  | 'BACKFILL_FILE'
  | 'MODEL_INPUT'
  | 'MODEL_OUTPUT'
  | 'REPRODUCIBILITY_BUNDLE'
  | 'REPLAY_BUNDLE'
  | 'FEATURE_SNAPSHOT_BUNDLE'
  | 'REPORT_RENDER_ARTIFACT'
  | 'FORENSIC_EXPORT';

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN → STATE CLASS ROUTING TABLE
// ═══════════════════════════════════════════════════════════════════════════════

interface DomainClassRule {
  readonly primaryClass: L5StateClass;
  readonly isReplayRequired: boolean;
  readonly archiveRequired: boolean;
  readonly lateArrivalSensitive: boolean;
  readonly projectionTargets: readonly L5StateClass[];
}

const DOMAIN_ROUTING: Record<L5WriteDomain, DomainClassRule> = {
  CANONICAL_RECORD:           { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: true,  archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [L5StateClass.EPHEMERAL_HOT_STATE] },
  SCORE_REGISTRY:             { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: true,  archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY, L5StateClass.EPHEMERAL_HOT_STATE] },
  REPORT_REGISTRY:            { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  WATCHLIST:                  { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  USER_SETTINGS:              { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  AUDIT_EVENT:                { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  MANIFEST:                   { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: true,  archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  OUTBOX:                     { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  ARCHIVE_POINTER:            { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: true,  archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  REPLAY_CONTROL:             { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: true,  archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  GRAPH_CONTEXT_REGISTRY:     { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: true,  archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [L5StateClass.EPHEMERAL_HOT_STATE] },
  PROPAGATION_REGISTRY:       { primaryClass: L5StateClass.RELATIONAL_AUTHORITY,            isReplayRequired: true,  archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [] },

  PRICE_HISTORY:              { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [L5StateClass.EPHEMERAL_HOT_STATE] },
  OHLCV:                      { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [L5StateClass.EPHEMERAL_HOT_STATE] },
  TVL_HISTORY:                { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [] },
  FUNDING_HISTORY:            { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [] },
  LIQUIDATION_AGGREGATE:      { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  FEE_REVENUE_HISTORY:        { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  SENTIMENT_VELOCITY:         { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  WALLET_ACTIVITY:            { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  FEATURE_HISTORY:            { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: true,  archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [] },
  SCORE_HISTORY:              { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: true,  archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  OI_HISTORY:                 { primaryClass: L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY,  isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: true,  projectionTargets: [] },

  HOT_METRIC_SNAPSHOT:        { primaryClass: L5StateClass.EPHEMERAL_HOT_STATE,             isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  RECENT_EVENT_WINDOW:        { primaryClass: L5StateClass.EPHEMERAL_HOT_STATE,             isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  DEDUPE_TOKEN:               { primaryClass: L5StateClass.EPHEMERAL_HOT_STATE,             isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  ALERT_COOLDOWN:             { primaryClass: L5StateClass.EPHEMERAL_HOT_STATE,             isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  TRIGGER_STATE:              { primaryClass: L5StateClass.EPHEMERAL_HOT_STATE,             isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  CONTEXT_CACHE:              { primaryClass: L5StateClass.EPHEMERAL_HOT_STATE,             isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  WORKFLOW_THROTTLE:          { primaryClass: L5StateClass.EPHEMERAL_HOT_STATE,             isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },
  SEQUENCE_WINDOW:            { primaryClass: L5StateClass.EPHEMERAL_HOT_STATE,             isReplayRequired: false, archiveRequired: false, lateArrivalSensitive: false, projectionTargets: [] },

  RAW_SOURCE_PAYLOAD:         { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  NORMALIZED_ENVELOPE:        { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  BACKFILL_FILE:              { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  MODEL_INPUT:                { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  MODEL_OUTPUT:               { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  REPRODUCIBILITY_BUNDLE:     { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  REPLAY_BUNDLE:              { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  FEATURE_SNAPSHOT_BUNDLE:    { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  REPORT_RENDER_ARTIFACT:     { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: false, archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
  FORENSIC_EXPORT:            { primaryClass: L5StateClass.IMMUTABLE_ARCHIVE_STATE,         isReplayRequired: true,  archiveRequired: true,  lateArrivalSensitive: false, projectionTargets: [] },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassifyWriteInput {
  readonly writeDomain: L5WriteDomain;
  readonly overridePrimaryClass?: L5StateClass;
  readonly overrideReplayRequired?: boolean;
  readonly overrideArchiveRequired?: boolean;
  readonly overrideLateArrivalSensitive?: boolean;
}

/**
 * Classify a write into its L5 purpose classification.
 *
 * This MUST run before any store-specific routing.
 * If the domain is not recognized, throws L5_PURPOSE_AMBIGUOUS_STATE_CLASS.
 * If an override conflicts with state-class invariants, throws L5_PURPOSE_CLASS_UNRESOLVED.
 */
export function classifyL5WritePurpose(input: ClassifyWriteInput): L5PurposeClassification {
  const rule = DOMAIN_ROUTING[input.writeDomain];
  if (!rule) {
    throw new L5PurposeError(
      L5PurposeErrorCode.L5_PURPOSE_AMBIGUOUS_STATE_CLASS,
      `No routing rule for write domain '${input.writeDomain}'`,
      { writeDomain: input.writeDomain },
    );
  }

  const primaryClass = input.overridePrimaryClass ?? rule.primaryClass;
  const props = getStateClassProperties(primaryClass);

  if (input.overridePrimaryClass && input.overridePrimaryClass !== rule.primaryClass) {
    if (props.isAuthorityBearing && rule.primaryClass !== L5StateClass.RELATIONAL_AUTHORITY) {
      throw new L5PurposeError(
        L5PurposeErrorCode.L5_PURPOSE_CLASS_UNRESOLVED,
        `Override to authority class '${primaryClass}' is illegal for domain '${input.writeDomain}' whose natural class is '${rule.primaryClass}'`,
        { writeDomain: input.writeDomain, requestedClass: primaryClass },
      );
    }
  }

  return {
    primaryStateClass: primaryClass,
    isDurable: props.isDurable,
    isReplayRequired: input.overrideReplayRequired ?? rule.isReplayRequired,
    isAuthorityBearing: props.isAuthorityBearing,
    isEphemeral: props.isEphemeral,
    archiveRequired: input.overrideArchiveRequired ?? rule.archiveRequired,
    lateArrivalSensitive: input.overrideLateArrivalSensitive ?? rule.lateArrivalSensitive,
    projectionTargets: rule.projectionTargets,
  };
}

/**
 * Lookup the primary state class for a domain without full classification.
 */
export function getPrimaryStateClassForDomain(domain: L5WriteDomain): L5StateClass {
  const rule = DOMAIN_ROUTING[domain];
  if (!rule) {
    throw new L5PurposeError(
      L5PurposeErrorCode.L5_PURPOSE_AMBIGUOUS_STATE_CLASS,
      `No routing rule for domain '${domain}'`,
    );
  }
  return rule.primaryClass;
}

/**
 * List all domains that route to a given state class.
 */
export function getDomainsForStateClass(sc: L5StateClass): L5WriteDomain[] {
  return (Object.entries(DOMAIN_ROUTING) as [L5WriteDomain, DomainClassRule][])
    .filter(([, rule]) => rule.primaryClass === sc)
    .map(([domain]) => domain);
}

export const ALL_WRITE_DOMAINS: readonly L5WriteDomain[] = Object.keys(DOMAIN_ROUTING) as L5WriteDomain[];
