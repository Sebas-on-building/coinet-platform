/**
 * L9.6 — Family / Template Lawbook — Certification Test Suite
 *
 * §9.6.14.2 — 5 certification bands:
 *   A — Policy contracts & enums      (§9.6.1–§9.6.4)
 *   B — Family definitions & registry (§9.6.3, §9.6.11.1)
 *   C — Template definitions & registry (§9.6.4, §9.6.11.2)
 *   D — Rollout & state-legality     (§9.6.10, §9.6.4.4)
 *   E — Audit + invariants + replay  (§9.6.14.1)
 *
 * Pass criterion: every assertion true, all 7 L9.6 invariants green,
 * all 5 production families and 7 templates validate clean, and every
 * crafted offender fails on precisely its targeted `L9F_` code.
 */

// ── Contracts ──
import {
  L9ProductionFamilyId,
  L9SequenceTemplateId,
  L9SequenceRolloutPhase,
  L9TemplateSupportDomain,
  L9TemplateChallengeDomain,
  L9TemplateLegalityClass,
  L9TemplateRegimeRequirement,
  ALL_L9_PRODUCTION_FAMILY_IDS,
  ALL_L9_SEQUENCE_TEMPLATE_IDS,
  ALL_L9_SEQUENCE_ROLLOUT_PHASES,
  ALL_L9_TEMPLATE_SUPPORT_DOMAINS,
  ALL_L9_TEMPLATE_CHALLENGE_DOMAINS,
  ALL_L9_TEMPLATE_LEGALITY_CLASSES,
  ALL_L9_TEMPLATE_REGIME_REQUIREMENTS,
  L9_SEQUENCE_ROLLOUT_ORDER,
  L9_PRODUCTION_FAMILY_ROLLOUT_PHASE,
} from '../l9/contracts/sequence-template-policy';
import {
  L9SequenceFamilyDefinition,
  L9StateOwnershipPosture,
  findL9FamilyOwningState,
  findL9FamiliesReferencingState,
  findL9FamilyStateRecord,
} from '../l9/contracts/sequence-family-definition';
import {
  L9SequenceTemplateDefinition,
  buildL9SequenceTemplateKey,
  hasAllRequiredL9TemplateSurfaces,
} from '../l9/contracts/sequence-template-definition';
import {
  L9SequenceRolloutGateId,
  L9SequenceRolloutStatus,
  ALL_L9_SEQUENCE_ROLLOUT_GATE_IDS,
  compareL9RolloutPhases,
  evaluateL9RolloutGates,
  l9ProductionFamilyRolloutPhase,
  l9RolloutPhaseIndex,
} from '../l9/contracts/sequence-family-rollout';

// ── Families + templates fixtures ──
import { L9_PRODUCTION_FAMILIES } from '../l9/families';
import { L9_PRODUCTION_TEMPLATES } from '../l9/templates';

// ── Registries ──
import { L9SequenceFamilyDefinitionRegistry } from '../l9/registry/sequence-family-definition.registry';
import { L9SequenceTemplateRegistry } from '../l9/registry/sequence-template.registry';
import {
  L9_ROLLOUT_SIGNALS_ALL_GREEN,
  L9SequenceRolloutRegistry,
  L9SequenceRolloutSignals,
} from '../l9/registry/sequence-rollout.registry';

// ── Validators ──
import {
  assertL9SequenceFamilyDefinitionLegal,
  validateL9SequenceFamilyDefinition,
} from '../l9/validation/sequence-family-definition.validator';
import {
  assertL9SequenceTemplateDefinitionLegal,
  validateL9SequenceTemplateDefinition,
} from '../l9/validation/sequence-template-definition.validator';
import {
  validateL9SequenceRolloutOrder,
  validateL9SequenceRolloutStatus,
} from '../l9/validation/sequence-family-rollout.validator';
import {
  L9TemplateEvaluationInput,
  validateL9TemplateStateLegality,
} from '../l9/validation/sequence-template-state-legality.validator';
import {
  ALL_L9_FAMILY_VIOLATION_CODES,
  ALL_L9_FAMILY_VIOLATION_TIERS,
  L9FamilyValidationError,
  L9FamilyViolation,
  L9FamilyViolationCode,
  L9FamilyViolationTier,
} from '../l9/validation/l9-family-violation-codes';

// ── Audit ──
import {
  L9FamilyAuditSeverity,
  buildL9FamilyAudit,
  classifyL9FamilyAuditSeverity,
  hasL9FamilyBlockingViolations,
} from '../l9/constitution/l9-family-audit';

// ── Invariants ──
import {
  checkINV_96_A, checkINV_96_B, checkINV_96_C, checkINV_96_D,
  checkINV_96_E, checkINV_96_F, checkINV_96_G,
  runAllL9_6Invariants,
} from '../l9/invariants/l9_6-invariants';

// ── L7/L8 surfaces consumed as types for state-legality fixtures ──
import { L9SequenceState } from '../l9/contracts/sequence-state';
import { L9PhaseClass } from '../l9/contracts/phase-state';
import { L9DecayDominance } from '../l9/contracts/l9-decay-policy';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
} from '../l9/contracts/l9-lead-lag-policy';
import {
  L9PostEventAnchorClass,
  L9PostEventLifecycle,
} from '../l9/contracts/l9-post-event-window-policy';
import { L9ChangePointTriggerFamily } from '../l9/contracts/l9-change-point-policy';
import { L9SequenceScopeType } from '../l9/contracts/sequence-family';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}
function hasCode(
  vs: readonly { code: L9FamilyViolationCode }[],
  code: L9FamilyViolationCode,
): boolean {
  return vs.some(v => v.code === code);
}

// Shared registries built once — deterministic.
const familyRegistry =
  new L9SequenceFamilyDefinitionRegistry(L9_PRODUCTION_FAMILIES);
const templateRegistry =
  new L9SequenceTemplateRegistry(L9_PRODUCTION_TEMPLATES, familyRegistry);
const rolloutRegistry =
  new L9SequenceRolloutRegistry(familyRegistry, templateRegistry);

// ═══════════════════════════════════════════════════════════════
// BAND A — Policy contracts & enums (§9.6.1–§9.6.4)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Policy Contracts & Enums ═══');

// A.1..A.5 — enum completeness
assert(ALL_L9_PRODUCTION_FAMILY_IDS.length === 5,
  'A.1 exactly 5 production family ids');
assert(new Set(ALL_L9_PRODUCTION_FAMILY_IDS).size === 5,
  'A.2 production family ids distinct');
assert(ALL_L9_SEQUENCE_TEMPLATE_IDS.length === 7,
  'A.3 exactly 7 sequence template ids');
assert(new Set(ALL_L9_SEQUENCE_TEMPLATE_IDS).size === 7,
  'A.4 template ids distinct');
assert(ALL_L9_SEQUENCE_ROLLOUT_PHASES.length === 5,
  'A.5 exactly 5 rollout phases');

// A.6..A.10 — support/challenge/legality/regime enum populated
assert(ALL_L9_TEMPLATE_SUPPORT_DOMAINS.length >= 8,
  'A.6 support domain enum populated');
assert(ALL_L9_TEMPLATE_CHALLENGE_DOMAINS.length >= 8,
  'A.7 challenge domain enum populated');
assert(ALL_L9_TEMPLATE_LEGALITY_CLASSES.length === 5,
  'A.8 legality enum has 5 entries');
assert(ALL_L9_TEMPLATE_REGIME_REQUIREMENTS.length === 4,
  'A.9 regime requirement enum has 4 entries');
assert(ALL_L9_FAMILY_VIOLATION_CODES.length > 30,
  'A.10 family violation codes populated (>30)');

// A.11 — every violation code carries the `L9F_` prefix
for (const code of ALL_L9_FAMILY_VIOLATION_CODES) {
  assert(String(code).startsWith('L9F_'), `A.prefix.${code} L9F_ prefix`);
}

// A.12 — every violation tier distinct
assert(new Set(ALL_L9_FAMILY_VIOLATION_TIERS).size ===
  ALL_L9_FAMILY_VIOLATION_TIERS.length, 'A.12 tiers distinct');

// A.13 — canonical rollout order is stable
assert(L9_SEQUENCE_ROLLOUT_ORDER[0] === L9SequenceRolloutPhase.P1_CORE,
  'A.13 canonical rollout starts at P1_CORE');
assert(L9_SEQUENCE_ROLLOUT_ORDER[
  L9_SEQUENCE_ROLLOUT_ORDER.length - 1] ===
  L9SequenceRolloutPhase.P5_DECEPTIVE_PATTERN,
  'A.14 canonical rollout ends at P5_DECEPTIVE_PATTERN');

// A.15 — family-phase mapping canonical
assert(L9_PRODUCTION_FAMILY_ROLLOUT_PHASE[
  L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION]
  === L9SequenceRolloutPhase.P1_CORE,
  'A.15 accumulation family on P1');
assert(L9_PRODUCTION_FAMILY_ROLLOUT_PHASE[
  L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE]
  === L9SequenceRolloutPhase.P5_DECEPTIVE_PATTERN,
  'A.16 distribution family on P5');

// A.17 — phase-comparison helpers are monotonic
assert(compareL9RolloutPhases(
  L9SequenceRolloutPhase.P1_CORE,
  L9SequenceRolloutPhase.P2_EARLY_EXPANSION) < 0,
  'A.17 phase comparator P1<P2');
assert(l9RolloutPhaseIndex(L9SequenceRolloutPhase.P4_SHOCK_RECOVERY) === 3,
  'A.18 P4 at index 3');

// A.19 — helper returns phase for every family
for (const f of ALL_L9_PRODUCTION_FAMILY_IDS) {
  const p = l9ProductionFamilyRolloutPhase(f);
  assert(ALL_L9_SEQUENCE_ROLLOUT_PHASES.includes(p),
    `A.map.${f} → declared phase`);
}

// A.20..A.22 — template key helper + required-surface helper
const sampleKey = buildL9SequenceTemplateKey(
  L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
  L9SequenceTemplateId.PRE_NARRATIVE_ACCUMULATION,
  '1.0.0',
);
assert(sampleKey ===
  'ACCUMULATION_TO_EXPANSION::PRE_NARRATIVE_ACCUMULATION@v1.0.0',
  'A.20 template key format');
assert(hasAllRequiredL9TemplateSurfaces(L9_PRODUCTION_TEMPLATES[0]) === true,
  'A.21 every required surface present on sample');
assert(hasAllRequiredL9TemplateSurfaces({
  ...L9_PRODUCTION_TEMPLATES[0], support_domains: [],
}) === false, 'A.22 missing support_domains → required-surface fails');

// A.23 — rollout gate id enum full
assert(ALL_L9_SEQUENCE_ROLLOUT_GATE_IDS.length === 6,
  'A.23 six rollout gates declared');

// ═══════════════════════════════════════════════════════════════
// BAND B — Family Definitions & Registry (§9.6.3, §9.6.11.1)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Family Definitions & Registry ═══');

// B.1..B.5 — 5 families fixture, every family id covered, distinct
assert(L9_PRODUCTION_FAMILIES.length === 5, 'B.1 5 production families');
const famIds = L9_PRODUCTION_FAMILIES.map(f => f.family_id);
assert(new Set(famIds).size === 5, 'B.2 family ids distinct');
for (const id of ALL_L9_PRODUCTION_FAMILY_IDS) {
  assert(famIds.includes(id), `B.def.${id} has a definition`);
}

// B.6..B.10 — each family validates clean
for (const fam of L9_PRODUCTION_FAMILIES) {
  const r = validateL9SequenceFamilyDefinition({ definition: fam });
  assert(r.ok, `B.validate.${fam.family_id} clean (${r.violations.map(v => v.code).join(',')})`);
}

// B.11 — registry lookup / templatesFor matches family definitions
for (const fam of L9_PRODUCTION_FAMILIES) {
  const got = familyRegistry.get(fam.family_id);
  assert(got !== undefined, `B.reg.${fam.family_id} registered`);
  assert(JSON.stringify(familyRegistry.templatesFor(fam.family_id))
    === JSON.stringify(fam.template_ids),
    `B.tpls.${fam.family_id} templatesFor matches`);
}

// B.12 — familyForTemplate round-trips for every declared template
for (const fam of L9_PRODUCTION_FAMILIES) {
  for (const t of fam.template_ids) {
    assert(familyRegistry.familyForTemplate(t) === fam.family_id,
      `B.owner.${t} → ${fam.family_id}`);
  }
}

// B.13 — every production template id has exactly one owner
for (const tid of ALL_L9_SEQUENCE_TEMPLATE_IDS) {
  const owner = familyRegistry.familyForTemplate(tid);
  assert(owner !== undefined, `B.cov.${tid} has owning family`);
}

// B.14 — duplicate-family registration rejects
let dupFamRejected = false;
try {
  new L9SequenceFamilyDefinitionRegistry([
    L9_PRODUCTION_FAMILIES[0], L9_PRODUCTION_FAMILIES[0],
  ]);
} catch { dupFamRejected = true; }
assert(dupFamRejected, 'B.14 duplicate family id rejected at registry init');

// B.15 — duplicate template across families rejects (INV-9.6-A)
let dupTplAcross = false;
try {
  const clash: L9SequenceFamilyDefinition = {
    ...L9_PRODUCTION_FAMILIES[1],
    family_id: L9ProductionFamilyId.NARRATIVE_VALIDATION,
    template_ids: [L9SequenceTemplateId.PRE_NARRATIVE_ACCUMULATION],
  };
  new L9SequenceFamilyDefinitionRegistry([
    L9_PRODUCTION_FAMILIES[0], clash,
  ]);
} catch { dupTplAcross = true; }
assert(dupTplAcross, 'B.15 duplicate template across families rejected (INV-9.6-A)');

// B.16 — scope / state / rollout / coexistence offenders
const accFam = familyRegistry.get(
  L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION)!;
assert(accFam.legal_scope_types.length > 0, 'B.16 scopes non-empty');
const emptyScope: L9SequenceFamilyDefinition = {
  ...accFam, legal_scope_types: [],
};
const emptyScopeRes = validateL9SequenceFamilyDefinition({
  definition: emptyScope });
assert(hasCode(emptyScopeRes.violations,
  L9FamilyViolationCode.FAM_LEGAL_SCOPES_EMPTY),
  'B.17 empty scopes → FAM_LEGAL_SCOPES_EMPTY');

const emptyStates: L9SequenceFamilyDefinition = {
  ...accFam, state_ownership: [],
};
const emptyStatesRes = validateL9SequenceFamilyDefinition({
  definition: emptyStates });
assert(hasCode(emptyStatesRes.violations,
  L9FamilyViolationCode.FAM_STATE_OWNERSHIP_EMPTY),
  'B.18 empty ownership → FAM_STATE_OWNERSHIP_EMPTY');

const wrongPhase: L9SequenceFamilyDefinition = {
  ...accFam,
  rollout_phase: L9SequenceRolloutPhase.P5_DECEPTIVE_PATTERN,
};
const wrongPhaseRes = validateL9SequenceFamilyDefinition({
  definition: wrongPhase });
assert(hasCode(wrongPhaseRes.violations,
  L9FamilyViolationCode.FAM_ROLLOUT_PHASE_MISMATCH),
  'B.19 rollout phase mismatch → FAM_ROLLOUT_PHASE_MISMATCH');

const selfCoexist: L9SequenceFamilyDefinition = {
  ...accFam, coexists_with: [accFam.family_id],
};
const selfCoexistRes = validateL9SequenceFamilyDefinition({
  definition: selfCoexist });
assert(hasCode(selfCoexistRes.violations,
  L9FamilyViolationCode.FAM_COEXISTENCE_WITH_SELF),
  'B.20 self-coexistence → FAM_COEXISTENCE_WITH_SELF');

const badCap: L9SequenceFamilyDefinition = {
  ...accFam, default_confidence_cap: 1.4,
};
const badCapRes = validateL9SequenceFamilyDefinition({ definition: badCap });
assert(hasCode(badCapRes.violations,
  L9FamilyViolationCode.FAM_CONFIDENCE_CAP_OUT_OF_RANGE),
  'B.21 cap>1 → FAM_CONFIDENCE_CAP_OUT_OF_RANGE');

// B.22 — shock-digestion family requires anchors (§9.6.8.4)
const shockFam = familyRegistry.get(L9ProductionFamilyId.SHOCK_DIGESTION)!;
const shockNoAnchors: L9SequenceFamilyDefinition = {
  ...shockFam, legal_post_event_anchor_classes: [],
};
const shockNoAnchorsRes = validateL9SequenceFamilyDefinition({
  definition: shockNoAnchors });
assert(hasCode(shockNoAnchorsRes.violations,
  L9FamilyViolationCode.FAM_POST_EVENT_ANCHORS_REQUIRED_MISSING),
  'B.22 shock digestion without anchors rejects');

// B.23 — state-ownership helpers
const exclOwner = findL9FamilyOwningState(
  L9_PRODUCTION_FAMILIES,
  L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  L9StateOwnershipPosture.EXCLUSIVE,
);
assert(exclOwner?.family_id ===
  L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
  'B.23 exclusive owner of PRE_NARRATIVE_ACCUMULATION');
const refFams = findL9FamiliesReferencingState(
  L9_PRODUCTION_FAMILIES, L9SequenceState.EARLY_NARRATIVE_IGNITION,
);
assert(refFams.length >= 2,
  'B.24 EARLY_NARRATIVE_IGNITION referenced by ≥2 families');
const stateRec = findL9FamilyStateRecord(
  accFam, L9SequenceState.VALIDATED_EXPANSION,
);
assert(stateRec?.posture === L9StateOwnershipPosture.SHARED_WITH_DIFFERENT_ROUTE,
  'B.25 VALIDATED_EXPANSION shared by accumulation family');

// B.26 — coexistence
assert(familyRegistry.coexists(
  L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
  L9ProductionFamilyId.NARRATIVE_VALIDATION) === true,
  'B.26 accumulation coexists with narrative-validation');

// B.27 — assert-throw variant
let assertFamThrew = false;
try {
  assertL9SequenceFamilyDefinitionLegal({ definition: emptyScope });
} catch (e) {
  assertFamThrew = e instanceof L9FamilyValidationError;
}
assert(assertFamThrew, 'B.27 assertL9SequenceFamilyDefinitionLegal throws');

// ═══════════════════════════════════════════════════════════════
// BAND C — Template Definitions & Registry (§9.6.4, §9.6.11.2)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Template Definitions & Registry ═══');

// C.1 — 7 templates
assert(L9_PRODUCTION_TEMPLATES.length === 7, 'C.1 7 production templates');
const tplIds = L9_PRODUCTION_TEMPLATES.map(t => t.template_id);
assert(new Set(tplIds).size === 7, 'C.2 template ids distinct');

// C.3..C.9 — each template validates clean against its family
for (const tpl of L9_PRODUCTION_TEMPLATES) {
  const owner = familyRegistry.get(tpl.production_family)!;
  const r = validateL9SequenceTemplateDefinition({
    template: tpl, owning_family: owner,
  });
  assert(r.ok, `C.validate.${tpl.template_id} clean (${r.violations.map(v => v.code).join(',')})`);
}

// C.10 — templateRegistry round-trip
for (const tpl of L9_PRODUCTION_TEMPLATES) {
  assert(templateRegistry.get(tpl.template_id) === tpl,
    `C.reg.${tpl.template_id} registered`);
  const key = templateRegistry.keyFor(tpl.template_id);
  assert(key !== undefined && templateRegistry.getByKey(key) === tpl,
    `C.key.${tpl.template_id} round-trips`);
}

// C.11 — listForFamily returns templates of the declared family
for (const fam of L9_PRODUCTION_FAMILIES) {
  const list = templateRegistry.listForFamily(fam.family_id);
  const listIds = list.map(t => t.template_id).sort();
  const expIds = [...fam.template_ids].sort();
  assert(JSON.stringify(listIds) === JSON.stringify(expIds),
    `C.listFam.${fam.family_id} matches`);
}

// C.12 — no-challenge-domain template rejected (INV-9.6-C)
let noChallengeRejected = false;
try {
  const bad: L9SequenceTemplateDefinition = {
    ...L9_PRODUCTION_TEMPLATES[0], challenge_domains: [],
  };
  new L9SequenceTemplateRegistry([bad], familyRegistry);
} catch { noChallengeRejected = true; }
assert(noChallengeRejected,
  'C.12 empty challenge_domains rejected at registry init (INV-9.6-C)');

// C.13 — no-support-domain template rejected
let noSupportRejected = false;
try {
  const bad: L9SequenceTemplateDefinition = {
    ...L9_PRODUCTION_TEMPLATES[0], support_domains: [],
  };
  new L9SequenceTemplateRegistry([bad], familyRegistry);
} catch { noSupportRejected = true; }
assert(noSupportRejected,
  'C.13 empty support_domains rejected at registry init');

// C.14 — template claiming state not owned by family rejects (INV-9.6-B)
let stateNotOwnedRejected = false;
try {
  const bad: L9SequenceTemplateDefinition = {
    ...L9_PRODUCTION_TEMPLATES[0],
    primary_sequence_state: L9SequenceState.POST_SHOCK_DIGESTION,
  };
  new L9SequenceTemplateRegistry([bad], familyRegistry);
} catch { stateNotOwnedRejected = true; }
assert(stateNotOwnedRejected,
  'C.14 template primary state not owned → registry reject (INV-9.6-B)');

// C.15 — family mismatch
const famMismatch: L9SequenceTemplateDefinition = {
  ...L9_PRODUCTION_TEMPLATES[0],
  production_family: L9ProductionFamilyId.NARRATIVE_VALIDATION,
};
const famMismatchRes = validateL9SequenceTemplateDefinition({
  template: famMismatch, owning_family: accFam,
});
assert(hasCode(famMismatchRes.violations,
  L9FamilyViolationCode.TPL_FAMILY_MISMATCH),
  'C.15 family mismatch → TPL_FAMILY_MISMATCH');

// C.16 — scope widening
const scopeWiden: L9SequenceTemplateDefinition = {
  ...L9_PRODUCTION_TEMPLATES[0],
  applicable_scope_types: ['MARKET' as L9SequenceScopeType],
};
const scopeWidenRes = validateL9SequenceTemplateDefinition({
  template: scopeWiden, owning_family: accFam,
});
assert(hasCode(scopeWidenRes.violations,
  L9FamilyViolationCode.TPL_SCOPE_NOT_LEGAL_FOR_FAMILY),
  'C.16 scope widening → TPL_SCOPE_NOT_LEGAL_FOR_FAMILY');

// C.17 — phase envelope widening
const phaseWiden: L9SequenceTemplateDefinition = {
  ...L9_PRODUCTION_TEMPLATES[0],
  phase_requirement: {
    allowed_primary_phases: [L9PhaseClass.SHOCK_RESPONSE],
    forbidden_phases: [],
    allow_dual_phase: false,
  },
};
const phaseWidenRes = validateL9SequenceTemplateDefinition({
  template: phaseWiden, owning_family: accFam,
});
assert(hasCode(phaseWidenRes.violations,
  L9FamilyViolationCode.TPL_PHASE_NOT_IN_FAMILY_ENVELOPE),
  'C.17 phase widening → TPL_PHASE_NOT_IN_FAMILY_ENVELOPE');

// C.18 — decay > family ceiling
const decayOver: L9SequenceTemplateDefinition = {
  ...L9_PRODUCTION_TEMPLATES[0],
  decay_requirement: {
    max_tolerated_dominance: L9DecayDominance.DOMINANT_DECAY,
    requires_non_zero_decay_for_early_evidence: false,
  },
};
const decayOverRes = validateL9SequenceTemplateDefinition({
  template: decayOver, owning_family: accFam,
});
assert(hasCode(decayOverRes.violations,
  L9FamilyViolationCode.TPL_DECAY_EXCEEDS_FAMILY_CEILING),
  'C.18 decay over ceiling → TPL_DECAY_EXCEEDS_FAMILY_CEILING');

// C.19 — clean-emission ranges enforced
const badCompletion: L9SequenceTemplateDefinition = {
  ...L9_PRODUCTION_TEMPLATES[0],
  clean_emission: {
    ...L9_PRODUCTION_TEMPLATES[0].clean_emission,
    sequence_completeness_minimum: 1.5,
  },
};
const badCompletionRes = validateL9SequenceTemplateDefinition({
  template: badCompletion, owning_family: accFam,
});
assert(hasCode(badCompletionRes.violations,
  L9FamilyViolationCode.TPL_CLEAN_COMPLETENESS_OUT_OF_RANGE),
  'C.19 completeness>1 → TPL_CLEAN_COMPLETENESS_OUT_OF_RANGE');

const badCoverage: L9SequenceTemplateDefinition = {
  ...L9_PRODUCTION_TEMPLATES[0],
  clean_emission: {
    ...L9_PRODUCTION_TEMPLATES[0].clean_emission,
    requires_support_domain_coverage_minimum: -0.1,
  },
};
const badCoverageRes = validateL9SequenceTemplateDefinition({
  template: badCoverage, owning_family: accFam,
});
assert(hasCode(badCoverageRes.violations,
  L9FamilyViolationCode.TPL_CLEAN_SUPPORT_COVERAGE_OUT_OF_RANGE),
  'C.20 coverage<0 → TPL_CLEAN_SUPPORT_COVERAGE_OUT_OF_RANGE');

// C.21 — rollout priority mismatch
const wrongPriority: L9SequenceTemplateDefinition = {
  ...L9_PRODUCTION_TEMPLATES[0],
  rollout_priority: L9SequenceRolloutPhase.P5_DECEPTIVE_PATTERN,
};
const wrongPriorityRes = validateL9SequenceTemplateDefinition({
  template: wrongPriority, owning_family: accFam,
});
assert(hasCode(wrongPriorityRes.violations,
  L9FamilyViolationCode.TPL_ROLLOUT_PRIORITY_MISMATCH),
  'C.21 rollout_priority mismatch');

// C.22 — assert-throw variant
let assertTplThrew = false;
try {
  assertL9SequenceTemplateDefinitionLegal({
    template: famMismatch, owning_family: accFam,
  });
} catch (e) { assertTplThrew = e instanceof L9FamilyValidationError; }
assert(assertTplThrew,
  'C.22 assertL9SequenceTemplateDefinitionLegal throws');

// C.23 — challenge/support/scope registry helpers
const preNarr = templateRegistry.get(
  L9SequenceTemplateId.PRE_NARRATIVE_ACCUMULATION)!;
assert(templateRegistry.challengeDomains(preNarr.template_id).length > 0,
  'C.23 challenge domains non-empty via registry');
assert(templateRegistry.supportDomains(preNarr.template_id).length > 0,
  'C.24 support domains non-empty via registry');
assert(templateRegistry.applicableScopes(preNarr.template_id).length > 0,
  'C.25 applicable scopes non-empty via registry');

// ═══════════════════════════════════════════════════════════════
// BAND D — Rollout & State-Legality (§9.6.10, §9.6.4.4)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Rollout & State-Legality ═══');

// D.1 — all-green signals → every family enabled
const allStatuses = rolloutRegistry.enabledFamilies(
  L9_ROLLOUT_SIGNALS_ALL_GREEN);
assert(allStatuses.length === 5 && allStatuses.every(s => s.enabled),
  'D.1 all-green signals → 5 families enabled');

// D.2 — phase order is monotonic
for (let i = 1; i < allStatuses.length; i++) {
  assert(l9RolloutPhaseIndex(allStatuses[i].phase) >=
    l9RolloutPhaseIndex(allStatuses[i - 1].phase),
    `D.order.${i} phase monotonic`);
}

// D.3 — failing certification gate blocks family
const failCert: L9SequenceRolloutSignals = {
  ...L9_ROLLOUT_SIGNALS_ALL_GREEN,
  certificationGreen: (f) =>
    f !== L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
};
const accStatus = rolloutRegistry.evaluate(
  L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION, failCert);
assert(!accStatus.enabled &&
  accStatus.blocking_gate_ids.includes(
    L9SequenceRolloutGateId.FAMILY_CERTIFICATION_GREEN),
  'D.3 cert-fail → FAMILY_CERTIFICATION_GREEN blocks');

// D.4 — rollout validator emits typed code
const certCodeRes = validateL9SequenceRolloutStatus(accStatus);
assert(hasCode(certCodeRes.violations,
  L9FamilyViolationCode.ROLL_CERTIFICATION_NOT_GREEN),
  'D.4 cert-fail status → ROLL_CERTIFICATION_NOT_GREEN');

// D.5 — out-of-order ordering rejects
const statusesOO: L9SequenceRolloutStatus[] = [
  { ...buildStatus(L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION, false) },
  { ...buildStatus(L9ProductionFamilyId.NARRATIVE_VALIDATION, false) },
  { ...buildStatus(L9ProductionFamilyId.REFLEXIVITY, false) },
  { ...buildStatus(L9ProductionFamilyId.SHOCK_DIGESTION, false) },
  { ...buildStatus(L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE, true) },
];
const oo = validateL9SequenceRolloutOrder(statusesOO);
assert(hasCode(oo.violations,
  L9FamilyViolationCode.ROLL_PHASE_ORDER_VIOLATED),
  'D.5 out-of-order → ROLL_PHASE_ORDER_VIOLATED');

// D.6 — ordered-OK sequence passes
const statusesOK: L9SequenceRolloutStatus[] = [
  { ...buildStatus(L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION, true) },
  { ...buildStatus(L9ProductionFamilyId.NARRATIVE_VALIDATION, true) },
  { ...buildStatus(L9ProductionFamilyId.REFLEXIVITY, false) },
  { ...buildStatus(L9ProductionFamilyId.SHOCK_DIGESTION, false) },
  { ...buildStatus(L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE, false) },
];
const okOrder = validateL9SequenceRolloutOrder(statusesOK);
assert(okOrder.ok, 'D.6 ordered enable passes validator');

// D.7 — state-legality: clean emission under full support
const accGreen: L9TemplateEvaluationInput = greenEvaluationForPreNarr();
const accGreenRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accGreen,
});
assert(accGreenRes.legality === L9TemplateLegalityClass.CLEAN &&
  accGreenRes.violations.length === 0,
  `D.7 green accumulation → CLEAN (${accGreenRes.legality})`);

// D.8 — blocker contradiction → BLOCKED
const accBlocker: L9TemplateEvaluationInput = {
  ...accGreen,
  contradiction_trigger_families: [
    L9ChangePointTriggerFamily.DECAY_DOMINANCE,
  ],
};
const accBlockerRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accBlocker,
});
assert(accBlockerRes.legality === L9TemplateLegalityClass.BLOCKED &&
  hasCode(accBlockerRes.violations,
    L9FamilyViolationCode.STATE_BLOCKER_PRESENT_CLEAN_CLAIMED),
  'D.8 blocker family → BLOCKED + STATE_BLOCKER_PRESENT_CLEAN_CLAIMED');

// D.9 — narrowing contradiction → NARROWED
const accNarrow: L9TemplateEvaluationInput = {
  ...accGreen,
  contradiction_trigger_families: [
    L9ChangePointTriggerFamily.CONTRADICTION_BUNDLE,
  ],
};
const accNarrowRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accNarrow,
});
assert(accNarrowRes.legality === L9TemplateLegalityClass.NARROWED &&
  accNarrowRes.narrowing_reasons.length > 0,
  `D.9 narrowing family → NARROWED (${accNarrowRes.legality})`);

// D.10 — phase out of envelope → BLOCKED
const accBadPhase: L9TemplateEvaluationInput = {
  ...accGreen, primary_phase: L9PhaseClass.CROWDING,
};
const accBadPhaseRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accBadPhase,
});
assert(accBadPhaseRes.legality === L9TemplateLegalityClass.BLOCKED &&
  hasCode(accBadPhaseRes.violations,
    L9FamilyViolationCode.STATE_PHASE_OUT_OF_FAMILY_ENVELOPE),
  'D.10 forbidden phase → BLOCKED + STATE_PHASE_OUT_OF_FAMILY_ENVELOPE');

// D.11 — decay over tolerance → BLOCKED
const accHighDecay: L9TemplateEvaluationInput = {
  ...accGreen, decay_dominance: L9DecayDominance.DOMINANT_DECAY,
};
const accHighDecayRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accHighDecay,
});
assert(accHighDecayRes.legality === L9TemplateLegalityClass.BLOCKED &&
  hasCode(accHighDecayRes.violations,
    L9FamilyViolationCode.STATE_DECAY_EXCEEDS_TEMPLATE_TOLERANCE),
  'D.11 over-tolerance decay → BLOCKED');

// D.12 — hostile regime under clean claim
const accHostile: L9TemplateEvaluationInput = {
  ...accGreen, regime_hostile: true,
};
const accHostileRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accHostile,
});
assert(hasCode(accHostileRes.violations,
  L9FamilyViolationCode.STATE_HOSTILE_REGIME_CLEAN_CLAIMED),
  'D.12 hostile regime + clean claim → STATE_HOSTILE_REGIME_CLEAN_CLAIMED');

// D.13 — low support coverage
const accLowSupport: L9TemplateEvaluationInput = {
  ...accGreen, present_support_domains: [],
};
const accLowSupportRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accLowSupport,
});
assert(hasCode(accLowSupportRes.violations,
  L9FamilyViolationCode.STATE_SUPPORT_COVERAGE_BELOW_MINIMUM),
  'D.13 zero support coverage → STATE_SUPPORT_COVERAGE_BELOW_MINIMUM');

// D.14 — completeness below minimum
const accLowComp: L9TemplateEvaluationInput = {
  ...accGreen, sequence_completeness: 0.2,
};
const accLowCompRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accLowComp,
});
assert(hasCode(accLowCompRes.violations,
  L9FamilyViolationCode.STATE_COMPLETENESS_BELOW_MINIMUM),
  'D.14 low completeness → STATE_COMPLETENESS_BELOW_MINIMUM');

// D.15 — ambiguity unresolved under clean claim
const accAmb: L9TemplateEvaluationInput = {
  ...accGreen, declared_ambiguity_explicit: true,
};
const accAmbRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accAmb,
});
assert(hasCode(accAmbRes.violations,
  L9FamilyViolationCode.STATE_AMBIGUITY_UNRESOLVED_CLEAN_CLAIMED),
  'D.15 ambiguity + clean → STATE_AMBIGUITY_UNRESOLVED_CLEAN_CLAIMED');

// D.16 — shock template: active-shock is digesting (lifecycle),
//   anchor missing → STATE_POST_EVENT_ANCHOR_MISSING
const postShockTpl = templateRegistry.get(
  L9SequenceTemplateId.POST_SHOCK_DIGESTION)!;
const shockGreen: L9TemplateEvaluationInput = greenEvaluationForPostShock();
const shockGreenRes = validateL9TemplateStateLegality({
  template: postShockTpl, owning_family: shockFam,
  evaluation: shockGreen,
});
assert(shockGreenRes.legality !== L9TemplateLegalityClass.BLOCKED,
  `D.16 green post-shock not blocked (${shockGreenRes.legality})`);

const shockNoAnchor: L9TemplateEvaluationInput = {
  ...shockGreen,
  post_event_anchor_class: undefined,
  post_event_lifecycle: undefined,
};
const shockNoAnchorRes = validateL9TemplateStateLegality({
  template: postShockTpl, owning_family: shockFam,
  evaluation: shockNoAnchor,
});
assert(shockNoAnchorRes.legality === L9TemplateLegalityClass.BLOCKED &&
  hasCode(shockNoAnchorRes.violations,
    L9FamilyViolationCode.STATE_POST_EVENT_ANCHOR_MISSING),
  'D.17 no anchor on shock template → STATE_POST_EVENT_ANCHOR_MISSING');

// D.18 — accumulation template under ACTIVE_SHOCK → BLOCKED
const accActive: L9TemplateEvaluationInput = {
  ...accGreen, post_event_lifecycle: L9PostEventLifecycle.ACTIVE_SHOCK,
};
const accActiveRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accActive,
});
assert(accActiveRes.legality === L9TemplateLegalityClass.BLOCKED &&
  hasCode(accActiveRes.violations,
    L9FamilyViolationCode.STATE_ACTIVE_SHOCK_BLOCKS_CLEAN),
  'D.18 accumulation + ACTIVE_SHOCK → STATE_ACTIVE_SHOCK_BLOCKS_CLEAN');

// D.19 — scope not applicable → BLOCKED
const accBadScope: L9TemplateEvaluationInput = {
  ...accGreen, scope_type: 'MARKET' as L9SequenceScopeType,
};
const accBadScopeRes = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accBadScope,
});
assert(accBadScopeRes.legality === L9TemplateLegalityClass.BLOCKED &&
  hasCode(accBadScopeRes.violations,
    L9FamilyViolationCode.STATE_SCOPE_ILLEGAL_FOR_FAMILY),
  'D.19 scope not applicable → STATE_SCOPE_ILLEGAL_FOR_FAMILY');

// D.20 — rollout registry exposes canonical gate id list
assert(JSON.stringify(rolloutRegistry.gateIds()) ===
  JSON.stringify(ALL_L9_SEQUENCE_ROLLOUT_GATE_IDS),
  'D.20 rollout registry gateIds() is canonical');

// D.21 — evaluateL9RolloutGates returns blocking_gate_ids correctly
const oneFail = evaluateL9RolloutGates(
  L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION,
  {
    [L9SequenceRolloutGateId.OWNING_STATES_REGISTERED]: true,
    [L9SequenceRolloutGateId.REQUIRED_TEMPLATE_SEMANTICS_COMPLETE]: true,
    [L9SequenceRolloutGateId.CONTRADICTION_FAMILY_HOOKUP]: true,
    [L9SequenceRolloutGateId.REGIME_CONSUMPTION_LEGAL]: false,
    [L9SequenceRolloutGateId.FAMILY_CERTIFICATION_GREEN]: true,
    [L9SequenceRolloutGateId.NO_ILLEGAL_FAMILY_STATE_COLLISIONS]: true,
  },
);
assert(!oneFail.enabled &&
  oneFail.blocking_gate_ids.length === 1 &&
  oneFail.blocking_gate_ids[0] ===
    L9SequenceRolloutGateId.REGIME_CONSUMPTION_LEGAL,
  'D.21 single blocking gate reported');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit + Invariants + Replay (§9.6.14.1)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit, Invariants, Replay ═══');

// E.1 — severity classification
assert(classifyL9FamilyAuditSeverity(
  L9FamilyViolationCode.FAM_UNREGISTERED)
  === L9FamilyAuditSeverity.CRITICAL,
  'E.1 FAM_UNREGISTERED = CRITICAL');
assert(classifyL9FamilyAuditSeverity(
  L9FamilyViolationCode.STATE_BLOCKER_PRESENT_CLEAN_CLAIMED)
  === L9FamilyAuditSeverity.CRITICAL,
  'E.2 blocker-clean = CRITICAL');
assert(classifyL9FamilyAuditSeverity(
  L9FamilyViolationCode.TPL_CLEAN_COMPLETENESS_OUT_OF_RANGE)
  === L9FamilyAuditSeverity.WARNING,
  'E.3 clean-completeness-oor = WARNING');
assert(classifyL9FamilyAuditSeverity(
  L9FamilyViolationCode.STATE_SUPPORT_COVERAGE_BELOW_MINIMUM)
  === L9FamilyAuditSeverity.WARNING,
  'E.4 low-coverage = WARNING');

// E.5..E.8 — audit aggregates deterministically
const auditVs: L9FamilyViolation[] = [
  ...accBlockerRes.violations,
  ...shockNoAnchorRes.violations,
  ...decayOverRes.violations,
  ...badCompletionRes.violations,
];
const audit = buildL9FamilyAudit(auditVs);
assert(audit.total === auditVs.length, 'E.5 audit total matches');
assert(audit.highest_severity === L9FamilyAuditSeverity.CRITICAL,
  'E.6 audit highest = CRITICAL');
assert(hasL9FamilyBlockingViolations(audit) === true,
  'E.7 audit is blocking');

const tierSum = Object.values(audit.by_tier).reduce((a, b) => a + b, 0);
assert(tierSum === audit.total, 'E.8 by_tier sums to total');

// E.9 — empty audit is INFO + non-blocking
const emptyAudit = buildL9FamilyAudit([]);
assert(emptyAudit.total === 0 &&
  emptyAudit.highest_severity === L9FamilyAuditSeverity.INFO &&
  hasL9FamilyBlockingViolations(emptyAudit) === false,
  'E.9 empty audit INFO + non-blocking');

// E.10 — audit deterministic (stable JSON)
const audit2 = buildL9FamilyAudit(auditVs);
assert(JSON.stringify(audit) === JSON.stringify(audit2),
  'E.10 audit deterministic');

// E.11 — every tier key present in by_tier skeleton
for (const t of ALL_L9_FAMILY_VIOLATION_TIERS) {
  assert(Object.prototype.hasOwnProperty.call(audit.by_tier, t),
    `E.tier.${t} present in by_tier`);
}

// E.12 — 7 invariants, all green
const inv = runAllL9_6Invariants();
assert(inv.length === 7, 'E.12 7 L9.6 invariants');
for (const r of inv) {
  assert(r.holds === true, `E.inv.${r.id} ${r.evidence}`);
}

// E.13..E.19 — per-invariant holds
assert(checkINV_96_A().holds, 'E.13 INV-9.6-A holds');
assert(checkINV_96_B().holds, 'E.14 INV-9.6-B holds');
assert(checkINV_96_C().holds, 'E.15 INV-9.6-C holds');
assert(checkINV_96_D().holds, 'E.16 INV-9.6-D holds');
assert(checkINV_96_E().holds, 'E.17 INV-9.6-E holds');
assert(checkINV_96_F().holds, 'E.18 INV-9.6-F holds');
assert(checkINV_96_G().holds, 'E.19 INV-9.6-G holds');

// E.20 — invariant runner deterministic
const run1 = runAllL9_6Invariants();
const run2 = runAllL9_6Invariants();
assert(JSON.stringify(run1) === JSON.stringify(run2),
  'E.20 invariant runner deterministic');

// E.21 — registry determinism: same input → identical list order
const families2 =
  new L9SequenceFamilyDefinitionRegistry(L9_PRODUCTION_FAMILIES);
const templates2 =
  new L9SequenceTemplateRegistry(L9_PRODUCTION_TEMPLATES, families2);
assert(JSON.stringify(families2.list().map(f => f.family_id)) ===
  JSON.stringify(familyRegistry.list().map(f => f.family_id)),
  'E.21 family list deterministic across registries');
assert(JSON.stringify(templates2.list().map(t => t.template_id)) ===
  JSON.stringify(templateRegistry.list().map(t => t.template_id)),
  'E.22 template list deterministic across registries');

// E.23 — state-legality validator is deterministic
const replayA = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accGreen,
});
const replayB = validateL9TemplateStateLegality({
  template: preNarr, owning_family: accFam, evaluation: accGreen,
});
assert(JSON.stringify(replayA) === JSON.stringify(replayB),
  'E.23 state-legality validator deterministic');

// E.24 — rollout registry determinism
const en1 = rolloutRegistry.enabledFamilies(L9_ROLLOUT_SIGNALS_ALL_GREEN);
const en2 = rolloutRegistry.enabledFamilies(L9_ROLLOUT_SIGNALS_ALL_GREEN);
assert(JSON.stringify(en1) === JSON.stringify(en2),
  'E.24 rollout enabledFamilies deterministic');

// E.25 — family-anti-leakage
const leakyFam: L9SequenceFamilyDefinition = {
  ...accFam,
  description:
    'accumulation-to-expansion family — traders should buy the dip',
};
const leakyFamRes = validateL9SequenceFamilyDefinition({
  definition: leakyFam });
assert(hasCode(leakyFamRes.violations,
  L9FamilyViolationCode.FAM_LEAKAGE_JUDGMENT),
  'E.25 judgment surface in family → FAM_LEAKAGE_JUDGMENT');

// E.26 — template-anti-leakage
const leakyTpl: L9SequenceTemplateDefinition = {
  ...preNarr,
  description:
    'pre-narrative accumulation — operators should enter on validated expansion',
};
const leakyTplRes = validateL9SequenceTemplateDefinition({
  template: leakyTpl, owning_family: accFam,
});
assert(hasCode(leakyTplRes.violations,
  L9FamilyViolationCode.TPL_LEAKAGE_JUDGMENT),
  'E.26 judgment surface in template → TPL_LEAKAGE_JUDGMENT');

// E.27 — Regime requirements: every accumulation template requires regime
const regimeKinds = L9_PRODUCTION_TEMPLATES.map(t => t.regime_requirement);
assert(regimeKinds.every(r => r !== undefined),
  'E.27 every template declares a regime_requirement');
assert(regimeKinds.some(
  r => r === L9TemplateRegimeRequirement.REQUIRED_COMPATIBLE ||
       r === L9TemplateRegimeRequirement.REQUIRED_PRESENT ||
       r === L9TemplateRegimeRequirement.MUST_NARROW_UNDER_HOSTILE),
  'E.28 at least one template requires regime presence');

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
function buildStatus(
  family: L9ProductionFamilyId, enabled: boolean,
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

function greenEvaluationForPreNarr(): L9TemplateEvaluationInput {
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
    present_support_domains: [
      L9TemplateSupportDomain.ACCUMULATION_EVIDENCE,
      L9TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
      L9TemplateSupportDomain.EARLY_LEAD_SIGNAL_PRESENCE,
      L9TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
    ],
    present_challenge_domains: [],
    sequence_completeness: 0.8,
    claims_clean_emission: true,
  };
}

function greenEvaluationForPostShock(): L9TemplateEvaluationInput {
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
    present_support_domains: [
      L9TemplateSupportDomain.POST_EVENT_STABILIZATION,
      L9TemplateSupportDomain.STRUCTURAL_PARTICIPATION,
      L9TemplateSupportDomain.LIQUIDITY_IMPROVEMENT,
      L9TemplateSupportDomain.REGIME_COMPATIBLE_POSTURE,
    ],
    present_challenge_domains: [],
    sequence_completeness: 0.7,
    claims_clean_emission: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L9.6 FAMILY-TEMPLATE LAWBOOK — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const lbl of failures) console.log(`  - ${lbl}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 9.6 family-template lawbook green.');
  process.exit(0);
}
