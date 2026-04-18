/**
 * L7.9 — Ratification, Freeze, Completion, and Handoff Invariants
 *
 * §7.9.9.1 — Executable invariants:
 *   INV-7.9-A : layer may not be marked PRODUCTION_READY unless all
 *               completion dimensions are green
 *   INV-7.9-B : no ratification artifact may be emitted without a valid
 *               L7.8 production-green certification artifact
 *   INV-7.9-C : freeze may not activate without valid ratification
 *   INV-7.9-D : no extension classified as BREAKING_SEMANTIC or
 *               PROHIBITED may pass as additive-safe
 *   INV-7.9-E : later layers may depend only on declared stable
 *               handoff surfaces
 *   INV-7.9-F : ratification must downgrade if a required handoff
 *               surface or completion dimension becomes invalid
 *   INV-7.9-G : Layer 7 must remain dependency-safe for Layer 8+
 *               under live, replay, and repair modes
 */

import {
  L7CompletionEvidence,
  Layer7CompletionValidator,
} from '../completion/l7-completion-validator';
import {
  Layer7RatificationBuilder,
} from '../completion/l7-ratification-builder';
import {
  Layer7FreezePolicyValidator,
} from '../completion/l7-freeze-activator';
import {
  Layer7ExtensionClassifier,
} from '../completion/l7-extension-classifier';
import {
  Layer7DownstreamDependencyValidator,
} from '../completion/l7-handoff-validator';
import {
  L7CompletionState,
  L7RatificationViolationCode,
} from '../contracts/l7-completion-standard';
import {
  L7FreezeStatus,
  L7_FREEZE_POLICY_V1,
} from '../contracts/l7-freeze-policy';
import { L7ExtensionClass } from '../contracts/l7-extension-policy';
import {
  L7DependencyAllowance,
  L7DownstreamAccessKind,
  L7DownstreamConsumerMode,
  L7_STABLE_HANDOFF_SURFACES,
} from '../contracts/l7-downstream-dependency';
import {
  L7_DEFINITION_SURFACE,
  L7_EXECUTION_SEQUENCE,
  L7_REQUIRED_SUBLAYERS,
} from '../contracts/l7-final-definition';
import { L7SublayerCertRef } from '../contracts/l7-ratification-artifact';

export interface L7_9InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ───────────────────────── fixture helpers ─────────────────────────

function greenCert(sublayer: string): L7SublayerCertRef {
  return {
    sublayer,
    version: '1.0.0',
    certification_run_id: `cert-${sublayer}`,
    level: 'PRODUCTION_GREEN',
    rollout_recommended: true,
    blocking_violations: [],
  };
}

function allGreenCerts(): readonly L7SublayerCertRef[] {
  return L7_REQUIRED_SUBLAYERS.map(greenCert);
}

export function buildL7GreenEvidence(): L7CompletionEvidence {
  const sublayer_certifications: Record<string, {
    certified: boolean;
    level: 'PRODUCTION_GREEN';
    blocking_violations: readonly string[];
  }> = {};
  for (const sl of L7_REQUIRED_SUBLAYERS) {
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
    semantic_lawbook_frozen: true,
    confidence_restriction_law_frozen: true,
    no_ungoverned_validation_path: true,
    current_history_evidence_authority_defined: true,
    replay_repair_unambiguous: true,

    subject_assembly_deterministic: true,
    resolution_deterministic: true,
    contradiction_clustering_deterministic: true,
    classification_legal_and_deterministic: true,
    confidence_derivation_deterministic: true,
    restriction_derivation_deterministic: true,
    evidence_generation_deterministic: true,

    l5_only_persistence_authority: true,
    current_history_aligned: true,
    evidence_archive_linked: true,
    lineage_complete_replay_compatible: true,
    replay_safe: true,
    repair_only_recompute_safe: true,
    read_surfaces_governed: true,

    l78_certification_production_green: true,
    no_l78_blocking_violations: true,
    no_critical_observability_breach: true,
    no_critical_migration_block: true,
    rollout_rollback_discipline_active: true,
    family_rollout_gated_reversible: true,

    stable_handoff_surfaces_declared: true,
    downstream_dependency_safe: true,

    final_definition_surface: L7_DEFINITION_SURFACE,
    execution_sequence: L7_EXECUTION_SEQUENCE,
  };
}

// ────────────────────────── INV-7.9-A ──────────────────────────

export function checkINV_79_A(): L7_9InvariantResult {
  const validator = new Layer7CompletionValidator();
  const green = buildL7GreenEvidence();

  const allGreen = validator.validate(green);
  // Drop runtime dimension to simulate partial completion
  const partial = validator.validate({
    ...green,
    contradiction_clustering_deterministic: false,
  });

  const holds =
    allGreen.overall_state === L7CompletionState.L7_PRODUCTION_READY &&
    partial.overall_state !== L7CompletionState.L7_PRODUCTION_READY;
  return {
    id: 'INV-7.9-A',
    name: 'PRODUCTION_READY requires all completion dimensions green',
    holds,
    evidence: `allGreen=${allGreen.overall_state} partial=${partial.overall_state}`,
  };
}

// ────────────────────────── INV-7.9-B ──────────────────────────

export function checkINV_79_B(): L7_9InvariantResult {
  const builder = new Layer7RatificationBuilder();
  const validator = new Layer7CompletionValidator();

  // Drop L7.8 certification → no production-green cert
  const ev = buildL7GreenEvidence();
  const scopedCerts: Record<string, {
    certified: boolean;
    level: 'FAILED' | 'CONSTITUTIONAL_GREEN' | 'RUNTIME_GREEN' | 'PRODUCTION_GREEN';
    blocking_violations: readonly string[];
  }> = {};
  for (const [k, v] of Object.entries(ev.sublayer_certifications)) {
    if (k !== 'L7.8') scopedCerts[k] = v;
  }
  const completion = validator.validate({
    ...ev,
    sublayer_certifications: scopedCerts,
    l78_certification_production_green: false,
    no_l78_blocking_violations: true,
  });

  const missingL78Cert = allGreenCerts().filter(r => r.sublayer !== 'L7.8');
  const { allowed, blocking_violations } = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'run-B',
    sub_layer_versions: Object.fromEntries(
      missingL78Cert.map(c => [c.sublayer, c.version]),
    ),
    certification_artifact_refs: missingL78Cert,
    completion,
    freeze_status: L7FreezeStatus.FROZEN,
    extension_policy_version: '1.0.0',
    stable_handoff_surfaces: L7_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L7.9-v1',
    final_definition_surface: L7_DEFINITION_SURFACE,
    execution_sequence: L7_EXECUTION_SEQUENCE,
  });

  const holds =
    !allowed &&
    blocking_violations.includes(L7RatificationViolationCode.MISSING_SUBLAYER);
  return {
    id: 'INV-7.9-B',
    name: 'ratification requires valid L7.8 production-green certification',
    holds,
    evidence: `allowed=${allowed} blockers=${blocking_violations.join(',')}`,
  };
}

// ────────────────────────── INV-7.9-C ──────────────────────────

export function checkINV_79_C(): L7_9InvariantResult {
  const fv = new Layer7FreezePolicyValidator();
  const noRatification = fv.activate({
    request_id: 'f-1',
    target_status: L7FreezeStatus.FROZEN,
    ratification: null,
    freeze_policy: L7_FREEZE_POLICY_V1,
  });
  const noHardProtectedWithoutCert = fv.activate({
    request_id: 'f-2',
    target_status: L7FreezeStatus.HARD_PROTECTED,
    ratification: null,
    freeze_policy: L7_FREEZE_POLICY_V1,
  });

  const holds =
    !noRatification.allowed &&
    noRatification.violations.includes(
      L7RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION,
    ) &&
    !noHardProtectedWithoutCert.allowed;
  return {
    id: 'INV-7.9-C',
    name: 'freeze requires a valid ratification artifact',
    holds,
    evidence:
      `frozen=${noRatification.allowed} hard=${noHardProtectedWithoutCert.allowed} ` +
      `rationale=${noRatification.rationale}`,
  };
}

// ────────────────────────── INV-7.9-D ──────────────────────────

export function checkINV_79_D(): L7_9InvariantResult {
  const classifier = new Layer7ExtensionClassifier();

  const prohibited = classifier.classify({
    proposal_id: 'p-prohibited',
    title: 'remove contradiction preservation',
    touches_frozen_surface: true,
    touches_hard_protected_surface: true,
    alters_validation_class_meaning: false,
    alters_validation_modifier_meaning: false,
    alters_contradiction_family_meaning: false,
    alters_contradiction_template_identity: false,
    alters_confidence_factor_law: false,
    alters_cap_chain_law: false,
    alters_restriction_right_law: false,
    alters_read_surface: false,
    alters_stable_handoff_surface: false,
    removes_contradiction_preservation: true,
    enables_live_raw_l6_revalidation: false,
    bypasses_contradiction_cap: false,
    introduces_final_judgment_semantics: false,
    is_additive_only: false,
    preserves_replay_hashes: false,
    preserves_historical_meaning: false,
    widens_downstream_rights: false,
    notes: 'test',
  });
  const breaking = classifier.classify({
    proposal_id: 'p-breaking',
    title: 'alter validation class meaning',
    touches_frozen_surface: true,
    touches_hard_protected_surface: false,
    alters_validation_class_meaning: true,
    alters_validation_modifier_meaning: false,
    alters_contradiction_family_meaning: false,
    alters_contradiction_template_identity: false,
    alters_confidence_factor_law: false,
    alters_cap_chain_law: false,
    alters_restriction_right_law: false,
    alters_read_surface: false,
    alters_stable_handoff_surface: false,
    removes_contradiction_preservation: false,
    enables_live_raw_l6_revalidation: false,
    bypasses_contradiction_cap: false,
    introduces_final_judgment_semantics: false,
    is_additive_only: false,
    preserves_replay_hashes: true,
    preserves_historical_meaning: true,
    widens_downstream_rights: false,
    notes: 'test',
  });
  const additive = classifier.classify({
    proposal_id: 'p-additive',
    title: 'add new fixture',
    touches_frozen_surface: false,
    touches_hard_protected_surface: false,
    alters_validation_class_meaning: false,
    alters_validation_modifier_meaning: false,
    alters_contradiction_family_meaning: false,
    alters_contradiction_template_identity: false,
    alters_confidence_factor_law: false,
    alters_cap_chain_law: false,
    alters_restriction_right_law: false,
    alters_read_surface: false,
    alters_stable_handoff_surface: false,
    removes_contradiction_preservation: false,
    enables_live_raw_l6_revalidation: false,
    bypasses_contradiction_cap: false,
    introduces_final_judgment_semantics: false,
    is_additive_only: true,
    preserves_replay_hashes: true,
    preserves_historical_meaning: true,
    widens_downstream_rights: false,
    notes: 'test',
  });

  const holds =
    prohibited.classification === L7ExtensionClass.PROHIBITED &&
    prohibited.requires_recertification &&
    breaking.classification === L7ExtensionClass.BREAKING_SEMANTIC &&
    breaking.requires_recertification &&
    additive.classification === L7ExtensionClass.ADDITIVE_SAFE &&
    !additive.requires_recertification;

  return {
    id: 'INV-7.9-D',
    name: 'breaking/prohibited changes cannot pass as additive-safe',
    holds,
    evidence:
      `prohibited=${prohibited.classification} ` +
      `breaking=${breaking.classification} ` +
      `additive=${additive.classification}`,
  };
}

// ────────────────────────── INV-7.9-E ──────────────────────────

export function checkINV_79_E(): L7_9InvariantResult {
  const v = new Layer7DownstreamDependencyValidator();
  const ctx = {
    freeze_status: L7FreezeStatus.FROZEN,
    downstream_dependency_allowed: true,
  };

  const adHocNormal = v.validate(
    {
      request_id: 'r-ad-hoc',
      consumer_layer: 'L8',
      access_kind: L7DownstreamAccessKind.AD_HOC_REVALIDATION,
      consumer_mode: L7DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    },
    ctx,
  );
  const adHocReplay = v.validate(
    {
      request_id: 'r-ad-hoc-replay',
      consumer_layer: 'L8',
      access_kind: L7DownstreamAccessKind.AD_HOC_REVALIDATION,
      consumer_mode: L7DownstreamConsumerMode.GOVERNED_REPLAY,
      notes: '',
    },
    ctx,
  );
  const internalCand = v.validate(
    {
      request_id: 'r-internal',
      consumer_layer: 'L8',
      access_kind: L7DownstreamAccessKind.INTERNAL_CONTRADICTION_CANDIDATES,
      consumer_mode: L7DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    },
    ctx,
  );
  const judgment = v.validate(
    {
      request_id: 'r-judgment',
      consumer_layer: 'L8',
      access_kind: L7DownstreamAccessKind.JUDGMENT_FROM_L7,
      consumer_mode: L7DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    },
    ctx,
  );
  const stable = v.validate(
    {
      request_id: 'r-stable',
      consumer_layer: 'L8',
      access_kind: L7DownstreamAccessKind.CURRENT_VALIDATION_ASSESSMENT,
      consumer_mode: L7DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    },
    ctx,
  );

  const holds =
    adHocNormal.allowance === L7DependencyAllowance.DENIED &&
    adHocReplay.allowance === L7DependencyAllowance.CONDITIONALLY_ALLOWED &&
    internalCand.allowance === L7DependencyAllowance.DENIED &&
    judgment.allowance === L7DependencyAllowance.DENIED &&
    stable.allowance === L7DependencyAllowance.ALLOWED;

  return {
    id: 'INV-7.9-E',
    name: 'later layers limited to stable handoff surfaces only',
    holds,
    evidence:
      `adHocNormal=${adHocNormal.allowance} ` +
      `adHocReplay=${adHocReplay.allowance} ` +
      `internal=${internalCand.allowance} ` +
      `judgment=${judgment.allowance} stable=${stable.allowance}`,
  };
}

// ────────────────────────── INV-7.9-F ──────────────────────────

export function checkINV_79_F(): L7_9InvariantResult {
  const validator = new Layer7CompletionValidator();
  const ev = buildL7GreenEvidence();

  const good = validator.validate(ev);

  // Surface contradiction
  const badDefinition = validator.validate({
    ...ev,
    final_definition_surface: ['Layer 7 is a dashboard'],
  });

  // Missing handoff surface
  const missingHandoff = validator.validate({
    ...ev,
    stable_handoff_surfaces_declared: false,
  });

  const holds =
    good.overall_state === L7CompletionState.L7_PRODUCTION_READY &&
    badDefinition.overall_state !== L7CompletionState.L7_PRODUCTION_READY &&
    badDefinition.violations.includes(
      L7RatificationViolationCode.CONTRADICTS_FINAL_DEFINITION,
    ) &&
    missingHandoff.overall_state !== L7CompletionState.L7_PRODUCTION_READY &&
    missingHandoff.violations.includes(
      L7RatificationViolationCode.MISSING_HANDOFF_SURFACE,
    );

  return {
    id: 'INV-7.9-F',
    name: 'ratification downgrades on invalid surface or dimension',
    holds,
    evidence:
      `good=${good.overall_state} ` +
      `badDef=${badDefinition.overall_state} ` +
      `missHandoff=${missingHandoff.overall_state}`,
  };
}

// ────────────────────────── INV-7.9-G ──────────────────────────

export function checkINV_79_G(): L7_9InvariantResult {
  const validator = new Layer7CompletionValidator();
  const ev = buildL7GreenEvidence();

  // Execution-sequence scrambling must cause downgrade.
  const scrambled = [...L7_EXECUTION_SEQUENCE].reverse();
  const result = validator.validate({ ...ev, execution_sequence: scrambled });

  // Replay/repair safety must also be gated.
  const replayBroken = validator.validate({ ...ev, replay_safe: false });
  const repairBroken = validator.validate({
    ...ev,
    repair_only_recompute_safe: false,
  });

  const holds =
    result.overall_state !== L7CompletionState.L7_PRODUCTION_READY &&
    result.violations.includes(
      L7RatificationViolationCode.EXECUTION_ORDER_VIOLATION,
    ) &&
    replayBroken.overall_state !== L7CompletionState.L7_PRODUCTION_READY &&
    repairBroken.overall_state !== L7CompletionState.L7_PRODUCTION_READY;
  return {
    id: 'INV-7.9-G',
    name: 'L7 remains dependency-safe under live, replay, and repair modes',
    holds,
    evidence:
      `scrambled=${result.overall_state} ` +
      `replay=${replayBroken.overall_state} repair=${repairBroken.overall_state}`,
  };
}

export function checkAllL7_9Invariants(): readonly L7_9InvariantResult[] {
  return [
    checkINV_79_A(),
    checkINV_79_B(),
    checkINV_79_C(),
    checkINV_79_D(),
    checkINV_79_E(),
    checkINV_79_F(),
    checkINV_79_G(),
  ];
}
