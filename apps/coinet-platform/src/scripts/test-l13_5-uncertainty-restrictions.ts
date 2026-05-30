/**
 * L13.5 — Uncertainty, Contradiction, Confidence, Restriction
 *         Certification
 *
 * §13.5.30 — Bands A..F prove every law mechanically, including
 * crafted offenders.
 */

import { L13ExplanationConfidenceBand } from '../l13/contracts/confidence-breakdown';
import { rankL13ExplanationConfidenceBand } from '../l13/contracts/confidence-breakdown';
import { L13PhraseStrengthClass } from '../l13/contracts/phrase-strength';
import { L13ContradictionDisclosureEffectClass } from '../l13/contracts/contradiction-disclosure-profile';
import { L13ExpressionReadinessClass } from '../l13/contracts/expression-governance-envelope';
import {
  L13RestrictionLevel,
  L13_ALWAYS_BLOCKED_OUTPUT_USES,
} from '../l13/contracts/restriction-composition';
import { L13ExpressionViolationCode } from '../l13/validation/l13-expression-violation-codes';
import {
  deriveL13ConfidenceCeiling,
  runL13ExpressionGovernance,
} from '../l13/restrictions';
import {
  validateL13UncertaintyDisclosureProfile,
  validateL13ContradictionDisclosureProfile,
  validateL13ConfidencePhrasingProfile,
  validateL13RestrictionCompositionProfile,
  validateL13ConfidenceCeilingResult,
  validateL13PhraseStrengthProfile,
  validateL13ExpressionGovernanceEnvelope,
} from '../l13/validation';
import {
  emitL13ExpressionGovernanceAuditRecord,
  getL13ExpressionGovernanceAuditLog,
  getL13ExpressionGovernanceCriticalViolations,
  L13ExpressionGovernanceAuditSubjectClass,
  resetL13ExpressionGovernanceAuditLog,
  severityForL13ExpressionCode,
  isL13ExpressionBlockingCode,
} from '../l13/constitution';
import { L13ViolationSeverity } from '../l13/contracts';
import {
  buildGreenL13Output,
} from '../l13/invariants/l13_3-invariants';
import { buildGreenL13InputPackage } from '../l13/invariants/l13_2-invariants';
import {
  runL13ExpressionPipeline,
  runAllL13_5Invariants,
} from '../l13/invariants/l13_5-invariants';
import { runL13GroundingPipeline } from '../l13/invariants/l13_4-invariants';

// ── Assertion helpers ───────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function band(title: string): void {
  console.log(`\n── ${title} ──`);
}

function injectSummary(
  output: ReturnType<typeof buildGreenL13Output>,
  s: string,
): ReturnType<typeof buildGreenL13Output> {
  return { ...output, summary: `${output.summary} ${s}` } as ReturnType<
    typeof buildGreenL13Output
  >;
}

// ── BAND A : uncertainty profile + confidence ceiling ───────────────

band('BAND A — uncertainty profile and confidence ceiling');

{
  const pkg = buildGreenL13InputPackage({
    invalidationActive: true,
    missingDataActive: true,
  });
  const output = buildGreenL13Output();
  const { grounding } = runL13GroundingPipeline(output, pkg);
  const ceiling = deriveL13ConfidenceCeiling({
    input_package: pkg,
    grounding_result: grounding,
  });
  assert(
    ceiling.confidence_ceiling !== undefined,
    'A.1 confidence ceiling derived',
  );
  assert(
    rankL13ExplanationConfidenceBand(ceiling.confidence_ceiling) <=
      rankL13ExplanationConfidenceBand(ceiling.inherited_band),
    'A.2 ceiling never exceeds inherited band',
  );
  assert(
    ceiling.reason_codes.length > 0,
    'A.3 reason codes present when narrowing applied',
  );
  assert(
    validateL13ConfidenceCeilingResult(ceiling).clean,
    'A.4 ceiling validator clean on green narrowing',
  );

  // Active invalidation lowers ceiling.
  const invPkg = buildGreenL13InputPackage({ invalidationActive: true });
  const invCeiling = deriveL13ConfidenceCeiling({
    input_package: invPkg,
    grounding_result: runL13GroundingPipeline(output, invPkg).grounding,
  });
  assert(
    rankL13ExplanationConfidenceBand(invCeiling.confidence_ceiling) <=
      rankL13ExplanationConfidenceBand(
        L13ExplanationConfidenceBand.MEDIUM,
      ),
    'A.5 active invalidation lowers ceiling to MEDIUM or lower',
  );

  // BLOCKED collapsing when restriction = BLOCKED.
  const blockCeiling = deriveL13ConfidenceCeiling({
    input_package: pkg,
    grounding_result: grounding,
    composed_restriction_level: L13RestrictionLevel.BLOCKED,
  });
  assert(
    blockCeiling.confidence_ceiling === L13ExplanationConfidenceBand.BLOCKED,
    'A.6 BLOCKED restriction collapses ceiling to BLOCKED',
  );

  // Replay determinism — same inputs → same ceiling result.
  const ceiling2 = deriveL13ConfidenceCeiling({
    input_package: pkg,
    grounding_result: grounding,
  });
  assert(
    ceiling.confidence_ceiling === ceiling2.confidence_ceiling &&
      ceiling.reason_codes.join(',') === ceiling2.reason_codes.join(','),
    'A.7 ceiling derivation deterministic across runs',
  );
}

// ── BAND B : mandatory disclosure law ───────────────────────────────

band('BAND B — mandatory disclosure law');

{
  const pkg = buildGreenL13InputPackage({
    contradictionActive: true,
    invalidationActive: true,
    missingDataActive: true,
  });
  const output = buildGreenL13Output({ contradictionPresent: true });
  const { uncertainty_disclosure } = runL13ExpressionPipeline(
    output,
    pkg,
  );
  assert(
    uncertainty_disclosure.must_mention_contradiction,
    'B.1 contradiction mention required',
  );
  assert(
    uncertainty_disclosure.must_mention_invalidation,
    'B.2 invalidation mention required',
  );
  assert(
    uncertainty_disclosure.must_mention_missing_data,
    'B.3 missing data mention required',
  );
  assert(
    uncertainty_disclosure.required_disclosure_phrases.length > 0,
    'B.4 required disclosure phrases derived',
  );
  const v = validateL13UncertaintyDisclosureProfile(uncertainty_disclosure);
  assert(v.clean, `B.5 uncertainty validator clean on dirty package (issues=${v.issues.length})`);

  // If we remove must_mention but keep flags, validator fails.
  const tampered = {
    ...uncertainty_disclosure,
    must_mention_contradiction: true,
    required_disclosure_phrases: [] as never,
  };
  const vBad = validateL13UncertaintyDisclosureProfile(tampered);
  assert(!vBad.clean, 'B.6 tampered profile (missing phrase) rejected');
}

// ── BAND C : confidence phrasing law ────────────────────────────────

band('BAND C — confidence phrasing law');

{
  const pkg = buildGreenL13InputPackage();
  const cleanOut = buildGreenL13Output();
  const { confidence_phrasing: cleanPhrasing } = runL13ExpressionPipeline(
    cleanOut,
    pkg,
  );
  assert(
    !cleanPhrasing.confidence_outrun_detected,
    'C.1 clean output: no confidence outrun',
  );
  assert(
    cleanPhrasing.absolute_forbidden_phrases_detected.length === 0,
    'C.2 clean output: no absolute forbidden phrases',
  );
  assert(
    validateL13ConfidencePhrasingProfile(cleanPhrasing).clean,
    'C.3 clean phrasing validator clean',
  );

  // Offender 1: absolute certainty.
  const off1 = injectSummary(
    buildGreenL13Output(),
    'This is guaranteed and locked in.',
  );
  const { confidence_phrasing: bad1 } = runL13ExpressionPipeline(
    off1,
    pkg,
  );
  assert(
    bad1.absolute_forbidden_phrases_detected.length > 0,
    'C.4 absolute forbidden phrases detected',
  );
  assert(
    bad1.output_must_be_rewritten || bad1.output_must_be_blocked,
    'C.5 rewrite or block required',
  );
  assert(
    !validateL13ConfidencePhrasingProfile(bad1).clean,
    'C.6 phrasing validator rejects absolute certainty',
  );

  // Offender 2: contextually forbidden under narrowed ceiling.
  const narrowedPkg = buildGreenL13InputPackage({
    invalidationActive: true,
    missingDataActive: true,
  });
  const off2 = injectSummary(
    buildGreenL13Output(),
    'The setup is clean and clearly going up.',
  );
  const { confidence_phrasing: bad2 } = runL13ExpressionPipeline(
    off2,
    narrowedPkg,
  );
  assert(
    bad2.contextually_forbidden_phrases_detected.length > 0,
    'C.7 contextually forbidden phrases detected under narrowed ceiling',
  );

  // Legal cautious phrasing under narrowed ceiling passes.
  const cautiousOut = injectSummary(
    buildGreenL13Output(),
    'The setup is not clean; the base case is confidence-capped and remains conditional.',
  );
  const { confidence_phrasing: cautious } = runL13ExpressionPipeline(
    cautiousOut,
    narrowedPkg,
  );
  assert(
    !cautious.confidence_outrun_detected ||
      cautious.absolute_forbidden_phrases_detected.length === 0,
    'C.8 cautious phrasing under narrowed ceiling does not trip absolute filters',
  );

  // Phrase-strength validator confirms per-section caps.
  const cleanPv = validateL13PhraseStrengthProfile(cleanPhrasing);
  assert(cleanPv.clean, 'C.9 phrase-strength validator clean on green');
  const badPv = validateL13PhraseStrengthProfile(bad1);
  assert(!badPv.clean, 'C.10 phrase-strength validator rejects offender');
}

// ── BAND D : restriction composition law ────────────────────────────

band('BAND D — restriction composition law');

{
  const pkg = buildGreenL13InputPackage();
  const output = buildGreenL13Output();
  const { restriction_composition: r } = runL13ExpressionPipeline(
    output,
    pkg,
  );
  assert(
    r.composed_restriction_level !== undefined,
    'D.1 composed restriction level present',
  );
  const allAlwaysBlocked = L13_ALWAYS_BLOCKED_OUTPUT_USES.every(use =>
    r.blocked_output_uses.includes(use),
  );
  assert(
    allAlwaysBlocked,
    'D.2 always-blocked uses all present in blocked set',
  );
  const noReopened = L13_ALWAYS_BLOCKED_OUTPUT_USES.every(
    use => !r.allowed_output_uses.includes(use as unknown as never),
  );
  assert(noReopened, 'D.3 always-blocked uses never reopened in allowed set');
  assert(
    !r.allowed_phrase_strength_classes.includes(
      L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
    ),
    'D.4 FORBIDDEN_CERTAINTY never in allowed phrase classes',
  );
  assert(
    validateL13RestrictionCompositionProfile(r).clean,
    'D.5 restriction validator clean on green',
  );

  // Tamper: pretend allowed_output_uses contains an always-blocked
  // use. Validator must reject.
  const tampered = {
    ...r,
    allowed_output_uses: [
      ...r.allowed_output_uses,
      L13_ALWAYS_BLOCKED_OUTPUT_USES[0] as unknown as never,
    ],
  };
  const vTamper = validateL13RestrictionCompositionProfile(tampered);
  assert(!vTamper.clean, 'D.6 reopened always-blocked use rejected');
}

// ── BAND E : expression governance envelope ─────────────────────────

band('BAND E — expression governance envelope');

{
  const cleanPkg = buildGreenL13InputPackage();
  const cleanOut = buildGreenL13Output();
  const cleanResult = runL13ExpressionPipeline(cleanOut, cleanPkg);
  const cleanReadiness = cleanResult.envelope.final_expression_readiness;
  const cleanAllowed =
    cleanReadiness === L13ExpressionReadinessClass.EXPRESSION_CLEAN ||
    cleanReadiness ===
      L13ExpressionReadinessClass.EXPRESSION_CLEAN_WITH_DISCLOSURE ||
    cleanReadiness ===
      L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_UNCERTAINTY;
  assert(
    cleanAllowed,
    `E.1 clean inputs yield clean/narrowed readiness (got ${cleanReadiness})`,
  );
  assert(
    cleanResult.envelope.output_allowed,
    'E.2 clean inputs allow output',
  );
  assert(
    !cleanResult.envelope.block_required &&
      !cleanResult.envelope.refusal_required,
    'E.3 clean inputs do not require block or refusal',
  );

  // Envelope validator clean.
  const envV = validateL13ExpressionGovernanceEnvelope(
    cleanResult.envelope,
    {
      uncertainty: cleanResult.uncertainty_disclosure,
      contradiction: cleanResult.contradiction_disclosure,
      phrasing: cleanResult.confidence_phrasing,
      restriction: cleanResult.restriction_composition,
    },
  );
  assert(envV.clean, `E.4 envelope validator clean on green (issues=${envV.issues.length})`);

  // Forbidden phrase → rewrite required, envelope marks rewrite.
  const off = injectSummary(
    buildGreenL13Output(),
    'This is guaranteed and almost certainly going up.',
  );
  const offResult = runL13ExpressionPipeline(off, cleanPkg);
  assert(
    offResult.envelope.rewrite_required ||
      offResult.envelope.block_required,
    'E.5 absolute forbidden phrase triggers envelope rewrite/block',
  );

  // Replay determinism.
  const r1 = runL13ExpressionPipeline(cleanOut, cleanPkg);
  const r2 = runL13ExpressionPipeline(cleanOut, cleanPkg);
  assert(
    r1.envelope.replay_hash === r2.envelope.replay_hash,
    'E.6 envelope replay hash deterministic',
  );
  const altered = injectSummary(cleanOut, 'This is guaranteed.');
  const r3 = runL13ExpressionPipeline(altered, cleanPkg);
  assert(
    r3.envelope.replay_hash !== r1.envelope.replay_hash,
    'E.7 material change flips envelope replay hash',
  );
}

// ── BAND F : audit + invariants ────────────────────────────────────

band('BAND F — audit and invariants');

{
  resetL13ExpressionGovernanceAuditLog();
  const record = emitL13ExpressionGovernanceAuditRecord({
    subjectClass:
      L13ExpressionGovernanceAuditSubjectClass.EXPRESSION_GOVERNANCE_ENVELOPE,
    subjectRef: 'l13.expression.test',
    violationCode:
      L13ExpressionViolationCode.L13U_FORBIDDEN_CERTAINTY_PHRASE_PRESENT,
    message: 'test forbidden certainty phrase present',
  });
  assert(record.audit_id.length > 0, 'F.1 audit record emitted with id');
  assert(
    record.severity === L13ViolationSeverity.CRITICAL,
    'F.2 absolute forbidden phrase audited as CRITICAL',
  );
  assert(record.blocking, 'F.3 absolute forbidden phrase is blocking');
  assert(
    getL13ExpressionGovernanceAuditLog().length === 1,
    'F.4 audit log captured one record',
  );
  assert(
    getL13ExpressionGovernanceCriticalViolations().length === 1,
    'F.5 critical violations queryable',
  );
  assert(
    severityForL13ExpressionCode(
      L13ExpressionViolationCode.L13U_LINEAGE_MISSING,
    ) === L13ViolationSeverity.ERROR,
    'F.6 lineage missing classified as ERROR',
  );
  assert(
    !isL13ExpressionBlockingCode(
      L13ExpressionViolationCode.L13U_LINEAGE_MISSING,
    ),
    'F.7 lineage missing not blocking',
  );

  // Invariants — all ten must hold on the green pipeline.
  const invs = runAllL13_5Invariants();
  assert(invs.length === 10, `F.8 ten invariants executed (got ${invs.length})`);
  for (const inv of invs) {
    assert(inv.holds, `F.9 ${inv.id} ${inv.name} (${inv.evidence})`);
  }
}

// ── Summary ─────────────────────────────────────────────────────────

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
