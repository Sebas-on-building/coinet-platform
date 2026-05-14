/**
 * L11.2 — Score Doctrine, Score Families, and Score Object Model
 * Certification Test Suite (§11.2.21)
 *
 * 5 Bands:
 *   A — Family catalogue (§11.2.21 Band A)
 *   B — Meaning and direction (§11.2.21 Band B)
 *   C — Score object model (§11.2.21 Band C)
 *   D — Band, readiness, and reserved-family law (§11.2.21 Band D)
 *   E — Audit and invariants INV-11.2-A..H (§11.2.21 Band E)
 */

import {
  // contracts
  L11ScoreFamily,
  ALL_L11_SCORE_FAMILIES,
  L11_PRODUCTION_SCORE_FAMILIES,
  L11_RESERVED_SCORE_FAMILIES,
  isL11ProductionScoreFamily,
  isL11ReservedScoreFamily,
  L11ScoreProductionStatus,
  ALL_L11_SCORE_PRODUCTION_STATUSES,
  statusAllowsCurrentEmission,
  statusAllowsHistoricalReadability,
  statusForbidsProductionEmission,
  L11ScoreFamilyDirectionClass,
  ALL_L11_SCORE_FAMILY_DIRECTION_CLASSES,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  detectL11DirectionMixingDoctrine,
  L11ScoreFamilyMeaningClaim,
  L11ScoreDownstreamUse,
  L11ForbiddenScoreUse,
  L11ScoreDisclosureRequirement,
  L11CalibrationCategory,
  L11_REQUIRED_FORBIDDEN_USES,
  L11ScoreBand,
  ALL_L11_SCORE_BANDS,
  L11ScoreBandPolicy,
  L11_DEFAULT_BAND_THRESHOLDS,
  L11_BAND_POLICY_VERSION,
  resolveL11ScoreBand,
  checkL11BandThresholdIntegrity,
  L11ScoreOutput,
  isL11ScoreInBounds,
  isL11ScoreTransformationConsistent,
  extractL11ReplayMaterial,
  canonicalScoreOutputReplayHash,
  L11ScoreObjectReadinessClass,
  L11_SCORE_FAMILY_DEFINITIONS,
  getL11ScoreFamilyDefinition,
  L11_DOCTRINE_POLICY_VERSION,
  L11ScoreFamilyDefinition,
} from '../l11/contracts';

import {
  buildL11ScoreFamilyRegistryReport,
  getL11ProductionScoreFamilyDefinition,
  L11_PRODUCTION_MEANING_CLAIMS,
  buildL11MeaningClaimRegistryReport,
  getL11MeaningClaimForFamily,
  L11_DIRECTION_REGISTRY_ENTRIES,
  buildL11ScoreDirectionRegistryReport,
  getL11ScoreDirectionForFamily,
  L11_BAND_POLICIES,
  buildL11BandPolicyRegistryReport,
  getL11BandPolicyForFamily,
  L11_RESERVED_FAMILY_ENTRIES,
  buildL11ReservedFamilyRegistryReport,
  isL11FamilyReserved,
  L11_REQUIRED_OUTPUT_CLASSES,
  buildL11OutputClassRegistryReport,
  isL11RegisteredScoreOutputClass,
} from '../l11/registry';

import {
  validateL11ScoreFamilyDefinition,
  validateL11ScoreFamilyDefinitions,
  validateL11ScoreFamilyMeaningClaim,
  validateL11MeaningClaimUniqueness,
  validateL11Direction,
  validateL11ScoreBandPolicy,
  validateL11ScoreOutput,
  scanL11FamilyInterpretation,
  classifyL11ScoreObjectReadiness,
  L11ScoreDoctrineViolationCode,
  ALL_L11_SCORE_DOCTRINE_VIOLATION_CODES,
  severityForL11DoctrineCode,
  makeL11ScoreDoctrineIssue,
} from '../l11/validation';

import {
  resetL11ScoreDoctrineAuditLog,
  emitL11ScoreDoctrineAuditRecord,
  emitL11ScoreDoctrineAuditBatch,
  getL11ScoreDoctrineAuditLog,
  getL11ScoreDoctrineCriticalViolations,
  getL11ScoreDoctrineViolationsByCode,
  hasAnyL11ScoreDoctrineViolations,
  getL11ScoreDoctrineViolationCount,
  isL11ScoreDoctrineAuditDeterministic,
} from '../l11/constitution/l11-score-doctrine-audit';

import {
  runL11_2InvariantSuite,
  checkInvariantL11_2_A_ProductionMeaning,
  checkInvariantL11_2_B_Direction,
  checkInvariantL11_2_C_ObjectCompleteness,
  checkInvariantL11_2_D_ReservedEmbargo,
  checkInvariantL11_2_E_BandDirection,
  checkInvariantL11_2_F_NonJudgment,
  checkInvariantL11_2_G_ReplayIdentity,
  checkInvariantL11_2_H_Disclosure,
  l11_2InvariantTitleById,
} from '../l11/invariants/l11_2-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function reset(): void {
  resetL11ScoreDoctrineAuditLog();
}

// ─── Helpers to build a complete production score output ───────────────

function buildBaseScoreOutput(
  overrides: Partial<L11ScoreOutput> = {},
): L11ScoreOutput {
  const family = overrides.score_family ?? L11ScoreFamily.OPPORTUNITY;
  const final_score = overrides.final_score ?? 72;
  const base: L11ScoreOutput = {
    score_id: 'l11d.score.demo.000001',
    score_family: family,
    score_name: `${family.toLowerCase()}_score`,
    score_version: 'v1.0.0',

    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    as_of: '2026-05-05T00:00:00Z',

    raw_score: 70,
    modified_score: 71,
    final_score,
    score_band: L11ScoreBand.HIGH,

    score_meaning_claim_ref: `l11d.meaning_claim.${family.toLowerCase()}.v1`,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[family],

    component_score_refs: ['l11d.component.opp.evidence', 'l11d.component.opp.regime'],
    positive_attribution_refs: ['l11d.attr.pos.001'],
    negative_attribution_refs: ['l11d.attr.neg.001'],

    missing_data_profile_ref: 'l11d.missing.profile.001',
    missing_data_penalty_refs: ['l11d.missing.penalty.001'],
    regime_modifier_refs: ['l11d.regime.modifier.001'],
    sequence_modifier_refs: ['l11d.sequence.modifier.001'],
    hypothesis_modifier_refs: ['l11d.hypothesis.modifier.001'],
    confidence_modifier_ref: 'l11d.confidence.modifier.001',

    restriction_profile_ref: 'l11d.restriction.profile.001',
    calibration_target_ref: 'l11d.calibration.target.001',
    evidence_pack_ref: 'l11d.evidence.pack.001',
    input_snapshot_ref: 'l11d.input.snapshot.001',

    compute_run_id: 'l11d.compute.run.001',
    replay_hash: '__placeholder__',
    policy_version: L11_DOCTRINE_POLICY_VERSION,
    ...overrides,
  };
  // Recompute replay_hash from the full final material so the object is
  // self-consistent unless explicitly overridden afterwards.
  const replay_hash = canonicalScoreOutputReplayHash(extractL11ReplayMaterial(base));
  return { ...base, replay_hash };
}

function buildCompleteScoreFor(family: L11ScoreFamily): L11ScoreOutput {
  const def = getL11ScoreFamilyDefinition(family);
  const directionRequiresHypothesis = def?.requires_hypothesis_modifiers ?? false;
  const directionRequiresRegime = def?.requires_regime_modifiers ?? false;
  const directionRequiresSequence = def?.requires_sequence_modifiers ?? false;
  return buildBaseScoreOutput({
    score_id: `l11d.score.${family.toLowerCase()}.000001`,
    score_family: family,
    score_name: `${family.toLowerCase()}_score`,
    score_meaning_claim_ref: def?.meaning_claim_ref ?? '',
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[family],
    final_score: 72,
    score_band: L11ScoreBand.HIGH,
    regime_modifier_refs: directionRequiresRegime ? ['l11d.regime.modifier.001'] : [],
    sequence_modifier_refs: directionRequiresSequence ? ['l11d.sequence.modifier.001'] : [],
    hypothesis_modifier_refs: directionRequiresHypothesis ? ['l11d.hypothesis.modifier.001'] : [],
  });
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Family Catalogue (§11.2.21 Band A)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Family Catalogue ═══');
reset();

assert(ALL_L11_SCORE_FAMILIES.length === 15, 'A.01 15 score families total');
assert(L11_PRODUCTION_SCORE_FAMILIES.length === 8, 'A.02 8 production families');
assert(L11_RESERVED_SCORE_FAMILIES.length === 7, 'A.03 7 reserved families');

assert(L11_PRODUCTION_SCORE_FAMILIES.includes(L11ScoreFamily.OPPORTUNITY), 'A.04 OPPORTUNITY production');
assert(L11_PRODUCTION_SCORE_FAMILIES.includes(L11ScoreFamily.RISK), 'A.05 RISK production');
assert(L11_PRODUCTION_SCORE_FAMILIES.includes(L11ScoreFamily.TIMING), 'A.06 TIMING production');
assert(L11_PRODUCTION_SCORE_FAMILIES.includes(L11ScoreFamily.THESIS_COHERENCE), 'A.07 THESIS_COHERENCE production');
assert(L11_PRODUCTION_SCORE_FAMILIES.includes(L11ScoreFamily.SIGNAL_CONFIDENCE), 'A.08 SIGNAL_CONFIDENCE production');
assert(L11_PRODUCTION_SCORE_FAMILIES.includes(L11ScoreFamily.MARKET_STRUCTURE), 'A.09 MARKET_STRUCTURE production');
assert(L11_PRODUCTION_SCORE_FAMILIES.includes(L11ScoreFamily.WHALE_CONVICTION), 'A.10 WHALE_CONVICTION production');
assert(L11_PRODUCTION_SCORE_FAMILIES.includes(L11ScoreFamily.UNLOCK_RISK), 'A.11 UNLOCK_RISK production');

assert(L11_RESERVED_SCORE_FAMILIES.includes(L11ScoreFamily.NARRATIVE_QUALITY), 'A.12 NARRATIVE_QUALITY reserved');
assert(L11_RESERVED_SCORE_FAMILIES.includes(L11ScoreFamily.FUNDAMENTAL_SUBSTANCE), 'A.13 FUNDAMENTAL_SUBSTANCE reserved');
assert(L11_RESERVED_SCORE_FAMILIES.includes(L11ScoreFamily.LIQUIDITY_QUALITY), 'A.14 LIQUIDITY_QUALITY reserved');
assert(L11_RESERVED_SCORE_FAMILIES.includes(L11ScoreFamily.MANIPULATION_RISK), 'A.15 MANIPULATION_RISK reserved');
assert(L11_RESERVED_SCORE_FAMILIES.includes(L11ScoreFamily.ECOSYSTEM_BETA), 'A.16 ECOSYSTEM_BETA reserved');
assert(L11_RESERVED_SCORE_FAMILIES.includes(L11ScoreFamily.CONTINUATION_QUALITY), 'A.17 CONTINUATION_QUALITY reserved');
assert(L11_RESERVED_SCORE_FAMILIES.includes(L11ScoreFamily.REVERSAL_RISK), 'A.18 REVERSAL_RISK reserved');

for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
  assert(isL11ProductionScoreFamily(f), `A.19/${f} isL11ProductionScoreFamily`);
  assert(!isL11ReservedScoreFamily(f), `A.20/${f} not reserved`);
}
for (const f of L11_RESERVED_SCORE_FAMILIES) {
  assert(isL11ReservedScoreFamily(f), `A.21/${f} isL11ReservedScoreFamily`);
  assert(!isL11ProductionScoreFamily(f), `A.22/${f} not production`);
}

// Production status enum + helpers
assert(ALL_L11_SCORE_PRODUCTION_STATUSES.length === 5, 'A.30 5 production statuses');
assert(statusAllowsCurrentEmission(L11ScoreProductionStatus.PRODUCTION_ENABLED), 'A.31 PRODUCTION_ENABLED current emission');
assert(statusAllowsCurrentEmission(L11ScoreProductionStatus.FROZEN), 'A.32 FROZEN current emission');
assert(!statusAllowsCurrentEmission(L11ScoreProductionStatus.RESERVED), 'A.33 RESERVED no emission');
assert(!statusAllowsCurrentEmission(L11ScoreProductionStatus.EXPERIMENTAL_BLOCKED), 'A.34 EXPERIMENTAL_BLOCKED no emission');
assert(!statusAllowsCurrentEmission(L11ScoreProductionStatus.DEPRECATED), 'A.35 DEPRECATED no current emission');
assert(statusAllowsHistoricalReadability(L11ScoreProductionStatus.DEPRECATED), 'A.36 DEPRECATED historically readable');
assert(statusForbidsProductionEmission(L11ScoreProductionStatus.RESERVED), 'A.37 RESERVED forbids emission');
assert(statusForbidsProductionEmission(L11ScoreProductionStatus.EXPERIMENTAL_BLOCKED), 'A.38 EXPERIMENTAL forbids emission');
assert(statusForbidsProductionEmission(L11ScoreProductionStatus.DEPRECATED), 'A.39 DEPRECATED forbids emission');
assert(!statusForbidsProductionEmission(L11ScoreProductionStatus.PRODUCTION_ENABLED), 'A.40 PRODUCTION_ENABLED does not forbid');

// Catalogue must contain definitions for every family
assert(L11_SCORE_FAMILY_DEFINITIONS.length === 15, 'A.50 15 family definitions');
for (const f of ALL_L11_SCORE_FAMILIES) {
  const def = getL11ScoreFamilyDefinition(f);
  assert(def !== undefined, `A.51/${f} catalogue contains definition`);
}

// Production families must declare lower-layer + output surfaces
for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
  const def = getL11ScoreFamilyDefinition(f)!;
  assert(def.production_status === L11ScoreProductionStatus.PRODUCTION_ENABLED,
    `A.60/${f} production_status PRODUCTION_ENABLED`);
  assert(def.required_lower_layer_surfaces.length > 0,
    `A.61/${f} declares lower-layer surfaces`);
  assert(def.required_output_surfaces.length === 8,
    `A.62/${f} declares 8 output surfaces`);
  assert(def.required_disclosure_requirements.length > 0,
    `A.63/${f} declares disclosures`);
  assert(def.illegal_interpretations.length > 0,
    `A.64/${f} declares illegal interpretations`);
  assert(def.band_policy_ref.includes(f.toLowerCase()),
    `A.65/${f} band policy ref names family`);
  assert(def.policy_version === L11_DOCTRINE_POLICY_VERSION,
    `A.66/${f} doctrine policy version`);
}

// Reserved families must NOT declare lower-layer or output surfaces
for (const f of L11_RESERVED_SCORE_FAMILIES) {
  const def = getL11ScoreFamilyDefinition(f)!;
  assert(def.production_status === L11ScoreProductionStatus.RESERVED,
    `A.70/${f} production_status RESERVED`);
  assert(def.required_lower_layer_surfaces.length === 0,
    `A.71/${f} no lower-layer surfaces`);
  assert(def.required_output_surfaces.length === 0,
    `A.72/${f} no output surfaces`);
}

// Family registry report
const familyReport = buildL11ScoreFamilyRegistryReport();
assert(familyReport.ok, `A.80 family registry ok: ${familyReport.issues.map(i => i.reason).join('; ')}`);
assert(familyReport.production_families.length === 8, 'A.81 family report 8 production');
assert(familyReport.reserved_families.length === 7, 'A.82 family report 7 reserved');
assert(familyReport.definitions_count === 15, 'A.83 family report 15 definitions');

// Duplicate family rejection
const dupDefs = [...L11_SCORE_FAMILY_DEFINITIONS, L11_SCORE_FAMILY_DEFINITIONS[0]];
const dupReport = buildL11ScoreFamilyRegistryReport(dupDefs);
assert(!dupReport.ok, 'A.84 duplicate family rejected');
assert(dupReport.issues.some(i => i.reason.includes('duplicate')), 'A.85 duplicate issue surfaced');

// Reserved-family registry
const reservedReport = buildL11ReservedFamilyRegistryReport();
assert(reservedReport.ok, `A.90 reserved registry ok: ${reservedReport.issues.map(i => i.reason).join('; ')}`);
assert(reservedReport.count === 7, 'A.91 reserved entries count');
for (const f of L11_RESERVED_SCORE_FAMILIES) {
  assert(isL11FamilyReserved(f), `A.92/${f} isL11FamilyReserved true`);
}
for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
  assert(!isL11FamilyReserved(f), `A.93/${f} not reserved`);
}

// Production-family accessor blocks reserved
assert(getL11ProductionScoreFamilyDefinition(L11ScoreFamily.OPPORTUNITY) !== null,
  'A.100 production accessor returns OPPORTUNITY');
assert(getL11ProductionScoreFamilyDefinition(L11ScoreFamily.NARRATIVE_QUALITY) === null,
  'A.101 production accessor blocks NARRATIVE_QUALITY');

// Catalogue validator
const catalogueResult = validateL11ScoreFamilyDefinitions(L11_SCORE_FAMILY_DEFINITIONS);
assert(catalogueResult.ok, `A.110 catalogue validator ok: ${catalogueResult.issues.map(i => i.code).join('; ')}`);

// Output class registry
const outputClassReport = buildL11OutputClassRegistryReport();
assert(outputClassReport.ok, `A.120 output class registry ok: ${outputClassReport.issues.map(i => i.reason).join('; ')}`);
assert(outputClassReport.recognised_classes === 8, 'A.121 8 output classes');
assert(outputClassReport.checked_families === 8, 'A.122 8 checked families');
for (const c of L11_REQUIRED_OUTPUT_CLASSES) {
  assert(isL11RegisteredScoreOutputClass(c), `A.123/${c} registered output class`);
}

// ═══════════════════════════════════════════════════════════════
// BAND B — Meaning and Direction (§11.2.21 Band B)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Meaning and Direction ═══');
reset();

assert(L11_PRODUCTION_MEANING_CLAIMS.length === 8, 'B.01 8 production meaning claims');

// Meaning claim registry
const claimReport = buildL11MeaningClaimRegistryReport();
assert(claimReport.ok, `B.02 meaning claim registry ok: ${claimReport.issues.map(i => i.reason).join('; ')}`);
assert(claimReport.count === 8, 'B.03 8 claims registered');

// Each claim individually validates
for (const c of L11_PRODUCTION_MEANING_CLAIMS) {
  const r = validateL11ScoreFamilyMeaningClaim(c);
  assert(r.ok, `B.10/${c.score_family} claim ok: ${r.issues.map(i => i.code).join('; ')}`);
  assert(c.measures.length > 0, `B.11/${c.score_family} measures non-empty`);
  assert(c.does_not_measure.length > 0, `B.12/${c.score_family} does_not_measure non-empty`);
  assert(!!c.high_value_means, `B.13/${c.score_family} high_value_means present`);
  assert(!!c.low_value_means, `B.14/${c.score_family} low_value_means present`);
  assert(c.illegal_interpretations.length > 0, `B.15/${c.score_family} illegal interpretations`);
  for (const u of L11_REQUIRED_FORBIDDEN_USES) {
    assert(c.forbidden_downstream_uses.includes(u),
      `B.16/${c.score_family}/${u} forbidden use declared`);
  }
}

// Uniqueness
const dupClaim = [...L11_PRODUCTION_MEANING_CLAIMS, L11_PRODUCTION_MEANING_CLAIMS[0]];
const uniq = validateL11MeaningClaimUniqueness(dupClaim);
assert(!uniq.ok, 'B.20 duplicate meaning claim rejected');

// Missing meaning_claim text rejected
const badClaim: L11ScoreFamilyMeaningClaim = {
  ...L11_PRODUCTION_MEANING_CLAIMS[0],
  meaning_claim: '',
};
const badRes = validateL11ScoreFamilyMeaningClaim(badClaim);
assert(!badRes.ok, 'B.21 empty meaning_claim rejected');
assert(badRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_MISSING),
  'B.22 L11D_MEANING_CLAIM_MISSING surfaced');

// Missing meaning_claim_id rejected
const badIdClaim: L11ScoreFamilyMeaningClaim = {
  ...L11_PRODUCTION_MEANING_CLAIMS[0],
  meaning_claim_id: '',
};
const badIdRes = validateL11ScoreFamilyMeaningClaim(badIdClaim);
assert(!badIdRes.ok, 'B.23 empty meaning_claim_id rejected');
assert(badIdRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_ID_MISSING),
  'B.24 L11D_MEANING_CLAIM_ID_MISSING surfaced');

// Missing high/low semantics rejected
const noHighClaim: L11ScoreFamilyMeaningClaim = {
  ...L11_PRODUCTION_MEANING_CLAIMS[0],
  high_value_means: '',
};
const noHighRes = validateL11ScoreFamilyMeaningClaim(noHighClaim);
assert(noHighRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_HIGH_LOW_MISSING),
  'B.25 L11D_MEANING_CLAIM_HIGH_LOW_MISSING for missing high');

// Missing required forbidden uses
const weakClaim: L11ScoreFamilyMeaningClaim = {
  ...L11_PRODUCTION_MEANING_CLAIMS[0],
  forbidden_downstream_uses: [L11ForbiddenScoreUse.PORTFOLIO_ALLOCATION],
};
const weakRes = validateL11ScoreFamilyMeaningClaim(weakClaim);
assert(weakRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_MEANING_CLAIM_FORBIDDEN_USES_INCOMPLETE),
  'B.26 missing forbidden uses surfaced');

// Direction enum
assert(ALL_L11_SCORE_FAMILY_DIRECTION_CLASSES.length === 9, 'B.30 9 family direction classes');
assert(L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.OPPORTUNITY] ===
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_CONSTRUCTIVE, 'B.31 OPPORTUNITY direction');
assert(L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.RISK] ===
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS, 'B.32 RISK direction');
assert(L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.TIMING] ===
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_TIMELY, 'B.33 TIMING direction');
assert(L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.THESIS_COHERENCE] ===
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_COHERENT, 'B.34 THESIS_COHERENCE direction');
assert(L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.SIGNAL_CONFIDENCE] ===
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_RELIABLE, 'B.35 SIGNAL_CONFIDENCE direction');
assert(L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.MARKET_STRUCTURE] ===
  L11ScoreFamilyDirectionClass.HIGHER_IS_STRUCTURALLY_HEALTHIER, 'B.36 MARKET_STRUCTURE direction');
assert(L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.WHALE_CONVICTION] ===
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_CONSTRUCTIVE, 'B.37 WHALE_CONVICTION direction');
assert(L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.UNLOCK_RISK] ===
  L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_SUPPLY_RISK, 'B.38 UNLOCK_RISK direction');

// Direction registry
const dirReport = buildL11ScoreDirectionRegistryReport();
assert(dirReport.ok, `B.40 direction registry ok: ${dirReport.issues.map(i => i.reason).join('; ')}`);
assert(L11_DIRECTION_REGISTRY_ENTRIES.length === 8, 'B.41 8 direction entries');
for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
  assert(getL11ScoreDirectionForFamily(f) === L11_REQUIRED_DIRECTION_BY_FAMILY[f],
    `B.42/${f} registry direction matches`);
}

// Direction validator
for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
  const r = validateL11Direction({
    score_family: f,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[f],
  });
  assert(r.ok, `B.50/${f} direction validator ok`);
}
const wrongDir = validateL11Direction({
  score_family: L11ScoreFamily.RISK,
  direction_class: L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_CONSTRUCTIVE,
});
assert(!wrongDir.ok, 'B.51 wrong direction rejected');
assert(wrongDir.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISMATCH),
  'B.52 L11D_DIRECTION_MISMATCH surfaced');

const missingDir = validateL11Direction({
  score_family: L11ScoreFamily.OPPORTUNITY,
  direction_class: null,
});
assert(!missingDir.ok, 'B.53 missing direction rejected');
assert(missingDir.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISSING),
  'B.54 L11D_DIRECTION_MISSING surfaced');

const mixedDir = validateL11Direction({
  score_family: L11ScoreFamily.OPPORTUNITY,
  direction_class: L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_CONSTRUCTIVE,
  description: 'higher is better but higher is worse for this score',
});
assert(!mixedDir.ok, 'B.55 mixed direction description rejected');
assert(mixedDir.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_DIRECTION_MIXED),
  'B.56 L11D_DIRECTION_MIXED surfaced');
assert(detectL11DirectionMixingDoctrine('higher is better and higher is worse'),
  'B.57 detector flags both directions');
assert(!detectL11DirectionMixingDoctrine('higher is more dangerous, lower is less dangerous'),
  'B.58 detector accepts single-direction text');

// Family-interpretation scan rejects leakage
const buyLeak = scanL11FamilyInterpretation({
  score_family: L11ScoreFamily.OPPORTUNITY,
  texts: ['high opportunity score means buy'],
});
assert(!buyLeak.ok, 'B.60 opportunity-as-buy leak rejected');
assert(buyLeak.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK),
  'B.61 family interpretation leak code');

const safeLeak = scanL11FamilyInterpretation({
  score_family: L11ScoreFamily.RISK,
  texts: ['low risk score means safe'],
});
assert(!safeLeak.ok, 'B.62 risk-as-safe leak rejected');

const enterLeak = scanL11FamilyInterpretation({
  score_family: L11ScoreFamily.TIMING,
  texts: ['timing score confirms entry'],
});
assert(!enterLeak.ok, 'B.63 timing-as-entry leak rejected');

const recLeak = scanL11FamilyInterpretation({
  score_family: L11ScoreFamily.OPPORTUNITY,
  texts: ['this score recommends buy now'],
});
assert(!recLeak.ok, 'B.64 recommendation language rejected');
assert(recLeak.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_RECOMMENDATION),
  'B.65 recommendation code');

const judgmentLeak = scanL11FamilyInterpretation({
  score_family: L11ScoreFamily.OPPORTUNITY,
  texts: ['this is the final judgment of the asset'],
});
assert(judgmentLeak.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_JUDGMENT),
  'B.66 judgment code');

const cleanScan = scanL11FamilyInterpretation({
  score_family: L11ScoreFamily.OPPORTUNITY,
  texts: ['governed quantitative interpretation of opportunity quality'],
});
assert(cleanScan.ok, 'B.67 clean meaning passes scan');

// Default getters
for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
  assert(getL11MeaningClaimForFamily(f) !== null, `B.70/${f} claim accessible`);
}

// ═══════════════════════════════════════════════════════════════
// BAND C — Score Object Model (§11.2.21 Band C)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Score Object Model ═══');
reset();

// Complete production score passes for every production family
for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
  const s = buildCompleteScoreFor(f);
  const r = validateL11ScoreOutput(s);
  assert(r.ok, `C.01/${f} complete score validates: ${r.issues.map(i => i.code).join('; ')}`);
}

// Missing identity rejects
const noId = buildBaseScoreOutput({ score_id: '' });
const noIdRes = validateL11ScoreOutput(noId);
assert(!noIdRes.ok, 'C.10 missing score_id rejected');
assert(noIdRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_SCORE_IDENTITY_MISSING),
  'C.11 L11D_SCORE_IDENTITY_MISSING surfaced');

const noVersion = buildBaseScoreOutput({ score_version: '' });
const noVerRes = validateL11ScoreOutput(noVersion);
assert(noVerRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_SCORE_VERSION_MISSING),
  'C.12 missing score_version surfaced');

// Missing scope rejects
const noScope = buildBaseScoreOutput({ scope_id: '' });
const noScopeRes = validateL11ScoreOutput(noScope);
assert(noScopeRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_SCORE_SCOPE_MISSING),
  'C.13 missing scope rejected');

const noAsOf = buildBaseScoreOutput({ as_of: '' });
const noAsOfRes = validateL11ScoreOutput(noAsOf);
assert(noAsOfRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_SCORE_AS_OF_MISSING),
  'C.14 missing as_of rejected');

// Numeric bounds
assert(isL11ScoreInBounds(0), 'C.20 0 in bounds');
assert(isL11ScoreInBounds(50.5), 'C.21 50.5 in bounds');
assert(isL11ScoreInBounds(100), 'C.22 100 in bounds');
assert(!isL11ScoreInBounds(-1), 'C.23 -1 out of bounds');
assert(!isL11ScoreInBounds(101), 'C.24 101 out of bounds');
assert(!isL11ScoreInBounds(NaN), 'C.25 NaN rejected');
assert(!isL11ScoreInBounds(Infinity), 'C.26 Infinity rejected');

// Out-of-range scores
const overRaw = buildBaseScoreOutput({ raw_score: 105 });
const overRawRes = validateL11ScoreOutput(overRaw);
assert(overRawRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_RAW_SCORE_OUT_OF_RANGE),
  'C.30 raw_score > 100 rejected');

const overFinal = buildBaseScoreOutput({ final_score: 150 });
const overFinalRes = validateL11ScoreOutput(overFinal);
assert(overFinalRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_FINAL_SCORE_OUT_OF_RANGE),
  'C.31 final_score > 100 rejected');

const negModified = buildBaseScoreOutput({ modified_score: -2 });
const negModRes = validateL11ScoreOutput(negModified);
assert(negModRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_MODIFIED_SCORE_OUT_OF_RANGE),
  'C.32 modified_score < 0 rejected');

const nanFinal = buildBaseScoreOutput({ final_score: NaN });
const nanFinalRes = validateL11ScoreOutput(nanFinal);
assert(nanFinalRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_SCORE_VALUE_NOT_FINITE),
  'C.33 NaN final_score rejected');

// Transformation legality
const xformBad = buildBaseScoreOutput({
  raw_score: 50,
  modified_score: 80,
  final_score: 80,
  regime_modifier_refs: [],
  sequence_modifier_refs: [],
  hypothesis_modifier_refs: [],
  confidence_modifier_ref: null,
});
const xformRes = validateL11ScoreOutput(xformBad);
assert(xformRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_TRANSFORMATION_INCONSISTENT),
  'C.40 raw≠modified without modifier refs rejected');

const xformOk = buildBaseScoreOutput({
  raw_score: 50,
  modified_score: 50,
  final_score: 50,
  regime_modifier_refs: [],
  sequence_modifier_refs: [],
  hypothesis_modifier_refs: [],
  confidence_modifier_ref: null,
});
// Note: family-specific disclosure rules will still fail (regime/sequence/hypothesis required for OPPORTUNITY)
// but the transformation issue alone must be absent.
const xformOkRes = validateL11ScoreOutput(xformOk);
assert(!xformOkRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_TRANSFORMATION_INCONSISTENT),
  'C.41 raw=modified=final without modifier refs allowed by transformation law');

// Transformation utility
assert(isL11ScoreTransformationConsistent(buildBaseScoreOutput({
  raw_score: 70, modified_score: 70, final_score: 70,
  regime_modifier_refs: [], sequence_modifier_refs: [],
  hypothesis_modifier_refs: [], confidence_modifier_ref: null,
})).ok, 'C.42 trivial transformation ok');
assert(!isL11ScoreTransformationConsistent({
  ...buildBaseScoreOutput(),
  raw_score: 50, modified_score: 80, final_score: 80,
  regime_modifier_refs: [], sequence_modifier_refs: [],
  hypothesis_modifier_refs: [], confidence_modifier_ref: null,
}).ok, 'C.43 raw≠modified without refs flagged');

// Missing attribution
const noAttr = buildBaseScoreOutput({
  positive_attribution_refs: [],
  negative_attribution_refs: [],
});
const noAttrRes = validateL11ScoreOutput(noAttr);
assert(noAttrRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_ATTRIBUTION_MISSING),
  'C.50 missing attribution rejected');

// Missing missing-data profile
const noMissing = buildBaseScoreOutput({ missing_data_profile_ref: '' });
const noMissingRes = validateL11ScoreOutput(noMissing);
assert(noMissingRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_MISSING_DATA_PROFILE_MISSING),
  'C.51 missing missing_data_profile_ref rejected');

// Missing calibration target
const noCalib = buildBaseScoreOutput({ calibration_target_ref: '' });
const noCalibRes = validateL11ScoreOutput(noCalib);
assert(noCalibRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_CALIBRATION_TARGET_MISSING),
  'C.52 missing calibration_target_ref rejected');

// Missing replay hash
const noReplay = buildBaseScoreOutput();
const noReplay2: L11ScoreOutput = { ...noReplay, replay_hash: '' };
const noReplayRes = validateL11ScoreOutput(noReplay2);
assert(noReplayRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_REPLAY_HASH_MISSING),
  'C.53 missing replay_hash rejected');

// Wrong replay hash
const wrongHash: L11ScoreOutput = { ...buildBaseScoreOutput(), replay_hash: 'l11d.h.deadbeef' };
const wrongHashRes = validateL11ScoreOutput(wrongHash);
assert(wrongHashRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_REPLAY_HASH_MISMATCH),
  'C.54 wrong replay_hash rejected');

// Restriction profile / evidence pack / input snapshot / compute run / policy version missing
const noRestriction = buildBaseScoreOutput({ restriction_profile_ref: '' });
const noRestrictionRes = validateL11ScoreOutput(noRestriction);
assert(noRestrictionRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_RESTRICTION_PROFILE_MISSING),
  'C.55 missing restriction_profile_ref rejected');

const noEvidence = buildBaseScoreOutput({ evidence_pack_ref: '' });
const noEvidenceRes = validateL11ScoreOutput(noEvidence);
assert(noEvidenceRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_EVIDENCE_PACK_MISSING),
  'C.56 missing evidence_pack_ref rejected');

const noSnapshot = buildBaseScoreOutput({ input_snapshot_ref: '' });
const noSnapshotRes = validateL11ScoreOutput(noSnapshot);
assert(noSnapshotRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_INPUT_SNAPSHOT_MISSING),
  'C.57 missing input_snapshot_ref rejected');

const noCompute = buildBaseScoreOutput({ compute_run_id: '' });
const noComputeRes = validateL11ScoreOutput(noCompute);
assert(noComputeRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_COMPUTE_RUN_MISSING),
  'C.58 missing compute_run_id rejected');

const noPolicy = buildBaseScoreOutput({ policy_version: '' });
const noPolicyRes = validateL11ScoreOutput(noPolicy);
assert(noPolicyRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_POLICY_VERSION_MISSING),
  'C.59 missing policy_version rejected');

// Family-specific modifier disclosures
const noRegime = buildCompleteScoreFor(L11ScoreFamily.OPPORTUNITY);
const noRegime2: L11ScoreOutput = { ...noRegime, regime_modifier_refs: [], replay_hash: 'tbd' };
const noRegime3: L11ScoreOutput = { ...noRegime2, replay_hash: canonicalScoreOutputReplayHash(extractL11ReplayMaterial(noRegime2)) };
const noRegimeRes = validateL11ScoreOutput(noRegime3);
assert(noRegimeRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_REGIME_MODIFIER_MISSING),
  'C.60 OPPORTUNITY missing regime modifier rejected');

const noSeq = buildCompleteScoreFor(L11ScoreFamily.TIMING);
const noSeq2: L11ScoreOutput = { ...noSeq, sequence_modifier_refs: [], replay_hash: 'tbd' };
const noSeq3: L11ScoreOutput = { ...noSeq2, replay_hash: canonicalScoreOutputReplayHash(extractL11ReplayMaterial(noSeq2)) };
const noSeqRes = validateL11ScoreOutput(noSeq3);
assert(noSeqRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_SEQUENCE_MODIFIER_MISSING),
  'C.61 TIMING missing sequence modifier rejected');

const noHypo = buildCompleteScoreFor(L11ScoreFamily.THESIS_COHERENCE);
const noHypo2: L11ScoreOutput = { ...noHypo, hypothesis_modifier_refs: [], replay_hash: 'tbd' };
const noHypo3: L11ScoreOutput = { ...noHypo2, replay_hash: canonicalScoreOutputReplayHash(extractL11ReplayMaterial(noHypo2)) };
const noHypoRes = validateL11ScoreOutput(noHypo3);
assert(noHypoRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_HYPOTHESIS_MODIFIER_MISSING),
  'C.62 THESIS_COHERENCE missing hypothesis modifier rejected');

// Replay material extraction
const matBase = buildBaseScoreOutput();
const mat = extractL11ReplayMaterial(matBase);
assert(mat.score_family === matBase.score_family, 'C.70 replay material carries score_family');
assert(mat.policy_version === matBase.policy_version, 'C.71 replay material carries policy_version');
assert(mat.final_score === matBase.final_score, 'C.72 replay material carries final_score');

// ═══════════════════════════════════════════════════════════════
// BAND D — Band, Readiness, and Reserved-Family Law (§11.2.21 Band D)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Band, Readiness, Reserved-Family Law ═══');
reset();

// Band enum
assert(ALL_L11_SCORE_BANDS.length === 5, 'D.01 5 bands defined');
assert(ALL_L11_SCORE_BANDS.includes(L11ScoreBand.VERY_LOW), 'D.02 VERY_LOW present');
assert(ALL_L11_SCORE_BANDS.includes(L11ScoreBand.VERY_HIGH), 'D.03 VERY_HIGH present');

// Default thresholds
const integrity = checkL11BandThresholdIntegrity(L11_DEFAULT_BAND_THRESHOLDS);
assert(integrity.ok, `D.10 default thresholds intact: ${integrity.reason}`);

// Resolve at boundaries
assert(resolveL11ScoreBand(0) === L11ScoreBand.VERY_LOW, 'D.11 0 → VERY_LOW');
assert(resolveL11ScoreBand(20) === L11ScoreBand.VERY_LOW, 'D.12 20 → VERY_LOW (inclusive upper)');
assert(resolveL11ScoreBand(20.0001) === L11ScoreBand.LOW, 'D.13 20.0001 → LOW');
assert(resolveL11ScoreBand(40) === L11ScoreBand.LOW, 'D.14 40 → LOW');
assert(resolveL11ScoreBand(40.5) === L11ScoreBand.MEDIUM, 'D.15 40.5 → MEDIUM');
assert(resolveL11ScoreBand(60) === L11ScoreBand.MEDIUM, 'D.16 60 → MEDIUM');
assert(resolveL11ScoreBand(72) === L11ScoreBand.HIGH, 'D.17 72 → HIGH');
assert(resolveL11ScoreBand(80) === L11ScoreBand.HIGH, 'D.18 80 → HIGH');
assert(resolveL11ScoreBand(80.1) === L11ScoreBand.VERY_HIGH, 'D.19 80.1 → VERY_HIGH');
assert(resolveL11ScoreBand(100) === L11ScoreBand.VERY_HIGH, 'D.20 100 → VERY_HIGH');

// Out-of-range / invalid
assert(resolveL11ScoreBand(-1) === null, 'D.21 -1 unresolved');
assert(resolveL11ScoreBand(101) === null, 'D.22 101 unresolved');
assert(resolveL11ScoreBand(NaN) === null, 'D.23 NaN unresolved');

// Threshold integrity offenders
const gapped: typeof L11_DEFAULT_BAND_THRESHOLDS = [
  { band: L11ScoreBand.VERY_LOW, lower: 0, upper: 20, lower_inclusive: true, upper_inclusive: true },
  { band: L11ScoreBand.LOW, lower: 25, upper: 40, lower_inclusive: false, upper_inclusive: true },
  { band: L11ScoreBand.MEDIUM, lower: 40, upper: 60, lower_inclusive: false, upper_inclusive: true },
  { band: L11ScoreBand.HIGH, lower: 60, upper: 80, lower_inclusive: false, upper_inclusive: true },
  { band: L11ScoreBand.VERY_HIGH, lower: 80, upper: 100, lower_inclusive: false, upper_inclusive: true },
];
const gapRes = checkL11BandThresholdIntegrity(gapped);
assert(!gapRes.ok, 'D.30 gapped thresholds rejected');

// Band policy registry
const bandRep = buildL11BandPolicyRegistryReport();
assert(bandRep.ok, `D.40 band policy registry ok: ${bandRep.issues.map(i => i.reason).join('; ')}`);
assert(bandRep.count === 15, 'D.41 15 band policies registered');
for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
  assert(getL11BandPolicyForFamily(f) !== null, `D.42/${f} policy exists`);
}

// Band policy validator
for (const p of L11_BAND_POLICIES) {
  const r = validateL11ScoreBandPolicy(p);
  assert(r.ok, `D.50/${p.score_family} band policy ok: ${r.issues.map(i => i.code).join('; ')}`);
}

// Band policy direction mismatch
const bp = getL11BandPolicyForFamily(L11ScoreFamily.RISK)!;
const wrongDirPolicy: L11ScoreBandPolicy = {
  ...bp,
  direction_class: L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_CONSTRUCTIVE,
};
const wrongDirRes = validateL11ScoreBandPolicy(wrongDirPolicy);
assert(wrongDirRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISMATCH),
  'D.51 band policy direction mismatch rejected');

// Wrong band for final score
const wrongBand = buildBaseScoreOutput({ final_score: 30, score_band: L11ScoreBand.HIGH });
const wrongBandRes = validateL11ScoreOutput(wrongBand);
assert(wrongBandRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_SCORE_BAND_MISMATCH),
  'D.60 band/final_score mismatch rejected');

// Reserved-family emission blocked
const reservedScore: L11ScoreOutput = buildBaseScoreOutput({
  score_family: L11ScoreFamily.NARRATIVE_QUALITY,
  score_meaning_claim_ref: 'l11d.meaning_claim.narrative_quality.v1',
  direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.NARRATIVE_QUALITY],
});
const reservedRes = validateL11ScoreOutput(reservedScore);
assert(reservedRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_RESERVED_FAMILY_EMITTED),
  'D.70 reserved family emission blocked');

// Readiness classification
const completeReadiness = classifyL11ScoreObjectReadiness({
  score: buildCompleteScoreFor(L11ScoreFamily.OPPORTUNITY),
});
assert(completeReadiness.ok, `D.80 complete score readiness ok: ${completeReadiness.issues.map(i => i.code).join('; ')}`);
assert(completeReadiness.readiness_class === L11ScoreObjectReadinessClass.OBJECT_COMPLETE,
  'D.81 readiness OBJECT_COMPLETE');

const reservedReadiness = classifyL11ScoreObjectReadiness({ score: reservedScore });
assert(reservedReadiness.readiness_class === L11ScoreObjectReadinessClass.RESERVED_FAMILY_BLOCKED,
  'D.82 reserved score readiness RESERVED_FAMILY_BLOCKED');

const leakReadiness = classifyL11ScoreObjectReadiness({
  score: buildCompleteScoreFor(L11ScoreFamily.OPPORTUNITY),
  descriptive_texts: ['this score recommends buy now'],
});
assert(leakReadiness.readiness_class === L11ScoreObjectReadinessClass.SEMANTIC_LEAK_BLOCKED,
  'D.83 semantic-leak readiness SEMANTIC_LEAK_BLOCKED');

const disclosureReadiness = classifyL11ScoreObjectReadiness({
  score: { ...buildCompleteScoreFor(L11ScoreFamily.OPPORTUNITY), regime_modifier_refs: [] },
});
// Note: replay hash will mismatch too; but readiness should still classify as DISCLOSURE_REQUIRED
// because disclosure issues are checked before contract-incomplete fallback only when
// disclosure code present without semantic-leak/reserved. Replay hash mismatch is
// CONTRACT_INCOMPLETE. Order: reserved > semantic > disclosure > contract.
assert(
  disclosureReadiness.readiness_class === L11ScoreObjectReadinessClass.DISCLOSURE_REQUIRED ||
  disclosureReadiness.readiness_class === L11ScoreObjectReadinessClass.CONTRACT_INCOMPLETE,
  'D.84 disclosure-or-contract readiness on missing modifier');

const contractReadiness = classifyL11ScoreObjectReadiness({
  score: { ...buildCompleteScoreFor(L11ScoreFamily.OPPORTUNITY), score_id: '' },
});
assert(contractReadiness.readiness_class === L11ScoreObjectReadinessClass.CONTRACT_INCOMPLETE,
  'D.85 missing identity → CONTRACT_INCOMPLETE');

// Direction-mismatch on score
const wrongDirScore = buildBaseScoreOutput({
  score_family: L11ScoreFamily.RISK,
  score_meaning_claim_ref: 'l11d.meaning_claim.risk.v1',
  direction_class: L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_CONSTRUCTIVE,
});
const wrongDirScoreRes = validateL11ScoreOutput(wrongDirScore);
assert(wrongDirScoreRes.issues.some(i => i.code === L11ScoreDoctrineViolationCode.L11D_DIRECTION_MISMATCH),
  'D.90 score direction mismatch rejected');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants (§11.2.21 Band E)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
reset();

// Violation code namespace integrity
assert(ALL_L11_SCORE_DOCTRINE_VIOLATION_CODES.length >= 30,
  `E.01 doctrine code count = ${ALL_L11_SCORE_DOCTRINE_VIOLATION_CODES.length}`);
for (const c of ALL_L11_SCORE_DOCTRINE_VIOLATION_CODES) {
  assert(c.startsWith('L11D_'), `E.02/${c} L11D_ namespace`);
}

// Severity mapping
assert(severityForL11DoctrineCode(L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_RECOMMENDATION) === 'CRITICAL',
  'E.10 recommendation = CRITICAL');
assert(severityForL11DoctrineCode(L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_JUDGMENT) === 'CRITICAL',
  'E.11 judgment = CRITICAL');
assert(severityForL11DoctrineCode(L11ScoreDoctrineViolationCode.L11D_RESERVED_FAMILY_EMITTED) === 'CRITICAL',
  'E.12 reserved emit = CRITICAL');
assert(severityForL11DoctrineCode(L11ScoreDoctrineViolationCode.L11D_SCORE_BAND_MISMATCH) === 'ERROR',
  'E.13 band mismatch = ERROR');
assert(severityForL11DoctrineCode(L11ScoreDoctrineViolationCode.L11D_FAMILY_DUPLICATE) === 'ERROR',
  'E.14 family duplicate = ERROR');

// Audit emission deterministic
resetL11ScoreDoctrineAuditLog();
const issue = makeL11ScoreDoctrineIssue(
  L11ScoreDoctrineViolationCode.L11D_RESERVED_FAMILY_EMITTED,
  'reserved family attempted emission',
  { subject_ref: 'score:demo', score_family: L11ScoreFamily.NARRATIVE_QUALITY },
);
const rec1 = emitL11ScoreDoctrineAuditRecord(issue, { source: 'test', context: { test: 'a' } });
const rec2 = emitL11ScoreDoctrineAuditRecord(issue, { source: 'test', context: { test: 'a' } });
assert(rec1.audit_id !== rec2.audit_id, 'E.20 unique audit_id');
assert(isL11ScoreDoctrineAuditDeterministic(rec1, rec2), 'E.21 audit deterministic except id/timestamp');
assert(getL11ScoreDoctrineViolationCount() === 2, 'E.22 audit count = 2');
assert(getL11ScoreDoctrineCriticalViolations().length === 2, 'E.23 critical count = 2');
assert(getL11ScoreDoctrineViolationsByCode(
  L11ScoreDoctrineViolationCode.L11D_RESERVED_FAMILY_EMITTED).length === 2,
  'E.24 by-code count = 2');
assert(hasAnyL11ScoreDoctrineViolations(), 'E.25 hasAny true');

resetL11ScoreDoctrineAuditLog();
assert(!hasAnyL11ScoreDoctrineViolations(), 'E.26 reset clears audit log');
assert(getL11ScoreDoctrineViolationCount() === 0, 'E.27 reset count = 0');

// Batch emission
const batch = emitL11ScoreDoctrineAuditBatch(
  [issue, { ...issue, code: L11ScoreDoctrineViolationCode.L11D_OBJECT_NOT_READY,
            severity: severityForL11DoctrineCode(L11ScoreDoctrineViolationCode.L11D_OBJECT_NOT_READY) }],
  { source: 'test-batch' },
);
assert(batch.length === 2, 'E.30 batch emitted 2');
resetL11ScoreDoctrineAuditLog();

// Replay-hash determinism
const sA = buildBaseScoreOutput({ final_score: 65 });
const sB = buildBaseScoreOutput({ final_score: 65 });
assert(sA.replay_hash === sB.replay_hash, 'E.40 identical material → identical hash');

const sC = buildBaseScoreOutput({ final_score: 66 });
assert(sA.replay_hash !== sC.replay_hash, 'E.41 different final_score → different hash');

const sD = buildBaseScoreOutput({ score_version: 'v2.0.0' });
assert(sA.replay_hash !== sD.replay_hash, 'E.42 different score_version → different hash');

const sE = buildBaseScoreOutput({ scope_id: 'asset:eth' });
assert(sA.replay_hash !== sE.replay_hash, 'E.43 different scope_id → different hash');

const sF = buildBaseScoreOutput({ policy_version: 'l11.2.doctrine.v999' });
assert(sA.replay_hash !== sF.replay_hash, 'E.44 different policy_version → different hash');

const sG = buildBaseScoreOutput({ score_meaning_claim_ref: 'l11d.meaning.other' });
assert(sA.replay_hash !== sG.replay_hash, 'E.45 different meaning claim ref → different hash');

const sH = buildBaseScoreOutput({ regime_modifier_refs: ['x'] });
assert(sA.replay_hash !== sH.replay_hash, 'E.46 different regime modifier → different hash');

// Hash recomputation is deterministic across calls
const mat1 = extractL11ReplayMaterial(sA);
const h1 = canonicalScoreOutputReplayHash(mat1);
const h2 = canonicalScoreOutputReplayHash(mat1);
assert(h1 === h2, 'E.50 replay hash deterministic across recomputation');
assert(h1.startsWith('l11d.h.'), 'E.51 hash uses l11d.h. prefix');
assert(h1.length === 'l11d.h.'.length + 8, 'E.52 hash 8-hex tail');

// Set ordering: positive_attribution_refs reordered must yield same hash
const sJ = buildBaseScoreOutput({ positive_attribution_refs: ['x', 'y', 'z'] });
const sK = buildBaseScoreOutput({ positive_attribution_refs: ['z', 'y', 'x'] });
assert(sJ.replay_hash === sK.replay_hash, 'E.53 attribution ref ordering ignored');

// ── Invariants suite ────────────────────────────────────────────
const goodScores: L11ScoreOutput[] =
  L11_PRODUCTION_SCORE_FAMILIES.map(f => buildCompleteScoreFor(f));

const suite = runL11_2InvariantSuite({ scores: goodScores });
assert(suite.ok, `E.60 invariant suite ok: ${suite.results.filter(r => !r.ok).map(r => `${r.invariant_id} (${r.violations.length})`).join('; ')}`);
assert(suite.results.length === 8, 'E.61 8 invariants');
for (const r of suite.results) {
  assert(r.ok, `E.62/${r.invariant_id} ${r.title}: ${r.violations.slice(0, 2).join('; ')}`);
}

assert(l11_2InvariantTitleById('INV-11.2-A') === 'production-family meaning law', 'E.70 title A');
assert(l11_2InvariantTitleById('INV-11.2-B') === 'direction law', 'E.71 title B');
assert(l11_2InvariantTitleById('INV-11.2-C') === 'object completeness law', 'E.72 title C');
assert(l11_2InvariantTitleById('INV-11.2-D') === 'reserved-family embargo law', 'E.73 title D');
assert(l11_2InvariantTitleById('INV-11.2-E') === 'band/direction consistency law', 'E.74 title E');
assert(l11_2InvariantTitleById('INV-11.2-F') === 'non-judgment law', 'E.75 title F');
assert(l11_2InvariantTitleById('INV-11.2-G') === 'replay identity law', 'E.76 title G');
assert(l11_2InvariantTitleById('INV-11.2-H') === 'disclosure law', 'E.77 title H');

// Crafted offenders fail individual invariants

// INV-11.2-A — corrupt a meaning claim
const aBadClaims: L11ScoreFamilyMeaningClaim[] =
  L11_PRODUCTION_MEANING_CLAIMS.map(c =>
    c.score_family === L11ScoreFamily.OPPORTUNITY ? { ...c, meaning_claim: '' } : c,
  );
const aBad = checkInvariantL11_2_A_ProductionMeaning(L11_SCORE_FAMILY_DEFINITIONS, aBadClaims);
assert(!aBad.ok, 'E.80 INV-11.2-A breaks under corrupted meaning claim');

// INV-11.2-B — wrong direction in catalogue
const bBadDefs: L11ScoreFamilyDefinition[] =
  L11_SCORE_FAMILY_DEFINITIONS.map(d =>
    d.score_family === L11ScoreFamily.RISK
      ? { ...d, direction_class: L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_CONSTRUCTIVE }
      : d,
  );
const bBad = checkInvariantL11_2_B_Direction(bBadDefs);
assert(!bBad.ok, 'E.81 INV-11.2-B breaks under wrong direction');

// INV-11.2-C — incomplete score object
const incomplete = buildBaseScoreOutput({ score_id: '' });
const cBad = checkInvariantL11_2_C_ObjectCompleteness([incomplete]);
assert(!cBad.ok, 'E.82 INV-11.2-C breaks under incomplete score object');

// INV-11.2-D — reserved family marked production
const dBadDefs: L11ScoreFamilyDefinition[] =
  L11_SCORE_FAMILY_DEFINITIONS.map(d =>
    d.score_family === L11ScoreFamily.NARRATIVE_QUALITY
      ? { ...d, production_status: L11ScoreProductionStatus.PRODUCTION_ENABLED }
      : d,
  );
const dBad = checkInvariantL11_2_D_ReservedEmbargo(dBadDefs);
assert(!dBad.ok, 'E.83 INV-11.2-D breaks when reserved family flipped to production');

// INV-11.2-E — wrong band for final score
const eBadScore = buildBaseScoreOutput({ final_score: 90, score_band: L11ScoreBand.LOW });
const eBad = checkInvariantL11_2_E_BandDirection(L11_BAND_POLICIES, [eBadScore]);
assert(!eBad.ok, 'E.84 INV-11.2-E breaks under wrong band');

// INV-11.2-F — leak in family-def legal interpretations
const fBadDefs: L11ScoreFamilyDefinition[] =
  L11_SCORE_FAMILY_DEFINITIONS.map(d =>
    d.score_family === L11ScoreFamily.OPPORTUNITY
      ? { ...d, legal_interpretations: ['high opportunity score means buy'] }
      : d,
  );
const fBad = checkInvariantL11_2_F_NonJudgment(fBadDefs, L11_PRODUCTION_MEANING_CLAIMS, []);
assert(!fBad.ok, 'E.85 INV-11.2-F breaks under leaked interpretation');

// INV-11.2-G — corrupt replay hash
const gBadScore: L11ScoreOutput = { ...buildBaseScoreOutput(), replay_hash: 'l11d.h.00000000' };
const gBad = checkInvariantL11_2_G_ReplayIdentity([gBadScore]);
assert(!gBad.ok, 'E.86 INV-11.2-G breaks under wrong replay hash');

// INV-11.2-H — disclosure missing
const hBadScore = buildCompleteScoreFor(L11ScoreFamily.RISK);
const hBadScore2: L11ScoreOutput = { ...hBadScore, missing_data_profile_ref: '', replay_hash: 'tbd' };
const hBadScore3: L11ScoreOutput = { ...hBadScore2, replay_hash: canonicalScoreOutputReplayHash(extractL11ReplayMaterial(hBadScore2)) };
const hBad = checkInvariantL11_2_H_Disclosure(L11_SCORE_FAMILY_DEFINITIONS, [hBadScore3]);
assert(!hBad.ok, 'E.87 INV-11.2-H breaks under missing disclosure');

// All eight invariants individually green on baseline
assert(checkInvariantL11_2_A_ProductionMeaning().ok, 'E.A INV-11.2-A baseline ok');
assert(checkInvariantL11_2_B_Direction().ok, 'E.B INV-11.2-B baseline ok');
assert(checkInvariantL11_2_C_ObjectCompleteness(goodScores).ok, 'E.C INV-11.2-C baseline ok');
assert(checkInvariantL11_2_D_ReservedEmbargo().ok, 'E.D INV-11.2-D baseline ok');
assert(checkInvariantL11_2_E_BandDirection(L11_BAND_POLICIES, goodScores).ok, 'E.E INV-11.2-E baseline ok');
assert(checkInvariantL11_2_F_NonJudgment().ok, 'E.F INV-11.2-F baseline ok');
assert(checkInvariantL11_2_G_ReplayIdentity(goodScores).ok, 'E.G INV-11.2-G baseline ok');
assert(checkInvariantL11_2_H_Disclosure(L11_SCORE_FAMILY_DEFINITIONS, goodScores).ok, 'E.H INV-11.2-H baseline ok');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L11.2 SCORE DOCTRINE — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 11.2 score doctrine, families, and object model green.');
  process.exit(0);
}
