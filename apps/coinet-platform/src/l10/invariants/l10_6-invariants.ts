/**
 * L10.6 — Family / Template Invariants
 *
 * §10.6.15.2 — INV-10.6-A through INV-10.6-G, all executable.
 *
 *   INV-10.6-A : Every production template belongs to exactly one
 *                registered family, and each family's declared
 *                `legal_templates` matches the canonical mapping
 *                (`L10_TEMPLATE_TO_FAMILY`) exactly — no drift.
 *   INV-10.6-B : Every template's support / contradiction domains
 *                and scope types are a subset of its owning family's
 *                legal sets (no cross-family leakage).
 *   INV-10.6-C : Every template declares at least one
 *                upgrade-critical confirmation, so clean emission
 *                can never be unconditional (§10.6.3.4).
 *   INV-10.6-D : State-legality honours blockers, narrowing, and
 *                rollout gating: active blocking contradiction,
 *                active invalidation, hostile regime, or missing
 *                upgrade-critical confirmation force BLOCKED /
 *                NARROWED; disabled rollout forces UNSUPPORTED.
 *   INV-10.6-E : Every template declares an explicit regime posture
 *                AND an explicit sequence posture — L8 / L9 posture
 *                cannot be silently ignored (§10.6.13).
 *   INV-10.6-F : Rollout doctrine: a family may not be ENABLED
 *                unless its gates are green, certification is
 *                recorded, phase ordering is respected, and all
 *                required predecessors are ENABLED (§10.6.11.4).
 *   INV-10.6-G : Family semantic overlap guard: no family may list
 *                the same counterparty as both `coexists_with` and
 *                `incompatible_with`, nor list itself.
 */

import {
  buildGreenL10_6DefinitionFixture,
  buildGreenL10_6RolloutFixture,
  buildGreenL10_6TemplateStateFixture,
  GreenL10_6DefinitionFixture,
  GreenL10_6RolloutFixture,
  GreenL10_6TemplateStateFixture,
} from './l10_6-fixtures';
import {
  validateL10FamilyDefinition,
  validateL10FamilyDefinitionBatch,
} from '../validation/l10-family-definition.validator';
import {
  validateL10TemplateDefinitionBatch,
} from '../validation/l10-template-definition.validator';
import {
  validateL10FamilyRolloutState,
} from '../validation/l10-family-rollout-state.validator';
import {
  validateL10TemplateStateLegality,
} from '../validation/l10-template-state-legality.validator';
import {
  L10FamilyViolationCode,
  L10HypothesisFamilyId,
  L10HypothesisRolloutPhase,
  L10HypothesisTemplateId,
  L10TemplateContradictionDomain,
  L10TemplateLegalityClass,
  L10TemplateSupportDomain,
  L10_TEMPLATE_TO_FAMILY,
  getL10ProductionTemplatesForFamily,
} from '../contracts/hypothesis-template-policy';
import {
  L10RolloutLifecycleStage,
} from '../contracts/hypothesis-family-rollout';
import type {
  L10HypothesisFamilyDefinition,
} from '../contracts/hypothesis-family-definition';
import type {
  L10HypothesisTemplateDefinition,
} from '../contracts/hypothesis-template-definition';

export interface L10_6InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ──────────────────────────────────────────────────────────────────
// §10.6.15.2 — Green-pipeline predicate
// ──────────────────────────────────────────────────────────────────

/**
 * Green-pipeline predicate: every validator must return `ok` on the
 * canonical green fixtures. Each invariant reuses this to assert that
 * legal inputs *never* fail.
 */
function greenPipelineOk(
  defs: GreenL10_6DefinitionFixture,
  rollout: GreenL10_6RolloutFixture,
  state: GreenL10_6TemplateStateFixture,
): { ok: boolean; detail: string } {
  const famBatch = validateL10FamilyDefinitionBatch(defs.families);
  if (!famBatch.ok) {
    return { ok: false, detail: `family: ${codes(famBatch.issues)}` };
  }

  const famMap = new Map<string, L10HypothesisFamilyDefinition>();
  for (const f of defs.families) famMap.set(f.family_id, f);
  const tplBatch = validateL10TemplateDefinitionBatch(defs.templates, famMap);
  if (!tplBatch.ok) {
    return { ok: false, detail: `template: ${codes(tplBatch.issues)}` };
  }

  const rolloutRep = validateL10FamilyRolloutState({
    entries: rollout.entries,
    certified_families: rollout.certified_families,
  });
  if (!rolloutRep.ok) {
    return { ok: false, detail: `rollout: ${codes(rolloutRep.issues)}` };
  }

  const stateRep = validateL10TemplateStateLegality(state.state);
  if (!stateRep.ok || stateRep.legality !== L10TemplateLegalityClass.CLEAN) {
    return {
      ok: false,
      detail: `state: legality=${stateRep.legality}, ${codes(stateRep.issues)}`,
    };
  }

  return { ok: true, detail: 'green pipeline: all four surfaces pass' };
}

function codes(issues: readonly { code: string }[]): string {
  return issues.map(i => i.code).join(',');
}

// ──────────────────────────────────────────────────────────────────
// INV-10.6-A — Canonical template → family mapping is enforced.
// ──────────────────────────────────────────────────────────────────

export function checkINV_106_A(): L10_6InvariantResult {
  const defs = buildGreenL10_6DefinitionFixture();
  const rollout = buildGreenL10_6RolloutFixture();
  const state = buildGreenL10_6TemplateStateFixture();
  const base = greenPipelineOk(defs, rollout, state);

  // Every canonical template must resolve to exactly one family via
  // the frozen mapping, and the family roster must match exactly.
  let canonicalExact = true;
  for (const f of defs.families) {
    const canonical = new Set(getL10ProductionTemplatesForFamily(f.family_id));
    const declared = new Set(f.legal_templates);
    if (canonical.size !== declared.size) {
      canonicalExact = false;
      break;
    }
    for (const t of canonical) {
      if (!declared.has(t)) { canonicalExact = false; break; }
    }
  }

  // A family whose template roster drifts is rejected.
  const drifted: L10HypothesisFamilyDefinition = {
    ...defs.families[0],
    legal_templates: [L10HypothesisTemplateId.LEVERAGE_DRIVEN_SQUEEZE],
  };
  const drift = validateL10FamilyDefinition(drifted);
  const rejectsDrift = drift.issues.some(
    i => i.code === L10FamilyViolationCode.FAMILY_TEMPLATE_LIST_DRIFT,
  );

  // A template whose family disagrees with the canonical mapping is
  // rejected.
  const misbound: L10HypothesisTemplateDefinition = {
    ...defs.templates[0],
    hypothesis_family: L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
  };
  const famMap = new Map<string, L10HypothesisFamilyDefinition>(
    defs.families.map(f => [f.family_id, f]),
  );
  const mis = validateL10TemplateDefinitionBatch([misbound], famMap);
  const rejectsMisbind = mis.issues.some(
    i => i.code === L10FamilyViolationCode.TEMPLATE_FAMILY_MISMATCH,
  );

  // Sanity: the frozen mapping must also cover every template id.
  const mappingCoversAll = defs.templates.every(
    t => L10_TEMPLATE_TO_FAMILY[t.template_id] === t.hypothesis_family,
  );

  return {
    id: 'INV-10.6-A',
    name: 'Template ↔ family mapping is canonical and exact.',
    holds:
      base.ok && canonicalExact && rejectsDrift && rejectsMisbind && mappingCoversAll,
    evidence: base.ok
      ? `green ok; canonical=${canonicalExact}, drift=${rejectsDrift}, ` +
        `misbind=${rejectsMisbind}, mapping-covers=${mappingCoversAll}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.6-B — Template domains ⊆ owning family's legal sets.
// ──────────────────────────────────────────────────────────────────

export function checkINV_106_B(): L10_6InvariantResult {
  const defs = buildGreenL10_6DefinitionFixture();
  const rollout = buildGreenL10_6RolloutFixture();
  const state = buildGreenL10_6TemplateStateFixture();
  const base = greenPipelineOk(defs, rollout, state);

  // Perturbation A: a support domain not in the owning family's set.
  const famMap = new Map<string, L10HypothesisFamilyDefinition>(
    defs.families.map(f => [f.family_id, f]),
  );
  const tplA = defs.templates[0];
  const unsupported: L10HypothesisTemplateDefinition = {
    ...tplA,
    support_requirement: {
      ...tplA.support_requirement,
      required_support_domains: [
        ...tplA.support_requirement.required_support_domains,
        L10TemplateSupportDomain.FABRICATED_PARTICIPATION_SIGNAL,
      ],
    },
  };
  const a = validateL10TemplateDefinitionBatch([unsupported], famMap);
  const rejectsSupport = a.issues.some(
    i =>
      i.code ===
      L10FamilyViolationCode.TEMPLATE_SUPPORT_DOMAIN_NOT_IN_FAMILY,
  );

  // Perturbation B: a contradiction domain not in the owning family's set.
  const badContradiction: L10HypothesisTemplateDefinition = {
    ...tplA,
    contradiction_requirement: {
      ...tplA.contradiction_requirement,
      required_contradiction_domains: [
        ...tplA.contradiction_requirement.required_contradiction_domains,
        L10TemplateContradictionDomain.CLEAN_DEMAND_EVIDENCE,
      ],
    },
  };
  const b = validateL10TemplateDefinitionBatch([badContradiction], famMap);
  const rejectsContradiction = b.issues.some(
    i =>
      i.code ===
      L10FamilyViolationCode.TEMPLATE_CONTRADICTION_DOMAIN_NOT_IN_FAMILY,
  );

  // Perturbation C: an applicable scope type not legal for the family.
  const badScope: L10HypothesisTemplateDefinition = {
    ...tplA,
    applicable_scope_types: ['NARRATIVE_CLUSTER'],
  };
  const c = validateL10TemplateDefinitionBatch([badScope], famMap);
  const rejectsScope = c.issues.some(
    i =>
      i.code ===
      L10FamilyViolationCode.TEMPLATE_ILLEGAL_SCOPE_FOR_FAMILY,
  );

  return {
    id: 'INV-10.6-B',
    name: 'Template domains are a subset of owning family.',
    holds: base.ok && rejectsSupport && rejectsContradiction && rejectsScope,
    evidence: base.ok
      ? `green ok; bad-support=${rejectsSupport}, ` +
        `bad-contradiction=${rejectsContradiction}, bad-scope=${rejectsScope}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.6-C — Every template has an upgrade-critical confirmation.
// ──────────────────────────────────────────────────────────────────

export function checkINV_106_C(): L10_6InvariantResult {
  const defs = buildGreenL10_6DefinitionFixture();
  const rollout = buildGreenL10_6RolloutFixture();
  const state = buildGreenL10_6TemplateStateFixture();
  const base = greenPipelineOk(defs, rollout, state);

  // Every canonical template declares ≥1 upgrade-critical confirmation.
  const allCritical = defs.templates.every(
    t => t.required_confirmations.some(c => c.is_upgrade_critical),
  );

  // Perturbation: strip upgrade-critical from every confirmation.
  const tpl0 = defs.templates[0];
  const stripped: L10HypothesisTemplateDefinition = {
    ...tpl0,
    required_confirmations: tpl0.required_confirmations.map(c => ({
      ...c,
      is_upgrade_critical: false,
    })),
  };
  const famMap = new Map<string, L10HypothesisFamilyDefinition>(
    defs.families.map(f => [f.family_id, f]),
  );
  const rep = validateL10TemplateDefinitionBatch([stripped], famMap);
  const rejectsStrip = rep.issues.some(
    i =>
      i.code ===
      L10FamilyViolationCode.TEMPLATE_MISSING_CONFIRMATIONS,
  );

  return {
    id: 'INV-10.6-C',
    name: 'Every template declares an upgrade-critical confirmation.',
    holds: base.ok && allCritical && rejectsStrip,
    evidence: base.ok
      ? `green ok; all-critical=${allCritical}, strip-rejected=${rejectsStrip}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.6-D — State-legality honours blockers, narrowing, rollout.
// ──────────────────────────────────────────────────────────────────

export function checkINV_106_D(): L10_6InvariantResult {
  const defs = buildGreenL10_6DefinitionFixture();
  const rollout = buildGreenL10_6RolloutFixture();
  const state = buildGreenL10_6TemplateStateFixture();
  const base = greenPipelineOk(defs, rollout, state);

  // (1) Active blocking contradiction forces BLOCKED.
  const blockingDom =
    state.template.contradiction_requirement.blocking_domains[0];
  const blocked = validateL10TemplateStateLegality({
    ...state.state,
    active_blocking_contradiction_domains: [blockingDom],
  });
  const isBlocked = blocked.legality === L10TemplateLegalityClass.BLOCKED;

  // (2) Missing upgrade-critical confirmation → NARROWED (or BLOCKED
  // depending on blocker_law; the green template's blocker_law allows
  // narrowing under missing critical).
  const critical = state.template.required_confirmations.find(
    c => c.is_upgrade_critical,
  );
  const presentRefs = new Set<string>(state.state.present_confirmation_refs);
  if (critical) presentRefs.delete(critical.confirmation_ref);
  const narrowedByMissing = validateL10TemplateStateLegality({
    ...state.state,
    present_confirmation_refs: presentRefs,
  });
  const missingDrops =
    narrowedByMissing.legality === L10TemplateLegalityClass.NARROWED ||
    narrowedByMissing.legality === L10TemplateLegalityClass.BLOCKED;

  // (3) Disabled rollout forces UNSUPPORTED.
  const unsupported = validateL10TemplateStateLegality({
    ...state.state,
    is_production_enabled: false,
  });
  const isUnsupported =
    unsupported.legality === L10TemplateLegalityClass.UNSUPPORTED;

  // (4) Narrowing contradiction forces NARROWED.
  const narrowingDom =
    state.template.contradiction_requirement.narrowing_domains[0];
  const narrowed = validateL10TemplateStateLegality({
    ...state.state,
    active_narrowing_contradiction_domains: [narrowingDom],
  });
  const isNarrowed = narrowed.legality === L10TemplateLegalityClass.NARROWED;

  return {
    id: 'INV-10.6-D',
    name: 'State-legality: blockers, narrowing, rollout all honoured.',
    holds:
      base.ok && isBlocked && missingDrops && isUnsupported && isNarrowed,
    evidence: base.ok
      ? `green ok; blocked=${isBlocked}, missing-drops=${missingDrops}, ` +
        `unsupported=${isUnsupported}, narrowed=${isNarrowed}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.6-E — Every template declares regime AND sequence posture.
// ──────────────────────────────────────────────────────────────────

export function checkINV_106_E(): L10_6InvariantResult {
  const defs = buildGreenL10_6DefinitionFixture();
  const rollout = buildGreenL10_6RolloutFixture();
  const state = buildGreenL10_6TemplateStateFixture();
  const base = greenPipelineOk(defs, rollout, state);

  // Every template declares explicit regime + sequence posture.
  const allDeclare = defs.templates.every(
    t => !!t.regime_posture && !!t.sequence_posture,
  );

  // Perturbation: strip regime_posture.
  const tpl0 = defs.templates[0];
  const noRegime: L10HypothesisTemplateDefinition = {
    ...tpl0,
    regime_posture: undefined as unknown as typeof tpl0.regime_posture,
  };
  const famMap = new Map<string, L10HypothesisFamilyDefinition>(
    defs.families.map(f => [f.family_id, f]),
  );
  const repR = validateL10TemplateDefinitionBatch([noRegime], famMap);
  const rejectsRegime = repR.issues.some(
    i =>
      i.code ===
      L10FamilyViolationCode.TEMPLATE_MISSING_REGIME_POSTURE,
  );

  // Perturbation: strip sequence_posture.
  const noSeq: L10HypothesisTemplateDefinition = {
    ...tpl0,
    sequence_posture: undefined as unknown as typeof tpl0.sequence_posture,
  };
  const repS = validateL10TemplateDefinitionBatch([noSeq], famMap);
  const rejectsSeq = repS.issues.some(
    i =>
      i.code ===
      L10FamilyViolationCode.TEMPLATE_MISSING_SEQUENCE_POSTURE,
  );

  return {
    id: 'INV-10.6-E',
    name: 'Regime + sequence posture always declared.',
    holds: base.ok && allDeclare && rejectsRegime && rejectsSeq,
    evidence: base.ok
      ? `green ok; all-declare=${allDeclare}, ` +
        `regime-strip=${rejectsRegime}, sequence-strip=${rejectsSeq}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.6-F — Rollout doctrine: phase ordering + gates + certification.
// ──────────────────────────────────────────────────────────────────

export function checkINV_106_F(): L10_6InvariantResult {
  const defs = buildGreenL10_6DefinitionFixture();
  const rollout = buildGreenL10_6RolloutFixture();
  const state = buildGreenL10_6TemplateStateFixture();
  const base = greenPipelineOk(defs, rollout, state);

  // Perturbation 1: enable phase-2 family while phase-1 remains DRAFT.
  const p1 = rollout.entries.find(
    e => e.rollout_phase === L10HypothesisRolloutPhase.P1_CORE,
  );
  const outOfOrder = rollout.entries.map(e => {
    if (e.family_id === p1!.family_id) {
      return { ...e, lifecycle_stage: L10RolloutLifecycleStage.DRAFT };
    }
    return e;
  });
  const certifiedMinusP1 = new Set(rollout.certified_families);
  certifiedMinusP1.delete(p1!.family_id);
  const repOrd = validateL10FamilyRolloutState({
    entries: outOfOrder,
    certified_families: certifiedMinusP1,
  });
  const rejectsOrder = repOrd.issues.some(
    i => i.code === L10FamilyViolationCode.ROLLOUT_ENABLE_OUT_OF_ORDER,
  );

  // Perturbation 2: ENABLED but a gate flag is false.
  const ungated = rollout.entries.map(e =>
    e.family_id === p1!.family_id
      ? {
          ...e,
          gate_flags: { ...e.gate_flags, certification_green: false },
        }
      : e,
  );
  const repGated = validateL10FamilyRolloutState({
    entries: ungated,
    certified_families: rollout.certified_families,
  });
  const rejectsUngated = repGated.issues.some(
    i => i.code === L10FamilyViolationCode.ROLLOUT_FAMILY_NOT_READY,
  );

  // Perturbation 3: ENABLED without recorded certification.
  const noCert = new Set<L10HypothesisFamilyId>(rollout.certified_families);
  noCert.delete(p1!.family_id);
  const repCert = validateL10FamilyRolloutState({
    entries: rollout.entries,
    certified_families: noCert,
  });
  const rejectsNoCert = repCert.issues.some(
    i => i.code === L10FamilyViolationCode.ROLLOUT_MISSING_CERTIFICATION,
  );

  return {
    id: 'INV-10.6-F',
    name: 'Rollout doctrine: phase ordering + gates + certification.',
    holds: base.ok && rejectsOrder && rejectsUngated && rejectsNoCert,
    evidence: base.ok
      ? `green ok; order=${rejectsOrder}, gated=${rejectsUngated}, ` +
        `cert=${rejectsNoCert}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// INV-10.6-G — Family semantic overlap guard.
// ──────────────────────────────────────────────────────────────────

export function checkINV_106_G(): L10_6InvariantResult {
  const defs = buildGreenL10_6DefinitionFixture();
  const rollout = buildGreenL10_6RolloutFixture();
  const state = buildGreenL10_6TemplateStateFixture();
  const base = greenPipelineOk(defs, rollout, state);

  const fam0 = defs.families[0];
  const other = defs.families[1].family_id;

  // Perturbation A: list the same counterparty in both coexists and incompatible.
  const doubleBooked: L10HypothesisFamilyDefinition = {
    ...fam0,
    coexists_with: [...fam0.coexists_with, other],
    incompatible_with: [...fam0.incompatible_with, other],
  };
  const repA = validateL10FamilyDefinition(doubleBooked);
  const rejectsDouble = repA.issues.some(
    i => i.code === L10FamilyViolationCode.FAMILY_SEMANTIC_OVERLAP,
  );

  // Perturbation B: list self in coexists.
  const selfCoexist: L10HypothesisFamilyDefinition = {
    ...fam0,
    coexists_with: [...fam0.coexists_with, fam0.family_id],
  };
  const repB = validateL10FamilyDefinition(selfCoexist);
  const rejectsSelf = repB.issues.some(
    i => i.code === L10FamilyViolationCode.FAMILY_SEMANTIC_OVERLAP,
  );

  return {
    id: 'INV-10.6-G',
    name: 'Family coexists / incompatible sets are mutually exclusive.',
    holds: base.ok && rejectsDouble && rejectsSelf,
    evidence: base.ok
      ? `green ok; double=${rejectsDouble}, self=${rejectsSelf}`
      : base.detail,
  };
}

// ──────────────────────────────────────────────────────────────────
// Invariant batch runner
// ──────────────────────────────────────────────────────────────────

export function runAllL10_6Invariants(): readonly L10_6InvariantResult[] {
  return [
    checkINV_106_A(),
    checkINV_106_B(),
    checkINV_106_C(),
    checkINV_106_D(),
    checkINV_106_E(),
    checkINV_106_F(),
    checkINV_106_G(),
  ];
}
