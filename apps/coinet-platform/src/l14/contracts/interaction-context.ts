/**
 * L14.4 — Interaction Context, Surface, Origin, Device, Flags
 *
 * §14.4.10 / §14.4.11 / §14.4.12 / §14.4.13 / §14.4.14 — Consolidated
 * context envelope for every interaction event.
 */

import type { L14DeliveryChannel } from './delivery-channel';
import type { L14DeliveryClass } from './delivery-class';

export enum L14InteractionSurface {
  DASHBOARD = 'DASHBOARD',
  TOKEN_REPORT_PAGE = 'TOKEN_REPORT_PAGE',
  AI_CHAT = 'AI_CHAT',
  TELEGRAM = 'TELEGRAM',
  ALERT_CENTER = 'ALERT_CENTER',
  WATCHLIST = 'WATCHLIST',
  PORTFOLIO = 'PORTFOLIO',
  INTERNAL_ANALYST_CONSOLE = 'INTERNAL_ANALYST_CONSOLE',
}

export enum L14InteractionOrigin {
  DIRECT_DELIVERY_ACTION = 'DIRECT_DELIVERY_ACTION',
  FOLLOW_ON_FROM_DELIVERY = 'FOLLOW_ON_FROM_DELIVERY',
  ORGANIC_PRODUCT_USAGE = 'ORGANIC_PRODUCT_USAGE',
  DERIVED_WINDOW_RESOLUTION = 'DERIVED_WINDOW_RESOLUTION',
  FEEDBACK_RECORD_BRIDGE = 'FEEDBACK_RECORD_BRIDGE',
}

export enum L14DeviceClass {
  DESKTOP_WEB = 'DESKTOP_WEB',
  MOBILE_WEB = 'MOBILE_WEB',
  TELEGRAM_CLIENT = 'TELEGRAM_CLIENT',
  INTERNAL_CONSOLE = 'INTERNAL_CONSOLE',
  UNKNOWN = 'UNKNOWN',
}

export enum L14InteractionQualificationFlag {
  ATTRIBUTABLE_TO_DELIVERY = 'ATTRIBUTABLE_TO_DELIVERY',
  WITHIN_EXPECTED_WINDOW = 'WITHIN_EXPECTED_WINDOW',
  OUTSIDE_EXPECTED_WINDOW = 'OUTSIDE_EXPECTED_WINDOW',
  QUALIFIES_AS_NON_IGNORE = 'QUALIFIES_AS_NON_IGNORE',
  QUALIFIES_AS_DEEPER_INVESTIGATION = 'QUALIFIES_AS_DEEPER_INVESTIGATION',
  PREFERENCE_MUTATION_SIGNAL = 'PREFERENCE_MUTATION_SIGNAL',
  FEEDBACK_SIGNAL = 'FEEDBACK_SIGNAL',
  DERIVED_EVENT_NOT_RAW_CLIENT_EVENT = 'DERIVED_EVENT_NOT_RAW_CLIENT_EVENT',
}

export interface L14InteractionContext {
  readonly interaction_context_id: string;
  readonly product_surface: L14InteractionSurface;
  readonly surface_location_ref?: string;
  readonly originating_channel?: L14DeliveryChannel;
  readonly originating_delivery_class?: L14DeliveryClass;
  readonly interaction_origin: L14InteractionOrigin;
  readonly device_class?: L14DeviceClass;
  readonly client_event_ref?: string;
  readonly navigation_target_ref?: string;
  readonly related_asset_scope_ref?: string;
  readonly related_report_ref?: string;
  readonly related_chat_thread_ref?: string;
  readonly qualification_flags: readonly L14InteractionQualificationFlag[];
  readonly occurred_within_expected_window: boolean;
  readonly event_window_ref?: string;
  readonly policy_version: string;
}
