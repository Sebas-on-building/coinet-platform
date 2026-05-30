/**
 * L13.8 — Verbosity Controller
 *
 * §13.8.7 / §13.8.10 — Resolves verbosity from intent + product
 * answer mode + user request, then applies the disclosure floor
 * so brevity never erases required truth.
 */

import { L13ProductAnswerMode } from '../contracts/product-answer-mode';
import { L13UserIntentClass } from '../contracts/user-intent-binding';
import {
  L13VerbosityLevel,
  L13VerbosityReasonCode,
  l13MaxVerbosity,
  l13RankVerbosity,
  type L13VerbosityResolutionProfile,
} from '../contracts/verbosity-profile';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.style.v1';

const VERBOSITY_BY_MODE:
  Readonly<Record<L13ProductAnswerMode, L13VerbosityLevel>> = {
  [L13ProductAnswerMode.SHORT_CHAT]: L13VerbosityLevel.SHORT,
  [L13ProductAnswerMode.STANDARD_CHAT]: L13VerbosityLevel.MEDIUM,
  [L13ProductAnswerMode.DEEP_ANALYSIS]: L13VerbosityLevel.DEEP,
  [L13ProductAnswerMode.ALERT]: L13VerbosityLevel.MICRO,
  [L13ProductAnswerMode.STRUCTURED_REPORT]: L13VerbosityLevel.REPORT,
  [L13ProductAnswerMode.ASSET_COMPARISON]: L13VerbosityLevel.MEDIUM,
  [L13ProductAnswerMode.THESIS_COMPARISON]: L13VerbosityLevel.MEDIUM,
  [L13ProductAnswerMode.SCENARIO_EXPLANATION]: L13VerbosityLevel.MEDIUM,
  [L13ProductAnswerMode.SCORE_EXPLANATION]: L13VerbosityLevel.SHORT,
  [L13ProductAnswerMode.CONTRADICTION_EXPLANATION]:
    L13VerbosityLevel.MEDIUM,
  [L13ProductAnswerMode.DEBUG_EXPLANATION]: L13VerbosityLevel.DEEP,
};

export interface L13VerbosityControllerInput {
  readonly intent_class: L13UserIntentClass;
  readonly product_answer_mode: L13ProductAnswerMode;
  readonly requested_verbosity?: L13VerbosityLevel;
  readonly deep_mode_explicitly_requested?: boolean;
  readonly report_mode_explicitly_requested?: boolean;
  readonly must_disclose_uncertainty: boolean;
  readonly must_disclose_contradiction: boolean;
  readonly must_disclose_trigger_or_invalidation: boolean;
  readonly must_disclose_restriction: boolean;
  readonly comparison_asymmetry_present?: boolean;
}

function lengthEnvelope(
  level: L13VerbosityLevel,
): {
  readonly preferred_max_sentences: number;
  readonly preferred_max_paragraphs: number;
  readonly preferred_max_bullets: number;
  readonly preferred_max_words: number;
  readonly hard_max_words: number;
} {
  switch (level) {
    case L13VerbosityLevel.MICRO:
      return {
        preferred_max_sentences: 2,
        preferred_max_paragraphs: 1,
        preferred_max_bullets: 0,
        preferred_max_words: 60,
        hard_max_words: 90,
      };
    case L13VerbosityLevel.SHORT:
      return {
        preferred_max_sentences: 5,
        preferred_max_paragraphs: 2,
        preferred_max_bullets: 3,
        preferred_max_words: 150,
        hard_max_words: 240,
      };
    case L13VerbosityLevel.MEDIUM:
      return {
        preferred_max_sentences: 10,
        preferred_max_paragraphs: 3,
        preferred_max_bullets: 6,
        preferred_max_words: 350,
        hard_max_words: 600,
      };
    case L13VerbosityLevel.DEEP:
      return {
        preferred_max_sentences: 20,
        preferred_max_paragraphs: 6,
        preferred_max_bullets: 12,
        preferred_max_words: 800,
        hard_max_words: 1400,
      };
    case L13VerbosityLevel.REPORT:
    default:
      return {
        preferred_max_sentences: 80,
        preferred_max_paragraphs: 20,
        preferred_max_bullets: 50,
        preferred_max_words: 2200,
        hard_max_words: 4000,
      };
  }
}

/**
 * §13.8.10 — Disclosure-floor verbosity. The product mode's
 * default may be raised when active disclosure obligations
 * cannot fit at the default level. Floor reflects the spec
 * recommendation: ALERT/MICRO → SHORT when disclosures pile up.
 */
function deriveDisclosureFloor(
  args: L13VerbosityControllerInput,
): { readonly floor: L13VerbosityLevel; readonly reasons: readonly L13VerbosityReasonCode[] } {
  const reasons: L13VerbosityReasonCode[] = [];
  let floor: L13VerbosityLevel = L13VerbosityLevel.MICRO;
  if (args.must_disclose_uncertainty) {
    floor = l13MaxVerbosity(floor, L13VerbosityLevel.SHORT);
    reasons.push(L13VerbosityReasonCode.DISCLOSURE_FLOOR_UNCERTAINTY);
  }
  if (args.must_disclose_contradiction) {
    floor = l13MaxVerbosity(floor, L13VerbosityLevel.SHORT);
    reasons.push(L13VerbosityReasonCode.DISCLOSURE_FLOOR_CONTRADICTION);
  }
  if (args.must_disclose_trigger_or_invalidation) {
    floor = l13MaxVerbosity(floor, L13VerbosityLevel.SHORT);
    reasons.push(
      L13VerbosityReasonCode.DISCLOSURE_FLOOR_TRIGGER_INVALIDATION,
    );
  }
  if (args.must_disclose_restriction) {
    floor = l13MaxVerbosity(floor, L13VerbosityLevel.SHORT);
    reasons.push(L13VerbosityReasonCode.DISCLOSURE_FLOOR_RESTRICTION);
  }
  if (args.comparison_asymmetry_present) {
    floor = l13MaxVerbosity(floor, L13VerbosityLevel.MEDIUM);
    reasons.push(
      L13VerbosityReasonCode.COMPARISON_REQUIRES_PARITY_DISCLOSURE,
    );
  }
  return { floor, reasons };
}

/**
 * §13.8.7 — Resolve verbosity. Pure function.
 */
export function resolveL13Verbosity(
  input: L13VerbosityControllerInput,
): L13VerbosityResolutionProfile {
  const defaultVerbosity = VERBOSITY_BY_MODE[input.product_answer_mode];
  const reasons: L13VerbosityReasonCode[] = [];
  if (defaultVerbosity === L13VerbosityLevel.SHORT) {
    reasons.push(L13VerbosityReasonCode.DEFAULT_SHORT_CHAT);
  } else if (defaultVerbosity === L13VerbosityLevel.MEDIUM) {
    reasons.push(L13VerbosityReasonCode.DEFAULT_STANDARD_CHAT);
  } else if (defaultVerbosity === L13VerbosityLevel.MICRO) {
    reasons.push(L13VerbosityReasonCode.ALERT_MODE_COMPRESSION);
  } else if (defaultVerbosity === L13VerbosityLevel.REPORT) {
    reasons.push(L13VerbosityReasonCode.REPORT_MODE_EXPANSION);
  }
  const userExplicitDeep = !!input.deep_mode_explicitly_requested;
  const userExplicitReport = !!input.report_mode_explicitly_requested;
  if (userExplicitDeep) {
    reasons.push(L13VerbosityReasonCode.USER_REQUESTED_DEEP);
  }
  if (userExplicitReport) {
    reasons.push(L13VerbosityReasonCode.USER_REQUESTED_REPORT);
  }
  const { floor, reasons: floorReasons } = deriveDisclosureFloor(input);
  reasons.push(...floorReasons);

  let resolved: L13VerbosityLevel = defaultVerbosity;
  if (input.requested_verbosity) {
    resolved = input.requested_verbosity;
  }
  if (userExplicitDeep) {
    resolved = l13MaxVerbosity(resolved, L13VerbosityLevel.DEEP);
  }
  if (userExplicitReport) {
    resolved = l13MaxVerbosity(resolved, L13VerbosityLevel.REPORT);
  }
  // Disclosure floor cannot be undercut.
  const beforeFloor = resolved;
  resolved = l13MaxVerbosity(resolved, floor);
  const overridden =
    l13RankVerbosity(resolved) > l13RankVerbosity(beforeFloor);

  const envelope = lengthEnvelope(resolved);

  const replayHash = fnv1a(
    [
      input.intent_class,
      input.product_answer_mode,
      input.requested_verbosity ?? '',
      defaultVerbosity,
      floor,
      resolved,
      reasons.slice().sort().join(','),
      String(envelope.preferred_max_words),
      String(envelope.hard_max_words),
      String(userExplicitDeep),
      String(userExplicitReport),
      String(overridden),
      POLICY_V,
    ].join('|'),
  );

  return {
    verbosity_resolution_id: `l13.verbosity.${replayHash}`,
    requested_verbosity: input.requested_verbosity,
    default_verbosity: defaultVerbosity,
    disclosure_floor_verbosity: floor,
    resolved_verbosity: resolved,
    reason_codes: Array.from(new Set(reasons)),
    preferred_max_sentences: envelope.preferred_max_sentences,
    preferred_max_paragraphs: envelope.preferred_max_paragraphs,
    preferred_max_bullets: envelope.preferred_max_bullets,
    preferred_max_words: envelope.preferred_max_words,
    hard_max_words: envelope.hard_max_words,
    hard_max_words_overridden_by_disclosure_floor: overridden,
    deep_mode_explicitly_requested: userExplicitDeep,
    report_mode_explicitly_requested: userExplicitReport,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

export function l13VerbosityLengthEnvelope(
  level: L13VerbosityLevel,
): ReturnType<typeof lengthEnvelope> {
  return lengthEnvelope(level);
}
