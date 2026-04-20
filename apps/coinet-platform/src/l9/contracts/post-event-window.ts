/**
 * L9.2 — PostEventWindow Contract
 *
 * §9.2.4.9 — Models behaviour after major events (unlock digestion,
 * liquidation shock, narrative breakout stabilization, security
 * aftermath). A post-shock or post-unlock sequence state is illegal
 * without an anchored post-event window where required (§9.2.4.9 law
 * + INV-9.2-B).
 */

/**
 * §9.2.4.9 — Frozen window classes.
 */
export enum L9PostEventWindowClass {
  UNLOCK_DIGESTION = 'UNLOCK_DIGESTION',
  LIQUIDATION_DIGESTION = 'LIQUIDATION_DIGESTION',
  NARRATIVE_POST_BREAKOUT = 'NARRATIVE_POST_BREAKOUT',
  SECURITY_POST_SHOCK = 'SECURITY_POST_SHOCK',
  CONTRADICTION_POST_SHOCK = 'CONTRADICTION_POST_SHOCK',
}

export const ALL_L9_POST_EVENT_WINDOW_CLASSES:
  readonly L9PostEventWindowClass[] =
    Object.values(L9PostEventWindowClass);

/**
 * §9.2.4.9 — Current state of the post-event window. Tells downstream
 * consumers whether the system has stabilized, failed, or is still
 * actively digesting.
 */
export enum L9PostEventWindowState {
  ACTIVE = 'ACTIVE',
  STABILIZING = 'STABILIZING',
  STABILIZED = 'STABILIZED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export const ALL_L9_POST_EVENT_WINDOW_STATES:
  readonly L9PostEventWindowState[] =
    Object.values(L9PostEventWindowState);

/**
 * §9.2.4.9 — The PostEventWindow object.
 */
export interface L9PostEventWindow {
  readonly post_event_window_id: string;
  readonly sequence_subject_id: string;
  readonly anchor_event_ref: string;
  readonly window_class: L9PostEventWindowClass;
  readonly window_start: string;
  readonly window_end: string;
  readonly window_state: L9PostEventWindowState;
  readonly stabilization_refs: readonly string[];
  readonly failure_refs: readonly string[];
  readonly lineage_refs: readonly string[];
}
