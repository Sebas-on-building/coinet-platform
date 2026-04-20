/**
 * L10.3 — Contract-tier semantic leak patterns
 *
 * §10.3.5.4 / §10.3.5.6 — Mirrors the L10.2 object-tier leak regex set
 * but maps to L10.3 `L10C_` codes so contract audit records stay
 * disjoint from object-tier records. We keep the regex set colocated
 * with L10.2 patterns so constitutional doctrine changes flow through
 * one vocabulary.
 */

import { L10HypothesisContractViolationCode } from './l10-contract-violation-codes';

export interface L10ContractLeakPattern {
  readonly regex: RegExp;
  readonly code: L10HypothesisContractViolationCode;
  readonly label: string;
}

export const L10_CONTRACT_LEAK_PATTERNS: readonly L10ContractLeakPattern[] = [
  {
    regex: /\b(final\s*judgment|judgment|verdict\s*is|ruling|decided)\b/i,
    code: L10HypothesisContractViolationCode.OUTPUT_JUDGMENT_LEAK,
    label: 'judgment',
  },
  {
    regex: /\b(recommend|recommendation|buy|sell|short|long|accumulate)\b/i,
    code: L10HypothesisContractViolationCode.OUTPUT_RECOMMENDATION_LEAK,
    label: 'recommendation',
  },
  {
    regex: /\b(final\s*scenario|scenario\s*locked|scenario\s*confirmed|outcome\s*set)\b/i,
    code: L10HypothesisContractViolationCode.OUTPUT_SCENARIO_FINALITY_LEAK,
    label: 'scenario-finality',
  },
  {
    regex: /\b(certain|certainty|guaranteed|proven|definitive|no\s*doubt)\b/i,
    code: L10HypothesisContractViolationCode.OUTPUT_FAKE_CERTAINTY_LEAK,
    label: 'fake-certainty',
  },
  {
    regex: /\b(caused\s*by|because\s*of|proves\s*cause|causal\s*proof)\b/i,
    code: L10HypothesisContractViolationCode.OUTPUT_CAUSAL_PROOF_LEAK,
    label: 'causal-proof',
  },
];

function splitCamelCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

export function checkL10ContractLeak(text: string): {
  readonly leaks: boolean;
  readonly code?: L10HypothesisContractViolationCode;
  readonly label?: string;
} {
  if (!text) return { leaks: false };
  const normalized = splitCamelCase(text);
  for (const p of L10_CONTRACT_LEAK_PATTERNS) {
    if (p.regex.test(normalized)) {
      return { leaks: true, code: p.code, label: p.label };
    }
  }
  return { leaks: false };
}
