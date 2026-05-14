/**
 * L10.9 — Closure, Ratification, and Completion-Standard Invariants
 *
 * §10.9.13 INV-10.9-A..G — Seven machine-enforced invariants for the
 * closure layer of the Hypothesis Engine. Each returns a boolean
 * `holds` plus an evidence string that replays cleanly under the
 * certification suite.
 *
 *   INV-10.9-A : sublayer completion — a ratification artifact is
 *                illegal if any required L10 sublayer is missing or
 *                not PRODUCTION_GREEN, or if completion is not
 *                L10_PRODUCTION_READY.
 *   INV-10.9-B : ratification validity — freeze and hard-protection
 *                require a valid ratification; completion validator
 *                rejects freeze without ratification.
 *   INV-10.9-C : downstream dependency — later layers may only rely
 *                on declared stable handoff surfaces; forbidden
 *                access kinds are denied; governed-only kinds are
 *                conditional.
 *   INV-10.9-D : extension classification — breaking/prohibited
 *                changes can never pass as ADDITIVE_SAFE; migrations
 *                require recertification; absolute prohibitions
 *                (judgment/scenario/scoring/recommendation/single-
 *                story-collapse/Redis-as-authority/live-rebuild/
 *                primary-as-final-judgment) classify PROHIBITED.
 *   INV-10.9-E : rollback safety — rollback may not erase historical
 *                hypothesis facts, break lineage, or silently
 *                downgrade frozen surfaces.
 *   INV-10.9-F : production-green artifact emission — the rollout
 *                gate blocks downstream-visible transitions without
 *                a ratification artifact; every recognized failure
 *                class has a registered playbook.
 *   INV-10.9-G : deterministic completion — completion downgrades on
 *                drifted definition surface, scrambled execution
 *                sequence, missing handoff surface, or replay/repair
 *                instability.
 */

import {
  Layer10CompletionValidator,
} from '../completion/l10-completion-validator';
import {
  Layer10RatificationBuilder,
} from '../completion/l10-ratification-builder';
import {
  Layer10FreezePolicyValidator,
} from '../completion/l10-freeze-activator';
import {
  Layer10ExtensionClassifier,
} from '../completion/l10-extension-classifier';
import {
  Layer10HandoffValidator,
} from '../completion/l10-handoff-validator';
import {
  L10CompletionState,
  L10RatificationViolationCode,
} from '../contracts/l10-completion-standard';
import {
  L10FreezeStatus,
  L10_FREEZE_POLICY_V1,
} from '../contracts/l10-freeze-policy';
import {
  L10ExtensionClass,
  L10_EXTENSION_POLICY_V1,
} from '../contracts/l10-extension-policy';
import {
  L10DependencyAllowance,
  L10DownstreamAccessKind,
  L10DownstreamConsumerMode,
  L10_STABLE_HANDOFF_SURFACES,
} from '../contracts/l10-downstream-dependency';
import {
  L10_DEFINITION_SURFACE,
  L10_EXECUTION_SEQUENCE,
  L10_REQUIRED_SUBLAYERS,
} from '../contracts/l10-final-definition';
import {
  L10SublayerCertRef,
} from '../contracts/l10-ratification-artifact';
import {
  Layer10RolloutGate,
} from '../rollout/l10-rollout-gate';
import {
  L10RolloutPhase,
} from '../rollout/l10-rollout-phase';
import {
  Layer10RollbackPolicy,
  L10RollbackClass,
} from '../rollout/l10-rollback-policy';
import {
  verifyL10FailurePlaybookCoverage,
} from '../rollout/l10-failure-playbooks';

export interface L10_9InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ───────────────────────── fixture helpers ─────────────────────────

function greenCert(sublayer: string): L10SublayerCertRef {
  return {
    sublayer,
    version: '1.0.0',
    certification_run_id: `cert-${sublayer}`,
    level: 'PRODUCTION_GREEN',
    rollout_recommended: true,
    blocking_violations: [],
  };
}

function allGreenCerts(): readonly L10SublayerCertRef[] {
  return L10_REQUIRED_SUBLAYERS.map(greenCert);
}

type L10GreenEvidence = Parameters<
  Layer10CompletionValidator['validate']
>[0];

export function buildL10GreenEvidence(): L10GreenEvidence {
  const sublayer_certifications: Record<string, {
    certified: boolean;
    level: 'FAILED' | 'CONSTITUTIONAL_GREEN' | 'RUNTIME_GREEN' |
      'PRODUCTION_GREEN';
    blocking_violations: readonly string[];
  }> = {};
  for (const sl of L10_REQUIRED_SUBLAYERS) {
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
    object_model_frozen: true,
    family_template_law_frozen: true,
    no_ungoverned_hypothesis_path: true,
    no_judgment_scenario_scoring_recommendation_semantics: true,
    l7_posture_consumed_not_laundered: true,
    l8_posture_consumed_not_laundered: true,
    l9_posture_consumed_not_laundered: true,
    no_single_story_collapse: true,

    subject_contracts_legal: true,
    output_contracts_complete: true,
    runtime_deterministic: true,
    evidence_semantics_legal: true,
    confidence_cap_bound: true,
    restriction_rights_explicit: true,
    readiness_explicit: true,
    spread_preserved: true,

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

    final_definition_surface: L10_DEFINITION_SURFACE,
    execution_sequence: L10_EXECUTION_SEQUENCE,
  };
}

// ────────────────────────── INV-10.9-A ──────────────────────────

export function checkINV_109_A(): L10_9InvariantResult {
  const builder = new Layer10RatificationBuilder();
  const validator = new Layer10CompletionValidator();
  const green = buildL10GreenEvidence();

  const scoped: Record<string, {
    certified: boolean;
    level: 'FAILED' | 'CONSTITUTIONAL_GREEN' | 'RUNTIME_GREEN' |
      'PRODUCTION_GREEN';
    blocking_violations: readonly string[];
  }> = {};
  for (const [k, v] of Object.entries(green.sublayer_certifications)) {
    if (k !== 'L10.8') scoped[k] = v;
  }
  const completion = validator.validate({
    ...green,
    sublayer_certifications: scoped,
  });
  const refs = allGreenCerts().filter(r => r.sublayer !== 'L10.8');
  const built = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'inv.A',
    sub_layer_versions: Object.fromEntries(
      refs.map(r => [r.sublayer, r.version]),
    ),
    certification_artifact_refs: refs,
    completion,
    freeze_status: L10FreezeStatus.FROZEN,
    extension_policy_version: L10_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L10.9/v1',
    final_definition_surface: L10_DEFINITION_SURFACE,
    execution_sequence: L10_EXECUTION_SEQUENCE,
  });

  const holds =
    !built.allowed &&
    built.blocking_violations.includes(
      L10RatificationViolationCode.MISSING_SUBLAYER,
    );
  return {
    id: 'INV-10.9-A',
    name:
      'ratification requires every L10 sublayer green + completion ' +
      'L10_PRODUCTION_READY',
    holds,
    evidence:
      `allowed=${built.allowed} blockers=` +
      built.blocking_violations.join(','),
  };
}

// ────────────────────────── INV-10.9-B ──────────────────────────

export function checkINV_109_B(): L10_9InvariantResult {
  const validator = new Layer10CompletionValidator();
  const fv = new Layer10FreezePolicyValidator();
  const green = buildL10GreenEvidence();

  const greenEval = validator.validate(green);
  const partial = validator.validate({
    ...green,
    runtime_deterministic: false,
  });

  const noRat = fv.activate({
    request_id: 'f-1',
    target_status: L10FreezeStatus.FROZEN,
    ratification: null,
    freeze_policy: L10_FREEZE_POLICY_V1,
  });
  const noHard = fv.activate({
    request_id: 'f-2',
    target_status: L10FreezeStatus.HARD_PROTECTED,
    ratification: null,
    freeze_policy: L10_FREEZE_POLICY_V1,
  });

  const holds =
    greenEval.overall_state === L10CompletionState.L10_PRODUCTION_READY &&
    partial.overall_state !== L10CompletionState.L10_PRODUCTION_READY &&
    !noRat.allowed &&
    noRat.violations.includes(
      L10RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION,
    ) &&
    !noHard.allowed;

  return {
    id: 'INV-10.9-B',
    name:
      'PRODUCTION_READY requires all four dimensions green; freeze ' +
      'and hard-protection require a valid ratification',
    holds,
    evidence:
      `green=${greenEval.overall_state} ` +
      `partial=${partial.overall_state} ` +
      `noRat.allowed=${noRat.allowed} noHard.allowed=${noHard.allowed}`,
  };
}

// ────────────────────────── INV-10.9-C ──────────────────────────

export function checkINV_109_C(): L10_9InvariantResult {
  const v = new Layer10HandoffValidator();

  const internal = v.validate({
    request_id: 'c-internal',
    consumer_layer: 'L11',
    access_kind: L10DownstreamAccessKind.INTERNAL_RUNTIME_DAG_NODE,
    consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const judgment = v.validate({
    request_id: 'c-judgment',
    consumer_layer: 'L11',
    access_kind: L10DownstreamAccessKind.JUDGMENT_FROM_L10,
    consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const score = v.validate({
    request_id: 'c-score',
    consumer_layer: 'L11',
    access_kind: L10DownstreamAccessKind.SCORE_FROM_L10,
    consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const recommendation = v.validate({
    request_id: 'c-recommend',
    consumer_layer: 'L11',
    access_kind: L10DownstreamAccessKind.RECOMMENDATION_FROM_L10,
    consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const primaryAsJudgment = v.validate({
    request_id: 'c-primary-as-judgment',
    consumer_layer: 'L11',
    access_kind: L10DownstreamAccessKind.PRIMARY_AS_FINAL_JUDGMENT,
    consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const stable = v.validate({
    request_id: 'c-stable',
    consumer_layer: 'L11',
    access_kind: L10DownstreamAccessKind.CURRENT_HYPOTHESIS_SNAPSHOT,
    consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const replayNormal = v.validate({
    request_id: 'c-replay-normal',
    consumer_layer: 'L11',
    access_kind: L10DownstreamAccessKind.AD_HOC_HYPOTHESIS_REPLAY,
    consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const replayGoverned = v.validate({
    request_id: 'c-replay-governed',
    consumer_layer: 'L11',
    access_kind: L10DownstreamAccessKind.AD_HOC_HYPOTHESIS_REPLAY,
    consumer_mode: L10DownstreamConsumerMode.GOVERNED_REPLAY,
    notes: '',
  });

  const holds =
    internal.allowance === L10DependencyAllowance.DENIED &&
    judgment.allowance === L10DependencyAllowance.DENIED &&
    score.allowance === L10DependencyAllowance.DENIED &&
    recommendation.allowance === L10DependencyAllowance.DENIED &&
    primaryAsJudgment.allowance === L10DependencyAllowance.DENIED &&
    stable.allowance === L10DependencyAllowance.ALLOWED &&
    replayNormal.allowance === L10DependencyAllowance.DENIED &&
    replayGoverned.allowance ===
      L10DependencyAllowance.CONDITIONALLY_ALLOWED;

  return {
    id: 'INV-10.9-C',
    name:
      'later layers limited to stable handoff surfaces; forbidden ' +
      'kinds denied; ad-hoc only conditional under governed modes',
    holds,
    evidence:
      `internal=${internal.allowance} judgment=${judgment.allowance} ` +
      `score=${score.allowance} recommendation=${recommendation.allowance} ` +
      `primaryAsJudgment=${primaryAsJudgment.allowance} ` +
      `stable=${stable.allowance} replayNormal=${replayNormal.allowance} ` +
      `replayGoverned=${replayGoverned.allowance}`,
  };
}

// ────────────────────────── INV-10.9-D ──────────────────────────

export function checkINV_109_D(): L10_9InvariantResult {
  const classifier = new Layer10ExtensionClassifier();
  const base = {
    proposal_id: '',
    title: '',
    touches_frozen_surface: false,
    touches_hard_protected_surface: false,
    alters_hypothesis_family_ontology: false,
    alters_template_semantics: false,
    alters_subject_contract: false,
    alters_output_contract: false,
    alters_ranking_law: false,
    alters_spread_semantics: false,
    alters_cap_chain_law: false,
    alters_readiness_class_meaning: false,
    alters_restriction_right_meaning: false,
    alters_confidence_law: false,
    alters_support_semantics: false,
    alters_contradiction_semantics: false,
    alters_confirmation_semantics: false,
    alters_invalidation_semantics: false,
    alters_shift_condition_semantics: false,
    alters_read_surface: false,
    alters_stable_handoff_surface: false,
    introduces_judgment_semantics: false,
    introduces_scenario_semantics: false,
    introduces_scoring_finality: false,
    introduces_recommendation_semantics: false,
    enables_primary_as_final_judgment: false,
    enables_single_story_collapse: false,
    enables_live_lower_layer_rebuild: false,
    enables_redis_as_authority: false,
    bypasses_l5_persistence: false,
    introduces_causal_certainty_without_authorization: false,
    is_additive_only: false,
    preserves_replay_hashes: true,
    preserves_historical_meaning: true,
    widens_downstream_rights: false,
    notes: '',
  };

  const judgment = classifier.classify({
    ...base,
    proposal_id: 'd-judgment',
    title: 'introduce judgment semantics',
    introduces_judgment_semantics: true,
  });
  const collapse = classifier.classify({
    ...base,
    proposal_id: 'd-collapse',
    title: 'enable single-story collapse',
    enables_single_story_collapse: true,
  });
  const liveRebuild = classifier.classify({
    ...base,
    proposal_id: 'd-rebuild',
    title: 'enable live lower-layer rebuild',
    enables_live_lower_layer_rebuild: true,
  });
  const breaking = classifier.classify({
    ...base,
    proposal_id: 'd-breaking',
    title: 'alter ranking law',
    alters_ranking_law: true,
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
    judgment.classification === L10ExtensionClass.PROHIBITED &&
    judgment.requires_recertification &&
    collapse.classification === L10ExtensionClass.PROHIBITED &&
    collapse.requires_recertification &&
    liveRebuild.classification === L10ExtensionClass.PROHIBITED &&
    liveRebuild.requires_recertification &&
    breaking.classification === L10ExtensionClass.BREAKING_SEMANTIC &&
    breaking.requires_recertification &&
    migration.classification === L10ExtensionClass.MIGRATION_REQUIRED &&
    migration.requires_recertification &&
    additive.classification === L10ExtensionClass.ADDITIVE_SAFE &&
    !additive.requires_recertification;

  return {
    id: 'INV-10.9-D',
    name:
      'breaking/prohibited changes cannot pass as additive-safe; ' +
      'migrations require recertification',
    holds,
    evidence:
      `judgment=${judgment.classification} ` +
      `collapse=${collapse.classification} ` +
      `liveRebuild=${liveRebuild.classification} ` +
      `breaking=${breaking.classification} ` +
      `migration=${migration.classification} ` +
      `additive=${additive.classification}`,
  };
}

// ────────────────────────── INV-10.9-E ──────────────────────────

export function checkINV_109_E(): L10_9InvariantResult {
  const p = new Layer10RollbackPolicy();

  const deleteHistory = p.decide({
    request_id: 'e-delete',
    rollback_class: L10RollbackClass.DESTRUCTIVE_DELETE_HISTORY,
    preserves_historical_facts: false,
    preserves_lineage_continuity: true,
    downgrades_frozen_state: false,
    rationale: 'attempt',
  });
  const unlinkLineage = p.decide({
    request_id: 'e-unlink',
    rollback_class: L10RollbackClass.UNLINK_LINEAGE,
    preserves_historical_facts: true,
    preserves_lineage_continuity: false,
    downgrades_frozen_state: false,
    rationale: 'attempt',
  });
  const downgrade = p.decide({
    request_id: 'e-downgrade',
    rollback_class: L10RollbackClass.DOWNGRADE_FROZEN_STATE,
    preserves_historical_facts: true,
    preserves_lineage_continuity: true,
    downgrades_frozen_state: true,
    rationale: 'attempt',
  });
  const legalPhase = p.decide({
    request_id: 'e-phase',
    rollback_class: L10RollbackClass.ROLL_BACK_PHASE,
    preserves_historical_facts: true,
    preserves_lineage_continuity: true,
    downgrades_frozen_state: false,
    rationale: 'canary regression',
  });
  const fence = p.decide({
    request_id: 'e-fence',
    rollback_class: L10RollbackClass.FENCE_DOWNSTREAM,
    preserves_historical_facts: true,
    preserves_lineage_continuity: true,
    downgrades_frozen_state: false,
    rationale: 'downstream breach',
  });

  const holds =
    !deleteHistory.allowed &&
    deleteHistory.violations.includes(
      L10RatificationViolationCode.ROLLBACK_ERASES_HISTORY,
    ) &&
    !unlinkLineage.allowed &&
    unlinkLineage.violations.includes(
      L10RatificationViolationCode.ROLLBACK_BREAKS_LINEAGE,
    ) &&
    !downgrade.allowed &&
    downgrade.violations.includes(
      L10RatificationViolationCode.ROLLBACK_ERASES_HISTORY,
    ) &&
    legalPhase.allowed &&
    fence.allowed;

  return {
    id: 'INV-10.9-E',
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

// ────────────────────────── INV-10.9-F ──────────────────────────

export function checkINV_109_F(): L10_9InvariantResult {
  const validator = new Layer10CompletionValidator();
  const builder = new Layer10RatificationBuilder();
  const gate = new Layer10RolloutGate();
  const green = buildL10GreenEvidence();

  const completion = validator.validate(green);
  const ratification = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'inv.F',
    sub_layer_versions: Object.fromEntries(
      L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
    ),
    certification_artifact_refs: allGreenCerts(),
    completion,
    freeze_status: L10FreezeStatus.FROZEN,
    extension_policy_version: L10_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L10.9/v1',
    final_definition_surface: L10_DEFINITION_SURFACE,
    execution_sequence: L10_EXECUTION_SEQUENCE,
  });

  const preCanaryWithoutRat = gate.decide({
    request_id: 'g-no-rat',
    from_phase: L10RolloutPhase.SHADOW,
    to_phase: L10RolloutPhase.CANARY,
    ratification: null,
    freeze_status: L10FreezeStatus.OPEN,
  });
  const preCanaryWithoutFreeze = gate.decide({
    request_id: 'g-no-freeze',
    from_phase: L10RolloutPhase.SHADOW,
    to_phase: L10RolloutPhase.CANARY,
    ratification: ratification.artifact,
    freeze_status: L10FreezeStatus.OPEN,
  });
  const preCanaryGreen = gate.decide({
    request_id: 'g-ok',
    from_phase: L10RolloutPhase.SHADOW,
    to_phase: L10RolloutPhase.CANARY,
    ratification: ratification.artifact,
    freeze_status: L10FreezeStatus.FROZEN,
  });
  const scrambledOrder = gate.decide({
    request_id: 'g-scrambled',
    from_phase: L10RolloutPhase.SHADOW,
    to_phase: L10RolloutPhase.FULL_LIVE,
    ratification: ratification.artifact,
    freeze_status: L10FreezeStatus.FROZEN,
  });

  const coverage = verifyL10FailurePlaybookCoverage();

  const holds =
    ratification.allowed &&
    !preCanaryWithoutRat.allowed &&
    preCanaryWithoutRat.violations.includes(
      L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION,
    ) &&
    !preCanaryWithoutFreeze.allowed &&
    preCanaryGreen.allowed &&
    !scrambledOrder.allowed &&
    scrambledOrder.violations.includes(
      L10RatificationViolationCode.EXECUTION_ORDER_VIOLATION,
    ) &&
    coverage.all_covered;

  return {
    id: 'INV-10.9-F',
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

// ────────────────────────── INV-10.9-G ──────────────────────────

export function checkINV_109_G(): L10_9InvariantResult {
  const validator = new Layer10CompletionValidator();
  const green = buildL10GreenEvidence();

  const good = validator.validate(green);
  const badDef = validator.validate({
    ...green,
    final_definition_surface: ['Layer 10 is a scoring engine'],
  });
  const scrambled = validator.validate({
    ...green,
    execution_sequence: [...L10_EXECUTION_SEQUENCE].reverse(),
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
  const collapseAllowed = validator.validate({
    ...green,
    no_single_story_collapse: false,
  });

  const holds =
    good.overall_state === L10CompletionState.L10_PRODUCTION_READY &&
    badDef.overall_state !== L10CompletionState.L10_PRODUCTION_READY &&
    badDef.violations.includes(
      L10RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION,
    ) &&
    scrambled.overall_state !== L10CompletionState.L10_PRODUCTION_READY &&
    scrambled.violations.includes(
      L10RatificationViolationCode.EXECUTION_ORDER_VIOLATION,
    ) &&
    replayBroken.overall_state !==
      L10CompletionState.L10_PRODUCTION_READY &&
    repairBroken.overall_state !==
      L10CompletionState.L10_PRODUCTION_READY &&
    missingHandoff.overall_state !==
      L10CompletionState.L10_PRODUCTION_READY &&
    missingHandoff.violations.includes(
      L10RatificationViolationCode.MISSING_HANDOFF_SURFACE,
    ) &&
    collapseAllowed.overall_state !==
      L10CompletionState.L10_PRODUCTION_READY;

  return {
    id: 'INV-10.9-G',
    name:
      'completion downgrades on drifted definition, scrambled ' +
      'execution, missing handoff, replay/repair instability, or ' +
      'single-story collapse',
    holds,
    evidence:
      `good=${good.overall_state} badDef=${badDef.overall_state} ` +
      `scrambled=${scrambled.overall_state} ` +
      `replay=${replayBroken.overall_state} ` +
      `repair=${repairBroken.overall_state} ` +
      `missingHandoff=${missingHandoff.overall_state} ` +
      `collapse=${collapseAllowed.overall_state}`,
  };
}

export function checkAllL10_9Invariants():
  readonly L10_9InvariantResult[] {
  return [
    checkINV_109_A(),
    checkINV_109_B(),
    checkINV_109_C(),
    checkINV_109_D(),
    checkINV_109_E(),
    checkINV_109_F(),
    checkINV_109_G(),
  ];
}
