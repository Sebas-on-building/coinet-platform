/**
 * L14.2 — Rendering Profile Registry
 *
 * §14.2.13 — Built-in rendering profiles. Each profile pins the
 * non-mutation contract flags so the validator can reject any
 * usage that drifts.
 */

import {
  L14DeliveryChannel,
} from '../contracts/delivery-channel';
import { L14DeliveryClass } from '../contracts/delivery-class';
import {
  L14RenderingProfileClass,
  type L14RenderingProfile,
} from '../contracts/rendering-profile';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.delivery.v1';

function profile(
  rendering_profile_class: L14RenderingProfileClass,
  channel: L14DeliveryChannel,
  delivery_class: L14DeliveryClass,
  may_truncate: boolean,
  may_expand: boolean,
  may_reorder_sections: boolean,
): L14RenderingProfile {
  const id = `l14.render.${rendering_profile_class}.${fnv1a([rendering_profile_class, channel, delivery_class, POLICY_V].join('|'))}`;
  return {
    rendering_profile_id: id,
    rendering_profile_class,
    channel,
    delivery_class,
    may_truncate,
    may_expand,
    may_reorder_sections,
    must_preserve_disclosures: true,
    must_preserve_restrictions: true,
    must_preserve_trigger_invalidation_state: true,
    must_preserve_source_semantics: true,
    may_regenerate_language: false,
    may_intensify_urgency: false,
    may_convert_condition_to_certainty: false,
    policy_version: POLICY_V,
  };
}

const REGISTRY: ReadonlyArray<L14RenderingProfile> = [
  profile(L14RenderingProfileClass.DASHBOARD_CARD, L14DeliveryChannel.DASHBOARD, L14DeliveryClass.CURRENT_STATE_CARD, true, true, true),
  profile(L14RenderingProfileClass.TOKEN_REPORT_SECTION, L14DeliveryChannel.TOKEN_REPORT_PAGE, L14DeliveryClass.TOKEN_REPORT_PAGE_PAYLOAD, true, true, true),
  profile(L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER, L14DeliveryChannel.AI_CHAT, L14DeliveryClass.AI_CHAT_RESPONSE, false, false, false),
  profile(L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE, L14DeliveryChannel.TELEGRAM, L14DeliveryClass.ALERT_NOTIFICATION, true, false, false),
  profile(L14RenderingProfileClass.TELEGRAM_DIGEST_ITEM, L14DeliveryChannel.TELEGRAM, L14DeliveryClass.ALERT_DIGEST_ITEM, true, false, false),
  profile(L14RenderingProfileClass.ANALYST_REVIEW_PANEL, L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE, L14DeliveryClass.ANALYST_REVIEW_PAYLOAD, true, true, true),
  profile(L14RenderingProfileClass.CALIBRATION_REVIEW_PANEL, L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE, L14DeliveryClass.CALIBRATION_REVIEW_PAYLOAD, true, true, true),
];

const INDEX_BY_CLASS: ReadonlyMap<L14RenderingProfileClass, L14RenderingProfile> =
  new Map(REGISTRY.map(p => [p.rendering_profile_class, p]));

export function getL14RenderingProfiles(): readonly L14RenderingProfile[] {
  return REGISTRY;
}

export function getL14RenderingProfile(
  cls: L14RenderingProfileClass,
): L14RenderingProfile | undefined {
  return INDEX_BY_CLASS.get(cls);
}

export function l14RenderingProfileRegistered(
  cls: L14RenderingProfileClass,
): boolean {
  return INDEX_BY_CLASS.has(cls);
}
