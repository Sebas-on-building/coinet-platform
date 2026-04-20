/**
 * L10.4 — HypothesisAssemblyEngine
 *
 * §10.4.5 — Builds contract-complete hypothesis subject instances from
 * an admitted `L10HypothesisSubjectContract` + governed lower-layer
 * surface availability. The assembly engine is the single writer of
 * `L10HypothesisSubjectInstance`; every other engine reads from the
 * execution context.
 *
 * §10.4.5.5 — Replay determinism: same contract + same surfaces + same
 * engine version ⇒ same instance id + same bound refs.
 */

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
  L10HypothesisSubjectInstance,
} from '../runtime/hypothesis-execution-context';

export interface L10SurfaceAvailability {
  readonly ref: string;
  readonly available: boolean;
  readonly family: string;
}

export interface L10AssemblyInput {
  readonly subject: L10HypothesisSubjectContract;
  readonly surface_availability: readonly L10SurfaceAvailability[];
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly admissible_family_templates: readonly string[];
}

export function assembleHypothesisSubject(
  input: L10AssemblyInput,
): L10EngineResult<L10HypothesisSubjectInstance> {
  const s = input.subject;
  const violations: L10RuntimeViolation[] = [];
  const ctx: Record<string, unknown> = {
    hypothesis_subject_id: s.hypothesis_subject_id,
    subject_class: s.subject_class,
  };
  const v = (code: L10RuntimeViolationCode, detail: string): L10RuntimeViolation => ({
    code,
    source: 'HypothesisAssemblyEngine',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: s.hypothesis_subject_id ?? null,
    hypothesis_candidate_id: null,
    detail,
    context: ctx,
  });

  if (!s.hypothesis_subject_id || !s.subject_class) {
    violations.push(v(
      L10RuntimeViolationCode.ASSEMBLY_CONTRACT_INCOMPLETE,
      'hypothesis_subject_id / subject_class missing',
    ));
  }
  if (!s.subject_contract_version || !s.schema_version || !s.policy_version) {
    violations.push(v(
      L10RuntimeViolationCode.ASSEMBLY_CONTRACT_INCOMPLETE,
      'contract versioning incomplete',
    ));
  }
  if (!s.scope_type || !s.scope_id) {
    violations.push(v(
      L10RuntimeViolationCode.ASSEMBLY_ILLEGAL_SCOPE_BINDING,
      'scope_type/scope_id missing',
    ));
  }
  if (!s.as_of) {
    violations.push(v(
      L10RuntimeViolationCode.ASSEMBLY_CONTRACT_INCOMPLETE,
      'as_of missing',
    ));
  }
  if (!s.hypothesis_window) {
    violations.push(v(
      L10RuntimeViolationCode.ASSEMBLY_TEMPORAL_WINDOW_MISSING,
      'hypothesis_window missing',
    ));
  }
  if (!s.lineage_refs || !s.lineage_refs.trace_id ||
      !s.lineage_refs.manifest_id) {
    violations.push(v(
      L10RuntimeViolationCode.ASSEMBLY_LINEAGE_INCOMPLETE,
      'lineage_refs incomplete',
    ));
  }

  const familyDescs = (s.hypothesis_family_set ?? []).map(f => ({
    family: f,
    desc: getL10HypothesisFamilyDescriptor(f),
  }));
  for (const fd of familyDescs) {
    if (!fd.desc) {
      violations.push(v(
        L10RuntimeViolationCode.ASSEMBLY_UNREGISTERED_FAMILY,
        `unregistered family ${fd.family}`,
      ));
      continue;
    }
    if (!fd.desc.legalScopeTypes.includes(s.scope_type)) {
      violations.push(v(
        L10RuntimeViolationCode.ASSEMBLY_FAMILY_SCOPE_ILLEGAL,
        `family ${fd.family} illegal on scope ${s.scope_type}`,
      ));
    }
    if (fd.desc.requiresRegimeConditioning &&
        !s.regime_consumption_policy?.required) {
      violations.push(v(
        L10RuntimeViolationCode.ASSEMBLY_REGIME_REQUIREMENT_MISSING,
        `family ${fd.family} requires regime_consumption_policy.required=true`,
      ));
    }
    if (fd.desc.requiresSequenceConditioning &&
        !s.sequence_consumption_policy?.required) {
      violations.push(v(
        L10RuntimeViolationCode.ASSEMBLY_SEQUENCE_REQUIREMENT_MISSING,
        `family ${fd.family} requires sequence_consumption_policy.required=true`,
      ));
    }
    if (fd.desc.requiresRestrictionConsumption &&
        !s.restriction_consumption_policy?.required) {
      violations.push(v(
        L10RuntimeViolationCode
          .ASSEMBLY_RESTRICTION_REQUIREMENT_MISSING,
        `family ${fd.family} requires restriction_consumption_policy.required=true`,
      ));
    }
  }

  const gen = s.candidate_generation;
  if (!gen || gen.min_candidate_count < 2) {
    violations.push(v(
      L10RuntimeViolationCode.ASSEMBLY_NO_COMPETITION_SPACE,
      'candidate_generation.min_candidate_count must be >= 2',
    ));
  }
  const admissibleTemplates = new Set(input.admissible_family_templates);
  for (const req of gen?.required_family_templates ?? []) {
    if (!admissibleTemplates.has(req)) {
      violations.push(v(
        L10RuntimeViolationCode.ASSEMBLY_NO_CANDIDATE_SPACE,
        `required family template ${req} not in admissible set`,
      ));
    }
  }

  if (containsL10ForbiddenNaming(s.description ?? '') ||
      containsL10ForbiddenNaming(s.created_by ?? '')) {
    violations.push(v(
      L10RuntimeViolationCode.ASSEMBLY_JUDGMENT_LEAK,
      'description/created_by contains forbidden explanatory naming',
    ));
  }

  const availability = new Map(
    input.surface_availability.map(a => [a.ref, a]),
  );
  const bind = (
    refs: readonly { readonly ref: string; readonly required: boolean }[],
  ): string[] => {
    const bound: string[] = [];
    for (const r of refs) {
      const a = availability.get(r.ref);
      if (a && a.available) {
        bound.push(r.ref);
      } else if (r.required) {
        violations.push(v(
          L10RuntimeViolationCode.ASSEMBLY_MISSING_REQUIRED_INPUTS,
          `required input ${r.ref} unavailable`,
        ));
      }
    }
    return bound.sort();
  };

  const validation = bind(s.required_validation_inputs ?? []);
  const regime = bind(s.required_regime_inputs ?? []);
  const sequence = bind(s.required_sequence_inputs ?? []);
  const feature = bind(s.required_feature_inputs ?? []);
  const event = bind(s.required_event_inputs ?? []);
  const context_refs = bind(s.required_context_inputs ?? []);
  const evidence = bind(s.evidence_only_inputs ?? []);

  if (violations.length > 0) return fail(violations);

  const admissibleFamilies: readonly L10HypothesisFamilyClass[] =
    [...(s.hypothesis_family_set ?? [])].sort();

  const instance: L10HypothesisSubjectInstance = {
    subject_instance_id: buildHypothesisInstanceId(s),
    subject_contract_ref: s.hypothesis_subject_id,
    hypothesis_subject_id: s.hypothesis_subject_id,
    subject_class: s.subject_class,
    hypothesis_family_set: admissibleFamilies,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    bound_validation_refs: validation,
    bound_regime_refs: regime,
    bound_sequence_refs: sequence,
    bound_feature_refs: feature,
    bound_event_refs: event,
    bound_context_refs: context_refs,
    bound_evidence_only_refs: evidence,
    bound_restriction_refs: [],
    admissible_family_templates: [...input.admissible_family_templates].sort(),
    admissible_families: admissibleFamilies,
    competition_space_size:
      input.admissible_family_templates.length,
    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
      upstream_refs: [...(s.lineage_refs?.upstream_refs ?? [])].sort(),
    },
    replay_identity_inputs: {
      subject_contract_version: s.subject_contract_version,
      schema_version: s.schema_version,
      policy_version: s.policy_version,
      as_of: s.as_of,
      scope_type: s.scope_type,
      scope_id: s.scope_id,
    },
  };
  return ok(instance);
}

/** §10.4.5.5 — Deterministic instance id. */
export function buildHypothesisInstanceId(
  s: L10HypothesisSubjectContract,
): string {
  return `lhsi:${s.hypothesis_subject_id}:${s.subject_contract_version}:${s.as_of}`;
}
