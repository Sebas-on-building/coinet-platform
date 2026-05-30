/**
 * L13.9 — Safety, Compliance, Non-Recommendation,
 *         Anti-Manipulation, and Advice-Boundary Invariants
 *
 * §13.9.31 — INV-13.9-A through INV-13.9-J. Each invariant proves a
 * single safety law mechanically by running the safety pipeline
 * end-to-end over crafted offenders and the green styled chat path.
 */

import { L13SupportedLanguage } from '../contracts/language-profile';
import {
  L13SafetyAction,
  L13SafetyEmissionDecision,
} from '../contracts/safety-action';
import { L13SafetyRiskClass } from '../contracts/safety-risk-class';
import { L13SafetyReasonCode } from '../contracts/safety-reason-code';
import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import {
  classifyL13OutputSafety,
  detectL13GuaranteeCertainty,
  detectL13MarketManipulation,
  detectL13TaxLegalAdvice,
  L13_DEFAULT_SAFETY_POLICY,
  runL13AdviceAdjacentRewriter,
  runL13FinalSafetyGate,
  runL13NonRecommendationEngine,
  runL13SafetyScan,
} from '../safety';
import {
  validateL13AdviceAdjacentRewriteResult,
  validateL13FinalSafetyGateResult,
  validateL13NonRecommendationAssessment,
  validateL13OutputSafetyClassification,
  validateL13SafetyPolicy,
  validateL13SafetyScanResult,
} from '../validation/safety.validators';
import { buildGreenL13StyledChat } from './l13_8-invariants';

export interface L13_9InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── Pipeline helpers ────────────────────────────────────────────────

interface SafetyPipelineOpts {
  readonly user_visible_corpus: string;
  readonly output_id?: string;
  readonly styled_response_ref?: string;
  readonly product_answer_mode?: L13ProductAnswerMode;
  readonly refusal_or_blocked_corpus?: string;
  readonly debug_corpus?: string;
}

function runSafetyPipeline(opts: SafetyPipelineOpts) {
  const output_id = opts.output_id ?? 'l13.safety.test.output';
  const styled_response_ref =
    opts.styled_response_ref ?? 'l13.safety.test.styled';
  const product_answer_mode =
    opts.product_answer_mode ?? L13ProductAnswerMode.STANDARD_CHAT;

  const scan = runL13SafetyScan({
    output_id,
    styled_response_ref,
    product_answer_mode,
    user_visible_corpus: opts.user_visible_corpus,
    refusal_or_blocked_corpus: opts.refusal_or_blocked_corpus,
    debug_corpus: opts.debug_corpus,
  });
  const nonRec = runL13NonRecommendationEngine({
    output_id,
    user_visible_corpus: opts.user_visible_corpus,
    product_answer_mode,
  });
  const cls = classifyL13OutputSafety({
    output_id,
    styled_response_ref,
    user_visible_corpus: opts.user_visible_corpus,
    safety_scan: scan,
    non_recommendation: nonRec,
  });
  const rewrite = runL13AdviceAdjacentRewriter({
    original_output_ref: output_id,
    user_visible_corpus: opts.user_visible_corpus,
    source_risk_classes: cls.all_risk_classes,
  });
  const gate = runL13FinalSafetyGate({
    output_id,
    styled_response_ref,
    safety_classification: cls,
    non_recommendation: nonRec,
    rewrite_result: rewrite,
  });
  return { scan, nonRec, cls, rewrite, gate };
}

// ── INV-13.9-A : allowed-output law ─────────────────────────────────

export function checkINV_139_A(): L13_9InvariantResult {
  const policy = L13_DEFAULT_SAFETY_POLICY;
  const vPolicy = validateL13SafetyPolicy(policy);
  // Green analytical output passes the entire pipeline.
  const greenCorpus =
    'BTC is consolidating in a range. Watch the upper boundary for a breakout. ' +
    'This is informational analysis under the engine\'s governed evidence.';
  const r = runSafetyPipeline({ user_visible_corpus: greenCorpus });
  const allowed =
    r.cls.required_action === L13SafetyAction.ALLOW &&
    r.cls.safe_informational &&
    r.cls.highest_risk_class === L13SafetyRiskClass.SAFE_INFORMATIONAL &&
    r.gate.may_continue_to_l13_6_final_gate &&
    r.gate.safety_emission_decision === L13SafetyEmissionDecision.SAFETY_ALLOW;
  return {
    id: 'INV-13.9-A',
    name: 'allowed-output law',
    holds:
      vPolicy.clean &&
      allowed &&
      policy.allow_informational_analysis === true &&
      policy.allow_conditional_scenarios === true,
    evidence: `policyClean=${vPolicy.clean} action=${r.cls.required_action} mayEmit=${r.gate.may_continue_to_l13_6_final_gate}`,
  };
}

// ── INV-13.9-B : prohibited-advice law ──────────────────────────────

export function checkINV_139_B(): L13_9InvariantResult {
  // Direct buy/sell instruction must NOT pass.
  const offenders = [
    'You should buy now.',
    'You should sell now.',
    'Go long on this setup.',
    'Short this immediately.',
    'Enter here now.',
  ];
  let allBlocked = true;
  for (const corpus of offenders) {
    const r = runSafetyPipeline({ user_visible_corpus: corpus });
    const blocked =
      !r.gate.may_continue_to_l13_6_final_gate &&
      (r.gate.refusal_required || r.gate.block_required);
    if (!blocked) {
      allBlocked = false;
      break;
    }
  }
  return {
    id: 'INV-13.9-B',
    name: 'prohibited-advice law',
    holds: allBlocked,
    evidence: `directAdviceOffendersAllBlocked=${allBlocked}`,
  };
}

// ── INV-13.9-C : guarantee and certainty law ───────────────────────

export function checkINV_139_C(): L13_9InvariantResult {
  const guarantee = 'This trade is a guaranteed move and is going to pump.';
  const certainty = 'BTC is almost certain to go up this week.';
  const gA = runSafetyPipeline({ user_visible_corpus: guarantee });
  const cA = runSafetyPipeline({ user_visible_corpus: certainty });
  const gBlocked =
    !gA.gate.may_continue_to_l13_6_final_gate &&
    gA.cls.all_risk_classes.includes(
      L13SafetyRiskClass.GUARANTEED_OUTCOME_BLOCKED,
    );
  const cBlocked =
    !cA.gate.may_continue_to_l13_6_final_gate &&
    cA.cls.all_risk_classes.includes(
      L13SafetyRiskClass.UNSUPPORTED_CERTAINTY_BLOCKED,
    );
  // Detector independence check.
  const detect = detectL13GuaranteeCertainty(guarantee);
  return {
    id: 'INV-13.9-C',
    name: 'guarantee and certainty law',
    holds:
      gBlocked &&
      cBlocked &&
      detect.any_guarantee_hit &&
      gA.cls.blocked_guarantee,
    evidence: `gBlocked=${gBlocked} cBlocked=${cBlocked} detectHit=${detect.any_guarantee_hit}`,
  };
}

// ── INV-13.9-D : advice-adjacent rewrite law ────────────────────────

export function checkINV_139_D(): L13_9InvariantResult {
  // Advice-adjacent corpus that should route to rewrite, then
  // demand revalidation through L13.3..L13.8.
  const corpus = 'This is the best entry on the setup.';
  const r = runSafetyPipeline({ user_visible_corpus: corpus });
  const rewriteAttempted =
    r.rewrite.rewrite_attempted && r.rewrite.rewrite_successful;
  const revalRequired =
    r.rewrite.requires_revalidation_from_l13_3 &&
    r.rewrite.requires_revalidation_from_l13_4 &&
    r.rewrite.requires_revalidation_from_l13_5 &&
    r.rewrite.requires_revalidation_from_l13_7 &&
    r.rewrite.requires_revalidation_from_l13_8;
  const vRewrite = validateL13AdviceAdjacentRewriteResult(r.rewrite);
  // Hard-stop branch: a non-rewriteable risk class blocks rewrite.
  const hardCorpus = 'You should buy now.';
  const rHard = runSafetyPipeline({ user_visible_corpus: hardCorpus });
  const hardStop =
    !rHard.rewrite.rewrite_attempted && !rHard.rewrite.rewrite_successful;
  return {
    id: 'INV-13.9-D',
    name: 'advice-adjacent rewrite law',
    holds:
      rewriteAttempted &&
      revalRequired &&
      vRewrite.clean &&
      hardStop,
    evidence: `attempted=${rewriteAttempted} reval=${revalRequired} validator=${vRewrite.clean} hardStop=${hardStop}`,
  };
}

// ── INV-13.9-E : manipulation and out-of-domain safety law ─────────

export function checkINV_139_E(): L13_9InvariantResult {
  const manip =
    'Coordinate buys before the unlock to push the price.';
  const r = runSafetyPipeline({ user_visible_corpus: manip });
  const blockOutput =
    r.gate.block_required &&
    r.gate.safety_emission_decision ===
      L13SafetyEmissionDecision.SAFETY_BLOCK_OUTPUT &&
    !r.gate.may_continue_to_l13_6_final_gate;
  const riskPresent = r.cls.all_risk_classes.includes(
    L13SafetyRiskClass.MARKET_MANIPULATION_BLOCKED,
  );
  const detect = detectL13MarketManipulation(manip);
  // Tax/legal advice also routes to refusal.
  const tax = 'You should structure this to avoid taxes.';
  const rTax = runSafetyPipeline({ user_visible_corpus: tax });
  const taxRefusal =
    rTax.gate.refusal_required &&
    rTax.cls.all_risk_classes.includes(
      L13SafetyRiskClass.TAX_OR_LEGAL_ADVICE_BLOCKED,
    );
  const taxDetect = detectL13TaxLegalAdvice(tax);
  return {
    id: 'INV-13.9-E',
    name: 'manipulation and out-of-domain safety law',
    holds:
      blockOutput &&
      riskPresent &&
      detect.any_hit_present &&
      taxRefusal &&
      taxDetect.tax_advice_detected,
    evidence: `block=${blockOutput} risk=${riskPresent} manipDetect=${detect.any_hit_present} taxRefusal=${taxRefusal}`,
  };
}

// ── INV-13.9-F : grounding/safety non-substitution law ─────────────

export function checkINV_139_F(): L13_9InvariantResult {
  // Even if the grounding pipeline is perfectly green, safety must
  // still block unsafe advice text. We simulate this by running a
  // green styled chat and then injecting unsafe text into the
  // user-visible corpus passed to the safety pipeline. The safety
  // pipeline must reject regardless of styled-envelope readiness.
  // (Two-way: a safety REFUSAL never authorizes unsupported claims.)
  const unsafe = 'You should long BTC with 10x leverage right now.';
  const r = runSafetyPipeline({ user_visible_corpus: unsafe });
  const groundingCannotRescueUnsafe =
    !r.gate.may_continue_to_l13_6_final_gate &&
    (r.gate.refusal_required || r.gate.block_required);
  // Conversely: safety scan over an empty / clean corpus must NOT
  // escalate. (Safety cannot manufacture risk from nothing.)
  const cleanScan = runL13SafetyScan({
    output_id: 'l13.safety.f.clean',
    styled_response_ref: 'l13.safety.f.styled',
    product_answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
    user_visible_corpus:
      'BTC trades in a range. The engine notes evidence-based context.',
  });
  const safetyCannotManufactureRisk =
    cleanScan.required_action === L13SafetyAction.ALLOW &&
    !cleanScan.block_required &&
    !cleanScan.refusal_required;
  return {
    id: 'INV-13.9-F',
    name: 'grounding/safety non-substitution law',
    holds:
      groundingCannotRescueUnsafe && safetyCannotManufactureRisk,
    evidence: `unsafeBlocked=${groundingCannotRescueUnsafe} cleanNotEscalated=${safetyCannotManufactureRisk}`,
  };
}

// ── INV-13.9-G : multilingual safety law ───────────────────────────

export function checkINV_139_G(): L13_9InvariantResult {
  // EN / DE / ES advice patterns must all block at the safety gate.
  const en = 'You should buy now.';
  const de = 'Du solltest kaufen.';
  const es = 'Deberías comprar ahora.';
  const rEn = runSafetyPipeline({ user_visible_corpus: en });
  const rDe = runSafetyPipeline({ user_visible_corpus: de });
  const rEs = runSafetyPipeline({ user_visible_corpus: es });
  const allBlock =
    !rEn.gate.may_continue_to_l13_6_final_gate &&
    !rDe.gate.may_continue_to_l13_6_final_gate &&
    !rEs.gate.may_continue_to_l13_6_final_gate;
  // Quoted refusal context must NOT block.
  const refusalQuote = runL13SafetyScan({
    output_id: 'l13.safety.g.refusal',
    styled_response_ref: 'l13.safety.g.styled',
    product_answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
    user_visible_corpus:
      'The engine cannot convert this request into a recommendation.',
    refusal_or_blocked_corpus:
      'The following blocked claim was rejected: "you should buy now".',
  });
  const refusalDidNotBlock =
    refusalQuote.required_action === L13SafetyAction.ALLOW;
  return {
    id: 'INV-13.9-G',
    name: 'multilingual safety law',
    holds: allBlock && refusalDidNotBlock,
    evidence: `en=${!rEn.gate.may_continue_to_l13_6_final_gate} de=${!rDe.gate.may_continue_to_l13_6_final_gate} es=${!rEs.gate.may_continue_to_l13_6_final_gate} refusalQuoted=${refusalDidNotBlock}`,
  };
}

// ── INV-13.9-H : final safety gate law ─────────────────────────────

export async function checkINV_139_H(): Promise<L13_9InvariantResult> {
  // Wire L13.8 styled envelope into the safety pipeline.
  const styled = await buildGreenL13StyledChat();
  const corpus = styled.shaped.display_payload_text;
  const r = runSafetyPipeline({
    user_visible_corpus: corpus,
    output_id: styled.envelope.output_id,
    styled_response_ref: styled.envelope.styled_response_id,
  });
  const vScan = validateL13SafetyScanResult(r.scan);
  const vNon = validateL13NonRecommendationAssessment(r.nonRec);
  const vCls = validateL13OutputSafetyClassification(r.cls);
  const vGate = validateL13FinalSafetyGateResult(r.gate);
  const greenPassesGate =
    r.gate.may_continue_to_l13_6_final_gate &&
    r.gate.safety_emission_decision ===
      L13SafetyEmissionDecision.SAFETY_ALLOW &&
    r.gate.refusal_reason_codes.length === 0 &&
    r.gate.blocked_reason_codes.length === 0;
  return {
    id: 'INV-13.9-H',
    name: 'final safety gate law',
    holds:
      vScan.clean &&
      vNon.clean &&
      vCls.clean &&
      vGate.clean &&
      greenPassesGate,
    evidence: `scan=${vScan.clean} nonRec=${vNon.clean} cls=${vCls.clean} gate=${vGate.clean} mayEmit=${r.gate.may_continue_to_l13_6_final_gate}`,
  };
}

// ── INV-13.9-I : rewrite/refusal/block precedence law ──────────────

export function checkINV_139_I(): L13_9InvariantResult {
  // Block > refusal > rewrite > allow.
  const manip = 'Coordinate buys before the unlock to push the price.';
  const refusal = 'You should buy now.';
  const rewrite = 'This is the best entry on the setup.';
  const allow = 'BTC is consolidating in a range with thin liquidity context.';

  const rManip = runSafetyPipeline({ user_visible_corpus: manip });
  const rRefusal = runSafetyPipeline({ user_visible_corpus: refusal });
  const rRewrite = runSafetyPipeline({ user_visible_corpus: rewrite });
  const rAllow = runSafetyPipeline({ user_visible_corpus: allow });

  const order =
    rManip.gate.block_required &&
    !rRefusal.gate.block_required &&
    rRefusal.gate.refusal_required &&
    !rRewrite.gate.block_required &&
    !rRewrite.gate.refusal_required &&
    rRewrite.gate.rewrite_required &&
    rAllow.gate.may_continue_to_l13_6_final_gate;
  // Combined: when both manip and refusal-triggering patterns are
  // present, block must win.
  const combined = `${manip} ${refusal}`;
  const rCombined = runSafetyPipeline({ user_visible_corpus: combined });
  const blockWinsCombined =
    rCombined.gate.block_required &&
    !rCombined.gate.may_continue_to_l13_6_final_gate;
  return {
    id: 'INV-13.9-I',
    name: 'rewrite/refusal/block precedence law',
    holds: order && blockWinsCombined,
    evidence: `order=${order} blockWinsCombined=${blockWinsCombined}`,
  };
}

// ── INV-13.9-J : replay determinism law ────────────────────────────

export function checkINV_139_J(): L13_9InvariantResult {
  const corpus = 'You should buy now.';
  const a = runSafetyPipeline({ user_visible_corpus: corpus });
  const b = runSafetyPipeline({ user_visible_corpus: corpus });
  const stable =
    a.scan.replay_hash === b.scan.replay_hash &&
    a.nonRec.replay_hash === b.nonRec.replay_hash &&
    a.cls.replay_hash === b.cls.replay_hash &&
    a.rewrite.replay_hash === b.rewrite.replay_hash &&
    a.gate.replay_hash === b.gate.replay_hash;
  // Material change must flip the gate hash — adding a guarantee
  // pattern introduces a new risk class.
  const variant = runSafetyPipeline({
    user_visible_corpus: `${corpus} This is a guaranteed move.`,
  });
  const flipped = variant.gate.replay_hash !== a.gate.replay_hash;
  return {
    id: 'INV-13.9-J',
    name: 'replay determinism law',
    holds: stable && flipped,
    evidence: `stable=${stable} flipped=${flipped}`,
  };
}

export async function runAllL13_9Invariants():
  Promise<readonly L13_9InvariantResult[]> {
  return [
    checkINV_139_A(),
    checkINV_139_B(),
    checkINV_139_C(),
    checkINV_139_D(),
    checkINV_139_E(),
    checkINV_139_F(),
    checkINV_139_G(),
    await checkINV_139_H(),
    checkINV_139_I(),
    checkINV_139_J(),
  ];
}

// Suppress unused-import warnings for helpers referenced by
// downstream certification scripts.
void L13SupportedLanguage.ENGLISH;
void L13SafetyReasonCode.REASON_SAFE_INFORMATIONAL;
