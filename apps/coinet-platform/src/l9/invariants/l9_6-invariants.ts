/**
 * L9.6 — Family / Template Invariants
 *
 * §9.6.14.1 — Seven machine-enforced invariants covering the L9.6
 * lawbook. Every invariant returns a `L9_6InvariantResult` with a
 * boolean `holds` plus an evidence string that replays cleanly under
 * the certification suite.
 *
 *   INV-9.6-A : Template uniqueness — every template belongs to
 *               exactly one family; cross-family duplication rejects.
 *   INV-9.6-B : State ownership — a template may only govern states
 *               declared in its owning family's ownership set.
 *   INV-9.6-C : Template surface completeness — every template
 *               declares both support and challenge domains, and a
 *               non-empty post-event/contradiction/decay posture.
 *   INV-9.6-D : Family-scope legality — templates may not widen their
 *               owning family's scope or phase envelope.
 *   INV-9.6-E : Post-event discipline — families owning post-event
 *               states must declare legal anchor classes, and
 *               templates on those states must require matching
 *               anchors + be blocked under `ACTIVE_SHOCK` where
 *               doctrine demands it.
 *   INV-9.6-F : Rollout ordering — a later-phase family cannot be
 *               enabled unless every earlier-phase family is enabled;
 *               gate failures are recorded as rollout violations.
 *   INV-9.6-G : Anti-leakage — family and template surfaces (text,
 *               invariants) never emit judgment/recommendation tokens.
 */

import {
  L9SequenceFamilyDefinition,
  L9StateOwnershipPosture,
} from '../contracts/sequence-family-definition';
import {
  L9SequenceTemplateDefinition,
} from '../contracts/sequence-template-definition';
import {
  L9ProductionFamilyId,
  L9SequenceRolloutPhase,
  L9SequenceTemplateId,
  L9TemplateRegimeRequirement,
  L9_PRODUCTION_FAMILY_ROLLOUT_PHASE,
  L9_SEQUENCE_ROLLOUT_ORDER,
} from '../contracts/sequence-template-policy';
import {
  L9SequenceRolloutGateId,
  L9SequenceRolloutStatus,
} from '../contracts/sequence-family-rollout';
import { L9SequenceState } from '../contracts/sequence-state';
import { L9PhaseClass } from '../contracts/phase-state';
import { L9DecayDominance } from '../contracts/l9-decay-policy';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
} from '../contracts/l9-lead-lag-policy';
import {
  L9PostEventAnchorClass,
  L9PostEventLifecycle,
} from '../contracts/l9-post-event-window-policy';
import { L9ChangePointTriggerFamily } from '../contracts/l9-change-point-policy';

import { L9_PRODUCTION_FAMILIES } from '../families';
import { L9_PRODUCTION_TEMPLATES } from '../templates';

import { L9SequenceFamilyDefinitionRegistry } from '../registry/sequence-family-definition.registry';
import { L9SequenceTemplateRegistry } from '../registry/sequence-template.registry';

import {
  L9FamilyViolationCode,
} from '../validation/l9-family-violation-codes';
import {
  validateL9SequenceFamilyDefinition,
} from '../validation/sequence-family-definition.validator';
import {
  validateL9SequenceTemplateDefinition,
} from '../validation/sequence-template-definition.validator';
import {
  validateL9SequenceRolloutOrder,
  validateL9SequenceRolloutStatus,
} from '../validation/sequence-family-rollout.validator';
import {
  L9TemplateEvaluationInput,
  validateL9TemplateStateLegality,
} from '../validation/sequence-template-state-legality.validator';
import { L9SequenceScopeType } from '../contracts/sequence-family';

export interface L9_6InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/**
 * §9.6.14.1 — Shared, deterministic production-family/template fixture
 * used by every invariant check.
 */
function buildL96Registries(): {
  families: L9SequenceFamilyDefinitionRegistry;
  templates: L9SequenceTemplateRegistry;
} {
  const families = new L9SequenceFamilyDefinitionRegistry(
    L9_PRODUCTION_FAMILIES,
  );
  const templates = new L9SequenceTemplateRegistry(
    L9_PRODUCTION_TEMPLATES,
    families,
  );
  return { families, templates };
}

function codeSet(
  vs: readonly { code: L9FamilyViolationCode }[],
): ReadonlySet<L9FamilyViolationCode> {
  return new Set(vs.map(v => v.code));
}

// ────────────────────────────────────────────────────────────────
// INV-9.6-A — Template uniqueness across families
// ────────────────────────────────────────────────────────────────
export function checkINV_96_A(): L9_6InvariantResult {
  const { families } = buildL96Registries();

  let everyTemplateHasExactlyOneOwner = true;
  for (const tpl of L9_PRODUCTION_TEMPLATES) {
    const owner = families.familyForTemplate(tpl.template_id);
    if (owner !== tpl.production_family) {
      everyTemplateHasExactlyOneOwner = false;
      break;
    }
  }

  let duplicateRejected = false;
  try {
    const dupA: L9SequenceFamilyDefinition = {
      ...L9_PRODUCTION_FAMILIES[0],
      family_id: L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
      template_ids: [L9SequenceTemplateId.PRE_NARRATIVE_ACCUMULATION],
    };
    const dupB: L9SequenceFamilyDefinition = {
      ...L9_PRODUCTION_FAMILIES[1],
      family_id: L9ProductionFamilyId.NARRATIVE_VALIDATION,
      template_ids: [L9SequenceTemplateId.PRE_NARRATIVE_ACCUMULATION],
    };
    new L9SequenceFamilyDefinitionRegistry([dupA, dupB]);
  } catch {
    duplicateRejected = true;
  }

  const holds = everyTemplateHasExactlyOneOwner && duplicateRejected;
  return {
    id: 'INV-9.6-A',
    name: 'Template uniqueness across families',
    holds,
    evidence:
      `allTemplatesUnique=${everyTemplateHasExactlyOneOwner}` +
      ` duplicateRejected=${duplicateRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.6-B — State ownership: templates may only govern owned states
// ────────────────────────────────────────────────────────────────
export function checkINV_96_B(): L9_6InvariantResult {
  const { families } = buildL96Registries();

  let allOwned = true;
  for (const tpl of L9_PRODUCTION_TEMPLATES) {
    if (
      !families.stateIsLegalForFamily(
        tpl.primary_sequence_state,
        tpl.production_family,
      )
    ) {
      allOwned = false;
      break;
    }
  }

  let rejectedIllegalState = false;
  try {
    const badTpl: L9SequenceTemplateDefinition = {
      ...L9_PRODUCTION_TEMPLATES[0],
      primary_sequence_state: L9SequenceState.POST_SHOCK_DIGESTION,
    };
    new L9SequenceTemplateRegistry([badTpl], families);
  } catch {
    rejectedIllegalState = true;
  }

  const holds = allOwned && rejectedIllegalState;
  return {
    id: 'INV-9.6-B',
    name: 'State ownership — templates govern only owned states',
    holds,
    evidence:
      `allOwned=${allOwned} rejectedIllegalState=${rejectedIllegalState}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.6-C — Template surface completeness
// ────────────────────────────────────────────────────────────────
export function checkINV_96_C(): L9_6InvariantResult {
  const { families } = buildL96Registries();

  let allComplete = true;
  for (const tpl of L9_PRODUCTION_TEMPLATES) {
    if (
      tpl.support_domains.length === 0 ||
      tpl.challenge_domains.length === 0 ||
      !tpl.contradiction_requirement ||
      !tpl.decay_requirement ||
      !tpl.post_event_requirement
    ) {
      allComplete = false;
      break;
    }
  }

  let rejectedNoChallenge = false;
  try {
    const badTpl: L9SequenceTemplateDefinition = {
      ...L9_PRODUCTION_TEMPLATES[0],
      challenge_domains: [],
    };
    new L9SequenceTemplateRegistry([badTpl], families);
  } catch {
    rejectedNoChallenge = true;
  }

  let rejectedNoSupport = false;
  try {
    const badTpl: L9SequenceTemplateDefinition = {
      ...L9_PRODUCTION_TEMPLATES[0],
      support_domains: [],
    };
    new L9SequenceTemplateRegistry([badTpl], families);
  } catch {
    rejectedNoSupport = true;
  }

  const holds = allComplete && rejectedNoChallenge && rejectedNoSupport;
  return {
    id: 'INV-9.6-C',
    name: 'Template surface completeness',
    holds,
    evidence:
      `allComplete=${allComplete} noChallengeRejected=${rejectedNoChallenge}` +
      ` noSupportRejected=${rejectedNoSupport}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.6-D — Family-scope legality
// ────────────────────────────────────────────────────────────────
export function checkINV_96_D(): L9_6InvariantResult {
  const { families } = buildL96Registries();
  let allWithinScope = true;
  for (const tpl of L9_PRODUCTION_TEMPLATES) {
    const fam = families.get(tpl.production_family)!;
    for (const s of tpl.applicable_scope_types) {
      if (!fam.legal_scope_types.includes(s)) {
        allWithinScope = false;
        break;
      }
    }
    for (const p of tpl.phase_requirement.allowed_primary_phases) {
      if (!fam.legal_phase_envelope.includes(p)) {
        allWithinScope = false;
        break;
      }
    }
  }

  const fam = families.get(L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION)!;
  const tplWidenScope: L9SequenceTemplateDefinition = {
    ...L9_PRODUCTION_TEMPLATES[0],
    applicable_scope_types: ['MARKET' as L9SequenceScopeType],
  };
  const rWidenScope = validateL9SequenceTemplateDefinition({
    template: tplWidenScope, owning_family: fam,
  });
  const widenScopeRejected = codeSet(rWidenScope.violations).has(
    L9FamilyViolationCode.TPL_SCOPE_NOT_LEGAL_FOR_FAMILY,
  );

  const tplWidenPhase: L9SequenceTemplateDefinition = {
    ...L9_PRODUCTION_TEMPLATES[0],
    phase_requirement: {
      allowed_primary_phases: [L9PhaseClass.SHOCK_RESPONSE],
      forbidden_phases: [],
      allow_dual_phase: false,
    },
  };
  const rWidenPhase = validateL9SequenceTemplateDefinition({
    template: tplWidenPhase, owning_family: fam,
  });
  const widenPhaseRejected = codeSet(rWidenPhase.violations).has(
    L9FamilyViolationCode.TPL_PHASE_NOT_IN_FAMILY_ENVELOPE,
  );

  const holds = allWithinScope && widenScopeRejected && widenPhaseRejected;
  return {
    id: 'INV-9.6-D',
    name: 'Family-scope legality (scope + phase envelope)',
    holds,
    evidence:
      `allWithinScope=${allWithinScope}` +
      ` widenScopeRejected=${widenScopeRejected}` +
      ` widenPhaseRejected=${widenPhaseRejected}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.6-E — Post-event discipline
// ────────────────────────────────────────────────────────────────
export function checkINV_96_E(): L9_6InvariantResult {
  const { families, templates } = buildL96Registries();

  const shockFam = families.get(L9ProductionFamilyId.SHOCK_DIGESTION)!;
  const anchorsDeclared =
    shockFam.legal_post_event_anchor_classes.length > 0;
  const pShock = templates.get(L9SequenceTemplateId.POST_SHOCK_DIGESTION)!;
  const anchorsRequired =
    pShock.post_event_requirement.required_anchor_classes.length > 0;
  const anchorSubset =
    pShock.post_event_requirement.required_anchor_classes.every(a =>
      shockFam.legal_post_event_anchor_classes.includes(a),
    );

  // Missing anchor → BLOCKED
  const missingAnchor = validateL9TemplateStateLegality({
    template: pShock,
    owning_family: shockFam,
    evaluation: baseShockEvaluation({
      post_event_anchor_class: undefined,
      post_event_lifecycle: undefined,
    }),
  });
  const missingAnchorBlocked = codeSet(missingAnchor.violations).has(
    L9FamilyViolationCode.STATE_POST_EVENT_ANCHOR_MISSING,
  );

  // Active shock on a template that disallows it (e.g. PRE_NARRATIVE_ACCUMULATION)
  const accFam =
    families.get(L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION)!;
  const preNarr =
    templates.get(L9SequenceTemplateId.PRE_NARRATIVE_ACCUMULATION)!;
  const activeShockCase = validateL9TemplateStateLegality({
    template: preNarr,
    owning_family: accFam,
    evaluation: baseAccumulationEvaluation({
      post_event_lifecycle: L9PostEventLifecycle.ACTIVE_SHOCK,
    }),
  });
  const activeShockBlocked = codeSet(activeShockCase.violations).has(
    L9FamilyViolationCode.STATE_ACTIVE_SHOCK_BLOCKS_CLEAN,
  );

  const holds =
    anchorsDeclared && anchorsRequired && anchorSubset &&
    missingAnchorBlocked && activeShockBlocked;

  return {
    id: 'INV-9.6-E',
    name: 'Post-event discipline',
    holds,
    evidence:
      `anchorsDeclared=${anchorsDeclared}` +
      ` anchorsRequired=${anchorsRequired}` +
      ` anchorSubset=${anchorSubset}` +
      ` missingAnchorBlocked=${missingAnchorBlocked}` +
      ` activeShockBlocked=${activeShockBlocked}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.6-F — Rollout ordering
// ────────────────────────────────────────────────────────────────
export function checkINV_96_F(): L9_6InvariantResult {
  // Build statuses: P1..P4 enabled, P5 disabled → ordered OK.
  const statuses: L9SequenceRolloutStatus[] = [
    statusFor(L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION, true),
    statusFor(L9ProductionFamilyId.NARRATIVE_VALIDATION, true),
    statusFor(L9ProductionFamilyId.REFLEXIVITY, true),
    statusFor(L9ProductionFamilyId.SHOCK_DIGESTION, true),
    statusFor(L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE, false),
  ];
  const okOrder = validateL9SequenceRolloutOrder(statuses);
  const orderedOk = okOrder.ok;

  // Out-of-order: P1 disabled, P5 enabled → reject.
  const ooStatuses: L9SequenceRolloutStatus[] = [
    statusFor(L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION, false),
    statusFor(L9ProductionFamilyId.NARRATIVE_VALIDATION, false),
    statusFor(L9ProductionFamilyId.REFLEXIVITY, false),
    statusFor(L9ProductionFamilyId.SHOCK_DIGESTION, false),
    statusFor(L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE, true),
  ];
  const ooOrder = validateL9SequenceRolloutOrder(ooStatuses);
  const outOfOrderRejected = codeSet(ooOrder.violations).has(
    L9FamilyViolationCode.ROLL_PHASE_ORDER_VIOLATED,
  );

  // Failed gate → emits a typed code.
  const blocked = validateL9SequenceRolloutStatus({
    family: L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
    phase:
      L9_PRODUCTION_FAMILY_ROLLOUT_PHASE[
        L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION
      ],
    enabled: false,
    gate_results: {
      [L9SequenceRolloutGateId.OWNING_STATES_REGISTERED]: true,
      [L9SequenceRolloutGateId.REQUIRED_TEMPLATE_SEMANTICS_COMPLETE]: true,
      [L9SequenceRolloutGateId.CONTRADICTION_FAMILY_HOOKUP]: true,
      [L9SequenceRolloutGateId.REGIME_CONSUMPTION_LEGAL]: true,
      [L9SequenceRolloutGateId.FAMILY_CERTIFICATION_GREEN]: false,
      [L9SequenceRolloutGateId.NO_ILLEGAL_FAMILY_STATE_COLLISIONS]: true,
    },
    blocking_gate_ids: [L9SequenceRolloutGateId.FAMILY_CERTIFICATION_GREEN],
  });
  const gateCodeEmitted = codeSet(blocked.violations).has(
    L9FamilyViolationCode.ROLL_CERTIFICATION_NOT_GREEN,
  );

  const holds = orderedOk && outOfOrderRejected && gateCodeEmitted;
  return {
    id: 'INV-9.6-F',
    name: 'Rollout ordering + gate enforcement',
    holds,
    evidence:
      `orderedOk=${orderedOk}` +
      ` outOfOrderRejected=${outOfOrderRejected}` +
      ` gateCodeEmitted=${gateCodeEmitted}`,
  };
}

// ────────────────────────────────────────────────────────────────
// INV-9.6-G — Anti-leakage on family/template surfaces
// ────────────────────────────────────────────────────────────────
export function checkINV_96_G(): L9_6InvariantResult {
  const { families } = buildL96Registries();
  let allClean = true;
  for (const fam of L9_PRODUCTION_FAMILIES) {
    const r = validateL9SequenceFamilyDefinition({ definition: fam });
    if (!r.ok) {
      allClean = false;
      break;
    }
  }
  for (const tpl of L9_PRODUCTION_TEMPLATES) {
    const fam = families.get(tpl.production_family)!;
    const r = validateL9SequenceTemplateDefinition({
      template: tpl, owning_family: fam,
    });
    if (!r.ok) {
      allClean = false;
      break;
    }
  }

  const leakyFam: L9SequenceFamilyDefinition = {
    ...L9_PRODUCTION_FAMILIES[0],
    description:
      'accumulation-to-expansion family — traders should buy on confirmation',
  };
  const rLeakFam = validateL9SequenceFamilyDefinition({
    definition: leakyFam,
  });
  const famLeakRejected = codeSet(rLeakFam.violations).has(
    L9FamilyViolationCode.FAM_LEAKAGE_JUDGMENT,
  );

  const accFam = families.get(L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION)!;
  const leakyTpl: L9SequenceTemplateDefinition = {
    ...L9_PRODUCTION_TEMPLATES[0],
    description:
      'pre-narrative-accumulation — operators should enter on validated expansion',
  };
  const rLeakTpl = validateL9SequenceTemplateDefinition({
    template: leakyTpl, owning_family: accFam,
  });
  const tplLeakRejected = codeSet(rLeakTpl.violations).has(
    L9FamilyViolationCode.TPL_LEAKAGE_JUDGMENT,
  );

  const holds = allClean && famLeakRejected && tplLeakRejected;
  return {
    id: 'INV-9.6-G',
    name: 'Anti-leakage: no judgment/recommendation surfaces',
    holds,
    evidence:
      `allClean=${allClean}` +
      ` famLeakRejected=${famLeakRejected}` +
      ` tplLeakRejected=${tplLeakRejected}`,
  };
}

/** §9.6.14.1 — Aggregated invariant runner. */
export function runAllL9_6Invariants(): readonly L9_6InvariantResult[] {
  return [
    checkINV_96_A(),
    checkINV_96_B(),
    checkINV_96_C(),
    checkINV_96_D(),
    checkINV_96_E(),
    checkINV_96_F(),
    checkINV_96_G(),
  ];
}

// ────────────────────────────────────────────────────────────────
// Fixture helpers
// ────────────────────────────────────────────────────────────────

function statusFor(
  family: L9ProductionFamilyId,
  enabled: boolean,
): L9SequenceRolloutStatus {
  return {
    family,
    phase: L9_PRODUCTION_FAMILY_ROLLOUT_PHASE[family],
    enabled,
    gate_results: {
      [L9SequenceRolloutGateId.OWNING_STATES_REGISTERED]: enabled,
      [L9SequenceRolloutGateId.REQUIRED_TEMPLATE_SEMANTICS_COMPLETE]: enabled,
      [L9SequenceRolloutGateId.CONTRADICTION_FAMILY_HOOKUP]: enabled,
      [L9SequenceRolloutGateId.REGIME_CONSUMPTION_LEGAL]: enabled,
      [L9SequenceRolloutGateId.FAMILY_CERTIFICATION_GREEN]: enabled,
      [L9SequenceRolloutGateId.NO_ILLEGAL_FAMILY_STATE_COLLISIONS]: enabled,
    },
    blocking_gate_ids: [],
  };
}

function baseAccumulationEvaluation(
  overrides: Partial<L9TemplateEvaluationInput> = {},
): L9TemplateEvaluationInput {
  return {
    scope_type: 'ASSET',
    primary_phase: L9PhaseClass.EARLY,
    declared_ambiguity_explicit: false,
    lead_lag_quality: L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL,
    lead_lag_lag_class: L9SemanticLagClass.SHORT_LAG,
    decay_dominance: L9DecayDominance.LOW_DECAY,
    contradiction_trigger_families: [],
    regime_hostile: false,
    regime_present: true,
    present_support_domains: [],
    present_challenge_domains: [],
    sequence_completeness: 0.7,
    claims_clean_emission: true,
    ...overrides,
  };
}

function baseShockEvaluation(
  overrides: Partial<L9TemplateEvaluationInput> = {},
): L9TemplateEvaluationInput {
  return {
    scope_type: 'ASSET',
    primary_phase: L9PhaseClass.DIGESTION,
    declared_ambiguity_explicit: false,
    lead_lag_quality: L9LeadLagQualityClass.WEAK_BUT_USABLE,
    lead_lag_lag_class: L9SemanticLagClass.MEDIUM_LAG,
    decay_dominance: L9DecayDominance.MODERATE_DECAY,
    post_event_anchor_class: L9PostEventAnchorClass.UNLOCK,
    post_event_lifecycle: L9PostEventLifecycle.DIGESTING,
    contradiction_trigger_families: [],
    regime_hostile: false,
    regime_present: true,
    present_support_domains: [],
    present_challenge_domains: [],
    sequence_completeness: 0.7,
    claims_clean_emission: false,
    ...overrides,
  };
}

/** §9.6.14.1 — expose regime-requirement symbol so downstream tree-shaking keeps it. */
export type _L9_6RegimeRequirementBinding = L9TemplateRegimeRequirement;
/** §9.6.14.1 — expose rollout-phase + contradiction-trigger symbols. */
export type _L9_6RolloutPhaseBinding = L9SequenceRolloutPhase;
export type _L9_6ContradictionFamilyBinding = L9ChangePointTriggerFamily;
export type _L9_6SequenceOrderBinding = typeof L9_SEQUENCE_ROLLOUT_ORDER;
