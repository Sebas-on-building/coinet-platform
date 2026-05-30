/**
 * L13.8 — Style Invariants
 *
 * §13.8.37 — INV-13.8-A through INV-13.8-J.
 */

import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import { L13UserIntentClass } from '../contracts/user-intent-binding';
import {
  L13SupportedLanguage,
  L13LanguageResolutionStatus,
} from '../contracts/language-profile';
import {
  L13VerbosityLevel,
  L13VerbosityReasonCode,
  l13RankVerbosity,
} from '../contracts/verbosity-profile';
import { L13MultilingualScanReadinessClass } from '../contracts/multilingual-safety-scan';
import { L13StyleIntegrityStatus } from '../contracts/style-semantic-integrity-profile';
import {
  L13StyleReadinessClass,
  type L13StyledResponseEnvelope,
} from '../contracts/styled-response-envelope';
import { L13ModePayloadClass } from '../contracts/output-mode-envelope';
import { L13AIOutputClass } from '../contracts/ai-output';
import {
  buildL13PersonaPolicy,
  buildL13StyleControlPlan,
  buildL13StyledResponseEnvelope,
  resolveL13Verbosity,
  resolveL13Language,
  runL13MultilingualSafetyScan,
  runL13StyleSemanticIntegrityEngine,
} from '../style';
import {
  validateL13StyleControlPlan,
  validateL13VerbosityResolutionProfile,
  validateL13PersonaPolicy,
  validateL13LanguageResolutionProfile,
  validateL13MultilingualSafetyScan,
  validateL13StyleSemanticIntegrityProfile,
  validateL13StyledResponseEnvelope,
  validateL13PersonaTextCorpus,
} from '../validation/style.validators';
import {
  buildL13ChatAnswer,
} from '../outputs';
import { buildGreenL13InputPackage } from './l13_2-invariants';
import { buildGreenL13Output } from './l13_3-invariants';
import { runL13GroundingPipeline } from './l13_4-invariants';
import { runL13ExpressionPipeline } from './l13_5-invariants';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.style.v1';

export interface L13_8InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/** Build a green styled envelope end-to-end for the green chat path. */
export async function buildGreenL13StyledChat(opts: {
  readonly user_query?: string;
  readonly explicit_language?: L13SupportedLanguage;
  readonly requested_verbosity?: L13VerbosityLevel;
  readonly deep_mode?: boolean;
  readonly report_mode?: boolean;
  readonly product_mode?: L13ProductAnswerMode;
  readonly intent?: L13UserIntentClass;
  readonly inject_summary?: string;
} = {}) {
  const pkg = buildGreenL13InputPackage();
  const baseOutput = buildGreenL13Output({ scenarioPresent: true });
  const output = opts.inject_summary
    ? {
        ...baseOutput,
        summary: `${baseOutput.summary} ${opts.inject_summary}`,
      }
    : baseOutput;
  const grounding = runL13GroundingPipeline(output, pkg).grounding;
  const expression = runL13ExpressionPipeline(output, pkg);
  const language = resolveL13Language({
    request_id: 'req.style.test',
    user_query: opts.user_query ?? 'what is happening with btc',
    explicit_user_language_request: opts.explicit_language,
  });
  const productMode =
    opts.product_mode ?? L13ProductAnswerMode.STANDARD_CHAT;
  const intentClass = opts.intent ?? L13UserIntentClass.WHATS_HAPPENING;
  const verbosity = resolveL13Verbosity({
    intent_class: intentClass,
    product_answer_mode: productMode,
    requested_verbosity: opts.requested_verbosity,
    deep_mode_explicitly_requested: opts.deep_mode,
    report_mode_explicitly_requested: opts.report_mode,
    must_disclose_uncertainty:
      pkg.uncertainty_profile.must_disclose_uncertainty,
    must_disclose_contradiction:
      pkg.uncertainty_profile.active_contradiction_present,
    must_disclose_trigger_or_invalidation:
      pkg.uncertainty_profile.active_invalidation_present ||
      pkg.uncertainty_profile.unresolved_trigger_present,
    must_disclose_restriction:
      pkg.restriction_profile.required_disclosures.length > 0,
  });
  const persona = buildL13PersonaPolicy(productMode);
  const stylePlan = buildL13StyleControlPlan({
    request_id: 'req.style.test',
    input_package_id: pkg.input_package_id,
    intent_class: intentClass,
    product_answer_mode: productMode,
    language_profile: language,
    verbosity_profile: verbosity,
    persona_policy: persona,
    must_preserve_uncertainty:
      pkg.uncertainty_profile.must_disclose_uncertainty,
    must_preserve_contradiction:
      pkg.uncertainty_profile.active_contradiction_present,
    must_preserve_trigger_invalidation:
      pkg.uncertainty_profile.active_invalidation_present ||
      pkg.uncertainty_profile.unresolved_trigger_present,
    must_preserve_restriction_disclosure: true,
  });
  const chat = buildL13ChatAnswer({
    output,
    input_package: pkg,
    grounding_result: grounding,
    expression,
    intent_class: intentClass,
    answer_mode: productMode as never,
  });
  const modeEnvelope = {
    mode_envelope_id: `l13.mode.env.${fnv1a(
      [chat.chat_answer_id, productMode, POLICY_V].join('|'),
    )}`,
    output_id: output.output_id,
    input_package_id: pkg.input_package_id,
    runtime_run_id: 'l13.run.style.test',
    answer_mode: productMode,
    intent_class: intentClass,
    output_class: L13AIOutputClass.MARKET_EXPLANATION,
    mode_payload_class: L13ModePayloadClass.CHAT_ANSWER,
    mode_payload_ref: chat.chat_answer_id,
    mode_readiness: 'MODE_READY' as never,
    required_disclosures_satisfied: true,
    forbidden_omissions_detected: false,
    evidence_refs: pkg.evidence_refs,
    lineage_refs: pkg.lineage_refs,
    policy_version: POLICY_V,
    replay_hash: fnv1a(chat.chat_answer_id),
  };
  const result = buildL13StyledResponseEnvelope({
    output_id: output.output_id,
    runtime_run_id: 'l13.run.style.test',
    mode_envelope: modeEnvelope as never,
    style_plan: stylePlan,
    mode_payload: {
      kind: L13ModePayloadClass.CHAT_ANSWER,
      payload: chat,
    },
    source_corpus: [
      chat.direct_answer,
      ...chat.supporting_explanation,
      ...chat.uncertainty_lines,
      ...chat.contradiction_lines,
      ...chat.trigger_lines,
      ...chat.invalidation_lines,
      ...chat.scenario_watchpoints,
    ].join(' '),
  });
  return {
    pkg,
    output,
    chat,
    language,
    verbosity,
    persona,
    stylePlan,
    modeEnvelope,
    ...result,
  };
}

// ── INV-13.8-A : style plan law ─────────────────────────────────────

export async function checkINV_138_A(): Promise<L13_8InvariantResult> {
  const r = await buildGreenL13StyledChat();
  const vPlan = validateL13StyleControlPlan(r.stylePlan);
  const vEnv = validateL13StyledResponseEnvelope(r.envelope, {
    product_answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
    user_emission: true,
  });
  return {
    id: 'INV-13.8-A',
    name: 'style plan law',
    holds: vPlan.clean && vEnv.clean && r.envelope.may_emit_to_user,
    evidence: `plan=${vPlan.clean} env=${vEnv.clean} emit=${r.envelope.may_emit_to_user}`,
  };
}

// ── INV-13.8-B : verbosity / concision law ──────────────────────────

export async function checkINV_138_B(): Promise<L13_8InvariantResult> {
  const short = await buildGreenL13StyledChat({
    product_mode: L13ProductAnswerMode.SHORT_CHAT,
    intent: L13UserIntentClass.WHATS_HAPPENING,
  });
  const deep = await buildGreenL13StyledChat({
    deep_mode: true,
    product_mode: L13ProductAnswerMode.DEEP_ANALYSIS,
    intent: L13UserIntentClass.WHATS_HAPPENING,
  });
  const report = await buildGreenL13StyledChat({
    report_mode: true,
    product_mode: L13ProductAnswerMode.STRUCTURED_REPORT,
    intent: L13UserIntentClass.WRITE_REPORT,
  });
  const alert = await buildGreenL13StyledChat({
    product_mode: L13ProductAnswerMode.ALERT,
    intent: L13UserIntentClass.WRITE_ALERT,
  });
  const shortOk =
    short.verbosity.resolved_verbosity === L13VerbosityLevel.SHORT ||
    short.verbosity.resolved_verbosity === L13VerbosityLevel.MEDIUM;
  const deepOk =
    deep.verbosity.resolved_verbosity === L13VerbosityLevel.DEEP ||
    deep.verbosity.resolved_verbosity === L13VerbosityLevel.REPORT;
  const reportOk =
    report.verbosity.resolved_verbosity === L13VerbosityLevel.REPORT;
  const alertOk =
    alert.verbosity.resolved_verbosity === L13VerbosityLevel.MICRO ||
    alert.verbosity.resolved_verbosity === L13VerbosityLevel.SHORT;
  return {
    id: 'INV-13.8-B',
    name: 'verbosity and concision law',
    holds: shortOk && deepOk && reportOk && alertOk,
    evidence: `short=${short.verbosity.resolved_verbosity} deep=${deep.verbosity.resolved_verbosity} report=${report.verbosity.resolved_verbosity} alert=${alert.verbosity.resolved_verbosity}`,
  };
}

// ── INV-13.8-C : disclosure preservation law ────────────────────────

export async function checkINV_138_C(): Promise<L13_8InvariantResult> {
  const r = await buildGreenL13StyledChat();
  const vIntegrity = validateL13StyleSemanticIntegrityProfile(
    r.integrity,
  );
  const allAnchorsHandled =
    r.integrity.anchor_classes_missing.length === 0;
  return {
    id: 'INV-13.8-C',
    name: 'disclosure preservation law',
    holds:
      vIntegrity.clean &&
      allAnchorsHandled &&
      !r.integrity.removed_required_claim_detected,
    evidence: `validator=${vIntegrity.clean} missing=${r.integrity.anchor_classes_missing.length} removed=${r.integrity.removed_required_claim_detected}`,
  };
}

// ── INV-13.8-D : non-semantic style law ─────────────────────────────

export async function checkINV_138_D(): Promise<L13_8InvariantResult> {
  // Inject an absolute forbidden phrase via the chat summary.
  const r = await buildGreenL13StyledChat({
    inject_summary:
      'This is going to pump and is absolutely guaranteed.',
  });
  const rewriteRequired =
    r.envelope.style_readiness ===
      L13StyleReadinessClass.STYLE_SEMANTIC_REWRITE_REQUIRED ||
    r.envelope.style_readiness ===
      L13StyleReadinessClass.STYLE_BLOCKED;
  const safetyBlocked =
    r.safety_scan.readiness ===
    L13MultilingualScanReadinessClass.SAFETY_BLOCKED;
  return {
    id: 'INV-13.8-D',
    name: 'non-semantic style law',
    holds: rewriteRequired && safetyBlocked && !r.envelope.may_emit_to_user,
    evidence: `readiness=${r.envelope.style_readiness} safety=${r.safety_scan.readiness} mayEmit=${r.envelope.may_emit_to_user}`,
  };
}

// ── INV-13.8-E : persona law ────────────────────────────────────────

export async function checkINV_138_E(): Promise<L13_8InvariantResult> {
  const r = await buildGreenL13StyledChat();
  const v = validateL13PersonaPolicy(r.persona);
  const greenCorpus = (r.envelope as L13StyledResponseEnvelope).display_payload_ref;
  void greenCorpus;
  // Persona text scanner over the shaped corpus.
  const personaScan = validateL13PersonaTextCorpus(
    r.shaped.display_payload_text,
  );
  const hyped = validateL13PersonaTextCorpus(
    'BTC is absolutely exploding and you should buy now.',
  );
  return {
    id: 'INV-13.8-E',
    name: 'persona law',
    holds: v.clean && personaScan.clean && !hyped.clean,
    evidence: `policy=${v.clean} greenCorpus=${personaScan.clean} hypeRejected=${!hyped.clean}`,
  };
}

// ── INV-13.8-F : multilingual equivalence law ──────────────────────

export async function checkINV_138_F(): Promise<L13_8InvariantResult> {
  const en = await buildGreenL13StyledChat({
    explicit_language: L13SupportedLanguage.ENGLISH,
  });
  const de = await buildGreenL13StyledChat({
    explicit_language: L13SupportedLanguage.GERMAN,
  });
  const es = await buildGreenL13StyledChat({
    explicit_language: L13SupportedLanguage.SPANISH,
  });
  const allClean =
    en.envelope.may_emit_to_user &&
    de.envelope.may_emit_to_user &&
    es.envelope.may_emit_to_user;
  const allSafetyClean =
    en.safety_scan.readiness !==
      L13MultilingualScanReadinessClass.SAFETY_BLOCKED &&
    de.safety_scan.readiness !==
      L13MultilingualScanReadinessClass.SAFETY_BLOCKED &&
    es.safety_scan.readiness !==
      L13MultilingualScanReadinessClass.SAFETY_BLOCKED;
  return {
    id: 'INV-13.8-F',
    name: 'multilingual equivalence law',
    holds: allClean && allSafetyClean,
    evidence: `en=${en.envelope.may_emit_to_user} de=${de.envelope.may_emit_to_user} es=${es.envelope.may_emit_to_user}`,
  };
}

// ── INV-13.8-G : multilingual safety law ───────────────────────────

export async function checkINV_138_G(): Promise<L13_8InvariantResult> {
  const advEN = runL13MultilingualSafetyScan({
    output_id: 'test.adv.en',
    resolved_language: L13SupportedLanguage.ENGLISH,
    user_visible_corpus: 'You should buy now and go long.',
  });
  const advDE = runL13MultilingualSafetyScan({
    output_id: 'test.adv.de',
    resolved_language: L13SupportedLanguage.GERMAN,
    user_visible_corpus: 'Du solltest kaufen. Jetzt einsteigen.',
  });
  const advES = runL13MultilingualSafetyScan({
    output_id: 'test.adv.es',
    resolved_language: L13SupportedLanguage.SPANISH,
    user_visible_corpus: 'Deberías comprar ahora. Va a subir seguro.',
  });
  const refusalQuote = runL13MultilingualSafetyScan({
    output_id: 'test.refusal.de',
    resolved_language: L13SupportedLanguage.GERMAN,
    user_visible_corpus:
      'Der Motor kann diese Anfrage nicht in eine Empfehlung umwandeln.',
    refusal_or_blocked_corpus:
      'Die folgende geblockte Forderung wurde abgewiesen: "du solltest kaufen".',
  });
  const enBlocks =
    advEN.readiness ===
    L13MultilingualScanReadinessClass.SAFETY_BLOCKED;
  const deBlocks =
    advDE.readiness ===
    L13MultilingualScanReadinessClass.SAFETY_BLOCKED;
  const esBlocks =
    advES.readiness ===
    L13MultilingualScanReadinessClass.SAFETY_BLOCKED;
  const refusalClean =
    refusalQuote.readiness !==
    L13MultilingualScanReadinessClass.SAFETY_BLOCKED;
  return {
    id: 'INV-13.8-G',
    name: 'multilingual safety law',
    holds: enBlocks && deBlocks && esBlocks && refusalClean,
    evidence: `en=${enBlocks} de=${deBlocks} es=${esBlocks} refusalQuoted=${refusalClean}`,
  };
}

// ── INV-13.8-H : language consistency law ──────────────────────────

export async function checkINV_138_H(): Promise<L13_8InvariantResult> {
  const lang = resolveL13Language({
    request_id: 'req.h.test',
    user_query: 'was passiert mit btc',
    explicit_user_language_request: L13SupportedLanguage.GERMAN,
  });
  const v = validateL13LanguageResolutionProfile(lang);
  const fallback = resolveL13Language({
    request_id: 'req.h.unsupported',
    user_query: '',
    explicit_user_language_request_unsupported: 'FR',
  });
  const unsupportedRejected =
    fallback.language_resolution_status ===
    L13LanguageResolutionStatus.BLOCKED_UNSUPPORTED_LANGUAGE;
  return {
    id: 'INV-13.8-H',
    name: 'language consistency law',
    holds:
      v.clean &&
      lang.resolved_output_language === L13SupportedLanguage.GERMAN &&
      unsupportedRejected,
    evidence: `validator=${v.clean} resolved=${lang.resolved_output_language} unsupportedRejected=${unsupportedRejected}`,
  };
}

// ── INV-13.8-I : runtime integration law ───────────────────────────

export async function checkINV_138_I(): Promise<L13_8InvariantResult> {
  const r = await buildGreenL13StyledChat();
  // The style plan must be referenced by the styled envelope; the
  // envelope must reference the integrity profile, the safety scan,
  // and the mode envelope. The final-gate (L13.6) consumer keys
  // off these refs.
  const refsLinked =
    r.envelope.style_control_plan_ref ===
      r.stylePlan.style_control_plan_id &&
    r.envelope.style_integrity_profile_ref ===
      r.integrity.style_integrity_id &&
    r.envelope.multilingual_safety_scan_ref ===
      r.safety_scan.scan_id &&
    r.envelope.mode_envelope_id === r.modeEnvelope.mode_envelope_id;
  return {
    id: 'INV-13.8-I',
    name: 'runtime integration law',
    holds: refsLinked,
    evidence: `refsLinked=${refsLinked}`,
  };
}

// ── INV-13.8-J : replay determinism law ────────────────────────────

export async function checkINV_138_J(): Promise<L13_8InvariantResult> {
  const a = await buildGreenL13StyledChat();
  const b = await buildGreenL13StyledChat();
  const stable =
    a.envelope.replay_hash === b.envelope.replay_hash &&
    a.stylePlan.replay_hash === b.stylePlan.replay_hash &&
    a.safety_scan.replay_hash === b.safety_scan.replay_hash &&
    a.integrity.replay_hash === b.integrity.replay_hash;
  const variant = await buildGreenL13StyledChat({
    inject_summary: 'Watch the spread carefully.',
  });
  const flipped = a.envelope.replay_hash !== variant.envelope.replay_hash;
  return {
    id: 'INV-13.8-J',
    name: 'replay determinism law',
    holds: stable && flipped,
    evidence: `stable=${stable} flipped=${flipped}`,
  };
}

export async function runAllL13_8Invariants():
  Promise<readonly L13_8InvariantResult[]> {
  return [
    await checkINV_138_A(),
    await checkINV_138_B(),
    await checkINV_138_C(),
    await checkINV_138_D(),
    await checkINV_138_E(),
    await checkINV_138_F(),
    await checkINV_138_G(),
    await checkINV_138_H(),
    await checkINV_138_I(),
    await checkINV_138_J(),
  ];
}

// Suppress unused-import warnings for helpers referenced via
// dynamic paths in downstream tests.
void runL13StyleSemanticIntegrityEngine;
void validateL13VerbosityResolutionProfile;
void validateL13MultilingualSafetyScan;
void L13VerbosityReasonCode.DEFAULT_SHORT_CHAT;
void L13StyleIntegrityStatus.STYLE_INTEGRITY_CLEAN;
void l13RankVerbosity;
