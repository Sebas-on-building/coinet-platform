/**
 * L10.9 — Layer 10 Completion Validator
 *
 * §10.9.4 / §10.9.13 INV-10.9-A — Machine-enforced validator fed by
 * L10.1–L10.8 certification outputs. Computes per-dimension and
 * overall `L10CompletionState`.
 *
 * Implements the §10.9.15 hard completion rule: L10 is complete only
 * when hypothesis subjects and outputs are contract-complete, runtime
 * is deterministic, evidence semantics are legal, family templates
 * are governed, confidence/restriction/readiness posture is bounded,
 * outputs persist only through L5, read surfaces exist for higher
 * layers, replay and repair are safe, and all certification bands
 * are green.
 */

import {
  ALL_L10_COMPLETION_DIMENSIONS,
  L10CompletionDimension,
  L10CompletionEvaluation,
  L10CompletionState,
  L10DimensionEvaluation,
  L10RatificationViolationCode,
} from '../contracts/l10-completion-standard';
import {
  L10_DEFINITION_SURFACE,
  L10_EXECUTION_SEQUENCE,
  L10_REQUIRED_SUBLAYERS,
} from '../contracts/l10-final-definition';

/**
 * Evidence fed into the validator. Each field maps to a required
 * completion bullet from §10.9.4.3.
 */
export interface L10CompletionEvidence {
  readonly sublayer_certifications: Readonly<Record<string, {
    readonly certified: boolean;
    readonly level:
      | 'FAILED'
      | 'CONSTITUTIONAL_GREEN'
      | 'RUNTIME_GREEN'
      | 'PRODUCTION_GREEN';
    readonly blocking_violations: readonly string[];
  }>>;
  readonly invariants_all_green: boolean;

  // constitutional (L10.1/L10.2/L10.6)
  readonly mission_boundary_frozen: boolean;
  readonly object_model_frozen: boolean;
  readonly family_template_law_frozen: boolean;
  readonly no_ungoverned_hypothesis_path: boolean;
  readonly no_judgment_scenario_scoring_recommendation_semantics: boolean;
  readonly l7_posture_consumed_not_laundered: boolean;
  readonly l8_posture_consumed_not_laundered: boolean;
  readonly l9_posture_consumed_not_laundered: boolean;
  readonly no_single_story_collapse: boolean;

  // runtime (L10.3/L10.4/L10.5/L10.7)
  readonly subject_contracts_legal: boolean;
  readonly output_contracts_complete: boolean;
  readonly runtime_deterministic: boolean;
  readonly evidence_semantics_legal: boolean;
  readonly confidence_cap_bound: boolean;
  readonly restriction_rights_explicit: boolean;
  readonly readiness_explicit: boolean;
  readonly spread_preserved: boolean;

  // persistence (L10.8)
  readonly l5_only_persistence_authority: boolean;
  readonly postgres_only_current_authority: boolean;
  readonly historical_append_safe: boolean;
  readonly evidence_archive_linked: boolean;
  readonly lineage_complete_replay_compatible: boolean;
  readonly replay_repair_meaning_preserved: boolean;

  // serving (L10.8 read surfaces + downstream)
  readonly read_surfaces_governed: boolean;
  readonly read_modes_validated: boolean;
  readonly no_raw_store_bypass: boolean;
  readonly stable_handoff_surfaces_declared: boolean;
  readonly forbidden_downstream_access_rejected: boolean;
  readonly internal_surfaces_not_exposed: boolean;
  readonly no_rebuild_law_enforced: boolean;

  // closure cross-cuts
  readonly no_critical_observability_breach: boolean;
  readonly repair_instability_resolved: boolean;
  readonly downstream_dependency_safe: boolean;

  // consistency with §10.9.3 / INV-10.9-D / INV-10.9-G
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}

export class Layer10CompletionValidator {
  validate(ev: L10CompletionEvidence): L10CompletionEvaluation {
    const dimEvals: L10DimensionEvaluation[] =
      ALL_L10_COMPLETION_DIMENSIONS.map(d =>
        this.evaluateDimension(d, ev));

    const allDimsSatisfied = dimEvals.every(d => d.satisfied);
    const constitutional = dimEvals.find(
      d => d.dimension === L10CompletionDimension.CONSTITUTIONAL,
    )!.satisfied;
    const runtime = dimEvals.find(
      d => d.dimension === L10CompletionDimension.RUNTIME,
    )!.satisfied;

    let state: L10CompletionState;
    if (allDimsSatisfied) state = L10CompletionState.L10_PRODUCTION_READY;
    else if (constitutional && runtime)
      state = L10CompletionState.L10_CONSTITUTIONALLY_READY;
    else state = L10CompletionState.L10_NOT_READY;

    const violations: L10RatificationViolationCode[] = [];
    for (const d of dimEvals) violations.push(...d.violations);

    if (!ev.stable_handoff_surfaces_declared) {
      violations.push(L10RatificationViolationCode.MISSING_HANDOFF_SURFACE);
      if (state === L10CompletionState.L10_PRODUCTION_READY)
        state = L10CompletionState.L10_CONSTITUTIONALLY_READY;
    }
    if (!ev.downstream_dependency_safe) {
      violations.push(
        L10RatificationViolationCode.DOWNSTREAM_DEPENDENCY_UNSAFE);
      if (state === L10CompletionState.L10_PRODUCTION_READY)
        state = L10CompletionState.L10_CONSTITUTIONALLY_READY;
    }
    if (!ev.no_critical_observability_breach) {
      violations.push(
        L10RatificationViolationCode.CRITICAL_OBSERVABILITY_BREACH);
      if (state === L10CompletionState.L10_PRODUCTION_READY)
        state = L10CompletionState.L10_CONSTITUTIONALLY_READY;
    }
    if (!ev.repair_instability_resolved) {
      violations.push(
        L10RatificationViolationCode.UNRESOLVED_REPAIR_INSTABILITY);
      if (state === L10CompletionState.L10_PRODUCTION_READY)
        state = L10CompletionState.L10_CONSTITUTIONALLY_READY;
    }

    if (!this.surfaceMatches(
        ev.final_definition_surface, L10_DEFINITION_SURFACE)) {
      violations.push(
        L10RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION);
      if (state === L10CompletionState.L10_PRODUCTION_READY)
        state = L10CompletionState.L10_CONSTITUTIONALLY_READY;
    }
    if (!this.sequenceMatches(
        ev.execution_sequence, L10_EXECUTION_SEQUENCE)) {
      violations.push(
        L10RatificationViolationCode.EXECUTION_ORDER_VIOLATION);
      if (state === L10CompletionState.L10_PRODUCTION_READY)
        state = L10CompletionState.L10_CONSTITUTIONALLY_READY;
    }

    return {
      overall_state: state,
      dimensions: dimEvals,
      violations,
    };
  }

  private evaluateDimension(
    d: L10CompletionDimension,
    ev: L10CompletionEvidence,
  ): L10DimensionEvaluation {
    switch (d) {
      case L10CompletionDimension.CONSTITUTIONAL:
        return this.evalConstitutional(ev);
      case L10CompletionDimension.RUNTIME:
        return this.evalRuntime(ev);
      case L10CompletionDimension.PERSISTENCE:
        return this.evalPersistence(ev);
      case L10CompletionDimension.SERVING:
        return this.evalServing(ev);
    }
  }

  private evalConstitutional(
    ev: L10CompletionEvidence,
  ): L10DimensionEvaluation {
    const violations: L10RatificationViolationCode[] = [];
    const notes: string[] = [];

    for (const sl of L10_REQUIRED_SUBLAYERS) {
      const cert = ev.sublayer_certifications[sl];
      if (!cert) {
        violations.push(L10RatificationViolationCode.MISSING_SUBLAYER);
        notes.push(`missing sublayer: ${sl}`);
        continue;
      }
      if (!cert.certified) {
        violations.push(L10RatificationViolationCode.SUBLAYER_CERT_FAILED);
        notes.push(`sublayer not certified: ${sl}`);
      }
      if (cert.level !== 'PRODUCTION_GREEN') {
        violations.push(
          L10RatificationViolationCode.CERTIFICATION_NOT_GREEN);
        notes.push(`sublayer not production-green: ${sl} (${cert.level})`);
      }
    }

    if (!ev.invariants_all_green) {
      violations.push(L10RatificationViolationCode.INVARIANT_FAILED);
      notes.push('one or more sublayer invariants failed');
    }

    const constitutionalChecks: [boolean, string][] = [
      [ev.mission_boundary_frozen,
        'L10.1 mission/boundary not frozen'],
      [ev.object_model_frozen,
        'L10.2 hypothesis object model not frozen'],
      [ev.family_template_law_frozen,
        'L10.6 family/template/rollout law not frozen'],
      [ev.no_ungoverned_hypothesis_path,
        'ungoverned hypothesis path present'],
      [ev.no_judgment_scenario_scoring_recommendation_semantics,
        'judgment/scenario/scoring/recommendation semantics leaked ' +
          'into L10'],
      [ev.l7_posture_consumed_not_laundered,
        'L7 contradiction/restriction posture laundered'],
      [ev.l8_posture_consumed_not_laundered,
        'L8 regime posture laundered'],
      [ev.l9_posture_consumed_not_laundered,
        'L9 sequence posture laundered'],
      [ev.no_single_story_collapse,
        'single-story collapse permitted'],
    ];
    for (const [ok, msg] of constitutionalChecks) {
      if (!ok) {
        violations.push(
          L10RatificationViolationCode.CONSTITUTIONAL_INCOMPLETE);
        notes.push(msg);
      }
    }

    return {
      dimension: L10CompletionDimension.CONSTITUTIONAL,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalRuntime(ev: L10CompletionEvidence): L10DimensionEvaluation {
    const violations: L10RatificationViolationCode[] = [];
    const notes: string[] = [];
    const checks: [boolean, string][] = [
      [ev.subject_contracts_legal,
        'hypothesis subject contracts illegal'],
      [ev.output_contracts_complete,
        'hypothesis output contracts incomplete'],
      [ev.runtime_deterministic, 'hypothesis runtime not deterministic'],
      [ev.evidence_semantics_legal,
        'evidence semantics (support/contradiction/confirmation/' +
          'invalidation/shift-condition) illegal'],
      [ev.confidence_cap_bound, 'hypothesis confidence not cap-bound'],
      [ev.restriction_rights_explicit,
        'restriction rights not explicit/queryable'],
      [ev.readiness_explicit, 'readiness not explicit/queryable'],
      [ev.spread_preserved,
        'spread between primary/secondary not preserved'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(L10RatificationViolationCode.RUNTIME_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L10CompletionDimension.RUNTIME,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalPersistence(
    ev: L10CompletionEvidence,
  ): L10DimensionEvaluation {
    const violations: L10RatificationViolationCode[] = [];
    const notes: string[] = [];
    const checks: [boolean, string][] = [
      [ev.l5_only_persistence_authority,
        'persistence not routed through L5 only'],
      [ev.postgres_only_current_authority,
        'current authority not Postgres-only'],
      [ev.historical_append_safe,
        'historical surfaces not append-safe / replay-identity-bearing'],
      [ev.evidence_archive_linked,
        'evidence archive not linked / checksum missing'],
      [ev.lineage_complete_replay_compatible,
        'lineage incomplete or replay-incompatible'],
      [ev.replay_repair_meaning_preserved,
        'replay/repair does not preserve hypothesis meaning or mark ' +
          'divergence'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(
          L10RatificationViolationCode
            .PERSISTENCE_CONSTITUTION_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L10CompletionDimension.PERSISTENCE,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalServing(ev: L10CompletionEvidence): L10DimensionEvaluation {
    const violations: L10RatificationViolationCode[] = [];
    const notes: string[] = [];
    const checks: [boolean, string][] = [
      [ev.read_surfaces_governed, 'read surfaces not governed'],
      [ev.read_modes_validated, 'read modes not validated'],
      [ev.no_raw_store_bypass, 'raw-store bypass available'],
      [ev.forbidden_downstream_access_rejected,
        'forbidden downstream access kinds not rejected'],
      [ev.internal_surfaces_not_exposed,
        'internal runtime surfaces exposed as dependencies'],
      [ev.no_rebuild_law_enforced,
        'later-layer rebuild from L6/L7/L8/L9 not prevented'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(L10RatificationViolationCode.SERVING_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L10CompletionDimension.SERVING,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private surfaceMatches(
    observed: readonly string[],
    expected: readonly string[],
  ): boolean {
    if (observed.length !== expected.length) return false;
    for (let i = 0; i < expected.length; i++) {
      if (observed[i] !== expected[i]) return false;
    }
    return true;
  }

  private sequenceMatches(
    observed: readonly string[],
    expected: readonly string[],
  ): boolean {
    return this.surfaceMatches(observed, expected);
  }
}
