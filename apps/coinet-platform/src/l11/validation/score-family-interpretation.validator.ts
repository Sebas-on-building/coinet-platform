/**
 * L11.2 — Family-Interpretation Validator (§11.2.17)
 *
 * Scans free-form strings (score names, meaning claims, legal
 * interpretations, attribution summaries, downstream-use
 * declarations) for illegal semantic leakage. Family-specific
 * forbidden phrases are encoded so that "high opportunity score
 * means buy" or "low risk score means safe" are rejected.
 */

import { L11ScoreFamily } from '../contracts/score-family';
import {
  L11ScoreDoctrineIssue,
  L11ScoreDoctrineViolationCode,
  makeL11ScoreDoctrineIssue,
} from './l11-score-doctrine-violation-codes';

interface InterpretationRule {
  readonly code: L11ScoreDoctrineViolationCode;
  readonly pattern: RegExp;
  readonly message: string;
}

const GLOBAL_RULES: readonly InterpretationRule[] = [
  {
    code: L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_RECOMMENDATION,
    pattern: /\b(buy now|sell now|long signal|short signal|enter the trade|exit the position|recommend(ed|ation)?|guaranteed buy|guaranteed sell)\b/i,
    message: 'recommendation language detected',
  },
  {
    code: L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_JUDGMENT,
    pattern: /\b(final judgment|final verdict|definitively (good|bad|safe|dangerous)|asset is (good|bad))\b/i,
    message: 'final-judgment language detected',
  },
  {
    code: L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_SCENARIO_WINNER,
    pattern: /\b(scenario winner|winning scenario|chosen scenario|selected scenario)\b/i,
    message: 'scenario-winner selection language detected',
  },
  {
    code: L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_TRADE_ACTION,
    pattern: /\b(execute (the )?trade|place order|trade action|allocate portfolio)\b/i,
    message: 'trade-action language detected',
  },
  {
    code: L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_CERTAINTY,
    pattern: /\b(guaranteed (outcome|return|loss|gain)|certain (to|of)|will definitely)\b/i,
    message: 'certainty language detected',
  },
];

const FAMILY_RULES: Readonly<Record<L11ScoreFamily, readonly InterpretationRule[]>> = {
  [L11ScoreFamily.OPPORTUNITY]: [
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(opportunity\s+score\s+means\s+buy|high\s+opportunity\s+(score\s+)?means\s+buy)\b/i,
      message: 'opportunity score interpreted as buy signal',
    },
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(best\s+opportunity\s+wins|opportunity\s+score\s+selects)\b/i,
      message: 'opportunity score interpreted as scenario selection',
    },
  ],
  [L11ScoreFamily.RISK]: [
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(low\s+risk\s+(score\s+)?means\s+safe|risk\s+score\s+says\s+safe)\b/i,
      message: 'risk score interpreted as safety guarantee',
    },
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(high\s+risk\s+(score\s+)?means\s+(avoid|sell))\b/i,
      message: 'risk score interpreted as avoid/sell instruction',
    },
  ],
  [L11ScoreFamily.TIMING]: [
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(timing\s+score\s+confirms\s+entry|enter\s+now|exact\s+buy\s+zone|perfect\s+entry)\b/i,
      message: 'timing score interpreted as entry instruction',
    },
  ],
  [L11ScoreFamily.THESIS_COHERENCE]: [
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(thesis\s+(is\s+)?(proven|guaranteed)|coherence\s+score\s+proves)\b/i,
      message: 'thesis coherence score interpreted as proof of thesis',
    },
  ],
  [L11ScoreFamily.SIGNAL_CONFIDENCE]: [
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(signal\s+(confidence\s+)?score\s+means\s+(bullish|bearish))\b/i,
      message: 'signal confidence score interpreted as directional bias',
    },
  ],
  [L11ScoreFamily.MARKET_STRUCTURE]: [
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(market\s+structure\s+(score\s+)?means\s+(bullish|safe|guaranteed\s+continuation))\b/i,
      message: 'market structure score interpreted as continuation guarantee',
    },
  ],
  [L11ScoreFamily.WHALE_CONVICTION]: [
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(whales\s+are\s+always\s+right|whale\s+(buys|conviction)\s+guarantees?)\b/i,
      message: 'whale conviction score interpreted as guarantee',
    },
  ],
  [L11ScoreFamily.UNLOCK_RISK]: [
    {
      code: L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
      pattern: /\b(unlock\s+(risk\s+)?(score\s+)?means\s+(guaranteed\s+dump|dump))\b/i,
      message: 'unlock risk score interpreted as guaranteed dump',
    },
  ],
  [L11ScoreFamily.NARRATIVE_QUALITY]: [],
  [L11ScoreFamily.FUNDAMENTAL_SUBSTANCE]: [],
  [L11ScoreFamily.LIQUIDITY_QUALITY]: [],
  [L11ScoreFamily.MANIPULATION_RISK]: [],
  [L11ScoreFamily.ECOSYSTEM_BETA]: [],
  [L11ScoreFamily.CONTINUATION_QUALITY]: [],
  [L11ScoreFamily.REVERSAL_RISK]: [],
};

export interface L11InterpretationScanInput {
  readonly score_family: L11ScoreFamily;
  readonly texts: readonly string[];
  readonly subject_ref?: string;
}

export interface L11InterpretationScanResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreDoctrineIssue[];
}

export function scanL11FamilyInterpretation(
  input: L11InterpretationScanInput,
): L11InterpretationScanResult {
  const issues: L11ScoreDoctrineIssue[] = [];
  const subj = input.subject_ref ?? `interpretation:${input.score_family}`;
  const familyRules = FAMILY_RULES[input.score_family] ?? [];
  const rules: readonly InterpretationRule[] = [...GLOBAL_RULES, ...familyRules];

  for (const text of input.texts) {
    if (!text) continue;
    for (const r of rules) {
      if (r.pattern.test(text)) {
        issues.push(
          makeL11ScoreDoctrineIssue(r.code, `${r.message}: "${truncate(text, 96)}"`, {
            subject_ref: subj,
            score_family: input.score_family,
          }),
        );
      }
    }
  }
  return { ok: issues.length === 0, issues };
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
