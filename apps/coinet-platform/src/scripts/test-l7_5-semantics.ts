/**
 * L7.5 — Semantic Lawbook Certification Test Suite
 *
 * Bands per §7.5.9.2:
 *   A — Validation classes
 *   B — Modifiers
 *   C — Contradiction ontology
 *   D — Validation families
 *   E — Rollout, audit, and invariants
 */

import {
  L7PrimaryValidationClass,
  ALL_L7_PRIMARY_VALIDATION_CLASSES,
  L7_PRIMARY_CLASS_PRECEDENCE,
  L7_PRIMARY_CLASS_TO_RUNTIME_CLASS,
  resolvePrimaryClassByPrecedence,
  compareTruthSafety,
  getL7PrimaryClassDescriptor,
  isL7PrimaryValidationClass,
  L7ValidationModifierCode,
  ALL_L7_VALIDATION_MODIFIERS,
  classifyClassModifierPair,
  L7_MODIFIER_TO_RUNTIME_MODIFIER,
  isL7ValidationModifierCode,
  L7ContradictionFamilyClass,
  ALL_L7_CONTRADICTION_FAMILIES,
  getL7ContradictionFamilyDescriptor,
  isL7ContradictionFamilyClass,
  L7ContradictionTemplate,
  L7_CONTRADICTION_TEMPLATES,
  isL7ContradictionTemplateRegistered,
  L7ContradictionTemplateBlockingPolicy,
  L7ContradictionTemplateCapPolicy,
  L7ContradictionTemplateSeverityModel,
  L7ValidationFamilyId,
  L7ValidationFamilyDefinition,
  L7ValidationRolloutPhase,
  L7_ROLLOUT_PHASE_ORDER,
  compareRolloutPhase,
  L7ValidationClass,
  L7ValidationModifier,
  L7ValidationSubjectClass,
  L7ContradictionSeverity,
} from '../l7/contracts';

import {
  L7ValidationClassRegistry,
  L7ValidationModifierRegistry,
  L7ContradictionOntologyRegistry,
  L7ContradictionTemplateRegistry,
  L7ValidationFamilyRegistry,
  getDefaultValidationClassRegistry,
  getDefaultValidationModifierRegistry,
  getDefaultContradictionOntologyRegistry,
  getDefaultContradictionTemplateRegistry,
  getDefaultValidationFamilyRegistry,
} from '../l7/registry';

import {
  L7SemanticViolationCode,
  L7ValidationClassValidator,
  L7ValidationModifierValidator,
  L7ContradictionTemplateValidator,
  L7ValidationFamilyDefinitionValidator,
  L7ValidationFamilyRolloutValidator,
} from '../l7/validation';

import {
  resetSemanticAuditLog,
  emitSemanticAuditRecord,
  getSemanticAuditLog,
  getSemanticViolationsByCode,
  getSemanticViolationsBySurface,
  hasAnySemanticViolations,
  surfaceForViolation,
  defaultSeverityForViolation,
} from '../l7/constitution';

import {
  L7_FIRST_PRODUCTION_VALIDATION_FAMILIES,
  MARKET_STRENGTH_VALIDATION,
  DERIVATIVES_CONTRADICTION_VALIDATION,
  PROTOCOL_SUBSTANCE_VALIDATION,
  NARRATIVE_VALIDATION,
  ACCUMULATION_VALIDATION,
  RISK_OVERHANG_VALIDATION,
  CROSS_DOMAIN_ALIGNMENT_VALIDATION,
} from '../l7/families';

import {
  checkInvariantA_singlePrimaryClass,
  checkInvariantB_modifierSeparation,
  checkInvariantC_registeredContradictionPrimitives,
  checkInvariantD_governedTemplates,
  checkInvariantE_familyCompleteness,
  checkInvariantF_rolloutLegality,
  checkInvariantG_noSemanticDrift,
} from '../l7/invariants';

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

// ── Band A — Validation classes ──────────────────────────────────────────
console.log('\n=== Band A — Validation classes ===');

{
  assert(ALL_L7_PRIMARY_VALIDATION_CLASSES.length === 6, 'exactly six primary classes');
  assert(
    !ALL_L7_PRIMARY_VALIDATION_CLASSES.includes('AMBIGUOUS' as L7PrimaryValidationClass),
    'AMBIGUOUS is NOT a primary class in 7.5',
  );

  const reg = getDefaultValidationClassRegistry();
  assert(reg.list().length === 6, 'class registry has six descriptors');
  for (const cls of ALL_L7_PRIMARY_VALIDATION_CLASSES) {
    assert(reg.get(cls) !== undefined, `class registry.get(${cls}) defined`);
  }

  assert(
    L7_PRIMARY_CLASS_PRECEDENCE[0] === L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
    'precedence: DEGRADED_DUE_TO_MISSING_SOURCE is safest',
  );
  assert(
    L7_PRIMARY_CLASS_PRECEDENCE[L7_PRIMARY_CLASS_PRECEDENCE.length - 1] ===
      L7PrimaryValidationClass.CONFIRMED,
    'precedence: CONFIRMED is least truth-safe',
  );

  const picked = resolvePrimaryClassByPrecedence([
    L7PrimaryValidationClass.CONFIRMED,
    L7PrimaryValidationClass.STALE,
    L7PrimaryValidationClass.WEAKLY_CONFIRMED,
  ]);
  assert(picked === L7PrimaryValidationClass.STALE, 'STALE wins over CONFIRMED/WEAKLY_CONFIRMED');

  assert(compareTruthSafety(L7PrimaryValidationClass.STALE, L7PrimaryValidationClass.CONFIRMED) < 0,
    'STALE more truth-safe than CONFIRMED');
  assert(compareTruthSafety(L7PrimaryValidationClass.CONFIRMED, L7PrimaryValidationClass.STALE) > 0,
    'CONFIRMED less truth-safe than STALE');

  assert(
    L7_PRIMARY_CLASS_TO_RUNTIME_CLASS[L7PrimaryValidationClass.CONFIRMED] ===
      L7ValidationClass.CONFIRMED,
    'CONFIRMED maps to runtime CONFIRMED',
  );
  assert(
    L7_PRIMARY_CLASS_TO_RUNTIME_CLASS[L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE] ===
      L7ValidationClass.INSUFFICIENT,
    'INSUFFICIENT_EVIDENCE maps to runtime INSUFFICIENT',
  );
  assert(
    L7_PRIMARY_CLASS_TO_RUNTIME_CLASS[L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE] ===
      L7ValidationClass.DEGRADED,
    'DEGRADED_DUE_TO_MISSING_SOURCE maps to runtime DEGRADED',
  );

  const desc = getL7PrimaryClassDescriptor(L7PrimaryValidationClass.CONFIRMED);
  assert(desc?.maxContradictionPosture === 'SOFT', 'CONFIRMED tolerates at most SOFT contradiction');
  assert(desc?.defaultRestrictionBaseline === 'UNRESTRICTED', 'CONFIRMED default baseline UNRESTRICTED');

  const v = new L7ValidationClassValidator();
  const r1 = v.select({
    candidates: [
      L7PrimaryValidationClass.CONFIRMED,
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    ],
    flags: { staleness: true },
  });
  assert(
    r1.violations.some(x => x.code === L7SemanticViolationCode.CLEAN_CONFIRMATION_MASQUERADE) === false,
    'no masquerade violation when winner is WEAKLY_CONFIRMED/CONFIRMED and only staleness flag (winner WEAKLY_CONFIRMED)',
  );

  const r2 = v.select({
    candidates: [L7PrimaryValidationClass.CONFIRMED],
    flags: { criticalContradictionPresent: true },
  });
  assert(
    r2.violations.some(x => x.code === L7SemanticViolationCode.CLEAN_CONFIRMATION_MASQUERADE),
    'CONFIRMED + critical contradiction is masquerade',
  );

  const r3 = v.select({
    candidates: [
      L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    ],
    familyProposed: L7PrimaryValidationClass.WEAKLY_CONFIRMED,
  });
  assert(
    r3.violations.some(x => x.code === L7SemanticViolationCode.PRIMARY_CLASS_REDEFINED_BY_FAMILY),
    'family cannot override winning safer class',
  );

  const r4 = v.validateSingle('NOT_A_CLASS');
  assert(
    r4.some(x => x.code === L7SemanticViolationCode.UNKNOWN_PRIMARY_CLASS),
    'unknown class rejected',
  );

  assert(isL7PrimaryValidationClass('CONFIRMED'), 'isL7PrimaryValidationClass true for CONFIRMED');
  assert(!isL7PrimaryValidationClass('AMBIGUOUS'), 'AMBIGUOUS is not a 7.5 primary class');
}

// ── Band B — Modifiers ────────────────────────────────────────────────────
console.log('\n=== Band B — Modifiers ===');

{
  assert(ALL_L7_VALIDATION_MODIFIERS.length === 7, 'exactly seven modifiers');

  const reg = getDefaultValidationModifierRegistry();
  for (const m of ALL_L7_VALIDATION_MODIFIERS) {
    assert(reg.get(m) !== undefined, `modifier registered: ${m}`);
  }

  assert(
    classifyClassModifierPair(
      L7PrimaryValidationClass.CONFIRMED,
      L7ValidationModifierCode.MISSING_CONFIRMATION_SURFACE,
    ) === 'ILLEGAL',
    'CONFIRMED + MISSING_CONFIRMATION_SURFACE is ILLEGAL',
  );
  assert(
    classifyClassModifierPair(
      L7PrimaryValidationClass.CONFIRMED,
      L7ValidationModifierCode.AMBIGUOUS,
    ) === 'TIGHTLY_GATED',
    'CONFIRMED + AMBIGUOUS is TIGHTLY_GATED',
  );
  assert(
    classifyClassModifierPair(
      L7PrimaryValidationClass.STALE,
      L7ValidationModifierCode.STALE_SUPPORT,
    ) === 'ALLOWED',
    'STALE + STALE_SUPPORT is ALLOWED',
  );
  assert(
    classifyClassModifierPair(
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
      L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG,
    ) === 'ALLOWED',
    'WEAKLY_CONFIRMED + CHALLENGED_BY_RISK_OVERHANG is common and legal',
  );
  assert(
    classifyClassModifierPair(
      L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
      L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG,
    ) === 'ALLOWED',
    'INSUFFICIENT_EVIDENCE + CHALLENGED_BY_RISK_OVERHANG legal',
  );

  const v = new L7ValidationModifierValidator();

  const r1 = v.validate({
    primary: L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    modifiers: [L7ValidationModifierCode.AMBIGUOUS, L7ValidationModifierCode.INCOMPLETE],
  });
  assert(r1.violations.length === 0, 'legal modifier pair passes validator');
  assert(r1.legalModifiers.length === 2, 'two legal modifiers admitted');

  const r2 = v.validate({
    primary: L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    modifiers: ['CONFIRMED'],
  });
  assert(
    r2.violations.some(x => x.code === L7SemanticViolationCode.CLASS_MISUSED_AS_MODIFIER),
    'primary class smuggled as modifier is rejected',
  );

  const r3 = v.validate({
    primary: L7PrimaryValidationClass.CONFIRMED,
    modifiers: [L7ValidationModifierCode.MISSING_CONFIRMATION_SURFACE],
  });
  assert(
    r3.violations.some(x => x.code === L7SemanticViolationCode.MODIFIER_ILLEGAL_FOR_PRIMARY_CLASS),
    'illegal modifier for primary class rejected',
  );

  const r4 = v.validate({
    primary: L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    modifiers: [L7ValidationModifierCode.AMBIGUOUS, L7ValidationModifierCode.AMBIGUOUS],
  });
  assert(
    r4.violations.some(x => x.code === L7SemanticViolationCode.MODIFIER_DUPLICATE),
    'duplicate modifier rejected',
  );

  const r5 = v.validate({
    primary: L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    modifiers: ['NOT_A_MODIFIER'],
  });
  assert(
    r5.violations.some(x => x.code === L7SemanticViolationCode.UNKNOWN_MODIFIER),
    'unknown modifier rejected',
  );

  assert(
    L7_MODIFIER_TO_RUNTIME_MODIFIER[L7ValidationModifierCode.AMBIGUOUS] ===
      L7ValidationModifier.AMBIGUOUS_DIRECTION_PRESENT,
    'AMBIGUOUS maps to AMBIGUOUS_DIRECTION_PRESENT',
  );
  assert(
    L7_MODIFIER_TO_RUNTIME_MODIFIER[L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG] ===
      L7ValidationModifier.UNRESOLVED_CONTRADICTION_PRESENT,
    'CHALLENGED_BY_RISK_OVERHANG maps to UNRESOLVED_CONTRADICTION_PRESENT',
  );

  assert(isL7ValidationModifierCode('AMBIGUOUS'), 'isL7ValidationModifierCode true for AMBIGUOUS');
  assert(!isL7ValidationModifierCode('CONFIRMED'), 'CONFIRMED is not a modifier');
}

// ── Band C — Contradiction ontology & templates ───────────────────────────
console.log('\n=== Band C — Contradiction ontology & templates ===');

{
  assert(ALL_L7_CONTRADICTION_FAMILIES.length === 12, 'exactly 12 contradiction families');

  const reg = getDefaultContradictionOntologyRegistry();
  assert(reg.list().length === 12, 'ontology registry has 12 families');
  for (const f of ALL_L7_CONTRADICTION_FAMILIES) {
    assert(reg.get(f) !== undefined, `ontology registry.get(${f}) defined`);
  }

  // Applicability checks.
  const appl1 = reg.checkApplicability({
    family: L7ContradictionFamilyClass.PRICE_FLOW_CONTRADICTION,
    subjectClass: L7ValidationSubjectClass.STATE_CLAIM,
    presentSupportDomains: ['PRICE_FAMILY'],
    presentChallengeDomains: ['FLOW_FAMILY', 'PARTICIPATION_FAMILY'],
    temporallyRelevant: true,
  });
  assert(appl1.applicable, 'PRICE_FLOW_CONTRADICTION applies with required domains');

  const appl2 = reg.checkApplicability({
    family: L7ContradictionFamilyClass.PRICE_FLOW_CONTRADICTION,
    subjectClass: L7ValidationSubjectClass.STATE_CLAIM,
    presentSupportDomains: ['PRICE_FAMILY'],
    presentChallengeDomains: ['FLOW_FAMILY'],
    temporallyRelevant: true,
  });
  assert(!appl2.applicable, 'PRICE_FLOW_CONTRADICTION rejected when PARTICIPATION missing');
  assert(
    appl2.missingChallengeDomains.includes('PARTICIPATION_FAMILY'),
    'missing challenge domain PARTICIPATION_FAMILY reported',
  );

  const appl3 = reg.checkApplicability({
    family: L7ContradictionFamilyClass.SUBSTANCE_VALUATION_CONTRADICTION,
    subjectClass: L7ValidationSubjectClass.NARRATIVE_CLAIM,
    presentSupportDomains: ['PRICE_FAMILY', 'TVL_FAMILY'],
    presentChallengeDomains: ['REVENUE_FAMILY', 'PARTICIPATION_FAMILY'],
    temporallyRelevant: true,
  });
  assert(!appl3.applicable, 'SUBSTANCE_VALUATION_CONTRADICTION rejected for NARRATIVE_CLAIM');
  assert(!appl3.subjectClassLegal, 'subject class illegal for family');

  const appl4 = reg.checkApplicability({
    family: L7ContradictionFamilyClass.PRICE_DERIVATIVES_CONTRADICTION,
    subjectClass: L7ValidationSubjectClass.STATE_CLAIM,
    presentSupportDomains: ['PRICE_FAMILY'],
    presentChallengeDomains: ['FUNDING_FAMILY', 'PARTICIPATION_FAMILY'],
    temporallyRelevant: false,
  });
  assert(!appl4.applicable, 'temporal relevance required family rejected when not relevant');

  assert(
    reg.baselineSeverity(L7ContradictionFamilyClass.UNLOCK_OVERHANG_CONTRADICTION) ===
      L7ContradictionSeverity.SEVERE,
    'UNLOCK_OVERHANG_CONTRADICTION baseline is SEVERE',
  );

  // Template registry.
  const tReg = getDefaultContradictionTemplateRegistry();
  assert(tReg.listProduction().length === 5, 'five production templates registered');
  assert(tReg.listExperimental().length === 0, 'no experimental templates in current registry');

  for (const t of L7_CONTRADICTION_TEMPLATES) {
    assert(tReg.isRegistered(t.template_id), `template registered: ${t.template_id}`);
    assert(
      tReg.isProductionExecutable(t.template_id),
      `template is production executable: ${t.template_id}`,
    );
  }

  // Template validator — production templates all pass.
  const tv = new L7ContradictionTemplateValidator();
  for (const t of L7_CONTRADICTION_TEMPLATES) {
    const v = tv.validate(t);
    assert(v.length === 0, `production template validates clean: ${t.template_id}`);
  }

  // Structure violation on bad template.
  const bad: L7ContradictionTemplate = {
    ...L7_CONTRADICTION_TEMPLATES[0],
    template_id: '',
    required_support_surface_patterns: [],
    required_challenge_surface_patterns: [],
    blocking_policy: L7ContradictionTemplateBlockingPolicy.NEVER_BLOCKS,
    cap_policy: L7ContradictionTemplateCapPolicy.NEVER_CAPS,
  };
  const vb = tv.validateStructure(bad);
  assert(
    vb.some(x => x.code === L7SemanticViolationCode.TEMPLATE_INVALID),
    'empty template_id flagged',
  );
  assert(
    vb.some(x => x.code === L7SemanticViolationCode.TEMPLATE_SUPPORT_PATTERN_MISSING),
    'missing support pattern flagged',
  );
  assert(
    vb.some(x => x.code === L7SemanticViolationCode.TEMPLATE_BLOCKING_CAP_BOTH_MISSING),
    'neither blocking nor cap policy flagged',
  );

  // Freeform contradiction rejected.
  const ff = tv.rejectFreeform(undefined, undefined);
  assert(
    ff.some(x => x.code === L7SemanticViolationCode.TEMPLATE_FREEFORM_CONTRADICTION_EMITTED),
    'freeform contradiction without template_id rejected',
  );

  const ff2 = tv.rejectFreeform('NOT_A_FAMILY', 'ct:not-registered@1');
  assert(
    ff2.some(x => x.code === L7SemanticViolationCode.TEMPLATE_OUTSIDE_REGISTRY) &&
      ff2.some(x => x.code === L7SemanticViolationCode.UNKNOWN_CONTRADICTION_FAMILY),
    'unregistered template_id + unknown family both rejected',
  );

  assert(isL7ContradictionTemplateRegistered('ct:price-up-spot-weak-perps-crowded@1'), 'production template registered');
  assert(!isL7ContradictionTemplateRegistered('ct:not-real@1'), 'fake template not registered');
  assert(
    isL7ContradictionFamilyClass('PRICE_FLOW_CONTRADICTION'),
    'PRICE_FLOW_CONTRADICTION is registered',
  );
  assert(!isL7ContradictionFamilyClass('foo'), 'foo is not a contradiction family');
}

// ── Band D — Validation families ─────────────────────────────────────────
console.log('\n=== Band D — Validation families ===');

{
  assert(
    L7_FIRST_PRODUCTION_VALIDATION_FAMILIES.length === 7,
    'seven first-production validation families',
  );
  const reg = getDefaultValidationFamilyRegistry();
  assert(reg.list().length === 7, 'family registry has seven entries');
  for (const f of L7_FIRST_PRODUCTION_VALIDATION_FAMILIES) {
    assert(reg.isRegistered(f.family_id), `family registered: ${f.family_id}`);
  }

  // Market strength family sanity.
  assert(
    MARKET_STRENGTH_VALIDATION.family_id === L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    'market strength family id correct',
  );
  assert(
    MARKET_STRENGTH_VALIDATION.rollout_phase === L7ValidationRolloutPhase.P2_CORE_MARKET,
    'market strength in P2_CORE_MARKET',
  );
  assert(MARKET_STRENGTH_VALIDATION.rollout_priority === 1, 'market strength priority 1');

  // Cross-domain alignment is last.
  assert(
    CROSS_DOMAIN_ALIGNMENT_VALIDATION.rollout_phase === L7ValidationRolloutPhase.P6_ALIGNMENT,
    'cross-domain alignment in P6_ALIGNMENT',
  );
  assert(
    CROSS_DOMAIN_ALIGNMENT_VALIDATION.rollout_priority === 7,
    'cross-domain alignment priority 7',
  );

  // Family-definition validator passes for all.
  const fv = new L7ValidationFamilyDefinitionValidator();
  for (const f of L7_FIRST_PRODUCTION_VALIDATION_FAMILIES) {
    const v = fv.validate(f);
    assert(v.length === 0, `family validates clean: ${f.family_id}`);
  }

  // Drift detection.
  const drifted: L7ValidationFamilyDefinition = {
    ...MARKET_STRENGTH_VALIDATION,
    description:
      'Tests whether apparent market strength deserves a regime decision or final recommendation',
  };
  const vDrift = fv.validate(drifted);
  assert(
    vDrift.some(x => x.code === L7SemanticViolationCode.FAMILY_SEMANTIC_DRIFT),
    'drift keywords rejected',
  );

  // Coverage missing.
  const missingCov: L7ValidationFamilyDefinition = {
    ...MARKET_STRENGTH_VALIDATION,
    allowed_contradiction_families: [],
    allowed_template_ids: [],
  };
  const vMiss = fv.validate(missingCov);
  assert(
    vMiss.some(x => x.code === L7SemanticViolationCode.FAMILY_CONTRADICTION_COVERAGE_MISSING) &&
      vMiss.some(x => x.code === L7SemanticViolationCode.FAMILY_TEMPLATE_COVERAGE_MISSING),
    'missing contradiction/template coverage rejected',
  );

  // listForSubjectClass / listForContradictionFamily.
  const statefulFamilies = reg.listForSubjectClass(L7ValidationSubjectClass.STATE_CLAIM);
  assert(statefulFamilies.length >= 2, 'at least two families own STATE_CLAIM');

  const unlockFamilies = reg.listForContradictionFamily(
    L7ContradictionFamilyClass.UNLOCK_OVERHANG_CONTRADICTION,
  );
  assert(
    unlockFamilies.some(f => f.family_id === L7ValidationFamilyId.RISK_OVERHANG_VALIDATION),
    'RISK_OVERHANG_VALIDATION emits UNLOCK_OVERHANG_CONTRADICTION',
  );
}

// ── Band E — Rollout, audit, and invariants ──────────────────────────────
console.log('\n=== Band E — Rollout, audit, and invariants ===');

{
  const rv = new L7ValidationFamilyRolloutValidator();
  const clean = rv.validate({ families: L7_FIRST_PRODUCTION_VALIDATION_FAMILIES });
  assert(clean.violations.length === 0, 'production rollout passes rollout validator');
  assert(clean.enabled.length === 7, 'all seven production families legally enabled');

  // Out-of-order test: swap priorities to violate phase monotonicity.
  const bad: L7ValidationFamilyDefinition = {
    ...ACCUMULATION_VALIDATION,
    rollout_priority: 0,
  };
  const vBad = rv.validate({
    families: [
      bad,
      MARKET_STRENGTH_VALIDATION,
      DERIVATIVES_CONTRADICTION_VALIDATION,
      PROTOCOL_SUBSTANCE_VALIDATION,
      NARRATIVE_VALIDATION,
      RISK_OVERHANG_VALIDATION,
      CROSS_DOMAIN_ALIGNMENT_VALIDATION,
    ],
  });
  assert(
    vBad.violations.some(x => x.code === L7SemanticViolationCode.ROLLOUT_OUT_OF_ORDER),
    'rolled-forward family violates rollout order',
  );

  // Dependency not enabled.
  const depBroken: L7ValidationFamilyDefinition = {
    ...MARKET_STRENGTH_VALIDATION,
    production_enabled: false,
  };
  const vDep = rv.validate({
    families: [
      depBroken,
      DERIVATIVES_CONTRADICTION_VALIDATION,
      PROTOCOL_SUBSTANCE_VALIDATION,
      NARRATIVE_VALIDATION,
      ACCUMULATION_VALIDATION,
      RISK_OVERHANG_VALIDATION,
      CROSS_DOMAIN_ALIGNMENT_VALIDATION,
    ],
  });
  assert(
    vDep.violations.some(x => x.code === L7SemanticViolationCode.ROLLOUT_DEPENDENCY_NOT_ENABLED),
    'dependency not enabled flagged',
  );

  // Certification missing.
  const certBroken: L7ValidationFamilyDefinition = {
    ...NARRATIVE_VALIDATION,
    certification_band_green: false,
  };
  const vCert = rv.validate({
    families: [
      MARKET_STRENGTH_VALIDATION,
      DERIVATIVES_CONTRADICTION_VALIDATION,
      PROTOCOL_SUBSTANCE_VALIDATION,
      certBroken,
      ACCUMULATION_VALIDATION,
      RISK_OVERHANG_VALIDATION,
      CROSS_DOMAIN_ALIGNMENT_VALIDATION,
    ],
  });
  assert(
    vCert.violations.some(x => x.code === L7SemanticViolationCode.ROLLOUT_CERTIFICATION_MISSING),
    'certification missing flagged',
  );

  // Rollout phase comparator sanity.
  assert(
    compareRolloutPhase(
      L7ValidationRolloutPhase.P1_FOUNDATIONAL,
      L7ValidationRolloutPhase.P6_ALIGNMENT,
    ) < 0,
    'P1 comes before P6',
  );

  // Audit surface classification.
  assert(
    surfaceForViolation(L7SemanticViolationCode.UNKNOWN_PRIMARY_CLASS) === 'PRIMARY_CLASS',
    'UNKNOWN_PRIMARY_CLASS surface PRIMARY_CLASS',
  );
  assert(
    surfaceForViolation(L7SemanticViolationCode.MODIFIER_DUPLICATE) === 'MODIFIER',
    'MODIFIER_DUPLICATE surface MODIFIER',
  );
  assert(
    surfaceForViolation(L7SemanticViolationCode.TEMPLATE_NOT_REGISTERED) === 'CONTRADICTION_TEMPLATE',
    'TEMPLATE_NOT_REGISTERED surface CONTRADICTION_TEMPLATE',
  );
  assert(
    surfaceForViolation(L7SemanticViolationCode.ROLLOUT_OUT_OF_ORDER) === 'ROLLOUT',
    'ROLLOUT_OUT_OF_ORDER surface ROLLOUT',
  );

  assert(
    defaultSeverityForViolation(L7SemanticViolationCode.CLEAN_CONFIRMATION_MASQUERADE) === 'CRITICAL',
    'CLEAN_CONFIRMATION_MASQUERADE is CRITICAL',
  );
  assert(
    defaultSeverityForViolation(L7SemanticViolationCode.FAMILY_SEMANTIC_DRIFT) === 'CRITICAL',
    'FAMILY_SEMANTIC_DRIFT is CRITICAL',
  );

  // Audit log plumbing.
  resetSemanticAuditLog();
  assert(!hasAnySemanticViolations(), 'audit log empty after reset');
  emitSemanticAuditRecord({
    violationCode: L7SemanticViolationCode.TEMPLATE_NOT_REGISTERED,
    source: 'test',
    semanticSurface: 'CONTRADICTION_TEMPLATE',
    familyId: null,
    subjectClass: null,
    contradictionFamily: null,
    templateId: 'ct:foo@1',
    modifier: null,
    primaryClass: null,
    detail: 'test',
    context: {},
    severity: 'HIGH',
  });
  assert(hasAnySemanticViolations(), 'audit emit lands in log');
  assert(
    getSemanticViolationsByCode(L7SemanticViolationCode.TEMPLATE_NOT_REGISTERED).length === 1,
    'getSemanticViolationsByCode works',
  );
  assert(
    getSemanticViolationsBySurface('CONTRADICTION_TEMPLATE').length === 1,
    'getSemanticViolationsBySurface works',
  );
  resetSemanticAuditLog();

  // Invariants — all seven must be satisfied on the production set.
  const results = [
    {
      subject_id: 'vs1',
      primary_class: L7PrimaryValidationClass.WEAKLY_CONFIRMED,
      modifiers: [
        L7ValidationModifierCode.AMBIGUOUS,
        L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG,
      ],
      contradiction_family: L7ContradictionFamilyClass.UNLOCK_OVERHANG_CONTRADICTION,
      template_id: 'ct:narrative-strong-unlock-near@1',
      validation_family_id: L7ValidationFamilyId.RISK_OVERHANG_VALIDATION,
    },
    {
      subject_id: 'vs2',
      primary_class: L7PrimaryValidationClass.CONFIRMED,
      modifiers: [],
      contradiction_family: undefined,
      template_id: undefined,
      validation_family_id: L7ValidationFamilyId.MARKET_STRENGTH_VALIDATION,
    },
  ];
  const invA = checkInvariantA_singlePrimaryClass(results);
  assert(invA.satisfied, `INV-7.5-A satisfied (${invA.evidence.join(' | ')})`);
  const invB = checkInvariantB_modifierSeparation(results);
  assert(invB.satisfied, `INV-7.5-B satisfied (${invB.evidence.join(' | ')})`);
  const invC = checkInvariantC_registeredContradictionPrimitives(results);
  assert(invC.satisfied, `INV-7.5-C satisfied (${invC.evidence.join(' | ')})`);
  const invD = checkInvariantD_governedTemplates();
  assert(invD.satisfied, `INV-7.5-D satisfied (${invD.evidence.join(' | ')})`);
  const invE = checkInvariantE_familyCompleteness();
  assert(invE.satisfied, `INV-7.5-E satisfied (${invE.evidence.join(' | ')})`);
  const invF = checkInvariantF_rolloutLegality();
  assert(invF.satisfied, `INV-7.5-F satisfied (${invF.evidence.join(' | ')})`);
  const invG = checkInvariantG_noSemanticDrift();
  assert(invG.satisfied, `INV-7.5-G satisfied (${invG.evidence.join(' | ')})`);

  // Invariant failure surfaces under bad inputs.
  const badResults = [
    {
      subject_id: 'bad1',
      primary_class: 'CONFIRMED',
      modifiers: ['CONFIRMED'],
    },
  ];
  const invBBad = checkInvariantB_modifierSeparation(badResults);
  assert(!invBBad.satisfied, 'INV-7.5-B detects primary-class smuggled as modifier');

  const invCBad = checkInvariantC_registeredContradictionPrimitives([
    {
      subject_id: 'bad2',
      primary_class: L7PrimaryValidationClass.CONFLICTING,
      modifiers: [],
      contradiction_family: 'UNKNOWN_FAMILY',
    },
  ]);
  assert(!invCBad.satisfied, 'INV-7.5-C detects unregistered contradiction family');
}

// ── Summary ──────────────────────────────────────────────────────────────
const total = passed + failed;
console.log('\n================ L7.5 TEST SUMMARY ================');
console.log(`Passed: ${passed}/${total}`);
if (failed > 0) {
  console.log(`Failed: ${failed}/${total}`);
  process.exitCode = 1;
} else {
  console.log('All L7.5 semantic-lawbook tests passed.');
}
