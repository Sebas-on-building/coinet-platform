/**
 * L13.7 — Score Explanation Output Validator
 *
 * §13.7.16.3 — Score explanations must include attribution and
 * may not become recommendations.
 */

import {
  L13_SCORE_AS_RECOMMENDATION_PATTERNS,
  type L13ScoreExplanationOutput,
} from '../contracts/score-explanation-output';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

export function validateL13ScoreExplanationOutput(
  score: L13ScoreExplanationOutput,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!score.score_explanation_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'score_explanation_id missing',
    });
  }
  if (!score.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (score.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }
  if (
    score.top_positive_driver_lines.length === 0 &&
    score.top_negative_driver_lines.length === 0
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_SCORE_EXPLANATION_WITHOUT_ATTRIBUTION,
      severity: SEV.CRITICAL,
      message:
        'score explanation must include at least one positive or negative driver line',
    });
  }
  const corpus = [
    score.score_meaning_line,
    score.score_interpretation_line,
    ...score.top_positive_driver_lines,
    ...score.top_negative_driver_lines,
    ...score.cap_penalty_lines,
    ...score.missing_data_lines,
    ...score.drift_lines,
    score.restriction_line,
  ].join(' ');
  for (const pattern of L13_SCORE_AS_RECOMMENDATION_PATTERNS) {
    if (pattern.test(corpus)) {
      issues.push({
        code: L13ModeViolationCode.L13M_SCORE_EXPLANATION_RECOMMENDATION_LEAK,
        severity: SEV.CRITICAL,
        message: `score-as-recommendation leak (pattern: ${pattern.source})`,
      });
      break;
    }
  }
  if (score.score_as_recommendation_detected !== false) {
    issues.push({
      code: L13ModeViolationCode.L13M_SCORE_EXPLANATION_RECOMMENDATION_LEAK,
      severity: SEV.CRITICAL,
      message: 'score_as_recommendation_detected must be false',
    });
  }
  return l13ModeResult(issues);
}
