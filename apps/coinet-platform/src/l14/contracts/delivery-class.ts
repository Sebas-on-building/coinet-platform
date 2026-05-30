/**
 * L14.2 — Delivery Class Contract
 *
 * §14.2.6 — Closed enumeration of payload classes that may be
 * routed through delivery channels.
 */

export enum L14DeliveryClass {
  CURRENT_STATE_CARD = 'CURRENT_STATE_CARD',
  TOKEN_REPORT_PAGE_PAYLOAD = 'TOKEN_REPORT_PAGE_PAYLOAD',
  AI_CHAT_RESPONSE = 'AI_CHAT_RESPONSE',
  ALERT_NOTIFICATION = 'ALERT_NOTIFICATION',
  ALERT_DIGEST_ITEM = 'ALERT_DIGEST_ITEM',
  ANALYST_REVIEW_PAYLOAD = 'ANALYST_REVIEW_PAYLOAD',
  CALIBRATION_REVIEW_PAYLOAD = 'CALIBRATION_REVIEW_PAYLOAD',
}

export const ALL_L14_DELIVERY_CLASSES: readonly L14DeliveryClass[] =
  Object.values(L14DeliveryClass);
