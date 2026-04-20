/**
 * L9.5 — Post-Event Window Registry
 *
 * §9.5.9 / §9.5.11.2 — Runtime registry wrapping the post-event window
 * policy. Anchor requirements, lifecycle transitions, and illegal
 * postures are all reached through one registry.
 */

import {
  L9PostEventWindowClass,
  L9PostEventWindowState,
} from '../contracts/post-event-window';
import {
  L9PostEventAnchorClass,
  L9PostEventLifecycle,
  L9_LEGAL_POST_EVENT_ANCHOR,
  L9_POST_EVENT_LIFECYCLE_TRANSITIONS,
  getL9RequiredPostEventAnchor,
  isL9LegalPostEventLifecycleTransition,
  l9PostEventStateToLifecycle,
  scanL9IllegalPostEventPostures,
} from '../contracts/l9-post-event-window-policy';

export class L9PostEventWindowRegistry {
  requiredAnchor(
    window_class: L9PostEventWindowClass,
  ): L9PostEventAnchorClass {
    return getL9RequiredPostEventAnchor(window_class);
  }

  isLegalLifecycleTransition(
    from: L9PostEventLifecycle, to: L9PostEventLifecycle,
  ): boolean {
    return isL9LegalPostEventLifecycleTransition(from, to);
  }

  stateToLifecycle(
    state: L9PostEventWindowState,
  ): L9PostEventLifecycle {
    return l9PostEventStateToLifecycle(state);
  }

  scanIllegalPostures(
    input: Parameters<typeof scanL9IllegalPostEventPostures>[0],
  ): string[] {
    return scanL9IllegalPostEventPostures(input);
  }

  allAnchorMappings(): Readonly<
    Record<L9PostEventWindowClass, L9PostEventAnchorClass>
  > {
    return L9_LEGAL_POST_EVENT_ANCHOR;
  }

  allLifecycleTransitions():
    readonly (readonly [L9PostEventLifecycle, L9PostEventLifecycle])[] {
    return L9_POST_EVENT_LIFECYCLE_TRANSITIONS;
  }
}

const defaultPostEventWindowRegistry = new L9PostEventWindowRegistry();

export function getDefaultL9PostEventWindowRegistry(): L9PostEventWindowRegistry {
  return defaultPostEventWindowRegistry;
}

export {
  getL9RequiredPostEventAnchor,
  isL9LegalPostEventLifecycleTransition,
  l9PostEventStateToLifecycle,
  scanL9IllegalPostEventPostures,
};
