/**
 * L8.4 — RegimeAssemblyEngine
 *
 * §8.4.4.1-2 — Builds contract-complete regime subject instances from
 * governed lower-layer clusters + the L8.3 subject contract template.
 * The engine does not materialise lower-layer state; it materialises the
 * subject-instance shape that later engines will classify against.
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import {
  getDefaultL8RegimeFamilyRegistry,
} from '../registry/regime-family.registry';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { containsL8ForbiddenNaming } from '../contracts/l8-boundary';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8SurfaceAvailability {
  readonly ref: string;
  readonly available: boolean;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly family: string;
}

export interface L8RegimeSubjectInstance {
  readonly subject_instance_id: string;
  readonly subject_contract_ref: string;
  readonly regime_subject_id: string;
  readonly regime_family: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly bound_validation_refs: readonly string[];
  readonly bound_feature_refs: readonly string[];
  readonly bound_context_refs: readonly string[];
  readonly bound_evidence_only_refs: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
  readonly replay_identity_inputs: {
    readonly subject_contract_version: string;
    readonly schema_version: string;
    readonly policy_version: string;
    readonly as_of: string;
    readonly scope_type: string;
    readonly scope_id: string;
  };
}

export interface L8AssemblyInput {
  readonly subject: L8RegimeSubjectContract;
  readonly surface_availability: readonly L8SurfaceAvailability[];
  readonly trace_id: string;
  readonly manifest_id: string;
}

export function assembleRegimeSubject(
  input: L8AssemblyInput,
): L8EngineResult<L8RegimeSubjectInstance> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;
  const familyRegistry = getDefaultL8RegimeFamilyRegistry();

  const ctx: Record<string, unknown> = {
    regime_subject_id: s.regime_subject_id,
    regime_family: s.regime_family,
    template: s.regime_template_id,
  };

  // §8.4.4.1 identity
  if (!s.regime_subject_id) {
    violations.push(v(
      L8RuntimeViolationCode.ASSEMBLY_CONTRACT_INCOMPLETE,
      s, 'regime_subject_id missing', ctx,
    ));
  }

  // §8.4.4.1 template legality
  if (!s.regime_template_id) {
    violations.push(v(
      L8RuntimeViolationCode.ASSEMBLY_UNREGISTERED_TEMPLATE,
      s, 'regime_template_id missing', ctx,
    ));
  }
  if (!familyRegistry.isRegistered(s.regime_family)) {
    violations.push(v(
      L8RuntimeViolationCode.ASSEMBLY_UNREGISTERED_TEMPLATE,
      s, `unregistered regime_family ${s.regime_family}`, ctx,
    ));
  }

  // §8.4.4.2 scope binding
  if (!s.scope_type || !s.scope_id) {
    violations.push(v(
      L8RuntimeViolationCode.ASSEMBLY_ILLEGAL_SCOPE_BINDING,
      s, 'scope incomplete', ctx,
    ));
  } else if (familyRegistry.isRegistered(s.regime_family) &&
      !familyRegistry.allowsScope(s.regime_family, s.scope_type)) {
    violations.push(v(
      L8RuntimeViolationCode.ASSEMBLY_FAMILY_SCOPE_ILLEGAL,
      s,
      `family ${s.regime_family} not legal on scope ${s.scope_type}`, ctx,
    ));
  }

  // §8.4.4.1 lineage
  if (!s.lineage_refs || !s.lineage_refs.trace_id ||
      !s.lineage_refs.manifest_id) {
    violations.push(v(
      L8RuntimeViolationCode.ASSEMBLY_LINEAGE_INCOMPLETE,
      s, 'lineage_refs incomplete', ctx,
    ));
  }

  // Contract completeness sanity (we don't rerun full L8.3 validator here;
  // presence of the structural fields is enough for assembly).
  if (!s.as_of) {
    violations.push(v(
      L8RuntimeViolationCode.ASSEMBLY_CONTRACT_INCOMPLETE,
      s, 'as_of missing', ctx,
    ));
  }
  if (!s.subject_contract_version || !s.schema_version ||
      !s.policy_version) {
    violations.push(v(
      L8RuntimeViolationCode.ASSEMBLY_CONTRACT_INCOMPLETE,
      s, 'contract versioning incomplete', ctx,
    ));
  }

  // §8.4.4.1 / §8.4.5.9 — judgment leak guard for the subject description
  if (containsL8ForbiddenNaming(s.description ?? '') ||
      containsL8ForbiddenNaming(s.created_by ?? '')) {
    violations.push(v(
      L8RuntimeViolationCode.ASSEMBLY_JUDGMENT_LEAK,
      s, 'description/created_by contains forbidden judgment semantics',
      ctx,
    ));
  }

  // Bind refs against availability
  const availability = new Map(
    input.surface_availability.map(a => [a.ref, a]),
  );
  const bind = (
    refs: readonly { readonly ref: string; readonly required: boolean }[],
  ): { bound: string[]; missing: string[] } => {
    const bound: string[] = [];
    const missing: string[] = [];
    for (const r of refs) {
      const a = availability.get(r.ref);
      if (!a || !a.available) {
        if (r.required) missing.push(r.ref);
      } else {
        bound.push(r.ref);
      }
    }
    return { bound, missing };
  };

  const validation = bind(s.required_validation_inputs ?? []);
  const feature = bind(s.required_feature_inputs ?? []);
  const context = bind(s.required_context_inputs ?? []);
  const evidence = bind(s.evidence_only_inputs ?? []);

  if (violations.length > 0) return fail(violations);

  const instance: L8RegimeSubjectInstance = {
    subject_instance_id: buildInstanceId(s),
    subject_contract_ref: s.regime_subject_id,
    regime_subject_id: s.regime_subject_id,
    regime_family: s.regime_family,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    bound_validation_refs: validation.bound.sort(),
    bound_feature_refs: feature.bound.sort(),
    bound_context_refs: context.bound.sort(),
    bound_evidence_only_refs: evidence.bound.sort(),
    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
      upstream_refs: [...s.lineage_refs.upstream_refs].sort(),
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
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'regime-assembly-engine',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}

/** §8.4.8.3 — Deterministic instance id. Same contract → same id. */
function buildInstanceId(s: L8RegimeSubjectContract): string {
  return `rsi:${s.regime_subject_id}:${s.subject_contract_version}:${s.as_of}`;
}
