/**
 * L6.9 — Layer 6 Completion Validator
 *
 * §6.9.3.7 — Machine-enforced validator fed by L6.1–L6.8 certification
 * outputs. Computes per-dimension and overall `L6CompletionState`.
 */

import {
  ALL_COMPLETION_DIMENSIONS,
  L6CompletionDimension,
  L6CompletionEvaluation,
  L6CompletionState,
  L6DimensionEvaluation,
  L6RatificationViolationCode,
} from '../contracts/l6-completion-standard';
import {
  L6_DEFINITION_SURFACE,
  L6_EXECUTION_SEQUENCE,
  REQUIRED_SUBLAYERS,
} from '../contracts/l6-final-definition';

/**
 * Evidence fed into the validator. Each field maps to a required
 * completion bullet from §6.9.3.3–§6.9.3.6.
 */
export interface L6CompletionEvidence {
  // constitutional
  readonly sublayer_certifications: Readonly<Record<string, {
    readonly certified: boolean;
    readonly level: 'FAILED' | 'CONSTITUTIONAL_GREEN' | 'RUNTIME_GREEN' | 'PRODUCTION_GREEN';
    readonly blocking_violations: readonly string[];
  }>>;
  readonly invariants_all_green: boolean;
  readonly architectural_ambiguity_resolved: boolean;
  readonly governed_primitive_paths_only: boolean;
  readonly current_history_evidence_authority_defined: boolean;
  readonly late_data_and_replay_unambiguous: boolean;
  readonly family_legality_resolved: boolean;

  // functional
  readonly all_feature_families_registered: boolean;
  readonly all_event_families_registered: boolean;
  readonly feature_current_history_aligned: boolean;
  readonly event_current_history_aligned: boolean;
  readonly evidence_packs_for_material_outputs: boolean;
  readonly read_surfaces_active: boolean;

  // operational
  readonly runtime_deterministic: boolean;
  readonly compute_dag_acyclic: boolean;
  readonly replay_safe: boolean;
  readonly repair_safe: boolean;
  readonly late_data_policy_enforced: boolean;
  readonly no_shadow_authority: boolean;
  readonly observability_slo_complete: boolean;
  readonly rollback_migration_discipline: boolean;
  readonly no_critical_assurance_band_failures: boolean;

  // dependency
  readonly later_layers_can_consume_current_snapshot: boolean;
  readonly later_layers_can_consume_active_events: boolean;
  readonly later_layers_can_consume_history_and_evidence: boolean;
  readonly ad_hoc_recompute_forbidden_outside_replay_repair: boolean;
  readonly outputs_stable_for_frozen_dependency: boolean;

  // consistency with §6.9.2 / INV-6.9-F / INV-6.9-G
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}

export class Layer6CompletionValidator {
  validate(ev: L6CompletionEvidence): L6CompletionEvaluation {
    const dimEvals: L6DimensionEvaluation[] = ALL_COMPLETION_DIMENSIONS.map(d =>
      this.evaluateDimension(d, ev),
    );

    const allDimsSatisfied = dimEvals.every(d => d.satisfied);
    const constitutional = dimEvals.find(d => d.dimension === L6CompletionDimension.CONSTITUTIONAL)!.satisfied;

    let state: L6CompletionState;
    if (allDimsSatisfied) state = L6CompletionState.L6_PRODUCTION_READY;
    else if (constitutional) state = L6CompletionState.L6_CONSTITUTIONALLY_READY;
    else state = L6CompletionState.L6_NOT_READY;

    const violations: L6RatificationViolationCode[] = [];
    for (const d of dimEvals) violations.push(...d.violations);

    // Consistency vs. §6.9.2 and §6.9.7
    if (!this.surfaceMatches(ev.final_definition_surface, L6_DEFINITION_SURFACE)) {
      violations.push(L6RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION);
      // contradicting final definition downgrades state
      if (state === L6CompletionState.L6_PRODUCTION_READY) state = L6CompletionState.L6_CONSTITUTIONALLY_READY;
    }
    if (!this.sequenceMatches(ev.execution_sequence, L6_EXECUTION_SEQUENCE)) {
      violations.push(L6RatificationViolationCode.EXECUTION_ORDER_VIOLATION);
      if (state === L6CompletionState.L6_PRODUCTION_READY) state = L6CompletionState.L6_CONSTITUTIONALLY_READY;
    }

    return {
      overall_state: state,
      dimensions: dimEvals,
      violations,
    };
  }

  private evaluateDimension(
    d: L6CompletionDimension,
    ev: L6CompletionEvidence,
  ): L6DimensionEvaluation {
    switch (d) {
      case L6CompletionDimension.CONSTITUTIONAL:
        return this.evalConstitutional(ev);
      case L6CompletionDimension.FUNCTIONAL:
        return this.evalFunctional(ev);
      case L6CompletionDimension.OPERATIONAL:
        return this.evalOperational(ev);
      case L6CompletionDimension.DEPENDENCY:
        return this.evalDependency(ev);
    }
  }

  private evalConstitutional(ev: L6CompletionEvidence): L6DimensionEvaluation {
    const violations: L6RatificationViolationCode[] = [];
    const notes: string[] = [];

    for (const sl of REQUIRED_SUBLAYERS) {
      const cert = ev.sublayer_certifications[sl];
      if (!cert) {
        violations.push(L6RatificationViolationCode.MISSING_SUBLAYER);
        notes.push(`missing sublayer: ${sl}`);
        continue;
      }
      if (!cert.certified) {
        violations.push(L6RatificationViolationCode.SUBLAYER_CERT_FAILED);
        notes.push(`sublayer not certified: ${sl}`);
      }
    }

    if (!ev.invariants_all_green) {
      violations.push(L6RatificationViolationCode.INVARIANT_FAILED);
      notes.push('one or more sublayer invariants failed');
    }
    if (!ev.architectural_ambiguity_resolved) {
      violations.push(L6RatificationViolationCode.CONSTITUTIONAL_INCOMPLETE);
      notes.push('architectural ambiguity unresolved');
    }
    if (!ev.governed_primitive_paths_only) {
      violations.push(L6RatificationViolationCode.CONSTITUTIONAL_INCOMPLETE);
      notes.push('ungoverned primitive path present');
    }
    if (!ev.current_history_evidence_authority_defined) {
      violations.push(L6RatificationViolationCode.CONSTITUTIONAL_INCOMPLETE);
      notes.push('authority undefined for current/history/evidence');
    }
    if (!ev.late_data_and_replay_unambiguous) {
      violations.push(L6RatificationViolationCode.CONSTITUTIONAL_INCOMPLETE);
      notes.push('ambiguous late-data or replay behavior');
    }
    if (!ev.family_legality_resolved) {
      violations.push(L6RatificationViolationCode.CONSTITUTIONAL_INCOMPLETE);
      notes.push('unresolved family legality');
    }

    return {
      dimension: L6CompletionDimension.CONSTITUTIONAL,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalFunctional(ev: L6CompletionEvidence): L6DimensionEvaluation {
    const violations: L6RatificationViolationCode[] = [];
    const notes: string[] = [];

    const checks: [boolean, string][] = [
      [ev.all_feature_families_registered, 'not all feature families registered'],
      [ev.all_event_families_registered, 'not all event families registered'],
      [ev.feature_current_history_aligned, 'feature current/history misaligned'],
      [ev.event_current_history_aligned, 'event current/history misaligned'],
      [ev.evidence_packs_for_material_outputs, 'evidence packs missing for material outputs'],
      [ev.read_surfaces_active, 'read surfaces not active'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(L6RatificationViolationCode.FUNCTIONAL_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L6CompletionDimension.FUNCTIONAL,
      satisfied: violations.length === 0,
      violations, notes,
    };
  }

  private evalOperational(ev: L6CompletionEvidence): L6DimensionEvaluation {
    const violations: L6RatificationViolationCode[] = [];
    const notes: string[] = [];

    if (!ev.no_critical_assurance_band_failures) {
      violations.push(L6RatificationViolationCode.OPERATIONAL_INCOMPLETE);
      notes.push('critical assurance-band failures');
    }
    if (!ev.observability_slo_complete) {
      violations.push(L6RatificationViolationCode.CRITICAL_OBSERVABILITY_BREACH);
      notes.push('observability/SLO coverage incomplete');
    }
    const opChecks: [boolean, string][] = [
      [ev.runtime_deterministic, 'runtime not deterministic'],
      [ev.compute_dag_acyclic, 'compute DAG not acyclic'],
      [ev.replay_safe, 'replay not safe'],
      [ev.repair_safe, 'repair not safe'],
      [ev.late_data_policy_enforced, 'late-data policy not enforced'],
      [ev.no_shadow_authority, 'shadow authority present'],
      [ev.rollback_migration_discipline, 'rollback/migration discipline missing'],
    ];
    for (const [ok, msg] of opChecks) {
      if (!ok) {
        violations.push(L6RatificationViolationCode.OPERATIONAL_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L6CompletionDimension.OPERATIONAL,
      satisfied: violations.length === 0,
      violations, notes,
    };
  }

  private evalDependency(ev: L6CompletionEvidence): L6DimensionEvaluation {
    const violations: L6RatificationViolationCode[] = [];
    const notes: string[] = [];

    const depChecks: [boolean, string][] = [
      [ev.later_layers_can_consume_current_snapshot, 'current snapshot surface not consumable'],
      [ev.later_layers_can_consume_active_events, 'active events surface not consumable'],
      [ev.later_layers_can_consume_history_and_evidence, 'history/evidence surfaces not consumable'],
      [ev.ad_hoc_recompute_forbidden_outside_replay_repair, 'ad hoc recompute not constrained'],
      [ev.outputs_stable_for_frozen_dependency, 'outputs not stable enough to freeze'],
    ];
    for (const [ok, msg] of depChecks) {
      if (!ok) {
        violations.push(L6RatificationViolationCode.DEPENDENCY_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L6CompletionDimension.DEPENDENCY,
      satisfied: violations.length === 0,
      violations, notes,
    };
  }

  private surfaceMatches(observed: readonly string[], expected: readonly string[]): boolean {
    if (observed.length !== expected.length) return false;
    for (let i = 0; i < expected.length; i++) {
      if (observed[i] !== expected[i]) return false;
    }
    return true;
  }

  private sequenceMatches(observed: readonly string[], expected: readonly string[]): boolean {
    return this.surfaceMatches(observed, expected);
  }
}
