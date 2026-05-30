/**
 * L13.8 — Style Certification
 *
 * §13.8.39 — Bands A..F prove every style law mechanically.
 */

import { L13ProductAnswerMode } from '../l13/contracts/product-answer-mode';
import { L13UserIntentClass } from '../l13/contracts/user-intent-binding';
import {
  L13LanguageResolutionStatus,
  L13SupportedLanguage,
} from '../l13/contracts/language-profile';
import {
  L13VerbosityLevel,
  l13RankVerbosity,
} from '../l13/contracts/verbosity-profile';
import { L13MultilingualScanReadinessClass } from '../l13/contracts/multilingual-safety-scan';
import {
  L13StyleReadinessClass,
} from '../l13/contracts/styled-response-envelope';
import {
  buildL13PersonaPolicy,
  buildL13StyleControlPlan,
  resolveL13Language,
  resolveL13Verbosity,
  runL13MultilingualSafetyScan,
} from '../l13/style';
import {
  validateL13StyleControlPlan,
  validateL13VerbosityResolutionProfile,
  validateL13PersonaPolicy,
  validateL13LanguageResolutionProfile,
  validateL13MultilingualSafetyScan,
  validateL13StyleSemanticIntegrityProfile,
  validateL13StyledResponseEnvelope,
  validateL13PersonaTextCorpus,
  L13StyleViolationCode,
} from '../l13/validation';
import {
  emitL13StyleAuditRecord,
  getL13StyleAuditLog,
  getL13StyleCriticalViolations,
  L13StyleAuditSubjectClass,
  resetL13StyleAuditLog,
  severityForL13StyleCode,
  isL13StyleBlockingCode,
} from '../l13/constitution';
import { L13ViolationSeverity } from '../l13/contracts';
import {
  buildGreenL13StyledChat,
  runAllL13_8Invariants,
} from '../l13/invariants/l13_8-invariants';

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

async function main(): Promise<void> {
  // ── BAND A : style plans + verbosity ────────────────────────────
  band('BAND A — style plans + verbosity');
  {
    const green = await buildGreenL13StyledChat();
    assert(
      validateL13StyleControlPlan(green.stylePlan).clean,
      'A.1 style control plan validator clean on green',
    );
    assert(
      validateL13VerbosityResolutionProfile(green.verbosity).clean,
      'A.2 verbosity profile validator clean on green',
    );

    // SHORT_CHAT → SHORT or higher (disclosure floor may raise).
    const short = await buildGreenL13StyledChat({
      product_mode: L13ProductAnswerMode.SHORT_CHAT,
    });
    assert(
      l13RankVerbosity(short.verbosity.resolved_verbosity) >=
        l13RankVerbosity(L13VerbosityLevel.SHORT),
      `A.3 SHORT_CHAT resolves SHORT or higher (got ${short.verbosity.resolved_verbosity})`,
    );

    // DEEP_ANALYSIS explicit → DEEP or REPORT.
    const deep = await buildGreenL13StyledChat({
      deep_mode: true,
      product_mode: L13ProductAnswerMode.DEEP_ANALYSIS,
    });
    assert(
      deep.verbosity.resolved_verbosity === L13VerbosityLevel.DEEP ||
        deep.verbosity.resolved_verbosity === L13VerbosityLevel.REPORT,
      'A.4 DEEP_ANALYSIS resolves DEEP/REPORT',
    );

    // STRUCTURED_REPORT → REPORT.
    const report = await buildGreenL13StyledChat({
      report_mode: true,
      product_mode: L13ProductAnswerMode.STRUCTURED_REPORT,
      intent: L13UserIntentClass.WRITE_REPORT,
    });
    assert(
      report.verbosity.resolved_verbosity === L13VerbosityLevel.REPORT,
      'A.5 STRUCTURED_REPORT resolves REPORT',
    );

    // ALERT → MICRO or SHORT.
    const alert = await buildGreenL13StyledChat({
      product_mode: L13ProductAnswerMode.ALERT,
      intent: L13UserIntentClass.WRITE_ALERT,
    });
    assert(
      alert.verbosity.resolved_verbosity === L13VerbosityLevel.MICRO ||
        alert.verbosity.resolved_verbosity === L13VerbosityLevel.SHORT,
      'A.6 ALERT resolves MICRO/SHORT',
    );

    // Disclosure floor raises verbosity when uncertainty present.
    const floor = resolveL13Verbosity({
      intent_class: L13UserIntentClass.WRITE_ALERT,
      product_answer_mode: L13ProductAnswerMode.ALERT,
      must_disclose_uncertainty: true,
      must_disclose_contradiction: true,
      must_disclose_trigger_or_invalidation: true,
      must_disclose_restriction: true,
    });
    assert(
      l13RankVerbosity(floor.resolved_verbosity) >=
        l13RankVerbosity(L13VerbosityLevel.SHORT),
      `A.7 disclosure floor lifts alert above MICRO (got ${floor.resolved_verbosity})`,
    );

    // Tampered profile: resolved below floor → rejected.
    const broken = {
      ...green.verbosity,
      resolved_verbosity: L13VerbosityLevel.MICRO,
      disclosure_floor_verbosity: L13VerbosityLevel.MEDIUM,
    };
    assert(
      !validateL13VerbosityResolutionProfile(broken).clean,
      'A.8 verbosity below disclosure floor rejected',
    );
  }

  // ── BAND B : persona ────────────────────────────────────────────
  band('BAND B — persona law');
  {
    const persona = buildL13PersonaPolicy(
      L13ProductAnswerMode.STANDARD_CHAT,
    );
    assert(validateL13PersonaPolicy(persona).clean, 'B.1 persona validator clean');

    const cleanCorpus = validateL13PersonaTextCorpus(
      'The continuation setup remains conditional under governed evidence.',
    );
    assert(cleanCorpus.clean, 'B.2 grounded prose passes persona scan');

    const hype = validateL13PersonaTextCorpus(
      'BTC is absolutely exploding!! To the moon!',
    );
    assert(!hype.clean, 'B.3 hype influencer style rejected');

    const advisor = validateL13PersonaTextCorpus(
      'You should buy this dip.',
    );
    assert(!advisor.clean, 'B.4 financial advisor style rejected');

    const prophecy = validateL13PersonaTextCorpus(
      'This is going to pump next.',
    );
    assert(!prophecy.clean, 'B.5 prophecy engine style rejected');

    const sales = validateL13PersonaTextCorpus(
      'Unlock your returns. Don\'t miss this opportunity.',
    );
    assert(!sales.clean, 'B.6 sales copy style rejected');

    const disclaimer = validateL13PersonaTextCorpus(
      'This is not financial advice. Always do your own research.',
    );
    assert(!disclaimer.clean, 'B.7 disclaimer machine style rejected');

    const dashboard = validateL13PersonaTextCorpus(
      'REGIME: SPOT_LED. SEQUENCE: VALIDATED. HYPOTHESIS: ACCUM. SCORE: HIGH.',
    );
    assert(!dashboard.clean, 'B.8 robotic dashboard style rejected');
  }

  // ── BAND C : multilingual language ──────────────────────────────
  band('BAND C — multilingual language');
  {
    const en = resolveL13Language({
      request_id: 'r.en',
      user_query: 'what is happening with btc',
    });
    assert(
      en.resolved_output_language === L13SupportedLanguage.ENGLISH,
      `C.1 English resolved correctly (got ${en.resolved_output_language})`,
    );
    const de = resolveL13Language({
      request_id: 'r.de',
      user_query: 'Der Markt ist heute nicht klar und Unsicherheit ist groß.',
    });
    assert(
      de.resolved_output_language === L13SupportedLanguage.GERMAN,
      `C.2 German resolved correctly (got ${de.resolved_output_language})`,
    );
    const es = resolveL13Language({
      request_id: 'r.es',
      user_query: 'El mercado está incierto y no se puede comprar con seguridad.',
    });
    assert(
      es.resolved_output_language === L13SupportedLanguage.SPANISH,
      `C.3 Spanish resolved correctly (got ${es.resolved_output_language})`,
    );

    const explicit = resolveL13Language({
      request_id: 'r.exp',
      user_query: 'what is happening with btc',
      explicit_user_language_request: L13SupportedLanguage.GERMAN,
    });
    assert(
      explicit.resolved_output_language === L13SupportedLanguage.GERMAN &&
        explicit.language_resolution_status ===
          L13LanguageResolutionStatus.RESOLVED_FROM_EXPLICIT_USER_REQUEST,
      'C.4 explicit user request overrides detection',
    );

    const unsupported = resolveL13Language({
      request_id: 'r.fr',
      user_query: '',
      explicit_user_language_request_unsupported: 'FR',
    });
    assert(
      unsupported.language_resolution_status ===
        L13LanguageResolutionStatus.BLOCKED_UNSUPPORTED_LANGUAGE,
      'C.5 unsupported language blocks',
    );

    assert(
      validateL13LanguageResolutionProfile(de).clean,
      'C.6 language validator clean on German resolution',
    );
    assert(
      !validateL13LanguageResolutionProfile(unsupported).clean,
      'C.7 language validator rejects unsupported',
    );
  }

  // ── BAND D : multilingual safety ────────────────────────────────
  band('BAND D — multilingual safety');
  {
    const advEN = runL13MultilingualSafetyScan({
      output_id: 'd.en',
      resolved_language: L13SupportedLanguage.ENGLISH,
      user_visible_corpus: 'You should buy now. Guaranteed to pump.',
    });
    assert(
      advEN.readiness ===
        L13MultilingualScanReadinessClass.SAFETY_BLOCKED,
      'D.1 EN trade-advice + certainty blocked',
    );
    const advDE = runL13MultilingualSafetyScan({
      output_id: 'd.de',
      resolved_language: L13SupportedLanguage.GERMAN,
      user_visible_corpus: 'Du solltest kaufen. Garantiert wird pumpen.',
    });
    assert(
      advDE.readiness ===
        L13MultilingualScanReadinessClass.SAFETY_BLOCKED,
      'D.2 DE trade-advice + pump prophecy blocked',
    );
    const advES = runL13MultilingualSafetyScan({
      output_id: 'd.es',
      resolved_language: L13SupportedLanguage.SPANISH,
      user_visible_corpus: 'Deberías comprar. Va a subir seguro.',
    });
    assert(
      advES.readiness ===
        L13MultilingualScanReadinessClass.SAFETY_BLOCKED,
      'D.3 ES trade-advice + certainty blocked',
    );
    const scoreAction = runL13MultilingualSafetyScan({
      output_id: 'd.score',
      resolved_language: L13SupportedLanguage.ENGLISH,
      user_visible_corpus:
        'Opportunity score says buy and the score is high so this is a buy.',
    });
    assert(
      scoreAction.readiness ===
        L13MultilingualScanReadinessClass.SAFETY_BLOCKED,
      'D.4 score-as-action blocked',
    );
    const scenarioCert = runL13MultilingualSafetyScan({
      output_id: 'd.scn',
      resolved_language: L13SupportedLanguage.ENGLISH,
      user_visible_corpus: 'The scenario is locked.',
    });
    assert(
      scenarioCert.readiness ===
        L13MultilingualScanReadinessClass.SAFETY_BLOCKED,
      'D.5 scenario-as-certainty blocked',
    );
    const refusalQuote = runL13MultilingualSafetyScan({
      output_id: 'd.refusal',
      resolved_language: L13SupportedLanguage.GERMAN,
      user_visible_corpus:
        'Der Motor kann diese Anfrage nicht in eine Empfehlung umwandeln.',
      refusal_or_blocked_corpus:
        'Geblockte Forderung: "du solltest kaufen".',
    });
    assert(
      refusalQuote.readiness !==
        L13MultilingualScanReadinessClass.SAFETY_BLOCKED,
      'D.6 quoted blocked claim inside refusal context does not block',
    );
    assert(
      validateL13MultilingualSafetyScan(advEN).clean === false,
      'D.7 multilingual safety validator rejects blocking scan',
    );
    assert(
      validateL13MultilingualSafetyScan(refusalQuote).clean,
      'D.8 refusal-context scan clean',
    );
  }

  // ── BAND E : response shaper + integrity ────────────────────────
  band('BAND E — response shaper + style integrity');
  {
    const green = await buildGreenL13StyledChat();
    assert(
      validateL13StyleSemanticIntegrityProfile(green.integrity).clean,
      'E.1 integrity validator clean on green',
    );
    const uncertaintyRequired =
      green.stylePlan.required_semantic_anchor_classes.includes(
        'UNCERTAINTY_DISCLOSURE' as never,
      );
    assert(
      !uncertaintyRequired ||
        green.integrity.preserved_uncertainty_anchor,
      `E.2 uncertainty anchor preserved when required (required=${uncertaintyRequired} preserved=${green.integrity.preserved_uncertainty_anchor})`,
    );
    assert(
      !green.integrity.added_claim_detected,
      'E.3 no added claim detected on green',
    );
    assert(
      !green.integrity.confidence_strengthened_detected,
      'E.4 no confidence-strengthening detected on green',
    );

    // Injected forbidden phrase must route to rewrite/block.
    const offender = await buildGreenL13StyledChat({
      inject_summary:
        'This is going to pump and is absolutely guaranteed.',
    });
    assert(
      offender.integrity.confidence_strengthened_detected ||
        offender.integrity.added_claim_detected,
      'E.5 integrity detects strengthened confidence / added claim',
    );
    assert(
      offender.envelope.style_readiness !==
        L13StyleReadinessClass.STYLE_READY,
      'E.6 offender envelope not STYLE_READY',
    );
    assert(
      !offender.envelope.may_emit_to_user,
      'E.7 offender envelope refuses user emission',
    );
    assert(
      offender.envelope.rewrite_required ||
        offender.envelope.block_required,
      'E.8 offender envelope marks rewrite or block',
    );
  }

  // ── BAND F : runtime integration, audit, invariants ─────────────
  band('BAND F — runtime integration + audit + invariants');
  {
    const green = await buildGreenL13StyledChat();
    assert(
      green.envelope.style_control_plan_ref ===
        green.stylePlan.style_control_plan_id &&
        green.envelope.style_integrity_profile_ref ===
          green.integrity.style_integrity_id &&
        green.envelope.multilingual_safety_scan_ref ===
          green.safety_scan.scan_id &&
        green.envelope.mode_envelope_id ===
          green.modeEnvelope.mode_envelope_id,
      'F.1 styled envelope refs link plan + integrity + safety + mode envelope',
    );
    assert(
      validateL13StyledResponseEnvelope(green.envelope, {
        product_answer_mode: L13ProductAnswerMode.STANDARD_CHAT,
        user_emission: true,
      }).clean,
      'F.2 styled envelope validator clean on green',
    );

    resetL13StyleAuditLog();
    const r = emitL13StyleAuditRecord({
      subjectClass:
        L13StyleAuditSubjectClass.STYLED_RESPONSE_ENVELOPE,
      subjectRef: green.envelope.styled_response_id,
      violationCode:
        L13StyleViolationCode.L13S_MULTILINGUAL_TRADE_ADVICE_LEAK,
      message: 'simulated multilingual trade advice leak',
      outputId: green.envelope.output_id,
      language: 'GERMAN',
      answerMode: 'STANDARD_CHAT',
    });
    assert(r.audit_id.length > 0, 'F.3 audit record id present');
    assert(
      r.severity === L13ViolationSeverity.CRITICAL,
      'F.4 multilingual trade advice leak audited CRITICAL',
    );
    assert(r.blocking, 'F.5 multilingual trade advice leak blocking');
    assert(
      getL13StyleAuditLog().length === 1,
      'F.6 audit log captures one record',
    );
    assert(
      getL13StyleCriticalViolations().length === 1,
      'F.7 critical-only filter works',
    );
    assert(
      severityForL13StyleCode(
        L13StyleViolationCode.L13S_STYLE_LINEAGE_MISSING,
      ) === L13ViolationSeverity.ERROR,
      'F.8 lineage missing classified as ERROR',
    );
    assert(
      !isL13StyleBlockingCode(
        L13StyleViolationCode.L13S_STYLE_LINEAGE_MISSING,
      ),
      'F.9 lineage missing not blocking',
    );

    // Replay determinism.
    const a = await buildGreenL13StyledChat();
    const b = await buildGreenL13StyledChat();
    assert(
      a.envelope.replay_hash === b.envelope.replay_hash,
      'F.10 styled envelope replay hash deterministic',
    );
    const variant = await buildGreenL13StyledChat({
      inject_summary: 'A small footnote about further evidence.',
    });
    assert(
      variant.envelope.replay_hash !== a.envelope.replay_hash,
      'F.11 material change flips envelope replay hash',
    );

    // Invariants.
    const invs = await runAllL13_8Invariants();
    assert(invs.length === 10, `F.12 ten invariants executed (got ${invs.length})`);
    for (const inv of invs) {
      assert(inv.holds, `F.13 ${inv.id} ${inv.name} (${inv.evidence})`);
    }
  }

  console.log('');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Cert script crashed:', err);
  process.exit(1);
});
