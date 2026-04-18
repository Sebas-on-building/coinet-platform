/**
 * L7.9 — Layer 7 Completion Validator
 *
 * §7.9.3.4 — Machine-enforced validator fed by L7.1–L7.8 certification
 * outputs. Computes per-dimension and overall `L7CompletionState`.
 *
 * Implements the §7.9.3.1 hard completion rule: L7 is complete only
 * when structured validation subjects exist, contradiction templates
 * are enforced, validation classes are machine-enforced, confidence
 * is deterministic and cap-bound, contradiction is preserved, outputs
 * persist through L5 only, read surfaces exist, replay/repair remain
 * safe, and all certification bands are green.
 */

import {
  ALL_L7_COMPLETION_DIMENSIONS,
  L7CompletionDimension,
  L7CompletionEvaluation,
  L7CompletionState,
  L7DimensionEvaluation,
  L7RatificationViolationCode,
} from '../contracts/l7-completion-standard';
import {
  L7_DEFINITION_SURFACE,
  L7_EXECUTION_SEQUENCE,
  L7_REQUIRED_SUBLAYERS,
} from '../contracts/l7-final-definition';

/**
 * Evidence fed into the validator. Each field maps to a required
 * completion bullet from §7.9.3.2.
 */
export interface L7CompletionEvidence {
  // constitutional
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
  readonly mission_boundary_frozen: boolean;
  readonly semantic_lawbook_frozen: boolean;
  readonly confidence_restriction_law_frozen: boolean;
  readonly no_ungoverned_validation_path: boolean;
  readonly current_history_evidence_authority_defined: boolean;
  readonly replay_repair_unambiguous: boolean;

  // runtime
  readonly subject_assembly_deterministic: boolean;
  readonly resolution_deterministic: boolean;
  readonly contradiction_clustering_deterministic: boolean;
  readonly classification_legal_and_deterministic: boolean;
  readonly confidence_derivation_deterministic: boolean;
  readonly restriction_derivation_deterministic: boolean;
  readonly evidence_generation_deterministic: boolean;

  // persistence
  readonly l5_only_persistence_authority: boolean;
  readonly current_history_aligned: boolean;
  readonly evidence_archive_linked: boolean;
  readonly lineage_complete_replay_compatible: boolean;
  readonly replay_safe: boolean;
  readonly repair_only_recompute_safe: boolean;
  readonly read_surfaces_governed: boolean;

  // assurance
  readonly l78_certification_production_green: boolean;
  readonly no_l78_blocking_violations: boolean;
  readonly no_critical_observability_breach: boolean;
  readonly no_critical_migration_block: boolean;
  readonly rollout_rollback_discipline_active: boolean;
  readonly family_rollout_gated_reversible: boolean;

  // handoff completeness (used to check MISSING_HANDOFF_SURFACE)
  readonly stable_handoff_surfaces_declared: boolean;
  readonly downstream_dependency_safe: boolean;

  // consistency with §7.9.2 / INV-7.9-F / INV-7.9-G
  readonly final_definition_surface: readonly string[];
  readonly execution_sequence: readonly string[];
}

export class Layer7CompletionValidator {
  validate(ev: L7CompletionEvidence): L7CompletionEvaluation {
    const dimEvals: L7DimensionEvaluation[] = ALL_L7_COMPLETION_DIMENSIONS.map(
      d => this.evaluateDimension(d, ev),
    );

    const allDimsSatisfied = dimEvals.every(d => d.satisfied);
    const constitutional =
      dimEvals.find(d => d.dimension === L7CompletionDimension.CONSTITUTIONAL)!
        .satisfied;
    const runtime =
      dimEvals.find(d => d.dimension === L7CompletionDimension.RUNTIME)!
        .satisfied;

    let state: L7CompletionState;
    if (allDimsSatisfied) state = L7CompletionState.L7_PRODUCTION_READY;
    else if (constitutional && runtime)
      state = L7CompletionState.L7_CONSTITUTIONALLY_READY;
    else state = L7CompletionState.L7_NOT_READY;

    const violations: L7RatificationViolationCode[] = [];
    for (const d of dimEvals) violations.push(...d.violations);

    if (!ev.stable_handoff_surfaces_declared) {
      violations.push(L7RatificationViolationCode.MISSING_HANDOFF_SURFACE);
      if (state === L7CompletionState.L7_PRODUCTION_READY)
        state = L7CompletionState.L7_CONSTITUTIONALLY_READY;
    }
    if (!ev.downstream_dependency_safe) {
      violations.push(L7RatificationViolationCode.DOWNSTREAM_DEPENDENCY_UNSAFE);
      if (state === L7CompletionState.L7_PRODUCTION_READY)
        state = L7CompletionState.L7_CONSTITUTIONALLY_READY;
    }

    // §7.9.2.5 / INV-7.9-F + INV-7.9-G consistency checks.
    if (!this.surfaceMatches(ev.final_definition_surface, L7_DEFINITION_SURFACE)) {
      violations.push(L7RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION);
      if (state === L7CompletionState.L7_PRODUCTION_READY)
        state = L7CompletionState.L7_CONSTITUTIONALLY_READY;
    }
    if (!this.sequenceMatches(ev.execution_sequence, L7_EXECUTION_SEQUENCE)) {
      violations.push(L7RatificationViolationCode.EXECUTION_ORDER_VIOLATION);
      if (state === L7CompletionState.L7_PRODUCTION_READY)
        state = L7CompletionState.L7_CONSTITUTIONALLY_READY;
    }

    return {
      overall_state: state,
      dimensions: dimEvals,
      violations,
    };
  }

  private evaluateDimension(
    d: L7CompletionDimension,
    ev: L7CompletionEvidence,
  ): L7DimensionEvaluation {
    switch (d) {
      case L7CompletionDimension.CONSTITUTIONAL:
        return this.evalConstitutional(ev);
      case L7CompletionDimension.RUNTIME:
        return this.evalRuntime(ev);
      case L7CompletionDimension.PERSISTENCE:
        return this.evalPersistence(ev);
      case L7CompletionDimension.ASSURANCE:
        return this.evalAssurance(ev);
    }
  }

  private evalConstitutional(ev: L7CompletionEvidence): L7DimensionEvaluation {
    const violations: L7RatificationViolationCode[] = [];
    const notes: string[] = [];

    for (const sl of L7_REQUIRED_SUBLAYERS) {
      const cert = ev.sublayer_certifications[sl];
      if (!cert) {
        violations.push(L7RatificationViolationCode.MISSING_SUBLAYER);
        notes.push(`missing sublayer: ${sl}`);
        continue;
      }
      if (!cert.certified) {
        violations.push(L7RatificationViolationCode.SUBLAYER_CERT_FAILED);
        notes.push(`sublayer not certified: ${sl}`);
      }
    }

    if (!ev.invariants_all_green) {
      violations.push(L7RatificationViolationCode.INVARIANT_FAILED);
      notes.push('one or more sublayer invariants failed');
    }
    const constitutionalChecks: [boolean, string][] = [
      [ev.mission_boundary_frozen, 'mission/boundary not frozen'],
      [ev.semantic_lawbook_frozen, 'semantic lawbook not frozen'],
      [ev.confidence_restriction_law_frozen,
        'confidence/restriction law not frozen'],
      [ev.no_ungoverned_validation_path, 'ungoverned validation path present'],
      [ev.current_history_evidence_authority_defined,
        'authority undefined for current/historical/evidence'],
      [ev.replay_repair_unambiguous, 'ambiguous replay/repair behaviour'],
    ];
    for (const [ok, msg] of constitutionalChecks) {
      if (!ok) {
        violations.push(L7RatificationViolationCode.CONSTITUTIONAL_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L7CompletionDimension.CONSTITUTIONAL,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalRuntime(ev: L7CompletionEvidence): L7DimensionEvaluation {
    const violations: L7RatificationViolationCode[] = [];
    const notes: string[] = [];
    const checks: [boolean, string][] = [
      [ev.subject_assembly_deterministic, 'subject assembly not deterministic'],
      [ev.resolution_deterministic, 'resolution not deterministic'],
      [ev.contradiction_clustering_deterministic,
        'contradiction clustering not deterministic'],
      [ev.classification_legal_and_deterministic,
        'classification not legal/deterministic'],
      [ev.confidence_derivation_deterministic,
        'confidence derivation not deterministic'],
      [ev.restriction_derivation_deterministic,
        'restriction derivation not deterministic'],
      [ev.evidence_generation_deterministic,
        'evidence generation not deterministic'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(L7RatificationViolationCode.RUNTIME_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L7CompletionDimension.RUNTIME,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalPersistence(ev: L7CompletionEvidence): L7DimensionEvaluation {
    const violations: L7RatificationViolationCode[] = [];
    const notes: string[] = [];
    const checks: [boolean, string][] = [
      [ev.l5_only_persistence_authority, 'persistence not routed through L5 only'],
      [ev.current_history_aligned, 'current/history not aligned'],
      [ev.evidence_archive_linked, 'evidence archive not linked'],
      [ev.lineage_complete_replay_compatible,
        'lineage incomplete or replay-incompatible'],
      [ev.replay_safe, 'replay not safe'],
      [ev.repair_only_recompute_safe, 'repair recompute not safe'],
      [ev.read_surfaces_governed, 'read surfaces not governed'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(
          L7RatificationViolationCode.PERSISTENCE_CONSTITUTION_INCOMPLETE,
        );
        notes.push(msg);
      }
    }
    return {
      dimension: L7CompletionDimension.PERSISTENCE,
      satisfied: violations.length === 0,
      violations,
      notes,
    };
  }

  private evalAssurance(ev: L7CompletionEvidence): L7DimensionEvaluation {
    const violations: L7RatificationViolationCode[] = [];
    const notes: string[] = [];

    if (!ev.l78_certification_production_green) {
      violations.push(L7RatificationViolationCode.CERTIFICATION_NOT_GREEN);
      notes.push('L7.8 not at PRODUCTION_GREEN');
    }
    if (!ev.no_l78_blocking_violations) {
      violations.push(L7RatificationViolationCode.ASSURANCE_INCOMPLETE);
      notes.push('L7.8 blocking violations present');
    }
    if (!ev.no_critical_observability_breach) {
      violations.push(
        L7RatificationViolationCode.CRITICAL_OBSERVABILITY_BREACH,
      );
      notes.push('critical observability breach');
    }
    if (!ev.no_critical_migration_block) {
      violations.push(L7RatificationViolationCode.CRITICAL_MIGRATION_BLOCK);
      notes.push('critical migration block');
    }
    const checks: [boolean, string][] = [
      [ev.rollout_rollback_discipline_active,
        'rollout/rollback discipline not active'],
      [ev.family_rollout_gated_reversible,
        'family rollout not gated or not reversible'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) {
        violations.push(L7RatificationViolationCode.ASSURANCE_INCOMPLETE);
        notes.push(msg);
      }
    }
    return {
      dimension: L7CompletionDimension.ASSURANCE,
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
