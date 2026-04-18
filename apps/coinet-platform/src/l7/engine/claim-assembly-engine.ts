/**
 * L7.4 — ClaimAssemblyEngine
 *
 * §7.4.3 — Builds contract-complete validation subject *instances* from
 * governed L6 primitive clusters + the L7.3 subject contract template.
 * The engine does not materialise feature values; it materialises the
 * subject instance that later engines will test.
 *
 * Engine law (§7.4.3.5): assembly must fail if the template is
 * unregistered, the scope is illegal, required support/challenge inputs
 * are unavailable, materiality is missing, lineage is incomplete, or the
 * claim leaks judgment / recommendation language.
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import {
  isRegisteredSubjectClass,
  subjectClassAllowsScope,
  type L7SubjectScopeType,
} from '../contracts/validation-subject-class';
import { L7RuntimeViolation, L7RuntimeViolationCode } from '../validation/l7-runtime-violation-codes';
import { L7EngineResult, fail, ok } from './engine-types';

export interface L7PrimitiveSurfaceAvailability {
  readonly ref: string;
  readonly available: boolean;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly family: string;
}

export interface L7ValidationSubjectInstance {
  readonly subject_instance_id: string;
  readonly subject_contract_ref: string;
  readonly validation_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly claim_family: string;
  readonly claim_version: string;
  readonly as_of: string;
  readonly bound_support_refs: readonly string[];
  readonly bound_challenge_refs: readonly string[];
  readonly materiality_class: string;
  readonly expected_risk_overhang_surfaces: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
  readonly replay_identity_inputs: {
    readonly subject_contract_version: string;
    readonly schema_version: string;
    readonly as_of: string;
    readonly scope_type: string;
    readonly scope_id: string;
  };
}

export interface ClaimAssemblyInput {
  readonly subject: L7ValidationSubjectContract;
  readonly primitive_availability: readonly L7PrimitiveSurfaceAvailability[];
  readonly trace_id: string;
  readonly manifest_id: string;
}

const JUDGMENT_TOKENS = [
  'buy_ready',
  'final_bullish',
  'best_trade',
  'highest_conviction',
  'scenario_winner',
  'judgment_override',
  'recommended',
  'should_buy',
  'should_sell',
];

export function assembleClaim(input: ClaimAssemblyInput): L7EngineResult<L7ValidationSubjectInstance> {
  const violations: L7RuntimeViolation[] = [];
  const s = input.subject;
  const ctx: Record<string, unknown> = {
    validation_subject_id: s.validation_subject_id,
    template: s.subject_template_id,
  };

  // §7.4.3.5 template legality
  if (!s.subject_template_id) {
    violations.push(v(L7RuntimeViolationCode.ASSEMBLY_UNREGISTERED_TEMPLATE, s, 'subject_template_id missing', ctx));
  }
  if (!isRegisteredSubjectClass(s.subject_class)) {
    violations.push(v(L7RuntimeViolationCode.ASSEMBLY_UNREGISTERED_TEMPLATE, s, `unregistered subject_class ${s.subject_class}`, ctx));
  }

  // §7.4.3.6 template-to-scope binding
  if (!s.scope_type || !s.scope_id) {
    violations.push(v(L7RuntimeViolationCode.ASSEMBLY_ILLEGAL_SCOPE_BINDING, s, 'scope incomplete', ctx));
  } else if (isSubjectScopeType(s.scope_type)) {
    if (!subjectClassAllowsScope(s.subject_class, s.scope_type)) {
      violations.push(v(
        L7RuntimeViolationCode.ASSEMBLY_ILLEGAL_SCOPE_BINDING,
        s,
        `subject_class ${s.subject_class} not legal on scope ${s.scope_type}`,
        ctx,
      ));
    }
  } else {
    violations.push(v(L7RuntimeViolationCode.ASSEMBLY_ILLEGAL_SCOPE_BINDING, s, `scope_type ${s.scope_type} not a recognised subject scope`, ctx));
  }

  // §7.4.3.5 materiality
  if (!s.materiality_class) {
    violations.push(v(L7RuntimeViolationCode.ASSEMBLY_MATERIALITY_MISSING, s, 'materiality_class missing', ctx));
  }

  // §7.4.3.5 lineage
  if (!s.lineage_refs || !s.lineage_refs.trace_id || !s.lineage_refs.manifest_id) {
    violations.push(v(L7RuntimeViolationCode.ASSEMBLY_LINEAGE_INCOMPLETE, s, 'lineage_refs incomplete', ctx));
  }

  // §7.4.3.5 + §7.4.3.8 — support/challenge binding
  const availability = new Map(input.primitive_availability.map(p => [p.ref, p]));
  const boundSupport: string[] = [];
  const missingSupport: string[] = [];
  for (const inp of s.required_support_inputs) {
    const a = availability.get(inp.ref);
    if (!a || !a.available) {
      if (inp.required) missingSupport.push(inp.ref);
    } else {
      boundSupport.push(inp.ref);
    }
  }
  if (missingSupport.length > 0) {
    violations.push(v(
      L7RuntimeViolationCode.ASSEMBLY_MISSING_SUPPORT_SURFACE,
      s,
      `required support surfaces unavailable: ${missingSupport.join(', ')}`,
      { ...ctx, missingSupport },
    ));
  }

  const boundChallenge: string[] = [];
  const missingChallenge: string[] = [];
  for (const inp of s.required_challenge_inputs) {
    const a = availability.get(inp.ref);
    if (!a || !a.available) {
      if (inp.required) missingChallenge.push(inp.ref);
    } else {
      boundChallenge.push(inp.ref);
    }
  }
  if (missingChallenge.length > 0) {
    violations.push(v(
      L7RuntimeViolationCode.ASSEMBLY_MISSING_CHALLENGE_SURFACE,
      s,
      `required challenge surfaces unavailable: ${missingChallenge.join(', ')}`,
      { ...ctx, missingChallenge },
    ));
  }

  // §7.4.3.5 judgment leak
  const leakHaystack = `${s.claim_name} ${s.claim_family} ${s.description ?? ''}`.toLowerCase();
  for (const token of JUDGMENT_TOKENS) {
    if (leakHaystack.includes(token)) {
      violations.push(v(
        L7RuntimeViolationCode.ASSEMBLY_JUDGMENT_LEAK,
        s,
        `claim leaks judgment/recommendation language: "${token}"`,
        ctx,
      ));
      break;
    }
  }

  // §7.4.3.5 risk-overhang declarations
  if (
    s.expected_risk_overhang_types &&
    s.expected_risk_overhang_types.length > 0 &&
    s.required_challenge_inputs.length === 0
  ) {
    violations.push(v(
      L7RuntimeViolationCode.ASSEMBLY_RISK_OVERHANG_UNDECLARED,
      s,
      'risk overhangs declared but no challenge inputs bound to detect them',
      ctx,
    ));
  }

  if (violations.length > 0) return fail(violations);

  const instance: L7ValidationSubjectInstance = {
    subject_instance_id: buildInstanceId(s),
    subject_contract_ref: s.validation_subject_id,
    validation_subject_id: s.validation_subject_id,
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    claim_family: s.claim_family,
    claim_version: s.claim_version,
    as_of: s.as_of,
    bound_support_refs: boundSupport.sort(),
    bound_challenge_refs: boundChallenge.sort(),
    materiality_class: s.materiality_class,
    expected_risk_overhang_surfaces: [...s.expected_risk_overhang_types].sort(),
    lineage_refs: {
      trace_id: input.trace_id,
      manifest_id: input.manifest_id,
      upstream_refs: [...s.lineage_refs.upstream_refs].sort(),
    },
    replay_identity_inputs: {
      subject_contract_version: s.subject_contract_version,
      schema_version: s.schema_version,
      as_of: s.as_of,
      scope_type: s.scope_type,
      scope_id: s.scope_id,
    },
  };
  return ok(instance);
}

function v(
  code: L7RuntimeViolationCode,
  s: L7ValidationSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L7RuntimeViolation {
  return {
    code,
    source: 'claim-assembly-engine',
    nodeId: null,
    validation_run_id: null,
    validation_subject_id: s.validation_subject_id,
    detail,
    context,
  };
}

function isSubjectScopeType(s: string): s is L7SubjectScopeType {
  return (
    s === 'ASSET' ||
    s === 'PROTOCOL' ||
    s === 'CHAIN' ||
    s === 'NARRATIVE_CLUSTER' ||
    s === 'PORTFOLIO' ||
    s === 'MARKET'
  );
}

/** §7.4.9.2 — Deterministic instance id. Same contract → same id. */
function buildInstanceId(s: L7ValidationSubjectContract): string {
  return `vsi:${s.validation_subject_id}:${s.subject_contract_version}:${s.as_of}`;
}
