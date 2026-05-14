/**
 * L13.3 — Semantic Leakage Validator
 *
 * §13.3.16 — Scans every textual surface of the AI explanation
 * output (headline, summary, every section, confidence statement,
 * restriction statement, blocked claim text, replacement text) for
 * the leakage families enumerated in §13.3.12.
 */

import type { L13AIExplanationOutput } from '../contracts/ai-output';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13OutputViolationCode } from './l13-output-violation-codes';
import {
  l13OutputResult,
  type L13OutputIssue,
  type L13OutputValidationResult,
} from './_l13-output-issue';
import {
  scanL13SemanticLeakage,
  type L13SemanticLeakHit,
} from './semantic-leakage-scanners';

const SEV = L13ViolationSeverity;

function asIssue(
  hit: L13SemanticLeakHit,
  subject: string,
): L13OutputIssue {
  return {
    code: hit.code,
    severity: SEV.CRITICAL,
    subject_ref: subject,
    message: `[${subject}] ${hit.reason}`,
    details: {
      fragment: hit.fragment,
      blocked_claim_type: hit.blocked_claim_type,
    },
  };
}

interface ScanTarget {
  readonly subject: string;
  readonly text: string;
}

function gather(output: L13AIExplanationOutput): readonly ScanTarget[] {
  const targets: ScanTarget[] = [];
  if (output.headline) targets.push({ subject: 'headline', text: output.headline });
  if (output.summary) targets.push({ subject: 'summary', text: output.summary });

  const sections = [
    output.observation_section,
    output.inference_section,
    output.uncertainty_section,
    output.contradiction_section,
    output.scenario_section,
    output.trigger_invalidation_section,
  ];
  for (const s of sections) {
    if (s && s.present && s.content) {
      targets.push({
        subject: `section:${s.section_class}:${s.section_id}`,
        text: s.content,
      });
    }
  }

  if (output.confidence_disclosure?.confidence_statement) {
    targets.push({
      subject: 'confidence_statement',
      text: output.confidence_disclosure.confidence_statement,
    });
  }
  if (output.restriction_disclosure?.restriction_statement) {
    targets.push({
      subject: 'restriction_statement',
      text: output.restriction_disclosure.restriction_statement,
    });
  }
  for (const claim of output.blocked_claims) {
    if (claim.replacement_text) {
      // Replacement text must itself be legal output text.
      targets.push({
        subject: `blocked_claim_replacement:${claim.blocked_claim_id}`,
        text: claim.replacement_text,
      });
    }
  }
  return targets;
}

/**
 * §13.3.16 — Run leakage scanners across all textual fields.
 */
export function validateL13SemanticLeakage(
  output: L13AIExplanationOutput,
): L13OutputValidationResult {
  const issues: L13OutputIssue[] = [];
  for (const t of gather(output)) {
    const hits = scanL13SemanticLeakage(t.text);
    for (const h of hits) {
      issues.push(asIssue(h, t.subject));
    }
  }
  return l13OutputResult(issues);
}

/**
 * Convenience: every leakage hit that is NOT already accounted for
 * via a recorded blocked-claim is a CRITICAL omission per §13.3.8.
 * Used by the readiness validator to determine whether the output
 * may emit.
 */
export function getL13UnrecordedLeakIssues(
  output: L13AIExplanationOutput,
): readonly L13OutputIssue[] {
  const recordedTexts = new Set<string>(
    output.blocked_claims.map(c => c.proposed_claim_text),
  );
  const issues = validateL13SemanticLeakage(output).issues;
  return issues.filter(i => {
    const fragment = (i.details?.fragment as string | undefined) ?? '';
    return !recordedTexts.has(fragment);
  });
}
