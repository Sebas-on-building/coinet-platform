/**
 * L7.8 — Rollout Phases
 *
 * §7.8.3.2, §7.8.3.4 — The only legal rollout order for Layer 7. Each
 * phase encodes its prerequisites, required deliverables, exit criteria,
 * and forbidden shortcuts. Phase advancement is gated by
 * `l7-rollout-gate.ts`; phase order is immutable at runtime.
 *
 * These are the **internal build/rollout phases** of L7.8, distinct
 * from the L7 sublayers themselves — L7.8 does not recreate L7.1–L7.7
 * work, it composes it (§7.8.1.3 non-duplication law).
 */

export enum L7RolloutPhase {
  A_CERTIFICATION_SUBSTRATE = 'A_CERTIFICATION_SUBSTRATE',
  B_FIXTURE_CORPUS = 'B_FIXTURE_CORPUS',
  C_OPERATIONAL_ASSURANCE = 'C_OPERATIONAL_ASSURANCE',
  D_ROLLOUT_AND_ROLLBACK = 'D_ROLLOUT_AND_ROLLBACK',
  E_MIGRATION_GOVERNANCE = 'E_MIGRATION_GOVERNANCE',
  F_ASSURANCE_INVARIANTS_AND_MASTER = 'F_ASSURANCE_INVARIANTS_AND_MASTER',
}

export const ALL_L7_ROLLOUT_PHASES: readonly L7RolloutPhase[] =
  Object.values(L7RolloutPhase);

export interface L7RolloutPhaseSpec {
  readonly phase: L7RolloutPhase;
  readonly prerequisites: readonly L7RolloutPhase[];
  readonly deliverables: readonly string[];
  readonly exit_criteria: readonly string[];
  readonly forbidden_shortcuts: readonly string[];
}

export const L7_ROLLOUT_PHASE_SPECS: Readonly<Record<
  L7RolloutPhase,
  L7RolloutPhaseSpec
>> = Object.freeze({
  [L7RolloutPhase.A_CERTIFICATION_SUBSTRATE]: {
    phase: L7RolloutPhase.A_CERTIFICATION_SUBSTRATE,
    prerequisites: [],
    deliverables: [
      'L7CertificationBand / L7CertificationLevel enums',
      'L7 certification report + artifact builder',
      'L7 band runner',
    ],
    exit_criteria: [
      'band/level enums are closed and frozen',
      'artifact builder is deterministic and fingerprinted',
      'band runner produces typed outcomes for async bands',
    ],
    forbidden_shortcuts: [
      'ad hoc assurance without a frozen band taxonomy',
    ],
  },
  [L7RolloutPhase.B_FIXTURE_CORPUS]: {
    phase: L7RolloutPhase.B_FIXTURE_CORPUS,
    prerequisites: [L7RolloutPhase.A_CERTIFICATION_SUBSTRATE],
    deliverables: [
      'L7 golden validation cases',
      'L7 adversarial corpus',
      'L7 replay timelines',
      'L7 concurrency scenarios',
      'L7 family rollout scenarios',
    ],
    exit_criteria: [
      'golden cases cover every validation family and class',
      'adversarial corpus covers every L7AdversarialCaseKind',
      'replay timelines cover LIVE+REPLAY at minimum',
    ],
    forbidden_shortcuts: [
      'certification band tests without fixture backing',
    ],
  },
  [L7RolloutPhase.C_OPERATIONAL_ASSURANCE]: {
    phase: L7RolloutPhase.C_OPERATIONAL_ASSURANCE,
    prerequisites: [L7RolloutPhase.B_FIXTURE_CORPUS],
    deliverables: [
      'L7 operational metrics registry',
      'L7 SLO policy (with zero-tolerance SLOs)',
      'L7 alert rules',
      'L7 observability report generator',
    ],
    exit_criteria: [
      'all four metric categories populated',
      'at least five zero-tolerance SLOs declared',
      'every zero-tolerance SLO has a PAGE alert and runbook',
    ],
    forbidden_shortcuts: [
      'rollout gate decisions without observability coverage',
    ],
  },
  [L7RolloutPhase.D_ROLLOUT_AND_ROLLBACK]: {
    phase: L7RolloutPhase.D_ROLLOUT_AND_ROLLBACK,
    prerequisites: [L7RolloutPhase.C_OPERATIONAL_ASSURANCE],
    deliverables: [
      'L7 rollout phase graph + advance law',
      'L7 rollout gate',
      'L7 family enable/disable policy',
      'L7 rollback policy + playbooks',
    ],
    exit_criteria: [
      'rollout gate requires a green certification artifact',
      'rollback always preserves history and lineage',
      'family enable/disable respects rollout order',
    ],
    forbidden_shortcuts: [
      'production family enablement without certification artifact',
    ],
  },
  [L7RolloutPhase.E_MIGRATION_GOVERNANCE]: {
    phase: L7RolloutPhase.E_MIGRATION_GOVERNANCE,
    prerequisites: [L7RolloutPhase.D_ROLLOUT_AND_ROLLBACK],
    deliverables: [
      'L7 migration classifier',
      'L7 family migration gate',
    ],
    exit_criteria: [
      'breaking semantic changes cannot bypass the gate',
      'contradiction-family ontology changes require new version namespace',
    ],
    forbidden_shortcuts: [
      'ad hoc in-place changes to contradiction family ontology',
    ],
  },
  [L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER]: {
    phase: L7RolloutPhase.F_ASSURANCE_INVARIANTS_AND_MASTER,
    prerequisites: [L7RolloutPhase.E_MIGRATION_GOVERNANCE],
    deliverables: [
      'L7.8 invariants (INV-7.8-A..G)',
      'L7 master certification orchestrator',
      'test-l7_8-assurance.ts',
      'test-l7_master.ts',
    ],
    exit_criteria: [
      'all L7.8 invariants green',
      'master certification artifact emitted and fingerprinted',
      'rollout gate accepts the artifact end-to-end',
    ],
    forbidden_shortcuts: [
      'production enablement without emitted certification artifact',
    ],
  },
});

export function l7PrerequisitesSatisfied(
  phase: L7RolloutPhase,
  completed: ReadonlySet<L7RolloutPhase>,
): boolean {
  return L7_ROLLOUT_PHASE_SPECS[phase].prerequisites.every(
    p => completed.has(p),
  );
}

export interface L7PhaseAttestation {
  readonly deliverables_complete: boolean;
  readonly exit_criteria_met: boolean;
  readonly certification_bands_green_for_phase: boolean;
}

export function canAdvanceL7Phase(
  phase: L7RolloutPhase,
  completed: ReadonlySet<L7RolloutPhase>,
  attested: L7PhaseAttestation,
): { ok: boolean; reason: string } {
  if (!l7PrerequisitesSatisfied(phase, completed)) {
    return { ok: false, reason: 'prerequisites_not_satisfied' };
  }
  if (!attested.deliverables_complete) {
    return { ok: false, reason: 'deliverables_incomplete' };
  }
  if (!attested.exit_criteria_met) {
    return { ok: false, reason: 'exit_criteria_not_met' };
  }
  if (!attested.certification_bands_green_for_phase) {
    return { ok: false, reason: 'certification_bands_not_green' };
  }
  return { ok: true, reason: 'ok' };
}

/**
 * §7.8.3.4 — Production enablement sequence (distinct from internal
 * build phases above). Phase F unlocks these.
 */
export enum L7ProductionEnablementStep {
  CONSTITUTIONAL_LEGALITY = 'CONSTITUTIONAL_LEGALITY',
  SEMANTIC_LAWBOOK = 'SEMANTIC_LAWBOOK',
  CONFIDENCE_RESTRICTION_LAW = 'CONFIDENCE_RESTRICTION_LAW',
  PERSISTENCE_SERVING_LAW = 'PERSISTENCE_SERVING_LAW',
  REPLAY_REPAIR_DETERMINISM = 'REPLAY_REPAIR_DETERMINISM',
  ADVERSARIAL_RESISTANCE = 'ADVERSARIAL_RESISTANCE',
  LOAD_AND_CONCURRENCY = 'LOAD_AND_CONCURRENCY',
  ROLLOUT_AND_ROLLBACK = 'ROLLOUT_AND_ROLLBACK',
  FINAL_CERTIFICATION_ARTIFACT = 'FINAL_CERTIFICATION_ARTIFACT',
}

export const L7_PRODUCTION_ENABLEMENT_ORDER: readonly L7ProductionEnablementStep[] =
  Object.freeze([
    L7ProductionEnablementStep.CONSTITUTIONAL_LEGALITY,
    L7ProductionEnablementStep.SEMANTIC_LAWBOOK,
    L7ProductionEnablementStep.CONFIDENCE_RESTRICTION_LAW,
    L7ProductionEnablementStep.PERSISTENCE_SERVING_LAW,
    L7ProductionEnablementStep.REPLAY_REPAIR_DETERMINISM,
    L7ProductionEnablementStep.ADVERSARIAL_RESISTANCE,
    L7ProductionEnablementStep.LOAD_AND_CONCURRENCY,
    L7ProductionEnablementStep.ROLLOUT_AND_ROLLBACK,
    L7ProductionEnablementStep.FINAL_CERTIFICATION_ARTIFACT,
  ]);
