/**
 * L14.4 — Interaction Engines
 *
 * §14.4.36 / §14.4.37 — Pure-function engines for normalization,
 * attribution, deduplication, feedback bridge, ignored derivation,
 * deeper-investigation conversion, expectation resolution, and
 * behavioral interpretation.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import { L14DeliveryChannel } from '../contracts/delivery-channel';
import { L14ExpectedInteractionType } from '../contracts/delivery-execution';
import {
  L14InteractionActorClass,
  L14InteractionAttributionQuality,
  L14_INTERACTION_FAMILY_OF,
  L14InteractionType,
  type L14UserInteractionEvent,
} from '../contracts/interaction-event';
import {
  L14InteractionOrigin,
  L14InteractionQualificationFlag,
  L14InteractionSurface,
  type L14InteractionContext,
} from '../contracts/interaction-context';
import {
  L14BehavioralInterpretation,
  L14ForbiddenBehavioralConclusion,
  type L14InteractionInterpretationPolicy,
} from '../contracts/interaction-interpretation';
import {
  L14DeeperInvestigationConversionType,
  L14IgnoredAlertClassificationStatus,
  L14IgnoredDerivationDisqualifier,
  L14InteractionExpectationResolutionStatus,
  type L14DeeperInvestigationConversionRecord,
  type L14FeedbackInteractionBridge,
  type L14IgnoredAlertDerivationRecord,
  type L14InteractionDeduplicationKey,
  type L14InteractionExpectationResolution,
} from '../contracts/interaction-derivation';

const POLICY_V = 'l14.interaction.v1';

// ── 1. Normalizer ──────────────────────────────────────────────────

export interface L14NormalizeInput {
  readonly user_id_hash?: string;
  readonly session_id_hash?: string;
  readonly raw_user_id?: string; // forbidden; surfaced for validator rejection
  readonly source_delivery_ref?: string;
  readonly source_execution_ref?: string;
  readonly source_output_ref?: string;
  readonly source_feedback_expectation_ref?: string;
  readonly interaction_type: L14InteractionType;
  readonly actor_class?: L14InteractionActorClass;
  readonly occurred_at: string;
  readonly context: L14InteractionContext;
  readonly attributed_delivery_channel?: L14DeliveryChannel;
  readonly attributed_alert_class?: string;
  readonly attribution_quality?: L14InteractionAttributionQuality;
  readonly derived_from_window_resolution?: boolean;
  readonly lineage_refs?: readonly string[];
}

function defaultActorClass(t: L14InteractionType): L14InteractionActorClass {
  if (t === L14InteractionType.ALERT_DELIVERED) return L14InteractionActorClass.SYSTEM_DELIVERY;
  if (t === L14InteractionType.ALERT_IGNORED) return L14InteractionActorClass.SYSTEM_DERIVED;
  if (t === L14InteractionType.FEEDBACK_POSITIVE || t === L14InteractionType.FEEDBACK_NEGATIVE) {
    return L14InteractionActorClass.FEEDBACK_BRIDGE;
  }
  return L14InteractionActorClass.USER;
}

export function normalizeL14InteractionEvent(
  input: L14NormalizeInput,
): L14UserInteractionEvent {
  const lineage = input.lineage_refs ?? ['l14.interaction.lineage'];
  const actor = input.actor_class ?? defaultActorClass(input.interaction_type);
  const attribution = input.attribution_quality ?? L14InteractionAttributionQuality.UNATTRIBUTED;
  const derived = input.derived_from_window_resolution === true;
  // raw_user_id is intentionally NOT carried through — validator must
  // reject any normalize input that surfaces it; we drop the value here
  // and rely on the validator to flag the original raw input.
  const replayHash = fnv1a(
    [
      input.interaction_type,
      actor,
      input.occurred_at,
      input.user_id_hash ?? '',
      input.session_id_hash ?? '',
      input.source_execution_ref ?? '',
      input.source_output_ref ?? '',
      input.source_feedback_expectation_ref ?? '',
      attribution,
      String(derived),
      input.attributed_delivery_channel ?? '',
      input.attributed_alert_class ?? '',
      POLICY_V,
    ].join('|'),
  );
  return {
    interaction_event_id: `l14.interaction.${replayHash}`,
    user_id_hash: input.user_id_hash,
    session_id_hash: input.session_id_hash,
    source_delivery_ref: input.source_delivery_ref,
    source_execution_ref: input.source_execution_ref,
    source_output_ref: input.source_output_ref,
    source_feedback_expectation_ref: input.source_feedback_expectation_ref,
    interaction_type: input.interaction_type,
    actor_class: actor,
    occurred_at: input.occurred_at,
    interaction_context: input.context,
    attributed_delivery_channel: input.attributed_delivery_channel,
    attributed_alert_class: input.attributed_alert_class,
    attribution_quality: attribution,
    derived_from_window_resolution: derived,
    lineage_refs: lineage,
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 2. Attribution Engine ─────────────────────────────────────────

export interface L14AttributionInput {
  readonly interaction_type: L14InteractionType;
  readonly has_direct_source_ref: boolean;
  readonly within_expected_window: boolean;
  readonly clicked_deep_link: boolean;
  readonly organic_navigation: boolean;
  readonly delivery_execution_ref?: string;
}

export function deriveL14AttributionQuality(
  input: L14AttributionInput,
): L14InteractionAttributionQuality {
  if (input.clicked_deep_link && input.has_direct_source_ref) {
    return L14InteractionAttributionQuality.DIRECT;
  }
  if (input.has_direct_source_ref && input.within_expected_window) {
    return L14InteractionAttributionQuality.STRONG;
  }
  if (input.has_direct_source_ref && !input.within_expected_window) {
    return L14InteractionAttributionQuality.WEAK;
  }
  if (input.organic_navigation) {
    return L14InteractionAttributionQuality.WEAK;
  }
  return L14InteractionAttributionQuality.UNATTRIBUTED;
}

// ── 3. Deduplication Engine ───────────────────────────────────────

export interface L14DedupInput {
  readonly interaction_type: L14InteractionType;
  readonly user_id_hash?: string;
  readonly session_id_hash?: string;
  readonly source_execution_ref?: string;
  readonly source_output_ref?: string;
  readonly occurred_at: string;
  readonly client_event_ref?: string;
  /** Bucket precision for time grouping — default 5s. */
  readonly bucket_ms?: number;
}

function bucketTimestamp(iso: string, bucket_ms: number): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '0';
  return String(Math.floor(t / bucket_ms) * bucket_ms);
}

export function buildL14InteractionDeduplicationKey(
  input: L14DedupInput,
): L14InteractionDeduplicationKey {
  const bucket_ms = input.bucket_ms ?? 5000;
  const bucket = bucketTimestamp(input.occurred_at, bucket_ms);
  const replayHash = fnv1a(
    [
      input.interaction_type,
      input.user_id_hash ?? '',
      input.session_id_hash ?? '',
      input.source_execution_ref ?? '',
      input.source_output_ref ?? '',
      bucket,
      input.client_event_ref ?? '',
      POLICY_V,
    ].join('|'),
  );
  return {
    deduplication_key_id: `l14.interaction.dedup.${replayHash}`,
    interaction_type: input.interaction_type,
    user_id_hash: input.user_id_hash,
    session_id_hash: input.session_id_hash,
    source_execution_ref: input.source_execution_ref,
    source_output_ref: input.source_output_ref,
    occurred_at_bucket: bucket,
    client_event_ref: input.client_event_ref,
    lineage_refs: ['l14.interaction.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 4. Feedback Bridge ────────────────────────────────────────────

export interface L14FeedbackBridgeInput {
  readonly l13_feedback_record_ref: string;
  readonly output_ref: string;
  readonly positive: boolean;
}

export function bridgeL14Feedback(
  input: L14FeedbackBridgeInput,
): L14FeedbackInteractionBridge {
  const interaction_type = input.positive
    ? L14InteractionType.FEEDBACK_POSITIVE
    : L14InteractionType.FEEDBACK_NEGATIVE;
  const interpretation = input.positive
    ? L14BehavioralInterpretation.PERCEIVED_UTILITY
    : L14BehavioralInterpretation.QUALITY_ISSUE_CANDIDATE;
  const replayHash = fnv1a(
    [
      input.l13_feedback_record_ref,
      input.output_ref,
      interaction_type,
      interpretation,
      POLICY_V,
    ].join('|'),
  );
  return {
    feedback_bridge_id: `l14.feedback.bridge.${replayHash}`,
    l13_feedback_record_ref: input.l13_feedback_record_ref,
    output_ref: input.output_ref,
    interaction_type,
    behavioral_interpretation: interpretation,
    lineage_refs: ['l14.interaction.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 5. Ignored Alert Derivation Engine ───────────────────────────

export interface L14IgnoredDerivationInput {
  readonly source_execution_ref: string;
  readonly source_feedback_expectation_ref?: string;
  readonly observation_window_start: string;
  readonly observation_window_end: string;
  readonly delivered_successfully: boolean;
  readonly observation_window_elapsed: boolean;
  readonly qualifying_interaction_refs?: readonly string[];
  readonly user_dismissed?: boolean;
  readonly alert_opened?: boolean;
  readonly alert_clicked?: boolean;
  readonly report_opened_from_alert?: boolean;
  readonly watchlist_add_from_alert?: boolean;
  readonly chat_followup_from_alert?: boolean;
}

export function deriveL14IgnoredAlert(
  input: L14IgnoredDerivationInput,
): L14IgnoredAlertDerivationRecord {
  const disq: L14IgnoredDerivationDisqualifier[] = [];
  if (!input.source_feedback_expectation_ref) {
    // Cannot classify without expectation; emit NOT_CLASSIFIABLE_MISSING_EXPECTATION.
  }
  if (input.alert_opened) disq.push(L14IgnoredDerivationDisqualifier.ALERT_OPENED);
  if (input.alert_clicked) disq.push(L14IgnoredDerivationDisqualifier.ALERT_CLICKED);
  if (input.report_opened_from_alert) disq.push(L14IgnoredDerivationDisqualifier.TOKEN_REPORT_OPENED_FROM_ALERT);
  if (input.watchlist_add_from_alert) disq.push(L14IgnoredDerivationDisqualifier.WATCHLIST_ADD_FROM_ALERT);
  if (input.chat_followup_from_alert) disq.push(L14IgnoredDerivationDisqualifier.CHAT_FOLLOW_UP_FROM_ALERT);
  if (input.user_dismissed) disq.push(L14IgnoredDerivationDisqualifier.USER_DISMISSED_ALERT);
  if (!input.delivered_successfully) disq.push(L14IgnoredDerivationDisqualifier.DELIVERY_FAILED);
  if (!input.observation_window_elapsed) disq.push(L14IgnoredDerivationDisqualifier.OBSERVATION_WINDOW_NOT_ELAPSED);

  let status: L14IgnoredAlertClassificationStatus;
  if (!input.source_feedback_expectation_ref) {
    status = L14IgnoredAlertClassificationStatus.NOT_CLASSIFIABLE_MISSING_EXPECTATION;
  } else if (!input.delivered_successfully) {
    status = L14IgnoredAlertClassificationStatus.NOT_CLASSIFIABLE_DELIVERY_FAILED;
  } else if (input.user_dismissed) {
    status = L14IgnoredAlertClassificationStatus.NOT_CLASSIFIABLE_USER_DISMISSED;
  } else if (!input.observation_window_elapsed) {
    status = L14IgnoredAlertClassificationStatus.NOT_YET_CLASSIFIABLE_WINDOW_OPEN;
  } else if (input.alert_opened || input.alert_clicked || input.report_opened_from_alert || input.watchlist_add_from_alert || input.chat_followup_from_alert) {
    status = L14IgnoredAlertClassificationStatus.NOT_IGNORED_QUALIFYING_INTERACTION_OCCURRED;
  } else {
    status = L14IgnoredAlertClassificationStatus.CLASSIFIED_IGNORED;
  }
  const qualifying = input.qualifying_interaction_refs ?? [];
  const replayHash = fnv1a(
    [
      input.source_execution_ref,
      input.source_feedback_expectation_ref ?? '',
      input.observation_window_start,
      input.observation_window_end,
      String(input.delivered_successfully),
      String(input.observation_window_elapsed),
      qualifying.slice().sort().join(','),
      disq.slice().sort().join(','),
      status,
      POLICY_V,
    ].join('|'),
  );
  return {
    ignored_derivation_id: `l14.ignored.${replayHash}`,
    source_execution_ref: input.source_execution_ref,
    source_feedback_expectation_ref: input.source_feedback_expectation_ref ?? '',
    observation_window_start: input.observation_window_start,
    observation_window_end: input.observation_window_end,
    delivered_successfully: input.delivered_successfully,
    observation_window_elapsed: input.observation_window_elapsed,
    qualifying_interaction_refs: qualifying,
    disqualifying_conditions: disq,
    ignored_classification_status: status,
    lineage_refs: ['l14.interaction.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 6. Deeper Investigation Conversion Engine ────────────────────

export interface L14ConversionInput {
  readonly source_interaction_event_ref: string;
  readonly originating_delivery_ref?: string;
  readonly conversion_type: L14DeeperInvestigationConversionType;
  readonly target_ref: string;
  readonly occurred_at: string;
  readonly attribution_quality: L14InteractionAttributionQuality;
}

export function recordL14DeeperInvestigationConversion(
  input: L14ConversionInput,
): L14DeeperInvestigationConversionRecord {
  const replayHash = fnv1a(
    [
      input.source_interaction_event_ref,
      input.originating_delivery_ref ?? '',
      input.conversion_type,
      input.target_ref,
      input.occurred_at,
      input.attribution_quality,
      POLICY_V,
    ].join('|'),
  );
  return {
    conversion_id: `l14.conversion.${replayHash}`,
    source_interaction_event_ref: input.source_interaction_event_ref,
    originating_delivery_ref: input.originating_delivery_ref,
    conversion_type: input.conversion_type,
    target_ref: input.target_ref,
    occurred_at: input.occurred_at,
    attribution_quality: input.attribution_quality,
    lineage_refs: ['l14.interaction.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 7. Expectation Resolution Engine ─────────────────────────────

export interface L14ExpectationResolutionInput {
  readonly feedback_expectation_ref: string;
  readonly source_delivery_execution_ref?: string;
  readonly eligible_expected_interactions: readonly L14ExpectedInteractionType[];
  readonly qualifying_interaction_refs: readonly string[];
  readonly observed_interaction_types: readonly L14ExpectedInteractionType[];
  readonly observation_window_elapsed: boolean;
  readonly ignored_alert_derivation_ref?: string;
}

export function resolveL14InteractionExpectation(
  input: L14ExpectationResolutionInput,
): L14InteractionExpectationResolution {
  const observed = new Set(input.observed_interaction_types);
  const missing = input.eligible_expected_interactions.filter(t => !observed.has(t));
  let status: L14InteractionExpectationResolutionStatus;
  if (input.eligible_expected_interactions.length === 0) {
    status = L14InteractionExpectationResolutionStatus.EXPECTATION_NOT_APPLICABLE;
  } else if (missing.length === 0) {
    status = L14InteractionExpectationResolutionStatus.EXPECTATION_SATISFIED;
  } else if (observed.size > 0 && !input.observation_window_elapsed) {
    status = L14InteractionExpectationResolutionStatus.EXPECTATION_PARTIALLY_SATISFIED;
  } else if (!input.observation_window_elapsed) {
    status = L14InteractionExpectationResolutionStatus.EXPECTATION_UNSATISFIED_WINDOW_OPEN;
  } else if (input.ignored_alert_derivation_ref) {
    status = L14InteractionExpectationResolutionStatus.EXPECTATION_EXPIRED_CLASSIFIED_IGNORED;
  } else if (observed.size === 0) {
    status = L14InteractionExpectationResolutionStatus.EXPECTATION_EXPIRED_CLASSIFIED_IGNORED;
  } else {
    status = L14InteractionExpectationResolutionStatus.EXPECTATION_PARTIALLY_SATISFIED;
  }
  const replayHash = fnv1a(
    [
      input.feedback_expectation_ref,
      input.source_delivery_execution_ref ?? '',
      input.qualifying_interaction_refs.slice().sort().join(','),
      input.eligible_expected_interactions.slice().sort().join(','),
      missing.slice().sort().join(','),
      status,
      String(input.observation_window_elapsed),
      input.ignored_alert_derivation_ref ?? '',
      POLICY_V,
    ].join('|'),
  );
  return {
    expectation_resolution_id: `l14.expectation.resolution.${replayHash}`,
    feedback_expectation_ref: input.feedback_expectation_ref,
    source_delivery_execution_ref: input.source_delivery_execution_ref,
    expectation_status: status,
    qualifying_interaction_refs: input.qualifying_interaction_refs,
    missing_expected_interaction_types: missing,
    observation_window_elapsed: input.observation_window_elapsed,
    ignored_alert_derivation_ref: input.ignored_alert_derivation_ref,
    lineage_refs: ['l14.interaction.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 8. Behavioral Interpretation Engine ──────────────────────────

const INTERPRETATION_BY_TYPE: Readonly<Record<L14InteractionType, {
  can_indicate: readonly L14BehavioralInterpretation[];
  cannot_prove: readonly L14ForbiddenBehavioralConclusion[];
  may_feed_delivery_analytics: boolean;
  may_feed_quality_review: boolean;
}>> = {
  [L14InteractionType.ALERT_DELIVERED]: {
    can_indicate: [],
    cannot_prove: [L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: false,
  },
  [L14InteractionType.ALERT_OPENED]: {
    can_indicate: [L14BehavioralInterpretation.ATTENTION],
    cannot_prove: [L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS, L14ForbiddenBehavioralConclusion.MODEL_ACCURACY],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: false,
  },
  [L14InteractionType.ALERT_CLICKED]: {
    can_indicate: [L14BehavioralInterpretation.CURIOSITY, L14BehavioralInterpretation.PERCEIVED_RELEVANCE],
    cannot_prove: [L14ForbiddenBehavioralConclusion.OUTPUT_USEFULNESS_PROVEN],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: false,
  },
  [L14InteractionType.ALERT_IGNORED]: {
    can_indicate: [L14BehavioralInterpretation.LOW_IMMEDIATE_RELEVANCE],
    cannot_prove: [L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS, L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: true,
  },
  [L14InteractionType.ALERT_DISMISSED]: {
    can_indicate: [L14BehavioralInterpretation.PREFERENCE_FRICTION],
    cannot_prove: [L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: false,
  },
  [L14InteractionType.TOKEN_REPORT_OPENED]: {
    can_indicate: [L14BehavioralInterpretation.DEEPER_INVESTIGATION],
    cannot_prove: [L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: false,
  },
  [L14InteractionType.TOKEN_REPORT_SAVED]: {
    can_indicate: [L14BehavioralInterpretation.PERCEIVED_UTILITY],
    cannot_prove: [L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS, L14ForbiddenBehavioralConclusion.MODEL_ACCURACY],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: true,
  },
  [L14InteractionType.TOKEN_REPORT_SHARED]: {
    can_indicate: [L14BehavioralInterpretation.PERCEIVED_UTILITY],
    cannot_prove: [L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: false,
  },
  [L14InteractionType.WATCHLIST_ADD]: {
    can_indicate: [L14BehavioralInterpretation.USER_INTEREST],
    cannot_prove: [L14ForbiddenBehavioralConclusion.MODEL_ACCURACY],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: false,
  },
  [L14InteractionType.WATCHLIST_REMOVE]: {
    can_indicate: [L14BehavioralInterpretation.PREFERENCE_FRICTION],
    cannot_prove: [L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: false,
  },
  [L14InteractionType.CHAT_RESPONSE_VIEWED]: {
    can_indicate: [L14BehavioralInterpretation.ATTENTION],
    cannot_prove: [L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: false,
  },
  [L14InteractionType.CHAT_FOLLOW_UP_ASKED]: {
    can_indicate: [L14BehavioralInterpretation.DEEPER_INVESTIGATION],
    cannot_prove: [L14ForbiddenBehavioralConclusion.OUTPUT_USEFULNESS_PROVEN],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: true,
  },
  [L14InteractionType.FEEDBACK_POSITIVE]: {
    can_indicate: [L14BehavioralInterpretation.PERCEIVED_UTILITY],
    cannot_prove: [L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS, L14ForbiddenBehavioralConclusion.SCORE_CALIBRATION_PROOF],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: true,
  },
  [L14InteractionType.FEEDBACK_NEGATIVE]: {
    can_indicate: [L14BehavioralInterpretation.QUALITY_ISSUE_CANDIDATE],
    cannot_prove: [L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR, L14ForbiddenBehavioralConclusion.HYPOTHESIS_TRUTH],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: true,
  },
  [L14InteractionType.ALERT_CLASS_MUTED]: {
    can_indicate: [L14BehavioralInterpretation.PREFERENCE_FRICTION],
    cannot_prove: [L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: true,
  },
  [L14InteractionType.CHANNEL_MUTED]: {
    can_indicate: [L14BehavioralInterpretation.PREFERENCE_FRICTION],
    cannot_prove: [L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR],
    may_feed_delivery_analytics: true,
    may_feed_quality_review: true,
  },
};

export function buildL14InteractionInterpretationPolicy(
  t: L14InteractionType,
): L14InteractionInterpretationPolicy {
  const def = INTERPRETATION_BY_TYPE[t];
  return {
    interaction_type: t,
    can_indicate: def.can_indicate,
    cannot_prove: def.cannot_prove,
    may_feed_delivery_analytics: def.may_feed_delivery_analytics,
    may_feed_quality_review: def.may_feed_quality_review,
    may_feed_truth_calibration_directly: false,
    policy_version: POLICY_V,
  };
}

// Suppress unused-imports for downstream cert paths.
void L14InteractionSurface.DASHBOARD;
void L14InteractionOrigin.DIRECT_DELIVERY_ACTION;
void L14InteractionQualificationFlag.ATTRIBUTABLE_TO_DELIVERY;
void L14_INTERACTION_FAMILY_OF;
