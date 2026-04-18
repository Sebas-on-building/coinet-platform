/**
 * L8.6 — Regime Families, Templates, and Rollout Law
 * Certification Test Suite
 *
 * 5 Bands (§8.6.9.2):
 *   A — Family and template registration
 *   B — Template semantics
 *   C — First production template correctness
 *   D — Rollout law
 *   E — Audit and invariants
 */

// ── Contracts ──
import {
  L8RegimeFamily, ALL_L8_REGIME_FAMILIES,
  L8MacroRegimeClass, L8CryptoStructureRegimeClass,
  L8TokenRegimeClass, L8EcosystemRegimeClass,
  L8RegimeInputDomain,
  L8RegimeInputFamily,
  L8RegimeRolloutPhase, ALL_L8_REGIME_ROLLOUT_PHASES,
  L8_REGIME_ROLLOUT_PHASE_INDEX,
  L8RegimeTemplateState, ALL_L8_REGIME_TEMPLATE_STATES,
  ALL_L8_REGIME_RUNTIME_MODES,
  L8RegimeSignatureClass, ALL_L8_REGIME_SIGNATURE_CLASSES,
  buildL8RegimeSignatureId,
  compareL8RegimeRolloutPhases,
  isTemplateStateLegalForMode,
  mayEmitProductionClean,
  ALL_L8_REGIME_CONFIDENCE_POSTURE_DEFAULTS,
  ALL_L8_REGIME_MULTIPLIER_POSTURE_DEFAULTS,
  ALL_L8_REGIME_VALIDATION_PATTERNS,
  ALL_L8_REGIME_FEATURE_PATTERNS,
  buildL8RegimeTemplateIdV6,
  familyPrefixForSignatures,
} from '../l8/contracts';

// ── Templates (direct) ──
import {
  L8_MACRO_REGIME_TEMPLATES,
  L8_CRYPTO_STRUCTURE_REGIME_TEMPLATES,
  L8_TOKEN_REGIME_TEMPLATES,
  L8_ECOSYSTEM_REGIME_TEMPLATES,
  L8_ALL_REGIME_TEMPLATES,
} from '../l8/templates';

// ── Registries ──
import {
  L8RegimeTemplateRegistry, getDefaultL8RegimeTemplateRegistry,
  L8RegimeRolloutRegistry, getDefaultL8RegimeRolloutRegistry,
  L8RegimeFamilyDefinitionRegistry,
  getDefaultL8RegimeFamilyDefinitionRegistry,
  L8_REGIME_FAMILY_DEFINITIONS,
} from '../l8/registry';

// ── Validators ──
import {
  L8RegimeTemplateViolationCode,
  ALL_L8_REGIME_TEMPLATE_VIOLATION_CODES,
  L8RegimeTemplateError,
  validateRegimeTemplate,
  validateRegimeFamilyRollout,
  validateFamilyRolloutReadiness,
  validateRegimeTemplateConsistency,
} from '../l8/validation';

// ── Audit ──
import {
  resetL8TemplateAuditLog,
  emitL8TemplateAuditRecord,
  getL8TemplateAuditLog, getL8TemplateCriticalViolations,
  getL8TemplateViolationsByCode, getL8TemplateViolationsByFamily,
  hasAnyL8TemplateViolations, getL8TemplateViolationCount,
  emitL8TemplateMissingFieldViolation,
  emitL8TemplateConsistencyViolation,
  emitL8TemplateRolloutViolation,
  emitL8TemplateJudgmentLeakViolation,
  emitL8TemplateSemanticDriftViolation,
} from '../l8/constitution';

// ── Invariants ──
import {
  checkAllL86Invariants,
  checkINV_86_A, checkINV_86_B, checkINV_86_C, checkINV_86_D,
  checkINV_86_E, checkINV_86_F, checkINV_86_G,
  buildGreenMacroRiskOnTemplate,
} from '../l8/invariants/l8_6-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else {
    failed++; failures.push(label);
    console.error(`  ✗ FAIL: ${label}`);
  }
}
function resetAll(): void { resetL8TemplateAuditLog(); }

// ═══════════════════════════════════════════════════════════════
// BAND A — Family and Template Registration
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Family and Template Registration ═══');
resetAll();

// Enum / const sanity
assert(ALL_L8_REGIME_ROLLOUT_PHASES.length === 4, 'A.01 4 rollout phases');
assert(ALL_L8_REGIME_TEMPLATE_STATES.length === 4, 'A.02 4 template states');
assert(ALL_L8_REGIME_RUNTIME_MODES.length === 3, 'A.03 3 runtime modes');
assert(ALL_L8_REGIME_SIGNATURE_CLASSES.length === 2,
  'A.04 2 signature classes');
assert(ALL_L8_REGIME_CONFIDENCE_POSTURE_DEFAULTS.length === 7,
  'A.05 7 confidence posture defaults');
assert(ALL_L8_REGIME_MULTIPLIER_POSTURE_DEFAULTS.length === 8,
  'A.06 8 multiplier posture defaults');
assert(ALL_L8_REGIME_VALIDATION_PATTERNS.length === 10,
  'A.07 10 validation patterns');
assert(ALL_L8_REGIME_FEATURE_PATTERNS.length === 13,
  'A.08 13 feature patterns');
assert(ALL_L8_REGIME_TEMPLATE_VIOLATION_CODES.length >= 30,
  `A.09 ≥30 template violation codes (got ${ALL_L8_REGIME_TEMPLATE_VIOLATION_CODES.length})`);

// Phase ordering
assert(L8_REGIME_ROLLOUT_PHASE_INDEX[
  L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL] === 1,
  'A.10 phase 1 = 1');
assert(L8_REGIME_ROLLOUT_PHASE_INDEX[
  L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM] === 4,
  'A.11 phase 4 = 4');
assert(compareL8RegimeRolloutPhases(
  L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL,
  L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM) < 0,
  'A.12 phase 1 before phase 4');

// Template state × mode
assert(isTemplateStateLegalForMode(
  L8RegimeTemplateState.PRODUCTION_ENABLED, 'PRODUCTION'),
  'A.13 production_enabled legal in PRODUCTION');
assert(!isTemplateStateLegalForMode(
  L8RegimeTemplateState.CERTIFICATION_ONLY, 'PRODUCTION'),
  'A.14 certification_only illegal in PRODUCTION');
assert(isTemplateStateLegalForMode(
  L8RegimeTemplateState.CERTIFICATION_ONLY, 'CERTIFICATION'),
  'A.15 certification_only legal in CERTIFICATION');
assert(isTemplateStateLegalForMode(
  L8RegimeTemplateState.SHADOW_ONLY, 'SHADOW'),
  'A.16 shadow_only legal in SHADOW');
assert(!isTemplateStateLegalForMode(
  L8RegimeTemplateState.BLOCKED, 'SHADOW'),
  'A.17 blocked illegal even in SHADOW');
assert(mayEmitProductionClean(
  L8RegimeTemplateState.PRODUCTION_ENABLED, 'PRODUCTION'),
  'A.18 production+production → clean OK');
assert(!mayEmitProductionClean(
  L8RegimeTemplateState.SHADOW_ONLY, 'PRODUCTION'),
  'A.19 shadow+production → no clean');

// Template + signature id builders
const tid = buildL8RegimeTemplateIdV6(
  L8RegimeFamily.MACRO, L8MacroRegimeClass.RISK_ON, '1.0.0');
assert(tid === 'tpl.MACRO.RISK_ON@1.0.0', 'A.20 template id deterministic');
const sid = buildL8RegimeSignatureId(
  L8RegimeSignatureClass.TRANSITION, 'macro', 'x');
assert(sid === 'sig.transition.macro.x', 'A.21 transition signature id');
const aid = buildL8RegimeSignatureId(
  L8RegimeSignatureClass.AMBIGUITY, 'macro', 'y');
assert(aid === 'sig.ambiguity.macro.y', 'A.22 ambiguity signature id');
assert(familyPrefixForSignatures(L8RegimeFamily.MACRO) === 'macro',
  'A.23 family prefix lowercase');

// Templates per family
assert(L8_MACRO_REGIME_TEMPLATES.length === 4, 'A.24 4 macro templates');
assert(L8_CRYPTO_STRUCTURE_REGIME_TEMPLATES.length === 4,
  'A.25 4 crypto-structure templates');
assert(L8_TOKEN_REGIME_TEMPLATES.length === 7, 'A.26 7 token templates');
assert(L8_ECOSYSTEM_REGIME_TEMPLATES.length === 6, 'A.27 6 ecosystem templates');
assert(L8_ALL_REGIME_TEMPLATES.length === 21, 'A.28 21 templates total');

// Template registry
const tr = getDefaultL8RegimeTemplateRegistry();
assert(tr.list().length === 21, 'A.29 registry has 21 templates');
assert(tr.isRegistered('tpl.MACRO.RISK_ON@1.0.0'), 'A.30 macro risk_on registered');
assert(!tr.isRegistered('fake:template'), 'A.31 fake template not registered');
assert(tr.listForFamily(L8RegimeFamily.MACRO).length === 4,
  'A.32 4 macro templates via registry');
assert(tr.listForFamily(L8RegimeFamily.TOKEN_SPECIFIC).length === 7,
  'A.33 7 token templates via registry');
assert(tr.listForPhase(L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL).length === 4,
  'A.34 4 phase-1 templates');
assert(tr.listForPhase(L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM).length === 6,
  'A.35 6 phase-4 templates');
assert(tr.listForState(L8RegimeTemplateState.SHADOW_ONLY).length >= 1,
  'A.36 ≥1 shadow template');
assert(tr.listForScope('MARKET').length >= 4, 'A.37 ≥4 MARKET-scope templates');
assert(tr.listByInputFamily(
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY).length === 21,
  'A.38 all 21 templates consume VALIDATION_ASSESSMENT_FAMILY');
assert(tr.findForClass(L8RegimeFamily.MACRO, L8MacroRegimeClass.RISK_ON) !==
  undefined, 'A.39 findForClass works');
assert(tr.findForClass(L8RegimeFamily.MACRO,
  L8TokenRegimeClass.EARLY_ACCUMULATION) === undefined,
  'A.40 findForClass returns undefined on mismatch');
const customTr = new L8RegimeTemplateRegistry();
assert(customTr.list().length === 21, 'A.41 custom registry same size');

// Rollout registry
const rr = getDefaultL8RegimeRolloutRegistry();
assert(rr.phaseOrder().length === 4, 'A.42 rollout phases');
assert(rr.isPhaseFullyEnabled(L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL),
  'A.43 phase 1 fully enabled');
assert(rr.isPhaseFullyEnabled(L8RegimeRolloutPhase.PHASE_2_STRUCTURAL),
  'A.44 phase 2 fully enabled');
assert(rr.isPhaseFullyEnabled(L8RegimeRolloutPhase.PHASE_3_TOKEN_LIFECYCLE),
  'A.45 phase 3 fully enabled');
assert(!rr.isPhaseFullyEnabled(L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM),
  'A.46 phase 4 not fully enabled (has non-PRODUCTION templates)');
assert(rr.earlierPhasesComplete(L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM),
  'A.47 earlier phases complete before phase 4');
assert(rr.listTemplatesSkippingEarlierPhases().length === 0,
  'A.48 no templates skip earlier phases');
const customRr = new L8RegimeRolloutRegistry();
assert(customRr.phaseOrder().length === 4, 'A.49 custom rollout registry');

// Family-definition registry
const fdr = getDefaultL8RegimeFamilyDefinitionRegistry();
assert(fdr.list().length === 4, 'A.50 4 family definitions');
assert(fdr.isRegistered('MACRO'), 'A.51 MACRO defined');
assert(!fdr.isRegistered('FAKE_FAMILY'), 'A.52 fake not defined');
assert(fdr.get(L8RegimeFamily.MACRO)?.rollout_phase ===
  L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL,
  'A.53 MACRO phase 1');
assert(fdr.get(L8RegimeFamily.TOKEN_SPECIFIC)?.member_regime_classes.length === 7,
  'A.54 TOKEN_SPECIFIC has 7 member classes');
assert(L8_REGIME_FAMILY_DEFINITIONS.length === 4,
  'A.55 4 family definitions constant');
const customFdr = new L8RegimeFamilyDefinitionRegistry();
assert(customFdr.list().length === 4, 'A.56 custom definition registry');

// Error carrier
const err = new L8RegimeTemplateError(
  L8RegimeTemplateViolationCode.TEMPLATE_UNREGISTERED, 'test', { x: 1 });
assert(err.code === L8RegimeTemplateViolationCode.TEMPLATE_UNREGISTERED,
  'A.57 error carries code');
assert(err.details.x === 1, 'A.58 error carries details');

// ═══════════════════════════════════════════════════════════════
// BAND B — Template Semantics
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Template Semantics ═══');
resetAll();

// Every registered template validates cleanly
for (const t of L8_ALL_REGIME_TEMPLATES) {
  const rep = validateRegimeTemplate(t);
  assert(rep.valid, `B.valid.${t.template_id} :: ${rep.violations.map(v => v.code).join(',')}`);
}

// Every template has all required semantic fields
for (const t of L8_ALL_REGIME_TEMPLATES) {
  assert(t.support_domains.length >= 1, `B.support.${t.template_id}`);
  assert(t.challenge_domains.length >= 1, `B.challenge.${t.template_id}`);
  assert(t.transition_signatures.length >= 1, `B.transition.${t.template_id}`);
  assert(t.ambiguity_signatures.length >= 1, `B.ambiguity.${t.template_id}`);
  assert(t.confidence_posture_defaults.length >= 1,
    `B.conf.${t.template_id}`);
  assert(t.multiplier_derivation_defaults.length >= 1,
    `B.mul.${t.template_id}`);
  assert(t.rollout_priority >= 1, `B.prio.${t.template_id}`);
  assert(t.legal_input_families.length >= 1, `B.inputs.${t.template_id}`);
  assert(t.applicable_scope_types.length >= 1, `B.scopes.${t.template_id}`);
  assert(t.required_validation_patterns.length >= 1,
    `B.valpat.${t.template_id}`);
  assert(t.required_feature_patterns.length >= 1,
    `B.featpat.${t.template_id}`);
}

// All signatures use correct prefixes
for (const t of L8_ALL_REGIME_TEMPLATES) {
  for (const s of t.transition_signatures) {
    assert(s.signature_id.startsWith('sig.transition.'),
      `B.tr_prefix.${t.template_id}`);
  }
  for (const s of t.ambiguity_signatures) {
    assert(s.signature_id.startsWith('sig.ambiguity.'),
      `B.amb_prefix.${t.template_id}`);
  }
}

// All signatures weights in [0,1]
for (const t of L8_ALL_REGIME_TEMPLATES) {
  for (const s of t.transition_signatures) {
    assert(s.transition_weight >= 0 && s.transition_weight <= 1,
      `B.tr_weight.${t.template_id}.${s.signature_id}`);
  }
  for (const s of t.ambiguity_signatures) {
    assert(s.ambiguity_weight >= 0 && s.ambiguity_weight <= 1,
      `B.amb_weight.${t.template_id}.${s.signature_id}`);
  }
}

// Negative semantic checks
const green = buildGreenMacroRiskOnTemplate();

// Missing support
const noSup = validateRegimeTemplate({ ...green, support_domains: [] });
assert(!noSup.valid, 'B.neg.01 missing support blocked');
assert(noSup.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode.TEMPLATE_MISSING_SUPPORT_DOMAINS),
  'B.neg.02 MISSING_SUPPORT_DOMAINS code');

// Missing challenge
const noCh = validateRegimeTemplate({ ...green, challenge_domains: [] });
assert(!noCh.valid, 'B.neg.03 missing challenge blocked');

// Support/challenge overlap
const overlap = validateRegimeTemplate({
  ...green,
  challenge_domains: [L8RegimeInputDomain.BREADTH_DOMAIN],
});
assert(!overlap.valid, 'B.neg.04 overlap blocked');
assert(overlap.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode.TEMPLATE_SUPPORT_CHALLENGE_OVERLAP),
  'B.neg.05 OVERLAP code');

// OOR signature weight
const oorTr = validateRegimeTemplate({
  ...green,
  transition_signatures: [{
    ...green.transition_signatures[0], transition_weight: 2,
  }],
});
assert(!oorTr.valid, 'B.neg.06 OOR transition weight blocked');
assert(oorTr.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode.SIGNATURE_WEIGHT_OUT_OF_RANGE),
  'B.neg.07 SIGNATURE_WEIGHT code');

// Wrong signature prefix
const wrongPrefix = validateRegimeTemplate({
  ...green,
  transition_signatures: [{
    ...green.transition_signatures[0], signature_id: 'bad.id',
  }],
});
assert(!wrongPrefix.valid, 'B.neg.08 wrong signature prefix blocked');
assert(wrongPrefix.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode.SIGNATURE_WRONG_CLASS),
  'B.neg.09 SIGNATURE_WRONG_CLASS code');

// Duplicate signature id
const duped = validateRegimeTemplate({
  ...green,
  transition_signatures: [
    green.transition_signatures[0],
    green.transition_signatures[0],
  ],
});
assert(!duped.valid, 'B.neg.10 duplicate signature id blocked');
assert(duped.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode.SIGNATURE_ID_DUPLICATE),
  'B.neg.11 SIGNATURE_ID_DUPLICATE code');

// Judgment leak in description
const judg = validateRegimeTemplate({
  ...green, description: 'best regime buy signal trade',
});
assert(!judg.valid, 'B.neg.12 judgment leak blocked');
assert(judg.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode.TEMPLATE_JUDGMENT_LEAK),
  'B.neg.13 JUDGMENT_LEAK code');

// Bad semver
const badVer = validateRegimeTemplate({
  ...green, template_version: 'not-semver',
});
assert(!badVer.valid, 'B.neg.14 bad semver blocked');

// Mismatched template id
const badId = validateRegimeTemplate({
  ...green, template_id: 'tpl.WRONG.id@1.0.0',
});
assert(!badId.valid, 'B.neg.15 mismatched template id blocked');
assert(badId.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode.TEMPLATE_ID_MISMATCH),
  'B.neg.16 ID_MISMATCH code');

// Feature pattern missing
const noFeat = validateRegimeTemplate({
  ...green, required_feature_patterns: [],
});
assert(!noFeat.valid, 'B.neg.17 missing feature patterns blocked');

// Validation pattern missing
const noVal = validateRegimeTemplate({
  ...green, required_validation_patterns: [],
});
assert(!noVal.valid, 'B.neg.18 missing validation patterns blocked');

// ═══════════════════════════════════════════════════════════════
// BAND C — First Production Template Correctness
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: First Production Template Correctness ═══');
resetAll();

// All macro templates exist
for (const cls of Object.values(L8MacroRegimeClass)) {
  const t = tr.findForClass(L8RegimeFamily.MACRO, cls);
  assert(t !== undefined, `C.macro.${cls}`);
  assert(t!.rollout_phase === L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL,
    `C.macro.phase.${cls}`);
  assert(t!.template_state === L8RegimeTemplateState.PRODUCTION_ENABLED,
    `C.macro.state.${cls}`);
}

// MACRO_RISK_ON specific semantics
const riskOn = tr.findForClass(L8RegimeFamily.MACRO, L8MacroRegimeClass.RISK_ON)!;
assert(riskOn.support_domains.includes(L8RegimeInputDomain.BREADTH_DOMAIN),
  'C.01 risk_on supports BREADTH');
assert(riskOn.support_domains.includes(
  L8RegimeInputDomain.STABLECOIN_FLOW_DOMAIN),
  'C.02 risk_on supports STABLECOIN');
assert(riskOn.support_domains.includes(L8RegimeInputDomain.LIQUIDITY_DOMAIN),
  'C.03 risk_on supports LIQUIDITY');
assert(riskOn.support_domains.includes(L8RegimeInputDomain.VOLATILITY_DOMAIN),
  'C.04 risk_on supports VOLATILITY');
assert(riskOn.support_domains.includes(
  L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN),
  'C.05 risk_on supports VALIDATION_SUPPORT');
assert(!riskOn.support_domains.some(d =>
  (riskOn.challenge_domains as readonly L8RegimeInputDomain[]).includes(d)),
  'C.06 risk_on support/challenge disjoint');

// All crypto templates exist
for (const cls of Object.values(L8CryptoStructureRegimeClass)) {
  const t = tr.findForClass(L8RegimeFamily.CRYPTO_STRUCTURE, cls);
  assert(t !== undefined, `C.crypto.${cls}`);
  assert(t!.rollout_phase === L8RegimeRolloutPhase.PHASE_2_STRUCTURAL,
    `C.crypto.phase.${cls}`);
}

// LEVERAGE_LED_EXPANSION defaults are transition-sensitive
const leverage = tr.findForClass(
  L8RegimeFamily.CRYPTO_STRUCTURE,
  L8CryptoStructureRegimeClass.LEVERAGE_LED_EXPANSION)!;
assert(leverage.confidence_posture_defaults.includes('TRANSITION_SENSITIVE'),
  'C.07 leverage_led is transition-sensitive');
assert(leverage.multiplier_derivation_defaults.includes('LEVERAGE_CAUTION_BIAS'),
  'C.08 leverage_led has LEVERAGE_CAUTION_BIAS');
assert(leverage.transition_signatures.some(s =>
  s.transition_weight >= 0.7 && s.forces_transitional_overlap),
  'C.09 leverage_led has high-weight forcing transition signature');

// THIN_LIQUIDITY_FRAGILITY caps trust via LIQUIDITY_FRAGILITY_BIAS
const thin = tr.findForClass(
  L8RegimeFamily.CRYPTO_STRUCTURE,
  L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY)!;
assert(thin.multiplier_derivation_defaults.includes(
  'LIQUIDITY_FRAGILITY_BIAS'),
  'C.10 thin_liquidity has LIQUIDITY_FRAGILITY_BIAS');

// All token templates
for (const cls of Object.values(L8TokenRegimeClass)) {
  const t = tr.findForClass(L8RegimeFamily.TOKEN_SPECIFIC, cls);
  assert(t !== undefined, `C.token.${cls}`);
  assert(t!.rollout_phase === L8RegimeRolloutPhase.PHASE_3_TOKEN_LIFECYCLE,
    `C.token.phase.${cls}`);
  assert(t!.applicable_scope_types.every(s =>
    s === 'ASSET' || s === 'TOKEN' || s === 'PROTOCOL'),
    `C.token.scope.${cls}`);
}

// EARLY_ACCUMULATION consumes L7 accumulation validation
const earlyAcc = tr.findForClass(
  L8RegimeFamily.TOKEN_SPECIFIC,
  L8TokenRegimeClass.EARLY_ACCUMULATION)!;
assert(earlyAcc.required_validation_patterns.includes(
  'ACCUMULATION_VALIDATION'),
  'C.11 early_accumulation requires ACCUMULATION_VALIDATION');
assert(earlyAcc.legal_input_families.includes(
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY),
  'C.12 early_accumulation consumes L7 validation');
assert(earlyAcc.legal_input_families.includes(
  L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY),
  'C.13 early_accumulation consumes L7 restriction');

// POST_UNLOCK_DIGESTION requires RISK_OVERHANG_VALIDATION
const postUnlock = tr.findForClass(
  L8RegimeFamily.TOKEN_SPECIFIC,
  L8TokenRegimeClass.POST_UNLOCK_DIGESTION)!;
assert(postUnlock.required_validation_patterns.includes(
  'RISK_OVERHANG_VALIDATION'),
  'C.14 post_unlock requires RISK_OVERHANG_VALIDATION');
assert(postUnlock.support_domains.includes(
  L8RegimeInputDomain.RISK_OVERHANG_DOMAIN),
  'C.15 post_unlock supports RISK_OVERHANG');

// DISTRIBUTION requires DISTRIBUTION_VALIDATION
const dist = tr.findForClass(
  L8RegimeFamily.TOKEN_SPECIFIC,
  L8TokenRegimeClass.DISTRIBUTION)!;
assert(dist.required_validation_patterns.includes(
  'DISTRIBUTION_VALIDATION'),
  'C.16 distribution requires DISTRIBUTION_VALIDATION');

// BLOWOFF_REFLEXIVE_LATE_STAGE narrows multipliers heavily
const blowoff = tr.findForClass(
  L8RegimeFamily.TOKEN_SPECIFIC,
  L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE)!;
assert(blowoff.confidence_posture_defaults.includes('TRANSITION_SENSITIVE'),
  'C.17 blowoff transition-sensitive');
assert(blowoff.multiplier_derivation_defaults.includes('BREAKOUT_SKEPTICISM_BIAS'),
  'C.18 blowoff BREAKOUT_SKEPTICISM_BIAS');
assert(blowoff.transition_signatures.some(s =>
  s.transition_weight >= 0.8),
  'C.19 blowoff has critical-weight transition signature');

// Ecosystem templates — most certification/shadow, scope restricted
for (const cls of Object.values(L8EcosystemRegimeClass)) {
  const t = tr.findForClass(L8RegimeFamily.ECOSYSTEM, cls);
  assert(t !== undefined, `C.eco.${cls}`);
  assert(t!.rollout_phase === L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM,
    `C.eco.phase.${cls}`);
}
// MEMECOIN_MANIA is shadow-only
const mania = tr.findForClass(
  L8RegimeFamily.ECOSYSTEM,
  L8EcosystemRegimeClass.MEMECOIN_MANIA)!;
assert(mania.template_state === L8RegimeTemplateState.SHADOW_ONLY,
  'C.20 memecoin_mania shadow-only');
assert(mania.confidence_posture_defaults.includes('FRAGILITY_SENSITIVE'),
  'C.21 memecoin_mania fragility-sensitive');

// CHAIN_EXPANSION consumes L4 graph context
const chainExp = tr.findForClass(
  L8RegimeFamily.ECOSYSTEM,
  L8EcosystemRegimeClass.CHAIN_EXPANSION)!;
assert(chainExp.legal_input_families.includes(
  L8RegimeInputFamily.L4_GRAPH_CONTEXT_FAMILY),
  'C.22 chain_expansion consumes L4 graph context');

// Scope/template legality: macro not legal on TOKEN scope
for (const t of L8_MACRO_REGIME_TEMPLATES) {
  assert(!(t.applicable_scope_types as readonly string[]).includes('TOKEN'),
    `C.macro_not_token.${t.template_id}`);
}

// Token templates all legal on TOKEN scope
for (const t of L8_TOKEN_REGIME_TEMPLATES) {
  assert((t.applicable_scope_types as readonly string[]).includes('TOKEN'),
    `C.token_has_token_scope.${t.template_id}`);
}

// ═══════════════════════════════════════════════════════════════
// BAND D — Rollout Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Rollout Law ═══');
resetAll();

// Green production template passes
const prodOk = validateRegimeFamilyRollout({
  template: riskOn,
  runtime_mode: 'PRODUCTION',
  attempting_production_clean: true,
});
assert(prodOk.valid, 'D.01 green production passes');

// Shadow attempting clean in production → blocked
const shadowTemplate = buildGreenMacroRiskOnTemplate();
const shadowClean = validateRegimeFamilyRollout({
  template: { ...shadowTemplate, template_state: L8RegimeTemplateState.SHADOW_ONLY },
  runtime_mode: 'PRODUCTION',
  attempting_production_clean: true,
});
assert(!shadowClean.valid, 'D.02 shadow + production-clean blocked');
assert(shadowClean.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode.SHADOW_EMITS_PRODUCTION_CLEAN),
  'D.03 SHADOW_EMITS_PRODUCTION_CLEAN code');

// Certification in production mode → blocked
const certProd = validateRegimeFamilyRollout({
  template: { ...shadowTemplate,
    template_state: L8RegimeTemplateState.CERTIFICATION_ONLY },
  runtime_mode: 'PRODUCTION',
  attempting_production_clean: false,
});
assert(!certProd.valid, 'D.04 certification in production blocked');
assert(certProd.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode.TEMPLATE_STATE_ILLEGAL_FOR_MODE),
  'D.05 STATE_ILLEGAL_FOR_MODE code');

// Blocked state rejected regardless
const blocked = validateRegimeFamilyRollout({
  template: { ...shadowTemplate, template_state: L8RegimeTemplateState.BLOCKED },
  runtime_mode: 'SHADOW',
  attempting_production_clean: false,
});
assert(!blocked.valid, 'D.06 BLOCKED always rejected');

// Shadow + shadow mode ok
const shadowShadow = validateRegimeFamilyRollout({
  template: { ...shadowTemplate, template_state: L8RegimeTemplateState.SHADOW_ONLY },
  runtime_mode: 'SHADOW',
  attempting_production_clean: false,
});
assert(shadowShadow.valid, 'D.07 shadow template in shadow mode ok');

// Family readiness: macro under production → ready
const macroProd = validateFamilyRolloutReadiness({
  family: L8RegimeFamily.MACRO,
  runtime_mode: 'PRODUCTION',
  templates: tr.listForFamily(L8RegimeFamily.MACRO),
});
assert(macroProd.valid, 'D.08 macro production-ready');

// Family readiness: ecosystem under production → NOT ready (mania is shadow)
const ecoProd = validateFamilyRolloutReadiness({
  family: L8RegimeFamily.ECOSYSTEM,
  runtime_mode: 'PRODUCTION',
  templates: tr.listForFamily(L8RegimeFamily.ECOSYSTEM),
});
assert(!ecoProd.valid, 'D.09 ecosystem not production-ready');

// Family readiness: ecosystem under SHADOW → ready
const ecoShadow = validateFamilyRolloutReadiness({
  family: L8RegimeFamily.ECOSYSTEM,
  runtime_mode: 'SHADOW',
  templates: tr.listForFamily(L8RegimeFamily.ECOSYSTEM),
});
assert(ecoShadow.valid, 'D.10 ecosystem shadow-ready');

// Empty template set → flagged
const empty = validateFamilyRolloutReadiness({
  family: 'FAKE_FAMILY',
  runtime_mode: 'SHADOW',
  templates: [],
});
assert(!empty.valid, 'D.11 empty template set flagged');
assert(empty.violations.some(v =>
  v.code === L8RegimeTemplateViolationCode
    .FAMILY_PRODUCTION_ENABLED_WITHOUT_TEMPLATES),
  'D.12 FAMILY_WITHOUT_TEMPLATES code');

// Rollout ordering law: no real templates skip earlier phases
assert(rr.listTemplatesSkippingEarlierPhases().length === 0,
  'D.13 no real-world phase skips');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

// Consistency validator on live registries → clean
const cons = validateRegimeTemplateConsistency();
assert(cons.valid, 'E.01 live registry consistency clean');
assert(cons.violations.length === 0, 'E.02 no violations');

// Audit emission
emitL8TemplateMissingFieldViolation('src',
  L8RegimeTemplateViolationCode.TEMPLATE_MISSING_SUPPORT_DOMAINS,
  'tpl.x', 'MACRO', 'missing support');
emitL8TemplateConsistencyViolation('src',
  L8RegimeTemplateViolationCode.TEMPLATE_INPUT_FAMILY_NOT_ALLOWED,
  'tpl.y', 'TOKEN_SPECIFIC', 'input family');
emitL8TemplateRolloutViolation('src',
  L8RegimeTemplateViolationCode.SHADOW_EMITS_PRODUCTION_CLEAN,
  'tpl.z', 'ECOSYSTEM', 'shadow emit');
emitL8TemplateJudgmentLeakViolation('src',
  'tpl.bad', 'MACRO', 'judgment leak');
emitL8TemplateSemanticDriftViolation('src',
  'tpl.drift', 'TOKEN_SPECIFIC', 'semantic drift');

assert(getL8TemplateAuditLog().length === 5,
  `E.03 5 audit records (got ${getL8TemplateAuditLog().length})`);
assert(getL8TemplateViolationCount() === 5, 'E.04 count matches');
assert(hasAnyL8TemplateViolations(), 'E.05 hasAny true');
assert(getL8TemplateCriticalViolations().length >= 3,
  'E.06 ≥3 critical');
assert(getL8TemplateViolationsByCode(
  L8RegimeTemplateViolationCode.TEMPLATE_JUDGMENT_LEAK).length === 1,
  'E.07 query by code');
assert(getL8TemplateViolationsByFamily('MACRO').length === 2,
  'E.08 query by family');

// Custom record
const custom = emitL8TemplateAuditRecord({
  violationCode: L8RegimeTemplateViolationCode.TEMPLATE_STATE_ILLEGAL_FOR_MODE,
  source: 'custom',
  templateId: 'tpl.custom',
  family: 'MACRO',
  detail: 'state/mode illegal',
  context: {},
  severity: 'HIGH',
});
assert(custom.timestamp.length > 0, 'E.09 custom has timestamp');
assert(getL8TemplateAuditLog().length === 6, 'E.10 custom appended');

resetAll();
assert(!hasAnyL8TemplateViolations(), 'E.11 audit cleared');

// Invariants INV-8.6-A..G
const inv = checkAllL86Invariants();
assert(inv.length === 7, 'E.12 7 L8.6 invariants');
for (const r of inv) {
  assert(r.holds, `E.inv.${r.id} ${r.evidence}`);
}
const a1 = checkINV_86_A(); assert(a1.holds, `E.A ${a1.evidence}`);
const b1 = checkINV_86_B(); assert(b1.holds, `E.B ${b1.evidence}`);
const c1 = checkINV_86_C(); assert(c1.holds, `E.C ${c1.evidence}`);
const d1 = checkINV_86_D(); assert(d1.holds, `E.D ${d1.evidence}`);
const e1 = checkINV_86_E(); assert(e1.holds, `E.E ${e1.evidence}`);
const f1 = checkINV_86_F(); assert(f1.holds, `E.F ${f1.evidence}`);
const g1 = checkINV_86_G(); assert(g1.holds, `E.G ${g1.evidence}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L8.6 TEMPLATES — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 8 regime templates and rollout law green.');
  process.exit(0);
}
