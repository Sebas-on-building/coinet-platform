/**
 * L6.9 — Ratification, Freeze, Completion Invariants
 *
 * §6.9.9.1 — Executable invariants:
 *   INV-6.9-A : layer may not be ratified unless all required sublayers
 *               are present and certified
 *   INV-6.9-B : completion requires constitutional + functional +
 *               operational + dependency to all be satisfied
 *   INV-6.9-C : freeze may not activate without a valid ratification
 *               artifact
 *   INV-6.9-D : breaking semantic changes after ratification must be
 *               classified and gated by extension policy
 *   INV-6.9-E : later layers may depend only on frozen read surfaces,
 *               not on raw / ad hoc recompute
 *   INV-6.9-F : final Layer 6 definition must remain consistent with
 *               L6.1–L6.8 and may not contradict them
 *   INV-6.9-G : the ratified execution sequence preserves the causal
 *               build order
 */

import {
  L6CompletionEvidence,
  Layer6CompletionValidator,
} from '../completion/l6-completion-validator';
import {
  Layer6RatificationBuilder,
} from '../completion/l6-ratification-builder';
import {
  Layer6FreezePolicyValidator,
} from '../completion/l6-freeze-activator';
import {
  Layer6ExtensionClassifier,
} from '../completion/l6-extension-classifier';
import {
  Layer6DownstreamDependencyValidator,
} from '../completion/l6-handoff-validator';
import {
  L6CompletionState,
  L6RatificationViolationCode,
} from '../contracts/l6-completion-standard';
import { L6FreezeStatus, L6_FREEZE_POLICY_V1 } from '../contracts/l6-freeze-policy';
import { L6ExtensionClass } from '../contracts/l6-extension-policy';
import {
  L6DependencyAllowance,
  L6DownstreamAccessKind,
  L6DownstreamConsumerMode,
} from '../contracts/l6-downstream-dependency';
import {
  L6_DEFINITION_SURFACE,
  L6_EXECUTION_SEQUENCE,
  REQUIRED_SUBLAYERS,
} from '../contracts/l6-final-definition';
import { L6SublayerCertRef } from '../contracts/l6-ratification-artifact';

export interface L6_9InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function greenCert(sublayer: string): L6SublayerCertRef {
  return {
    sublayer,
    version: '1.0.0',
    certification_run_id: `cert-${sublayer}`,
    level: 'PRODUCTION_GREEN',
    rollout_recommended: true,
    blocking_violations: [],
  };
}

function allGreenCerts(): readonly L6SublayerCertRef[] {
  return REQUIRED_SUBLAYERS.map(greenCert);
}

export function buildGreenEvidence(): L6CompletionEvidence {
  const sublayer_certifications: Record<string, { certified: boolean; level: 'PRODUCTION_GREEN'; blocking_violations: readonly string[] }> = {};
  for (const sl of REQUIRED_SUBLAYERS) {
    sublayer_certifications[sl] = {
      certified: true,
      level: 'PRODUCTION_GREEN',
      blocking_violations: [],
    };
  }
  return {
    sublayer_certifications,
    invariants_all_green: true,
    architectural_ambiguity_resolved: true,
    governed_primitive_paths_only: true,
    current_history_evidence_authority_defined: true,
    late_data_and_replay_unambiguous: true,
    family_legality_resolved: true,

    all_feature_families_registered: true,
    all_event_families_registered: true,
    feature_current_history_aligned: true,
    event_current_history_aligned: true,
    evidence_packs_for_material_outputs: true,
    read_surfaces_active: true,

    runtime_deterministic: true,
    compute_dag_acyclic: true,
    replay_safe: true,
    repair_safe: true,
    late_data_policy_enforced: true,
    no_shadow_authority: true,
    observability_slo_complete: true,
    rollback_migration_discipline: true,
    no_critical_assurance_band_failures: true,

    later_layers_can_consume_current_snapshot: true,
    later_layers_can_consume_active_events: true,
    later_layers_can_consume_history_and_evidence: true,
    ad_hoc_recompute_forbidden_outside_replay_repair: true,
    outputs_stable_for_frozen_dependency: true,

    final_definition_surface: L6_DEFINITION_SURFACE,
    execution_sequence: L6_EXECUTION_SEQUENCE,
  };
}

export function checkINV_69_A(): L6_9InvariantResult {
  const builder = new Layer6RatificationBuilder();
  const validator = new Layer6CompletionValidator();

  // Build with a missing sublayer
  const missing = allGreenCerts().filter(r => r.sublayer !== 'L6.4');
  const ev = buildGreenEvidence();
  const scopedCerts: Record<string, { certified: boolean; level: 'PRODUCTION_GREEN'; blocking_violations: readonly string[] }> = {};
  for (const [k, v] of Object.entries(ev.sublayer_certifications)) {
    if (k !== 'L6.4') scopedCerts[k] = v as typeof scopedCerts[string];
  }
  const completion = validator.validate({ ...ev, sublayer_certifications: scopedCerts });
  const { allowed, blocking_violations } = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'run-A',
    sub_layer_versions: Object.fromEntries(missing.map(c => [c.sublayer, c.version])),
    certification_artifact_refs: missing,
    completion,
    freeze_status: L6FreezeStatus.FROZEN,
    extension_policy_version: '1.0.0',
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L6.9-v1',
    final_definition_surface: L6_DEFINITION_SURFACE,
    execution_sequence: L6_EXECUTION_SEQUENCE,
  });

  const holds = !allowed && blocking_violations.includes(L6RatificationViolationCode.MISSING_SUBLAYER);
  return {
    id: 'INV-6.9-A',
    name: 'ratification requires all sublayers certified',
    holds,
    evidence: `allowed=${allowed} blockers=${blocking_violations.join(',')}`,
  };
}

export function checkINV_69_B(): L6_9InvariantResult {
  const validator = new Layer6CompletionValidator();
  const green = buildGreenEvidence();

  const allGreen = validator.validate(green);
  // Drop operational to simulate partial completion
  const partial = validator.validate({ ...green, runtime_deterministic: false });

  const holds =
    allGreen.overall_state === L6CompletionState.L6_PRODUCTION_READY &&
    partial.overall_state !== L6CompletionState.L6_PRODUCTION_READY;
  return {
    id: 'INV-6.9-B',
    name: 'completion requires all four dimensions satisfied',
    holds,
    evidence: `allGreen=${allGreen.overall_state} partial=${partial.overall_state}`,
  };
}

export function checkINV_69_C(): L6_9InvariantResult {
  const fv = new Layer6FreezePolicyValidator();
  const decision = fv.activate({
    request_id: 'f-1',
    target_status: L6FreezeStatus.FROZEN,
    ratification: null,
    freeze_policy: L6_FREEZE_POLICY_V1,
  });
  const holds =
    !decision.allowed &&
    decision.violations.includes(L6RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
  return {
    id: 'INV-6.9-C',
    name: 'freeze requires a valid ratification artifact',
    holds,
    evidence: `allowed=${decision.allowed} rationale=${decision.rationale}`,
  };
}

export function checkINV_69_D(): L6_9InvariantResult {
  const classifier = new Layer6ExtensionClassifier();

  const breaking = classifier.classify({
    proposal_id: 'p-breaking',
    title: 'break primitive meaning',
    touches_frozen_surface: true,
    touches_hard_protected_surface: true,
    alters_primitive_meaning: true,
    alters_event_lifecycle: false,
    alters_current_state_authority: false,
    alters_replay_identity: false,
    alters_contract_required_fields: false,
    alters_late_data_law: false,
    is_additive_only: false,
    preserves_replay_hashes: false,
    preserves_historical_meaning: false,
    notes: 'test',
  });
  const additive = classifier.classify({
    proposal_id: 'p-additive',
    title: 'add new family',
    touches_frozen_surface: false,
    touches_hard_protected_surface: false,
    alters_primitive_meaning: false,
    alters_event_lifecycle: false,
    alters_current_state_authority: false,
    alters_replay_identity: false,
    alters_contract_required_fields: false,
    alters_late_data_law: false,
    is_additive_only: true,
    preserves_replay_hashes: true,
    preserves_historical_meaning: true,
    notes: 'test',
  });

  const holds =
    (breaking.classification === L6ExtensionClass.BREAKING_SEMANTIC ||
      breaking.classification === L6ExtensionClass.PROHIBITED) &&
    breaking.requires_recertification &&
    additive.classification === L6ExtensionClass.ADDITIVE_SAFE &&
    !additive.requires_recertification;

  return {
    id: 'INV-6.9-D',
    name: 'breaking semantic changes are classified + gated',
    holds,
    evidence: `breaking=${breaking.classification} additive=${additive.classification}`,
  };
}

export function checkINV_69_E(): L6_9InvariantResult {
  const v = new Layer6DownstreamDependencyValidator();

  const adHoc = v.validate(
    {
      request_id: 'r-ad-hoc',
      consumer_layer: 'L7',
      access_kind: L6DownstreamAccessKind.AD_HOC_RECOMPUTE,
      consumer_mode: L6DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    },
    { freeze_status: L6FreezeStatus.FROZEN, downstream_dependency_allowed: true },
  );
  const rawL5 = v.validate(
    {
      request_id: 'r-raw',
      consumer_layer: 'L7',
      access_kind: L6DownstreamAccessKind.RAW_L5_HISTORY_READ,
      consumer_mode: L6DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    },
    { freeze_status: L6FreezeStatus.FROZEN, downstream_dependency_allowed: true },
  );
  const snapshot = v.validate(
    {
      request_id: 'r-snap',
      consumer_layer: 'L7',
      access_kind: L6DownstreamAccessKind.CURRENT_FEATURE_SNAPSHOT,
      consumer_mode: L6DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    },
    { freeze_status: L6FreezeStatus.FROZEN, downstream_dependency_allowed: true },
  );

  const holds =
    adHoc.allowance === L6DependencyAllowance.FORBIDDEN &&
    rawL5.allowance === L6DependencyAllowance.FORBIDDEN &&
    snapshot.allowance === L6DependencyAllowance.ALLOWED;

  return {
    id: 'INV-6.9-E',
    name: 'later layers limited to frozen surfaces only',
    holds,
    evidence: `adHoc=${adHoc.allowance} rawL5=${rawL5.allowance} snapshot=${snapshot.allowance}`,
  };
}

export function checkINV_69_F(): L6_9InvariantResult {
  const validator = new Layer6CompletionValidator();
  const ev = buildGreenEvidence();

  const good = validator.validate(ev);
  const bad = validator.validate({ ...ev, final_definition_surface: ['Layer 6 is a dashboard'] });

  const holds =
    good.overall_state === L6CompletionState.L6_PRODUCTION_READY &&
    bad.overall_state !== L6CompletionState.L6_PRODUCTION_READY &&
    bad.violations.includes(L6RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION);

  return {
    id: 'INV-6.9-F',
    name: 'final definition must remain consistent with L6.1–L6.8',
    holds,
    evidence: `good=${good.overall_state} bad=${bad.overall_state}`,
  };
}

export function checkINV_69_G(): L6_9InvariantResult {
  const validator = new Layer6CompletionValidator();
  const ev = buildGreenEvidence();

  const scrambled = [...L6_EXECUTION_SEQUENCE].reverse();
  const result = validator.validate({ ...ev, execution_sequence: scrambled });

  const holds =
    result.overall_state !== L6CompletionState.L6_PRODUCTION_READY &&
    result.violations.includes(L6RatificationViolationCode.EXECUTION_ORDER_VIOLATION);
  return {
    id: 'INV-6.9-G',
    name: 'execution sequence preserves causal build order',
    holds,
    evidence: `state=${result.overall_state}`,
  };
}

export function checkAllL6_9Invariants(): readonly L6_9InvariantResult[] {
  return [
    checkINV_69_A(),
    checkINV_69_B(),
    checkINV_69_C(),
    checkINV_69_D(),
    checkINV_69_E(),
    checkINV_69_F(),
    checkINV_69_G(),
  ];
}
