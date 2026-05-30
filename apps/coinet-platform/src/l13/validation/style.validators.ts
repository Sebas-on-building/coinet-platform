/**
 * L13.8 — Style Validators
 *
 * §13.8.32 / §13.8.34 — Per-shape validators for style control
 * plan, verbosity profile, persona policy, language profile,
 * multilingual safety scan, semantic integrity, and styled
 * response envelope.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13StyleControlPlan } from '../contracts/style-control-plan';
import type { L13VerbosityResolutionProfile } from '../contracts/verbosity-profile';
import {
  L13VerbosityLevel,
  l13RankVerbosity,
} from '../contracts/verbosity-profile';
import type { L13PersonaPolicy } from '../contracts/persona-policy';
import {
  L13_FORBIDDEN_STYLE_PATTERNS,
  L13ForbiddenStyleClass,
} from '../contracts/style-policy';
import {
  L13LanguageResolutionStatus,
  L13SupportedLanguage,
  type L13LanguageResolutionProfile,
} from '../contracts/language-profile';
import {
  L13MultilingualSafetyPatternClass,
  L13MultilingualScanReadinessClass,
  type L13MultilingualSafetyScan,
} from '../contracts/multilingual-safety-scan';
import {
  L13StyleIntegrityStatus,
  type L13StyleSemanticIntegrityProfile,
} from '../contracts/style-semantic-integrity-profile';
import {
  L13StyleReadinessClass,
  type L13StyledResponseEnvelope,
  isL13BlockingStyleReadiness,
} from '../contracts/styled-response-envelope';
import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import { L13StyleViolationCode } from './l13-style-violation-codes';
import {
  l13StyleResult,
  type L13StyleIssue,
  type L13StyleValidationResult,
} from './_l13-style-issue';

const SEV = L13ViolationSeverity;

// ── Style control plan validator ────────────────────────────────────

export function validateL13StyleControlPlan(
  plan: L13StyleControlPlan,
): L13StyleValidationResult {
  const issues: L13StyleIssue[] = [];
  if (!plan.style_control_plan_id) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_CONTROL_PLAN_MISSING,
      severity: SEV.CRITICAL,
      message: 'style_control_plan_id missing',
    });
  }
  if (!plan.replay_hash) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (plan.lineage_refs.length === 0) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'lineage_refs empty',
    });
  }
  if (!plan.verbosity_profile?.resolved_verbosity) {
    issues.push({
      code: L13StyleViolationCode.L13S_RESOLVED_VERBOSITY_MISSING,
      severity: SEV.CRITICAL,
      message: 'verbosity_profile.resolved_verbosity missing',
    });
  }
  if (!plan.persona_profile_ref) {
    issues.push({
      code: L13StyleViolationCode.L13S_PERSONA_PROFILE_MISSING,
      severity: SEV.CRITICAL,
      message: 'persona_profile_ref missing',
    });
  }
  return l13StyleResult(issues);
}

// ── Verbosity profile validator ─────────────────────────────────────

export function validateL13VerbosityResolutionProfile(
  profile: L13VerbosityResolutionProfile,
): L13StyleValidationResult {
  const issues: L13StyleIssue[] = [];
  if (!profile.verbosity_resolution_id) {
    issues.push({
      code: L13StyleViolationCode.L13S_VERBOSITY_PROFILE_MISSING,
      severity: SEV.CRITICAL,
      message: 'verbosity_resolution_id missing',
    });
  }
  if (
    l13RankVerbosity(profile.resolved_verbosity) <
    l13RankVerbosity(profile.disclosure_floor_verbosity)
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_VERBOSITY_BELOW_DISCLOSURE_FLOOR,
      severity: SEV.ERROR,
      message: `resolved verbosity ${profile.resolved_verbosity} below disclosure floor ${profile.disclosure_floor_verbosity}`,
    });
  }
  if (
    profile.deep_mode_explicitly_requested &&
    l13RankVerbosity(profile.resolved_verbosity) <
      l13RankVerbosity(L13VerbosityLevel.DEEP)
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_DEEP_MODE_NOT_EXPANDED,
      severity: SEV.ERROR,
      message: 'deep mode requested but resolved below DEEP',
    });
  }
  if (
    profile.report_mode_explicitly_requested &&
    profile.resolved_verbosity !== L13VerbosityLevel.REPORT
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_REPORT_MODE_NOT_REPORT_SHAPED,
      severity: SEV.ERROR,
      message: 'report mode requested but resolved verbosity not REPORT',
    });
  }
  return l13StyleResult(issues);
}

// ── Persona policy validator ────────────────────────────────────────

export function validateL13PersonaPolicy(
  policy: L13PersonaPolicy,
): L13StyleValidationResult {
  const issues: L13StyleIssue[] = [];
  if (!policy.persona_policy_id) {
    issues.push({
      code: L13StyleViolationCode.L13S_PERSONA_PROFILE_MISSING,
      severity: SEV.CRITICAL,
      message: 'persona_policy_id missing',
    });
  }
  if (policy.allowed_voice_traits.length === 0) {
    issues.push({
      code: L13StyleViolationCode.L13S_PERSONA_PROFILE_MISSING,
      severity: SEV.CRITICAL,
      message: 'persona allowed_voice_traits empty',
    });
  }
  if (policy.forbidden_voice_traits.length === 0) {
    issues.push({
      code: L13StyleViolationCode.L13S_PERSONA_PROFILE_MISSING,
      severity: SEV.ERROR,
      message: 'persona forbidden_voice_traits empty',
    });
  }
  return l13StyleResult(issues);
}

/**
 * §13.8.5 — Persona output text scanner. Detects forbidden style
 * patterns in the SHAPED user-visible corpus. Used by the styled
 * envelope validator and by callers that want to gate prose
 * before emission.
 */
export function validateL13PersonaTextCorpus(
  corpus: string,
): L13StyleValidationResult {
  const issues: L13StyleIssue[] = [];
  const seen = new Set<L13ForbiddenStyleClass>();
  for (const entry of L13_FORBIDDEN_STYLE_PATTERNS) {
    if (seen.has(entry.style_class)) continue;
    if (entry.pattern.test(corpus)) {
      seen.add(entry.style_class);
      const code = forbiddenStyleToCode(entry.style_class);
      issues.push({
        code,
        severity: SEV.CRITICAL,
        message: `forbidden style class ${entry.style_class} detected`,
      });
    }
  }
  return l13StyleResult(issues);
}

function forbiddenStyleToCode(
  cls: L13ForbiddenStyleClass,
): L13StyleViolationCode {
  switch (cls) {
    case L13ForbiddenStyleClass.HYPE_INFLUENCER:
      return L13StyleViolationCode.L13S_PERSONA_HYPE_DETECTED;
    case L13ForbiddenStyleClass.FINANCIAL_ADVISOR:
      return L13StyleViolationCode.L13S_PERSONA_FINANCIAL_ADVISOR_DETECTED;
    case L13ForbiddenStyleClass.PROPHECY_ENGINE:
      return L13StyleViolationCode.L13S_PERSONA_PROPHECY_ENGINE_DETECTED;
    case L13ForbiddenStyleClass.SALES_COPY:
      return L13StyleViolationCode.L13S_PERSONA_SALES_COPY_DETECTED;
    case L13ForbiddenStyleClass.LEGAL_DISCLAIMER_MACHINE:
      return L13StyleViolationCode.L13S_PERSONA_DISCLAIMER_MACHINE_DETECTED;
    case L13ForbiddenStyleClass.ROBOTIC_DASHBOARD:
      return L13StyleViolationCode.L13S_PERSONA_ROBOTIC_DASHBOARD_DETECTED;
    case L13ForbiddenStyleClass.OVERCONFIDENT_ANALYST:
    case L13ForbiddenStyleClass.PANIC_BROADCASTER:
    case L13ForbiddenStyleClass.EMPTY_GENERIC_ASSISTANT:
    default:
      return L13StyleViolationCode.L13S_PERSONA_HYPE_DETECTED;
  }
}

// ── Language profile validator ──────────────────────────────────────

export function validateL13LanguageResolutionProfile(
  profile: L13LanguageResolutionProfile,
): L13StyleValidationResult {
  const issues: L13StyleIssue[] = [];
  if (!profile.language_resolution_id) {
    issues.push({
      code: L13StyleViolationCode.L13S_LANGUAGE_RESOLUTION_MISSING,
      severity: SEV.CRITICAL,
      message: 'language_resolution_id missing',
    });
  }
  if (
    profile.language_resolution_status ===
    L13LanguageResolutionStatus.BLOCKED_UNSUPPORTED_LANGUAGE
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_OUTPUT_LANGUAGE_UNSUPPORTED,
      severity: SEV.ERROR,
      message: 'unsupported language requested',
    });
  }
  if (
    profile.resolved_output_language !== 'BLOCKED' &&
    !Object.values(L13SupportedLanguage).includes(
      profile.resolved_output_language as L13SupportedLanguage,
    )
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_OUTPUT_LANGUAGE_UNSUPPORTED,
      severity: SEV.CRITICAL,
      message: 'resolved language not in supported set',
    });
  }
  return l13StyleResult(issues);
}

// ── Multilingual safety scan validator ──────────────────────────────

const PATTERN_CLASS_TO_CODE:
  Readonly<
    Record<L13MultilingualSafetyPatternClass, L13StyleViolationCode>
  > = {
  [L13MultilingualSafetyPatternClass.TRADE_ADVICE_DIRECT]:
    L13StyleViolationCode.L13S_MULTILINGUAL_TRADE_ADVICE_LEAK,
  [L13MultilingualSafetyPatternClass.TRADE_ADVICE_INDIRECT]:
    L13StyleViolationCode.L13S_MULTILINGUAL_TRADE_ADVICE_LEAK,
  [L13MultilingualSafetyPatternClass.GUARANTEE_CERTAINTY]:
    L13StyleViolationCode.L13S_MULTILINGUAL_CERTAINTY_LEAK,
  [L13MultilingualSafetyPatternClass.PUMP_DUMP_PROPHECY]:
    L13StyleViolationCode.L13S_MULTILINGUAL_PUMP_DUMP_PROPHECY,
  [L13MultilingualSafetyPatternClass.SCENARIO_AS_CERTAINTY]:
    L13StyleViolationCode.L13S_MULTILINGUAL_SCENARIO_AS_CERTAINTY,
  [L13MultilingualSafetyPatternClass.SCORE_AS_ACTION]:
    L13StyleViolationCode.L13S_MULTILINGUAL_SCORE_AS_ACTION,
  [L13MultilingualSafetyPatternClass.HYPE_INFLUENCER_STYLE]:
    L13StyleViolationCode.L13S_PERSONA_HYPE_DETECTED,
};

export function validateL13MultilingualSafetyScan(
  scan: L13MultilingualSafetyScan,
): L13StyleValidationResult {
  const issues: L13StyleIssue[] = [];
  if (!scan.scan_id) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_CONTROL_PLAN_MISSING,
      severity: SEV.CRITICAL,
      message: 'multilingual scan_id missing',
    });
  }
  for (const hit of scan.blocking_hits) {
    issues.push({
      code: PATTERN_CLASS_TO_CODE[hit.pattern_class],
      severity: SEV.CRITICAL,
      subject_ref: hit.hit_id,
      message: `${hit.pattern_class} hit in ${hit.matched_language}: "${hit.matched_phrase}"`,
    });
  }
  if (
    scan.readiness === L13MultilingualScanReadinessClass.SAFETY_BLOCKED &&
    scan.blocking_hits.length === 0
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message:
        'safety readiness SAFETY_BLOCKED but blocking_hits empty',
    });
  }
  return l13StyleResult(issues);
}

// ── Style semantic integrity validator ──────────────────────────────

export function validateL13StyleSemanticIntegrityProfile(
  profile: L13StyleSemanticIntegrityProfile,
): L13StyleValidationResult {
  const issues: L13StyleIssue[] = [];
  if (!profile.style_integrity_id) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_CONTROL_PLAN_MISSING,
      severity: SEV.CRITICAL,
      message: 'style_integrity_id missing',
    });
  }
  if (profile.added_claim_detected) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_ADDED_NEW_CLAIM,
      severity: SEV.CRITICAL,
      message: 'style added a new claim not present in source',
    });
  }
  if (profile.confidence_strengthened_detected) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_STRENGTHENED_CONFIDENCE,
      severity: SEV.CRITICAL,
      message: 'style strengthened confidence',
    });
  }
  if (profile.disclosure_weakened_detected) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_WEAKENED_DISCLOSURE,
      severity: SEV.CRITICAL,
      message: 'style weakened a required disclosure',
    });
  }
  if (profile.anchor_classes_missing.length > 0) {
    for (const cls of profile.anchor_classes_missing) {
      const code = anchorClassToCode(cls);
      issues.push({
        code,
        severity: SEV.CRITICAL,
        message: `style removed required anchor class ${cls}`,
      });
    }
  }
  if (
    profile.integrity_status ===
      L13StyleIntegrityStatus.STYLE_SEMANTIC_REWRITE_REQUIRED &&
    issues.length === 0
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_ADDED_NEW_CLAIM,
      severity: SEV.CRITICAL,
      message:
        'integrity_status=STYLE_SEMANTIC_REWRITE_REQUIRED but no concrete cause detected',
    });
  }
  return l13StyleResult(issues);
}

function anchorClassToCode(cls: string): L13StyleViolationCode {
  switch (cls) {
    case 'UNCERTAINTY_DISCLOSURE':
      return L13StyleViolationCode.L13S_STYLE_REMOVED_UNCERTAINTY;
    case 'CONTRADICTION_DISCLOSURE':
      return L13StyleViolationCode.L13S_STYLE_REMOVED_CONTRADICTION;
    case 'TRIGGER_DISCLOSURE':
      return L13StyleViolationCode.L13S_STYLE_REMOVED_TRIGGER;
    case 'INVALIDATION_DISCLOSURE':
      return L13StyleViolationCode.L13S_STYLE_REMOVED_INVALIDATION;
    case 'RESTRICTION_DISCLOSURE':
      return L13StyleViolationCode.L13S_STYLE_REMOVED_RESTRICTION;
    default:
      return L13StyleViolationCode.L13S_STYLE_WEAKENED_DISCLOSURE;
  }
}

// ── Styled response envelope validator ──────────────────────────────

export interface L13StyledEnvelopeValidationContext {
  readonly product_answer_mode: L13ProductAnswerMode;
  readonly user_emission: boolean;
}

export function validateL13StyledResponseEnvelope(
  env: L13StyledResponseEnvelope,
  ctx: L13StyledEnvelopeValidationContext,
): L13StyleValidationResult {
  const issues: L13StyleIssue[] = [];
  if (!env.styled_response_id) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLED_ENVELOPE_MISSING,
      severity: SEV.CRITICAL,
      message: 'styled_response_id missing',
    });
  }
  if (!env.replay_hash) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (env.lineage_refs.length === 0) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_LINEAGE_MISSING,
      severity: SEV.ERROR,
      message: 'lineage_refs empty',
    });
  }
  if (
    isL13BlockingStyleReadiness(env.style_readiness) &&
    env.may_emit_to_user
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message: `blocking style_readiness ${env.style_readiness} but may_emit_to_user=true`,
    });
  }
  if (
    env.style_readiness === L13StyleReadinessClass.STYLE_BLOCKED &&
    !env.block_required
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message:
        'STYLE_BLOCKED readiness but block_required=false',
    });
  }
  if (
    (env.style_readiness ===
      L13StyleReadinessClass.STYLE_SEMANTIC_REWRITE_REQUIRED ||
      env.style_readiness ===
        L13StyleReadinessClass.STYLE_RESHAPE_REQUIRED) &&
    !env.rewrite_required
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_STYLE_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message:
        'rewrite-required readiness but rewrite_required=false',
    });
  }
  if (
    ctx.product_answer_mode === L13ProductAnswerMode.STRUCTURED_REPORT &&
    env.display_payload_class !== 'REPORT_RENDER_TREE'
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_REPORT_MODE_NOT_REPORT_SHAPED,
      severity: SEV.CRITICAL,
      message: 'STRUCTURED_REPORT must produce REPORT_RENDER_TREE',
    });
  }
  if (
    ctx.product_answer_mode === L13ProductAnswerMode.ALERT &&
    env.display_payload_class !== 'ALERT_TEXT'
  ) {
    issues.push({
      code: L13StyleViolationCode.L13S_ALERT_TOO_LONG,
      severity: SEV.ERROR,
      message: 'ALERT mode must produce ALERT_TEXT payload class',
    });
  }
  return l13StyleResult(issues);
}
