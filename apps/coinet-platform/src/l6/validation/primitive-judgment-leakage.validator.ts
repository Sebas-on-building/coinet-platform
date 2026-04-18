/**
 * L6.2 — Judgment Leakage Validator
 *
 * §6.2.7.1 / §6.2.7.3 — A primitive may SUPPORT later judgment but may never
 * contain judgment. This validator inspects name, description, transformation
 * class, severity labels, and composite/downstream declarations for forbidden
 * later-layer semantics.
 */

import {
  L6PrimitiveValidationResult,
  L6PrimitiveViolation,
  L6PrimitiveViolationCode,
  fail,
  ok,
  violation,
} from './validation-result';
import { checkForbiddenSemantics } from '../contracts/l6-boundary';

const FORBIDDEN_DESCRIPTION_PATTERNS: readonly RegExp[] = [
  /buy[_\s]?signal/i,
  /sell[_\s]?signal/i,
  /bullish[_\s]?confirmation/i,
  /bearish[_\s]?confirmation/i,
  /strong[_\s]?thesis/i,
  /thesis[_\s]?confirmed/i,
  /\brecommendation\b/i,
  /\b(trade|entry|exit)[_\s]+decision\b/i,
  /\bhigh[_\s]?conviction\b/i,
  /\bshould[_\s]+(buy|sell|hold|avoid|enter|exit)\b/i,
  /\bbest[_\s]+(asset|trade|opportunity)\b/i,
  /final[_\s]+outlook/i,
  /final[_\s]+judgment/i,
  /investment[_\s]+implication/i,
];

const FORBIDDEN_SEVERITY_LABEL_PATTERNS: readonly RegExp[] = [
  /^buy$/i,
  /^sell$/i,
  /^strong[_\s]?buy$/i,
  /^strong[_\s]?sell$/i,
  /conviction/i,
  /bullish/i,
  /bearish/i,
];

const FORBIDDEN_TRANSFORMATION_TOKENS: readonly string[] = [
  'THESIS_RESOLUTION',
  'RECOMMENDATION_EMIT',
  'FINAL_JUDGMENT',
  'OPINION_BLEND',
  'CONVICTION_SCORE',
];

export interface JudgmentLeakageInspectable {
  readonly name: string;
  readonly description?: string;
  readonly transformationToken?: string;
  readonly severityLabels?: readonly string[];
  readonly downstreamConsumers?: readonly string[];
}

export function validateJudgmentLeakage(
  input: JudgmentLeakageInspectable,
): L6PrimitiveValidationResult {
  const v: L6PrimitiveViolation[] = [];

  const nameCheck = checkForbiddenSemantics(input.name);
  if (nameCheck.forbidden) {
    v.push(violation(
      L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_NAME,
      'name',
      `Primitive name "${input.name}" contains forbidden judgment semantics.`,
      { matched: nameCheck.matchedPattern },
    ));
  }

  if (input.description) {
    for (const p of FORBIDDEN_DESCRIPTION_PATTERNS) {
      if (p.test(input.description)) {
        v.push(violation(
          L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_DESCRIPTION,
          'description',
          `Primitive description contains forbidden later-layer semantics.`,
          { matched: p.source, description: input.description },
        ));
        break;
      }
    }
  }

  if (input.transformationToken) {
    const upper = input.transformationToken.toUpperCase();
    for (const token of FORBIDDEN_TRANSFORMATION_TOKENS) {
      if (upper.includes(token)) {
        v.push(violation(
          L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_TRANSFORM,
          'transformation_class',
          `Transformation class "${input.transformationToken}" implies later-layer judgment.`,
          { matched: token },
        ));
        break;
      }
    }
  }

  if (input.severityLabels) {
    for (const lbl of input.severityLabels) {
      for (const p of FORBIDDEN_SEVERITY_LABEL_PATTERNS) {
        if (p.test(lbl)) {
          v.push(violation(
            L6PrimitiveViolationCode.JUDGMENT_LEAKAGE_IN_SEVERITY,
            'severity_spec.allowedLevels',
            `Severity label "${lbl}" carries judgment semantics.`,
            { matched: p.source },
          ));
          break;
        }
      }
    }
  }

  return v.length === 0 ? ok() : fail(v);
}

export function getForbiddenDescriptionPatterns(): readonly RegExp[] {
  return FORBIDDEN_DESCRIPTION_PATTERNS;
}

export function getForbiddenSeverityLabelPatterns(): readonly RegExp[] {
  return FORBIDDEN_SEVERITY_LABEL_PATTERNS;
}

export function getForbiddenTransformationTokens(): readonly string[] {
  return FORBIDDEN_TRANSFORMATION_TOKENS;
}
