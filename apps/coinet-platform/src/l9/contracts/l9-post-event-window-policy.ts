/**
 * L9.5 — Post-Event Window Policy
 *
 * §9.5.9 — Post-event windows are first-class (§9.5.9.2). Without
 * anchor-bound law, digestion gets mistaken for failure, stabilization
 * for recovery, and reaccumulation attempts emit too early.
 */

import {
  L9PostEventWindowClass,
  L9PostEventWindowState,
} from './post-event-window';

/**
 * §9.5.9.4 — Semantic lifecycle state. Sits above the L9.3
 * `L9PostEventWindowState` banding and tells downstream engines which
 * governed behavior posture currently dominates.
 *
 * Mapping to the spec's recommended states:
 *   ACTIVE_SHOCK          — shock is still the dominant force
 *   DIGESTING             — digestion underway; not yet stabilized
 *   FAILED_CONTINUATION   — continuation attempt failed
 *   STABILIZING           — stabilization in progress
 *   REACCUMULATING        — typed reaccumulation attempt
 *   EXHAUSTED             — window has expired cleanly
 *   UNRESOLVED            — ambiguous lifecycle
 */
export enum L9PostEventLifecycle {
  ACTIVE_SHOCK = 'ACTIVE_SHOCK',
  DIGESTING = 'DIGESTING',
  FAILED_CONTINUATION = 'FAILED_CONTINUATION',
  STABILIZING = 'STABILIZING',
  REACCUMULATING = 'REACCUMULATING',
  EXHAUSTED = 'EXHAUSTED',
  UNRESOLVED = 'UNRESOLVED',
}

export const ALL_L9_POST_EVENT_LIFECYCLES:
  readonly L9PostEventLifecycle[] =
    Object.values(L9PostEventLifecycle);

/**
 * §9.5.9.5 — Anchor-event classes. Every post-event window must carry a
 * typed anchor from a registered class. Declared here so the policy,
 * validator, and audit all reference one vocabulary.
 */
export enum L9PostEventAnchorClass {
  UNLOCK = 'UNLOCK',
  LIQUIDATION = 'LIQUIDATION',
  NARRATIVE_BREAKOUT = 'NARRATIVE_BREAKOUT',
  SECURITY_EVENT = 'SECURITY_EVENT',
  CONTRADICTION_BUNDLE = 'CONTRADICTION_BUNDLE',
}

export const ALL_L9_POST_EVENT_ANCHOR_CLASSES:
  readonly L9PostEventAnchorClass[] =
    Object.values(L9PostEventAnchorClass);

/**
 * §9.5.9.3 — Legal anchor class for each window class. Any mismatch is
 * a semantic violation.
 */
export const L9_LEGAL_POST_EVENT_ANCHOR:
  Readonly<Record<L9PostEventWindowClass, L9PostEventAnchorClass>> = {
    [L9PostEventWindowClass.UNLOCK_DIGESTION]:
      L9PostEventAnchorClass.UNLOCK,
    [L9PostEventWindowClass.LIQUIDATION_DIGESTION]:
      L9PostEventAnchorClass.LIQUIDATION,
    [L9PostEventWindowClass.NARRATIVE_POST_BREAKOUT]:
      L9PostEventAnchorClass.NARRATIVE_BREAKOUT,
    [L9PostEventWindowClass.SECURITY_POST_SHOCK]:
      L9PostEventAnchorClass.SECURITY_EVENT,
    [L9PostEventWindowClass.CONTRADICTION_POST_SHOCK]:
      L9PostEventAnchorClass.CONTRADICTION_BUNDLE,
  };

/**
 * §9.5.9.4 — Legal lifecycle transitions. Any transition outside this
 * graph is illegal.
 */
export const L9_POST_EVENT_LIFECYCLE_TRANSITIONS:
  readonly (readonly [L9PostEventLifecycle, L9PostEventLifecycle])[] = [
    [L9PostEventLifecycle.ACTIVE_SHOCK, L9PostEventLifecycle.DIGESTING],
    [L9PostEventLifecycle.ACTIVE_SHOCK,
      L9PostEventLifecycle.FAILED_CONTINUATION],
    [L9PostEventLifecycle.DIGESTING, L9PostEventLifecycle.STABILIZING],
    [L9PostEventLifecycle.DIGESTING, L9PostEventLifecycle.FAILED_CONTINUATION],
    [L9PostEventLifecycle.DIGESTING, L9PostEventLifecycle.EXHAUSTED],
    [L9PostEventLifecycle.STABILIZING, L9PostEventLifecycle.REACCUMULATING],
    [L9PostEventLifecycle.STABILIZING, L9PostEventLifecycle.EXHAUSTED],
    [L9PostEventLifecycle.STABILIZING,
      L9PostEventLifecycle.FAILED_CONTINUATION],
    [L9PostEventLifecycle.REACCUMULATING, L9PostEventLifecycle.EXHAUSTED],
    [L9PostEventLifecycle.FAILED_CONTINUATION, L9PostEventLifecycle.EXHAUSTED],
    [L9PostEventLifecycle.UNRESOLVED, L9PostEventLifecycle.DIGESTING],
    [L9PostEventLifecycle.UNRESOLVED, L9PostEventLifecycle.FAILED_CONTINUATION],
    [L9PostEventLifecycle.UNRESOLVED, L9PostEventLifecycle.EXHAUSTED],
  ];

/** §9.5.9.4 — Is `from → to` a legal post-event lifecycle transition? */
export function isL9LegalPostEventLifecycleTransition(
  from: L9PostEventLifecycle,
  to: L9PostEventLifecycle,
): boolean {
  if (from === to) return true;
  return L9_POST_EVENT_LIFECYCLE_TRANSITIONS.some(
    ([a, b]) => a === from && b === to,
  );
}

/**
 * §9.5.9.5 — Look up the required anchor class for a window class.
 */
export function getL9RequiredPostEventAnchor(
  window_class: L9PostEventWindowClass,
): L9PostEventAnchorClass {
  return L9_LEGAL_POST_EVENT_ANCHOR[window_class];
}

/**
 * §9.5.9.6 — Map an L9.3 `L9PostEventWindowState` to an L9.5 lifecycle
 * posture where uniquely determined. Returns `UNRESOLVED` when the
 * mapping is not unique (caller must provide more evidence).
 */
export function l9PostEventStateToLifecycle(
  state: L9PostEventWindowState,
): L9PostEventLifecycle {
  switch (state) {
    case L9PostEventWindowState.ACTIVE: return L9PostEventLifecycle.ACTIVE_SHOCK;
    case L9PostEventWindowState.STABILIZING:
      return L9PostEventLifecycle.STABILIZING;
    case L9PostEventWindowState.STABILIZED:
      return L9PostEventLifecycle.EXHAUSTED;
    case L9PostEventWindowState.FAILED:
      return L9PostEventLifecycle.FAILED_CONTINUATION;
    case L9PostEventWindowState.EXPIRED:
      return L9PostEventLifecycle.EXHAUSTED;
  }
}

/**
 * §9.5.9.7 — Illegal post-event postures. Returns a list of reason
 * strings describing any violations found.
 */
export function scanL9IllegalPostEventPostures(input: {
  readonly window_class: L9PostEventWindowClass;
  readonly anchor_class: L9PostEventAnchorClass | null;
  readonly lifecycle: L9PostEventLifecycle;
  readonly claims_reaccumulation: boolean;
  readonly window_is_expired: boolean;
  readonly is_current_governor: boolean;
  readonly stabilization_refs_present: boolean;
  readonly claims_stabilization: boolean;
}): string[] {
  const out: string[] = [];
  const required = L9_LEGAL_POST_EVENT_ANCHOR[input.window_class];
  if (input.anchor_class === null) {
    out.push('POST_EVENT_ANCHOR_MISSING');
  } else if (input.anchor_class !== required) {
    out.push('POST_EVENT_ANCHOR_CLASS_MISMATCH');
  }
  if (input.claims_reaccumulation &&
      input.lifecycle === L9PostEventLifecycle.ACTIVE_SHOCK) {
    out.push('REACCUMULATION_CLAIM_UNDER_ACTIVE_SHOCK');
  }
  if (input.claims_stabilization && !input.stabilization_refs_present) {
    out.push('STABILIZATION_WITHOUT_SUPPORTING_REFS');
  }
  if (input.window_is_expired && input.is_current_governor) {
    out.push('EXPIRED_WINDOW_TREATED_AS_CURRENT_GOVERNOR');
  }
  return out;
}
