/**
 * L9.9 — Layer 9 Completion Validator
 *
 * §9.9.5 / §9.9.4.1 INV-9.9-A — Machine-enforced validator fed by
 * L9.1–L9.8 certification outputs. Computes per-dimension and overall
 * `L9CompletionState`.
 *
 * Implements the §9.9.5 hard completion rule: L9 is complete only when
 * sequence subjects and outputs are contract-complete, runtime is
 * deterministic, temporal semantics are legal, family templates are
 * governed, confidence/restriction/causal-restraint posture is
 * bounded, outputs persist only through L5, read surfaces exist for
 * higher layers, replay and repair are safe, and all certification
 * bands are green.
 */

import {
  ALL_L9_COMPLETION_DIMENSIONS,
  L9CompletionDimension,
  L9CompletionEvaluation,
  L9CompletionState,
  L9DimensionEvaluation,
  L9RatificationViolationCode,
} from '../contracts/l9-completion-standard';
import {
  L9_DEFINITION_SURFACE,
  L9_EXECUTION_SEQUENCE,
  L9_REQUIRED_SUBLAYERS,
} from '../contracts/l9-final-definition';

/**
 * Evidence fed into the validator. Each field maps to a required
 * completion bullet from §9.9.5.1–§9.9.5.4.
 */
export interface L9CompletionEvidence {
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

  // constitutional (L9.1/L9.2/L9.6)
  readonly mission_boundary_frozen: boolean;
  readonly sequence_family_law_frozen: boolean;
  readonly template_law_frozen: boolean;
  readonly no_ungoverned_sequence_path: boolean;
  readonly no_judgment_scenario_scoring_semantics: boolean;
  readonly posture_consumed_not_laundered: boolean;
  readonly no_causal_laundering: boolean;

  // runtime (L9.3/L9.4/L9.5/L9.7)
  readonly subject_contracts_legal: boolean;
  readonly output_contracts_complete: boolean;
  readonly runtime_deterministic: boolean;
  readonly temporal_semantics_legal: boolean;
  readonly confidence_cap_bound: boolean;
  readonly restriction_rights_explicit: boolean;
  readonly causal_restraint_explicit: boolean;

  // persistence (L9.8)
  readonly l5_only_persistence_authority: boolean;
  readonly postgres_only_current_authority: boolean;
  readonly historical_append_safe: boolean;
  readonly evidence_archive_linked: boolean;
  readonly lineage_complete_replay_compatible: boolean;
  readonly replay_repair_meaning_preserved: boolean;

  // serving (L9.8 read surfaces + downstream)
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

  // consistency with §9.9.1.2 / INV-9.9-D / INV-9.9-G
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}

export class Layer9CompletionValidator {
  validate(ev: L9CompletionEvidence): L9CompletionEvaluation {
    const dimEvals: L9DimensionEvaluation[] =
      ALL_L9_COMPLETION_DIMENSIONS.map(d => this.evaluateDimension(d, ev));

    const allDimsSatisfied = dimEvals.every(d => d.satisfied);
    const constitutional =
      dimEvals.find(d => d.dimension === L9CompletionDimension.CONSTITUTIONAL)!
        .satisfied;
    const runtime =
      dimEvals.find(d => d.dimension === L9CompletionDimension.RUNTIME)!
        .satisfied;

    let state: L9CompletionState;
    if (allDimsSatisfied) state = L9CompletionState.L9_PRODUCTION_READY;
    else if (constitutional && runtime)
      state = L9CompletionState.L9_CONSTITUTIONALLY_READY;
    else state = L9CompletionState.L9_NOT_READY;

    const violations: L9RatificationViolationCode[] = [];
    for (const d of dimEvals) violations.push(...d.violations);

    if (!ev.stable_handoff_surfaces_declared) {
      violations.push(L9RatificationViolationCode.MISSING_HANDOFF_SURFACE);
      if (state === L9CompletionState.L9_PRODUCTION_READY)
        state = L9CompletionState.L9_CONSTITUTIONALLY_READY;
    }
    if (!ev.downstream_dependency_safe) {
      violations.push(
        L9RatificationViolationCode.DOWNSTREAM_DEPENDENCY_UNSAFE);
      if (state === L9CompletionState.L9_PRODUCTION_READY)
        state = L9CompletionState.L9_CONSTITUTIONALLY_READY;
    }
    if (!ev.no_critical_observability_breach) {
      violations.push(
        L9RatificationViolationCode.CRITICAL_OBSERVABILITY_BREACH);
      if (state === L9CompletionState.L9_PRODUCTION_READY)
        state = L9CompletionState.L9_CONSTITUTIONALLY_READY;
    }
    if (!ev.repair_instability_resolved) {
      violations.push(
        L9RatificationViolationCode.UNRESOLVED_REPAIR_INSTABILITY);
      if (state === L9CompletionState.L9_PRODUCTION_READY)
        state = L9CompletionState.L9_CONSTITUTIONALLY_READY;
    }

    if (!this.surfaceMatches(
        ev.final_definition_surface, L9_DEFINITION_SURFACE)) {
      violations.push(
        L9RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION);
      if (state === L9CompletionState.L9_PRODUCTION_READY)
        state = L9CompletionState.L9_CONSTITUTIONALLY_READY;
    }
    if (!this.sequenceMatches(
        ev.execution_sequence, L9_EXECUTION_SEQUENCE)) {
      violations.push(L9RatificationViolationCode.EXECUTION_ORDER_VIOLATION);
      if (state === L9CompletionState.L9_PRODUCTION_READY)
        state = L9CompletionState.L9_CONSTITUTIONALLY_READY;
    }

    return {
      overall_state: state,
      dimensions: dimEvals,
      violations,
    };
  }

  private evaluateDimension(
    d: L9CompletionDimension,
    ev: L9CompletionEvidence,
  ): L9DimensionEvaluation {
    switch (d) {
      case L9CompletionDimension.CONSTITUTIONAL:
        return this.evalConstitutional(ev);
      case L9CompletionDimension.RUNTIME:
        return this.evalRuntime(ev);
      case L9CompletionDimension.PERSISTENCE:
        return this.evalPersistence(ev);
      case L9CompletionDimension.SERVING:
        return this.evalServing(ev);
    }
  }

  private evalConstitutional(
    ev: L9CompletionEvidence,
  ): L9DimensionEvaluation {
    const violations: L9RatificationViolationCode[] = [];
    const notes: string[] = [];

    for (const sl of L9_REQUIRED_SUBLAYERS) {
      const cert = ev.sublayer_certifications[sl];
      if (!cert) {
        violations.push(L9RatificationViolationCode.MISSING_SUBLAYER);
        notes.push(`missing sublayer: ${sl}`);
        continue;
      }
      if (!cert.certified) {
        violations.push(L9RatificationViolationCode.SUBLAYER_CERT_FAILED);
        notes.push(`sublayer not certified: ${sl}`);
      }
      if (cert.level !== 'PRODUCTION_GREEN') {
        violations.push(L9RatificationViolationCode.CERTIFICATION_NOT_GREEN);
        notes.push(`sublayer not production-green: ${sl} (${cert.level})`);
      }
    }

    if (!ev.invariants_all_green) {
      violations.push(L9RatificationViolationCode.INVARIANT_FAILED);
      notes.push('one or more sublayer invariants failed');
    }

    const constitutionalChecks: [boolean, string][] = [
      [ev.mission_boundary_frozen, 'L9.1 mission/boundary not frozen'],
      [ev.sequence_family_law_frozen,
        'L9.2 sequence family/state/coexistence law not frozen'],
      [ev.template_law_frozen, 'L9.6 template/rollout law not frozen'],
      [ev.no_ungoverned_sequence_path,
        'ungoverned sequence path present'],
      [ev.no_judgment_scenario_scoring_semantics,
        'judgment/scenario/scoring semantics leaked into L9'],
      [ev.posture_consumed_not_laundered,
        'contradiction/restriction/regime posture laundered'],
      [ev.no_causal_laundering,
        'causal certainty inferred from temporal adjacency'],
    ];
    for (const [ok, msg] of constitutionalChecks) {
      if (!ok) {
        violations.push(L9RatificationViolationCode.CONSTITUTIONAL_INCOMPLETE);
        notes.push(msg);
      }
    }

    return {
      dimension: L9CompletionDimension.CONSTITUTIONAL,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalRuntime(ev: L9CompletionEvidence): L9DimensionEvaluation {
    const violations: L9RatificationViolationCode[] = [];
    const notes: string[] = [];
    const checks: [boolean, string][] = [
      [ev.subject_contracts_legal, 'sequence subject contracts illegal'],
      [ev.output_contracts_complete, 'sequence output contracts incomplete'],
      [ev.runtime_deterministic, 'sequence runtime not deterministic'],
      [ev.temporal_semantics_legal,
        'temporal semantics (lead-lag/phase/change-point/decay/' +
          'post-event) illegal'],
      [ev.confidence_cap_bound, 'sequence confidence not cap-bound'],
      [ev.restriction_rights_explicit,
        'restriction rights not explicit/queryable'],
      [ev.causal_restraint_explicit,
        'causal restraint not explicit/queryable'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(L9RatificationViolationCode.RUNTIME_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L9CompletionDimension.RUNTIME,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalPersistence(
    ev: L9CompletionEvidence,
  ): L9DimensionEvaluation {
    const violations: L9RatificationViolationCode[] = [];
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
        'replay/repair does not preserve sequence meaning or mark ' +
          'divergence'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(
          L9RatificationViolationCode.PERSISTENCE_CONSTITUTION_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L9CompletionDimension.PERSISTENCE,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalServing(ev: L9CompletionEvidence): L9DimensionEvaluation {
    const violations: L9RatificationViolationCode[] = [];
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
        'later-layer rebuild from L6/L7/L8 not prevented'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(L9RatificationViolationCode.SERVING_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L9CompletionDimension.SERVING,
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
