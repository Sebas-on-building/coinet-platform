/**
 * L14.4 — Deduplication, Ignored Derivation, Conversion, Bridge, Resolution
 *
 * §14.4.17 / §14.4.23–§14.4.30 / §14.4.38–§14.4.39 — Consolidated
 * derived-event contracts.
 */

import type { L14InteractionType } from './interaction-event';
import type { L14ExpectedInteractionType } from './delivery-execution';
import type { L14BehavioralInterpretation } from './interaction-interpretation';

// ── Deduplication ──────────────────────────────────────────────────

export interface L14InteractionDeduplicationKey {
  readonly deduplication_key_id: string;
  readonly interaction_type: L14InteractionType;
  readonly user_id_hash?: string;
  readonly session_id_hash?: string;
  readonly source_execution_ref?: string;
  readonly source_output_ref?: string;
  readonly occurred_at_bucket: string;
  readonly client_event_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Ignored alert derivation ───────────────────────────────────────

export enum L14IgnoredAlertClassificationStatus {
  CLASSIFIED_IGNORED = 'CLASSIFIED_IGNORED',
  NOT_IGNORED_QUALIFYING_INTERACTION_OCCURRED = 'NOT_IGNORED_QUALIFYING_INTERACTION_OCCURRED',
  NOT_YET_CLASSIFIABLE_WINDOW_OPEN = 'NOT_YET_CLASSIFIABLE_WINDOW_OPEN',
  NOT_CLASSIFIABLE_DELIVERY_FAILED = 'NOT_CLASSIFIABLE_DELIVERY_FAILED',
  NOT_CLASSIFIABLE_MISSING_EXPECTATION = 'NOT_CLASSIFIABLE_MISSING_EXPECTATION',
  NOT_CLASSIFIABLE_USER_DISMISSED = 'NOT_CLASSIFIABLE_USER_DISMISSED',
}

export enum L14IgnoredDerivationDisqualifier {
  ALERT_OPENED = 'ALERT_OPENED',
  ALERT_CLICKED = 'ALERT_CLICKED',
  TOKEN_REPORT_OPENED_FROM_ALERT = 'TOKEN_REPORT_OPENED_FROM_ALERT',
  WATCHLIST_ADD_FROM_ALERT = 'WATCHLIST_ADD_FROM_ALERT',
  CHAT_FOLLOW_UP_FROM_ALERT = 'CHAT_FOLLOW_UP_FROM_ALERT',
  USER_DISMISSED_ALERT = 'USER_DISMISSED_ALERT',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  OBSERVATION_WINDOW_NOT_ELAPSED = 'OBSERVATION_WINDOW_NOT_ELAPSED',
}

export interface L14IgnoredAlertDerivationRecord {
  readonly ignored_derivation_id: string;
  readonly source_execution_ref: string;
  readonly source_feedback_expectation_ref: string;
  readonly observation_window_start: string;
  readonly observation_window_end: string;
  readonly delivered_successfully: boolean;
  readonly observation_window_elapsed: boolean;
  readonly qualifying_interaction_refs: readonly string[];
  readonly disqualifying_conditions: readonly L14IgnoredDerivationDisqualifier[];
  readonly ignored_classification_status: L14IgnoredAlertClassificationStatus;
  readonly emitted_interaction_event_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Deeper investigation conversion ───────────────────────────────

export enum L14DeeperInvestigationConversionType {
  ALERT_TO_REPORT_OPEN = 'ALERT_TO_REPORT_OPEN',
  ALERT_TO_WATCHLIST_ADD = 'ALERT_TO_WATCHLIST_ADD',
  ALERT_TO_CHAT_FOLLOW_UP = 'ALERT_TO_CHAT_FOLLOW_UP',
  DASHBOARD_CARD_TO_ASSET_PAGE = 'DASHBOARD_CARD_TO_ASSET_PAGE',
  REPORT_TO_SAVE = 'REPORT_TO_SAVE',
  CHAT_TO_REPORT_GENERATION = 'CHAT_TO_REPORT_GENERATION',
}

import type { L14InteractionAttributionQuality } from './interaction-event';

export interface L14DeeperInvestigationConversionRecord {
  readonly conversion_id: string;
  readonly source_interaction_event_ref: string;
  readonly originating_delivery_ref?: string;
  readonly conversion_type: L14DeeperInvestigationConversionType;
  readonly target_ref: string;
  readonly occurred_at: string;
  readonly attribution_quality: L14InteractionAttributionQuality;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Feedback bridge ───────────────────────────────────────────────

export interface L14FeedbackInteractionBridge {
  readonly feedback_bridge_id: string;
  readonly l13_feedback_record_ref: string;
  readonly output_ref: string;
  readonly interaction_type: L14InteractionType;
  readonly behavioral_interpretation: L14BehavioralInterpretation;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Expectation resolution ────────────────────────────────────────

export enum L14InteractionExpectationResolutionStatus {
  EXPECTATION_SATISFIED = 'EXPECTATION_SATISFIED',
  EXPECTATION_PARTIALLY_SATISFIED = 'EXPECTATION_PARTIALLY_SATISFIED',
  EXPECTATION_UNSATISFIED_WINDOW_OPEN = 'EXPECTATION_UNSATISFIED_WINDOW_OPEN',
  EXPECTATION_EXPIRED_CLASSIFIED_IGNORED = 'EXPECTATION_EXPIRED_CLASSIFIED_IGNORED',
  EXPECTATION_NOT_APPLICABLE = 'EXPECTATION_NOT_APPLICABLE',
}

export interface L14InteractionExpectationResolution {
  readonly expectation_resolution_id: string;
  readonly feedback_expectation_ref: string;
  readonly source_delivery_execution_ref?: string;
  readonly expectation_status: L14InteractionExpectationResolutionStatus;
  readonly qualifying_interaction_refs: readonly string[];
  readonly missing_expected_interaction_types: readonly L14ExpectedInteractionType[];
  readonly observation_window_elapsed: boolean;
  readonly ignored_alert_derivation_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
