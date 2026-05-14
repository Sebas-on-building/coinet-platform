/**
 * L12.5 — Scenario Templates / Trigger Law / Invalidation Law /
 *         Path Confidence / Spread / Readiness
 * Certification Test Suite (§12.5.24)
 *
 *   Band A — Template registry and production completeness
 *   Band B — Specific production templates
 *   Band C — Trigger and invalidation strength
 *   Band D — Path confidence, spread, readiness
 *   Band E — Audit and invariants
 */

import {
  L12_CHOP_UNRESOLVED_MULTI_PATH_V1,
  L12_DISTRIBUTION_UNDER_HYPE_REVERSAL_V1,
  L12_LEVERAGE_DRIVEN_CONTINUATION_WITH_FRAGILITY_V1,
  L12_NARRATIVE_REFLEXIVE_EXTENSION_V1,
  L12_POST_UNLOCK_DIGESTION_V1,
  L12_SPOT_LED_CONTINUATION_V1,
  L12_THIN_LIQUIDITY_FAILURE_V1,
  L12_CANONICAL_PRODUCTION_TEMPLATES,
  bootstrapL12ProductionTemplateRegistry,
} from '../l12/templates';

import {
  L12ScenarioTemplateProductionStatus,
} from '../l12/contracts/scenario-template';
import {
  L12InvalidationEffect,
  L12InvalidationStatus,
} from '../l12/contracts/scenario-invalidation';
import { L12InvalidationStrengthBand } from '../l12/contracts/invalidation-strength-profile';
import {
  L12PathConfidenceCapReason,
} from '../l12/contracts/path-confidence-cap-chain';
import {
  L12_DEFAULT_PATH_CONFIDENCE_WEIGHTS,
  L12PathConfidenceFactorGroup,
} from '../l12/contracts/path-confidence-policy';
import {
  L12ScenarioTemplateReadinessClass,
} from '../l12/contracts/scenario-template-readiness';
import {
  L12TriggerEffect,
  L12TriggerStatus,
} from '../l12/contracts/scenario-trigger';
import {
  L12TriggerInvalidationInteractionClass,
  l12ResolveInteractionClass,
} from '../l12/contracts/trigger-invalidation-interaction';
import { L12TriggerStrengthBand } from '../l12/contracts/trigger-strength-profile';
import { L12ScenarioSpreadClass } from '../l12/contracts/scenario-set';

import {
  computeL12InvalidationStrengthProfile,
  computeL12PathConfidenceCapChain,
  computeL12ScenarioSpreadProfile,
  computeL12TriggerStrengthProfile,
  deriveL12ScenarioTemplateReadiness,
} from '../l12/engine';

import {
  L12_DEFAULT_PATH_CONFIDENCE_POLICY,
  clearL12ScenarioTemplateRegistry,
  listL12ProductionEnabledTemplates,
  listRegisteredL12ScenarioTemplates,
  registerL12ScenarioTemplate,
} from '../l12/registry';

import {
  L12TemplateViolationCode,
  validateL12InvalidationStrengthProfile,
  validateL12PathConfidenceCapChain,
  validateL12PathConfidencePolicy,
  validateL12ScenarioReadiness,
  validateL12ScenarioSpreadProfile,
  validateL12ScenarioTemplate,
  validateL12TemplateProductionReadiness,
  validateL12TriggerInvalidationInteraction,
  validateL12TriggerStrengthProfile,
} from '../l12/validation';

import {
  L12TemplateAuditSubjectClass,
  emitL12TemplateAuditRecords,
  getL12TemplateAuditLog,
  getL12TemplateCriticalViolations,
  getL12TemplateViolationsByCode,
  resetL12TemplateAuditLog,
  severityForL12TemplateViolationCode,
} from '../l12/constitution';

import { runAllL12_5Invariants } from '../l12/invariants/l12_5-invariants';

const POLICY = 'l12.5.test.v1';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean): void {
  if (cond) passed += 1;
  else {
    failed += 1;
    failures.push(name);
  }
}

function neutralFactors(): Record<L12PathConfidenceFactorGroup, number> {
  const r: Record<L12PathConfidenceFactorGroup, number> = {} as never;
  for (const f of Object.keys(L12_DEFAULT_PATH_CONFIDENCE_WEIGHTS) as L12PathConfidenceFactorGroup[]) {
    r[f] = 0.5;
  }
  return r;
}

resetL12TemplateAuditLog();

/* ─────────────── BAND A: Template registry and production completeness ─────────────── */
console.log('═══ BAND A: Template Registry and Production Completeness ═══');

(function bandA() {
  bootstrapL12ProductionTemplateRegistry();
  const all = listRegisteredL12ScenarioTemplates();
  const enabled = listL12ProductionEnabledTemplates();

  ok('A.01 7 canonical production templates registered', all.length === 7);
  ok('A.02 all production templates production-enabled', enabled.length === 7);

  // Duplicate rejection
  const dupRes = registerL12ScenarioTemplate(L12_SPOT_LED_CONTINUATION_V1);
  ok('A.03 duplicate template registration rejects', !dupRes.registered);

  // Family/type legality
  let allValid = true;
  for (const t of L12_CANONICAL_PRODUCTION_TEMPLATES) {
    const v = validateL12ScenarioTemplate(t);
    if (!v.ok) allValid = false;
  }
  ok('A.04 all canonical templates pass structural validation', allValid);

  // Production templates require triggers
  let allHaveTriggers = true;
  for (const t of enabled) if (t.trigger_patterns.length === 0) allHaveTriggers = false;
  ok('A.05 all production templates declare triggers', allHaveTriggers);

  // Production templates require invalidations
  let allHaveInv = true;
  for (const t of enabled) if (t.invalidation_patterns.length === 0) allHaveInv = false;
  ok('A.06 all production templates declare invalidations', allHaveInv);

  // L11 score-context required
  let allHaveScoreCtx = true;
  for (const t of enabled) {
    if (!t.required_evidence_classes.some(c => c.startsWith('L11_SCORE_CONTEXT'))) {
      allHaveScoreCtx = false;
    }
  }
  ok('A.07 all production templates require L11 score context', allHaveScoreCtx);

  // Reserved template cannot emit production
  const reserved = {
    ...L12_SPOT_LED_CONTINUATION_V1,
    template_id: ('SPOT_LED_CONTINUATION_V1' as never),
    production_status: L12ScenarioTemplateProductionStatus.RESERVED,
  };
  // Re-bootstrap with one reserved + rest production
  clearL12ScenarioTemplateRegistry();
  registerL12ScenarioTemplate(reserved);
  for (const t of L12_CANONICAL_PRODUCTION_TEMPLATES.slice(1)) registerL12ScenarioTemplate(t);
  const v = validateL12TemplateProductionReadiness({
    required_template_ids: L12_CANONICAL_PRODUCTION_TEMPLATES.map(t => t.template_id),
  });
  ok(
    'A.08 reserved template flagged as not production-enabled',
    v.issues.some(i => i.code === L12TemplateViolationCode.L12T_TEMPLATE_ID_MISSING),
  );

  // Restore
  bootstrapL12ProductionTemplateRegistry();

  // Determinism: rollout priority
  const e1 = listL12ProductionEnabledTemplates();
  const e2 = listL12ProductionEnabledTemplates();
  const sameOrder = e1.every((t, i) => t.template_id === e2[i].template_id);
  ok('A.09 production listing deterministic', sameOrder);
})();

/* ─────────────── BAND B: Specific production templates ─────────────── */
console.log('\n═══ BAND B: Specific Production Templates ═══');

(function bandB() {
  bootstrapL12ProductionTemplateRegistry();
  for (const t of [
    L12_SPOT_LED_CONTINUATION_V1,
    L12_LEVERAGE_DRIVEN_CONTINUATION_WITH_FRAGILITY_V1,
    L12_POST_UNLOCK_DIGESTION_V1,
    L12_THIN_LIQUIDITY_FAILURE_V1,
    L12_DISTRIBUTION_UNDER_HYPE_REVERSAL_V1,
    L12_NARRATIVE_REFLEXIVE_EXTENSION_V1,
    L12_CHOP_UNRESOLVED_MULTI_PATH_V1,
  ]) {
    const v = validateL12ScenarioTemplate(t);
    ok(`B.${t.template_id} passes structural validation`, v.ok);
    ok(`B.${t.template_id} declares triggers`, t.trigger_patterns.length > 0);
    ok(`B.${t.template_id} declares invalidations`, t.invalidation_patterns.length > 0);
    ok(`B.${t.template_id} declares legal types`, t.legal_scenario_types.length > 0);
  }

  // Crafted offender: drop trigger patterns
  const offender = { ...L12_SPOT_LED_CONTINUATION_V1, trigger_patterns: [] };
  const off = validateL12ScenarioTemplate(offender);
  ok(
    'B.OFFENDER no triggers rejected',
    !off.ok &&
      off.issues.some(i => i.code === L12TemplateViolationCode.L12T_TEMPLATE_TRIGGER_PATTERN_MISSING),
  );

  const offender2 = { ...L12_SPOT_LED_CONTINUATION_V1, invalidation_patterns: [] };
  const off2 = validateL12ScenarioTemplate(offender2);
  ok(
    'B.OFFENDER no invalidations rejected',
    !off2.ok &&
      off2.issues.some(i => i.code === L12TemplateViolationCode.L12T_TEMPLATE_INVALIDATION_PATTERN_MISSING),
  );
})();

/* ─────────────── BAND C: Trigger / invalidation strength ─────────────── */
console.log('\n═══ BAND C: Trigger / Invalidation Strength ═══');

(function bandC() {
  // Deterministic: same input → same hash
  const inp = {
    trigger_id: 'C.trg.1',
    scenario_id: 'C.scn',
    scenario_set_id: 'C.set',
    trigger_status: L12TriggerStatus.ACTIVE,
    expected_effect: L12TriggerEffect.STRENGTHENS_PRIMARY,
    trigger_evidence_quality: 0.8,
    trigger_freshness_score: 0.8,
    trigger_monitorability_score: 0.8,
    trigger_materiality_score: 0.8,
    contradiction_pressure_score: 0.1,
    score_context_support_score: 0.8,
    policy_version: POLICY,
  };
  const r1 = computeL12TriggerStrengthProfile(inp);
  const r2 = computeL12TriggerStrengthProfile(inp);
  ok('C.01 trigger strength deterministic', !!r1.profile && r1.profile.replay_hash === r2.profile?.replay_hash);

  // Decisive trigger with weak evidence: engine downgrades + validator rejects synthetic decisive
  const decisiveWeak = computeL12TriggerStrengthProfile({
    ...inp,
    trigger_evidence_quality: 0.2,
    trigger_monitorability_score: 0.9,
  });
  ok('C.02 decisive trigger with weak evidence is not decisive', decisiveWeak.profile?.trigger_strength_band !== L12TriggerStrengthBand.DECISIVE);

  const fakeDecisive = {
    ...(decisiveWeak.profile!),
    trigger_strength_band: L12TriggerStrengthBand.DECISIVE,
  };
  const v = validateL12TriggerStrengthProfile(fakeDecisive);
  ok(
    'C.03 validator rejects decisive band w/ weak evidence',
    !v.ok && v.issues.some(i => i.code === L12TemplateViolationCode.L12T_TRIGGER_DECISIVE_WITH_WEAK_EVIDENCE),
  );

  // Active invalidation requires cap
  const invR = computeL12InvalidationStrengthProfile({
    invalidation_id: 'C.inv.1',
    scenario_id: 'C.scn',
    scenario_set_id: 'C.set',
    invalidation_status: L12InvalidationStatus.ACTIVE,
    expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
    invalidation_evidence_quality: 0.8,
    invalidation_freshness_score: 0.8,
    invalidation_monitorability_score: 0.8,
    invalidation_materiality_score: 0.8,
    contradiction_pressure_score: 0.3,
    policy_version: POLICY,
  });
  ok('C.04 active invalidation requires cap', invR.profile?.confidence_cap_required === true);

  // Faked: active inv without cap → validator rejects
  const fakeNoCap = { ...(invR.profile!), confidence_cap_required: false };
  const v2 = validateL12InvalidationStrengthProfile(fakeNoCap);
  ok(
    'C.05 validator rejects active invalidation without cap',
    !v2.ok &&
      v2.issues.some(i => i.code === L12TemplateViolationCode.L12T_ACTIVE_INVALIDATION_WITHOUT_CONFIDENCE_CAP),
  );

  // Blocking invalidation interaction
  const cls = l12ResolveInteractionClass({
    triggerBand: L12TriggerStrengthBand.DECISIVE,
    invalidationBand: L12InvalidationStrengthBand.BLOCKING,
    invalidationActive: true,
  });
  ok('C.06 blocking invalidation dominates decisive trigger', cls === L12TriggerInvalidationInteractionClass.BLOCKED_BY_INVALIDATION);

  const offenderInteraction = validateL12TriggerInvalidationInteraction({
    interaction_record_id: 'C.rec',
    scenario_set_id: 'C.set',
    scenario_id: 'C.scn',
    trigger_id: 'C.trg',
    invalidation_id: 'C.inv',
    trigger_strength_band: L12TriggerStrengthBand.DECISIVE,
    invalidation_strength_band: L12InvalidationStrengthBand.BLOCKING,
    invalidation_active: true,
    invalidation_blocking: true,
    interaction_class: L12TriggerInvalidationInteractionClass.TRIGGER_DOMINANT,
    trigger_overrides_blocked_invalidation_attempted: true,
    lineage_refs: [],
    replay_hash: 'C.hash',
    policy_version: POLICY,
  });
  ok(
    'C.07 trigger-dominant under blocking invalidation rejected',
    !offenderInteraction.ok &&
      offenderInteraction.issues.some(
        i => i.code === L12TemplateViolationCode.L12T_INTERACTION_TRIGGER_DOMINANT_UNDER_BLOCKING,
      ),
  );

  // Out-of-range strength
  const fakeBad = { ...(invR.profile!), invalidation_strength_score: 5 };
  const vBad = validateL12InvalidationStrengthProfile(fakeBad);
  ok(
    'C.08 out-of-range invalidation score rejected',
    !vBad.ok &&
      vBad.issues.some(i => i.code === L12TemplateViolationCode.L12T_INVALIDATION_STRENGTH_OUT_OF_RANGE),
  );
})();

/* ─────────────── BAND D: Path confidence, spread, readiness ─────────────── */
console.log('\n═══ BAND D: Path Confidence, Spread, Readiness ═══');

(function bandD() {
  // Default policy weights legal
  const polV = validateL12PathConfidencePolicy(L12_DEFAULT_PATH_CONFIDENCE_POLICY);
  ok('D.01 default confidence policy weights legal', polV.ok);

  // Caps under each cap reason
  const factors = neutralFactors();

  const cases: ReadonlyArray<{
    flag: keyof Parameters<typeof computeL12PathConfidenceCapChain>[0];
    expected: L12PathConfidenceCapReason;
    name: string;
  }> = [
    { flag: 'l11_score_context_incomplete', expected: L12PathConfidenceCapReason.INCOMPLETE_L11_SCORE_CONTEXT, name: 'incomplete L11 score context blocks' },
    { flag: 'blocking_invalidation_present', expected: L12PathConfidenceCapReason.BLOCKING_INVALIDATION, name: 'blocking invalidation caps very-low' },
    { flag: 'active_invalidation_present', expected: L12PathConfidenceCapReason.ACTIVE_INVALIDATION, name: 'active invalidation caps low' },
    { flag: 'drift_material', expected: L12PathConfidenceCapReason.MATERIAL_DRIFT, name: 'material drift caps low' },
    { flag: 'contradiction_unresolved', expected: L12PathConfidenceCapReason.UNRESOLVED_CONTRADICTION, name: 'unresolved contradiction caps medium' },
    { flag: 'missing_visibility_material', expected: L12PathConfidenceCapReason.MISSING_VISIBILITY, name: 'missing visibility caps medium' },
    { flag: 'transition_risk_high', expected: L12PathConfidenceCapReason.HIGH_TRANSITION_RISK, name: 'high transition risk caps medium' },
    { flag: 'sequence_decay_dominant', expected: L12PathConfidenceCapReason.DOMINANT_SEQUENCE_DECAY, name: 'dominant decay caps medium' },
    { flag: 'hypothesis_spread_narrow', expected: L12PathConfidenceCapReason.NARROW_HYPOTHESIS_SPREAD, name: 'narrow hypothesis spread caps medium' },
    { flag: 'unresolved_trigger', expected: L12PathConfidenceCapReason.UNRESOLVED_TRIGGER, name: 'unresolved trigger caps medium' },
    { flag: 'thin_liquidity_fragility', expected: L12PathConfidenceCapReason.THIN_LIQUIDITY_FRAGILITY, name: 'thin liquidity caps medium' },
    { flag: 'insufficient_scenario_competition', expected: L12PathConfidenceCapReason.INSUFFICIENT_SCENARIO_COMPETITION, name: 'insufficient competition caps low' },
  ];
  for (const c of cases) {
    const inp = {
      scenario_set_id: 'D.set',
      scenario_id: `D.${c.flag}`,
      policy: L12_DEFAULT_PATH_CONFIDENCE_POLICY,
      factor_scores: factors,
      active_invalidation_present: false,
      blocking_invalidation_present: false,
      contradiction_unresolved: false,
      transition_risk_high: false,
      sequence_decay_dominant: false,
      hypothesis_spread_narrow: false,
      missing_visibility_material: false,
      drift_material: false,
      unresolved_trigger: false,
      thin_liquidity_fragility: false,
      l11_score_context_incomplete: false,
      insufficient_scenario_competition: false,
      policy_version: POLICY,
    } as Parameters<typeof computeL12PathConfidenceCapChain>[0];
    (inp as unknown as Record<string, unknown>)[c.flag as string] = true;
    const r = computeL12PathConfidenceCapChain(inp);
    ok(`D.cap.${c.expected} ${c.name}`, !!r.cap_chain && r.cap_chain.cap_reasons.includes(c.expected));
    ok(
      `D.cap.${c.expected} capped <= pre_cap`,
      !!r.cap_chain && r.cap_chain.capped_score <= r.cap_chain.pre_cap_score + 1e-9,
    );
  }

  // Faked over-cap → validator rejects
  const baseChain = computeL12PathConfidenceCapChain({
    scenario_set_id: 'D.set',
    scenario_id: 'D.fake',
    policy: L12_DEFAULT_PATH_CONFIDENCE_POLICY,
    factor_scores: factors,
    active_invalidation_present: false,
    blocking_invalidation_present: false,
    contradiction_unresolved: false,
    transition_risk_high: false,
    sequence_decay_dominant: false,
    hypothesis_spread_narrow: false,
    missing_visibility_material: false,
    drift_material: false,
    unresolved_trigger: false,
    thin_liquidity_fragility: false,
    l11_score_context_incomplete: false,
    insufficient_scenario_competition: false,
    policy_version: POLICY,
  }).cap_chain!;
  const tampered = { ...baseChain, capped_score: baseChain.pre_cap_score + 0.5 };
  const vT = validateL12PathConfidenceCapChain(tampered);
  ok(
    'D.cap.tamper capped > pre_cap rejected',
    !vT.ok && vT.issues.some(i => i.code === L12TemplateViolationCode.L12T_CAPPED_SCORE_EXCEEDS_PRE_CAP),
  );

  // Spread: narrow requires shift conditions
  const narrow = computeL12ScenarioSpreadProfile({
    scenario_set_id: 'D.spread.narrow',
    primary_scenario_ref: 'p',
    secondary_scenario_ref: 's',
    primary_confidence_score: 0.6,
    secondary_confidence_score: 0.55,
    active_invalidation_present: false,
    contradiction_unresolved: false,
    policy_version: POLICY,
  });
  ok(
    'D.spread.01 narrow spread requires shift conditions',
    narrow.profile?.shift_conditions_required === true,
  );

  // Spread: clear under active invalidation downgrades
  const fakeClear = computeL12ScenarioSpreadProfile({
    scenario_set_id: 'D.spread.clearInv',
    primary_scenario_ref: 'p',
    secondary_scenario_ref: 's',
    primary_confidence_score: 0.95,
    secondary_confidence_score: 0.10,
    active_invalidation_present: true,
    contradiction_unresolved: false,
    policy_version: POLICY,
  });
  ok(
    'D.spread.02 clear primary under active invalidation downgraded',
    fakeClear.profile?.spread_class !== L12ScenarioSpreadClass.CLEAR_PRIMARY,
  );

  // Faked clear under invalidation → validator rejects
  const tamperSpread = {
    ...(fakeClear.profile!),
    spread_class: L12ScenarioSpreadClass.CLEAR_PRIMARY,
    active_invalidation_present: true,
  };
  const vS = validateL12ScenarioSpreadProfile(tamperSpread);
  ok(
    'D.spread.03 clear primary under active invalidation rejected by validator',
    !vS.ok && vS.issues.some(i => i.code === L12TemplateViolationCode.L12T_CLEAR_PRIMARY_UNDER_INVALIDATION),
  );

  // Readiness law: clean readiness blocked under various adverse conditions
  const adverse = [
    { name: 'active invalidation', flag: 'active_invalidation_present' },
    { name: 'missing triggers', flag: 'triggers_complete', invert: true },
    { name: 'missing invalidations', flag: 'invalidations_complete', invert: true },
    { name: 'material drift', flag: 'material_drift' },
    { name: 'incomplete score context', flag: 'l11_score_context_complete', invert: true },
    { name: 'unresolved multi-path', flag: 'multi_path_unresolved' },
    { name: 'blocking restriction', flag: 'blocking_restriction' },
  ];
  for (const c of adverse) {
    const base = {
      scenario_set_id: `D.read.${c.name}`,
      l11_score_context_complete: true,
      triggers_complete: true,
      invalidations_complete: true,
      active_invalidation_present: false,
      material_drift: false,
      missing_visibility_material: false,
      contradiction_unresolved: false,
      multi_path_unresolved: false,
      blocking_restriction: false,
      disclosures_present: false,
    } as Parameters<typeof deriveL12ScenarioTemplateReadiness>[0];
    (base as unknown as Record<string, unknown>)[c.flag] = c.invert ? false : true;
    const r = deriveL12ScenarioTemplateReadiness(base);
    ok(
      `D.read.${c.name} not clean`,
      r.readiness_class !== L12ScenarioTemplateReadinessClass.READY_CLEAN,
    );
  }

  // Faked clean under active invalidation → validator rejects
  const fakeClean = validateL12ScenarioReadiness({
    scenario_set_id: 'D.read.fake',
    readiness_class: L12ScenarioTemplateReadinessClass.READY_CLEAN,
    active_invalidation_present: true,
    triggers_complete: true,
    invalidations_complete: true,
    material_drift: false,
    l11_score_context_complete: true,
    multi_path_unresolved: false,
    blocking_restriction: false,
  });
  ok(
    'D.read.tamper clean readiness under active invalidation rejected',
    !fakeClean.ok &&
      fakeClean.issues.some(
        i => i.code === L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_ACTIVE_INVALIDATION,
      ),
  );
})();

/* ─────────────── BAND E: Audit and invariants ─────────────── */
console.log('\n═══ BAND E: Audit and Invariants ═══');

(function bandE() {
  resetL12TemplateAuditLog();

  // Severity mapping deterministic
  const sev1 = severityForL12TemplateViolationCode(L12TemplateViolationCode.L12T_TEMPLATE_TRIGGER_PATTERN_MISSING);
  ok('E.01 critical severity for missing triggers', sev1 === 'CRITICAL');
  const sev2 = severityForL12TemplateViolationCode(L12TemplateViolationCode.L12T_CLEAR_PRIMARY_UNDER_INVALIDATION);
  ok('E.02 error severity for clear-primary-under-inv', sev2 === 'ERROR');

  // Emit + read back
  const offender = { ...L12_SPOT_LED_CONTINUATION_V1, trigger_patterns: [] };
  const v = validateL12ScenarioTemplate(offender);
  emitL12TemplateAuditRecords(L12TemplateAuditSubjectClass.TEMPLATE, 'test.bandE', v.issues);
  const log = getL12TemplateAuditLog();
  ok('E.03 audit log captures issues', log.length === v.issues.length && log.length > 0);
  ok(
    'E.04 critical filter contains missing-trigger code',
    getL12TemplateCriticalViolations().some(
      r => r.violation_code === L12TemplateViolationCode.L12T_TEMPLATE_TRIGGER_PATTERN_MISSING,
    ),
  );
  ok(
    'E.05 by-code filter works',
    getL12TemplateViolationsByCode(L12TemplateViolationCode.L12T_TEMPLATE_TRIGGER_PATTERN_MISSING).length > 0,
  );

  // Determinism: same offender → same issue codes (allowing for set membership)
  const v2 = validateL12ScenarioTemplate(offender);
  const sameCodes =
    v.issues.map(i => i.code).sort().join(',') === v2.issues.map(i => i.code).sort().join(',');
  ok('E.06 validator deterministic (same codes)', sameCodes);

  // All invariants green
  const inv = runAllL12_5Invariants();
  for (const r of inv) ok(`E.${r.id}`, r.holds);

  resetL12TemplateAuditLog();
})();

/* ───────────────────────── Summary ───────────────────────── */
console.log('\n═══ SUMMARY ═══');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('\n✓ L12.5 certification suite passed.');
process.exit(0);
