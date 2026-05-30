/**
 * L14.4 — Interaction Event, Types, Families, Attribution, Actor
 *
 * §14.4.6 / §14.4.8 / §14.4.9 / §14.4.15 / §14.4.32 — Consolidated
 * interaction-event taxonomy + event shape.
 */

import type { L14DeliveryChannel } from './delivery-channel';
import type { L14InteractionContext } from './interaction-context';

export enum L14InteractionType {
  ALERT_DELIVERED = 'ALERT_DELIVERED',
  ALERT_OPENED = 'ALERT_OPENED',
  ALERT_CLICKED = 'ALERT_CLICKED',
  ALERT_IGNORED = 'ALERT_IGNORED',
  ALERT_DISMISSED = 'ALERT_DISMISSED',
  TOKEN_REPORT_OPENED = 'TOKEN_REPORT_OPENED',
  TOKEN_REPORT_SAVED = 'TOKEN_REPORT_SAVED',
  TOKEN_REPORT_SHARED = 'TOKEN_REPORT_SHARED',
  WATCHLIST_ADD = 'WATCHLIST_ADD',
  WATCHLIST_REMOVE = 'WATCHLIST_REMOVE',
  CHAT_RESPONSE_VIEWED = 'CHAT_RESPONSE_VIEWED',
  CHAT_FOLLOW_UP_ASKED = 'CHAT_FOLLOW_UP_ASKED',
  FEEDBACK_POSITIVE = 'FEEDBACK_POSITIVE',
  FEEDBACK_NEGATIVE = 'FEEDBACK_NEGATIVE',
  ALERT_CLASS_MUTED = 'ALERT_CLASS_MUTED',
  CHANNEL_MUTED = 'CHANNEL_MUTED',
}

export const ALL_L14_INTERACTION_TYPES: readonly L14InteractionType[] =
  Object.values(L14InteractionType);

export enum L14InteractionFamily {
  ALERT_ATTENTION = 'ALERT_ATTENTION',
  ALERT_RESPONSE = 'ALERT_RESPONSE',
  REPORT_UTILITY = 'REPORT_UTILITY',
  WATCHLIST_INTENT = 'WATCHLIST_INTENT',
  CHAT_CONTINUATION = 'CHAT_CONTINUATION',
  USER_FEEDBACK = 'USER_FEEDBACK',
  PREFERENCE_CHANGE = 'PREFERENCE_CHANGE',
}

export const L14_INTERACTION_FAMILY_OF:
  Readonly<Record<L14InteractionType, L14InteractionFamily>> = {
  [L14InteractionType.ALERT_DELIVERED]: L14InteractionFamily.ALERT_ATTENTION,
  [L14InteractionType.ALERT_OPENED]: L14InteractionFamily.ALERT_ATTENTION,
  [L14InteractionType.ALERT_CLICKED]: L14InteractionFamily.ALERT_RESPONSE,
  [L14InteractionType.ALERT_IGNORED]: L14InteractionFamily.ALERT_RESPONSE,
  [L14InteractionType.ALERT_DISMISSED]: L14InteractionFamily.ALERT_RESPONSE,
  [L14InteractionType.TOKEN_REPORT_OPENED]: L14InteractionFamily.REPORT_UTILITY,
  [L14InteractionType.TOKEN_REPORT_SAVED]: L14InteractionFamily.REPORT_UTILITY,
  [L14InteractionType.TOKEN_REPORT_SHARED]: L14InteractionFamily.REPORT_UTILITY,
  [L14InteractionType.WATCHLIST_ADD]: L14InteractionFamily.WATCHLIST_INTENT,
  [L14InteractionType.WATCHLIST_REMOVE]: L14InteractionFamily.WATCHLIST_INTENT,
  [L14InteractionType.CHAT_RESPONSE_VIEWED]: L14InteractionFamily.CHAT_CONTINUATION,
  [L14InteractionType.CHAT_FOLLOW_UP_ASKED]: L14InteractionFamily.CHAT_CONTINUATION,
  [L14InteractionType.FEEDBACK_POSITIVE]: L14InteractionFamily.USER_FEEDBACK,
  [L14InteractionType.FEEDBACK_NEGATIVE]: L14InteractionFamily.USER_FEEDBACK,
  [L14InteractionType.ALERT_CLASS_MUTED]: L14InteractionFamily.PREFERENCE_CHANGE,
  [L14InteractionType.CHANNEL_MUTED]: L14InteractionFamily.PREFERENCE_CHANGE,
};

export enum L14InteractionActorClass {
  USER = 'USER',
  SYSTEM_DELIVERY = 'SYSTEM_DELIVERY',
  SYSTEM_DERIVED = 'SYSTEM_DERIVED',
  FEEDBACK_BRIDGE = 'FEEDBACK_BRIDGE',
}

export const ALL_L14_INTERACTION_ACTOR_CLASSES:
  readonly L14InteractionActorClass[] =
  Object.values(L14InteractionActorClass);

export enum L14InteractionAttributionQuality {
  DIRECT = 'DIRECT',
  STRONG = 'STRONG',
  WEAK = 'WEAK',
  UNATTRIBUTED = 'UNATTRIBUTED',
}

export const ALL_L14_INTERACTION_ATTRIBUTION_QUALITIES:
  readonly L14InteractionAttributionQuality[] =
  Object.values(L14InteractionAttributionQuality);

export interface L14UserInteractionEvent {
  readonly interaction_event_id: string;
  readonly user_id_hash?: string;
  readonly session_id_hash?: string;
  readonly source_delivery_ref?: string;
  readonly source_execution_ref?: string;
  readonly source_output_ref?: string;
  readonly source_feedback_expectation_ref?: string;
  readonly interaction_type: L14InteractionType;
  readonly actor_class: L14InteractionActorClass;
  readonly occurred_at: string;
  readonly interaction_context: L14InteractionContext;
  readonly attributed_delivery_channel?: L14DeliveryChannel;
  readonly attributed_alert_class?: string;
  readonly attribution_quality: L14InteractionAttributionQuality;
  readonly derived_from_window_resolution: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
