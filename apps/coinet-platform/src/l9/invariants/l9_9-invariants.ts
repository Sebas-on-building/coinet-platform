/**
 * L9.9 — Closure, Ratification, and Completion-Standard Invariants
 *
 * §9.9.4.1 INV-9.9-A..G — Seven machine-enforced invariants for the
 * closure layer of the Sequence & Temporal Engine. Each returns a
 * boolean `holds` plus an evidence string that replays cleanly under
 * the certification suite.
 *
 *   INV-9.9-A : sublayer completion — a ratification artifact is
 *               illegal if any required L9 sublayer is missing or not
 *               PRODUCTION_GREEN, or if completion is not
 *               L9_PRODUCTION_READY.
 *   INV-9.9-B : ratification validity — freeze and hard-protection
 *               require a valid ratification; completion validator
 *               rejects freeze without ratification.
 *   INV-9.9-C : downstream dependency — later layers may only rely on
 *               declared stable handoff surfaces; forbidden access
 *               kinds are denied; governed-only kinds are conditional.
 *   INV-9.9-D : extension classification — breaking/prohibited changes
 *               can never pass as ADDITIVE_SAFE; migrations require
 *               recertification; absolute prohibitions
 *               (judgment/scoring/causal certainty/Redis authority)
 *               classify PROHIBITED.
 *   INV-9.9-E : rollback safety — rollback may not erase historical
 *               sequence facts, break lineage, or silently downgrade
 *               frozen surfaces.
 *   INV-9.9-F : production-green artifact emission — the rollout gate
 *               blocks downstream-visible transitions without a
 *               ratification artifact; every recognized failure class
 *               has a registered playbook.
 *   INV-9.9-G : deterministic completion — completion downgrades on
 *               drifted definition surface, scrambled execution
 *               sequence, missing handoff surface, or replay/repair
 *               instability.
 */

import {
  Layer9CompletionValidator,
} from '../completion/l9-completion-validator';
import {
  Layer9RatificationBuilder,
} from '../completion/l9-ratification-builder';
import {
  Layer9FreezePolicyValidator,
} from '../completion/l9-freeze-activator';
import {
  Layer9ExtensionClassifier,
} from '../completion/l9-extension-classifier';
import {
  Layer9HandoffValidator,
} from '../completion/l9-handoff-validator';
import {
  L9CompletionState,
  L9RatificationViolationCode,
} from '../contracts/l9-completion-standard';
import {
  L9FreezeStatus,
  L9_FREEZE_POLICY_V1,
} from '../contracts/l9-freeze-policy';
import {
  L9ExtensionClass,
  L9_EXTENSION_POLICY_V1,
} from '../contracts/l9-extension-policy';
import {
  L9DependencyAllowance,
  L9DownstreamAccessKind,
  L9DownstreamConsumerMode,
  L9_STABLE_HANDOFF_SURFACES,
} from '../contracts/l9-downstream-dependency';
import {
  L9_DEFINITION_SURFACE,
  L9_EXECUTION_SEQUENCE,
  L9_REQUIRED_SUBLAYERS,
} from '../contracts/l9-final-definition';
import {
  L9SublayerCertRef,
} from '../contracts/l9-ratification-artifact';
import {
  Layer9RolloutGate,
} from '../rollout/l9-rollout-gate';
import {
  L9RolloutPhase,
} from '../rollout/l9-rollout-phase';
import {
  Layer9RollbackPolicy,
  L9RollbackClass,
} from '../rollout/l9-rollback-policy';
import {
  verifyL9FailurePlaybookCoverage,
} from '../rollout/l9-failure-playbooks';

export interface L9_9InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ───────────────────────── fixture helpers ─────────────────────────

function greenCert(sublayer: string): L9SublayerCertRef {
  return {
    sublayer,
    version: '1.0.0',
    certification_run_id: `cert-${sublayer}`,
    level: 'PRODUCTION_GREEN',
    rollout_recommended: true,
    blocking_violations: [],
  };
}

function allGreenCerts(): readonly L9SublayerCertRef[] {
  return L9_REQUIRED_SUBLAYERS.map(greenCert);
}

type L9GreenEvidence = Parameters<
  Layer9CompletionValidator['validate']
>[0];

export function buildL9GreenEvidence(): L9GreenEvidence {
  const sublayer_certifications: Record<string, {
    certified: boolean;
    level: 'FAILED' | 'CONSTITUTIONAL_GREEN' | 'RUNTIME_GREEN' |
      'PRODUCTION_GREEN';
    blocking_violations: readonly string[];
  }> = {};
  for (const sl of L9_REQUIRED_SUBLAYERS) {
    sublayer_certifications[sl] = {
      certified: true,
      level: 'PRODUCTION_GREEN',
      blocking_violations: [],
    };
  }
  return {
    sublayer_certifications,
    invariants_all_green: true,

    mission_boundary_frozen: true,
    sequence_family_law_frozen: true,
    template_law_frozen: true,
    no_ungoverned_sequence_path: true,
    no_judgment_scenario_scoring_semantics: true,
    posture_consumed_not_laundered: true,
    no_causal_laundering: true,

    subject_contracts_legal: true,
    output_contracts_complete: true,
    runtime_deterministic: true,
    temporal_semantics_legal: true,
    confidence_cap_bound: true,
    restriction_rights_explicit: true,
    causal_restraint_explicit: true,

    l5_only_persistence_authority: true,
    postgres_only_current_authority: true,
    historical_append_safe: true,
    evidence_archive_linked: true,
    lineage_complete_replay_compatible: true,
    replay_repair_meaning_preserved: true,

    read_surfaces_governed: true,
    read_modes_validated: true,
    no_raw_store_bypass: true,
    stable_handoff_surfaces_declared: true,
    forbidden_downstream_access_rejected: true,
    internal_surfaces_not_exposed: true,
    no_rebuild_law_enforced: true,

    no_critical_observability_breach: true,
    repair_instability_resolved: true,
    downstream_dependency_safe: true,

    final_definition_surface: L9_DEFINITION_SURFACE,
    execution_sequence: L9_EXECUTION_SEQUENCE,
  };
}

// ────────────────────────── INV-9.9-A ──────────────────────────

export function checkINV_99_A(): L9_9InvariantResult {
  const builder = new Layer9RatificationBuilder();
  const validator = new Layer9CompletionValidator();
  const green = buildL9GreenEvidence();

  const scoped: Record<string, {
    certified: boolean;
    level: 'FAILED' | 'CONSTITUTIONAL_GREEN' | 'RUNTIME_GREEN' |
      'PRODUCTION_GREEN';
    blocking_violations: readonly string[];
  }> = {};
  for (const [k, v] of Object.entries(green.sublayer_certifications)) {
    if (k !== 'L9.8') scoped[k] = v;
  }
  const completion = validator.validate({
    ...green,
    sublayer_certifications: scoped,
  });
  const refs = allGreenCerts().filter(r => r.sublayer !== 'L9.8');
  const built = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'inv.A',
    sub_layer_versions: Object.fromEntries(
      refs.map(r => [r.sublayer, r.version]),
    ),
    certification_artifact_refs: refs,
    completion,
    freeze_status: L9FreezeStatus.FROZEN,
    extension_policy_version: L9_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L9.9/v1',
    final_definition_surface: L9_DEFINITION_SURFACE,
    execution_sequence: L9_EXECUTION_SEQUENCE,
  });

  const holds =
    !built.allowed &&
    built.blocking_violations.includes(
      L9RatificationViolationCode.MISSING_SUBLAYER,
    );
  return {
    id: 'INV-9.9-A',
    name:
      'ratification requires every L9 sublayer green + completion ' +
      'L9_PRODUCTION_READY',
    holds,
    evidence:
      `allowed=${built.allowed} blockers=` +
      built.blocking_violations.join(','),
  };
}

// ────────────────────────── INV-9.9-B ──────────────────────────

export function checkINV_99_B(): L9_9InvariantResult {
  const validator = new Layer9CompletionValidator();
  const fv = new Layer9FreezePolicyValidator();
  const green = buildL9GreenEvidence();

  const greenEval = validator.validate(green);
  const partial = validator.validate({
    ...green,
    runtime_deterministic: false,
  });

  const noRat = fv.activate({
    request_id: 'f-1',
    target_status: L9FreezeStatus.FROZEN,
    ratification: null,
    freeze_policy: L9_FREEZE_POLICY_V1,
  });
  const noHard = fv.activate({
    request_id: 'f-2',
    target_status: L9FreezeStatus.HARD_PROTECTED,
    ratification: null,
    freeze_policy: L9_FREEZE_POLICY_V1,
  });

  const holds =
    greenEval.overall_state === L9CompletionState.L9_PRODUCTION_READY &&
    partial.overall_state !== L9CompletionState.L9_PRODUCTION_READY &&
    !noRat.allowed &&
    noRat.violations.includes(
      L9RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION,
    ) &&
    !noHard.allowed;

  return {
    id: 'INV-9.9-B',
    name:
      'PRODUCTION_READY requires all four dimensions green; freeze ' +
      'and hard-protection require a valid ratification',
    holds,
    evidence:
      `green=${greenEval.overall_state} partial=${partial.overall_state} ` +
      `noRat.allowed=${noRat.allowed} noHard.allowed=${noHard.allowed}`,
  };
}

// ────────────────────────── INV-9.9-C ──────────────────────────

export function checkINV_99_C(): L9_9InvariantResult {
  const v = new Layer9HandoffValidator();

  const internal = v.validate({
    request_id: 'c-internal',
    consumer_layer: 'L10',
    access_kind: L9DownstreamAccessKind.INTERNAL_RUNTIME_DAG_NODE,
    consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const judgment = v.validate({
    request_id: 'c-judgment',
    consumer_layer: 'L10',
    access_kind: L9DownstreamAccessKind.JUDGMENT_FROM_L9,
    consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const score = v.validate({
    request_id: 'c-score',
    consumer_layer: 'L10',
    access_kind: L9DownstreamAccessKind.SCORE_FROM_L9,
    consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const causal = v.validate({
    request_id: 'c-causal',
    consumer_layer: 'L10',
    access_kind: L9DownstreamAccessKind.CAUSAL_CERTAINTY_FROM_L9,
    consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const stable = v.validate({
    request_id: 'c-stable',
    consumer_layer: 'L10',
    access_kind: L9DownstreamAccessKind.CURRENT_SEQUENCE_SNAPSHOT,
    consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const adHocNormal = v.validate({
    request_id: 'c-adhoc-normal',
    consumer_layer: 'L10',
    access_kind:
      L9DownstreamAccessKind.AD_HOC_SEQUENCE_RECLASSIFICATION,
    consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const adHocReplay = v.validate({
    request_id: 'c-adhoc-replay',
    consumer_layer: 'L10',
    access_kind:
      L9DownstreamAccessKind.AD_HOC_SEQUENCE_RECLASSIFICATION,
    consumer_mode: L9DownstreamConsumerMode.GOVERNED_REPLAY,
    notes: '',
  });

  const holds =
    internal.allowance === L9DependencyAllowance.DENIED &&
    judgment.allowance === L9DependencyAllowance.DENIED &&
    score.allowance === L9DependencyAllowance.DENIED &&
    causal.allowance === L9DependencyAllowance.DENIED &&
    stable.allowance === L9DependencyAllowance.ALLOWED &&
    adHocNormal.allowance === L9DependencyAllowance.DENIED &&
    adHocReplay.allowance ===
      L9DependencyAllowance.CONDITIONALLY_ALLOWED;

  return {
    id: 'INV-9.9-C',
    name:
      'later layers limited to stable handoff surfaces; forbidden ' +
      'kinds denied; ad-hoc only conditional under governed modes',
    holds,
    evidence:
      `internal=${internal.allowance} judgment=${judgment.allowance} ` +
      `score=${score.allowance} causal=${causal.allowance} ` +
      `stable=${stable.allowance} adHocNormal=${adHocNormal.allowance} ` +
      `adHocReplay=${adHocReplay.allowance}`,
  };
}

// ────────────────────────── INV-9.9-D ──────────────────────────

export function checkINV_99_D(): L9_9InvariantResult {
  const classifier = new Layer9ExtensionClassifier();
  const base = {
    proposal_id: '',
    title: '',
    touches_frozen_surface: false,
    touches_hard_protected_surface: false,
    alters_sequence_state_meaning: false,
    alters_sequence_family_ontology: false,
    alters_coexistence_law: false,
    alters_subject_contract: false,
    alters_output_contract: false,
    alters_lead_lag_semantics: false,
    alters_phase_progression_law: false,
    alters_change_point_law: false,
    alters_decay_law: false,
    alters_post_event_window_law: false,
    alters_confidence_law: false,
    alters_restriction_law: false,
    alters_causal_restraint_law: false,
    alters_cap_chain_law: false,
    alters_template_semantics: false,
    alters_read_surface: false,
    alters_stable_handoff_surface: false,
    introduces_judgment_semantics: false,
    introduces_recommendation_semantics: false,
    introduces_scoring_finality: false,
    introduces_causal_certainty_from_adjacency: false,
    turns_confidence_into_final_score: false,
    enables_redis_as_authority: false,
    enables_live_raw_lower_layer_reconstruction: false,
    bypasses_l5_persistence: false,
    is_additive_only: false,
    preserves_replay_hashes: true,
    preserves_historical_meaning: true,
    widens_downstream_rights: false,
    notes: '',
  };

  const prohibited = classifier.classify({
    ...base,
    proposal_id: 'd-prohibited',
    title: 'turn confidence into final score',
    turns_confidence_into_final_score: true,
  });
  const causalProhibited = classifier.classify({
    ...base,
    proposal_id: 'd-causal',
    title: 'infer causal certainty from temporal adjacency',
    introduces_causal_certainty_from_adjacency: true,
  });
  const breaking = classifier.classify({
    ...base,
    proposal_id: 'd-breaking',
    title: 'alter lead-lag semantics',
    alters_lead_lag_semantics: true,
    touches_frozen_surface: true,
  });
  const migration = classifier.classify({
    ...base,
    proposal_id: 'd-migration',
    title: 'adjust template semantics',
    alters_template_semantics: true,
  });
  const additive = classifier.classify({
    ...base,
    proposal_id: 'd-additive',
    title: 'new fixture',
    is_additive_only: true,
  });

  const holds =
    prohibited.classification === L9ExtensionClass.PROHIBITED &&
    prohibited.requires_recertification &&
    causalProhibited.classification === L9ExtensionClass.PROHIBITED &&
    causalProhibited.requires_recertification &&
    breaking.classification === L9ExtensionClass.BREAKING_SEMANTIC &&
    breaking.requires_recertification &&
    migration.classification === L9ExtensionClass.MIGRATION_REQUIRED &&
    migration.requires_recertification &&
    additive.classification === L9ExtensionClass.ADDITIVE_SAFE &&
    !additive.requires_recertification;

  return {
    id: 'INV-9.9-D',
    name:
      'breaking/prohibited changes cannot pass as additive-safe; ' +
      'migrations require recertification',
    holds,
    evidence:
      `prohibited=${prohibited.classification} ` +
      `causal=${causalProhibited.classification} ` +
      `breaking=${breaking.classification} ` +
      `migration=${migration.classification} ` +
      `additive=${additive.classification}`,
  };
}

// ────────────────────────── INV-9.9-E ──────────────────────────

export function checkINV_99_E(): L9_9InvariantResult {
  const p = new Layer9RollbackPolicy();

  const deleteHistory = p.decide({
    request_id: 'e-delete',
    rollback_class: L9RollbackClass.DESTRUCTIVE_DELETE_HISTORY,
    preserves_historical_facts: false,
    preserves_lineage_continuity: true,
    downgrades_frozen_state: false,
    rationale: 'attempt',
  });
  const unlinkLineage = p.decide({
    request_id: 'e-unlink',
    rollback_class: L9RollbackClass.UNLINK_LINEAGE,
    preserves_historical_facts: true,
    preserves_lineage_continuity: false,
    downgrades_frozen_state: false,
    rationale: 'attempt',
  });
  const downgrade = p.decide({
    request_id: 'e-downgrade',
    rollback_class: L9RollbackClass.DOWNGRADE_FROZEN_STATE,
    preserves_historical_facts: true,
    preserves_lineage_continuity: true,
    downgrades_frozen_state: true,
    rationale: 'attempt',
  });
  const legalPhase = p.decide({
    request_id: 'e-phase',
    rollback_class: L9RollbackClass.ROLL_BACK_PHASE,
    preserves_historical_facts: true,
    preserves_lineage_continuity: true,
    downgrades_frozen_state: false,
    rationale: 'canary regression',
  });
  const fence = p.decide({
    request_id: 'e-fence',
    rollback_class: L9RollbackClass.FENCE_DOWNSTREAM,
    preserves_historical_facts: true,
    preserves_lineage_continuity: true,
    downgrades_frozen_state: false,
    rationale: 'downstream breach',
  });

  const holds =
    !deleteHistory.allowed &&
    deleteHistory.violations.includes(
      L9RatificationViolationCode.ROLLBACK_ERASES_HISTORY,
    ) &&
    !unlinkLineage.allowed &&
    unlinkLineage.violations.includes(
      L9RatificationViolationCode.ROLLBACK_BREAKS_LINEAGE,
    ) &&
    !downgrade.allowed &&
    downgrade.violations.includes(
      L9RatificationViolationCode.ROLLBACK_ERASES_HISTORY,
    ) &&
    legalPhase.allowed &&
    fence.allowed;

  return {
    id: 'INV-9.9-E',
    name:
      'rollback cannot erase history, break lineage, or silently ' +
      'downgrade frozen state',
    holds,
    evidence:
      `delete=${deleteHistory.allowed} unlink=${unlinkLineage.allowed} ` +
      `downgrade=${downgrade.allowed} phase=${legalPhase.allowed} ` +
      `fence=${fence.allowed}`,
  };
}

// ────────────────────────── INV-9.9-F ──────────────────────────

export function checkINV_99_F(): L9_9InvariantResult {
  const validator = new Layer9CompletionValidator();
  const builder = new Layer9RatificationBuilder();
  const gate = new Layer9RolloutGate();
  const green = buildL9GreenEvidence();

  const completion = validator.validate(green);
  const ratification = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'inv.F',
    sub_layer_versions: Object.fromEntries(
      L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
    ),
    certification_artifact_refs: allGreenCerts(),
    completion,
    freeze_status: L9FreezeStatus.FROZEN,
    extension_policy_version: L9_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L9.9/v1',
    final_definition_surface: L9_DEFINITION_SURFACE,
    execution_sequence: L9_EXECUTION_SEQUENCE,
  });

  const preCanaryWithoutRat = gate.decide({
    request_id: 'g-no-rat',
    from_phase: L9RolloutPhase.SHADOW,
    to_phase: L9RolloutPhase.CANARY,
    ratification: null,
    freeze_status: L9FreezeStatus.OPEN,
  });
  const preCanaryWithoutFreeze = gate.decide({
    request_id: 'g-no-freeze',
    from_phase: L9RolloutPhase.SHADOW,
    to_phase: L9RolloutPhase.CANARY,
    ratification: ratification.artifact,
    freeze_status: L9FreezeStatus.OPEN,
  });
  const preCanaryGreen = gate.decide({
    request_id: 'g-ok',
    from_phase: L9RolloutPhase.SHADOW,
    to_phase: L9RolloutPhase.CANARY,
    ratification: ratification.artifact,
    freeze_status: L9FreezeStatus.FROZEN,
  });
  const scrambledOrder = gate.decide({
    request_id: 'g-scrambled',
    from_phase: L9RolloutPhase.SHADOW,
    to_phase: L9RolloutPhase.FULL_LIVE,
    ratification: ratification.artifact,
    freeze_status: L9FreezeStatus.FROZEN,
  });

  const coverage = verifyL9FailurePlaybookCoverage();

  const holds =
    ratification.allowed &&
    !preCanaryWithoutRat.allowed &&
    preCanaryWithoutRat.violations.includes(
      L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION,
    ) &&
    !preCanaryWithoutFreeze.allowed &&
    preCanaryGreen.allowed &&
    !scrambledOrder.allowed &&
    scrambledOrder.violations.includes(
      L9RatificationViolationCode.EXECUTION_ORDER_VIOLATION,
    ) &&
    coverage.all_covered;

  return {
    id: 'INV-9.9-F',
    name:
      'production-green artifact emission — rollout gate blocks ' +
      'uncertified transitions; all failure classes covered',
    holds,
    evidence:
      `ratAllowed=${ratification.allowed} ` +
      `noRat.allowed=${preCanaryWithoutRat.allowed} ` +
      `noFreeze.allowed=${preCanaryWithoutFreeze.allowed} ` +
      `green.allowed=${preCanaryGreen.allowed} ` +
      `scrambled.allowed=${scrambledOrder.allowed} ` +
      `coverage.all_covered=${coverage.all_covered} ` +
      `missingPlaybooks=${coverage.missing.length}`,
  };
}

// ────────────────────────── INV-9.9-G ──────────────────────────

export function checkINV_99_G(): L9_9InvariantResult {
  const validator = new Layer9CompletionValidator();
  const green = buildL9GreenEvidence();

  const good = validator.validate(green);
  const badDef = validator.validate({
    ...green,
    final_definition_surface: ['Layer 9 is a scoring engine'],
  });
  const scrambled = validator.validate({
    ...green,
    execution_sequence: [...L9_EXECUTION_SEQUENCE].reverse(),
  });
  const replayBroken = validator.validate({
    ...green,
    replay_repair_meaning_preserved: false,
  });
  const repairBroken = validator.validate({
    ...green,
    repair_instability_resolved: false,
  });
  const missingHandoff = validator.validate({
    ...green,
    stable_handoff_surfaces_declared: false,
  });
  const causalLaundering = validator.validate({
    ...green,
    no_causal_laundering: false,
  });

  const holds =
    good.overall_state === L9CompletionState.L9_PRODUCTION_READY &&
    badDef.overall_state !== L9CompletionState.L9_PRODUCTION_READY &&
    badDef.violations.includes(
      L9RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION,
    ) &&
    scrambled.overall_state !== L9CompletionState.L9_PRODUCTION_READY &&
    scrambled.violations.includes(
      L9RatificationViolationCode.EXECUTION_ORDER_VIOLATION,
    ) &&
    replayBroken.overall_state !==
      L9CompletionState.L9_PRODUCTION_READY &&
    repairBroken.overall_state !==
      L9CompletionState.L9_PRODUCTION_READY &&
    missingHandoff.overall_state !==
      L9CompletionState.L9_PRODUCTION_READY &&
    missingHandoff.violations.includes(
      L9RatificationViolationCode.MISSING_HANDOFF_SURFACE,
    ) &&
    causalLaundering.overall_state !==
      L9CompletionState.L9_PRODUCTION_READY;

  return {
    id: 'INV-9.9-G',
    name:
      'completion downgrades on drifted definition, scrambled ' +
      'execution, missing handoff, replay/repair instability, or ' +
      'causal laundering',
    holds,
    evidence:
      `good=${good.overall_state} badDef=${badDef.overall_state} ` +
      `scrambled=${scrambled.overall_state} ` +
      `replay=${replayBroken.overall_state} ` +
      `repair=${repairBroken.overall_state} ` +
      `missingHandoff=${missingHandoff.overall_state} ` +
      `causal=${causalLaundering.overall_state}`,
  };
}

export function checkAllL9_9Invariants(): readonly L9_9InvariantResult[] {
  return [
    checkINV_99_A(),
    checkINV_99_B(),
    checkINV_99_C(),
    checkINV_99_D(),
    checkINV_99_E(),
    checkINV_99_F(),
    checkINV_99_G(),
  ];
}
