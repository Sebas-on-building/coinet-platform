/**
 * L8.9 — Layer 8 Completion Validator
 *
 * §8.9.3 / §8.9.9.1 INV-8.9-A — Machine-enforced validator fed by
 * L8.1–L8.8 certification outputs. Computes per-dimension and overall
 * `L8CompletionState`.
 *
 * Implements the §8.9.3 hard completion rule: L8 is complete only when
 * regime subjects and outputs are contract-complete, runtime is
 * deterministic, input consumption is legal, family templates are
 * governed, confidence/transition/multiplier posture is bounded,
 * outputs persist only through L5, read surfaces exist for higher
 * layers, replay and repair are safe, and all certification bands
 * are green.
 */

import {
  ALL_L8_COMPLETION_DIMENSIONS,
  L8CompletionDimension,
  L8CompletionEvaluation,
  L8CompletionState,
  L8DimensionEvaluation,
  L8RatificationViolationCode,
} from '../contracts/l8-completion-standard';
import {
  L8_DEFINITION_SURFACE,
  L8_EXECUTION_SEQUENCE,
  L8_REQUIRED_SUBLAYERS,
} from '../contracts/l8-final-definition';

/**
 * Evidence fed into the validator. Each field maps to a required
 * completion bullet from §8.9.3.2.
 */
export interface L8CompletionEvidence {
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

  // constitutional (L8.1/L8.2/L8.5/L8.6)
  readonly mission_boundary_frozen: boolean;
  readonly regime_family_law_frozen: boolean;
  readonly input_admissibility_frozen: boolean;
  readonly template_law_frozen: boolean;
  readonly no_ungoverned_regime_path: boolean;
  readonly no_judgment_scenario_scoring_semantics: boolean;
  readonly posture_consumed_not_laundered: boolean;

  // runtime (L8.3/L8.4/L8.7)
  readonly subject_contracts_legal: boolean;
  readonly output_contracts_complete: boolean;
  readonly runtime_deterministic: boolean;
  readonly confidence_cap_bound: boolean;
  readonly transition_independent_of_confidence: boolean;
  readonly multipliers_interpretive_only: boolean;
  readonly cap_chains_explicit: boolean;

  // persistence (L8.8)
  readonly l5_only_persistence_authority: boolean;
  readonly postgres_only_current_authority: boolean;
  readonly historical_append_safe: boolean;
  readonly evidence_archive_linked: boolean;
  readonly lineage_complete_replay_compatible: boolean;
  readonly replay_repair_meaning_preserved: boolean;

  // serving (L8.8 read surfaces + downstream)
  readonly read_surfaces_governed: boolean;
  readonly read_modes_validated: boolean;
  readonly no_raw_store_bypass: boolean;
  readonly stable_handoff_surfaces_declared: boolean;
  readonly forbidden_downstream_access_rejected: boolean;
  readonly internal_surfaces_not_exposed: boolean;

  // closure cross-cuts
  readonly no_critical_observability_breach: boolean;
  readonly repair_instability_resolved: boolean;
  readonly downstream_dependency_safe: boolean;

  // consistency with §8.9.3 / INV-8.9-F / INV-8.9-G
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}

export class Layer8CompletionValidator {
  validate(ev: L8CompletionEvidence): L8CompletionEvaluation {
    const dimEvals: L8DimensionEvaluation[] =
      ALL_L8_COMPLETION_DIMENSIONS.map(d => this.evaluateDimension(d, ev));

    const allDimsSatisfied = dimEvals.every(d => d.satisfied);
    const constitutional =
      dimEvals.find(d => d.dimension === L8CompletionDimension.CONSTITUTIONAL)!
        .satisfied;
    const runtime =
      dimEvals.find(d => d.dimension === L8CompletionDimension.RUNTIME)!
        .satisfied;

    let state: L8CompletionState;
    if (allDimsSatisfied) state = L8CompletionState.L8_PRODUCTION_READY;
    else if (constitutional && runtime)
      state = L8CompletionState.L8_CONSTITUTIONALLY_READY;
    else state = L8CompletionState.L8_NOT_READY;

    const violations: L8RatificationViolationCode[] = [];
    for (const d of dimEvals) violations.push(...d.violations);

    if (!ev.stable_handoff_surfaces_declared) {
      violations.push(L8RatificationViolationCode.MISSING_HANDOFF_SURFACE);
      if (state === L8CompletionState.L8_PRODUCTION_READY)
        state = L8CompletionState.L8_CONSTITUTIONALLY_READY;
    }
    if (!ev.downstream_dependency_safe) {
      violations.push(
        L8RatificationViolationCode.DOWNSTREAM_DEPENDENCY_UNSAFE);
      if (state === L8CompletionState.L8_PRODUCTION_READY)
        state = L8CompletionState.L8_CONSTITUTIONALLY_READY;
    }
    if (!ev.no_critical_observability_breach) {
      violations.push(
        L8RatificationViolationCode.CRITICAL_OBSERVABILITY_BREACH);
      if (state === L8CompletionState.L8_PRODUCTION_READY)
        state = L8CompletionState.L8_CONSTITUTIONALLY_READY;
    }
    if (!ev.repair_instability_resolved) {
      violations.push(
        L8RatificationViolationCode.UNRESOLVED_REPAIR_INSTABILITY);
      if (state === L8CompletionState.L8_PRODUCTION_READY)
        state = L8CompletionState.L8_CONSTITUTIONALLY_READY;
    }

    // §8.9.3 / INV-8.9-F + INV-8.9-G consistency checks.
    if (!this.surfaceMatches(
        ev.final_definition_surface, L8_DEFINITION_SURFACE)) {
      violations.push(
        L8RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION);
      if (state === L8CompletionState.L8_PRODUCTION_READY)
        state = L8CompletionState.L8_CONSTITUTIONALLY_READY;
    }
    if (!this.sequenceMatches(
        ev.execution_sequence, L8_EXECUTION_SEQUENCE)) {
      violations.push(L8RatificationViolationCode.EXECUTION_ORDER_VIOLATION);
      if (state === L8CompletionState.L8_PRODUCTION_READY)
        state = L8CompletionState.L8_CONSTITUTIONALLY_READY;
    }

    return {
      overall_state: state,
      dimensions: dimEvals,
      violations,
    };
  }

  private evaluateDimension(
    d: L8CompletionDimension,
    ev: L8CompletionEvidence,
  ): L8DimensionEvaluation {
    switch (d) {
      case L8CompletionDimension.CONSTITUTIONAL:
        return this.evalConstitutional(ev);
      case L8CompletionDimension.RUNTIME:
        return this.evalRuntime(ev);
      case L8CompletionDimension.PERSISTENCE:
        return this.evalPersistence(ev);
      case L8CompletionDimension.SERVING:
        return this.evalServing(ev);
    }
  }

  private evalConstitutional(
    ev: L8CompletionEvidence,
  ): L8DimensionEvaluation {
    const violations: L8RatificationViolationCode[] = [];
    const notes: string[] = [];

    for (const sl of L8_REQUIRED_SUBLAYERS) {
      const cert = ev.sublayer_certifications[sl];
      if (!cert) {
        violations.push(L8RatificationViolationCode.MISSING_SUBLAYER);
        notes.push(`missing sublayer: ${sl}`);
        continue;
      }
      if (!cert.certified) {
        violations.push(L8RatificationViolationCode.SUBLAYER_CERT_FAILED);
        notes.push(`sublayer not certified: ${sl}`);
      }
      if (cert.level !== 'PRODUCTION_GREEN') {
        violations.push(L8RatificationViolationCode.CERTIFICATION_NOT_GREEN);
        notes.push(`sublayer not production-green: ${sl} (${cert.level})`);
      }
    }

    if (!ev.invariants_all_green) {
      violations.push(L8RatificationViolationCode.INVARIANT_FAILED);
      notes.push('one or more sublayer invariants failed');
    }

    const constitutionalChecks: [boolean, string][] = [
      [ev.mission_boundary_frozen, 'L8.1 mission/boundary not frozen'],
      [ev.regime_family_law_frozen, 'L8.2 regime family/class/coexistence ' +
        'law not frozen'],
      [ev.input_admissibility_frozen, 'L8.5 input admissibility law ' +
        'not frozen'],
      [ev.template_law_frozen, 'L8.6 template/rollout law not frozen'],
      [ev.no_ungoverned_regime_path, 'ungoverned regime path present'],
      [ev.no_judgment_scenario_scoring_semantics,
        'judgment/scenario/scoring semantics leaked into L8'],
      [ev.posture_consumed_not_laundered,
        'ambiguity/contradiction/restriction posture laundered'],
    ];
    for (const [ok, msg] of constitutionalChecks) {
      if (!ok) {
        violations.push(L8RatificationViolationCode.CONSTITUTIONAL_INCOMPLETE);
        notes.push(msg);
      }
    }

    return {
      dimension: L8CompletionDimension.CONSTITUTIONAL,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalRuntime(ev: L8CompletionEvidence): L8DimensionEvaluation {
    const violations: L8RatificationViolationCode[] = [];
    const notes: string[] = [];
    const checks: [boolean, string][] = [
      [ev.subject_contracts_legal, 'regime subject contracts illegal'],
      [ev.output_contracts_complete, 'regime output contracts incomplete'],
      [ev.runtime_deterministic, 'regime runtime not deterministic'],
      [ev.confidence_cap_bound, 'confidence not cap-bound'],
      [ev.transition_independent_of_confidence,
        'transition risk collapsed into confidence'],
      [ev.multipliers_interpretive_only,
        'multipliers acting as determinative'],
      [ev.cap_chains_explicit, 'cap chains not explicit/queryable'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(L8RatificationViolationCode.RUNTIME_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L8CompletionDimension.RUNTIME,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalPersistence(
    ev: L8CompletionEvidence,
  ): L8DimensionEvaluation {
    const violations: L8RatificationViolationCode[] = [];
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
        'replay/repair does not preserve regime meaning or mark ' +
          'divergence'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(
          L8RatificationViolationCode.PERSISTENCE_CONSTITUTION_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L8CompletionDimension.PERSISTENCE,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalServing(ev: L8CompletionEvidence): L8DimensionEvaluation {
    const violations: L8RatificationViolationCode[] = [];
    const notes: string[] = [];
    const checks: [boolean, string][] = [
      [ev.read_surfaces_governed, 'read surfaces not governed'],
      [ev.read_modes_validated, 'read modes not validated'],
      [ev.no_raw_store_bypass, 'raw-store bypass available'],
      [ev.forbidden_downstream_access_rejected,
        'forbidden downstream access kinds not rejected'],
      [ev.internal_surfaces_not_exposed,
        'internal runtime surfaces exposed as dependencies'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(L8RatificationViolationCode.SERVING_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L8CompletionDimension.SERVING,
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
