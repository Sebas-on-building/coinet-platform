/**
 * L12.4 — Engine 3: ScenarioCandidateEngine (§12.4.15).
 *
 * Generates legal scenario candidates only. Candidates carry seed refs
 * (conditions/triggers/invalidations) but never assign primary, secondary,
 * base case, or final ranking — that is the ranking engine's exclusive job.
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import { L12ScenarioFamily } from '../contracts/scenario-family';
import { L12ScenarioType } from '../contracts/scenario-type';

import type { L12ScenarioInputResolution } from './scenario-input-resolver';

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])will\s+(go|move|pump|dump|break|continue)(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])guaranteed(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])inevitable(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])buy(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])sell(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])long(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])short(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])recommend(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])final[\s_]*judgment(?:[^a-z0-9]|$)/i,
];

function detectForbiddenPhrase(text: string): string | undefined {
  if (!text) return undefined;
  for (const p of FORBIDDEN_PATTERNS) {
    if (p.test(text)) return p.source;
  }
  return undefined;
}

export interface L12ScenarioCandidate {
  readonly candidate_id: string;
  readonly scenario_subject_id: string;

  readonly scenario_type: L12ScenarioType;
  readonly scenario_family: L12ScenarioFamily;

  readonly candidate_reason_codes: readonly string[];

  readonly supporting_input_refs: readonly string[];
  readonly weakening_input_refs: readonly string[];

  readonly required_condition_seed_refs: readonly string[];
  readonly required_trigger_seed_refs: readonly string[];
  readonly required_invalidation_seed_refs: readonly string[];

  readonly candidate_strength_score: number;

  readonly eligible_for_base_case: boolean;
  readonly eligible_for_primary: boolean;
  readonly eligible_for_secondary: boolean;

  readonly blocked: boolean;
  readonly block_reason_codes: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L12ScenarioCandidateSet {
  readonly candidate_set_id: string;
  readonly scenario_subject_id: string;

  readonly candidates: readonly L12ScenarioCandidate[];

  readonly base_case_candidate_refs: readonly string[];
  readonly bullish_candidate_refs: readonly string[];
  readonly bearish_candidate_refs: readonly string[];
  readonly neutral_candidate_refs: readonly string[];
  readonly stress_candidate_refs: readonly string[];
  readonly recovery_candidate_refs: readonly string[];

  readonly insufficient_data_candidate_ref?: string;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L12ScenarioCandidateInput {
  readonly scenario_type: L12ScenarioType;
  readonly scenario_family: L12ScenarioFamily;
  readonly candidate_reason_codes: readonly string[];
  readonly supporting_input_refs: readonly string[];
  readonly weakening_input_refs?: readonly string[];
  readonly required_condition_seed_refs: readonly string[];
  readonly required_trigger_seed_refs: readonly string[];
  readonly required_invalidation_seed_refs: readonly string[];
  readonly candidate_strength_score: number;
  readonly eligible_for_base_case?: boolean;
  readonly eligible_for_primary?: boolean;
  readonly eligible_for_secondary?: boolean;
  readonly free_text?: string;
}

export interface GenerateL12CandidatesArgs {
  readonly scenario_subject_id: string;
  readonly resolution: L12ScenarioInputResolution;
  readonly candidates: readonly L12ScenarioCandidateInput[];
  readonly insufficient_inputs_for_alternatives?: boolean;
  readonly policy_version: string;
}

export interface GenerateL12CandidatesResult {
  readonly ok: boolean;
  readonly candidate_set?: L12ScenarioCandidateSet;
  readonly issues: readonly string[];
}

export function generateL12ScenarioCandidates(
  args: GenerateL12CandidatesArgs,
): GenerateL12CandidatesResult {
  const issues: string[] = [];

  if (args.candidates.length === 0) {
    issues.push('no candidates supplied');
  }

  const seenTypes = new Set<L12ScenarioType>();
  const built: L12ScenarioCandidate[] = [];

  for (const c of args.candidates) {
    if (c.candidate_reason_codes.length === 0) {
      issues.push(`candidate ${c.scenario_type}/${c.scenario_family} has no reason codes`);
    }
    if (c.supporting_input_refs.length === 0) {
      issues.push(`candidate ${c.scenario_type}/${c.scenario_family} has no supporting input refs`);
    }
    if (c.eligible_for_primary || c.eligible_for_base_case || c.eligible_for_secondary) {
      // ELIGIBILITY is allowed (a flag), but assignment is the ranking engine's job.
      // We still require ranking-shaped fields not to leak as final ranking.
    }
    if (c.scenario_type === L12ScenarioType.BASE_CASE && !c.eligible_for_base_case) {
      issues.push('BASE_CASE candidate must be eligible for base case');
    }
    const forbiddenInReasons = c.candidate_reason_codes.find(detectForbiddenPhrase);
    if (forbiddenInReasons) {
      issues.push(`forbidden phrase in reason codes: ${forbiddenInReasons}`);
    }
    if (c.free_text && detectForbiddenPhrase(c.free_text)) {
      issues.push('forbidden phrase in candidate text');
    }
    if (
      c.candidate_strength_score < 0 ||
      c.candidate_strength_score > 1 ||
      Number.isNaN(c.candidate_strength_score)
    ) {
      issues.push(`candidate_strength_score out of range: ${c.candidate_strength_score}`);
    }
    seenTypes.add(c.scenario_type);

    const candidate_id_hash = buildL12ScenarioReplayHash({
      domain: 'l12.candidate',
      policy_version: args.policy_version,
      material: {
        scenario_subject_id: args.scenario_subject_id,
        scenario_type: c.scenario_type,
        scenario_family: c.scenario_family,
      },
    });
    const replay_hash = buildL12ScenarioReplayHash({
      domain: 'l12.candidate.replay',
      policy_version: args.policy_version,
      material: {
        candidate_id_hash,
        reason_codes: [...c.candidate_reason_codes].sort(),
        supporting: [...c.supporting_input_refs].sort(),
        weakening: [...(c.weakening_input_refs ?? [])].sort(),
        cond: [...c.required_condition_seed_refs].sort(),
        trig: [...c.required_trigger_seed_refs].sort(),
        inv: [...c.required_invalidation_seed_refs].sort(),
      },
    });
    built.push({
      candidate_id: `l12.candidate.${candidate_id_hash}`,
      scenario_subject_id: args.scenario_subject_id,
      scenario_type: c.scenario_type,
      scenario_family: c.scenario_family,
      candidate_reason_codes: [...c.candidate_reason_codes],
      supporting_input_refs: [...c.supporting_input_refs].sort(),
      weakening_input_refs: [...(c.weakening_input_refs ?? [])].sort(),
      required_condition_seed_refs: [...c.required_condition_seed_refs].sort(),
      required_trigger_seed_refs: [...c.required_trigger_seed_refs].sort(),
      required_invalidation_seed_refs: [...c.required_invalidation_seed_refs].sort(),
      candidate_strength_score: c.candidate_strength_score,
      eligible_for_base_case: c.eligible_for_base_case ?? false,
      eligible_for_primary: c.eligible_for_primary ?? false,
      eligible_for_secondary: c.eligible_for_secondary ?? false,
      blocked: false,
      block_reason_codes: [],
      lineage_refs: args.resolution.lineage_refs,
      replay_hash,
      policy_version: args.policy_version,
    });
  }

  // Multi-path law: bullish-only set is illegal unless insufficient inputs.
  const hasBullish = seenTypes.has(L12ScenarioType.BULLISH_CONTINUATION);
  const hasBearish = seenTypes.has(L12ScenarioType.BEARISH_FAILURE);
  const hasFailureAlternative =
    hasBearish ||
    seenTypes.has(L12ScenarioType.STRESS_CASE) ||
    seenTypes.has(L12ScenarioType.RECOVERY_CASE);
  const hasInsufficientData = seenTypes.has(L12ScenarioType.INSUFFICIENT_DATA_CASE);
  if (
    hasBullish &&
    !hasFailureAlternative &&
    !args.insufficient_inputs_for_alternatives &&
    !hasInsufficientData
  ) {
    issues.push('bullish-only candidate set without failure/alternative — fake-certainty');
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const polarity = (t: L12ScenarioType) => t;
  const refsBy = (t: L12ScenarioType) =>
    built.filter(c => c.scenario_type === t).map(c => c.candidate_id).sort();

  const set_replay = buildL12ScenarioReplayHash({
    domain: 'l12.candidate_set',
    policy_version: args.policy_version,
    material: {
      scenario_subject_id: args.scenario_subject_id,
      candidate_ids: built.map(c => c.candidate_id).sort(),
    },
  });

  const candidate_set: L12ScenarioCandidateSet = {
    candidate_set_id: `l12.candidate_set.${set_replay}`,
    scenario_subject_id: args.scenario_subject_id,
    candidates: built,
    base_case_candidate_refs: refsBy(L12ScenarioType.BASE_CASE),
    bullish_candidate_refs: refsBy(L12ScenarioType.BULLISH_CONTINUATION),
    bearish_candidate_refs: refsBy(L12ScenarioType.BEARISH_FAILURE),
    neutral_candidate_refs: refsBy(L12ScenarioType.NEUTRAL_CHOP),
    stress_candidate_refs: refsBy(L12ScenarioType.STRESS_CASE),
    recovery_candidate_refs: refsBy(L12ScenarioType.RECOVERY_CASE),
    insufficient_data_candidate_ref: built.find(
      c => c.scenario_type === polarity(L12ScenarioType.INSUFFICIENT_DATA_CASE),
    )?.candidate_id,
    lineage_refs: args.resolution.lineage_refs,
    replay_hash: set_replay,
    policy_version: args.policy_version,
  };

  return { ok: true, candidate_set, issues: [] };
}
