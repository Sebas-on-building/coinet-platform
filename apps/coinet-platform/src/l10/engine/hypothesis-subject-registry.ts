/**
 * L10.4 — HypothesisSubjectRegistry
 *
 * §10.4.5 — The sole authority for admitting subject contracts into an
 * L10 run. Every subject must pass this registry before assembly; any
 * field leak, unregistered class/family, or illegal scope is refused.
 *
 * §10.4.16 — Exclusive-ownership law: no other engine may register,
 * validate, or revoke subjects. The registry is pure — it owns a
 * `Map` of accepted contracts and rejects mutations from other layers.
 */

import type {
  L10HypothesisSubjectContract,
} from '../contracts/hypothesis-subject.contract';
import { containsL10ForbiddenNaming } from '../contracts/l10-boundary';
import {
  L10HypothesisSubjectClassRegistry,
  getDefaultL10HypothesisSubjectClassRegistry,
} from '../registry/hypothesis-subject-class.registry';
import {
  L10HypothesisFamilyRegistry,
  getDefaultL10HypothesisFamilyRegistry,
} from '../registry/hypothesis-family.registry';
import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';
import { L10EngineResult, fail, ok } from './engine-types';

export class HypothesisSubjectRegistry {
  private readonly admitted = new Map<string, L10HypothesisSubjectContract>();

  constructor(
    private readonly subjectClassRegistry: L10HypothesisSubjectClassRegistry =
      getDefaultL10HypothesisSubjectClassRegistry(),
    private readonly familyRegistry: L10HypothesisFamilyRegistry =
      getDefaultL10HypothesisFamilyRegistry(),
  ) {}

  admit(
    subject: L10HypothesisSubjectContract,
  ): L10EngineResult<L10HypothesisSubjectContract> {
    const vs = this.classify(subject);
    if (vs.length > 0) return fail(vs);
    this.admitted.set(subject.hypothesis_subject_id, subject);
    return ok(subject);
  }

  get(id: string): L10HypothesisSubjectContract | undefined {
    return this.admitted.get(id);
  }

  size(): number {
    return this.admitted.size;
  }

  list(): readonly L10HypothesisSubjectContract[] {
    return Array.from(this.admitted.values());
  }

  private classify(
    s: L10HypothesisSubjectContract,
  ): L10RuntimeViolation[] {
    const violations: L10RuntimeViolation[] = [];
    const ctx: Record<string, unknown> = {
      hypothesis_subject_id: s.hypothesis_subject_id,
      subject_class: s.subject_class,
    };
    const v = (
      code: L10RuntimeViolationCode,
      detail: string,
    ): L10RuntimeViolation => ({
      code,
      source: 'HypothesisSubjectRegistry.admit',
      nodeId: null,
      hypothesis_run_id: null,
      hypothesis_subject_id: s.hypothesis_subject_id ?? null,
      hypothesis_candidate_id: null,
      detail,
      context: ctx,
    });

    if (!this.subjectClassRegistry.has(s.subject_class)) {
      violations.push(v(
        L10RuntimeViolationCode.ASSEMBLY_UNREGISTERED_SUBJECT_CLASS,
        `subject_class ${s.subject_class} not registered`,
      ));
    } else if (!this.subjectClassRegistry.allowsScope(
      s.subject_class, s.scope_type,
    )) {
      violations.push(v(
        L10RuntimeViolationCode.ASSEMBLY_ILLEGAL_SCOPE_BINDING,
        `scope_type ${s.scope_type} illegal for ${s.subject_class}`,
      ));
    }

    for (const f of s.hypothesis_family_set ?? []) {
      if (!this.familyRegistry.has(f)) {
        violations.push(v(
          L10RuntimeViolationCode.ASSEMBLY_UNREGISTERED_FAMILY,
          `family ${f} not registered`,
        ));
        continue;
      }
      if (!this.familyRegistry.allowsScope(f, s.scope_type)) {
        violations.push(v(
          L10RuntimeViolationCode.ASSEMBLY_FAMILY_SCOPE_ILLEGAL,
          `family ${f} not legal on scope ${s.scope_type}`,
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

    return violations;
  }
}
