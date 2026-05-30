/**
 * BTAR-003 — Judgment Availability Helper
 *
 * Pure, deterministic helpers that classify the structured-judgment availability
 * of a chat turn into AVAILABLE / DEGRADED / UNAVAILABLE and emit AI-context
 * blocks that prevent the live path from silently pretending structured
 * judgment exists when it does not.
 *
 * Authority:
 *   Plan 2.1 §2.1 first principle ("The user-facing AI response must never
 *     pretend structured judgment exists when the structured judgment path
 *     failed, degraded, timed out, or became unavailable.")
 *   Plan 2.2 §7.3 P2-S10 (new file class)
 *   BTAR-003 §10, §11 (helper exports and context block specifications)
 *
 * SCOPE LIMITS (per Plan 2.3 OOS):
 *   - No L13/L14 runtime imports.
 *   - No AI output safety gate (BTAR-005).
 *   - No CoinetJudgmentPromptPackage (BTAR-004).
 *   - No I/O, no time, no randomness — all functions are pure.
 *
 * This is judgment availability/failure classification, not a new judgment engine.
 */

import type {
  JudgmentAvailabilityResult,
  JudgmentDegradedReason,
  JudgmentUnavailableReason,
} from './judgment-availability.types';

const POLICY_VERSION = 'judgment-availability.v1' as const;

export function createAvailableJudgmentState(): JudgmentAvailabilityResult {
  return {
    state: 'AVAILABLE',
    canUseStructuredJudgment: true,
    userDisclosureRequired: false,
    reasons: [],
    unavailableReasons: [],
    degradedReasons: [],
    failedComponents: [],
    degradedComponents: [],
    policyVersion: POLICY_VERSION,
  };
}

export function createUnavailableJudgmentState(input: {
  reason: JudgmentUnavailableReason;
  component: string;
  error?: unknown;
}): JudgmentAvailabilityResult {
  const errorMessage = extractErrorMessage(input.error);
  return {
    state: 'UNAVAILABLE',
    canUseStructuredJudgment: false,
    userDisclosureRequired: true,
    reasons: [input.reason],
    unavailableReasons: [input.reason],
    degradedReasons: [],
    failedComponents: [input.component],
    degradedComponents: [],
    policyVersion: POLICY_VERSION,
    ...(errorMessage !== undefined ? { errorMessage } : {}),
  };
}

export function createDegradedJudgmentState(input: {
  reason: JudgmentDegradedReason;
  component: string;
  message?: string;
}): JudgmentAvailabilityResult {
  return {
    state: 'DEGRADED',
    canUseStructuredJudgment: true,
    userDisclosureRequired: true,
    reasons: [input.reason],
    unavailableReasons: [],
    degradedReasons: [input.reason],
    failedComponents: [],
    degradedComponents: [input.component],
    policyVersion: POLICY_VERSION,
    ...(input.message !== undefined ? { errorMessage: input.message } : {}),
  };
}

/**
 * AI-context block to prepend to the prompt when structured judgment is
 * UNAVAILABLE. Per Plan 2.1 §2.4 the AI must not be allowed to present a
 * confident thesis when produceJudgment() failed.
 */
export function buildUnavailableJudgmentContextForAI(
  availability: JudgmentAvailabilityResult,
): string {
  const reason = availability.unavailableReasons[0] ?? 'UNKNOWN_JUDGMENT_FAILURE';
  const component = availability.failedComponents[0] ?? 'unknown';
  const errorLine = availability.errorMessage
    ? `Error: ${availability.errorMessage}`
    : '';
  return [
    '',
    'STRUCTURED COINET JUDGMENT: UNAVAILABLE',
    'The judgment engine did not produce a usable structured judgment for this request.',
    `Reason: ${reason}`,
    `Failed component: ${component}`,
    errorLine,
    'Do not claim Coinet has a structured thesis, confidence, contradiction, scenario, or timing read.',
    'If answering, clearly disclose that this is not a governed Coinet judgment.',
    '',
  ]
    .filter((line) => line !== '' || true) // keep blank framers; filter only collapses empty error line below
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === '')) // no double blank lines
    .join('\n');
}

/**
 * AI-context block to prepend to the prompt when structured judgment is
 * DEGRADED. Per Plan 2.1 §3.2 the AI must disclose the degradation and must
 * not overstate confidence.
 */
export function buildDegradedJudgmentNoticeForAI(
  availability: JudgmentAvailabilityResult,
): string {
  const reason = availability.degradedReasons[0] ?? 'PARTIAL_CONTEXT_FAILURE';
  const component = availability.degradedComponents[0] ?? 'unknown';
  return [
    '',
    'STRUCTURED COINET JUDGMENT: DEGRADED',
    'Coinet produced a structured judgment, but part of the context is degraded.',
    `Reason: ${reason}`,
    `Degraded component: ${component}`,
    'Disclose the limitation.',
    'Do not overstate confidence.',
    '',
  ].join('\n');
}

function extractErrorMessage(error: unknown): string | undefined {
  if (error === undefined) return undefined;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
