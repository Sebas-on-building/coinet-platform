/**
 * L11.4 — Score Attribution Validator (§11.4.15)
 *
 * Top-level validator that aggregates all attribution sub-validators
 * plus identity, governed-input, semantic-leak, and replay checks.
 */

import {
  L11ScoreAttribution,
  L11FormulaEvaluationResult,
  L11ScoreFormulaDefinition,
  L11TopDriverSelectionPolicy,
  extractL11AttributionReplayMaterial,
  canonicalScoreAttributionReplayHash,
  L11_ATTRIBUTION_POLICY_VERSION,
  L11ScoreOutput,
} from '../contracts';
import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionViolationCode,
  makeL11ScoreAttributionIssue,
} from './l11-score-attribution-violation-codes';
import {
  validateL11ComponentContributions,
} from './component-contribution.validator';
import {
  validateL11CapContributions,
  validateL11CapAttributionCoverage,
  validateL11MaterialCapVisibility,
} from './cap-contribution.validator';
import {
  validateL11PenaltyContributions,
  validateL11PenaltyAttributionCoverage,
} from './penalty-contribution.validator';
import {
  validateL11ModifierContributions,
  validateL11ModifierAttributionCoverage,
} from './modifier-contribution.validator';
import {
  validateL11MissingDataContributions,
  validateL11MissingDataCoverage,
  validateL11MaterialMissingDataVisibility,
} from './missing-data-contribution.validator';
import {
  validateL11TopDriverSelection,
} from './top-driver-selection.validator';
import {
  validateL11SummaryCode,
} from './summary-code.validator';
import {
  validateL11AttributionCompleteness,
} from './attribution-completeness.validator';

export interface L11ScoreAttributionValidationResult {
  readonly ok: boolean;
  readonly issues: readonly L11ScoreAttributionIssue[];
}

const FORBIDDEN_LEAK_PHRASES: readonly { rx: RegExp; code: L11ScoreAttributionViolationCode }[] = [
  { rx: /\b(buy|sell|long|short|enter|exit|ape)\b/i, code: L11ScoreAttributionViolationCode.L11A_ATTRIBUTION_ACTS_AS_RECOMMENDATION },
  { rx: /\b(safest|best trade|guaranteed|certain|definitely|never|always)\b/i, code: L11ScoreAttributionViolationCode.L11A_ATTRIBUTION_ACTS_AS_JUDGMENT },
  { rx: /\b(scenario\s+winner|winning scenario|the winner is)\b/i, code: L11ScoreAttributionViolationCode.L11A_ATTRIBUTION_ACTS_AS_SCENARIO_WINNER },
  { rx: /\b(trade now|execute trade|place order|trade action)\b/i, code: L11ScoreAttributionViolationCode.L11A_ATTRIBUTION_ACTS_AS_TRADE_ACTION },
];

const GOVERNED_REF_PREFIXES: readonly string[] = [
  'l11a.', 'l11d.', 'l11.', 'l10.', 'l9.', 'l8.', 'l7.', 'l6.', 'l5.', 'l4.', 'l3.',
];

function isGovernedRef(ref: string): boolean {
  if (!ref) return false;
  const lower = ref.toLowerCase();
  return GOVERNED_REF_PREFIXES.some(p => lower.startsWith(p));
}

export interface ValidateScoreAttributionArgs {
  readonly attribution: L11ScoreAttribution;
  readonly evaluation: L11FormulaEvaluationResult;
  readonly formula: L11ScoreFormulaDefinition;
  readonly score?: L11ScoreOutput;
  readonly top_driver_policy?: L11TopDriverSelectionPolicy;
}

export function validateL11ScoreAttribution(
  args: ValidateScoreAttributionArgs,
): L11ScoreAttributionValidationResult {
  const issues: L11ScoreAttributionIssue[] = [];
  const a = args.attribution;

  // ── Identity (§11.4.3.2)
  if (!a.attribution_id) issues.push(make(L11ScoreAttributionViolationCode.L11A_ATTRIBUTION_ID_MISSING, 'attribution_id missing'));
  if (!a.score_id) issues.push(make(L11ScoreAttributionViolationCode.L11A_SCORE_REF_MISSING, 'score_id missing'));
  if (!a.formula_id) issues.push(make(L11ScoreAttributionViolationCode.L11A_FORMULA_REF_MISSING, 'formula_id missing'));
  if (!a.formula_version) issues.push(make(L11ScoreAttributionViolationCode.L11A_FORMULA_VERSION_MISSING, 'formula_version missing'));
  if (!a.formula_evaluation_ref) issues.push(make(L11ScoreAttributionViolationCode.L11A_FORMULA_EVALUATION_REF_MISSING, 'formula_evaluation_ref missing'));
  if (!a.input_snapshot_ref) issues.push(make(L11ScoreAttributionViolationCode.L11A_INPUT_SNAPSHOT_REF_MISSING, 'input_snapshot_ref missing'));
  if (!a.scope_type || !a.scope_id) issues.push(make(L11ScoreAttributionViolationCode.L11A_SCOPE_FIELDS_MISSING, 'scope fields missing'));
  if (!a.as_of) issues.push(make(L11ScoreAttributionViolationCode.L11A_AS_OF_MISSING, 'as_of missing'));
  if (!a.policy_version) issues.push(make(L11ScoreAttributionViolationCode.L11A_POLICY_VERSION_MISSING, 'policy_version missing'));

  // ── Score linkage (§11.4.3.4)
  if (a.score_family !== args.evaluation.score_family) {
    issues.push(make(L11ScoreAttributionViolationCode.L11A_SCORE_REF_MISSING,
      `attribution.score_family ${a.score_family} != evaluation ${args.evaluation.score_family}`));
  }
  if (a.formula_id !== args.formula.formula_id) {
    issues.push(make(L11ScoreAttributionViolationCode.L11A_FORMULA_REF_MISSING,
      `attribution.formula_id ${a.formula_id} != formula ${args.formula.formula_id}`));
  }
  if (a.formula_version !== args.formula.formula_version) {
    issues.push(make(L11ScoreAttributionViolationCode.L11A_FORMULA_VERSION_MISSING,
      `attribution.formula_version ${a.formula_version} != formula ${args.formula.formula_version}`));
  }
  if (args.score && a.score_id !== args.score.score_id) {
    issues.push(make(L11ScoreAttributionViolationCode.L11A_SCORE_REF_MISSING,
      `attribution.score_id ${a.score_id} != score ${args.score.score_id}`));
  }

  // ── Required component coverage (§11.4.5.3)
  const componentResultIds = new Set(args.evaluation.component_results.map(r => r.component_id));
  const attributedComponentIds = new Set(a.component_contributions.map(c => c.component_id));
  for (const id of componentResultIds) {
    if (!attributedComponentIds.has(id)) {
      issues.push(make(L11ScoreAttributionViolationCode.L11A_COMPONENT_CONTRIBUTION_MISSING,
        `component ${id} from formula evaluation missing in attribution`));
    }
  }

  // ── Sub-validators
  push(issues, validateL11ComponentContributions(a.component_contributions).issues);
  push(issues, validateL11CapContributions(a.cap_contributions).issues);
  push(issues, validateL11CapAttributionCoverage({ cap_contributions: a.cap_contributions, evaluation: args.evaluation }).issues);
  push(issues, validateL11MaterialCapVisibility({ cap_contributions: a.cap_contributions, negative_driver_refs: a.negative_driver_refs }).issues);
  push(issues, validateL11PenaltyContributions(a.penalty_contributions).issues);
  push(issues, validateL11PenaltyAttributionCoverage({ penalty_contributions: a.penalty_contributions, evaluation: args.evaluation }).issues);
  push(issues, validateL11ModifierContributions(a.modifier_contributions).issues);
  push(issues, validateL11ModifierAttributionCoverage({ modifier_contributions: a.modifier_contributions, evaluation: args.evaluation }).issues);
  push(issues, validateL11MissingDataContributions(a.missing_data_contributions).issues);
  push(issues, validateL11MissingDataCoverage({ missing_data_contributions: a.missing_data_contributions, evaluation: args.evaluation }).issues);
  push(issues, validateL11MaterialMissingDataVisibility({ missing_data_contributions: a.missing_data_contributions, negative_driver_refs: a.negative_driver_refs }).issues);
  push(issues, validateL11TopDriverSelection({ attribution: a, policy: args.top_driver_policy }).issues);
  push(issues, validateL11SummaryCode(a).issues);
  push(issues, validateL11AttributionCompleteness(a).issues);

  // ── Governed-input law (§11.4.15)
  for (const ref of a.evidence_refs) {
    if (!isGovernedRef(ref)) {
      issues.push(make(L11ScoreAttributionViolationCode.L11A_UNGOVERNED_INPUT_REF,
        `evidence ref ${ref} is not governed`));
    }
  }
  for (const ref of a.lineage_refs) {
    if (!isGovernedRef(ref)) {
      issues.push(make(L11ScoreAttributionViolationCode.L11A_UNGOVERNED_INPUT_REF,
        `lineage ref ${ref} is not governed`));
    }
  }
  if (a.evidence_refs.length === 0) {
    issues.push(make(L11ScoreAttributionViolationCode.L11A_EVIDENCE_REFS_MISSING, 'evidence_refs must be non-empty'));
  }
  if (a.lineage_refs.length === 0) {
    issues.push(make(L11ScoreAttributionViolationCode.L11A_LINEAGE_REFS_MISSING, 'lineage_refs must be non-empty'));
  }

  // ── Replay law (§11.4.16)
  if (!a.replay_hash) {
    issues.push(make(L11ScoreAttributionViolationCode.L11A_REPLAY_HASH_MISSING, 'replay_hash missing'));
  } else {
    const recomputed = canonicalScoreAttributionReplayHash(extractL11AttributionReplayMaterial(a));
    if (recomputed !== a.replay_hash) {
      issues.push(make(L11ScoreAttributionViolationCode.L11A_REPLAY_HASH_MISMATCH,
        `replay_hash mismatch: stored=${a.replay_hash} recomputed=${recomputed}`));
    }
  }

  if (a.policy_version !== L11_ATTRIBUTION_POLICY_VERSION &&
      !a.policy_version.startsWith('l11.4.')) {
    issues.push(make(L11ScoreAttributionViolationCode.L11A_POLICY_VERSION_MISSING,
      `policy_version ${a.policy_version} is not an L11.4 policy version`));
  }

  // ── Semantic leak law (§11.4.2.3 + §11.4.15.3)
  const text = collectAttributionText(a);
  for (const { rx, code } of FORBIDDEN_LEAK_PHRASES) {
    if (rx.test(text)) {
      issues.push(make(code, `attribution text contains forbidden phrase matching ${rx}`));
    }
  }

  return { ok: issues.length === 0, issues };
}

function collectAttributionText(a: L11ScoreAttribution): string {
  const parts: string[] = [];
  for (const c of a.component_contributions) parts.push(c.component_name);
  for (const c of a.cap_contributions) parts.push(c.cap_reason_code);
  for (const c of a.penalty_contributions) parts.push(c.penalty_reason_code);
  for (const c of a.modifier_contributions) parts.push(c.modifier_rule_id);
  for (const c of a.missing_data_contributions) parts.push(c.missing_input_ref);
  parts.push(...a.explanatory_summary_codes);
  return parts.join(' ');
}

function make(code: L11ScoreAttributionViolationCode, message: string) {
  return makeL11ScoreAttributionIssue(code, message);
}

function push(target: L11ScoreAttributionIssue[], src: readonly L11ScoreAttributionIssue[]): void {
  for (const i of src) target.push(i);
}
