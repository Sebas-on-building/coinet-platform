/**
 * BTAR-005 — AI Output Safety / Expression Gate
 *
 * The deterministic final-answer guardrail. Reviews `aiResponse.data.thesis`-
 * style output before user delivery, using the BTAR-004
 * `CoinetJudgmentPromptPackage` (truth class + expression rules) as ground
 * truth.
 *
 * Authority:
 *   Plan 2.1 §2.4 / §7 (TF taxonomy)
 *   Plan 2.2 §7.4 (P2-S11 new file class)
 *   BTAR-005 §§9–14
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 imports.
 *   - No second LLM call.
 *   - No compliance platform.
 *   - All functions are pure / deterministic. No I/O, no time, no randomness.
 *
 * This is a bounded live-path trust modification, not a chat service rewrite.
 * This is a final AI expression gate, not a new AI service, not a compliance
 * platform, and not a replacement for the judgment engine.
 */

import type { CoinetJudgmentPromptPackage } from './judgment-prompt-package.types';
import type {
  AIOutputGateDecision,
  AIOutputSafetyGateInput,
  AIOutputSafetyGateResult,
  AIOutputSafetyViolation,
} from './ai-output-safety-gate.types';

const POLICY_VERSION = 'ai-output-safety-gate.v1' as const;

// ──────────────────────────────────────────────────────────────────────────
// Detector regexes — kept small + readable. Each is anchored on common
// phrasings, not free-form NLP. False-positive prevention: detectors that
// could match defensive language (e.g., "not a recommendation to buy") use a
// negation-context guard.
// ──────────────────────────────────────────────────────────────────────────

const DIRECT_FINANCIAL_ADVICE_PATTERNS: RegExp[] = [
  /\byou\s+should\s+(buy|sell)\b/i,
  /\b(buy|sell)\s+(now|today|immediately)\b/i,
  /\benter\s+(a\s+)?(long|short|position)\s+now\b/i,
  /\bexit\s+(your|the)?\s*position\s+now\b/i,
  /\bgo\s+(long|short)\s+(on|now)\b/i,
  /\bape\s+in\b/i,
  /\bload\s+up\b/i,
  /\btake\s+profit\s+now\b/i,
  /\bcut\s+your\s+position\b/i,
  // Multilingual imperative buy/sell directives (hardening — the substantive
  // detectors must not be English-blind once the disclosure clobber is relaxed).
  /\b(kauf|kaufe|kaufen)\s+(jetzt|sofort|heute)\b/i, // de
  /\b(verkauf|verkaufe|verkaufen)\s+(jetzt|sofort|heute)\b/i, // de
  /\b(jetzt|sofort)\s+(kaufen|verkaufen)\b/i, // de
  /\bdu\s+solltest\s+(jetzt\s+)?(kaufen|verkaufen)\b/i, // de
  /\b(compra|vende)\s+(ahora|ya|hoy)\b/i, // es
  /\bdeberías\s+(comprar|vender)\b/i, // es
  /\b(achète|achetez|vends|vendez)\s+(maintenant|tout\s+de\s+suite)\b/i, // fr
  /\btu\s+devrais\s+(acheter|vendre)\b/i, // fr
  /\b(compre|venda)\s+(agora|já|hoje)\b/i, // pt
  /\bvocê\s+deveria\s+(comprar|vender)\b/i, // pt
  /\b(compra|vendi)\s+(ora|adesso|subito)\b/i, // it
  /\bdovresti\s+(comprare|vendere)\b/i, // it
  /(?:^|[\s,.;!?])şimdi\s+(al|sat)\b/i, // tr (JS \b is ASCII-only; ş is non-word)
  /\b(almalısın|satmalısın)\b/i, // tr
];

// Phrases that signal a negation/defensive context where buy/sell language is
// quoted, not advised.
const NEGATION_CONTEXT_PATTERNS: RegExp[] = [
  /\bnot\s+(a\s+)?(recommendation|advice|suggestion)\s+to\s+(buy|sell)\b/i,
  /\b(this|that|it)\s+is\s+not\s+(a\s+)?financial\s+advice\b/i,
  /\bdo\s+not\s+(treat|take)\s+this\s+as\s+(a\s+)?(recommendation|advice)\b/i,
  /\bcannot\s+provide\s+(a\s+)?(buy|sell)\s+recommendation\b/i,
];

const GUARANTEED_OUTCOME_PATTERNS: RegExp[] = [
  /\bwill\s+(pump|dump|moon|crash|rally|surge|skyrocket)\b/i,
  /\bguaranteed\b/i,
  /\bcertainly\s+(will|going\s+to)\b/i,
  /\bdefinitely\s+(going\s+to|will)\b/i,
  /\bno\s+doubt\b/i,
  /\binevitable\b/i,
  /\brisk[-\s]?free\b/i,
  /\bsure\s+thing\b/i,
  /\bcannot\s+fail\b/i,
  // Multilingual guarantee / certainty-of-direction terms (hardening).
  /\bgarantiert\b/i, // de
  /\bwird\s+(steigen|fallen|explodieren|pumpen|abstürzen|crashen)\b/i, // de
  /\b(sicherer\s+gewinn|risikofrei)\b/i, // de
  /\bgarantizado\b/i, // es
  /\bva\s+a\s+(subir|explotar|multiplicarse|caer)\b/i, // es
  /\bsin\s+riesgo\b/i, // es
  /\bgaranti\b/i, // fr/tr (shared)
  /\bva\s+(monter|exploser|chuter)\b/i, // fr
  /\bsans\s+risque\b/i, // fr
  /\bgarantido\b/i, // pt
  /\bvai\s+(subir|explodir|cair)\b/i, // pt
  /\bsem\s+risco\b/i, // pt
  /\bgarantito\b/i, // it
  /\b(salirà|esploderà|crollerà)\s+sicuramente\b/i, // it
  /\bsenza\s+rischio\b/i, // it
  /\bkesinlikle\s+(yükselecek|düşecek|patlayacak)\b/i, // tr
  /\briski?siz\b/i, // tr
];

const UNSUPPORTED_CERTAINTY_PATTERNS: RegExp[] = [
  /\bcoinet\s+is\s+(certain|sure)\b/i,
  /\bhigh\s+conviction\b/i,
  /\bextremely\s+confident\b/i,
  /\bthis\s+is\s+confirmed\b/i,
  /\bthesis\s+is\s+fully\s+validated\b/i,
];

const CONFIDENCE_INFLATION_PATTERNS: RegExp[] = [
  /\bhigh\s+confidence\b/i,
  /\bstrong\s+conviction\b/i,
  /\bclear\s+thesis\b/i,
  /\bconfirmed\s+setup\b/i,
  /\bfully\s+supported\b/i,
];

const INVENTED_EVIDENCE_PATTERNS: RegExp[] = [
  /\bdata\s+shows\b/i,
  /\bon[-\s]?chain\s+(data\s+)?confirms?\b/i,
  /\bwhales\s+are\s+accumulating\b/i,
  /\bfunding\s+confirms?\b/i,
  /\betf\s+flows?\s+confirms?\b/i,
  /\bvolume\s+proves?\b/i,
  /\bliquidity\s+confirms?\b/i,
];

const GOVERNED_CLAIM_PATTERNS: RegExp[] = [
  /\bcoinet'?s\s+(current\s+)?thesis\s+is\b/i,
  /\bcoinet\s+sees\b/i,
  /\bthe\s+structured\s+judgment\s+shows\b/i,
  /\bcoinet'?s\s+(scenario|contradiction|timing)\s+is\b/i,
  /\bcoinet\s+has\s+a\s+(governed|structured)\s+(thesis|read)\b/i,
  /\baccording\s+to\s+coinet'?s\s+(structured\s+)?judgment\b/i,
  // Multilingual "Coinet has/sees a governed thesis/judgment" (hardening — a fake
  // market thesis must still be caught when the answer is not in English).
  /\bcoinets?\s+(these|urteil|einschätzung|bewertung)\s+(ist|lautet)\b/i, // de
  /\bcoinet\s+sieht\b/i, // de
  /\bla\s+tesis\s+de\s+coinet\s+es\b/i, // es
  /\bcoinet\s+ve\b/i, // es
  /\bla\s+thèse\s+de\s+coinet\s+est\b/i, // fr
  /\bcoinet\s+voit\b/i, // fr
  /\ba\s+tese\s+da\s+coinet\s+é\b/i, // pt
  /\bcoinet\s+vê\b/i, // pt
  /\bla\s+tesi\s+di\s+coinet\s+è\b/i, // it
  /\bcoinet\s+vede\b/i, // it
  /\bcoinet'?in\s+(tezi|görüşü|değerlendirmesi)\b/i, // tr
];

const DEGRADATION_DISCLOSURE_PATTERNS: RegExp[] = [
  /\bdegraded\b/i,
  /\bpartial(ly)?\b/i,
  /\blimited\b/i,
  /\bconfidence\s+(should|must)\s+be\s+capped\b/i,
  /\bnot\s+(a\s+)?complete\s+read\b/i,
  /\bsome\s+context\s+is\s+(unavailable|missing)\b/i,
];

const UNAVAILABLE_DISCLOSURE_PATTERNS: RegExp[] = [
  /\bstructured\s+coinet\s+judgment\s+is\s+unavailable\b/i,
  /\bgoverned\s+judgment\s+is\s+unavailable\b/i,
  /\bi\s+cannot\s+produce\s+a\s+structured\s+coinet\s+judgment\b/i,
  /\bnot\s+a\s+governed\s+coinet\s+read\b/i,
  /\bstructured\s+coinet\s+judgment\s+is\s+not\s+available\b/i,
  // The mentor's natural scope phrasings (so a compliant English answer is not
  // flagged): market-wide and unsupported-token honest-scope statements.
  /\bdon'?t\s+produce\s+a\s+full\s+market\s+verdict\b/i,
  /\bmy\s+judgments?\s+are\s+per[-\s]token\b/i,
  /\bnot\s+a\s+(full\s+)?market\s+verdict\b/i,
  /\bwon'?t\s+guess\s+at\s+a\s+verdict\b/i,
  /\bdon'?t\s+have\s+this\s+one\s+in\s+my\s+engine\b/i,
];

// ──────────────────────────────────────────────────────────────────────────
// Detector helpers (each is exported for direct testability)
// ──────────────────────────────────────────────────────────────────────────

function hasNegationContext(output: string): boolean {
  return NEGATION_CONTEXT_PATTERNS.some((re) => re.test(output));
}

export function detectDirectFinancialAdvice(output: string): boolean {
  // If the entire output is framed as a disclaimer ("this is not a
  // recommendation to buy or sell"), do not flag.
  if (hasNegationContext(output) && !hasNonDefensiveFinancialAdvice(output)) {
    return false;
  }
  return DIRECT_FINANCIAL_ADVICE_PATTERNS.some((re) => re.test(output));
}

/**
 * When negation context is present, we still want to flag if a non-defensive
 * piece of the output advises buying/selling outside the negation clause. The
 * minimum bar: if any DIRECT pattern matches a sentence that does NOT itself
 * contain a negation pattern, it counts.
 */
function hasNonDefensiveFinancialAdvice(output: string): boolean {
  const sentences = splitSentences(output);
  for (const s of sentences) {
    if (NEGATION_CONTEXT_PATTERNS.some((re) => re.test(s))) continue;
    if (DIRECT_FINANCIAL_ADVICE_PATTERNS.some((re) => re.test(s))) return true;
  }
  return false;
}

export function detectGuaranteedOutcomeLanguage(output: string): boolean {
  return GUARANTEED_OUTCOME_PATTERNS.some((re) => re.test(output));
}

export function detectUnsupportedCertainty(output: string): boolean {
  return UNSUPPORTED_CERTAINTY_PATTERNS.some((re) => re.test(output));
}

export function detectMissingRequiredDisclosure(
  output: string,
  pkg: CoinetJudgmentPromptPackage,
): boolean {
  if (pkg.judgment_status === 'UNAVAILABLE') {
    return !UNAVAILABLE_DISCLOSURE_PATTERNS.some((re) => re.test(output));
  }
  if (pkg.judgment_status === 'DEGRADED' && pkg.degradation.disclosure_required) {
    return !DEGRADATION_DISCLOSURE_PATTERNS.some((re) => re.test(output));
  }
  return false;
}

export function detectUnavailableJudgmentMisrepresentation(
  output: string,
  pkg: CoinetJudgmentPromptPackage,
): boolean {
  if (pkg.judgment_status !== 'UNAVAILABLE') return false;
  return GOVERNED_CLAIM_PATTERNS.some((re) => re.test(output));
}

function detectConfidenceInflation(
  output: string,
  pkg: CoinetJudgmentPromptPackage,
): boolean {
  // Inflation only meaningful if the package is DEGRADED, UNAVAILABLE, or
  // does not expose a confidence band.
  const hasConfidenceBand = !!pkg.judgment?.confidence_band;
  const lowOrAbsent =
    pkg.judgment_status !== 'AVAILABLE' || !hasConfidenceBand
      ? true
      : /VERY_LOW|LOW/.test(pkg.judgment!.confidence_band!);
  if (!lowOrAbsent) return false;
  return CONFIDENCE_INFLATION_PATTERNS.some((re) => re.test(output));
}

function detectInventedEvidence(
  output: string,
  pkg: CoinetJudgmentPromptPackage,
): boolean {
  // Conservative: only flag invented-evidence phrasing when the package has
  // no source_refs and no judgment fields (i.e., no grounding present).
  const hasGrounding =
    pkg.source_refs.length > 0 ||
    (pkg.judgment !== undefined &&
      (pkg.judgment.thesis !== undefined ||
        pkg.judgment.cause !== undefined ||
        pkg.judgment.state !== undefined));
  if (hasGrounding) return false;
  return INVENTED_EVIDENCE_PATTERNS.some((re) => re.test(output));
}

function detectPackageContradiction(
  output: string,
  pkg: CoinetJudgmentPromptPackage,
): boolean {
  // Conservative check: only flag if the output directly says
  // "Coinet's thesis" / "Coinet's confidence" / etc., AND the package's
  // forbidden_claims include the corresponding "Do not claim ..." line.
  // Avoids over-flagging on cautious language.
  for (const forbidden of pkg.expression_rules.forbidden_claims) {
    const match = /Do not claim Coinet has a structured (thesis|confidence|contradiction|scenario|timing)/i.exec(
      forbidden,
    );
    if (!match) continue;
    const target = match[1].toLowerCase();
    const offendingPattern = new RegExp(
      `\\bcoinet'?s\\s+(structured\\s+|governed\\s+)?${target}\\b`,
      'i',
    );
    if (offendingPattern.test(output)) return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────────
// Evaluator
// ──────────────────────────────────────────────────────────────────────────

export function evaluateAIOutputSafety(
  input: AIOutputSafetyGateInput,
): AIOutputSafetyGateResult {
  const { output, judgmentPackage: pkg } = input;
  const violations: AIOutputSafetyViolation[] = [];
  const reasons: string[] = [];
  const required_edits: string[] = [];

  if (detectDirectFinancialAdvice(output)) {
    violations.push('DIRECT_FINANCIAL_ADVICE');
    reasons.push('Output contains direct buy/sell instruction.');
    required_edits.push('Remove buy/sell directives; reframe as educational discussion.');
  }

  if (detectGuaranteedOutcomeLanguage(output)) {
    violations.push('GUARANTEED_OUTCOME_LANGUAGE');
    reasons.push('Output guarantees a market outcome.');
    required_edits.push('Replace guarantee with conditional / probabilistic language.');
  }

  if (detectUnsupportedCertainty(output)) {
    violations.push('UNSUPPORTED_CERTAINTY');
    reasons.push('Output asserts certainty not supported by the package.');
    required_edits.push('Soften certainty wording to match the package confidence band.');
  }

  if (
    pkg.judgment_status === 'DEGRADED' &&
    detectMissingRequiredDisclosure(output, pkg)
  ) {
    violations.push('MISSING_DEGRADATION_DISCLOSURE');
    reasons.push('DEGRADED package; output does not disclose the limitation.');
    required_edits.push('Add a degradation disclosure mentioning the limitation.');
  }

  if (
    pkg.judgment_status === 'UNAVAILABLE' &&
    detectMissingRequiredDisclosure(output, pkg)
  ) {
    violations.push('MISSING_UNAVAILABLE_DISCLOSURE');
    reasons.push('UNAVAILABLE package; output does not disclose unavailability.');
    required_edits.push('State that structured Coinet judgment is unavailable.');
  }

  if (detectUnavailableJudgmentMisrepresentation(output, pkg)) {
    violations.push('GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE');
    reasons.push('UNAVAILABLE package; output claims governed judgment.');
    required_edits.push(
      'Remove claims that Coinet has a thesis/confidence/contradiction/scenario for this request.',
    );
  }

  if (detectConfidenceInflation(output, pkg)) {
    violations.push('CONFIDENCE_INFLATION');
    reasons.push('Output overstates confidence relative to package status.');
    required_edits.push('Lower confidence language to match the package.');
  }

  if (detectInventedEvidence(output, pkg)) {
    violations.push('INVENTED_EVIDENCE_LANGUAGE');
    reasons.push('Output claims evidence not present in the package.');
    required_edits.push(
      'Remove specific evidence claims that are not grounded in the package.',
    );
  }

  if (detectPackageContradiction(output, pkg)) {
    violations.push('PACKAGE_CONTRADICTION');
    reasons.push("Output contradicts a package forbidden_claims rule.");
    required_edits.push('Respect the package forbidden_claims list.');
  }

  const decision = deriveDecision(violations, output);

  const result: AIOutputSafetyGateResult = {
    decision,
    reasons,
    violations,
    required_edits,
    policy_version: POLICY_VERSION,
  };

  if (decision === 'REWRITE_REQUIRED' || decision === 'BLOCK_OR_CLARIFY') {
    const safe = buildSafeOutputFromGateResult(input, result);
    if (safe !== undefined) result.safe_output = safe;
  }

  return result;
}

// ──────────────────────────────────────────────────────────────────────────
// Gate orchestrator — returns the final user-facing string + the gate result
// ──────────────────────────────────────────────────────────────────────────

export function applyAIOutputSafetyGate(input: AIOutputSafetyGateInput): {
  output: string;
  gate: AIOutputSafetyGateResult;
} {
  const gate = evaluateAIOutputSafety(input);
  const output =
    gate.safe_output !== undefined && gate.safe_output.length > 0
      ? gate.safe_output
      : input.output;
  return { output, gate };
}

// ──────────────────────────────────────────────────────────────────────────
// Safe-output rewriter (deterministic; no LLM)
// ──────────────────────────────────────────────────────────────────────────

export function buildSafeOutputFromGateResult(
  input: AIOutputSafetyGateInput,
  gate: AIOutputSafetyGateResult,
): string | undefined {
  if (gate.decision === 'ALLOW' || gate.decision === 'ALLOW_WITH_WARNINGS') {
    return undefined;
  }

  const pkg = input.judgmentPackage;

  // Highest-priority rewrite: extreme outputs (guaranteed outcomes) → BLOCK.
  if (gate.violations.includes('GUARANTEED_OUTCOME_LANGUAGE')) {
    return (
      "I can't provide that kind of prediction. " +
      describePackageForUser(pkg) +
      " I can discuss the structured thesis, risks, and conditions to watch, but not as a guaranteed outcome."
    );
  }

  // UNAVAILABLE misrepresentation / missing disclosure → canonical unavailable answer.
  if (
    pkg.judgment_status === 'UNAVAILABLE' &&
    (gate.violations.includes('GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE') ||
      gate.violations.includes('MISSING_UNAVAILABLE_DISCLOSURE') ||
      gate.violations.includes('PACKAGE_CONTRADICTION'))
  ) {
    return (
      "I can't present a governed Coinet thesis for this request because structured Coinet judgment is unavailable. " +
      "I can offer general context, but it should not be treated as a structured Coinet read."
    );
  }

  // DEGRADED missing disclosure / overconfidence → cautious framing.
  if (
    pkg.judgment_status === 'DEGRADED' &&
    (gate.violations.includes('MISSING_DEGRADATION_DISCLOSURE') ||
      gate.violations.includes('CONFIDENCE_INFLATION'))
  ) {
    return (
      "Coinet's read is partially degraded. The available evidence may support a cautious interpretation, " +
      "but confidence should remain limited until the degraded context is restored. This is not a recommendation to buy or sell."
    );
  }

  // Direct financial advice → educational reframe (any status).
  if (gate.violations.includes('DIRECT_FINANCIAL_ADVICE')) {
    return (
      "I can't provide buy or sell instructions. Coinet can discuss the structured thesis, risks, contradictions, " +
      "and conditions to watch, but this should not be treated as financial advice."
    );
  }

  // Confidence inflation or unsupported certainty under AVAILABLE → soften.
  if (
    gate.violations.includes('UNSUPPORTED_CERTAINTY') ||
    gate.violations.includes('CONFIDENCE_INFLATION')
  ) {
    return (
      "Coinet's current read should be treated cautiously. Confidence is bounded by the structured judgment package " +
      "and not by certainty claims. This is not a recommendation to buy or sell."
    );
  }

  // Invented evidence → generic safe fallback.
  if (gate.violations.includes('INVENTED_EVIDENCE_LANGUAGE')) {
    return (
      "I can't cite specific evidence that isn't supported by the structured judgment package. " +
      "Coinet can summarize the available judgment fields and explain how the read would change if specific evidence appears."
    );
  }

  // Catch-all clarification.
  return (
    "I'd rather not answer that the way it was originally phrased. " +
    describePackageForUser(pkg) +
    " I can offer a more careful explanation grounded in the structured judgment package."
  );
}

function describePackageForUser(pkg: CoinetJudgmentPromptPackage): string {
  if (pkg.judgment_status === 'UNAVAILABLE') {
    return 'Structured Coinet judgment is unavailable for this request.';
  }
  if (pkg.judgment_status === 'DEGRADED') {
    return "The current Coinet judgment is degraded and confidence should be capped.";
  }
  return 'A structured Coinet judgment is available for this request.';
}

// ──────────────────────────────────────────────────────────────────────────
// Decision derivation
// ──────────────────────────────────────────────────────────────────────────

function deriveDecision(
  violations: AIOutputSafetyViolation[],
  output: string,
): AIOutputGateDecision {
  if (violations.length === 0) {
    return 'ALLOW';
  }

  // BLOCK_OR_CLARIFY: extreme classes that should never reach the user.
  const blockClasses: AIOutputSafetyViolation[] = ['GUARANTEED_OUTCOME_LANGUAGE'];
  if (violations.some((v) => blockClasses.includes(v))) {
    return 'BLOCK_OR_CLARIFY';
  }

  // Disclosure-only relaxation: a MISSING disclosure phrase, with NO substantive
  // violation, must not clobber a compliant answer (often non-English, where the
  // English disclosure phrasing simply won't match). The substantive protections
  // — governed-claim-when-unavailable, direct advice, guaranteed outcome — are
  // enforced above/below and are multilingual-hardened, so a fake thesis or a
  // buy/sell directive in any language still forces a rewrite/block. A bare
  // missing-disclosure becomes a logged warning, not a canned-string replacement.
  const disclosureOnly: AIOutputSafetyViolation[] = [
    'MISSING_UNAVAILABLE_DISCLOSURE',
    'MISSING_DEGRADATION_DISCLOSURE',
  ];
  if (violations.every((v) => disclosureOnly.includes(v))) {
    return 'ALLOW_WITH_WARNINGS';
  }

  // REWRITE_REQUIRED: any other safety violation (incl. a disclosure miss that
  // CO-OCCURS with a substantive violation — the substantive one drives this).
  const rewriteClasses: AIOutputSafetyViolation[] = [
    'DIRECT_FINANCIAL_ADVICE',
    'MISSING_UNAVAILABLE_DISCLOSURE',
    'GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE',
    'MISSING_DEGRADATION_DISCLOSURE',
    'CONFIDENCE_INFLATION',
    'UNSUPPORTED_CERTAINTY',
    'INVENTED_EVIDENCE_LANGUAGE',
    'PACKAGE_CONTRADICTION',
  ];
  if (violations.some((v) => rewriteClasses.includes(v))) {
    return 'REWRITE_REQUIRED';
  }

  // Unknown-class only → soft pass with warnings.
  return 'ALLOW_WITH_WARNINGS';
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
