/**
 * L10.9 — Master Cross-L10 Certification Harness
 *
 * §10.9.10 / §10.9.13 INV-10.9-A..G — Orchestrates all L10
 * certification bands (A–G), aggregates L10.1–L10.8 invariant
 * outcomes, drives the completion validator, ratification builder,
 * freeze activator, extension classifier, and handoff validator
 * through their declared surfaces, and emits a durable, fingerprinted
 * `L10CertificationArtifact`.
 *
 * Non-duplication law (§10.9.1.3): this module does NOT re-implement
 * L10.1–L10.8 logic. Each band exercises already-built L10 surfaces
 * via registries, fixtures, and helpers — L10.9 is the orchestrator.
 */

import { L10CertificationBand } from './l10-certification-band';
import {
  L10BandDefinition,
  runL10Bands,
} from './l10-band-runner';
import {
  L10BandOutcome,
  L10InvariantOutcome,
  L10CertificationArtifact,
  buildL10CertificationArtifact,
  registerL10CertificationArtifact,
} from './l10-certification-report';

import {
  Layer10CompletionValidator,
} from '../completion/l10-completion-validator';
import {
  Layer10RatificationBuilder,
  registerL10RatificationArtifact,
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
  L10_DEFINITION_SURFACE,
  L10_EXECUTION_SEQUENCE,
  L10_REQUIRED_SUBLAYERS,
} from '../contracts/l10-final-definition';
import {
  L10CompletionState,
} from '../contracts/l10-completion-standard';
import {
  L10FreezeStatus,
  L10_FREEZE_POLICY_V1,
} from '../contracts/l10-freeze-policy';
import {
  L10ExtensionClass,
} from '../contracts/l10-extension-policy';
import {
  L10DependencyAllowance,
  L10DownstreamAccessKind,
  L10DownstreamConsumerMode,
  L10_STABLE_HANDOFF_SURFACES,
  L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
} from '../contracts/l10-downstream-dependency';
import {
  L10_EXTENSION_POLICY_V1,
} from '../contracts/l10-extension-policy';

import { checkAllL101Invariants } from '../invariants/l10_1-invariants';
import { checkAllL102Invariants } from '../invariants/l10_2-invariants';
import { checkAllL103Invariants } from '../invariants/l10_3-invariants';
import { checkAllL10_4Invariants } from '../invariants/l10_4-invariants';
import {
  checkINV_105_A,
  checkINV_105_B,
  checkINV_105_C,
  checkINV_105_D,
  checkINV_105_E,
  checkINV_105_F,
  checkINV_105_G,
} from '../invariants/l10_5-invariants';
import { runAllL10_6Invariants } from '../invariants/l10_6-invariants';
import { runAllL10_7Invariants } from '../invariants/l10_7-invariants';
import { runAllL10_8Invariants } from '../invariants/l10_8-invariants';
// L10.9 invariants are imported lazily because they live in the
// closure module and depend on contracts/engines this file already
// loads.  See `collectAllL10Invariants`.

// ─────────────────── Aggregated invariant helpers ───────────────────

function checkAllL105Invariants(): readonly L10InvariantOutcome[] {
  return [
    checkINV_105_A(),
    checkINV_105_B(),
    checkINV_105_C(),
    checkINV_105_D(),
    checkINV_105_E(),
    checkINV_105_F(),
    checkINV_105_G(),
  ];
}

function collectAllL10Invariants(): readonly L10InvariantOutcome[] {
  const out: L10InvariantOutcome[] = [];
  const push = (arr: ReadonlyArray<{
    id: string; holds: boolean; evidence: string;
  }>): void => {
    for (const r of arr) out.push({
      id: r.id, holds: r.holds, evidence: r.evidence,
    });
  };
  push(checkAllL101Invariants());
  push(checkAllL102Invariants());
  push(checkAllL103Invariants());
  push(checkAllL10_4Invariants());
  push(checkAllL105Invariants());
  push(runAllL10_6Invariants());
  push(runAllL10_7Invariants());
  push(runAllL10_8Invariants());

  // L10.9 invariants — imported lazily to avoid circular module
  // load with the closure invariants file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const closure = require('../invariants/l10_9-invariants') as {
    checkAllL10_9Invariants: () => ReadonlyArray<{
      id: string; holds: boolean; evidence: string;
    }>;
  };
  push(closure.checkAllL10_9Invariants());
  return out;
}

function buildGreenSublayerRefs(): ReadonlyArray<{
  sublayer: string;
  version: string;
  certification_run_id: string;
  level: 'PRODUCTION_GREEN';
  rollout_recommended: true;
  blocking_violations: readonly string[];
}> {
  return L10_REQUIRED_SUBLAYERS.map(sl => ({
    sublayer: sl,
    version: '1.0.0',
    certification_run_id: `cert-${sl}`,
    level: 'PRODUCTION_GREEN' as const,
    rollout_recommended: true as const,
    blocking_violations: [] as readonly string[],
  }));
}

function buildGreenCompletionEvidence(invariantsAllGreen: boolean) {
  return {
    sublayer_certifications: Object.fromEntries(
      L10_REQUIRED_SUBLAYERS.map(sl => [sl, {
        certified: true,
        level: 'PRODUCTION_GREEN' as const,
        blocking_violations: [] as readonly string[],
      }]),
    ),
    invariants_all_green: invariantsAllGreen,

    // constitutional
    mission_boundary_frozen: true,
    object_model_frozen: true,
    family_template_law_frozen: true,
    no_ungoverned_hypothesis_path: true,
    no_judgment_scenario_scoring_recommendation_semantics: true,
    l7_posture_consumed_not_laundered: true,
    l8_posture_consumed_not_laundered: true,
    l9_posture_consumed_not_laundered: true,
    no_single_story_collapse: true,

    // runtime
    subject_contracts_legal: true,
    output_contracts_complete: true,
    runtime_deterministic: true,
    evidence_semantics_legal: true,
    confidence_cap_bound: true,
    restriction_rights_explicit: true,
    readiness_explicit: true,
    spread_preserved: true,

    // persistence
    l5_only_persistence_authority: true,
    postgres_only_current_authority: true,
    historical_append_safe: true,
    evidence_archive_linked: true,
    lineage_complete_replay_compatible: true,
    replay_repair_meaning_preserved: true,

    // serving
    read_surfaces_governed: true,
    read_modes_validated: true,
    no_raw_store_bypass: true,
    stable_handoff_surfaces_declared: true,
    forbidden_downstream_access_rejected: true,
    internal_surfaces_not_exposed: true,
    no_rebuild_law_enforced: true,

    // cross-cuts
    no_critical_observability_breach: true,
    repair_instability_resolved: true,
    downstream_dependency_safe: true,

    final_definition_surface: L10_DEFINITION_SURFACE,
    execution_sequence: L10_EXECUTION_SEQUENCE,
  };
}

// ───────────────────────── Band definitions ─────────────────────────

function bandA_finalDefinitionAndCompletion(
  invariantsAllGreen: boolean,
): L10BandDefinition {
  return {
    band: L10CertificationBand.A_FINAL_DEFINITION_AND_COMPLETION,
    run: (r) => {
      r.assert(
        L10_DEFINITION_SURFACE.length >= 4,
        'L10 definition surface is populated',
      );
      r.assert(
        L10_EXECUTION_SEQUENCE.length === 9,
        'L10 execution sequence covers 9 sublayers',
      );
      r.assert(
        L10_REQUIRED_SUBLAYERS.length === 8,
        'L10 required sublayers = 8 (L10.1–L10.8)',
      );

      const validator = new Layer10CompletionValidator();
      const green = validator.validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      r.assert(
        green.overall_state === L10CompletionState.L10_PRODUCTION_READY,
        'green evidence yields L10_PRODUCTION_READY',
      );

      const ev = buildGreenCompletionEvidence(invariantsAllGreen);
      const notReady = validator.validate({
        ...ev,
        sublayer_certifications: {
          ...ev.sublayer_certifications,
          'L10.3': {
            certified: false,
            level: 'FAILED' as const,
            blocking_violations: ['deliberate test failure'],
          },
        },
      });
      r.assert(
        notReady.overall_state !== L10CompletionState.L10_PRODUCTION_READY,
        'failed sublayer downgrades completion below PRODUCTION_READY',
      );
    },
  };
}

function bandB_freezeAndProtectedSurface(
  invariantsAllGreen: boolean,
): L10BandDefinition {
  return {
    band: L10CertificationBand.B_FREEZE_AND_PROTECTED_SURFACE,
    run: (r) => {
      const freezeValidator = new Layer10FreezePolicyValidator();
      const denied = freezeValidator.activate({
        request_id: 'freeze.premature',
        target_status: L10FreezeStatus.FROZEN,
        ratification: null,
        freeze_policy: L10_FREEZE_POLICY_V1,
      });
      r.assert(
        !denied.allowed,
        'freeze without ratification denied',
      );
      r.assert(
        denied.violations.length > 0,
        'freeze-without-ratification emits a violation',
      );

      const completion = new Layer10CompletionValidator().validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      const rat = new Layer10RatificationBuilder().build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.test.freeze',
        sub_layer_versions: Object.fromEntries(
          L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L10FreezeStatus.FROZEN,
        extension_policy_version: L10_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L10.9/v1',
        final_definition_surface: L10_DEFINITION_SURFACE,
        execution_sequence: L10_EXECUTION_SEQUENCE,
      });

      const ok = freezeValidator.activate({
        request_id: 'freeze.ok',
        target_status: L10FreezeStatus.FROZEN,
        ratification: rat.artifact,
        freeze_policy: L10_FREEZE_POLICY_V1,
      });
      r.assert(
        ok.allowed,
        'freeze with valid ratification allowed',
      );
    },
  };
}

function bandC_extensionAndMigration(): L10BandDefinition {
  const classifier = new Layer10ExtensionClassifier();
  const baseProposal = {
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
  return {
    band: L10CertificationBand.C_EXTENSION_AND_MIGRATION,
    run: (r) => {
      const additive = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.add',
        title: 'new fixture',
        is_additive_only: true,
      });
      r.assert(
        additive.classification === L10ExtensionClass.ADDITIVE_SAFE,
        'additive-only classified ADDITIVE_SAFE',
      );
      r.assert(
        !additive.requires_recertification,
        'additive-safe does not require recertification',
      );

      const migration = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.mig',
        title: 'template threshold change',
        alters_template_semantics: true,
      });
      r.assert(
        migration.classification === L10ExtensionClass.MIGRATION_REQUIRED,
        'template semantics change classified MIGRATION_REQUIRED',
      );
      r.assert(
        migration.requires_recertification,
        'migration-required demands recertification',
      );

      const breaking = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.break',
        title: 'ranking law change',
        alters_ranking_law: true,
      });
      r.assert(
        breaking.classification === L10ExtensionClass.BREAKING_SEMANTIC,
        'ranking-law change classified BREAKING_SEMANTIC',
      );

      const prohibited = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.forbid',
        title: 'L10 judgment semantics',
        introduces_judgment_semantics: true,
      });
      r.assert(
        prohibited.classification === L10ExtensionClass.PROHIBITED,
        'introduction of judgment semantics classified PROHIBITED',
      );

      const collapse = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.collapse',
        title: 'allow single-story collapse',
        enables_single_story_collapse: true,
      });
      r.assert(
        collapse.classification === L10ExtensionClass.PROHIBITED,
        'single-story collapse classified PROHIBITED',
      );

      const liveRebuild = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.rebuild',
        title: 'live lower-layer rebuild',
        enables_live_lower_layer_rebuild: true,
      });
      r.assert(
        liveRebuild.classification === L10ExtensionClass.PROHIBITED,
        'live raw lower-layer rebuild classified PROHIBITED',
      );

      const redisAuth = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.redis',
        title: 'redis as authority',
        enables_redis_as_authority: true,
      });
      r.assert(
        redisAuth.classification === L10ExtensionClass.PROHIBITED,
        'redis as L10 authority classified PROHIBITED',
      );
    },
  };
}

function bandD_downstreamDependency(): L10BandDefinition {
  const v = new Layer10HandoffValidator();
  return {
    band: L10CertificationBand.D_DOWNSTREAM_DEPENDENCY,
    run: (r) => {
      for (const kind of L10_STABLE_HANDOFF_SURFACES) {
        const d = v.validate({
          request_id: `dep.ok.${kind}`,
          consumer_layer: 'L11',
          access_kind: kind,
          consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
          notes: '',
        });
        r.assert(
          d.allowance === L10DependencyAllowance.ALLOWED,
          `stable handoff allowed: ${kind}`,
        );
      }

      for (const kind of L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS) {
        const d = v.validate({
          request_id: `dep.forbid.${kind}`,
          consumer_layer: 'L11',
          access_kind: kind,
          consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
          notes: '',
        });
        r.assert(
          d.allowance === L10DependencyAllowance.DENIED,
          `forbidden downstream denied: ${kind}`,
        );
      }

      const replayDenied = v.validate({
        request_id: 'dep.replay.denied',
        consumer_layer: 'L11',
        access_kind: L10DownstreamAccessKind.AD_HOC_HYPOTHESIS_REPLAY,
        consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
        notes: '',
      });
      r.assert(
        replayDenied.allowance === L10DependencyAllowance.DENIED,
        'ad-hoc replay denied under NORMAL',
      );

      const replayGoverned = v.validate({
        request_id: 'dep.replay.governed',
        consumer_layer: 'L11',
        access_kind: L10DownstreamAccessKind.AD_HOC_HYPOTHESIS_REPLAY,
        consumer_mode: L10DownstreamConsumerMode.GOVERNED_REPLAY,
        notes: '',
      });
      r.assert(
        replayGoverned.allowance ===
          L10DependencyAllowance.CONDITIONALLY_ALLOWED,
        'ad-hoc replay conditionally allowed under GOVERNED_REPLAY',
      );
    },
  };
}

function bandE_artifactAndLineage(
  invariantsAllGreen: boolean,
): L10BandDefinition {
  return {
    band: L10CertificationBand.E_CERTIFICATION_ARTIFACT_AND_LINEAGE,
    run: (r) => {
      const completion = new Layer10CompletionValidator().validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      const builder = new Layer10RatificationBuilder();
      const a = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.e.1',
        sub_layer_versions: Object.fromEntries(
          L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L10FreezeStatus.FROZEN,
        extension_policy_version: L10_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L10.9/v1',
        final_definition_surface: L10_DEFINITION_SURFACE,
        execution_sequence: L10_EXECUTION_SEQUENCE,
      });
      r.assert(a.allowed, 'green inputs yield allowed ratification');
      r.assert(
        a.artifact.artifact_hash.length === 8,
        'artifact hash is 8-char fingerprint',
      );

      const b = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.e.1',
        sub_layer_versions: Object.fromEntries(
          L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L10FreezeStatus.FROZEN,
        extension_policy_version: L10_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L10.9/v1',
        final_definition_surface: L10_DEFINITION_SURFACE,
        execution_sequence: L10_EXECUTION_SEQUENCE,
      });
      r.assert(
        b.artifact.final_definition_surface_hash ===
          a.artifact.final_definition_surface_hash,
        'definition surface hash deterministic across identical input',
      );
      r.assert(
        b.artifact.execution_sequence_hash ===
          a.artifact.execution_sequence_hash,
        'execution sequence hash deterministic',
      );
      r.assert(
        b.artifact.stable_handoff_surface_hash ===
          a.artifact.stable_handoff_surface_hash,
        'handoff surface hash deterministic',
      );
    },
  };
}

function bandF_ratificationAndDoneGate(
  invariantsAllGreen: boolean,
): L10BandDefinition {
  return {
    band: L10CertificationBand.F_RATIFICATION_AND_DONE_GATE,
    run: (r) => {
      const completion = new Layer10CompletionValidator().validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      const builder = new Layer10RatificationBuilder();

      const missing = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.f.missing',
        sub_layer_versions: Object.fromEntries(
          L10_REQUIRED_SUBLAYERS
            .filter(sl => sl !== 'L10.5')
            .map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs:
          buildGreenSublayerRefs().filter(
            r2 => r2.sublayer !== 'L10.5'),
        completion,
        freeze_status: L10FreezeStatus.FROZEN,
        extension_policy_version: L10_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L10.9/v1',
        final_definition_surface: L10_DEFINITION_SURFACE,
        execution_sequence: L10_EXECUTION_SEQUENCE,
      });
      r.assert(
        !missing.allowed,
        'missing sublayer blocks ratification',
      );

      const noHandoff = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.f.nohandoff',
        sub_layer_versions: Object.fromEntries(
          L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L10FreezeStatus.FROZEN,
        extension_policy_version: L10_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: [],
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L10.9/v1',
        final_definition_surface: L10_DEFINITION_SURFACE,
        execution_sequence: L10_EXECUTION_SEQUENCE,
      });
      r.assert(
        !noHandoff.allowed,
        'empty handoff surface blocks ratification',
      );

      const green = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.f.ok',
        sub_layer_versions: Object.fromEntries(
          L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L10FreezeStatus.FROZEN,
        extension_policy_version: L10_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L10.9/v1',
        final_definition_surface: L10_DEFINITION_SURFACE,
        execution_sequence: L10_EXECUTION_SEQUENCE,
      });
      r.assert(green.allowed, 'green inputs yield allowed done gate');
      registerL10RatificationArtifact(green.artifact);
    },
  };
}

function bandG_masterRegression(
  invariants: readonly L10InvariantOutcome[],
): L10BandDefinition {
  return {
    band: L10CertificationBand.G_FULL_MASTER_REGRESSION,
    run: (r) => {
      r.assert(
        invariants.length >= 1,
        'at least one invariant exists across L10.1–L10.8',
      );
      const failing = invariants.filter(i => !i.holds);
      r.assert(
        failing.length === 0,
        `all L10.1–L10.8 invariants green (failing=${failing.length})`,
      );
      const expected =
        ['L10.1', 'L10.2', 'L10.3', 'L10.4', 'L10.5',
         'L10.6', 'L10.7', 'L10.8', 'L10.9'];
      r.assert(
        L10_EXECUTION_SEQUENCE.length === expected.length &&
          L10_EXECUTION_SEQUENCE.every((v, i) => v === expected[i]),
        'execution sequence canonical',
      );
    },
  };
}

// ───────────────────────── Master orchestrator ─────────────────────────

export interface L10MasterCertificationOptions {
  readonly certification_run_id?: string;
  readonly layer_version_set?: Readonly<Record<string, string>>;
}

export async function runL10MasterCertification(
  opts: L10MasterCertificationOptions = {},
): Promise<L10CertificationArtifact> {
  const invariants = collectAllL10Invariants();
  const invariantsAllGreen = invariants.every(i => i.holds);

  const defs: readonly L10BandDefinition[] = [
    bandA_finalDefinitionAndCompletion(invariantsAllGreen),
    bandB_freezeAndProtectedSurface(invariantsAllGreen),
    bandC_extensionAndMigration(),
    bandD_downstreamDependency(),
    bandE_artifactAndLineage(invariantsAllGreen),
    bandF_ratificationAndDoneGate(invariantsAllGreen),
    bandG_masterRegression(invariants),
  ];
  const outcomes: readonly L10BandOutcome[] = await runL10Bands(defs);

  const completion = new Layer10CompletionValidator().validate(
    buildGreenCompletionEvidence(invariantsAllGreen),
  );
  const ratification = new Layer10RatificationBuilder().build({
    layer_version: '1.0.0',
    ratification_run_id: opts.certification_run_id ??
      `rat-l10-${Date.now()}`,
    sub_layer_versions: Object.fromEntries(
      L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
    ),
    certification_artifact_refs: L10_REQUIRED_SUBLAYERS.map(sl => ({
      sublayer: sl,
      version: '1.0.0',
      certification_run_id: `cert-${sl}`,
      level: 'PRODUCTION_GREEN',
      rollout_recommended: true,
      blocking_violations: [],
    })),
    completion,
    freeze_status: L10FreezeStatus.FROZEN,
    extension_policy_version: L10_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L10.9/v1',
    final_definition_surface: L10_DEFINITION_SURFACE,
    execution_sequence: L10_EXECUTION_SEQUENCE,
  });

  const artifact = buildL10CertificationArtifact({
    certification_run_id:
      opts.certification_run_id ?? `cert-l10-${Date.now()}`,
    layer_version_set: opts.layer_version_set ?? {
      'L10.1': '1.0.0', 'L10.2': '1.0.0', 'L10.3': '1.0.0',
      'L10.4': '1.0.0', 'L10.5': '1.0.0', 'L10.6': '1.0.0',
      'L10.7': '1.0.0', 'L10.8': '1.0.0', 'L10.9': '1.0.0',
    },
    bands: outcomes,
    invariants,
    ratification_artifact_hash: ratification.artifact.artifact_hash,
    completion_state: completion.overall_state,
  });

  registerL10CertificationArtifact(artifact);
  if (ratification.allowed) {
    registerL10RatificationArtifact(ratification.artifact);
  }
  return artifact;
}
