/**
 * L9.4 — SequenceAssemblyEngine
 *
 * §9.4.5 — Builds contract-complete sequence subject instances from
 * governed lower-layer surfaces + the L9.3 subject contract. This
 * engine does not materialise lower-layer state; it materialises the
 * subject-instance shape that later engines will classify against.
 *
 * §9.4.5.5 — Given the same scope, same subject contract, same
 * admissible surfaces, and same engine version, it must build the same
 * subject instance identity every time.
 */

import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import {
  getL9SequenceFamilyDescriptor,
} from '../contracts/sequence-family';
import { containsL9ForbiddenNaming } from '../contracts/l9-boundary';
import {
  L9RuntimeViolation,
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';
import { L9EngineResult, fail, ok } from './engine-types';
import type {
  L9SequenceSubjectInstance,
} from '../runtime/sequence-execution-context';

export interface L9SurfaceAvailability {
  readonly ref: string;
  readonly available: boolean;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly family: string;
}

export interface L9AssemblyInput {
  readonly subject: L9SequenceSubjectContract;
  readonly surface_availability: readonly L9SurfaceAvailability[];
  readonly trace_id: string;
  readonly manifest_id: string;
}

/**
 * §9.4.5.1 — Assemble a governed subject instance from the subject
 * contract + available lower-layer surfaces.
 */
export function assembleSequenceSubject(
  input: L9AssemblyInput,
): L9EngineResult<L9SequenceSubjectInstance> {
  const violations: L9RuntimeViolation[] = [];
  const s = input.subject;

  const ctx: Record<string, unknown> = {
    sequence_subject_id: s.sequence_subject_id,
    sequence_family: s.sequence_family,
    template: s.sequence_template_id,
  };

  if (!s.sequence_subject_id) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_CONTRACT_INCOMPLETE,
      s, 'sequence_subject_id missing', ctx));
  }
  if (!s.sequence_template_id) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_UNREGISTERED_TEMPLATE,
      s, 'sequence_template_id missing', ctx));
  }

  const familyDesc = getL9SequenceFamilyDescriptor(s.sequence_family);
  if (!familyDesc) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_UNREGISTERED_FAMILY,
      s, `unregistered sequence_family ${s.sequence_family}`, ctx));
  }

  if (!s.scope_type || !s.scope_id) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_ILLEGAL_SCOPE_BINDING,
      s, 'scope incomplete', ctx));
  } else if (familyDesc && !familyDesc.legalScopeTypes.includes(s.scope_type)) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_FAMILY_SCOPE_ILLEGAL, s,
      `family ${s.sequence_family} not legal on scope ${s.scope_type}`, ctx));
  }

  if (!s.lineage_refs || !s.lineage_refs.trace_id ||
      !s.lineage_refs.manifest_id) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_LINEAGE_INCOMPLETE,
      s, 'lineage_refs incomplete', ctx));
  }

  if (!s.as_of) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_CONTRACT_INCOMPLETE,
      s, 'as_of missing', ctx));
  }
  if (!s.subject_contract_version || !s.schema_version ||
      !s.policy_version) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_CONTRACT_INCOMPLETE,
      s, 'contract versioning incomplete', ctx));
  }
  if (!s.sequence_window) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_TEMPORAL_WINDOW_MISSING,
      s, 'sequence_window missing', ctx));
  }
  if (!s.lead_lag_window) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_TEMPORAL_WINDOW_MISSING,
      s, 'lead_lag_window missing', ctx));
  }

  // §9.4.5.4 — families that need post-event anchors must declare the spec
  if (familyDesc && familyDesc.requiresPostEventAnchor &&
      !s.post_event_window_spec?.required) {
    violations.push(v(
      L9RuntimeViolationCode.ASSEMBLY_POST_EVENT_ANCHOR_REQUIREMENT_MISSING,
      s,
      `family ${s.sequence_family} requires post_event_window_spec.required=true`,
      ctx));
  }

  // §9.4.5.4 — families that require regime conditioning must declare it
  if (familyDesc && familyDesc.requiresRegimeConditioning &&
      !s.regime_consumption_policy?.required) {
    violations.push(v(
      L9RuntimeViolationCode.ASSEMBLY_REGIME_REQUIREMENT_MISSING,
      s,
      `family ${s.sequence_family} requires regime_consumption_policy.required=true`,
      ctx));
  }

  // §9.4.5 / §9.1 — judgment leak guard
  if (containsL9ForbiddenNaming(s.description ?? '') ||
      containsL9ForbiddenNaming(s.created_by ?? '')) {
    violations.push(v(L9RuntimeViolationCode.ASSEMBLY_JUDGMENT_LEAK, s,
      'description/created_by contains forbidden judgment semantics', ctx));
  }

  // Bind refs against availability
  const availability = new Map(
    input.surface_availability.map(a => [a.ref, a]),
  );
  const bind = (
    refs: readonly { readonly ref: string; readonly required: boolean }[],
  ): string[] => {
    const bound: string[] = [];
    for (const r of refs) {
      const a = availability.get(r.ref);
      if (a && a.available) bound.push(r.ref);
    }
    return bound.sort();
  };

  const validation = bind(s.required_validation_inputs ?? []);
  const event = bind(s.required_event_inputs ?? []);
  const feature = bind(s.required_feature_inputs ?? []);
  const regime = bind(s.required_regime_inputs ?? []);
  const context = bind(s.required_context_inputs ?? []);
  const evidence = bind(s.evidence_only_inputs ?? []);

  if (violations.length > 0) return fail(violations);

  const instance: L9SequenceSubjectInstance = {
    subject_instance_id: buildInstanceId(s),
    subject_contract_ref: s.sequence_subject_id,
    sequence_subject_id: s.sequence_subject_id,
    sequence_family: s.sequence_family,
    sequence_template_id: s.sequence_template_id,
    sequence_version: s.sequence_version,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    bound_validation_refs: validation,
    bound_event_refs: event,
    bound_feature_refs: feature,
    bound_regime_refs: regime,
    bound_context_refs: context,
    bound_evidence_only_refs: evidence,
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

function v(
  code: L9RuntimeViolationCode,
  s: L9SequenceSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L9RuntimeViolation {
  return {
    code,
    source: 'sequence-assembly-engine',
    nodeId: null,
    sequence_run_id: null,
    sequence_subject_id: s.sequence_subject_id,
    detail,
    context,
  };
}

/** §9.4.5.5 — Deterministic instance id. Same contract → same id. */
export function buildInstanceId(s: L9SequenceSubjectContract): string {
  return `lsi:${s.sequence_subject_id}:${s.subject_contract_version}:${s.as_of}`;
}
