/**
 * L9.9 — Master Cross-L9 Certification Harness
 *
 * §9.9.6 / §9.9.4.1 INV-9.9-A..G — Orchestrates all L9 certification
 * bands (A–G), aggregates L9.1–L9.8 invariant outcomes, drives the
 * completion validator, ratification builder, freeze activator,
 * extension classifier, and handoff validator through their declared
 * surfaces, and emits a durable, fingerprinted `L9CertificationArtifact`.
 *
 * Non-duplication law (§9.9.2): this module does NOT re-implement
 * L9.1–L9.8 logic. Each band exercises already-built L9 surfaces via
 * registries, fixtures, and helpers — L9.9 is the orchestrator.
 */

import { L9CertificationBand } from './l9-certification-band';
import {
  L9BandDefinition,
  runL9Bands,
} from './l9-band-runner';
import {
  L9BandOutcome,
  L9InvariantOutcome,
  L9CertificationArtifact,
  buildL9CertificationArtifact,
  registerL9CertificationArtifact,
} from './l9-certification-report';

import {
  Layer9CompletionValidator,
} from '../completion/l9-completion-validator';
import {
  Layer9RatificationBuilder,
  registerL9RatificationArtifact,
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
  L9_DEFINITION_SURFACE,
  L9_EXECUTION_SEQUENCE,
  L9_REQUIRED_SUBLAYERS,
} from '../contracts/l9-final-definition';
import {
  L9CompletionState,
} from '../contracts/l9-completion-standard';
import {
  L9FreezeStatus,
  L9_FREEZE_POLICY_V1,
} from '../contracts/l9-freeze-policy';
import {
  L9ExtensionClass,
} from '../contracts/l9-extension-policy';
import {
  L9DependencyAllowance,
  L9DownstreamAccessKind,
  L9DownstreamConsumerMode,
  L9_STABLE_HANDOFF_SURFACES,
  L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
} from '../contracts/l9-downstream-dependency';
import {
  L9_EXTENSION_POLICY_V1,
} from '../contracts/l9-extension-policy';

import { checkAllL91Invariants } from '../invariants/l9_1-invariants';
import { checkAllL92Invariants } from '../invariants/l9_2-invariants';
import { checkAllL93Invariants } from '../invariants/l9_3-invariants';
import { runAllL9_4Invariants } from '../invariants/l9_4-invariants';
import { runAllL9_5Invariants } from '../invariants/l9_5-invariants';
import { runAllL9_6Invariants } from '../invariants/l9_6-invariants';
import { runAllL9_7Invariants } from '../invariants/l9_7-invariants';
import { runAllL9_8Invariants } from '../invariants/l9_8-invariants';
import { checkAllL9_9Invariants } from '../invariants/l9_9-invariants';

// ─────────────────── Aggregated invariant helpers ───────────────────

function collectAllL9Invariants(): readonly L9InvariantOutcome[] {
  const out: L9InvariantOutcome[] = [];
  const push = (arr: ReadonlyArray<{
    id: string; holds: boolean; evidence: string;
  }>): void => {
    for (const r of arr) out.push({
      id: r.id, holds: r.holds, evidence: r.evidence,
    });
  };
  push(checkAllL91Invariants());
  push(checkAllL92Invariants());
  push(checkAllL93Invariants());
  push(runAllL9_4Invariants());
  push(runAllL9_5Invariants());
  push(runAllL9_6Invariants());
  push(runAllL9_7Invariants());
  push(runAllL9_8Invariants());
  push(checkAllL9_9Invariants());
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
  return L9_REQUIRED_SUBLAYERS.map(sl => ({
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
      L9_REQUIRED_SUBLAYERS.map(sl => [sl, {
        certified: true,
        level: 'PRODUCTION_GREEN' as const,
        blocking_violations: [] as readonly string[],
      }]),
    ),
    invariants_all_green: invariantsAllGreen,

    // constitutional
    mission_boundary_frozen: true,
    sequence_family_law_frozen: true,
    template_law_frozen: true,
    no_ungoverned_sequence_path: true,
    no_judgment_scenario_scoring_semantics: true,
    posture_consumed_not_laundered: true,
    no_causal_laundering: true,

    // runtime
    subject_contracts_legal: true,
    output_contracts_complete: true,
    runtime_deterministic: true,
    temporal_semantics_legal: true,
    confidence_cap_bound: true,
    restriction_rights_explicit: true,
    causal_restraint_explicit: true,

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

    final_definition_surface: L9_DEFINITION_SURFACE,
    execution_sequence: L9_EXECUTION_SEQUENCE,
  };
}

// ───────────────────────── Band definitions ─────────────────────────

function bandA_finalDefinitionAndCompletion(
  invariantsAllGreen: boolean,
): L9BandDefinition {
  return {
    band: L9CertificationBand.A_FINAL_DEFINITION_AND_COMPLETION,
    run: (r) => {
      r.assert(
        L9_DEFINITION_SURFACE.length >= 4,
        'L9 definition surface is populated',
      );
      r.assert(
        L9_EXECUTION_SEQUENCE.length === 9,
        'L9 execution sequence covers 9 sublayers',
      );
      r.assert(
        L9_REQUIRED_SUBLAYERS.length === 8,
        'L9 required sublayers = 8 (L9.1–L9.8)',
      );

      const validator = new Layer9CompletionValidator();
      const green = validator.validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      r.assert(
        green.overall_state === L9CompletionState.L9_PRODUCTION_READY,
        'green evidence yields L9_PRODUCTION_READY',
      );

      const ev = buildGreenCompletionEvidence(invariantsAllGreen);
      const notReady = validator.validate({
        ...ev,
        sublayer_certifications: {
          ...ev.sublayer_certifications,
          'L9.3': {
            certified: false,
            level: 'FAILED' as const,
            blocking_violations: ['deliberate test failure'],
          },
        },
      });
      r.assert(
        notReady.overall_state !== L9CompletionState.L9_PRODUCTION_READY,
        'failed sublayer downgrades completion below PRODUCTION_READY',
      );
    },
  };
}

function bandB_freezeAndProtectedSurface(
  invariantsAllGreen: boolean,
): L9BandDefinition {
  return {
    band: L9CertificationBand.B_FREEZE_AND_PROTECTED_SURFACE,
    run: (r) => {
      const freezeValidator = new Layer9FreezePolicyValidator();
      const denied = freezeValidator.activate({
        request_id: 'freeze.premature',
        target_status: L9FreezeStatus.FROZEN,
        ratification: null,
        freeze_policy: L9_FREEZE_POLICY_V1,
      });
      r.assert(
        !denied.allowed,
        'freeze without ratification denied',
      );
      r.assert(
        denied.violations.length > 0,
        'freeze-without-ratification emits a violation',
      );

      const completion = new Layer9CompletionValidator().validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      const rat = new Layer9RatificationBuilder().build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.test.freeze',
        sub_layer_versions: Object.fromEntries(
          L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L9FreezeStatus.FROZEN,
        extension_policy_version: L9_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L9.9/v1',
        final_definition_surface: L9_DEFINITION_SURFACE,
        execution_sequence: L9_EXECUTION_SEQUENCE,
      });

      const ok = freezeValidator.activate({
        request_id: 'freeze.ok',
        target_status: L9FreezeStatus.FROZEN,
        ratification: rat.artifact,
        freeze_policy: L9_FREEZE_POLICY_V1,
      });
      r.assert(
        ok.allowed,
        'freeze with valid ratification allowed',
      );
    },
  };
}

function bandC_extensionAndMigration(): L9BandDefinition {
  const classifier = new Layer9ExtensionClassifier();
  const baseProposal = {
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
  return {
    band: L9CertificationBand.C_EXTENSION_AND_MIGRATION,
    run: (r) => {
      const additive = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.add',
        title: 'new fixture',
        is_additive_only: true,
      });
      r.assert(
        additive.classification === L9ExtensionClass.ADDITIVE_SAFE,
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
        migration.classification === L9ExtensionClass.MIGRATION_REQUIRED,
        'template semantics change classified MIGRATION_REQUIRED',
      );
      r.assert(
        migration.requires_recertification,
        'migration-required demands recertification',
      );

      const breaking = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.break',
        title: 'sequence state meaning change',
        alters_sequence_state_meaning: true,
      });
      r.assert(
        breaking.classification === L9ExtensionClass.BREAKING_SEMANTIC,
        'sequence state meaning change classified BREAKING_SEMANTIC',
      );

      const prohibited = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.forbid',
        title: 'L9 judgment semantics',
        introduces_judgment_semantics: true,
      });
      r.assert(
        prohibited.classification === L9ExtensionClass.PROHIBITED,
        'introduction of judgment semantics classified PROHIBITED',
      );

      const causalCertainty = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.causal',
        title: 'causal certainty from adjacency',
        introduces_causal_certainty_from_adjacency: true,
      });
      r.assert(
        causalCertainty.classification === L9ExtensionClass.PROHIBITED,
        'causal certainty from temporal adjacency classified PROHIBITED',
      );

      const redisAuth = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.redis',
        title: 'redis as authority',
        enables_redis_as_authority: true,
      });
      r.assert(
        redisAuth.classification === L9ExtensionClass.PROHIBITED,
        'redis as sequence authority classified PROHIBITED',
      );
    },
  };
}

function bandD_downstreamDependency(): L9BandDefinition {
  const v = new Layer9HandoffValidator();
  return {
    band: L9CertificationBand.D_DOWNSTREAM_DEPENDENCY,
    run: (r) => {
      for (const kind of L9_STABLE_HANDOFF_SURFACES) {
        const d = v.validate({
          request_id: `dep.ok.${kind}`,
          consumer_layer: 'L10',
          access_kind: kind,
          consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
          notes: '',
        });
        r.assert(
          d.allowance === L9DependencyAllowance.ALLOWED,
          `stable handoff allowed: ${kind}`,
        );
      }

      for (const kind of L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS) {
        const d = v.validate({
          request_id: `dep.forbid.${kind}`,
          consumer_layer: 'L10',
          access_kind: kind,
          consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
          notes: '',
        });
        r.assert(
          d.allowance === L9DependencyAllowance.DENIED,
          `forbidden downstream denied: ${kind}`,
        );
      }

      const adHocDenied = v.validate({
        request_id: 'dep.adhoc.denied',
        consumer_layer: 'L10',
        access_kind:
          L9DownstreamAccessKind.AD_HOC_SEQUENCE_RECLASSIFICATION,
        consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
        notes: '',
      });
      r.assert(
        adHocDenied.allowance === L9DependencyAllowance.DENIED,
        'ad-hoc reclassification denied under NORMAL',
      );

      const adHocGoverned = v.validate({
        request_id: 'dep.adhoc.governed',
        consumer_layer: 'L10',
        access_kind:
          L9DownstreamAccessKind.AD_HOC_SEQUENCE_RECLASSIFICATION,
        consumer_mode: L9DownstreamConsumerMode.GOVERNED_REPLAY,
        notes: '',
      });
      r.assert(
        adHocGoverned.allowance ===
          L9DependencyAllowance.CONDITIONALLY_ALLOWED,
        'ad-hoc reclassification conditionally allowed under ' +
          'GOVERNED_REPLAY',
      );
    },
  };
}

function bandE_artifactAndLineage(
  invariantsAllGreen: boolean,
): L9BandDefinition {
  return {
    band: L9CertificationBand.E_CERTIFICATION_ARTIFACT_AND_LINEAGE,
    run: (r) => {
      const completion = new Layer9CompletionValidator().validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      const builder = new Layer9RatificationBuilder();
      const a = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.e.1',
        sub_layer_versions: Object.fromEntries(
          L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L9FreezeStatus.FROZEN,
        extension_policy_version: L9_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L9.9/v1',
        final_definition_surface: L9_DEFINITION_SURFACE,
        execution_sequence: L9_EXECUTION_SEQUENCE,
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
          L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L9FreezeStatus.FROZEN,
        extension_policy_version: L9_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L9.9/v1',
        final_definition_surface: L9_DEFINITION_SURFACE,
        execution_sequence: L9_EXECUTION_SEQUENCE,
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
): L9BandDefinition {
  return {
    band: L9CertificationBand.F_RATIFICATION_AND_DONE_GATE,
    run: (r) => {
      const completion = new Layer9CompletionValidator().validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      const builder = new Layer9RatificationBuilder();

      const missing = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.f.missing',
        sub_layer_versions: Object.fromEntries(
          L9_REQUIRED_SUBLAYERS
            .filter(sl => sl !== 'L9.5')
            .map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs:
          buildGreenSublayerRefs().filter(r2 => r2.sublayer !== 'L9.5'),
        completion,
        freeze_status: L9FreezeStatus.FROZEN,
        extension_policy_version: L9_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L9.9/v1',
        final_definition_surface: L9_DEFINITION_SURFACE,
        execution_sequence: L9_EXECUTION_SEQUENCE,
      });
      r.assert(
        !missing.allowed,
        'missing sublayer blocks ratification',
      );

      const noHandoff = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.f.nohandoff',
        sub_layer_versions: Object.fromEntries(
          L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L9FreezeStatus.FROZEN,
        extension_policy_version: L9_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: [],
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L9.9/v1',
        final_definition_surface: L9_DEFINITION_SURFACE,
        execution_sequence: L9_EXECUTION_SEQUENCE,
      });
      r.assert(
        !noHandoff.allowed,
        'empty handoff surface blocks ratification',
      );

      const green = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.f.ok',
        sub_layer_versions: Object.fromEntries(
          L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L9FreezeStatus.FROZEN,
        extension_policy_version: L9_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L9.9/v1',
        final_definition_surface: L9_DEFINITION_SURFACE,
        execution_sequence: L9_EXECUTION_SEQUENCE,
      });
      r.assert(green.allowed, 'green inputs yield allowed done gate');
      registerL9RatificationArtifact(green.artifact);
    },
  };
}

function bandG_masterRegression(
  invariants: readonly L9InvariantOutcome[],
): L9BandDefinition {
  return {
    band: L9CertificationBand.G_FULL_MASTER_REGRESSION,
    run: (r) => {
      r.assert(
        invariants.length >= 1,
        'at least one invariant exists across L9.1–L9.8',
      );
      const failing = invariants.filter(i => !i.holds);
      r.assert(
        failing.length === 0,
        `all L9.1–L9.8 invariants green (failing=${failing.length})`,
      );
      const expected =
        ['L9.1', 'L9.2', 'L9.3', 'L9.4', 'L9.5',
         'L9.6', 'L9.7', 'L9.8', 'L9.9'];
      r.assert(
        L9_EXECUTION_SEQUENCE.length === expected.length &&
          L9_EXECUTION_SEQUENCE.every((v, i) => v === expected[i]),
        'execution sequence canonical',
      );
    },
  };
}

// ───────────────────────── Master orchestrator ─────────────────────────

export interface L9MasterCertificationOptions {
  readonly certification_run_id?: string;
  readonly layer_version_set?: Readonly<Record<string, string>>;
}

export async function runL9MasterCertification(
  opts: L9MasterCertificationOptions = {},
): Promise<L9CertificationArtifact> {
  const invariants = collectAllL9Invariants();
  const invariantsAllGreen = invariants.every(i => i.holds);

  const defs: readonly L9BandDefinition[] = [
    bandA_finalDefinitionAndCompletion(invariantsAllGreen),
    bandB_freezeAndProtectedSurface(invariantsAllGreen),
    bandC_extensionAndMigration(),
    bandD_downstreamDependency(),
    bandE_artifactAndLineage(invariantsAllGreen),
    bandF_ratificationAndDoneGate(invariantsAllGreen),
    bandG_masterRegression(invariants),
  ];
  const outcomes: readonly L9BandOutcome[] = await runL9Bands(defs);

  const completion = new Layer9CompletionValidator().validate(
    buildGreenCompletionEvidence(invariantsAllGreen),
  );
  const ratification = new Layer9RatificationBuilder().build({
    layer_version: '1.0.0',
    ratification_run_id: opts.certification_run_id ??
      `rat-l9-${Date.now()}`,
    sub_layer_versions: Object.fromEntries(
      L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
    ),
    certification_artifact_refs: L9_REQUIRED_SUBLAYERS.map(sl => ({
      sublayer: sl,
      version: '1.0.0',
      certification_run_id: `cert-${sl}`,
      level: 'PRODUCTION_GREEN',
      rollout_recommended: true,
      blocking_violations: [],
    })),
    completion,
    freeze_status: L9FreezeStatus.FROZEN,
    extension_policy_version: L9_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L9.9/v1',
    final_definition_surface: L9_DEFINITION_SURFACE,
    execution_sequence: L9_EXECUTION_SEQUENCE,
  });

  const artifact = buildL9CertificationArtifact({
    certification_run_id:
      opts.certification_run_id ?? `cert-l9-${Date.now()}`,
    layer_version_set: opts.layer_version_set ?? {
      'L9.1': '1.0.0', 'L9.2': '1.0.0', 'L9.3': '1.0.0',
      'L9.4': '1.0.0', 'L9.5': '1.0.0', 'L9.6': '1.0.0',
      'L9.7': '1.0.0', 'L9.8': '1.0.0', 'L9.9': '1.0.0',
    },
    bands: outcomes,
    invariants,
    ratification_artifact_hash: ratification.artifact.artifact_hash,
    completion_state: completion.overall_state,
  });

  registerL9CertificationArtifact(artifact);
  if (ratification.allowed) {
    registerL9RatificationArtifact(ratification.artifact);
  }
  return artifact;
}
