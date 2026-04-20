/**
 * L9.5 — Temporal-Semantics Invariants
 *
 * §9.5.12.1 — INV-9.5-A through INV-9.5-G, all executable and covered
 * by the L9.5 certification suite.
 *
 *   INV-9.5-A : Time-surface distinction — all 11 surfaces are named,
 *               required `as_of` and collapse scan reject missing
 *               surfaces, illegal-for-purpose surfaces reject.
 *   INV-9.5-B : Lead-lag law — legal family/spacing/lineage pass;
 *               outside-window lag, scope mismatch, missing lineage,
 *               undervoided decisive contradiction, causality laundering,
 *               and late-marked-as-early are all rejected.
 *   INV-9.5-C : Phase progression — legal transitions pass; illegal
 *               jumps, missing change-point justifications, missing
 *               shock anchors, and non-adjacent ambiguity claims reject.
 *   INV-9.5-D : Decay law — decay composed from factor contributions
 *               is in range; dominance banding matches score; illegal
 *               postures reject (zero-under-contradiction, still-early-
 *               while-decayed, staleness substitution).
 *   INV-9.5-E : Post-event window — anchor and bounds required; anchor
 *               class must match window class; illegal lifecycle
 *               transitions and expired-as-governor reject.
 *   INV-9.5-F : Ambiguity explicit — the interaction validator rejects
 *               clean output under declared ambiguity, and the phase
 *               validator rejects hidden secondary phase.
 *   INV-9.5-G : Replay-safe determinism — running the same inputs
 *               through every L9.5 pure classifier (semantic lag,
 *               dominance, materiality, lifecycle) yields identical
 *               outputs across repeated calls.
 */

import {
  L9TemporalComparisonPurpose,
  L9TemporalSurface,
} from '../contracts/l9-temporal-surfaces';
import {
  L9SemanticAmbiguityPosture,
} from '../contracts/l9-temporal-semantics-types';
import { L9WindowClass } from '../contracts/l9-window-policy';
import { L9SequenceFamily } from '../contracts/sequence-family';
import {
  L9LagContradictionPosture,
  L9LagSupportStrength,
  L9LeadLagRelation,
} from '../contracts/lead-lag-relation';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
  classifyL9SemanticLag,
} from '../contracts/l9-lead-lag-policy';
import { L9PhaseClass } from '../contracts/phase-state';
import {
  L9ChangePoint,
  L9ChangePointClass,
  L9ChangePointSeverity,
} from '../contracts/change-point';
import {
  L9ChangePointTriggerFamily,
  classifyL9ChangePointMateriality,
} from '../contracts/l9-change-point-policy';
import {
  L9DecayClass,
  L9DecayProfile,
} from '../contracts/decay-profile';
import {
  L9DecayDominance,
  L9DecayFactor,
  classifyL9DecayDominance,
  composeL9DecayScore,
} from '../contracts/l9-decay-policy';
import {
  L9PostEventWindow,
  L9PostEventWindowClass,
  L9PostEventWindowState,
} from '../contracts/post-event-window';
import {
  L9PostEventAnchorClass,
  L9PostEventLifecycle,
  l9PostEventStateToLifecycle,
} from '../contracts/l9-post-event-window-policy';

import {
  L9TemporalSemanticViolationCode,
} from '../validation/l9-temporal-semantic-violation-codes';
import {
  validateL9TemporalSurfaces,
} from '../validation/l9-temporal-surface.validator';
import {
  validateL9LeadLag,
} from '../validation/l9-lead-lag.validator';
import {
  validateL9PhaseTransition,
} from '../validation/l9-phase-progression.validator';
import {
  validateL9ChangePoint,
} from '../validation/l9-change-point.validator';
import {
  validateL9Decay,
} from '../validation/l9-decay.validator';
import {
  validateL9PostEventWindow,
} from '../validation/l9-post-event-window.validator';
import {
  validateL9TemporalInteraction,
} from '../validation/l9-temporal-interaction.validator';

export interface L9_5InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

const ISO_GREEN = {
  observed: '2026-04-10T12:00:00.000Z',
  ingested: '2026-04-10T12:00:30.000Z',
  as_of: '2026-04-10T12:01:00.000Z',
  effective: '2026-04-10T12:01:00.000Z',
  lead: '2026-04-10T12:00:00.000Z',
  lag: '2026-04-10T12:02:00.000Z',
  cp: '2026-04-10T12:01:30.000Z',
  winStart: '2026-04-10T12:00:00.000Z',
  winEnd: '2026-04-10T12:10:00.000Z',
  peStart: '2026-04-10T12:01:00.000Z',
  peEnd: '2026-04-10T14:00:00.000Z',
};

function codeSet(vs: readonly { code: L9TemporalSemanticViolationCode }[]):
  ReadonlySet<L9TemporalSemanticViolationCode> {
  return new Set(vs.map(v => v.code));
}

// ────────────────────────────────────────────────────────────────
// INV-9.5-A — Time-surface distinction
// ────────────────────────────────────────────────────────────────
export function checkINV_95_A(): L9_5InvariantResult {
  const green = validateL9TemporalSurfaces({
    reading: {
      observed_at: ISO_GREEN.observed,
      ingested_at: ISO_GREEN.ingested,
      as_of: ISO_GREEN.as_of,
      effective_at: ISO_GREEN.effective,
      sequence_window_start: ISO_GREEN.winStart,
      sequence_window_end: ISO_GREEN.winEnd,
      lead_signal_at: ISO_GREEN.lead,
      lag_signal_at: ISO_GREEN.lag,
      change_point_at: ISO_GREEN.cp,
      post_event_window_start: ISO_GREEN.peStart,
      post_event_window_end: ISO_GREEN.peEnd,
    },
    declared_purposes: [L9TemporalComparisonPurpose.LEAD_LAG_SPACING],
    surface_usage: {
      [L9TemporalComparisonPurpose.LEAD_LAG_SPACING]:
        L9TemporalSurface.OBSERVED_AT,
    },
  });

  const missingAsOf = validateL9TemporalSurfaces({
    reading: {
      observed_at: ISO_GREEN.observed, ingested_at: ISO_GREEN.ingested,
      as_of: '' as unknown as string, effective_at: null,
      sequence_window_start: null, sequence_window_end: null,
      lead_signal_at: null, lag_signal_at: null, change_point_at: null,
      post_event_window_start: null, post_event_window_end: null,
    },
    declared_purposes: [],
  });

  const illegalForPurpose = validateL9TemporalSurfaces({
    reading: {
      observed_at: ISO_GREEN.observed, ingested_at: ISO_GREEN.ingested,
      as_of: ISO_GREEN.as_of, effective_at: ISO_GREEN.effective,
      sequence_window_start: null, sequence_window_end: null,
      lead_signal_at: null, lag_signal_at: null, change_point_at: null,
      post_event_window_start: null, post_event_window_end: null,
    },
    declared_purposes: [L9TemporalComparisonPurpose.LEAD_LAG_SPACING],
    surface_usage: {
      [L9TemporalComparisonPurpose.LEAD_LAG_SPACING]:
        L9TemporalSurface.INGESTED_AT,
    },
  });

  const halfBoundedPE = validateL9TemporalSurfaces({
    reading: {
      observed_at: ISO_GREEN.observed, ingested_at: ISO_GREEN.ingested,
      as_of: ISO_GREEN.as_of, effective_at: ISO_GREEN.effective,
      sequence_window_start: null, sequence_window_end: null,
      lead_signal_at: null, lag_signal_at: null, change_point_at: null,
      post_event_window_start: ISO_GREEN.peStart,
      post_event_window_end: null,
    },
    declared_purposes: [],
  });

  const holds = green.ok &&
    codeSet(missingAsOf.violations).has(
      L9TemporalSemanticViolationCode.TS_AS_OF_MISSING) &&
    codeSet(illegalForPurpose.violations).has(
      L9TemporalSemanticViolationCode
        .TS_SURFACE_ILLEGAL_FOR_PURPOSE) &&
    codeSet(halfBoundedPE.violations).has(
      L9TemporalSemanticViolationCode.TS_POST_EVENT_HALF_BOUNDED);

  return {
    id: 'INV-9.5-A',
    name: 'Time-surface distinction',
    holds,
    evidence: `green.ok=${green.ok} asOf=${missingAsOf.ok === false}` +
      ` illegalPurpose=${illegalForPurpose.ok === false}` +
      ` halfPE=${halfBoundedPE.ok === false}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.5-B — Lead-lag law
// ────────────────────────────────────────────────────────────────
function mkRelation(overrides: Partial<L9LeadLagRelation> = {})
  : L9LeadLagRelation {
  return {
    lead_lag_id: 'LL-1',
    sequence_subject_id: 'S-1',
    leading_signal_ref: 'SIG-lead',
    lagging_signal_ref: 'SIG-lag',
    lag_duration_ms: 120_000,
    lag_class: 'NORMAL' as never,
    support_strength: L9LagSupportStrength.MODERATE_SUPPORT,
    contradiction_posture: L9LagContradictionPosture.NONE,
    decay_adjustment: 0.1,
    historical_reliability: 0.7,
    causal_restraint: {
      treated_as_temporal_only: true,
      causal_inference_disclaimer: 'lead-lag is temporal ordering only',
    },
    lineage_refs: ['TRACE-1'],
    ...overrides,
  };
}

export function checkINV_95_B(): L9_5InvariantResult {
  const fam = L9SequenceFamily.ACCUMULATION_TO_EXPANSION;

  const green = validateL9LeadLag({
    family: fam, relation: mkRelation(), scope_aligned: true,
  });

  const outsideWindow = validateL9LeadLag({
    family: fam,
    relation: mkRelation({ lag_duration_ms: 365 * 24 * 60 * 60_000 }),
    scope_aligned: true,
  });

  const scopeMismatch = validateL9LeadLag({
    family: fam, relation: mkRelation(), scope_aligned: false,
  });

  const lineageMissing = validateL9LeadLag({
    family: fam, relation: mkRelation({ lineage_refs: [] }),
    scope_aligned: true,
  });

  const decisiveContradictionNotVoided = validateL9LeadLag({
    family: fam,
    relation: mkRelation({
      contradiction_posture: L9LagContradictionPosture.DECISIVE,
    }),
    scope_aligned: true,
    declared_quality_class: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
  });

  const causalLaundering = validateL9LeadLag({
    family: fam,
    relation: mkRelation({
      causal_restraint: {
        treated_as_temporal_only: true,
        causal_inference_disclaimer:
          'temporal causal proof — inevitable lead-lag',
      },
    }),
    scope_aligned: true,
  });

  const lateAsEarly = validateL9LeadLag({
    family: fam,
    relation: mkRelation({
      lag_duration_ms: 10 * 24 * 60 * 60_000, // 10d — TOO_LATE for ACC_TO_EXP
    }),
    scope_aligned: true,
    declared_early_confirmation: true,
  });

  const holds = green.ok &&
    codeSet(outsideWindow.violations).has(
      L9TemporalSemanticViolationCode.LL_LAG_OUTSIDE_ADMISSIBLE_WINDOW) &&
    codeSet(scopeMismatch.violations).has(
      L9TemporalSemanticViolationCode.LL_SCOPE_MISMATCH) &&
    codeSet(lineageMissing.violations).has(
      L9TemporalSemanticViolationCode.LL_LINEAGE_INCOMPLETE) &&
    codeSet(decisiveContradictionNotVoided.violations).has(
      L9TemporalSemanticViolationCode
        .LL_DECISIVE_CONTRADICTION_NOT_VOIDED) &&
    codeSet(causalLaundering.violations).has(
      L9TemporalSemanticViolationCode.LL_CAUSAL_INFERENCE_LAUNDERED) &&
    codeSet(lateAsEarly.violations).has(
      L9TemporalSemanticViolationCode
        .LL_LATE_MARKED_AS_EARLY_CONFIRMATION);

  return {
    id: 'INV-9.5-B',
    name: 'Lead-lag law',
    holds,
    evidence:
      `green=${green.ok} outside=${!outsideWindow.ok}` +
      ` scope=${!scopeMismatch.ok} lineage=${!lineageMissing.ok}` +
      ` decisive=${!decisiveContradictionNotVoided.ok}` +
      ` causal=${!causalLaundering.ok} lateEarly=${!lateAsEarly.ok}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.5-C — Phase progression law
// ────────────────────────────────────────────────────────────────
export function checkINV_95_C(): L9_5InvariantResult {
  const green = validateL9PhaseTransition({
    from_phase: L9PhaseClass.VALIDATED,
    to_phase: L9PhaseClass.EXPANSION,
    change_point_ref: null,
    shock_anchor_ref: null,
    recovery_posture_ref: null,
  });

  const illegal = validateL9PhaseTransition({
    from_phase: L9PhaseClass.DISCOVERY,
    to_phase: L9PhaseClass.REFLEXIVE_LATE,
    change_point_ref: null,
    shock_anchor_ref: null,
    recovery_posture_ref: null,
  });

  const missingCP = validateL9PhaseTransition({
    from_phase: L9PhaseClass.EXPANSION,
    to_phase: L9PhaseClass.DECAYING,
    change_point_ref: null,
    shock_anchor_ref: null,
    recovery_posture_ref: null,
  });

  const missingShock = validateL9PhaseTransition({
    from_phase: L9PhaseClass.EXPANSION,
    to_phase: L9PhaseClass.SHOCK_RESPONSE,
    change_point_ref: null,
    shock_anchor_ref: null,
    recovery_posture_ref: null,
  });

  const nonAdjacent = validateL9PhaseTransition({
    from_phase: L9PhaseClass.VALIDATED,
    to_phase: L9PhaseClass.EXPANSION,
    change_point_ref: null,
    shock_anchor_ref: null,
    recovery_posture_ref: null,
    ambiguity_secondary_phase: L9PhaseClass.REFLEXIVE_LATE,
  });

  const hiddenAmbiguity = validateL9PhaseTransition({
    from_phase: L9PhaseClass.VALIDATED,
    to_phase: L9PhaseClass.EXPANSION,
    change_point_ref: null,
    shock_anchor_ref: null,
    recovery_posture_ref: null,
    ambiguity_secondary_phase: L9PhaseClass.CROWDING,
    declared_clean_single_phase: true,
  });

  const holds = green.ok &&
    codeSet(illegal.violations).has(
      L9TemporalSemanticViolationCode.PHASE_TRANSITION_ILLEGAL) &&
    codeSet(missingCP.violations).has(
      L9TemporalSemanticViolationCode
        .PHASE_TRANSITION_MISSING_CHANGE_POINT) &&
    codeSet(missingShock.violations).has(
      L9TemporalSemanticViolationCode
        .PHASE_TRANSITION_MISSING_SHOCK_ANCHOR) &&
    codeSet(nonAdjacent.violations).has(
      L9TemporalSemanticViolationCode.PHASE_NON_ADJACENT_CLAIM) &&
    codeSet(hiddenAmbiguity.violations).has(
      L9TemporalSemanticViolationCode.PHASE_AMBIGUITY_COLLAPSED);

  return {
    id: 'INV-9.5-C',
    name: 'Phase progression law',
    holds,
    evidence:
      `green=${green.ok} illegal=${!illegal.ok}` +
      ` cp=${!missingCP.ok} shock=${!missingShock.ok}` +
      ` nonAdj=${!nonAdjacent.ok} hiddenAmb=${!hiddenAmbiguity.ok}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.5-D — Decay law
// ────────────────────────────────────────────────────────────────
function mkDecayProfile(overrides: Partial<L9DecayProfile> = {})
  : L9DecayProfile {
  return {
    decay_profile_id: 'D-1',
    sequence_subject_id: 'S-1',
    decay_score: 0.1,
    decay_class: L9DecayClass.FRESH,
    decaying_signal_refs: [],
    surviving_signal_refs: ['SIG-1'],
    decay_reason_codes: [],
    time_burden_ms: 60_000,
    lineage_refs: ['TRACE-1'],
    ...overrides,
  };
}

export function checkINV_95_D(): L9_5InvariantResult {
  const green = validateL9Decay({
    profile: mkDecayProfile(),
    contributions: { [L9DecayFactor.TIME_ELAPSED]: 0.1 },
    declared_dominance: L9DecayDominance.LOW_DECAY,
  });

  const outOfRange = validateL9Decay({
    profile: mkDecayProfile({ decay_score: 1.7 }),
    contributions: {},
  });

  const zeroUnderContradiction = validateL9Decay({
    profile: mkDecayProfile({ decay_score: 0.05 }),
    contributions: { [L9DecayFactor.CONTRADICTION_BURDEN]: 0.8 },
    has_dominant_contradiction: true,
  });

  const stillEarlyDecayed = validateL9Decay({
    profile: mkDecayProfile({
      decay_score: 0.7, decay_class: L9DecayClass.DECAYING,
    }),
    contributions: { [L9DecayFactor.TIME_ELAPSED]: 0.8 },
    claims_still_early: true,
  });

  const recoveryUnderShock = validateL9Decay({
    profile: mkDecayProfile({
      decay_score: 0.2, decay_class: L9DecayClass.AGING,
    }),
    contributions: {},
    post_event_shock_still_dominant: true,
    claims_recovery: true,
  });

  const stalenessSubstituted = validateL9Decay({
    profile: mkDecayProfile(),
    contributions: {},
    staleness_substituted_for_decay: true,
  });

  const dominanceMismatch = validateL9Decay({
    profile: mkDecayProfile({
      decay_score: 0.8, decay_class: L9DecayClass.DEPRECATED,
    }),
    contributions: {},
    declared_dominance: L9DecayDominance.LOW_DECAY,
  });

  const holds = green.ok &&
    codeSet(outOfRange.violations).has(
      L9TemporalSemanticViolationCode.DECAY_SCORE_OUT_OF_RANGE) &&
    codeSet(zeroUnderContradiction.violations).has(
      L9TemporalSemanticViolationCode
        .DECAY_ZERO_UNDER_DOMINANT_CONTRADICTION) &&
    codeSet(stillEarlyDecayed.violations).has(
      L9TemporalSemanticViolationCode
        .DECAY_STILL_EARLY_WHILE_MATERIALLY_DECAYED) &&
    codeSet(recoveryUnderShock.violations).has(
      L9TemporalSemanticViolationCode
        .DECAY_RECOVERY_CLAIM_WHILE_SHOCK_DOMINANT) &&
    codeSet(stalenessSubstituted.violations).has(
      L9TemporalSemanticViolationCode.DECAY_STALENESS_SUBSTITUTED) &&
    codeSet(dominanceMismatch.violations).has(
      L9TemporalSemanticViolationCode.DECAY_DOMINANCE_CLASS_MISMATCH);

  return {
    id: 'INV-9.5-D',
    name: 'Decay law',
    holds,
    evidence:
      `green=${green.ok} oor=${!outOfRange.ok}` +
      ` zeroContra=${!zeroUnderContradiction.ok}` +
      ` stillEarly=${!stillEarlyDecayed.ok}` +
      ` recShock=${!recoveryUnderShock.ok}` +
      ` stale=${!stalenessSubstituted.ok}` +
      ` dominance=${!dominanceMismatch.ok}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.5-E — Post-event window law
// ────────────────────────────────────────────────────────────────
function mkPEWindow(overrides: Partial<L9PostEventWindow> = {})
  : L9PostEventWindow {
  return {
    post_event_window_id: 'PE-1',
    sequence_subject_id: 'S-1',
    anchor_event_ref: 'EVT-unlock-1',
    window_class: L9PostEventWindowClass.UNLOCK_DIGESTION,
    window_start: ISO_GREEN.peStart,
    window_end: ISO_GREEN.peEnd,
    window_state: L9PostEventWindowState.STABILIZING,
    stabilization_refs: ['EVT-stable-1'],
    failure_refs: [],
    lineage_refs: ['TRACE-1'],
    ...overrides,
  };
}

export function checkINV_95_E(): L9_5InvariantResult {
  const green = validateL9PostEventWindow({
    window: mkPEWindow(),
    declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
    declared_lifecycle: L9PostEventLifecycle.STABILIZING,
    claims_stabilization: true,
  });

  const anchorMissing = validateL9PostEventWindow({
    window: mkPEWindow({ anchor_event_ref: '' }),
    declared_anchor_class: null,
  });

  const anchorClassMismatch = validateL9PostEventWindow({
    window: mkPEWindow(),
    declared_anchor_class: L9PostEventAnchorClass.LIQUIDATION,
  });

  const illegalLifecycle = validateL9PostEventWindow({
    window: mkPEWindow(),
    declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
    prior_lifecycle: L9PostEventLifecycle.EXHAUSTED,
    declared_lifecycle: L9PostEventLifecycle.ACTIVE_SHOCK,
  });

  const reaccumUnderShock = validateL9PostEventWindow({
    window: mkPEWindow({ window_state: L9PostEventWindowState.ACTIVE }),
    declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
    declared_lifecycle: L9PostEventLifecycle.ACTIVE_SHOCK,
    claims_reaccumulation: true,
  });

  const expiredGovernor = validateL9PostEventWindow({
    window: mkPEWindow({ window_state: L9PostEventWindowState.EXPIRED }),
    declared_anchor_class: L9PostEventAnchorClass.UNLOCK,
    declared_lifecycle: L9PostEventLifecycle.EXHAUSTED,
    is_current_governor: true,
  });

  const holds = green.ok &&
    codeSet(anchorMissing.violations).has(
      L9TemporalSemanticViolationCode.PE_ANCHOR_MISSING) &&
    codeSet(anchorClassMismatch.violations).has(
      L9TemporalSemanticViolationCode.PE_ANCHOR_CLASS_MISMATCH) &&
    codeSet(illegalLifecycle.violations).has(
      L9TemporalSemanticViolationCode
        .PE_LIFECYCLE_TRANSITION_ILLEGAL) &&
    codeSet(reaccumUnderShock.violations).has(
      L9TemporalSemanticViolationCode
        .PE_REACCUMULATION_UNDER_ACTIVE_SHOCK) &&
    codeSet(expiredGovernor.violations).has(
      L9TemporalSemanticViolationCode.PE_EXPIRED_WINDOW_AS_GOVERNOR);

  return {
    id: 'INV-9.5-E',
    name: 'Post-event window law',
    holds,
    evidence:
      `green=${green.ok} anchor=${!anchorMissing.ok}` +
      ` mismatch=${!anchorClassMismatch.ok}` +
      ` lifecycle=${!illegalLifecycle.ok}` +
      ` reaccum=${!reaccumUnderShock.ok}` +
      ` expired=${!expiredGovernor.ok}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.5-F — Ambiguity explicit
// ────────────────────────────────────────────────────────────────
export function checkINV_95_F(): L9_5InvariantResult {
  const cleanOutputOk = validateL9TemporalInteraction({
    phase_from: L9PhaseClass.VALIDATED,
    phase_to: L9PhaseClass.EXPANSION,
    change_point_ref: null,
    shock_anchor_ref: null,
    recovery_posture_ref: null,
    dominant_lag_class: L9SemanticLagClass.SHORT_LAG,
    dominant_lag_quality: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
    decay_dominance: L9DecayDominance.LOW_DECAY,
    post_event_lifecycle: null,
    post_event_anchor_present: false,
    declared_clean_output: true,
    ambiguity_posture: L9SemanticAmbiguityPosture.NONE,
  });

  const hiddenAmbiguity = validateL9TemporalInteraction({
    phase_from: L9PhaseClass.VALIDATED,
    phase_to: L9PhaseClass.EXPANSION,
    change_point_ref: null,
    shock_anchor_ref: null,
    recovery_posture_ref: null,
    dominant_lag_class: L9SemanticLagClass.SHORT_LAG,
    dominant_lag_quality: L9LeadLagQualityClass.WEAK_BUT_USABLE,
    decay_dominance: L9DecayDominance.LOW_DECAY,
    post_event_lifecycle: null,
    post_event_anchor_present: false,
    declared_clean_output: true,
    ambiguity_posture: L9SemanticAmbiguityPosture.DUAL_PHASE,
  });

  const lateAsValidation = validateL9TemporalInteraction({
    phase_from: L9PhaseClass.CONFIRMING,
    phase_to: L9PhaseClass.VALIDATED,
    change_point_ref: null,
    shock_anchor_ref: null,
    recovery_posture_ref: null,
    dominant_lag_class: L9SemanticLagClass.TOO_LATE_FOR_EARLY_PROOF,
    dominant_lag_quality: L9LeadLagQualityClass.WEAK_BUT_USABLE,
    decay_dominance: L9DecayDominance.MODERATE_DECAY,
    post_event_lifecycle: null,
    post_event_anchor_present: false,
    declared_clean_output: true,
  });

  const holds = cleanOutputOk.ok &&
    codeSet(hiddenAmbiguity.violations).has(
      L9TemporalSemanticViolationCode
        .IX_AMBIGUITY_HIDDEN_UNDER_CLEAN_OUTPUT) &&
    codeSet(lateAsValidation.violations).has(
      L9TemporalSemanticViolationCode
        .IX_VALIDATION_WITH_TOO_LATE_LEADS);

  return {
    id: 'INV-9.5-F',
    name: 'Ambiguity / decay / post-event are not hidden',
    holds,
    evidence:
      `cleanOk=${cleanOutputOk.ok}` +
      ` hiddenAmb=${!hiddenAmbiguity.ok}` +
      ` lateValidation=${!lateAsValidation.ok}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.5-G — Replay-safe determinism of pure classifiers
// ────────────────────────────────────────────────────────────────
export function checkINV_95_G(): L9_5InvariantResult {
  const fam = L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY;

  // classify lag twice, expect same result
  const lagA = classifyL9SemanticLag(fam, 2 * 60 * 60_000);
  const lagB = classifyL9SemanticLag(fam, 2 * 60 * 60_000);

  // decay score composition deterministic
  const contribs: Partial<Record<L9DecayFactor, number>> = {
    [L9DecayFactor.TIME_ELAPSED]: 0.5,
    [L9DecayFactor.CONTRADICTION_BURDEN]: 0.3,
    [L9DecayFactor.STRONGER_LATER_SIGNAL]: 0.6,
  };
  const s1 = composeL9DecayScore(contribs);
  const s2 = composeL9DecayScore(contribs);
  const d1 = classifyL9DecayDominance(s1);
  const d2 = classifyL9DecayDominance(s2);

  // materiality banding deterministic
  const m1 = classifyL9ChangePointMateriality(0.42);
  const m2 = classifyL9ChangePointMateriality(0.42);

  // post-event state → lifecycle deterministic
  const lc1 = l9PostEventStateToLifecycle(L9PostEventWindowState.STABILIZING);
  const lc2 = l9PostEventStateToLifecycle(L9PostEventWindowState.STABILIZING);

  // change-point validator deterministic on identical input
  const cp: L9ChangePoint = {
    change_point_id: 'CP-1',
    sequence_subject_id: 'S-1',
    change_point_class: L9ChangePointClass.PHASE_SHIFT,
    change_point_at: ISO_GREEN.cp,
    prior_phase_ref: 'P-1',
    next_phase_ref: 'P-2',
    triggering_refs: ['EVT-1'],
    severity_score: 0.45,
    severity_class: L9ChangePointSeverity.MODERATE,
    lineage_refs: ['TRACE-1'],
  };
  const cpA = validateL9ChangePoint({
    change_point: cp,
    trigger_family: L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
    event_anchor_ref: null,
  });
  const cpB = validateL9ChangePoint({
    change_point: cp,
    trigger_family: L9ChangePointTriggerFamily.PHASE_SHIFT_EVIDENCE,
    event_anchor_ref: null,
  });

  const holds =
    lagA === lagB && s1 === s2 && d1 === d2 && m1 === m2 && lc1 === lc2 &&
    cpA.ok === cpB.ok &&
    cpA.violations.length === cpB.violations.length &&
    cpA.violations.every((v, i) => v.code === cpB.violations[i].code);

  return {
    id: 'INV-9.5-G',
    name: 'Replay-safe determinism of pure temporal classifiers',
    holds,
    evidence:
      `lag=${lagA}/${lagB} score=${s1}/${s2} dominance=${d1}/${d2}` +
      ` materiality=${m1}/${m2} lifecycle=${lc1}/${lc2}` +
      ` cp=${cpA.violations.length}/${cpB.violations.length}`,
  };
}

/** §9.5.12 — Aggregated runner. */
export function runAllL9_5Invariants(): readonly L9_5InvariantResult[] {
  return [
    checkINV_95_A(),
    checkINV_95_B(),
    checkINV_95_C(),
    checkINV_95_D(),
    checkINV_95_E(),
    checkINV_95_F(),
    checkINV_95_G(),
  ];
}

export { L9WindowClass };
