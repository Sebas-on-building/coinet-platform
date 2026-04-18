/**
 * L6.8 — Family Enablement
 *
 * §6.8.3.4, §6.8.6.3 — Family-by-family rollout in fixed order:
 * Market → Derivatives → DEX → Protocol → On-chain → Security → Narrative → Entity.
 */

import { L6FeatureFamilyId } from '../contracts/feature-family-definition';
import { L6EventFamilyId } from '../contracts/event-family-definition';

export enum L6FamilyEnablementState {
  DISABLED = 'DISABLED',
  DRY_RUN = 'DRY_RUN',
  HISTORICAL_ONLY = 'HISTORICAL_ONLY',
  SHADOW_CURRENT = 'SHADOW_CURRENT',
  CANARY_CURRENT = 'CANARY_CURRENT',
  PRODUCTION = 'PRODUCTION',
  FROZEN = 'FROZEN',
}

export const L6_FEATURE_FAMILY_ENABLEMENT_ORDER: readonly L6FeatureFamilyId[] = Object.freeze([
  L6FeatureFamilyId.MARKET,
  L6FeatureFamilyId.DERIVATIVES,
  L6FeatureFamilyId.DEX,
  L6FeatureFamilyId.PROTOCOL,
  L6FeatureFamilyId.ONCHAIN,
  L6FeatureFamilyId.SECURITY,
  L6FeatureFamilyId.NARRATIVE,
  L6FeatureFamilyId.ENTITY,
]);

export const L6_EVENT_FAMILY_ENABLEMENT_ORDER: readonly L6EventFamilyId[] = Object.freeze([
  L6EventFamilyId.FUNDING_SPIKE,
  L6EventFamilyId.LIQUIDATION_BURST,
  L6EventFamilyId.WHALE_ACCUMULATION_CLUSTER,
  L6EventFamilyId.NEW_PAIR_CREATED,
  L6EventFamilyId.SECURITY_RISK_CHANGE,
  L6EventFamilyId.UNLOCK_APPROACHING,
  L6EventFamilyId.TREASURY_TRANSFER_TO_EXCHANGE,
  L6EventFamilyId.SUDDEN_NARRATIVE_BREAKOUT,
]);

/**
 * Transition graph. A family progresses DISABLED → DRY_RUN → HISTORICAL_ONLY
 * → SHADOW_CURRENT → CANARY_CURRENT → PRODUCTION. FROZEN is reachable from
 * any active state. Rollback edges go back through CANARY/SHADOW when
 * acceptable under the rollback policy.
 */
const LEGAL_FORWARD_TRANSITIONS: Readonly<Record<L6FamilyEnablementState, readonly L6FamilyEnablementState[]>> = Object.freeze({
  [L6FamilyEnablementState.DISABLED]: [L6FamilyEnablementState.DRY_RUN],
  [L6FamilyEnablementState.DRY_RUN]: [L6FamilyEnablementState.HISTORICAL_ONLY, L6FamilyEnablementState.DISABLED],
  [L6FamilyEnablementState.HISTORICAL_ONLY]: [L6FamilyEnablementState.SHADOW_CURRENT, L6FamilyEnablementState.DRY_RUN, L6FamilyEnablementState.DISABLED],
  [L6FamilyEnablementState.SHADOW_CURRENT]: [L6FamilyEnablementState.CANARY_CURRENT, L6FamilyEnablementState.HISTORICAL_ONLY, L6FamilyEnablementState.DISABLED],
  [L6FamilyEnablementState.CANARY_CURRENT]: [L6FamilyEnablementState.PRODUCTION, L6FamilyEnablementState.SHADOW_CURRENT, L6FamilyEnablementState.DISABLED],
  [L6FamilyEnablementState.PRODUCTION]: [L6FamilyEnablementState.FROZEN, L6FamilyEnablementState.CANARY_CURRENT, L6FamilyEnablementState.DISABLED],
  [L6FamilyEnablementState.FROZEN]: [L6FamilyEnablementState.PRODUCTION, L6FamilyEnablementState.DISABLED],
});

export function isLegalTransition(
  from: L6FamilyEnablementState,
  to: L6FamilyEnablementState,
): boolean {
  return LEGAL_FORWARD_TRANSITIONS[from].includes(to);
}

export interface L6FamilyEnablementDecision {
  readonly ok: boolean;
  readonly reason: string;
}

export interface L6FamilyEnablementContext {
  readonly certification_runtime_green_or_higher: boolean;
  readonly observability_ok: boolean;
  readonly earlier_families_at_least: L6FamilyEnablementState;
}

const STATE_ORDER: readonly L6FamilyEnablementState[] = [
  L6FamilyEnablementState.DISABLED,
  L6FamilyEnablementState.DRY_RUN,
  L6FamilyEnablementState.HISTORICAL_ONLY,
  L6FamilyEnablementState.SHADOW_CURRENT,
  L6FamilyEnablementState.CANARY_CURRENT,
  L6FamilyEnablementState.PRODUCTION,
  L6FamilyEnablementState.FROZEN,
];

function stateRank(s: L6FamilyEnablementState): number {
  return STATE_ORDER.indexOf(s);
}

/**
 * A family may only advance to PRODUCTION when:
 * - transition is legal
 * - runtime-green or higher certification exists
 * - observability report has no critical breach
 * - all earlier-ordered families have already reached at least the same
 *   enablement state (no out-of-order production enablement).
 */
export function decideFamilyEnablement(
  from: L6FamilyEnablementState,
  to: L6FamilyEnablementState,
  ctx: L6FamilyEnablementContext,
): L6FamilyEnablementDecision {
  if (!isLegalTransition(from, to)) {
    return { ok: false, reason: `illegal_transition:${from}->${to}` };
  }
  if (stateRank(to) >= stateRank(L6FamilyEnablementState.CANARY_CURRENT)) {
    if (!ctx.certification_runtime_green_or_higher) {
      return { ok: false, reason: 'certification_not_runtime_green' };
    }
    if (!ctx.observability_ok) {
      return { ok: false, reason: 'observability_critical_breach' };
    }
    if (stateRank(ctx.earlier_families_at_least) < stateRank(to)) {
      return { ok: false, reason: 'earlier_families_not_at_target_state' };
    }
  }
  return { ok: true, reason: 'ok' };
}
