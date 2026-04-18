/**
 * L6.8 — Rollout Phases
 *
 * §6.8.3 — The only legal build order for Layer 6 (Phase A–H) and the
 * §6.8.6.3 rollout sequence. No phase may advance without meeting the
 * declared exit criteria (§6.8.3.10).
 */

export enum L6RolloutPhase {
  A_CONTRACTS_AND_REGISTRIES = 'A_CONTRACTS_AND_REGISTRIES',
  B_DEPENDENCY_AND_TEMPORAL = 'B_DEPENDENCY_AND_TEMPORAL',
  C_FEATURE_FAMILIES = 'C_FEATURE_FAMILIES',
  D_COMPOSITES_AND_QUALITY = 'D_COMPOSITES_AND_QUALITY',
  E_EVENT_ENGINE = 'E_EVENT_ENGINE',
  F_PERSISTENCE_AND_EVIDENCE = 'F_PERSISTENCE_AND_EVIDENCE',
  G_REPLAY_AND_REPAIR = 'G_REPLAY_AND_REPAIR',
  H_FINAL_ASSURANCE = 'H_FINAL_ASSURANCE',
}

export const ALL_ROLLOUT_PHASES: readonly L6RolloutPhase[] = Object.values(L6RolloutPhase);

export interface L6RolloutPhaseSpec {
  readonly phase: L6RolloutPhase;
  readonly prerequisites: readonly L6RolloutPhase[];
  readonly deliverables: readonly string[];
  readonly exit_criteria: readonly string[];
  readonly forbidden_shortcuts: readonly string[];
}

export const L6_ROLLOUT_PHASE_SPECS: Readonly<Record<L6RolloutPhase, L6RolloutPhaseSpec>> = Object.freeze({
  [L6RolloutPhase.A_CONTRACTS_AND_REGISTRIES]: {
    phase: L6RolloutPhase.A_CONTRACTS_AND_REGISTRIES,
    prerequisites: [],
    deliverables: [
      'all L6.1–L6.3 contract surfaces compiled and frozen',
      'legal-input and family registries present',
      'primitive validators and compatibility checkers active',
    ],
    exit_criteria: [
      'no runtime engine exists without registered contracts',
      'all contract validators green',
      'contract-incompatibility cases reject deterministically',
    ],
    forbidden_shortcuts: ['runtime-first implementation without frozen contracts'],
  },
  [L6RolloutPhase.B_DEPENDENCY_AND_TEMPORAL]: {
    phase: L6RolloutPhase.B_DEPENDENCY_AND_TEMPORAL,
    prerequisites: [L6RolloutPhase.A_CONTRACTS_AND_REGISTRIES],
    deliverables: [
      'L6.4 DAG planning surfaces',
      'L6.5 time/window/baseline legality surfaces',
      'deterministic window ids and baseline ids',
      'late-data classification support',
    ],
    exit_criteria: [
      'planner determinism proven',
      'windows and baselines reproducible',
      'no family implements custom temporal logic',
    ],
    forbidden_shortcuts: ['ad hoc window math in feature family code'],
  },
  [L6RolloutPhase.C_FEATURE_FAMILIES]: {
    phase: L6RolloutPhase.C_FEATURE_FAMILIES,
    prerequisites: [L6RolloutPhase.B_DEPENDENCY_AND_TEMPORAL],
    deliverables: [
      'all first production feature-family definitions',
      'family computors',
      'dependency bindings',
      'family-level invariants',
      'golden fixtures per family',
    ],
    exit_criteria: [
      'every family compiles only from legal inputs',
      'every family has replay-stable golden cases',
      'every family has adversarial misuse coverage',
    ],
    forbidden_shortcuts: ['unregistered inputs', 'family without invariants'],
  },
  [L6RolloutPhase.D_COMPOSITES_AND_QUALITY]: {
    phase: L6RolloutPhase.D_COMPOSITES_AND_QUALITY,
    prerequisites: [L6RolloutPhase.C_FEATURE_FAMILIES],
    deliverables: [
      'composite feature engine',
      'quality gates',
      'confidence attachment',
      'null/degradation propagation',
    ],
    exit_criteria: [
      'composites consume only legal primitive outputs',
      'quality/confidence/null ordering fixed and tested',
      'contradiction-preserving composites supported',
    ],
    forbidden_shortcuts: ['silent null-neutralization in composites'],
  },
  [L6RolloutPhase.E_EVENT_ENGINE]: {
    phase: L6RolloutPhase.E_EVENT_ENGINE,
    prerequisites: [L6RolloutPhase.D_COMPOSITES_AND_QUALITY],
    deliverables: [
      'change detection', 'event detection', 'event state resolver',
      'dedupe', 'suppression',
    ],
    exit_criteria: [
      'candidates never finalize events directly',
      'only state resolver transitions lifecycle',
      'storms dedupe deterministically',
    ],
    forbidden_shortcuts: ['candidate→firing skipping resolver'],
  },
  [L6RolloutPhase.F_PERSISTENCE_AND_EVIDENCE]: {
    phase: L6RolloutPhase.F_PERSISTENCE_AND_EVIDENCE,
    prerequisites: [L6RolloutPhase.E_EVENT_ENGINE],
    deliverables: [
      'evidence pack builder', 'L6 envelope adapter',
      'L6 write orchestrator', 'feature/event materializers',
    ],
    exit_criteria: [
      'no direct-store bypass',
      'evidence linkage complete',
      'persistence/read-surface invariants green',
    ],
    forbidden_shortcuts: ['direct Postgres/ClickHouse writes'],
  },
  [L6RolloutPhase.G_REPLAY_AND_REPAIR]: {
    phase: L6RolloutPhase.G_REPLAY_AND_REPAIR,
    prerequisites: [L6RolloutPhase.F_PERSISTENCE_AND_EVIDENCE],
    deliverables: [
      'replay adapter', 'repair adapter',
      'late-data recompute paths', 'event/state rebuild paths',
    ],
    exit_criteria: [
      'replay reconstructs legal outputs',
      'repair does not invent truth',
      'late data cannot silently rewrite current authority',
    ],
    forbidden_shortcuts: ['silent late-data mutation'],
  },
  [L6RolloutPhase.H_FINAL_ASSURANCE]: {
    phase: L6RolloutPhase.H_FINAL_ASSURANCE,
    prerequisites: [L6RolloutPhase.G_REPLAY_AND_REPAIR],
    deliverables: [
      'master certification harness', 'golden corpus',
      'adversarial suite', 'load/concurrency suite',
      'migration suite', 'operational SLO package',
      'final release gate',
    ],
    exit_criteria: [
      'all certification bands green',
      'all invariants green',
      'rollout gates and rollback rules enforced',
    ],
    forbidden_shortcuts: ['production enablement without certification artifact'],
  },
});

export function prerequisitesSatisfied(
  phase: L6RolloutPhase,
  completed: ReadonlySet<L6RolloutPhase>,
): boolean {
  const spec = L6_ROLLOUT_PHASE_SPECS[phase];
  return spec.prerequisites.every(p => completed.has(p));
}

/**
 * §6.8.3.10 — Phase-transition law: a phase is considered complete only
 * if its deliverables and exit criteria are attested, and its
 * prerequisites are already complete.
 */
export function canAdvancePhase(
  phase: L6RolloutPhase,
  completed: ReadonlySet<L6RolloutPhase>,
  attested: {
    readonly deliverables_complete: boolean;
    readonly exit_criteria_met: boolean;
    readonly certification_bands_green_for_phase: boolean;
  },
): { ok: boolean; reason: string } {
  if (!prerequisitesSatisfied(phase, completed)) {
    return { ok: false, reason: 'prerequisites_not_satisfied' };
  }
  if (!attested.deliverables_complete) return { ok: false, reason: 'deliverables_incomplete' };
  if (!attested.exit_criteria_met) return { ok: false, reason: 'exit_criteria_not_met' };
  if (!attested.certification_bands_green_for_phase) {
    return { ok: false, reason: 'certification_bands_not_green' };
  }
  return { ok: true, reason: 'ok' };
}

/**
 * §6.8.6.3 — Incremental production enablement sequence (distinct from the
 * internal build phases above). Certification Phase H unlocks these.
 */
export enum L6ProductionEnablementStep {
  CONTRACTS_FREEZE = 'CONTRACTS_FREEZE',
  DRY_RUN_COMPUTE = 'DRY_RUN_COMPUTE',
  HISTORICAL_ONLY_WRITES = 'HISTORICAL_ONLY_WRITES',
  SHADOW_CURRENT_COMPUTE = 'SHADOW_CURRENT_COMPUTE',
  CANARY_CURRENT_MATERIALIZATION = 'CANARY_CURRENT_MATERIALIZATION',
  FAMILY_BY_FAMILY_ENABLEMENT = 'FAMILY_BY_FAMILY_ENABLEMENT',
  EVENT_FAMILY_ENABLEMENT = 'EVENT_FAMILY_ENABLEMENT',
  REPLAY_REPAIR_PRODUCTION = 'REPLAY_REPAIR_PRODUCTION',
  FULL_LAYER_CERTIFICATION_GATE = 'FULL_LAYER_CERTIFICATION_GATE',
}

export const PRODUCTION_ENABLEMENT_ORDER: readonly L6ProductionEnablementStep[] = Object.freeze([
  L6ProductionEnablementStep.CONTRACTS_FREEZE,
  L6ProductionEnablementStep.DRY_RUN_COMPUTE,
  L6ProductionEnablementStep.HISTORICAL_ONLY_WRITES,
  L6ProductionEnablementStep.SHADOW_CURRENT_COMPUTE,
  L6ProductionEnablementStep.CANARY_CURRENT_MATERIALIZATION,
  L6ProductionEnablementStep.FAMILY_BY_FAMILY_ENABLEMENT,
  L6ProductionEnablementStep.EVENT_FAMILY_ENABLEMENT,
  L6ProductionEnablementStep.REPLAY_REPAIR_PRODUCTION,
  L6ProductionEnablementStep.FULL_LAYER_CERTIFICATION_GATE,
]);
