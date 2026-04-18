/**
 * L8.9 — Ratification, Freeze, Completion, and Handoff Invariants
 *
 * §8.9.9.1 — Executable invariants:
 *   INV-8.9-A : layer may not be PRODUCTION_READY unless all four
 *               completion dimensions are green
 *   INV-8.9-B : no ratification artifact may be emitted without every
 *               required L8 sublayer green and completion PRODUCTION_READY
 *   INV-8.9-C : freeze may not activate without valid ratification
 *   INV-8.9-D : later layers may depend only on declared stable handoff
 *               surfaces; forbidden kinds and internal surfaces denied
 *   INV-8.9-E : AD_HOC_REGIME_RECLASSIFICATION denied under NORMAL
 *               consumption and only CONDITIONALLY_ALLOWED under governed
 *               REPLAY/REPAIR/AUDIT
 *   INV-8.9-F : no extension classified as BREAKING_SEMANTIC or
 *               PROHIBITED may pass as ADDITIVE_SAFE; migrations require
 *               recertification
 *   INV-8.9-G : ratification downgrades on invalid definition surface,
 *               missing handoff surface, scrambled execution sequence,
 *               or replay/repair instability
 */

import {
  Layer8CompletionValidator,
  L8CompletionEvidence,
} from '../completion/l8-completion-validator';
import {
  Layer8RatificationBuilder,
} from '../completion/l8-ratification-builder';
import {
  Layer8FreezePolicyValidator,
} from '../completion/l8-freeze-activator';
import {
  Layer8ExtensionClassifier,
} from '../completion/l8-extension-classifier';
import {
  Layer8DownstreamDependencyValidator,
} from '../completion/l8-downstream-dependency-validator';
import {
  L8CompletionState,
  L8RatificationViolationCode,
} from '../contracts/l8-completion-standard';
import {
  L8FreezeStatus,
  L8_FREEZE_POLICY_V1,
} from '../contracts/l8-freeze-policy';
import {
  L8ExtensionClass,
  L8_EXTENSION_POLICY_V1,
} from '../contracts/l8-extension-policy';
import {
  L8DependencyAllowance,
  L8DownstreamAccessKind,
  L8DownstreamConsumerMode,
  L8_STABLE_HANDOFF_SURFACES,
} from '../contracts/l8-downstream-dependency';
import {
  L8_DEFINITION_SURFACE,
  L8_EXECUTION_SEQUENCE,
  L8_REQUIRED_SUBLAYERS,
} from '../contracts/l8-final-definition';
import {
  L8SublayerCertRef,
} from '../contracts/l8-ratification-artifact';

export interface L8_9InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ───────────────────────── fixture helpers ─────────────────────────

function greenCert(sublayer: string): L8SublayerCertRef {
  return {
    sublayer,
    version: '1.0.0',
    certification_run_id: `cert-${sublayer}`,
    level: 'PRODUCTION_GREEN',
    rollout_recommended: true,
    blocking_violations: [],
  };
}

function allGreenCerts(): readonly L8SublayerCertRef[] {
  return L8_REQUIRED_SUBLAYERS.map(greenCert);
}

export function buildL8GreenEvidence(): L8CompletionEvidence {
  const sublayer_certifications: Record<string, {
    certified: boolean;
    level: 'PRODUCTION_GREEN';
    blocking_violations: readonly string[];
  }> = {};
  for (const sl of L8_REQUIRED_SUBLAYERS) {
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
    regime_family_law_frozen: true,
    input_admissibility_frozen: true,
    template_law_frozen: true,
    no_ungoverned_regime_path: true,
    no_judgment_scenario_scoring_semantics: true,
    posture_consumed_not_laundered: true,

    subject_contracts_legal: true,
    output_contracts_complete: true,
    runtime_deterministic: true,
    confidence_cap_bound: true,
    transition_independent_of_confidence: true,
    multipliers_interpretive_only: true,
    cap_chains_explicit: true,

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

    no_critical_observability_breach: true,
    repair_instability_resolved: true,
    downstream_dependency_safe: true,

    final_definition_surface: L8_DEFINITION_SURFACE,
    execution_sequence: L8_EXECUTION_SEQUENCE,
  };
}

// ────────────────────────── INV-8.9-A ──────────────────────────

export function checkINV_89_A(): L8_9InvariantResult {
  const validator = new Layer8CompletionValidator();
  const green = buildL8GreenEvidence();
  const allGreen = validator.validate(green);
  const partial = validator.validate({
    ...green,
    runtime_deterministic: false,
  });
  const holds =
    allGreen.overall_state === L8CompletionState.L8_PRODUCTION_READY &&
    partial.overall_state !== L8CompletionState.L8_PRODUCTION_READY;
  return {
    id: 'INV-8.9-A',
    name: 'PRODUCTION_READY requires all four completion dimensions green',
    holds,
    evidence:
      `allGreen=${allGreen.overall_state} partial=${partial.overall_state}`,
  };
}

// ────────────────────────── INV-8.9-B ──────────────────────────

export function checkINV_89_B(): L8_9InvariantResult {
  const builder = new Layer8RatificationBuilder();
  const validator = new Layer8CompletionValidator();
  const green = buildL8GreenEvidence();

  // Drop L8.8 to simulate a missing/failed sublayer.
  const scoped: Record<string, {
    certified: boolean;
    level: 'FAILED' | 'CONSTITUTIONAL_GREEN' | 'RUNTIME_GREEN' |
      'PRODUCTION_GREEN';
    blocking_violations: readonly string[];
  }> = {};
  for (const [k, v] of Object.entries(green.sublayer_certifications)) {
    if (k !== 'L8.8') scoped[k] = v;
  }
  const completion = validator.validate({
    ...green,
    sublayer_certifications: scoped,
  });
  const refs = allGreenCerts().filter(r => r.sublayer !== 'L8.8');
  const built = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'inv.B',
    sub_layer_versions: Object.fromEntries(
      refs.map(r => [r.sublayer, r.version]),
    ),
    certification_artifact_refs: refs,
    completion,
    freeze_status: L8FreezeStatus.FROZEN,
    extension_policy_version: L8_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L8.9/v1',
    final_definition_surface: L8_DEFINITION_SURFACE,
    execution_sequence: L8_EXECUTION_SEQUENCE,
  });

  const holds =
    !built.allowed &&
    built.blocking_violations.includes(
      L8RatificationViolationCode.MISSING_SUBLAYER,
    );
  return {
    id: 'INV-8.9-B',
    name:
      'ratification requires every L8 sublayer green + completion ' +
      'PRODUCTION_READY',
    holds,
    evidence:
      `allowed=${built.allowed} blockers=` +
      built.blocking_violations.join(','),
  };
}

// ────────────────────────── INV-8.9-C ──────────────────────────

export function checkINV_89_C(): L8_9InvariantResult {
  const fv = new Layer8FreezePolicyValidator();
  const noRat = fv.activate({
    request_id: 'f-1',
    target_status: L8FreezeStatus.FROZEN,
    ratification: null,
    freeze_policy: L8_FREEZE_POLICY_V1,
  });
  const noHard = fv.activate({
    request_id: 'f-2',
    target_status: L8FreezeStatus.HARD_PROTECTED,
    ratification: null,
    freeze_policy: L8_FREEZE_POLICY_V1,
  });
  const holds =
    !noRat.allowed &&
    noRat.violations.includes(
      L8RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION,
    ) &&
    !noHard.allowed;
  return {
    id: 'INV-8.9-C',
    name: 'freeze requires a valid ratification artifact',
    holds,
    evidence:
      `frozen=${noRat.allowed} hard=${noHard.allowed} ` +
      `rationale=${noRat.rationale}`,
  };
}

// ────────────────────────── INV-8.9-D ──────────────────────────

export function checkINV_89_D(): L8_9InvariantResult {
  const v = new Layer8DownstreamDependencyValidator();
  const internal = v.validate({
    request_id: 'd-internal',
    consumer_layer: 'L9',
    access_kind: L8DownstreamAccessKind.INTERNAL_RUNTIME_DAG_NODE,
    consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const judgment = v.validate({
    request_id: 'd-judgment',
    consumer_layer: 'L9',
    access_kind: L8DownstreamAccessKind.JUDGMENT_FROM_L8,
    consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const score = v.validate({
    request_id: 'd-score',
    consumer_layer: 'L9',
    access_kind: L8DownstreamAccessKind.SCORE_FROM_L8,
    consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const stable = v.validate({
    request_id: 'd-stable',
    consumer_layer: 'L9',
    access_kind: L8DownstreamAccessKind.CURRENT_REGIME_SNAPSHOT,
    consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const holds =
    internal.allowance === L8DependencyAllowance.DENIED &&
    judgment.allowance === L8DependencyAllowance.DENIED &&
    score.allowance === L8DependencyAllowance.DENIED &&
    stable.allowance === L8DependencyAllowance.ALLOWED;
  return {
    id: 'INV-8.9-D',
    name: 'later layers limited to stable handoff surfaces only',
    holds,
    evidence:
      `internal=${internal.allowance} judgment=${judgment.allowance} ` +
      `score=${score.allowance} stable=${stable.allowance}`,
  };
}

// ────────────────────────── INV-8.9-E ──────────────────────────

export function checkINV_89_E(): L8_9InvariantResult {
  const v = new Layer8DownstreamDependencyValidator();
  const normalAdHoc = v.validate({
    request_id: 'e-normal',
    consumer_layer: 'L9',
    access_kind:
      L8DownstreamAccessKind.AD_HOC_REGIME_RECLASSIFICATION,
    consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  const replayAdHoc = v.validate({
    request_id: 'e-replay',
    consumer_layer: 'L9',
    access_kind:
      L8DownstreamAccessKind.AD_HOC_REGIME_RECLASSIFICATION,
    consumer_mode: L8DownstreamConsumerMode.GOVERNED_REPLAY,
    notes: '',
  });
  const repairAdHoc = v.validate({
    request_id: 'e-repair',
    consumer_layer: 'L9',
    access_kind:
      L8DownstreamAccessKind.AD_HOC_REGIME_RECLASSIFICATION,
    consumer_mode: L8DownstreamConsumerMode.GOVERNED_REPAIR,
    notes: '',
  });
  const holds =
    normalAdHoc.allowance === L8DependencyAllowance.DENIED &&
    replayAdHoc.allowance ===
      L8DependencyAllowance.CONDITIONALLY_ALLOWED &&
    repairAdHoc.allowance ===
      L8DependencyAllowance.CONDITIONALLY_ALLOWED;
  return {
    id: 'INV-8.9-E',
    name:
      'ad-hoc reclassification denied under NORMAL, only conditional ' +
      'under governed modes',
    holds,
    evidence:
      `normal=${normalAdHoc.allowance} replay=${replayAdHoc.allowance} ` +
      `repair=${repairAdHoc.allowance}`,
  };
}

// ────────────────────────── INV-8.9-F ──────────────────────────

export function checkINV_89_F(): L8_9InvariantResult {
  const classifier = new Layer8ExtensionClassifier();
  const base = {
    proposal_id: '',
    title: '',
    touches_frozen_surface: false,
    touches_hard_protected_surface: false,
    alters_regime_class_meaning: false,
    alters_regime_family_ontology: false,
    alters_coexistence_law: false,
    alters_subject_contract: false,
    alters_output_contract: false,
    alters_confidence_law: false,
    alters_transition_law: false,
    alters_multiplier_law: false,
    alters_cap_chain_law: false,
    alters_input_admissibility: false,
    alters_template_semantics: false,
    alters_read_surface: false,
    alters_stable_handoff_surface: false,
    introduces_judgment_semantics: false,
    introduces_recommendation_semantics: false,
    introduces_scoring_finality: false,
    turns_multiplier_into_final_score: false,
    enables_redis_as_authority: false,
    enables_live_raw_l6_l7_reclassification: false,
    bypasses_l5_persistence: false,
    is_additive_only: false,
    preserves_replay_hashes: true,
    preserves_historical_meaning: true,
    widens_downstream_rights: false,
    notes: '',
  };

  const prohibited = classifier.classify({
    ...base,
    proposal_id: 'f-prohibited',
    title: 'turn multiplier into final score',
    turns_multiplier_into_final_score: true,
  });
  const breaking = classifier.classify({
    ...base,
    proposal_id: 'f-breaking',
    title: 'alter regime class meaning',
    alters_regime_class_meaning: true,
    touches_frozen_surface: true,
  });
  const migration = classifier.classify({
    ...base,
    proposal_id: 'f-migration',
    title: 'adjust template semantics',
    alters_template_semantics: true,
  });
  const additive = classifier.classify({
    ...base,
    proposal_id: 'f-additive',
    title: 'new fixture',
    is_additive_only: true,
  });

  const holds =
    prohibited.classification === L8ExtensionClass.PROHIBITED &&
    prohibited.requires_recertification &&
    breaking.classification === L8ExtensionClass.BREAKING_SEMANTIC &&
    breaking.requires_recertification &&
    migration.classification === L8ExtensionClass.MIGRATION_REQUIRED &&
    migration.requires_recertification &&
    additive.classification === L8ExtensionClass.ADDITIVE_SAFE &&
    !additive.requires_recertification;

  return {
    id: 'INV-8.9-F',
    name:
      'breaking/prohibited changes cannot pass as additive-safe; ' +
      'migrations require recertification',
    holds,
    evidence:
      `prohibited=${prohibited.classification} ` +
      `breaking=${breaking.classification} ` +
      `migration=${migration.classification} ` +
      `additive=${additive.classification}`,
  };
}

// ────────────────────────── INV-8.9-G ──────────────────────────

export function checkINV_89_G(): L8_9InvariantResult {
  const validator = new Layer8CompletionValidator();
  const green = buildL8GreenEvidence();

  const good = validator.validate(green);
  const badDef = validator.validate({
    ...green,
    final_definition_surface: ['Layer 8 is a ranking engine'],
  });
  const scrambled = validator.validate({
    ...green,
    execution_sequence: [...L8_EXECUTION_SEQUENCE].reverse(),
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

  const holds =
    good.overall_state === L8CompletionState.L8_PRODUCTION_READY &&
    badDef.overall_state !== L8CompletionState.L8_PRODUCTION_READY &&
    badDef.violations.includes(
      L8RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION,
    ) &&
    scrambled.overall_state !== L8CompletionState.L8_PRODUCTION_READY &&
    scrambled.violations.includes(
      L8RatificationViolationCode.EXECUTION_ORDER_VIOLATION,
    ) &&
    replayBroken.overall_state !==
      L8CompletionState.L8_PRODUCTION_READY &&
    repairBroken.overall_state !==
      L8CompletionState.L8_PRODUCTION_READY &&
    missingHandoff.overall_state !==
      L8CompletionState.L8_PRODUCTION_READY &&
    missingHandoff.violations.includes(
      L8RatificationViolationCode.MISSING_HANDOFF_SURFACE,
    );

  return {
    id: 'INV-8.9-G',
    name:
      'ratification downgrades on invalid definition, scrambled ' +
      'execution, missing handoff, or replay/repair instability',
    holds,
    evidence:
      `good=${good.overall_state} badDef=${badDef.overall_state} ` +
      `scrambled=${scrambled.overall_state} ` +
      `replay=${replayBroken.overall_state} ` +
      `repair=${repairBroken.overall_state} ` +
      `missingHandoff=${missingHandoff.overall_state}`,
  };
}

export function checkAllL8_9Invariants(): readonly L8_9InvariantResult[] {
  return [
    checkINV_89_A(),
    checkINV_89_B(),
    checkINV_89_C(),
    checkINV_89_D(),
    checkINV_89_E(),
    checkINV_89_F(),
    checkINV_89_G(),
  ];
}
