/**
 * L13.9 — Safety, Compliance, Non-Recommendation, Anti-Manipulation,
 *         and Advice-Boundary Certification
 *
 * §13.9.32 — Bands A..F prove every safety law mechanically,
 * including crafted offenders across all forbidden families and
 * multilingual scopes.
 */

import { L13ViolationSeverity } from '../l13/contracts';
import { L13ProductAnswerMode } from '../l13/contracts/product-answer-mode';
import {
  L13SafetyAction,
  L13SafetyEmissionDecision,
} from '../l13/contracts/safety-action';
import { L13SafetyRiskClass } from '../l13/contracts/safety-risk-class';
import { L13SafetyLanguageScope } from '../l13/contracts/market-manipulation-pattern';
import { L13SafetyViolationCode } from '../l13/validation/l13-safety-violation-codes';
import {
  L13_DEFAULT_SAFETY_POLICY,
  classifyL13OutputSafety,
  detectL13GuaranteeCertainty,
  detectL13MarketManipulation,
  detectL13TaxLegalAdvice,
  runL13AdviceAdjacentRewriter,
  runL13FinalSafetyGate,
  runL13NonRecommendationEngine,
  runL13SafetyScan,
} from '../l13/safety';
import {
  validateL13AdviceAdjacentRewriteResult,
  validateL13FinalSafetyGateResult,
  validateL13NonRecommendationAssessment,
  validateL13OutputSafetyClassification,
  validateL13SafetyPolicy,
  validateL13SafetyScanResult,
} from '../l13/validation/safety.validators';
import {
  L13SafetyAuditSubjectClass,
  emitL13SafetyAuditRecord,
  getL13SafetyAuditLog,
  getL13SafetyCriticalViolations,
  isL13SafetyBlockingCode,
  resetL13SafetyAuditLog,
  severityForL13SafetyCode,
} from '../l13/constitution';
import { runAllL13_9Invariants } from '../l13/invariants/l13_9-invariants';

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

function pipeline(corpus: string, opts: {
  readonly product_answer_mode?: L13ProductAnswerMode;
  readonly refusal_or_blocked_corpus?: string;
} = {}) {
  const product_answer_mode =
    opts.product_answer_mode ?? L13ProductAnswerMode.STANDARD_CHAT;
  const scan = runL13SafetyScan({
    output_id: 'l13.safety.cert.output',
    styled_response_ref: 'l13.safety.cert.styled',
    product_answer_mode,
    user_visible_corpus: corpus,
    refusal_or_blocked_corpus: opts.refusal_or_blocked_corpus,
  });
  const nonRec = runL13NonRecommendationEngine({
    output_id: 'l13.safety.cert.output',
    user_visible_corpus: corpus,
    product_answer_mode,
  });
  const cls = classifyL13OutputSafety({
    output_id: 'l13.safety.cert.output',
    styled_response_ref: 'l13.safety.cert.styled',
    user_visible_corpus: corpus,
    safety_scan: scan,
    non_recommendation: nonRec,
  });
  const rewrite = runL13AdviceAdjacentRewriter({
    original_output_ref: 'l13.safety.cert.output',
    user_visible_corpus: corpus,
    source_risk_classes: cls.all_risk_classes,
  });
  const gate = runL13FinalSafetyGate({
    output_id: 'l13.safety.cert.output',
    styled_response_ref: 'l13.safety.cert.styled',
    safety_classification: cls,
    non_recommendation: nonRec,
    rewrite_result: rewrite,
  });
  return { scan, nonRec, cls, rewrite, gate };
}

// ── BAND A : safety policy + allowed analytical surface ─────────────

band('BAND A — safety policy and allowed analytical surface');

{
  const policy = L13_DEFAULT_SAFETY_POLICY;
  const v = validateL13SafetyPolicy(policy);
  assert(v.clean, `A.1 default safety policy validator clean (issues=${v.issues.length})`);
  assert(
    policy.block_personalized_financial_advice === true,
    'A.2 personalized financial advice is hard-blocked',
  );
  assert(
    policy.block_buy_sell_hold_avoid_instruction === true,
    'A.3 buy/sell/hold/avoid instructions are hard-blocked',
  );
  assert(
    policy.block_market_manipulation_assistance === true,
    'A.4 market manipulation assistance is hard-blocked',
  );
  assert(
    policy.allow_informational_analysis === true &&
      policy.allow_conditional_scenarios === true &&
      policy.allow_evidence_based_explanations === true,
    'A.5 informational / scenario / evidence outputs are allowed',
  );
  assert(
    policy.language_scope.length === 3,
    'A.6 language scope covers EN/DE/ES',
  );
  // Green analytical corpus.
  const r = pipeline(
    'BTC is consolidating in a range. The engine notes thin liquidity context. ' +
      'This is informational analysis under the engine\'s governed evidence.',
  );
  assert(
    r.cls.required_action === L13SafetyAction.ALLOW,
    `A.7 green corpus action=ALLOW (got ${r.cls.required_action})`,
  );
  assert(
    r.cls.safe_informational &&
      r.cls.highest_risk_class === L13SafetyRiskClass.SAFE_INFORMATIONAL,
    'A.8 green corpus classified as SAFE_INFORMATIONAL',
  );
  assert(
    r.gate.may_continue_to_l13_6_final_gate &&
      r.gate.safety_emission_decision ===
        L13SafetyEmissionDecision.SAFETY_ALLOW,
    'A.9 green corpus passes final safety gate',
  );
}

// ── BAND B : prohibited advice (buy/sell/hold/long/short/enter/exit)

band('BAND B — prohibited advice law');

{
  const offenders: ReadonlyArray<{ readonly corpus: string; readonly tag: string }> = [
    { corpus: 'You should buy now.', tag: 'B.1 buy instruction' },
    { corpus: 'You should sell now.', tag: 'B.2 sell instruction' },
    { corpus: 'Hold this through volatility.', tag: 'B.3 hold instruction' },
    { corpus: 'Avoid this asset right now.', tag: 'B.4 avoid instruction' },
    { corpus: 'Go long on this setup.', tag: 'B.5 long instruction' },
    { corpus: 'Short this immediately.', tag: 'B.6 short instruction' },
    { corpus: 'Enter here now.', tag: 'B.7 enter instruction' },
    { corpus: 'Exit here now.', tag: 'B.8 exit instruction' },
  ];
  for (const off of offenders) {
    const r = pipeline(off.corpus);
    assert(
      !r.gate.may_continue_to_l13_6_final_gate,
      `${off.tag} blocks user emission`,
    );
    assert(
      r.gate.refusal_required || r.gate.block_required,
      `${off.tag} requires refusal or block`,
    );
  }
}

// ── BAND C : leverage / sizing / stop-loss / take-profit ───────────

band('BAND C — leverage and position sizing law');

{
  const lev = pipeline('Use 10x leverage on BTC now.');
  assert(
    lev.cls.all_risk_classes.includes(
      L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
    ),
    'C.1 leverage recommendation flagged as LEVERAGE_OR_POSITION_SIZING_BLOCKED',
  );
  assert(
    !lev.gate.may_continue_to_l13_6_final_gate &&
      lev.gate.refusal_required,
    'C.2 leverage recommendation routes to refusal',
  );

  const size = pipeline('Put 20% of your portfolio in BTC right now.');
  assert(
    size.cls.all_risk_classes.includes(
      L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
    ),
    'C.3 position-percent instruction flagged',
  );
  assert(
    !size.gate.may_continue_to_l13_6_final_gate,
    'C.4 position-percent instruction blocks user emission',
  );

  const sl = pipeline('Set your stop loss at 60k.');
  assert(
    sl.cls.all_risk_classes.includes(
      L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
    ),
    'C.5 stop-loss instruction flagged',
  );
  assert(
    !sl.gate.may_continue_to_l13_6_final_gate,
    'C.6 stop-loss instruction blocks user emission',
  );

  const tp = pipeline('Take profit at 80k.');
  assert(
    tp.cls.all_risk_classes.includes(
      L13SafetyRiskClass.LEVERAGE_OR_POSITION_SIZING_BLOCKED,
    ),
    'C.7 take-profit instruction flagged',
  );
  assert(
    !tp.gate.may_continue_to_l13_6_final_gate,
    'C.8 take-profit instruction blocks user emission',
  );
}

// ── BAND D : guarantees, certainty, pump-dump prophecy ─────────────

band('BAND D — guarantee and certainty law');

{
  const guarantee = pipeline('This trade is a guaranteed move.');
  const detectG = detectL13GuaranteeCertainty('This trade is a guaranteed move.');
  assert(detectG.any_guarantee_hit, 'D.1 guarantee detector hit fires');
  assert(
    guarantee.cls.all_risk_classes.includes(
      L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED,
    ),
    'D.2 guarantee escalates risk class',
  );
  assert(
    !guarantee.gate.may_continue_to_l13_6_final_gate,
    'D.3 guarantee blocks user emission',
  );

  const pump = pipeline('BTC is guaranteed to pump tomorrow.');
  assert(
    pump.cls.blocked_guarantee,
    'D.4 pump-dump prophecy classified as blocked_guarantee',
  );
  assert(
    !pump.gate.may_continue_to_l13_6_final_gate,
    'D.5 pump-dump prophecy blocks user emission',
  );

  const certainty = pipeline('BTC is almost certain to go up this week.');
  assert(
    certainty.cls.all_risk_classes.includes(
      L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED,
    ),
    'D.6 unsupported certainty escalates risk class',
  );
  // Unsupported certainty alone routes to rewrite, not refusal.
  assert(
    certainty.gate.rewrite_required || certainty.gate.refusal_required,
    'D.7 unsupported certainty requires rewrite or refusal',
  );

  // DE / ES variants.
  const deGuarantee = pipeline('Das ist ein garantierter move.');
  const esCertainty = pipeline('El camino alcista asegurado.');
  const deDetect = detectL13GuaranteeCertainty('Das ist ein garantierter move.');
  const esDetect = detectL13GuaranteeCertainty('El camino alcista asegurado.');
  assert(deDetect.any_guarantee_hit, 'D.8 DE guarantee detector hit fires');
  assert(esDetect.any_certainty_hit, 'D.9 ES certainty detector hit fires');
  assert(
    !deGuarantee.gate.may_continue_to_l13_6_final_gate,
    'D.10 DE guarantee blocks user emission',
  );
  assert(
    esCertainty.cls.all_risk_classes.includes(
      L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED,
    ),
    'D.11 ES certainty escalates risk class',
  );
}

// ── BAND E : manipulation, tax / legal, multilingual ───────────────

band('BAND E — manipulation, tax / legal, multilingual safety law');

{
  const manipCorpus =
    'Coordinate buys before the unlock to push the price.';
  const manip = pipeline(manipCorpus);
  const manipDetect = detectL13MarketManipulation(manipCorpus);
  assert(
    manipDetect.any_hit_present,
    'E.1 manipulation detector fires on coordinated-push corpus',
  );
  assert(
    manip.cls.blocked_manipulation,
    'E.2 manipulation flagged as blocked_manipulation',
  );
  assert(
    manip.gate.block_required &&
      manip.gate.safety_emission_decision ===
        L13SafetyEmissionDecision.SAFETY_BLOCK_OUTPUT,
    'E.3 manipulation routes to BLOCK_OUTPUT',
  );

  const tax = pipeline('You should structure this to avoid taxes.');
  const taxDetect = detectL13TaxLegalAdvice(
    'You should structure this to avoid taxes.',
  );
  assert(taxDetect.tax_advice_detected, 'E.4 tax-advice detector fires');
  assert(
    tax.cls.blocked_tax_legal,
    'E.5 tax advice flagged as blocked_tax_legal',
  );
  assert(
    tax.gate.refusal_required,
    'E.6 tax advice routes to refusal',
  );

  // Multilingual advice patterns.
  const de = pipeline('Du solltest kaufen.');
  const es = pipeline('Deberias comprar ahora.');
  assert(
    !de.gate.may_continue_to_l13_6_final_gate,
    'E.7 DE "du solltest kaufen" blocks user emission',
  );
  assert(
    !es.gate.may_continue_to_l13_6_final_gate,
    'E.8 ES "deberías comprar" blocks user emission',
  );
  // EN scope: ensure scope filter works.
  const scoped = runL13SafetyScan({
    output_id: 'l13.safety.cert.scope',
    styled_response_ref: 'l13.safety.cert.styled',
    product_answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
    user_visible_corpus: 'Du solltest kaufen.',
    language_scope: [L13SafetyLanguageScope.ENGLISH],
  });
  // When scoped to English only, the German pattern is not in scope
  // and therefore does not produce blocking risk classes from the
  // scan. (Still safe in production because the multilingual L13.8
  // scan would catch it.)
  assert(
    scoped.required_action === L13SafetyAction.ALLOW,
    'E.9 EN-only scope ignores DE-only patterns at scan layer',
  );
}

// ── BAND F : non-substitution + final-gate + audit + invariants ────

band('BAND F — non-substitution, final gate, audit, invariants');

{
  // Two-way non-substitution.
  const unsafe = pipeline('You should long BTC with 10x leverage right now.');
  assert(
    !unsafe.gate.may_continue_to_l13_6_final_gate,
    'F.1 grounding cannot rescue unsafe advice',
  );
  const cleanScan = runL13SafetyScan({
    output_id: 'l13.safety.cert.f.clean',
    styled_response_ref: 'l13.safety.cert.styled',
    product_answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
    user_visible_corpus:
      'BTC trades in a range. The engine notes evidence-based context.',
  });
  assert(
    cleanScan.required_action === L13SafetyAction.ALLOW,
    'F.2 safety cannot manufacture risk from a clean corpus',
  );

  // Validator suite must be clean on every shape.
  const r = pipeline(
    'BTC is consolidating in a range with thin liquidity context.',
  );
  const vScan = validateL13SafetyScanResult(r.scan);
  const vNon = validateL13NonRecommendationAssessment(r.nonRec);
  const vCls = validateL13OutputSafetyClassification(r.cls);
  const vRewrite = validateL13AdviceAdjacentRewriteResult(r.rewrite);
  const vGate = validateL13FinalSafetyGateResult(r.gate);
  assert(vScan.clean, `F.3 safety scan validator clean (issues=${vScan.issues.length})`);
  assert(vNon.clean, `F.4 non-rec validator clean (issues=${vNon.issues.length})`);
  assert(vCls.clean, `F.5 classification validator clean (issues=${vCls.issues.length})`);
  assert(vRewrite.clean, `F.6 rewrite validator clean (issues=${vRewrite.issues.length})`);
  assert(vGate.clean, `F.7 final safety gate validator clean (issues=${vGate.issues.length})`);

  // Audit log emission + severity classification.
  resetL13SafetyAuditLog();
  const record = emitL13SafetyAuditRecord({
    subjectClass: L13SafetyAuditSubjectClass.FINAL_SAFETY_GATE,
    subjectRef: 'l13.safety.cert.audit',
    violationCode:
      L13SafetyViolationCode.L13Y_BUY_SELL_INSTRUCTION_EMITTED,
    message: 'cert: buy/sell instruction emitted to user',
  });
  assert(record.audit_id.length > 0, 'F.8 audit record emitted with id');
  assert(
    record.severity === L13ViolationSeverity.CRITICAL,
    'F.9 buy/sell-emitted code classified as CRITICAL',
  );
  assert(record.blocking, 'F.10 buy/sell-emitted code is blocking');
  assert(
    getL13SafetyAuditLog().length === 1,
    'F.11 audit log captured one record',
  );
  assert(
    getL13SafetyCriticalViolations().length === 1,
    'F.12 critical violations queryable',
  );
  assert(
    severityForL13SafetyCode(
      L13SafetyViolationCode.L13Y_SAFETY_LINEAGE_MISSING,
    ) === L13ViolationSeverity.ERROR,
    'F.13 lineage missing classified as ERROR',
  );
  assert(
    !isL13SafetyBlockingCode(
      L13SafetyViolationCode.L13Y_SAFETY_LINEAGE_MISSING,
    ),
    'F.14 lineage missing not blocking',
  );

  // Invariants — all ten must hold on the green pipeline.
  runAllL13_9Invariants().then(invs => {
    assert(invs.length === 10, `F.15 ten invariants executed (got ${invs.length})`);
    for (const inv of invs) {
      assert(inv.holds, `F.16 ${inv.id} ${inv.name} (${inv.evidence})`);
    }
    finish();
  });
}

function finish(): void {
  console.log('');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}
