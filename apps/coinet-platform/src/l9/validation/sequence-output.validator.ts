/**
 * L9.2 — Sequence Output Validator
 *
 * §9.2.10.2 + §9.2.8 — Checks that an emitted L9 object declares a
 * registered output class, carries required lineage / evidence /
 * restriction references, and does not leak forbidden semantics
 * (scenario, judgment, score, recommendation, hypothesis, action-bias).
 */

import {
  L9SequenceOutputClass,
  L9SequenceObjectViolationCode,
} from '../contracts/sequence-output-class';
import {
  L9SequenceOutputClassRegistry,
  getDefaultL9SequenceOutputClassRegistry,
} from '../registry/sequence-output-class.registry';
import { getL9ForbiddenNamePatterns } from '../contracts/l9-boundary';

export interface L9OutputValidationIssue {
  readonly code: L9SequenceObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L9OutputValidationReport {
  readonly valid: boolean;
  readonly issues: readonly L9OutputValidationIssue[];
}

export interface L9OutputValidationInput {
  readonly outputClass: L9SequenceOutputClass | string;
  readonly outputName: string;
  readonly outputDescription: string;
  readonly evidence_pack_ref: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly restriction_profile_ref: string | null;
}

/**
 * §9.1.6.1 — Forbidden semantic pattern categories for object-layer
 * outputs. Mirrors the L9.1 boundary regex categories but emits
 * object-level codes so the object audit log remains distinct.
 */
const L9_OUTPUT_SEMANTIC_PATTERNS: readonly {
  readonly code: L9SequenceObjectViolationCode;
  readonly patterns: readonly RegExp[];
  readonly reason: string;
}[] = [
  {
    code: L9SequenceObjectViolationCode.OUTPUT_JUDGMENT_LEAK,
    patterns: [/\bjudgment\b/i, /\bverdict\b/i, /\badjudicat/i],
    reason: 'Judgment semantics are forbidden in L9 output names/descriptions',
  },
  {
    code: L9SequenceObjectViolationCode.OUTPUT_SCENARIO_LEAK,
    patterns: [/\bscenario\b/i, /\bscenarios\b/i, /\bwhat-if\b/i, /\bwhatif\b/i],
    reason: 'Scenario semantics are forbidden in L9 outputs',
  },
  {
    code: L9SequenceObjectViolationCode.OUTPUT_SCORE_LEAK,
    patterns: [/\bfinal[_\- ]?score\b/i, /\bomniscore\b/i, /\boverall[_\- ]?score\b/i],
    reason: 'Final scoring semantics are forbidden in L9 outputs',
  },
  {
    code: L9SequenceObjectViolationCode.OUTPUT_RECOMMENDATION_LEAK,
    patterns: [/\brecommend/i, /\bbuy\b/i, /\bsell\b/i, /\blong\b/i, /\bshort\b/i, /\btarget\b/i],
    reason: 'Recommendation / trade-direction language is forbidden in L9 outputs',
  },
  {
    code: L9SequenceObjectViolationCode.OUTPUT_HYPOTHESIS_LEAK,
    patterns: [/\bhypothesis\b/i, /\bhypotheses\b/i, /\bcandidate[_\- ]?scenario\b/i],
    reason: 'Hypothesis / scenario-engine semantics are forbidden in L9 outputs',
  },
  {
    code: L9SequenceObjectViolationCode.OUTPUT_ACTION_BIAS_LEAK,
    patterns: [/\bactionable\b/i, /\bentry\b/i, /\bexit\b/i, /\btrigger\b/i],
    reason: 'Action-bias language is forbidden in L9 sequence labels/outputs',
  },
];

function checkSemanticLeak(name: string, description: string):
  L9OutputValidationIssue[] {
  const issues: L9OutputValidationIssue[] = [];
  const haystack = `${name} ${description}`;
  for (const { code, patterns, reason } of L9_OUTPUT_SEMANTIC_PATTERNS) {
    if (patterns.some(rx => rx.test(haystack))) {
      issues.push({
        code,
        message: reason,
        details: { name, description },
      });
    }
  }
  // Cross-check against L9.1 forbidden name patterns for broader coverage.
  const extra = getL9ForbiddenNamePatterns();
  for (const rx of extra) {
    if (rx.test(haystack)) {
      // Promote to judgment-leak by default; specific cases already
      // caught above will have fired first.
      const alreadyCovered = issues.length > 0;
      if (!alreadyCovered) {
        issues.push({
          code: L9SequenceObjectViolationCode.OUTPUT_JUDGMENT_LEAK,
          message: `Forbidden L9 constitutional name pattern ${rx} matched`,
          details: { name, description },
        });
      }
    }
  }
  return issues;
}

export function validateL9SequenceOutput(
  input: L9OutputValidationInput,
  registry: L9SequenceOutputClassRegistry = getDefaultL9SequenceOutputClassRegistry(),
): L9OutputValidationReport {
  const issues: L9OutputValidationIssue[] = [];

  if (!registry.isRegistered(input.outputClass as string)) {
    issues.push({
      code: L9SequenceObjectViolationCode.OUTPUT_UNREGISTERED_CLASS,
      message: `Output class ${input.outputClass} is not registered`,
    });
    return { valid: false, issues };
  }
  const cls = input.outputClass as L9SequenceOutputClass;

  if (registry.requiresEvidence(cls) && !input.evidence_pack_ref) {
    issues.push({
      code: L9SequenceObjectViolationCode.OUTPUT_MISSING_EVIDENCE,
      message: `Output class ${cls} requires evidence_pack_ref`,
    });
  }
  if (registry.requiresLineage(cls)) {
    if (!input.lineage_refs || input.lineage_refs.length === 0) {
      issues.push({
        code: L9SequenceObjectViolationCode.OUTPUT_MISSING_LINEAGE,
        message: `Output class ${cls} requires non-empty lineage_refs`,
      });
    }
  }
  if (registry.requiresReplayHash(cls) && !input.replay_hash) {
    issues.push({
      code: L9SequenceObjectViolationCode.OUTPUT_MISSING_LINEAGE,
      message: `Output class ${cls} requires replay_hash`,
    });
  }
  if (registry.requiresRestrictionProfile(cls) && !input.restriction_profile_ref) {
    issues.push({
      code: L9SequenceObjectViolationCode.OUTPUT_MISSING_RESTRICTION,
      message: `Output class ${cls} requires a restriction_profile_ref`,
    });
  }

  for (const i of checkSemanticLeak(input.outputName, input.outputDescription)) {
    issues.push(i);
  }

  return { valid: issues.length === 0, issues };
}
