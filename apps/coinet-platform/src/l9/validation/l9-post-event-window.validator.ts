/**
 * L9.5 — Post-Event Window Validator
 *
 * §9.5.9 — Enforces anchor-binding, legal lifecycle transitions, and
 * illegal post-event postures.
 */

import {
  L9PostEventWindow,
} from '../contracts/post-event-window';
import {
  L9PostEventAnchorClass,
  L9PostEventLifecycle,
  L9_LEGAL_POST_EVENT_ANCHOR,
  isL9LegalPostEventLifecycleTransition,
  l9PostEventStateToLifecycle,
  scanL9IllegalPostEventPostures,
} from '../contracts/l9-post-event-window-policy';
import { L9TemporalSemanticTier } from '../contracts/l9-temporal-semantics-types';
import {
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
  violation,
} from './l9-temporal-semantic-violation-codes';

export interface L9PostEventWindowValidationInput {
  readonly window: L9PostEventWindow;
  readonly declared_anchor_class: L9PostEventAnchorClass | null;
  readonly prior_lifecycle?: L9PostEventLifecycle;
  readonly declared_lifecycle?: L9PostEventLifecycle;
  readonly claims_reaccumulation?: boolean;
  readonly claims_stabilization?: boolean;
  readonly is_current_governor?: boolean;
}

export interface L9PostEventWindowValidationResult {
  readonly ok: boolean;
  readonly derived_lifecycle: L9PostEventLifecycle;
  readonly violations: readonly L9TemporalSemanticViolation[];
}

export function validateL9PostEventWindow(
  input: L9PostEventWindowValidationInput,
): L9PostEventWindowValidationResult {
  const violations: L9TemporalSemanticViolation[] = [];
  const w = input.window;

  if (!w.anchor_event_ref) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.PE_ANCHOR_MISSING,
      L9TemporalSemanticTier.POST_EVENT,
      `post-event window ${w.window_class} missing anchor_event_ref`,
    ));
  }

  const required = L9_LEGAL_POST_EVENT_ANCHOR[w.window_class];
  if (input.declared_anchor_class === null) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.PE_ANCHOR_MISSING,
      L9TemporalSemanticTier.POST_EVENT,
      `post-event window ${w.window_class} missing anchor class declaration`,
    ));
  } else if (input.declared_anchor_class !== required) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.PE_ANCHOR_CLASS_MISMATCH,
      L9TemporalSemanticTier.POST_EVENT,
      `anchor class ${input.declared_anchor_class} mismatches required ${required} for ${w.window_class}`,
    ));
  }

  if (!w.window_start || !w.window_end) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.PE_WINDOW_BOUNDS_MISSING,
      L9TemporalSemanticTier.POST_EVENT,
      `post-event window ${w.window_class} missing explicit bounds`,
    ));
  }

  const derivedLifecycle = l9PostEventStateToLifecycle(w.window_state);
  if (input.prior_lifecycle &&
      !isL9LegalPostEventLifecycleTransition(
        input.prior_lifecycle,
        input.declared_lifecycle ?? derivedLifecycle,
      )) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.PE_LIFECYCLE_TRANSITION_ILLEGAL,
      L9TemporalSemanticTier.POST_EVENT,
      `illegal lifecycle transition ${input.prior_lifecycle}→${input.declared_lifecycle ?? derivedLifecycle}`,
    ));
  }

  const postures = scanL9IllegalPostEventPostures({
    window_class: w.window_class,
    anchor_class: input.declared_anchor_class,
    lifecycle: input.declared_lifecycle ?? derivedLifecycle,
    claims_reaccumulation: input.claims_reaccumulation ?? false,
    window_is_expired:
      (input.declared_lifecycle ?? derivedLifecycle) ===
        L9PostEventLifecycle.EXHAUSTED,
    is_current_governor: input.is_current_governor ?? false,
    stabilization_refs_present: (w.stabilization_refs?.length ?? 0) > 0,
    claims_stabilization: input.claims_stabilization ?? false,
  });
  for (const reason of postures) {
    switch (reason) {
      case 'POST_EVENT_ANCHOR_MISSING':
        // already reported above
        break;
      case 'POST_EVENT_ANCHOR_CLASS_MISMATCH':
        // already reported above
        break;
      case 'REACCUMULATION_CLAIM_UNDER_ACTIVE_SHOCK':
        violations.push(violation(
          L9TemporalSemanticViolationCode.PE_REACCUMULATION_UNDER_ACTIVE_SHOCK,
          L9TemporalSemanticTier.POST_EVENT,
          'reaccumulation claimed while post-event window is in ACTIVE_SHOCK',
        ));
        break;
      case 'STABILIZATION_WITHOUT_SUPPORTING_REFS':
        violations.push(violation(
          L9TemporalSemanticViolationCode.PE_STABILIZATION_WITHOUT_REFS,
          L9TemporalSemanticTier.POST_EVENT,
          'stabilization claimed without supporting refs',
        ));
        break;
      case 'EXPIRED_WINDOW_TREATED_AS_CURRENT_GOVERNOR':
        violations.push(violation(
          L9TemporalSemanticViolationCode.PE_EXPIRED_WINDOW_AS_GOVERNOR,
          L9TemporalSemanticTier.POST_EVENT,
          'expired post-event window is being treated as current governor',
        ));
        break;
    }
  }

  return {
    ok: violations.length === 0,
    derived_lifecycle: derivedLifecycle,
    violations,
  };
}
