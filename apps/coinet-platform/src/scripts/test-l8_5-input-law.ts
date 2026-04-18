/**
 * L8.5 — Regime Inputs, Legal Evidence Surfaces, and Lower-Layer
 * Consumption Law — Certification Test Suite
 *
 * 5 Bands (§8.5.11.2):
 *   A — Input taxonomy and registries
 *   B — Binding and dependency law
 *   C — L6/L7 consumption law
 *   D — Admissibility and evidence weighting
 *   E — Misuse, audit, and invariants
 */

// ── Contracts ──
import {
  L8RegimeInputFamily, ALL_L8_REGIME_INPUT_FAMILIES,
  ALL_L8_REGIME_INPUT_FAMILY_TIERS,
  L8_REGIME_INPUT_FAMILY_DESCRIPTORS,
  getL8RegimeInputFamilyDescriptor,
  isL8RegisteredInputFamily,
  getInputFamilyTier, getInputFamilySourceLayer,

  L8RegimeInputDomain, ALL_L8_REGIME_INPUT_DOMAINS,
  L8_REGIME_INPUT_DOMAIN_DESCRIPTORS,
  getL8RegimeInputDomainDescriptor,
  isL8RegisteredInputDomain,
  domainAllowsFamily, domainAllowsScope,

  L8RegimeDependencyClass, ALL_L8_REGIME_DEPENDENCY_CLASSES,
  L8RegimeMaxRelianceClass, ALL_L8_REGIME_MAX_RELIANCE_CLASSES,
  L8_DEPENDENCY_CLASS_MAX_RELIANCE_CEILING,
  maxRelianceCeilingFor, relianceStrength, relianceExceedsCeiling,

  L8RegimeInputAdmissibilityClass,
  ALL_L8_REGIME_INPUT_ADMISSIBILITY_CLASSES,
  L8RegimeEvidenceWeightClass,
  ALL_L8_REGIME_EVIDENCE_WEIGHT_CLASSES,
  admissibilityStrength, deriveEvidenceWeightClass,

  L8RegimeConsumptionRight, ALL_L8_REGIME_CONSUMPTION_RIGHTS,
  L8RegimeInputViolationCode, ALL_L8_REGIME_INPUT_VIOLATION_CODES,
  L8_CONSUMPTION_RIGHTS_MATRIX,
  getL8ConsumptionRights, hasL8ConsumptionRight,
} from '../l8/contracts';

// ── Registries ──
import {
  L8RegimeInputFamilyRegistry, getDefaultL8RegimeInputFamilyRegistry,
  L8RegimeInputDomainRegistry, getDefaultL8RegimeInputDomainRegistry,
  L8RegimeConsumptionRightsRegistry,
  getDefaultL8RegimeConsumptionRightsRegistry,
} from '../l8/registry';

// ── Validators ──
import {
  validateRegimeInputBinding,
  resolveRegimeInputAdmissibility,
  validateRegimeConsumptionRight,
  validateRegimeConsumptionBatch,
  validateLowerLayerConsumption,
} from '../l8/validation';

// ── Audit ──
import {
  resetL8InputAuditLog, emitL8InputAuditRecord,
  getL8InputAuditLog, getL8InputCriticalViolations,
  getL8InputViolationsByCode, hasAnyL8InputViolations,
  getL8InputViolationCount,
  emitL8BindingViolation, emitL8AdmissibilityViolation,
  emitL8ConsumptionViolation, emitL8LowerLayerConsumptionViolation,
  emitL8JudgmentLeakViolation,
} from '../l8/constitution';

// ── Invariants ──
import {
  checkAllL85Invariants,
  checkINV_85_A, checkINV_85_B, checkINV_85_C, checkINV_85_D,
  checkINV_85_E, checkINV_85_F, checkINV_85_G,
  buildGreenL7ValidationBinding, buildGreenL6FeatureBinding,
} from '../l8/invariants/l8_5-invariants';

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

function resetAll(): void { resetL8InputAuditLog(); }

// ═══════════════════════════════════════════════════════════════
// BAND A — Input Taxonomy and Registries
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Input Taxonomy and Registries ═══');
resetAll();

assert(ALL_L8_REGIME_INPUT_FAMILIES.length === 21,
  `A.01 21 input families (got ${ALL_L8_REGIME_INPUT_FAMILIES.length})`);
assert(ALL_L8_REGIME_INPUT_DOMAINS.length === 12,
  `A.02 12 input domains (got ${ALL_L8_REGIME_INPUT_DOMAINS.length})`);
assert(ALL_L8_REGIME_INPUT_FAMILY_TIERS.length === 5,
  'A.03 5 input family tiers');

// Family descriptors
assert(L8_REGIME_INPUT_FAMILY_DESCRIPTORS.length ===
  ALL_L8_REGIME_INPUT_FAMILIES.length,
  'A.04 descriptors cover every family');
for (const d of L8_REGIME_INPUT_FAMILY_DESCRIPTORS) {
  assert(isL8RegisteredInputFamily(d.family), `A.fam.reg.${d.family}`);
  assert(d.description.length > 5, `A.fam.desc.${d.family}`);
  assert(d.legal_source_surface_classes.length >= 1,
    `A.fam.surf.${d.family}`);
}
assert(getL8RegimeInputFamilyDescriptor(
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY) !== undefined,
  'A.05 VALIDATION_ASSESSMENT_FAMILY retrievable');
assert(getInputFamilyTier(
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY) === 'VALIDATION',
  'A.06 VALIDATION tier for L7 family');
assert(getInputFamilyTier(
  L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY) === 'PRIMITIVE',
  'A.07 PRIMITIVE tier for L6 family');
assert(getInputFamilySourceLayer(
  L8RegimeInputFamily.L4_GRAPH_CONTEXT_FAMILY) === 'L4',
  'A.08 L4 family source layer');

// Domain descriptors
assert(L8_REGIME_INPUT_DOMAIN_DESCRIPTORS.length ===
  ALL_L8_REGIME_INPUT_DOMAINS.length,
  'A.09 domain descriptors cover every domain');
for (const d of L8_REGIME_INPUT_DOMAIN_DESCRIPTORS) {
  assert(isL8RegisteredInputDomain(d.domain), `A.dom.reg.${d.domain}`);
  assert(d.legal_families.length >= 1, `A.dom.fams.${d.domain}`);
  assert(d.legal_scope_types.length >= 1, `A.dom.scopes.${d.domain}`);
}
assert(getL8RegimeInputDomainDescriptor(
  L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN)?.must_consume_restriction_posture,
  'A.10 VALIDATION_SUPPORT_DOMAIN must consume restriction');
assert(domainAllowsFamily(
  L8RegimeInputDomain.BREADTH_DOMAIN,
  L8RegimeInputFamily.BREADTH_FAMILY),
  'A.11 BREADTH_DOMAIN allows BREADTH_FAMILY');
assert(!domainAllowsFamily(
  L8RegimeInputDomain.BREADTH_DOMAIN,
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY),
  'A.12 BREADTH_DOMAIN rejects L7 family');
assert(domainAllowsScope(
  L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN, 'TOKEN'),
  'A.13 SEQUENCE_STATE allows TOKEN scope');
assert(!domainAllowsScope(
  L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN, 'MARKET'),
  'A.14 SEQUENCE_STATE rejects MARKET scope');

// Dependency classes
assert(ALL_L8_REGIME_DEPENDENCY_CLASSES.length === 6,
  'A.15 6 dependency classes');
assert(ALL_L8_REGIME_MAX_RELIANCE_CLASSES.length === 5,
  'A.16 5 max reliance classes');
for (const dep of ALL_L8_REGIME_DEPENDENCY_CLASSES) {
  assert(L8_DEPENDENCY_CLASS_MAX_RELIANCE_CEILING[dep] !== undefined,
    `A.dep.ceiling.${dep}`);
}
assert(maxRelianceCeilingFor(
  L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT) ===
    L8RegimeMaxRelianceClass.FULL_SUPPORT,
  'A.17 REQUIRED_VALIDATION → FULL ceiling');
assert(maxRelianceCeilingFor(
  L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT) ===
    L8RegimeMaxRelianceClass.EVIDENCE_ONLY,
  'A.18 EVIDENCE_ONLY → EVIDENCE ceiling');
assert(relianceStrength(L8RegimeMaxRelianceClass.FULL_SUPPORT) > 
       relianceStrength(L8RegimeMaxRelianceClass.NARROWED_SUPPORT),
  'A.19 FULL > NARROWED reliance strength');
assert(relianceExceedsCeiling(
  L8RegimeMaxRelianceClass.FULL_SUPPORT,
  L8RegimeMaxRelianceClass.CONTEXT_ONLY),
  'A.20 FULL exceeds CONTEXT ceiling');
assert(!relianceExceedsCeiling(
  L8RegimeMaxRelianceClass.CONTEXT_ONLY,
  L8RegimeMaxRelianceClass.FULL_SUPPORT),
  'A.21 CONTEXT does not exceed FULL ceiling');

// Admissibility / weight
assert(ALL_L8_REGIME_INPUT_ADMISSIBILITY_CLASSES.length === 5,
  'A.22 5 admissibility classes');
assert(ALL_L8_REGIME_EVIDENCE_WEIGHT_CLASSES.length === 6,
  'A.23 6 evidence weight classes');
assert(admissibilityStrength(
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL) >
  admissibilityStrength(L8RegimeInputAdmissibilityClass.BLOCKED),
  'A.24 FULL > BLOCKED strength');
assert(deriveEvidenceWeightClass(
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
  L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT) ===
  L8RegimeEvidenceWeightClass.PRIMARY_EVIDENCE_WEIGHT,
  'A.25 FULL + REQUIRED_VALIDATION → PRIMARY weight');
assert(deriveEvidenceWeightClass(
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
  L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT) ===
  L8RegimeEvidenceWeightClass.SECONDARY_EVIDENCE_WEIGHT,
  'A.26 FULL + PRIMITIVE → SECONDARY weight');
assert(deriveEvidenceWeightClass(
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY,
  L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT) ===
  L8RegimeEvidenceWeightClass.AUDIT_ONLY_WEIGHT,
  'A.27 EVIDENCE_ONLY → AUDIT_ONLY weight');
assert(deriveEvidenceWeightClass(
  L8RegimeInputAdmissibilityClass.BLOCKED,
  L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT) ===
  L8RegimeEvidenceWeightClass.ZERO_WEIGHT,
  'A.28 BLOCKED → ZERO weight');

// Consumption rights
assert(ALL_L8_REGIME_CONSUMPTION_RIGHTS.length === 6,
  'A.29 6 consumption rights');
assert(ALL_L8_REGIME_INPUT_VIOLATION_CODES.length >= 30,
  `A.30 ≥30 input violation codes (got ${ALL_L8_REGIME_INPUT_VIOLATION_CODES.length})`);
assert(hasL8ConsumptionRight(
  L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
  L8RegimeConsumptionRight.INFLUENCE_PRIMARY_CLASSIFICATION),
  'A.31 REQUIRED_VALIDATION + FULL → primary');
assert(!hasL8ConsumptionRight(
  L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT,
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
  L8RegimeConsumptionRight.INFLUENCE_PRIMARY_CLASSIFICATION),
  'A.32 EVIDENCE_ONLY never grants primary');
assert(getL8ConsumptionRights(
  L8RegimeDependencyClass.HISTORICAL_INPUT,
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL).includes(
    L8RegimeConsumptionRight.INFLUENCE_CONFIDENCE),
  'A.33 historical + FULL can influence confidence');

// Registries
const famRegistry = getDefaultL8RegimeInputFamilyRegistry();
assert(famRegistry.list().length === ALL_L8_REGIME_INPUT_FAMILIES.length,
  'A.34 family registry coverage');
assert(famRegistry.listForTier('VALIDATION').length === 6,
  'A.35 6 VALIDATION-tier families');
assert(famRegistry.listForSourceLayer('L6').length === 11,
  'A.36 11 L6 families');
const customFamRegistry = new L8RegimeInputFamilyRegistry();
assert(customFamRegistry.list().length ===
  ALL_L8_REGIME_INPUT_FAMILIES.length, 'A.37 custom family registry');

const domainRegistry = getDefaultL8RegimeInputDomainRegistry();
assert(domainRegistry.list().length === ALL_L8_REGIME_INPUT_DOMAINS.length,
  'A.38 domain registry coverage');
assert(domainRegistry.allowsSourceLayer(
  L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN, 'L7'),
  'A.39 VALIDATION_SUPPORT allows L7');
assert(!domainRegistry.allowsSourceLayer(
  L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN, 'L6'),
  'A.40 VALIDATION_SUPPORT rejects L6');
const customDomRegistry = new L8RegimeInputDomainRegistry();
assert(customDomRegistry.list().length ===
  ALL_L8_REGIME_INPUT_DOMAINS.length, 'A.41 custom domain registry');

const rightsRegistry = getDefaultL8RegimeConsumptionRightsRegistry();
assert(rightsRegistry.list().length === ALL_L8_REGIME_CONSUMPTION_RIGHTS.length,
  'A.42 rights registry list');
assert(rightsRegistry.has(
  L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED,
  L8RegimeConsumptionRight.INFLUENCE_CONFIDENCE),
  'A.43 REQ_VALIDATION + NARROWED can influence confidence');
assert(!rightsRegistry.has(
  L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED,
  L8RegimeConsumptionRight.INFLUENCE_PRIMARY_CLASSIFICATION),
  'A.44 REQ_VALIDATION + NARROWED cannot influence primary');
const customRights = new L8RegimeConsumptionRightsRegistry();
assert(customRights.list().length === ALL_L8_REGIME_CONSUMPTION_RIGHTS.length,
  'A.45 custom rights registry');
assert(L8_CONSUMPTION_RIGHTS_MATRIX[
  L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT][
    L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL].length === 6,
  'A.46 REQUIRED_VALIDATION + FULL grants all 6 rights');
assert(L8_CONSUMPTION_RIGHTS_MATRIX[
  L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT][
    L8RegimeInputAdmissibilityClass.BLOCKED].length === 0,
  'A.47 EVIDENCE_ONLY + BLOCKED grants no rights');

// ═══════════════════════════════════════════════════════════════
// BAND B — Binding and Dependency Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Binding and Dependency Law ═══');
resetAll();

// Green bindings
const l7Green = buildGreenL7ValidationBinding();
const l6Green = buildGreenL6FeatureBinding();
assert(validateRegimeInputBinding(l7Green).valid,
  'B.01 green L7 binding passes');
assert(validateRegimeInputBinding(l6Green).valid,
  'B.02 green L6 binding passes');

// Unregistered family
const fakeFamily = validateRegimeInputBinding({
  ...l7Green, input_family: 'FAKE' as L8RegimeInputFamily,
});
assert(!fakeFamily.valid, 'B.03 unregistered family blocked');

// Unregistered domain
const fakeDomain = validateRegimeInputBinding({
  ...l7Green, input_domain: 'FAKE' as L8RegimeInputDomain,
});
assert(!fakeDomain.valid, 'B.04 unregistered domain blocked');

// Domain/family mismatch
const domFamMis = validateRegimeInputBinding({
  ...l6Green, input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
});
assert(!domFamMis.valid, 'B.05 domain/family mismatch blocked');
assert(domFamMis.issues.some(i =>
  i.code === L8RegimeInputViolationCode.DOMAIN_FAMILY_MISMATCH),
  'B.06 DOMAIN_FAMILY_MISMATCH surfaced');

// Source layer mismatch
const layerMis = validateRegimeInputBinding({
  ...l7Green, source_layer: 'L6',
});
assert(!layerMis.valid, 'B.07 source layer mismatch blocked');

// Illegal surface class
const surfMis = validateRegimeInputBinding({
  ...l7Green, source_surface_class: 'L6_CURRENT_FEATURE_STATE',
});
assert(!surfMis.valid, 'B.08 illegal surface class blocked');

// Reliance exceeds ceiling
const overReliance = validateRegimeInputBinding({
  ...l6Green, max_reliance_class: L8RegimeMaxRelianceClass.FULL_SUPPORT,
});
assert(!overReliance.valid, 'B.09 reliance > ceiling blocked');
assert(overReliance.issues.some(i =>
  i.code === L8RegimeInputViolationCode.BINDING_RELIANCE_EXCEEDS_CEILING),
  'B.10 RELIANCE_EXCEEDS_CEILING surfaced');

// Missing reliance
const missingReliance = validateRegimeInputBinding({
  ...l6Green,
  max_reliance_class: '' as unknown as L8RegimeMaxRelianceClass,
});
assert(!missingReliance.valid, 'B.11 missing reliance blocked');

// Historical as required current
const histAsReq = validateRegimeInputBinding({
  ...l6Green, source_surface_class: 'L6_FEATURE_HISTORY',
});
assert(!histAsReq.valid, 'B.12 historical as required blocked');
assert(histAsReq.issues.some(i =>
  i.code === L8RegimeInputViolationCode.BINDING_HISTORICAL_AS_CURRENT),
  'B.13 HISTORICAL_AS_CURRENT surfaced');

// Optional as required
const optOver = validateRegimeInputBinding({
  ...l6Green,
  dependency_class: L8RegimeDependencyClass.OPTIONAL_CONTEXT_INPUT,
  max_reliance_class: L8RegimeMaxRelianceClass.FULL_SUPPORT,
});
assert(!optOver.valid, 'B.14 optional as required blocked');

// L7 family without restriction flag
const noRestrictionFlag = validateRegimeInputBinding({
  ...l7Green, restriction_consumption_required: false,
});
assert(!noRestrictionFlag.valid, 'B.15 L7 family without restriction flag blocked');
assert(noRestrictionFlag.issues.some(i =>
  i.code === L8RegimeInputViolationCode.BINDING_FAMILY_REQUIRES_RESTRICTION),
  'B.16 REQUIRES_RESTRICTION surfaced');

// L7 family without contradiction flag
const noContraFlag = validateRegimeInputBinding({
  ...l7Green, contradiction_consumption_required: false,
});
assert(!noContraFlag.valid, 'B.17 L7 family without contradiction flag blocked');

// Ceiling semantics
for (const dep of ALL_L8_REGIME_DEPENDENCY_CLASSES) {
  const ceiling = maxRelianceCeilingFor(dep);
  assert(ALL_L8_REGIME_MAX_RELIANCE_CLASSES.includes(ceiling),
    `B.ceiling.${dep}`);
}

// Domain scope legality for bindings (bindings don't check scope directly,
// but the domain registry enforces this)
assert(!domainAllowsScope(
  L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN, 'MARKET'),
  'B.18 PROTOCOL_ACTIVITY rejects MARKET scope');

// ═══════════════════════════════════════════════════════════════
// BAND C — L6/L7 Consumption Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: L6/L7 Consumption Law ═══');
resetAll();

// L7 surfaces must require restriction consumption
for (const family of [
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
  L8RegimeInputFamily.CONTRADICTION_BUNDLE_FAMILY,
  L8RegimeInputFamily.VALIDATION_CONFIDENCE_FAMILY,
  L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY,
  L8RegimeInputFamily.VALIDATION_HISTORY_FAMILY,
  L8RegimeInputFamily.VALIDATION_EVIDENCE_SURFACE_FAMILY,
]) {
  assert(famRegistry.requiresRestriction(family),
    `C.required_restriction.${family}`);
}

// L6 primitive families do NOT require restriction
for (const family of [
  L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
  L8RegimeInputFamily.VOLATILITY_FAMILY,
  L8RegimeInputFamily.DERIVATIVES_STRUCTURE_FAMILY,
]) {
  assert(!famRegistry.requiresRestriction(family),
    `C.no_restriction.${family}`);
}

// L7_bypass detection
const bypassBehavs = validateLowerLayerConsumption({
  componentId: 'rogue',
  claimedBehaviors: ['revalidate claim from l6'],
});
assert(!bypassBehavs.valid, 'C.01 L7 bypass blocked');
assert(bypassBehavs.issues.some(i =>
  i.code === L8RegimeInputViolationCode.LOWER_LAYER_L7_BYPASS),
  'C.02 L7_BYPASS code');

// L6 revalidation
const revalidate = validateLowerLayerConsumption({
  componentId: 'rogue',
  claimedBehaviors: ['live from l6 raw'],
});
assert(!revalidate.valid, 'C.03 L6 revalidation blocked');
assert(revalidate.issues.some(i =>
  i.code === L8RegimeInputViolationCode.LOWER_LAYER_L6_REVALIDATION),
  'C.04 L6_REVALIDATION code');

// Rights widening
const widened = validateLowerLayerConsumption({
  componentId: 'rogue',
  claimedBehaviors: ['widen l7 rights for multiplier'],
});
assert(!widened.valid, 'C.05 rights widening blocked');

// Contradiction downgrade
const downgraded = validateLowerLayerConsumption({
  componentId: 'rogue',
  claimedBehaviors: ['downgrade contradiction severity'],
});
assert(!downgraded.valid, 'C.06 contradiction downgrade blocked');

// Blocked validation consumed
const blocked = validateLowerLayerConsumption({
  componentId: 'rogue',
  claimedBehaviors: ['consume blocked validation'],
});
assert(!blocked.valid, 'C.07 blocked validation consumption blocked');

// Raw feed bypass
const rawBypass = validateLowerLayerConsumption({
  componentId: 'rogue',
  claimedBehaviors: ['read regime from raw provider feed'],
});
assert(!rawBypass.valid, 'C.08 raw feed bypass blocked');

// Judgment as input
const judgmentLeak = validateLowerLayerConsumption({
  componentId: 'rogue',
  claimedBehaviors: ['judgment as input'],
});
assert(!judgmentLeak.valid, 'C.09 judgment leak blocked');

// Clean consumption passes
const cleanConsumption = validateLowerLayerConsumption({
  componentId: 'regime.classifier.ok',
  claimedBehaviors: [
    'consume l7 validation assessment via stable handoff',
    'consume l7 restriction profile',
    'consume l7 contradiction bundle',
    'read l6 current feature state for breadth',
  ],
});
assert(cleanConsumption.valid, 'C.10 clean consumption passes');

// Admissibility: L7 validation without consumed restriction → BLOCKED
const admL7NoRest = resolveRegimeInputAdmissibility({
  ref: 'l7:va',
  input_family: L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
  input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  dependency_class: L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.FULL_SUPPORT,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: false,
  consumed_restriction_posture: false,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: true,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.9,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.9,
});
assert(admL7NoRest.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.BLOCKED,
  'C.11 L7 without restriction → BLOCKED');

// L7 with consumed restriction + narrowed rights → NARROWED
const admL7Narrow = resolveRegimeInputAdmissibility({
  ref: 'l7:va',
  input_family: L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
  input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  dependency_class: L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.FULL_SUPPORT,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: false,
  consumed_restriction_posture: true,
  restriction_narrows_rights: true,
  consumed_contradiction_posture: true,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.9,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.9,
});
assert(admL7Narrow.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED,
  'C.12 L7 narrowed rights → NARROWED');

// L7 with severe contradiction (and consumed) → NARROWED
const admL7Contra = resolveRegimeInputAdmissibility({
  ref: 'l7:va',
  input_family: L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
  input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  dependency_class: L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.FULL_SUPPORT,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: false,
  consumed_restriction_posture: true,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: true,
  contradiction_severe: true, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.9,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.9,
});
assert(admL7Contra.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED,
  'C.13 severe contradiction → NARROWED');

// ═══════════════════════════════════════════════════════════════
// BAND D — Admissibility and Evidence Weighting
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Admissibility and Evidence Weighting ═══');
resetAll();

// Green primitive → FULL
const greenPrim = resolveRegimeInputAdmissibility({
  ref: 'l6:feat',
  input_family: L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
  input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
  dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: false,
  consumed_restriction_posture: false,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: false,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.8,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.8,
});
assert(greenPrim.valid, 'D.01 green primitive valid');
assert(greenPrim.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED,
  'D.02 primitive capped at NARROWED (ceiling)');
assert(greenPrim.decision.weight_class ===
  L8RegimeEvidenceWeightClass.NARROWED_EVIDENCE_WEIGHT,
  'D.03 NARROWED → NARROWED weight');

// Evidence-only dep class → EVIDENCE_ONLY
const evOnly = resolveRegimeInputAdmissibility({
  ref: 'ev',
  input_family: L8RegimeInputFamily.VALIDATION_HISTORY_FAMILY,
  input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  dependency_class: L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.EVIDENCE_ONLY,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: false,
  consumed_restriction_posture: true,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: true,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.9,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.9,
});
assert(evOnly.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY,
  'D.04 evidence-only dep → evidence-only adm');
assert(evOnly.decision.weight_class ===
  L8RegimeEvidenceWeightClass.AUDIT_ONLY_WEIGHT,
  'D.05 evidence-only → AUDIT_ONLY weight');

// Evidence-only declared stronger than ceiling → issue raised
const evOverDeclared = resolveRegimeInputAdmissibility({
  ref: 'evover',
  input_family: L8RegimeInputFamily.VALIDATION_HISTORY_FAMILY,
  input_domain: L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  dependency_class: L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.FULL_SUPPORT,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: false,
  consumed_restriction_posture: true,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: true,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.9,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.9,
});
assert(!evOverDeclared.valid, 'D.06 evidence-only over-declared flagged');
assert(evOverDeclared.issues.some(i =>
  i.code === L8RegimeInputViolationCode.ADMISSIBILITY_EVIDENCE_ONLY_AS_SUPPORT),
  'D.07 EVIDENCE_ONLY_AS_SUPPORT surfaced');

// Stale → narrowed
const staleAdm = resolveRegimeInputAdmissibility({
  ref: 'stale',
  input_family: L8RegimeInputFamily.BREADTH_FAMILY,
  input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
  dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
  freshness_ok: false, stale: true, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: false,
  consumed_restriction_posture: false,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: false,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.8,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.8,
});
assert(staleAdm.decision.admissibility !==
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
  'D.08 stale not FULL');

// Degraded → BLOCKED
const degAdm = resolveRegimeInputAdmissibility({
  ref: 'deg',
  input_family: L8RegimeInputFamily.BREADTH_FAMILY,
  input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
  dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
  freshness_ok: true, stale: false, degraded: true,
  scope_ok: true, evidence_complete: true, is_historical_only: false,
  consumed_restriction_posture: false,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: false,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.8,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.8,
});
assert(degAdm.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.BLOCKED,
  'D.09 degraded → BLOCKED');
assert(degAdm.decision.weight_class ===
  L8RegimeEvidenceWeightClass.ZERO_WEIGHT,
  'D.10 blocked → ZERO weight');

// Evidence-incomplete → evidence_only
const evIncomplete = resolveRegimeInputAdmissibility({
  ref: 'incomplete',
  input_family: L8RegimeInputFamily.BREADTH_FAMILY,
  input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
  dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: false, is_historical_only: false,
  consumed_restriction_posture: false,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: false,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.8,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.8,
});
assert(evIncomplete.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY,
  'D.11 incomplete evidence → EVIDENCE_ONLY');

// Low lower-layer confidence narrows
const lowConf = resolveRegimeInputAdmissibility({
  ref: 'low',
  input_family: L8RegimeInputFamily.BREADTH_FAMILY,
  input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
  dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: false,
  consumed_restriction_posture: false,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: false,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.1,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.8,
});
assert(lowConf.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED,
  'D.12 low lower-layer confidence narrows');

// Historical-only for non-HISTORICAL dep → CONTEXT_ONLY + issue
const histBadDep = resolveRegimeInputAdmissibility({
  ref: 'hist',
  input_family: L8RegimeInputFamily.BREADTH_FAMILY,
  input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
  dependency_class: L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: true,
  consumed_restriction_posture: false,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: false,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.9,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.9,
});
assert(histBadDep.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY,
  'D.13 historical for non-historical dep → CONTEXT_ONLY');
assert(histBadDep.issues.some(i =>
  i.code === L8RegimeInputViolationCode.ADMISSIBILITY_HISTORICAL_AS_CURRENT),
  'D.14 HISTORICAL_AS_CURRENT surfaced');

// Historical for HISTORICAL dep → FULL (but clamped by NARROWED ceiling)
const histGoodDep = resolveRegimeInputAdmissibility({
  ref: 'histgood',
  input_family: L8RegimeInputFamily.BREADTH_FAMILY,
  input_domain: L8RegimeInputDomain.BREADTH_DOMAIN,
  dependency_class: L8RegimeDependencyClass.HISTORICAL_INPUT,
  declared_max_reliance: L8RegimeMaxRelianceClass.NARROWED_SUPPORT,
  freshness_ok: true, stale: false, degraded: false,
  scope_ok: true, evidence_complete: true, is_historical_only: true,
  consumed_restriction_posture: false,
  restriction_narrows_rights: false,
  consumed_contradiction_posture: false,
  contradiction_severe: false, contradiction_unresolved: false,
  lower_layer_confidence_score: 0.9,
  validation_supported: true, direct_to_regime_family: true,
  historical_reliability_score: 0.9,
});
assert(histGoodDep.decision.admissibility ===
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED,
  'D.15 historical for HISTORICAL dep → NARROWED (ceiling)');

// Weighting classes
assert(deriveEvidenceWeightClass(
  L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY,
  L8RegimeDependencyClass.REQUIRED_CONTEXT_INPUT) ===
  L8RegimeEvidenceWeightClass.CONTEXTUAL_WEIGHT,
  'D.16 CONTEXT_ONLY → CONTEXTUAL weight');

// ═══════════════════════════════════════════════════════════════
// BAND E — Misuse, Audit, and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Misuse, Audit, and Invariants ═══');
resetAll();

// Consumption rights validator
const rightOk = validateRegimeConsumptionRight({
  ref: 'r',
  dependency_class: L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
  admissibility: L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
  proposed_right: L8RegimeConsumptionRight.INFLUENCE_PRIMARY_CLASSIFICATION,
});
assert(rightOk.valid, 'E.01 REQ_VAL + FULL + primary allowed');

const rightDenied = validateRegimeConsumptionRight({
  ref: 'r2',
  dependency_class: L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
  admissibility: L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY,
  proposed_right: L8RegimeConsumptionRight.INFLUENCE_PRIMARY_CLASSIFICATION,
});
assert(!rightDenied.valid, 'E.02 EVIDENCE_ONLY cannot influence primary');
assert(rightDenied.issues.some(i =>
  i.code === L8RegimeInputViolationCode.RIGHT_PRIMARY_NOT_GRANTED),
  'E.03 RIGHT_PRIMARY_NOT_GRANTED surfaced');

// Batch validation
const batch = validateRegimeConsumptionBatch([
  {
    ref: 'r1',
    dependency_class: L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT,
    admissibility: L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
    proposed_right: L8RegimeConsumptionRight.INFLUENCE_MULTIPLIER,
  },
  {
    ref: 'r2',
    dependency_class: L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT,
    admissibility: L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY,
    proposed_right: L8RegimeConsumptionRight.INFLUENCE_CONFIDENCE,
  },
]);
assert(!batch.valid, 'E.04 batch surfaces illegal rights');
assert(batch.issues.length >= 1, 'E.05 batch issues ≥ 1');

// Audit emission
emitL8BindingViolation('src',
  L8RegimeInputViolationCode.BINDING_HISTORICAL_AS_CURRENT,
  'bind1', 'l6:fh', 'historical as current');
emitL8AdmissibilityViolation('src',
  L8RegimeInputViolationCode.ADMISSIBILITY_DEGRADED_AS_CLEAN,
  'l6:x', 'degraded');
emitL8ConsumptionViolation('src',
  L8RegimeInputViolationCode.RIGHT_PRIMARY_NOT_GRANTED,
  'l7:x', 'primary not granted');
emitL8LowerLayerConsumptionViolation('src',
  L8RegimeInputViolationCode.LOWER_LAYER_L7_BYPASS,
  'rsub_x', 'L7 bypass');
emitL8JudgmentLeakViolation('src', 'judgment:x', 'judgment leak');

const log = getL8InputAuditLog();
assert(log.length === 5, `E.06 5 audit records (got ${log.length})`);
assert(getL8InputViolationCount() === 5, 'E.07 violation count');
assert(hasAnyL8InputViolations(), 'E.08 hasAny true');
assert(getL8InputCriticalViolations().length >= 2,
  'E.09 ≥2 critical violations');
assert(getL8InputViolationsByCode(
  L8RegimeInputViolationCode.JUDGMENT_SURFACE_LEAK).length === 1,
  'E.10 query by code');

// Custom audit record
const custom = emitL8InputAuditRecord({
  violationCode: L8RegimeInputViolationCode.FAMILY_MISMATCH,
  source: 'custom', subjectId: null, bindingId: null,
  ref: 'x', detail: 'custom', context: {}, severity: 'HIGH',
});
assert(custom.timestamp.length > 0, 'E.11 custom timestamp');
assert(getL8InputAuditLog().length === 6, 'E.12 custom appended');

resetAll();
assert(getL8InputAuditLog().length === 0, 'E.13 audit cleared');

// Invariants INV-8.5-A..G
const inv = checkAllL85Invariants();
assert(inv.length === 7, 'E.14 7 L8.5 invariants');
for (const r of inv) {
  assert(r.holds, `E.inv.${r.id} ${r.evidence}`);
}
const a1 = checkINV_85_A(); assert(a1.holds, `E.A ${a1.evidence}`);
const b1 = checkINV_85_B(); assert(b1.holds, `E.B ${b1.evidence}`);
const c1 = checkINV_85_C(); assert(c1.holds, `E.C ${c1.evidence}`);
const d1 = checkINV_85_D(); assert(d1.holds, `E.D ${d1.evidence}`);
const e1 = checkINV_85_E(); assert(e1.holds, `E.E ${e1.evidence}`);
const f1 = checkINV_85_F(); assert(f1.holds, `E.F ${f1.evidence}`);
const g1 = checkINV_85_G(); assert(g1.holds, `E.G ${g1.evidence}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L8.5 INPUT LAW — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 8 input law and lower-layer consumption green.');
  process.exit(0);
}
