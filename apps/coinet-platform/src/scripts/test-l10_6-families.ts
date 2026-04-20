/**
 * L10.6 — Family / Template Certification Test Suite
 *
 * 5 Bands (§10.6.15.2):
 *   A — Family doctrine: canonical set of seven families, template
 *       roster matches mapping, scope/support/contradiction surfaces
 *       declared, coexists/incompatible mutual-exclusion.
 *   B — Template doctrine: canonical 21 templates, family-binding,
 *       scope/support/contradiction subset, confirmations/
 *       invalidations/regime/sequence posture, rollout priority.
 *   C — State legality: CLEAN / NARROWED / BLOCKED / UNSUPPORTED /
 *       INVALID on perturbed runtime inputs; blocker law honoured.
 *   D — Rollout doctrine: gates, certification, predecessor chain,
 *       phase ordering (INV-10.6-F).
 *   E — Audit surface + INV-10.6-A..G.
 */

import {
  L10FamilyViolationCode,
  L10HypothesisFamilyId,
  L10HypothesisRolloutPhase,
  L10HypothesisTemplateId,
  L10TemplateContradictionDomain,
  L10TemplateLegalityClass,
  L10TemplateSupportDomain,
  ALL_L10_HYPOTHESIS_FAMILY_IDS,
  ALL_L10_HYPOTHESIS_TEMPLATE_IDS,
  ALL_L10_HYPOTHESIS_ROLLOUT_PHASES,
  L10_HYPOTHESIS_ROLLOUT_ORDER,
  L10_TEMPLATE_TO_FAMILY,
  L10_PRODUCTION_FAMILY_ROLLOUT_PHASE,
  getL10ProductionTemplatesForFamily,
  classifyL10FamilyCode,
  foldL10FamilyLegality,
} from '../l10/contracts/hypothesis-template-policy';
import {
  L10RolloutLifecycleStage,
} from '../l10/contracts/hypothesis-family-rollout';

import {
  L10_PRODUCTION_FAMILY_DEFINITIONS,
} from '../l10/families';
import {
  ALL_L10_PRODUCTION_TEMPLATES,
} from '../l10/templates';

import {
  validateL10FamilyDefinition,
  validateL10FamilyDefinitionBatch,
  validateL10TemplateDefinitionBatch,
  validateL10FamilyRolloutState,
  validateL10TemplateStateLegality,
} from '../l10/validation';

import {
  L10FamilyAuditSeverity,
  L10FamilyAuditSurface,
  buildL10FamilyAuditRecords,
  classifyL10FamilyAuditSeverity,
  summariseL10FamilyAudit,
} from '../l10/constitution/l10-family-template-audit';

import {
  buildGreenL10_6DefinitionFixture,
  buildGreenL10_6RolloutFixture,
  buildGreenL10_6TemplateStateFixture,
} from '../l10/invariants/l10_6-fixtures';
import {
  checkINV_106_A,
  checkINV_106_B,
  checkINV_106_C,
  checkINV_106_D,
  checkINV_106_E,
  checkINV_106_F,
  checkINV_106_G,
  runAllL10_6Invariants,
} from '../l10/invariants/l10_6-invariants';

import type { L10HypothesisFamilyDefinition } from '../l10/contracts/hypothesis-family-definition';
import type { L10HypothesisTemplateDefinition } from '../l10/contracts/hypothesis-template-definition';

const V = L10FamilyViolationCode;

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}`); }
}

const defs = buildGreenL10_6DefinitionFixture();
const rollout = buildGreenL10_6RolloutFixture();
const state = buildGreenL10_6TemplateStateFixture();

const familyMap = new Map<string, L10HypothesisFamilyDefinition>(
  defs.families.map(f => [f.family_id, f]),
);

// ═══════════════════════════════════════════════════════════════
// BAND A — Family doctrine
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Family doctrine ═══');

assert(ALL_L10_HYPOTHESIS_FAMILY_IDS.length === 7,
  'A.01 canonical family set has 7 ids');
assert(defs.families.length === 7,
  'A.02 seven production family definitions registered');

// Every canonical family is represented in the roster.
assert(
  ALL_L10_HYPOTHESIS_FAMILY_IDS.every(
    fid => defs.families.some(f => f.family_id === fid),
  ),
  'A.03 every canonical family id has a definition',
);

// Batch validator returns ok on the green definition set.
const famBatch = validateL10FamilyDefinitionBatch(defs.families);
assert(famBatch.ok,
  `A.04 green family batch validates (${famBatch.issues.map(i => i.code).join(',')})`);
assert(famBatch.legality === L10TemplateLegalityClass.CLEAN,
  'A.05 green family batch classified CLEAN');

// Every family's declared roster matches canonical mapping exactly.
let rosterExact = true;
for (const f of defs.families) {
  const canonical = new Set(getL10ProductionTemplatesForFamily(f.family_id));
  const declared = new Set(f.legal_templates);
  if (canonical.size !== declared.size) { rosterExact = false; break; }
  for (const t of canonical) {
    if (!declared.has(t)) { rosterExact = false; break; }
  }
}
assert(rosterExact, 'A.06 every family template roster matches canonical mapping');

// Mis-rostered family is rejected.
const drifted: L10HypothesisFamilyDefinition = {
  ...defs.families[0],
  legal_templates: [L10HypothesisTemplateId.LEVERAGE_DRIVEN_SQUEEZE],
};
const driftRep = validateL10FamilyDefinition(drifted);
assert(driftRep.issues.some(i => i.code === V.FAMILY_TEMPLATE_LIST_DRIFT),
  'A.07 template-list drift rejected');

// Empty family roster rejected.
const empty: L10HypothesisFamilyDefinition = {
  ...defs.families[0],
  legal_templates: [],
};
const emptyRep = validateL10FamilyDefinition(empty);
assert(emptyRep.issues.some(i => i.code === V.FAMILY_TEMPLATE_LIST_EMPTY),
  'A.08 empty family template list rejected');

// Missing legal_scope_types rejected.
const noScope: L10HypothesisFamilyDefinition = {
  ...defs.families[0],
  legal_scope_types: [],
};
const noScopeRep = validateL10FamilyDefinition(noScope);
assert(noScopeRep.issues.some(
  i => i.code === V.FAMILY_MISSING_LEGAL_SCOPE_TYPES),
  'A.09 empty legal_scope_types rejected');

// Missing support / contradiction domains rejected.
const noSupport: L10HypothesisFamilyDefinition = {
  ...defs.families[0],
  legal_support_domains: [],
};
const noSupportRep = validateL10FamilyDefinition(noSupport);
assert(noSupportRep.issues.some(
  i => i.code === V.FAMILY_MISSING_SUPPORT_DOMAINS),
  'A.10 empty legal_support_domains rejected');

const noContra: L10HypothesisFamilyDefinition = {
  ...defs.families[0],
  legal_contradiction_domains: [],
};
const noContraRep = validateL10FamilyDefinition(noContra);
assert(noContraRep.issues.some(
  i => i.code === V.FAMILY_MISSING_CONTRADICTION_DOMAINS),
  'A.11 empty legal_contradiction_domains rejected');

// Coexist / incompatible mutual-exclusion.
const clashingCounterparty = defs.families[1].family_id;
const bothListed: L10HypothesisFamilyDefinition = {
  ...defs.families[0],
  coexists_with: [...defs.families[0].coexists_with, clashingCounterparty],
  incompatible_with: [...defs.families[0].incompatible_with, clashingCounterparty],
};
const bothRep = validateL10FamilyDefinition(bothListed);
assert(bothRep.issues.some(i => i.code === V.FAMILY_SEMANTIC_OVERLAP),
  'A.12 family cannot coexist and be incompatible with same counterparty');

// Self-listing rejected.
const selfListed: L10HypothesisFamilyDefinition = {
  ...defs.families[0],
  coexists_with: [...defs.families[0].coexists_with, defs.families[0].family_id],
};
const selfRep = validateL10FamilyDefinition(selfListed);
assert(selfRep.issues.some(i => i.code === V.FAMILY_SEMANTIC_OVERLAP),
  'A.13 family cannot list itself in coexists / incompatible');

// Canonical rollout-phase mapping respected by every family.
const canonicalPhase = defs.families.every(
  f => L10_PRODUCTION_FAMILY_ROLLOUT_PHASE[f.family_id] === f.rollout_phase,
);
assert(canonicalPhase, 'A.14 every family rollout phase matches canonical mapping');

// Duplicate family id rejected.
const duplicate = [...defs.families, defs.families[0]];
const dupRep = validateL10FamilyDefinitionBatch(duplicate);
assert(dupRep.issues.some(i => i.code === V.FAMILY_DUPLICATE_ID),
  'A.15 duplicate family definition rejected');

// ═══════════════════════════════════════════════════════════════
// BAND B — Template doctrine
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Template doctrine ═══');

assert(ALL_L10_HYPOTHESIS_TEMPLATE_IDS.length === 21,
  'B.01 canonical template set has 21 ids');
assert(defs.templates.length === 21,
  'B.02 21 production template definitions registered');

// Every canonical template id has a definition.
assert(
  ALL_L10_HYPOTHESIS_TEMPLATE_IDS.every(
    tid => defs.templates.some(t => t.template_id === tid),
  ),
  'B.03 every canonical template id has a definition',
);

// Batch validator returns ok on the green template set.
const tplBatch = validateL10TemplateDefinitionBatch(defs.templates, familyMap);
assert(tplBatch.ok,
  `B.04 green template batch validates (${tplBatch.issues.map(i => i.code).join(',')})`);
assert(tplBatch.legality === L10TemplateLegalityClass.CLEAN,
  'B.05 green template batch classified CLEAN');

// Every template binds to exactly the family in the canonical map.
const canonicalBinding = defs.templates.every(
  t => L10_TEMPLATE_TO_FAMILY[t.template_id] === t.hypothesis_family,
);
assert(canonicalBinding,
  'B.06 every template binds to its canonical family');

// Family mismatch rejected.
const misbound: L10HypothesisTemplateDefinition = {
  ...defs.templates[0],
  hypothesis_family: L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
};
const misboundRep = validateL10TemplateDefinitionBatch([misbound], familyMap);
assert(misboundRep.issues.some(i => i.code === V.TEMPLATE_FAMILY_MISMATCH),
  'B.07 template family mismatch rejected');

// Scope-type outside family rejected.
const badScope: L10HypothesisTemplateDefinition = {
  ...defs.templates[0],
  applicable_scope_types: ['NARRATIVE_CLUSTER'],
};
const badScopeRep = validateL10TemplateDefinitionBatch([badScope], familyMap);
assert(badScopeRep.issues.some(
  i => i.code === V.TEMPLATE_ILLEGAL_SCOPE_FOR_FAMILY),
  'B.08 out-of-family scope rejected');

// Support domain outside family rejected.
const badSupport: L10HypothesisTemplateDefinition = {
  ...defs.templates[0],
  support_requirement: {
    ...defs.templates[0].support_requirement,
    required_support_domains: [
      ...defs.templates[0].support_requirement.required_support_domains,
      L10TemplateSupportDomain.FABRICATED_PARTICIPATION_SIGNAL,
    ],
  },
};
const badSupportRep = validateL10TemplateDefinitionBatch([badSupport], familyMap);
assert(badSupportRep.issues.some(
  i => i.code === V.TEMPLATE_SUPPORT_DOMAIN_NOT_IN_FAMILY),
  'B.09 out-of-family support domain rejected');

// Contradiction domain outside family rejected.
const badContra: L10HypothesisTemplateDefinition = {
  ...defs.templates[0],
  contradiction_requirement: {
    ...defs.templates[0].contradiction_requirement,
    required_contradiction_domains: [
      ...defs.templates[0].contradiction_requirement.required_contradiction_domains,
      L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
    ],
  },
};
const badContraRep = validateL10TemplateDefinitionBatch([badContra], familyMap);
assert(badContraRep.issues.some(
  i => i.code === V.TEMPLATE_CONTRADICTION_DOMAIN_NOT_IN_FAMILY),
  'B.10 out-of-family contradiction domain rejected');

// Template rollout priority must agree with family's rollout phase.
const wrongPhase: L10HypothesisTemplateDefinition = {
  ...defs.templates[0],
  rollout_priority: L10HypothesisRolloutPhase.P5_RELATIONAL_EXPLANATION,
};
const wrongPhaseRep = validateL10TemplateDefinitionBatch([wrongPhase], familyMap);
assert(wrongPhaseRep.issues.some(
  i => i.code === V.TEMPLATE_ROLLOUT_DISAGREES_WITH_FAMILY),
  'B.11 template rollout phase disagreement rejected');

// Every template declares an upgrade-critical confirmation.
const allCritical = defs.templates.every(
  t => t.required_confirmations.some(c => c.is_upgrade_critical),
);
assert(allCritical,
  'B.12 every template declares ≥1 upgrade-critical confirmation');

// Template with no upgrade-critical confirmation rejected.
const stripped: L10HypothesisTemplateDefinition = {
  ...defs.templates[0],
  required_confirmations: defs.templates[0].required_confirmations.map(
    c => ({ ...c, is_upgrade_critical: false }),
  ),
};
const stripRep = validateL10TemplateDefinitionBatch([stripped], familyMap);
assert(stripRep.issues.some(i => i.code === V.TEMPLATE_MISSING_CONFIRMATIONS),
  'B.13 template with no upgrade-critical confirmation rejected');

// Every template declares explicit regime and sequence posture.
const allPosture = defs.templates.every(
  t => !!t.regime_posture && !!t.sequence_posture,
);
assert(allPosture, 'B.14 every template declares regime + sequence posture');

// Missing regime posture rejected.
const noRegime: L10HypothesisTemplateDefinition = {
  ...defs.templates[0],
  regime_posture: undefined as unknown as L10HypothesisTemplateDefinition['regime_posture'],
};
const noRegimeRep = validateL10TemplateDefinitionBatch([noRegime], familyMap);
assert(noRegimeRep.issues.some(
  i => i.code === V.TEMPLATE_MISSING_REGIME_POSTURE),
  'B.15 missing regime posture rejected');

// Missing sequence posture rejected.
const noSeq: L10HypothesisTemplateDefinition = {
  ...defs.templates[0],
  sequence_posture: undefined as unknown as L10HypothesisTemplateDefinition['sequence_posture'],
};
const noSeqRep = validateL10TemplateDefinitionBatch([noSeq], familyMap);
assert(noSeqRep.issues.some(
  i => i.code === V.TEMPLATE_MISSING_SEQUENCE_POSTURE),
  'B.16 missing sequence posture rejected');

// Out-of-range invalidation threshold rejected.
const oor: L10HypothesisTemplateDefinition = {
  ...defs.templates[0],
  invalidation_signals: [{
    ...defs.templates[0].invalidation_signals[0],
    active_collapse_threshold: 1.7,
  }],
};
const oorRep = validateL10TemplateDefinitionBatch([oor], familyMap);
assert(oorRep.issues.some(i => i.code === V.TEMPLATE_MISSING_INVALIDATIONS),
  'B.17 out-of-range invalidation threshold rejected');

// Duplicate template id rejected.
const dupTpl = [...defs.templates, defs.templates[0]];
const dupTplRep = validateL10TemplateDefinitionBatch(dupTpl, familyMap);
assert(dupTplRep.issues.some(i => i.code === V.TEMPLATE_DUPLICATE_ID),
  'B.18 duplicate template id rejected');

// ═══════════════════════════════════════════════════════════════
// BAND C — State legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: State legality ═══');

// Green state is CLEAN.
const greenState = validateL10TemplateStateLegality(state.state);
assert(greenState.ok &&
  greenState.legality === L10TemplateLegalityClass.CLEAN,
  `C.01 green state classified CLEAN (${greenState.issues.map(i => i.code).join(',')})`);

// Blocking contradiction → BLOCKED.
const blockingDom =
  state.template.contradiction_requirement.blocking_domains[0];
const blocked = validateL10TemplateStateLegality({
  ...state.state,
  active_blocking_contradiction_domains: [blockingDom],
});
assert(blocked.legality === L10TemplateLegalityClass.BLOCKED,
  'C.02 active blocking contradiction drops to BLOCKED');
assert(blocked.issues.some(
  i => i.code === V.STATE_BLOCKER_CONDITION_PRESENT),
  'C.03 state blocker condition code emitted');

// Narrowing contradiction → NARROWED.
const narrowingDom =
  state.template.contradiction_requirement.narrowing_domains[0];
const narrowed = validateL10TemplateStateLegality({
  ...state.state,
  active_narrowing_contradiction_domains: [narrowingDom],
});
assert(narrowed.legality === L10TemplateLegalityClass.NARROWED,
  'C.04 active narrowing contradiction drops to NARROWED');
assert(narrowed.issues.some(
  i => i.code === V.STATE_CONTRADICTION_FORCES_NARROW),
  'C.05 state narrow-forcing code emitted');

// Missing upgrade-critical confirmation → NARROWED (or BLOCKED per blocker_law).
const critical = state.template.required_confirmations.find(
  c => c.is_upgrade_critical,
);
const presentRefs = new Set<string>(state.state.present_confirmation_refs);
if (critical) presentRefs.delete(critical.confirmation_ref);
const missing = validateL10TemplateStateLegality({
  ...state.state,
  present_confirmation_refs: presentRefs,
});
assert(missing.legality === L10TemplateLegalityClass.NARROWED ||
  missing.legality === L10TemplateLegalityClass.BLOCKED,
  'C.06 missing upgrade-critical confirmation drops legality');
assert(missing.issues.some(i =>
  i.code === V.STATE_MISSING_REQUIRED_CONFIRMATION ||
  i.code === V.STATE_BLOCKER_CONDITION_PRESENT),
  'C.07 missing-confirmation code emitted');

// Active invalidation → BLOCKED when blocker_law allows.
const activeInv = validateL10TemplateStateLegality({
  ...state.state,
  active_invalidation_refs: new Set<string>([
    state.template.invalidation_signals[0].invalidation_ref,
  ]),
});
assert(activeInv.legality === L10TemplateLegalityClass.BLOCKED,
  'C.08 active invalidation drops to BLOCKED');
assert(activeInv.issues.some(i => i.code === V.STATE_ACTIVE_INVALIDATION),
  'C.09 state active-invalidation code emitted');

// Insufficient primary support → NARROWED (via support gap forcing narrow).
const thinSupport = validateL10TemplateStateLegality({
  ...state.state,
  primary_support_strength: 0.1,
});
assert(thinSupport.legality !== L10TemplateLegalityClass.CLEAN,
  'C.10 thin primary support fails CLEAN');
assert(thinSupport.issues.some(
  i => i.code === V.STATE_SUPPORT_GAP_UNDER_CLEAN),
  'C.11 state support-gap code emitted');

// Rollout disabled → UNSUPPORTED.
const disabled = validateL10TemplateStateLegality({
  ...state.state,
  is_production_enabled: false,
});
assert(disabled.legality === L10TemplateLegalityClass.UNSUPPORTED,
  'C.12 disabled rollout classified UNSUPPORTED');
assert(disabled.issues.some(i => i.code === V.ROLLOUT_FAMILY_NOT_READY),
  'C.13 rollout-not-ready code emitted');

// Forbidden regime → BLOCKED (if hostile_regime_blocks) or NARROWED.
const forbidden = state.template.regime_posture.forbidden_regime_classes[0];
const hostile = validateL10TemplateStateLegality({
  ...state.state,
  observed_regime_class: forbidden ?? 'HOSTILE_REGIME',
});
assert(hostile.legality === L10TemplateLegalityClass.NARROWED ||
  hostile.legality === L10TemplateLegalityClass.BLOCKED,
  'C.14 forbidden regime drops legality');

// Incompatible sequence → narrow or block.
const badSeq = 'LATE_STAGE_REFLEXIVITY';
const incompat = validateL10TemplateStateLegality({
  ...state.state,
  observed_sequence_class: badSeq,
});
// Only fires if badSeq is forbidden for the template; otherwise the
// green state remains CLEAN. For the Genuine template, LATE_STAGE is
// forbidden, so this must downgrade.
assert(incompat.legality !== L10TemplateLegalityClass.CLEAN,
  'C.15 incompatible sequence class narrows or blocks');

// Competition closed → NARROWED (requires_competition_live default).
const closedCompetition = validateL10TemplateStateLegality({
  ...state.state,
  competition_live: false,
});
assert(closedCompetition.legality === L10TemplateLegalityClass.NARROWED,
  'C.16 closed competition drops to NARROWED');

// ═══════════════════════════════════════════════════════════════
// BAND D — Rollout doctrine
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Rollout doctrine ═══');

assert(ALL_L10_HYPOTHESIS_ROLLOUT_PHASES.length === 5,
  'D.01 five rollout phases canonical');
assert(L10_HYPOTHESIS_ROLLOUT_ORDER.length === 5,
  'D.02 rollout order has five phases');
assert(L10_HYPOTHESIS_ROLLOUT_ORDER[0] === L10HypothesisRolloutPhase.P1_CORE,
  'D.03 rollout starts at P1_CORE');
assert(L10_HYPOTHESIS_ROLLOUT_ORDER[4] ===
  L10HypothesisRolloutPhase.P5_RELATIONAL_EXPLANATION,
  'D.04 rollout ends at P5_RELATIONAL_EXPLANATION');

// Green rollout passes.
const greenRollout = validateL10FamilyRolloutState({
  entries: rollout.entries,
  certified_families: rollout.certified_families,
});
assert(greenRollout.ok,
  `D.05 green rollout validates (${greenRollout.issues.map(i => i.code).join(',')})`);
assert(greenRollout.legality === L10TemplateLegalityClass.CLEAN,
  'D.06 green rollout classified CLEAN');

// Missing canonical family rejected.
const missingEntry = rollout.entries.filter(
  e => e.family_id !== L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
);
const missingRep = validateL10FamilyRolloutState({
  entries: missingEntry,
  certified_families: rollout.certified_families,
});
assert(missingRep.issues.some(
  i => i.code === V.ROLLOUT_ENABLE_WITHOUT_BACKING),
  'D.07 canonical family without rollout entry rejected');

// Declared phase disagreeing with canonical rejected.
const wrongPhaseEntries = rollout.entries.map(e =>
  e.family_id === L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND
    ? { ...e, rollout_phase: L10HypothesisRolloutPhase.P5_RELATIONAL_EXPLANATION }
    : e,
);
const wrongPhaseEntriesRep = validateL10FamilyRolloutState({
  entries: wrongPhaseEntries,
  certified_families: rollout.certified_families,
});
assert(wrongPhaseEntriesRep.issues.some(
  i => i.code === V.ROLLOUT_PHASE_UNREGISTERED),
  'D.08 rollout phase disagreement with canonical rejected');

// ENABLED with a false gate rejected.
const ungated = rollout.entries.map(e =>
  e.family_id === L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND
    ? { ...e, gate_flags: { ...e.gate_flags, certification_green: false } }
    : e,
);
const ungatedRep = validateL10FamilyRolloutState({
  entries: ungated,
  certified_families: rollout.certified_families,
});
assert(ungatedRep.issues.some(i => i.code === V.ROLLOUT_FAMILY_NOT_READY),
  'D.09 ENABLED with non-green gate rejected');

// ENABLED without recorded certification rejected.
const noCert = new Set<L10HypothesisFamilyId>(rollout.certified_families);
noCert.delete(L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND);
const noCertRep = validateL10FamilyRolloutState({
  entries: rollout.entries,
  certified_families: noCert,
});
assert(noCertRep.issues.some(
  i => i.code === V.ROLLOUT_MISSING_CERTIFICATION),
  'D.10 ENABLED without recorded certification rejected');

// Out-of-order enablement rejected.
const outOfOrder = rollout.entries.map(e =>
  e.family_id === L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND
    ? { ...e, lifecycle_stage: L10RolloutLifecycleStage.DRAFT }
    : e,
);
const outOfOrderRep = validateL10FamilyRolloutState({
  entries: outOfOrder,
  certified_families: (() => {
    const s = new Set(rollout.certified_families);
    s.delete(L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND);
    return s;
  })(),
});
assert(outOfOrderRep.issues.some(
  i => i.code === V.ROLLOUT_ENABLE_OUT_OF_ORDER),
  'D.11 P2+ ENABLED while P1 not ENABLED rejected');

// Predecessor not ENABLED rejected.
const p2Family = L10HypothesisFamilyId.LEVERAGE_SQUEEZE;
const predMissing = rollout.entries.map(e =>
  e.family_id === p2Family
    ? { ...e, required_predecessors: [L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY] }
    : e,
);
const predRep = validateL10FamilyRolloutState({
  entries: predMissing,
  certified_families: rollout.certified_families,
});
// MANIPULATION (P4) ENABLED, but listing it as predecessor when P2 is
// ENABLED is vacuously satisfied. Instead make a non-enabled predecessor.
const badPred = rollout.entries.map(e => {
  if (e.family_id === L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY) {
    return { ...e, lifecycle_stage: L10RolloutLifecycleStage.DRAFT };
  }
  if (e.family_id === p2Family) {
    return { ...e, required_predecessors:
      [L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY] };
  }
  return e;
});
const badPredCert = new Set(rollout.certified_families);
badPredCert.delete(L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY);
const badPredRep = validateL10FamilyRolloutState({
  entries: badPred,
  certified_families: badPredCert,
});
assert(badPredRep.issues.some(
  i => i.code === V.ROLLOUT_ENABLE_OUT_OF_ORDER),
  'D.12 missing ENABLED predecessor rejected');
void predRep;

// Duplicate rollout entry rejected.
const dupEntries = [...rollout.entries, rollout.entries[0]];
const dupEntriesRep = validateL10FamilyRolloutState({
  entries: dupEntries,
  certified_families: rollout.certified_families,
});
assert(dupEntriesRep.issues.some(i => i.code === V.ROLLOUT_DUPLICATE_ENTRY),
  'D.13 duplicate rollout entry rejected');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit + invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit + invariants ═══');

// Severity classification.
assert(
  classifyL10FamilyAuditSeverity(V.STATE_BLOCKER_CONDITION_PRESENT) ===
    L10FamilyAuditSeverity.CRITICAL,
  'E.01 state-blocker classified CRITICAL');
assert(
  classifyL10FamilyAuditSeverity(V.TEMPLATE_FAMILY_MISMATCH) ===
    L10FamilyAuditSeverity.HIGH,
  'E.02 template family mismatch classified HIGH');
assert(
  classifyL10FamilyAuditSeverity(V.STATE_CONTRADICTION_FORCES_NARROW) ===
    L10FamilyAuditSeverity.WARNING,
  'E.03 narrowing code classified WARNING');

// Legality folding: BLOCKED beats all.
assert(
  foldL10FamilyLegality([
    V.STATE_BLOCKER_CONDITION_PRESENT,
    V.STATE_CONTRADICTION_FORCES_NARROW,
  ]) === L10TemplateLegalityClass.BLOCKED,
  'E.04 legality fold: BLOCKED dominates NARROWED');
assert(
  foldL10FamilyLegality([
    V.TEMPLATE_FAMILY_MISMATCH,
    V.STATE_CONTRADICTION_FORCES_NARROW,
  ]) === L10TemplateLegalityClass.INVALID,
  'E.05 legality fold: INVALID dominates NARROWED');
assert(
  foldL10FamilyLegality([]) === L10TemplateLegalityClass.CLEAN,
  'E.06 empty code set is CLEAN');
assert(
  classifyL10FamilyCode(V.STATE_MISSING_REQUIRED_CONFIRMATION) ===
    L10TemplateLegalityClass.NARROWED,
  'E.07 code classification: missing confirmation → NARROWED');

// Audit emission — green pipeline emits zero records.
const greenAudit = buildL10FamilyAuditRecords({
  surface: L10FamilyAuditSurface.FAMILY_DEFINITION,
  report: famBatch,
});
assert(greenAudit.length === 0,
  'E.08 green family batch emits zero audit records');

const greenTplAudit = buildL10FamilyAuditRecords({
  surface: L10FamilyAuditSurface.TEMPLATE_DEFINITION,
  report: tplBatch,
});
assert(greenTplAudit.length === 0,
  'E.09 green template batch emits zero audit records');

const greenRolloutAudit = buildL10FamilyAuditRecords({
  surface: L10FamilyAuditSurface.ROLLOUT_STATE,
  report: greenRollout,
});
assert(greenRolloutAudit.length === 0,
  'E.10 green rollout emits zero audit records');

// Perturbed surface emits audit records with expected severities.
const blockedAudit = buildL10FamilyAuditRecords({
  surface: L10FamilyAuditSurface.STATE_LEGALITY,
  report: blocked,
});
const blockedSummary = summariseL10FamilyAudit(blockedAudit);
assert(blockedSummary.total > 0,
  'E.11 perturbed state produces audit records');
assert(blockedSummary.by_severity[L10FamilyAuditSeverity.CRITICAL] > 0,
  'E.12 blocking state produces CRITICAL records');
assert(blockedSummary.by_legality[L10TemplateLegalityClass.BLOCKED] > 0,
  'E.13 blocked records carry BLOCKED legality');
assert(!blockedSummary.all_clean,
  'E.14 perturbed summary is not all_clean');

const greenSummary = summariseL10FamilyAudit(greenAudit);
assert(greenSummary.all_clean,
  'E.15 green summary reports all_clean');

// Invariants (INV-10.6-A..G).
const invariantResults = runAllL10_6Invariants();
assert(invariantResults.length === 7,
  'E.16 seven invariants run');
for (let i = 0; i < invariantResults.length; i++) {
  const r = invariantResults[i];
  const letter = String.fromCharCode('A'.charCodeAt(0) + i);
  assert(r.holds, `E.${17 + i} ${r.id} (INV-10.6-${letter}) — ${r.evidence}`);
}

// Cross-check individual invariant getters.
assert(checkINV_106_A().holds, 'E.24 checkINV_106_A() holds');
assert(checkINV_106_B().holds, 'E.25 checkINV_106_B() holds');
assert(checkINV_106_C().holds, 'E.26 checkINV_106_C() holds');
assert(checkINV_106_D().holds, 'E.27 checkINV_106_D() holds');
assert(checkINV_106_E().holds, 'E.28 checkINV_106_E() holds');
assert(checkINV_106_F().holds, 'E.29 checkINV_106_F() holds');
assert(checkINV_106_G().holds, 'E.30 checkINV_106_G() holds');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`L10.6 certification: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
