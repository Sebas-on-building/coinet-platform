/**
 * L9.3 — PostEventWindow Contract
 *
 * §9.3.6.3 — A post-event window must carry anchor, start/end,
 * class, state, and lineage. A post-shock or post-unlock sequence
 * state is illegal without an anchored post-event window where
 * required (§9.2.4.9 law).
 */

import type {
  L9PostEventWindowClass,
  L9PostEventWindowState,
} from './post-event-window';

export interface L9PostEventWindowContract {
  // Identity
  readonly post_event_window_id: string;
  readonly sequence_subject_id: string;

  // Contract versioning
  readonly post_event_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Window shape (§9.3.6.3)
  readonly anchor_event_ref: string;
  readonly window_class: L9PostEventWindowClass;
  readonly window_start: string;
  readonly window_end: string;
  readonly window_state: L9PostEventWindowState;

  // Outcomes
  readonly stabilization_refs: readonly string[];
  readonly failure_refs: readonly string[];

  // Lineage + replay
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export const L9_POST_EVENT_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'post_event_window_id', 'sequence_subject_id',
  'post_event_contract_version', 'schema_version', 'policy_version',
  'anchor_event_ref', 'window_class',
  'window_start', 'window_end', 'window_state',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];
