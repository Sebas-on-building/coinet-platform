/**
 * L10.4 — HypothesisCandidateEngine
 *
 * §10.4.6 — Emits contract-complete candidate instances from the
 * admitted subject instance + governed family templates. This engine
 * never ranks, never assigns primary/secondary, never mutates
 * evidence — it only constructs the *competition space*.
 *
 * §10.4.6.3 — Replay determinism: the same (subject_instance + admissible
 * templates + template versions) must yield the same candidate set
 * with the same `hypothesis_candidate_id`s in the same order.
 */

import type {
  L10HypothesisCandidateContract,
} from '../contracts/hypothesis-candidate.contract';
import type {
  L10HypothesisSubjectContract,
} from '../contracts/hypothesis-subject.contract';
import {
  getL10HypothesisFamilyDescriptor,
  L10HypothesisFamilyClass,
} from '../contracts/hypothesis-subject-class';
import { containsL10ForbiddenNaming } from '../contracts/l10-boundary';
import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';
import { L10EngineResult, fail, ok } from './engine-types';
import type {
  L10HypothesisBlockedCandidateRecord,
  L10HypothesisCandidateInstance,
  L10HypothesisSubjectInstance,
} from '../runtime/hypothesis-execution-context';

/**
 * §10.4.6.1 — The input to candidate generation. Templates are
 * resolved upstream; the engine never reaches into the registry.
 */
export interface L10CandidateGenerationInput {
  readonly subject: L10HypothesisSubjectContract;
  readonly subject_instance: L10HypothesisSubjectInstance;
  readonly candidate_contracts: readonly L10HypothesisCandidateContract[];
  readonly trace_id: string;
  readonly manifest_id: string;
}

export interface L10CandidateGenerationResult {
  readonly candidates: readonly L10HypothesisCandidateInstance[];
  readonly blocked: readonly L10HypothesisBlockedCandidateRecord[];
}

export function generateHypothesisCandidates(
  input: L10CandidateGenerationInput,
): L10EngineResult<L10CandidateGenerationResult> {
  const violations: L10RuntimeViolation[] = [];
  const blocked: L10HypothesisBlockedCandidateRecord[] = [];
  const out: L10HypothesisCandidateInstance[] = [];
  const seenIds = new Set<string>();

  const subject = input.subject;
  const si = input.subject_instance;
  const gen = subject.candidate_generation;
  const forbidden = new Set(gen?.forbidden_family_templates ?? []);
  const required = new Set(gen?.required_family_templates ?? []);
  const admissibleFamilies = new Set<L10HypothesisFamilyClass>(
    si.admissible_families,
  );
  const competitionGroup = `${si.hypothesis_subject_id}:${si.as_of}`;

  const v = (
    code: L10RuntimeViolationCode,
    candidate: L10HypothesisCandidateContract | null,
    detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'HypothesisCandidateEngine',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: subject.hypothesis_subject_id,
    hypothesis_candidate_id: candidate?.hypothesis_candidate_id ?? null,
    detail,
    context: {
      hypothesis_subject_id: subject.hypothesis_subject_id,
      template_id: candidate?.hypothesis_template_id ?? null,
    },
  });

  const seenTemplates = new Set<string>();

  for (const c of input.candidate_contracts) {
    if (c.hypothesis_subject_id !== subject.hypothesis_subject_id) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_COMPETITION_GROUP_MISMATCH,
        c, 'candidate references different subject',
      ));
      continue;
    }
    if (seenIds.has(c.hypothesis_candidate_id)) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_DUPLICATE_ID,
        c, `duplicate candidate id ${c.hypothesis_candidate_id}`,
      ));
      continue;
    }
    if (forbidden.has(c.hypothesis_template_id)) {
      blocked.push({
        template_id: c.hypothesis_template_id,
        family: c.hypothesis_family,
        reason_code: L10RuntimeViolationCode.CANDIDATE_FORBIDDEN_TEMPLATE,
        detail: 'template explicitly forbidden by subject',
      });
      continue;
    }
    const fd = getL10HypothesisFamilyDescriptor(c.hypothesis_family);
    if (!fd) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_UNREGISTERED_FAMILY,
        c, `unregistered family ${c.hypothesis_family}`,
      ));
      continue;
    }
    if (!admissibleFamilies.has(c.hypothesis_family)) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_FAMILY_SCOPE_ILLEGAL,
        c, `family ${c.hypothesis_family} not admissible for this subject`,
      ));
      continue;
    }
    if (fd.requiresRegimeConditioning &&
        (c.regime_conditioning_requirements?.length ?? 0) === 0) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_REGIME_CONDITIONING_MISSING,
        c, `family ${c.hypothesis_family} requires regime conditioning`,
      ));
      continue;
    }
    if (fd.requiresSequenceConditioning &&
        (c.sequence_conditioning_requirements?.length ?? 0) === 0) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_SEQUENCE_CONDITIONING_MISSING,
        c, `family ${c.hypothesis_family} requires sequence conditioning`,
      ));
      continue;
    }
    if (c.candidate_class === 'PRIMARY_CANDIDATE') {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_PRE_SELECTED_PRIMARY,
        c, 'candidate declared PRIMARY_CANDIDATE before ranking',
      ));
      continue;
    }
    if ((c.required_support_patterns?.length ?? 0) === 0 ||
        (c.required_challenge_patterns?.length ?? 0) === 0 ||
        (c.required_confirmation_patterns?.length ?? 0) === 0 ||
        (c.invalidation_patterns?.length ?? 0) === 0) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_MISSING_TEMPLATE_SEMANTICS,
        c,
        'candidate missing required pattern families (support/challenge/confirmation/invalidation)',
      ));
      continue;
    }
    if (containsL10ForbiddenNaming(c.hypothesis_name) ||
        containsL10ForbiddenNaming(c.description ?? '')) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_NAME_LEAK,
        c, 'candidate name/description contains forbidden explanatory naming',
      ));
      continue;
    }
    if (c.competition_group &&
        c.competition_group !== competitionGroup) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_COMPETITION_GROUP_MISMATCH,
        c,
        `competition_group mismatch: got ${c.competition_group}, expected ${competitionGroup}`,
      ));
      continue;
    }
    seenIds.add(c.hypothesis_candidate_id);
    seenTemplates.add(c.hypothesis_template_id);
    out.push({
      candidate_instance_id: buildCandidateInstanceId(c, si),
      candidate_contract_ref: c.hypothesis_candidate_id,
      hypothesis_candidate_id: c.hypothesis_candidate_id,
      hypothesis_subject_id: c.hypothesis_subject_id,
      hypothesis_family: c.hypothesis_family,
      hypothesis_template_id: c.hypothesis_template_id,
      template_version: c.template_version,
      competition_group: competitionGroup,
      candidate_priority_seed: c.candidate_priority_seed,
      required_support_pattern_refs:
        c.required_support_patterns.map(p => p.pattern_id).sort(),
      required_challenge_pattern_refs:
        c.required_challenge_patterns.map(p => p.pattern_id).sort(),
      required_confirmation_pattern_refs:
        c.required_confirmation_patterns.map(p => p.pattern_id).sort(),
      invalidation_pattern_refs:
        c.invalidation_patterns.map(p => p.pattern_id).sort(),
      regime_conditioning_requirements:
        [...(c.regime_conditioning_requirements ?? [])].sort(),
      sequence_conditioning_requirements:
        [...(c.sequence_conditioning_requirements ?? [])].sort(),
      generation_reasons: [],
      lineage_refs: {
        trace_id: input.trace_id,
        manifest_id: input.manifest_id,
        upstream_refs: [...(c.lineage_refs?.upstream_refs ?? [])].sort(),
      },
    });
  }

  for (const req of required) {
    if (!seenTemplates.has(req)) {
      violations.push(v(
        L10RuntimeViolationCode.CANDIDATE_MISSING_REQUIRED_TEMPLATE,
        null, `required template ${req} not present in candidate set`,
      ));
    }
  }

  const minCount = gen?.min_candidate_count ?? 2;
  if (out.length < minCount) {
    violations.push(v(
      L10RuntimeViolationCode.CANDIDATE_MIN_COUNT_UNMET,
      null,
      `only ${out.length} candidates emitted; min_candidate_count=${minCount}`,
    ));
  }
  if (out.length < 2) {
    violations.push(v(
      L10RuntimeViolationCode.CANDIDATE_SINGLE_STORY_COLLAPSE,
      null,
      `candidate set collapses to single story (${out.length})`,
    ));
  }

  if (violations.length > 0) return fail(violations);

  out.sort((a, b) => {
    if (a.candidate_priority_seed !== b.candidate_priority_seed) {
      return a.candidate_priority_seed - b.candidate_priority_seed;
    }
    return a.hypothesis_candidate_id < b.hypothesis_candidate_id ? -1 :
           a.hypothesis_candidate_id > b.hypothesis_candidate_id ? 1 : 0;
  });
  return ok({ candidates: out, blocked });
}

export function buildCandidateInstanceId(
  c: L10HypothesisCandidateContract,
  si: L10HypothesisSubjectInstance,
): string {
  return `lhci:${c.hypothesis_candidate_id}:${c.candidate_contract_version}:${si.as_of}`;
}
