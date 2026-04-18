/**
 * L7.8 — Family Enable / Disable Policy
 *
 * §7.8.4.2 Band H, §7.8.7.4 — Family rollout and enablement law for
 * Layer 7 validation families. A family may only advance to PRODUCTION
 * when:
 *
 *   • the transition is legal in the enablement state graph
 *   • certification is at least RUNTIME_GREEN
 *   • observability report has no critical breach
 *   • prerequisite families have already reached at least the same
 *     enablement state (§7.8.5.2 INV-7.8-B)
 */

import { L7ValidationFamilyId } from '../contracts/validation-family-definition';
import { L7CertificationLevel, levelIsAtLeast } from '../certification/l7-certification-level';

export enum L7FamilyEnablementState {
  DISABLED = 'DISABLED',
  DRY_RUN = 'DRY_RUN',
  HISTORICAL_ONLY = 'HISTORICAL_ONLY',
  SHADOW_CURRENT = 'SHADOW_CURRENT',
  CANARY_CURRENT = 'CANARY_CURRENT',
  PRODUCTION = 'PRODUCTION',
  FROZEN = 'FROZEN',
}

export const ALL_L7_FAMILY_ENABLEMENT_STATES: readonly L7FamilyEnablementState[] =
  Object.values(L7FamilyEnablementState);

/**
 * §7.8.4.2 Band H — Legal forward rollout order of L7 validation
 * families. Reaches PRODUCTION in the stated order; CROSS_DOMAIN_ALIGNMENT
 * necessarily enables last because it depends on its constituents.
 */
export const L7_FAMILY_ENABLEMENT_ORDER: readonly L7ValidationFamilyId[] =
  Object.freeze([
    L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    L7ValidationFamilyId.DERIVATIVES_CONTRADICTION_VALIDATION,
    L7ValidationFamilyId.PROTOCOL_SUBSTANCE_VALIDATION,
    L7ValidationFamilyId.NARRATIVE_VALIDATION,
    L7ValidationFamilyId.ACCUMULATION_VALIDATION,
    L7ValidationFamilyId.RISK_OVERHANG_VALIDATION,
    L7ValidationFamilyId.CROSS_DOMAIN_ALIGNMENT_VALIDATION,
  ]);

const LEGAL_FORWARD_TRANSITIONS: Readonly<
  Record<L7FamilyEnablementState, readonly L7FamilyEnablementState[]>
> = Object.freeze({
  [L7FamilyEnablementState.DISABLED]: [L7FamilyEnablementState.DRY_RUN],
  [L7FamilyEnablementState.DRY_RUN]: [
    L7FamilyEnablementState.HISTORICAL_ONLY,
    L7FamilyEnablementState.DISABLED,
  ],
  [L7FamilyEnablementState.HISTORICAL_ONLY]: [
    L7FamilyEnablementState.SHADOW_CURRENT,
    L7FamilyEnablementState.DRY_RUN,
    L7FamilyEnablementState.DISABLED,
  ],
  [L7FamilyEnablementState.SHADOW_CURRENT]: [
    L7FamilyEnablementState.CANARY_CURRENT,
    L7FamilyEnablementState.HISTORICAL_ONLY,
    L7FamilyEnablementState.DISABLED,
  ],
  [L7FamilyEnablementState.CANARY_CURRENT]: [
    L7FamilyEnablementState.PRODUCTION,
    L7FamilyEnablementState.SHADOW_CURRENT,
    L7FamilyEnablementState.DISABLED,
  ],
  [L7FamilyEnablementState.PRODUCTION]: [
    L7FamilyEnablementState.FROZEN,
    L7FamilyEnablementState.CANARY_CURRENT,
    L7FamilyEnablementState.DISABLED,
  ],
  [L7FamilyEnablementState.FROZEN]: [
    L7FamilyEnablementState.PRODUCTION,
    L7FamilyEnablementState.DISABLED,
  ],
});

export function isL7FamilyTransitionLegal(
  from: L7FamilyEnablementState,
  to: L7FamilyEnablementState,
): boolean {
  return LEGAL_FORWARD_TRANSITIONS[from].includes(to);
}

const STATE_ORDER: readonly L7FamilyEnablementState[] = [
  L7FamilyEnablementState.DISABLED,
  L7FamilyEnablementState.DRY_RUN,
  L7FamilyEnablementState.HISTORICAL_ONLY,
  L7FamilyEnablementState.SHADOW_CURRENT,
  L7FamilyEnablementState.CANARY_CURRENT,
  L7FamilyEnablementState.PRODUCTION,
  L7FamilyEnablementState.FROZEN,
];

function stateRank(s: L7FamilyEnablementState): number {
  return STATE_ORDER.indexOf(s);
}

export interface L7FamilyEnablementContext {
  readonly family: L7ValidationFamilyId;
  readonly certification_level: L7CertificationLevel;
  readonly observability_ok: boolean;
  /**
   * The minimum enablement state of prerequisite families (§7.8.7.4).
   * For the first family in `L7_FAMILY_ENABLEMENT_ORDER`, callers may
   * pass `PRODUCTION` to indicate "no prerequisite".
   */
  readonly prerequisite_families_at_least: L7FamilyEnablementState;
}

export interface L7FamilyEnablementDecision {
  readonly ok: boolean;
  readonly reason: string;
}

export function decideL7FamilyEnablement(
  from: L7FamilyEnablementState,
  to: L7FamilyEnablementState,
  ctx: L7FamilyEnablementContext,
): L7FamilyEnablementDecision {
  if (!isL7FamilyTransitionLegal(from, to)) {
    return { ok: false, reason: `illegal_transition:${from}->${to}` };
  }
  if (stateRank(to) >= stateRank(L7FamilyEnablementState.CANARY_CURRENT)) {
    if (!levelIsAtLeast(ctx.certification_level, L7CertificationLevel.RUNTIME_GREEN)) {
      return { ok: false, reason: `certification_level_below_runtime_green:${ctx.certification_level}` };
    }
    if (!ctx.observability_ok) {
      return { ok: false, reason: 'observability_critical_breach' };
    }
    if (stateRank(ctx.prerequisite_families_at_least) < stateRank(to)) {
      return { ok: false, reason: 'prerequisite_families_not_at_target_state' };
    }
  }
  if (to === L7FamilyEnablementState.PRODUCTION &&
      ctx.family === L7ValidationFamilyId.CROSS_DOMAIN_ALIGNMENT_VALIDATION) {
    if (!levelIsAtLeast(ctx.certification_level, L7CertificationLevel.PRODUCTION_GREEN)) {
      return { ok: false, reason: 'cross_domain_requires_production_green' };
    }
  }
  return { ok: true, reason: 'ok' };
}
