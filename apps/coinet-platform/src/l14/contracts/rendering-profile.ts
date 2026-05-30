/**
 * L14.2 — Rendering Profile Contract
 *
 * §14.2.12 / §14.2.13 — Closed rendering profile classes and the
 * non-mutation contract enforced on every L14 rendering.
 */

import type { L14DeliveryChannel } from './delivery-channel';
import type { L14DeliveryClass } from './delivery-class';

export enum L14RenderingProfileClass {
  DASHBOARD_CARD = 'DASHBOARD_CARD',
  TOKEN_REPORT_SECTION = 'TOKEN_REPORT_SECTION',
  CHAT_RESPONSE_CONTAINER = 'CHAT_RESPONSE_CONTAINER',
  TELEGRAM_ALERT_MESSAGE = 'TELEGRAM_ALERT_MESSAGE',
  TELEGRAM_DIGEST_ITEM = 'TELEGRAM_DIGEST_ITEM',
  ANALYST_REVIEW_PANEL = 'ANALYST_REVIEW_PANEL',
  CALIBRATION_REVIEW_PANEL = 'CALIBRATION_REVIEW_PANEL',
}

export const ALL_L14_RENDERING_PROFILE_CLASSES:
  readonly L14RenderingProfileClass[] =
  Object.values(L14RenderingProfileClass);

export interface L14RenderingProfile {
  readonly rendering_profile_id: string;
  readonly rendering_profile_class: L14RenderingProfileClass;
  readonly channel: L14DeliveryChannel;
  readonly delivery_class: L14DeliveryClass;
  readonly may_truncate: boolean;
  readonly may_expand: boolean;
  readonly may_reorder_sections: boolean;
  readonly must_preserve_disclosures: true;
  readonly must_preserve_restrictions: true;
  readonly must_preserve_trigger_invalidation_state: true;
  readonly must_preserve_source_semantics: true;
  readonly may_regenerate_language: false;
  readonly may_intensify_urgency: false;
  readonly may_convert_condition_to_certainty: false;
  readonly policy_version: string;
}
