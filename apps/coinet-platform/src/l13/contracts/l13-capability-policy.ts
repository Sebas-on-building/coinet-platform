/**
 * L13.1 — Capability Policy Contract
 *
 * §13.1.4 / §13.1.9 — Machine-readable capability policy map for each
 * allowed L13 capability against each capability context. The policy
 * is the source of truth for whether L13 may exercise a given
 * capability in a given context.
 *
 * Adversarial user contexts (USER_REQUESTS_ADVICE,
 * USER_REQUESTS_CERTAINTY, USER_REQUESTS_BULLISH_BEARISH_ONLY) are
 * always DENIED for decision-class capabilities; only refusal,
 * contradiction/uncertainty disclosure, and conditional explanation
 * are conditionally allowed.
 */

import {
  ALL_L13_ALLOWED_CAPABILITIES,
  ALL_L13_CAPABILITY_CONTEXTS,
  L13AllowedCapability,
  L13CapabilityContext,
  L13CapabilityDecision,
  L13CapabilityGroup,
} from './l13-constitutional-types';

export interface L13CapabilityPolicyEntry {
  readonly capability: L13AllowedCapability;
  readonly group: L13CapabilityGroup;
  readonly description: string;
  readonly decisions: Record<L13CapabilityContext, L13CapabilityDecision>;
}

function allDenied(): Record<L13CapabilityContext, L13CapabilityDecision> {
  const base = {} as Record<L13CapabilityContext, L13CapabilityDecision>;
  for (const ctx of ALL_L13_CAPABILITY_CONTEXTS) {
    base[ctx] = L13CapabilityDecision.DENIED;
  }
  return base;
}

function decisions(
  partial: Partial<
    Record<L13CapabilityContext, L13CapabilityDecision>
  >,
): Record<L13CapabilityContext, L13CapabilityDecision> {
  return { ...allDenied(), ...partial };
}

export const L13_CAPABILITY_POLICY:
  readonly L13CapabilityPolicyEntry[] = [
  // ── EXPLANATION ──
  {
    capability: L13AllowedCapability.EXPLAIN_ENGINE_STATE,
    group: L13CapabilityGroup.EXPLANATION,
    description: 'Explain governed engine state in plain language',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
      SCORE_EXPLANATION: L13CapabilityDecision.ALLOWED,
      CONTRADICTION_EXPLANATION: L13CapabilityDecision.ALLOWED,
      DEBUG_EXPLANATION: L13CapabilityDecision.ALLOWED,
      ALERT_GENERATION: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
      ASSET_COMPARISON: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
      THESIS_COMPARISON: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
      USER_REQUESTS_BULLISH_BEARISH_ONLY:
        L13CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.SUMMARIZE_MARKET_STATE,
    group: L13CapabilityGroup.EXPLANATION,
    description: 'Summarize market state from governed L8/L9/L11/L12 surfaces',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
      ALERT_GENERATION: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.EXPLAIN_SCENARIOS,
    group: L13CapabilityGroup.EXPLANATION,
    description: 'Explain scenario set with triggers and invalidations',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
      ALERT_GENERATION: L13CapabilityDecision.ALLOWED,
      ASSET_COMPARISON: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
      THESIS_COMPARISON: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
      USER_REQUESTS_BULLISH_BEARISH_ONLY:
        L13CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.EXPLAIN_SCORES,
    group: L13CapabilityGroup.EXPLANATION,
    description: 'Explain L11 scores using attribution',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      SCORE_EXPLANATION: L13CapabilityDecision.ALLOWED,
      ASSET_COMPARISON: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.EXPLAIN_HYPOTHESES,
    group: L13CapabilityGroup.EXPLANATION,
    description: 'Explain L10 hypotheses, primary/secondary, spread',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
      THESIS_COMPARISON: L13CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.EXPLAIN_REGIME,
    group: L13CapabilityGroup.EXPLANATION,
    description: 'Explain L8 regime state and transition risk',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.EXPLAIN_SEQUENCE,
    group: L13CapabilityGroup.EXPLANATION,
    description: 'Explain L9 sequence phase and decay posture',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
    }),
  },

  // ── QUESTION_ANSWERING ──
  {
    capability: L13AllowedCapability.ANSWER_USER_QUESTION,
    group: L13CapabilityGroup.QUESTION_ANSWERING,
    description: 'Answer a user question against governed surfaces',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      DEBUG_EXPLANATION: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_ADVICE: L13CapabilityDecision.DENIED,
      USER_REQUESTS_CERTAINTY: L13CapabilityDecision.DENIED,
      USER_REQUESTS_BULLISH_BEARISH_ONLY:
        L13CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },

  // ── ALERTING ──
  {
    capability: L13AllowedCapability.WRITE_ALERT_TEXT,
    group: L13CapabilityGroup.ALERTING,
    description: 'Write alert text bound to governed trigger / invalidation / score / scenario change',
    decisions: decisions({
      ALERT_GENERATION: L13CapabilityDecision.ALLOWED,
    }),
  },

  // ── REPORTING ──
  {
    capability: L13AllowedCapability.WRITE_STRUCTURED_REPORT,
    group: L13CapabilityGroup.REPORTING,
    description: 'Compose multi-section governed report',
    decisions: decisions({
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      DEBUG_EXPLANATION: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },

  // ── COMPARISON ──
  {
    capability: L13AllowedCapability.COMPARE_ASSETS,
    group: L13CapabilityGroup.COMPARISON,
    description: 'Compare governed input packages of two assets',
    decisions: decisions({
      ASSET_COMPARISON: L13CapabilityDecision.ALLOWED,
      CHAT_ANSWER: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.COMPARE_THESES,
    group: L13CapabilityGroup.COMPARISON,
    description: 'Compare governed theses for the same subject',
    decisions: decisions({
      THESIS_COMPARISON: L13CapabilityDecision.ALLOWED,
      CHAT_ANSWER: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },

  // ── DISCLOSURE ──
  {
    capability: L13AllowedCapability.DISCLOSE_CONTRADICTION,
    group: L13CapabilityGroup.DISCLOSURE,
    description: 'Disclose any present L7 contradiction or L10 invalidation',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      ALERT_GENERATION: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      ASSET_COMPARISON: L13CapabilityDecision.ALLOWED,
      THESIS_COMPARISON: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
      SCORE_EXPLANATION: L13CapabilityDecision.ALLOWED,
      CONTRADICTION_EXPLANATION: L13CapabilityDecision.ALLOWED,
      DEBUG_EXPLANATION: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_ADVICE: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_CERTAINTY: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_BULLISH_BEARISH_ONLY: L13CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.DISCLOSE_UNCERTAINTY,
    group: L13CapabilityGroup.DISCLOSURE,
    description: 'Disclose narrow spread / capped confidence / drift / missing data',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      ALERT_GENERATION: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      ASSET_COMPARISON: L13CapabilityDecision.ALLOWED,
      THESIS_COMPARISON: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
      SCORE_EXPLANATION: L13CapabilityDecision.ALLOWED,
      CONTRADICTION_EXPLANATION: L13CapabilityDecision.ALLOWED,
      DEBUG_EXPLANATION: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_ADVICE: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_CERTAINTY: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_BULLISH_BEARISH_ONLY: L13CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.CITE_EVIDENCE_REFS,
    group: L13CapabilityGroup.DISCLOSURE,
    description: 'Cite governed evidence refs from L7/L10/L11/L12',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      ALERT_GENERATION: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      ASSET_COMPARISON: L13CapabilityDecision.ALLOWED,
      THESIS_COMPARISON: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
      SCORE_EXPLANATION: L13CapabilityDecision.ALLOWED,
      CONTRADICTION_EXPLANATION: L13CapabilityDecision.ALLOWED,
      DEBUG_EXPLANATION: L13CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L13AllowedCapability.RESPECT_RESTRICTIONS,
    group: L13CapabilityGroup.DISCLOSURE,
    description: 'Honour every lower-layer restriction profile',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      ALERT_GENERATION: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      ASSET_COMPARISON: L13CapabilityDecision.ALLOWED,
      THESIS_COMPARISON: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
      SCORE_EXPLANATION: L13CapabilityDecision.ALLOWED,
      CONTRADICTION_EXPLANATION: L13CapabilityDecision.ALLOWED,
      DEBUG_EXPLANATION: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_ADVICE: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_CERTAINTY: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_BULLISH_BEARISH_ONLY: L13CapabilityDecision.ALLOWED,
    }),
  },

  // ── STYLE_CONTROL ──
  {
    capability: L13AllowedCapability.ADAPT_TONE_AND_LANGUAGE,
    group: L13CapabilityGroup.STYLE_CONTROL,
    description: 'Adapt tone and language without altering grounded content',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      ALERT_GENERATION: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      ASSET_COMPARISON: L13CapabilityDecision.ALLOWED,
      THESIS_COMPARISON: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
      SCORE_EXPLANATION: L13CapabilityDecision.ALLOWED,
      CONTRADICTION_EXPLANATION: L13CapabilityDecision.ALLOWED,
    }),
  },

  // ── REFUSAL_AND_BOUNDARY ──
  {
    capability: L13AllowedCapability.REFUSE_UNSUPPORTED_CONCLUSION,
    group: L13CapabilityGroup.REFUSAL_AND_BOUNDARY,
    description: 'Refuse a conclusion not supported by the governed input package',
    decisions: decisions({
      CHAT_ANSWER: L13CapabilityDecision.ALLOWED,
      ALERT_GENERATION: L13CapabilityDecision.ALLOWED,
      REPORT_GENERATION: L13CapabilityDecision.ALLOWED,
      ASSET_COMPARISON: L13CapabilityDecision.ALLOWED,
      THESIS_COMPARISON: L13CapabilityDecision.ALLOWED,
      SCENARIO_EXPLANATION: L13CapabilityDecision.ALLOWED,
      SCORE_EXPLANATION: L13CapabilityDecision.ALLOWED,
      CONTRADICTION_EXPLANATION: L13CapabilityDecision.ALLOWED,
      DEBUG_EXPLANATION: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_ADVICE: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_CERTAINTY: L13CapabilityDecision.ALLOWED,
      USER_REQUESTS_BULLISH_BEARISH_ONLY: L13CapabilityDecision.ALLOWED,
    }),
  },
];

export function getL13CapabilityDecision(
  capability: L13AllowedCapability,
  context: L13CapabilityContext,
): L13CapabilityDecision {
  const entry = L13_CAPABILITY_POLICY.find(e => e.capability === capability);
  if (!entry) return L13CapabilityDecision.DENIED;
  return entry.decisions[context];
}

export function isL13CapabilityAllowed(
  capability: L13AllowedCapability,
  context: L13CapabilityContext,
): boolean {
  const d = getL13CapabilityDecision(capability, context);
  return (
    d === L13CapabilityDecision.ALLOWED ||
    d === L13CapabilityDecision.CONDITIONALLY_ALLOWED
  );
}

export function getL13DeniedCapabilities(
  context: L13CapabilityContext,
): readonly L13AllowedCapability[] {
  return L13_CAPABILITY_POLICY
    .filter(e => e.decisions[context] === L13CapabilityDecision.DENIED)
    .map(e => e.capability);
}

export function getL13CapabilitiesForGroup(
  group: L13CapabilityGroup,
): readonly L13AllowedCapability[] {
  return L13_CAPABILITY_POLICY
    .filter(e => e.group === group)
    .map(e => e.capability);
}

export function getAllL13CapabilityGroups():
  readonly L13CapabilityGroup[] {
  const set = new Set<L13CapabilityGroup>();
  for (const e of L13_CAPABILITY_POLICY) set.add(e.group);
  return [...set];
}

void ALL_L13_ALLOWED_CAPABILITIES;
