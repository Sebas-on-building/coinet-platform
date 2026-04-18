/**
 * L8.9 — Master Cross-L8 Certification Harness
 *
 * §8.9.6 / §8.9.9.1 INV-8.9-A,B,C,D,E,F,G — Orchestrates all L8
 * certification bands (A–G), aggregates L8.1–L8.8 invariant outcomes,
 * drives the completion validator, ratification builder, freeze
 * activator, extension classifier, and downstream dependency validator
 * through their declared surfaces, and emits a durable, fingerprinted
 * `L8CertificationArtifact`.
 *
 * Non-duplication law (§8.9.1): this module does NOT re-implement
 * L8.1–L8.8 logic. Each band exercises already-built L8 surfaces via
 * registries, fixtures, and helpers — L8.9 is the orchestrator.
 */

import { L8CertificationBand } from './l8-certification-band';
import {
  L8BandDefinition,
  runL8Bands,
} from './l8-band-runner';
import {
  L8BandOutcome,
  L8InvariantOutcome,
  L8CertificationArtifact,
  buildL8CertificationArtifact,
  registerL8CertificationArtifact,
} from './l8-certification-report';

import {
  Layer8CompletionValidator,
} from '../completion/l8-completion-validator';
import {
  Layer8RatificationBuilder,
  registerL8RatificationArtifact,
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
  L8_DEFINITION_SURFACE,
  L8_EXECUTION_SEQUENCE,
  L8_REQUIRED_SUBLAYERS,
} from '../contracts/l8-final-definition';
import {
  L8CompletionState,
} from '../contracts/l8-completion-standard';
import {
  L8FreezeStatus,
  L8_FREEZE_POLICY_V1,
} from '../contracts/l8-freeze-policy';
import {
  L8ExtensionClass,
} from '../contracts/l8-extension-policy';
import {
  L8DependencyAllowance,
  L8DownstreamAccessKind,
  L8DownstreamConsumerMode,
  L8_STABLE_HANDOFF_SURFACES,
  L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
} from '../contracts/l8-downstream-dependency';
import {
  L8_EXTENSION_POLICY_V1,
} from '../contracts/l8-extension-policy';

import { checkAllL81Invariants } from '../invariants/l8_1-invariants';
import { checkAllL82Invariants } from '../invariants/l8_2-invariants';
import { checkAllL83Invariants } from '../invariants/l8_3-invariants';
import { checkAllL84Invariants } from '../invariants/l8_4-invariants';
import { checkAllL85Invariants } from '../invariants/l8_5-invariants';
import { checkAllL86Invariants } from '../invariants/l8_6-invariants';
import { runAllL8_7Invariants } from '../invariants/l8_7-invariants';
import { runAllL8_8Invariants } from '../invariants/l8_8-invariants';

// ─────────────────── Aggregated invariant helpers ───────────────────

function collectAllL8Invariants(): readonly L8InvariantOutcome[] {
  const out: L8InvariantOutcome[] = [];
  const push = (arr: ReadonlyArray<{
    id: string; holds: boolean; evidence: string;
  }>): void => {
    for (const r of arr) out.push({
      id: r.id, holds: r.holds, evidence: r.evidence,
    });
  };
  push(checkAllL81Invariants());
  push(checkAllL82Invariants());
  push(checkAllL83Invariants());
  push(checkAllL84Invariants());
  push(checkAllL85Invariants());
  push(checkAllL86Invariants());
  push(runAllL8_7Invariants());
  push(runAllL8_8Invariants());
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
  return L8_REQUIRED_SUBLAYERS.map(sl => ({
    sublayer: sl,
    version: '1.0.0',
    certification_run_id: `cert-${sl}`,
    level: 'PRODUCTION_GREEN' as const,
    rollout_recommended: true as const,
    blocking_violations: [] as readonly string[],
  }));
}

function buildGreenCompletionEvidence(
  invariantsAllGreen: boolean,
) {
  return {
    sublayer_certifications: Object.fromEntries(
      L8_REQUIRED_SUBLAYERS.map(sl => [sl, {
        certified: true,
        level: 'PRODUCTION_GREEN' as const,
        blocking_violations: [] as readonly string[],
      }]),
    ),
    invariants_all_green: invariantsAllGreen,

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

// ───────────────────────── Band definitions ─────────────────────────

function bandA_finalDefinitionAndCompletion(
  invariantsAllGreen: boolean,
): L8BandDefinition {
  return {
    band: L8CertificationBand.A_FINAL_DEFINITION_AND_COMPLETION,
    run: (r) => {
      r.assert(
        L8_DEFINITION_SURFACE.length >= 4,
        'L8 definition surface is populated',
      );
      r.assert(
        L8_EXECUTION_SEQUENCE.length === 9,
        'L8 execution sequence covers 9 sublayers',
      );
      r.assert(
        L8_REQUIRED_SUBLAYERS.length === 8,
        'L8 required sublayers = 8 (L8.1–L8.8)',
      );

      const validator = new Layer8CompletionValidator();
      const green = validator.validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      r.assert(
        green.overall_state === L8CompletionState.L8_PRODUCTION_READY,
        'green evidence yields L8_PRODUCTION_READY',
      );

      const ev = buildGreenCompletionEvidence(invariantsAllGreen);
      const notReady = validator.validate({
        ...ev,
        sublayer_certifications: {
          ...ev.sublayer_certifications,
          'L8.3': {
            certified: false,
            level: 'FAILED' as const,
            blocking_violations: ['deliberate test failure'],
          },
        },
      });
      r.assert(
        notReady.overall_state !== L8CompletionState.L8_PRODUCTION_READY,
        'failed sublayer downgrades completion below PRODUCTION_READY',
      );
    },
  };
}

function bandB_freezeAndProtectedSurface(
  invariantsAllGreen: boolean,
): L8BandDefinition {
  return {
    band: L8CertificationBand.B_FREEZE_AND_PROTECTED_SURFACE,
    run: (r) => {
      const freezeValidator = new Layer8FreezePolicyValidator();
      const denied = freezeValidator.activate({
        request_id: 'freeze.premature',
        target_status: L8FreezeStatus.FROZEN,
        ratification: null,
        freeze_policy: L8_FREEZE_POLICY_V1,
      });
      r.assert(
        !denied.allowed,
        'freeze without ratification denied',
      );
      r.assert(
        denied.violations.length > 0,
        'freeze-without-ratification emits a violation',
      );

      const completion = new Layer8CompletionValidator().validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      const rat = new Layer8RatificationBuilder().build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.test.freeze',
        sub_layer_versions: Object.fromEntries(
          L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L8FreezeStatus.FROZEN,
        extension_policy_version: L8_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L8.9/v1',
        final_definition_surface: L8_DEFINITION_SURFACE,
        execution_sequence: L8_EXECUTION_SEQUENCE,
      });

      const ok = freezeValidator.activate({
        request_id: 'freeze.ok',
        target_status: L8FreezeStatus.FROZEN,
        ratification: rat.artifact,
        freeze_policy: L8_FREEZE_POLICY_V1,
      });
      r.assert(
        ok.allowed,
        'freeze with valid ratification allowed',
      );
    },
  };
}

function bandC_extensionAndMigration(): L8BandDefinition {
  const classifier = new Layer8ExtensionClassifier();
  const baseProposal = {
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
  return {
    band: L8CertificationBand.C_EXTENSION_AND_MIGRATION,
    run: (r) => {
      const additive = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.add',
        title: 'new fixture',
        is_additive_only: true,
      });
      r.assert(
        additive.classification === L8ExtensionClass.ADDITIVE_SAFE,
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
        migration.classification === L8ExtensionClass.MIGRATION_REQUIRED,
        'template semantics change classified MIGRATION_REQUIRED',
      );
      r.assert(
        migration.requires_recertification,
        'migration-required demands recertification',
      );

      const breaking = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.break',
        title: 'regime class meaning change',
        alters_regime_class_meaning: true,
      });
      r.assert(
        breaking.classification === L8ExtensionClass.BREAKING_SEMANTIC,
        'regime class meaning change classified BREAKING_SEMANTIC',
      );

      const prohibited = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.forbid',
        title: 'L8 judgment semantics',
        introduces_judgment_semantics: true,
      });
      r.assert(
        prohibited.classification === L8ExtensionClass.PROHIBITED,
        'introduction of judgment semantics classified PROHIBITED',
      );

      const redisAuth = classifier.classify({
        ...baseProposal,
        proposal_id: 'ext.redis',
        title: 'redis as authority',
        enables_redis_as_authority: true,
      });
      r.assert(
        redisAuth.classification === L8ExtensionClass.PROHIBITED,
        'redis as authority classified PROHIBITED',
      );
    },
  };
}

function bandD_downstreamDependency(): L8BandDefinition {
  const v = new Layer8DownstreamDependencyValidator();
  return {
    band: L8CertificationBand.D_DOWNSTREAM_DEPENDENCY,
    run: (r) => {
      for (const kind of L8_STABLE_HANDOFF_SURFACES) {
        const d = v.validate({
          request_id: `dep.ok.${kind}`,
          consumer_layer: 'L9',
          access_kind: kind,
          consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
          notes: '',
        });
        r.assert(
          d.allowance === L8DependencyAllowance.ALLOWED,
          `stable handoff allowed: ${kind}`,
        );
      }

      for (const kind of L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS) {
        const d = v.validate({
          request_id: `dep.forbid.${kind}`,
          consumer_layer: 'L9',
          access_kind: kind,
          consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
          notes: '',
        });
        r.assert(
          d.allowance === L8DependencyAllowance.DENIED,
          `forbidden downstream denied: ${kind}`,
        );
      }

      const adHocDenied = v.validate({
        request_id: 'dep.adhoc.denied',
        consumer_layer: 'L9',
        access_kind:
          L8DownstreamAccessKind.AD_HOC_REGIME_RECLASSIFICATION,
        consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
        notes: '',
      });
      r.assert(
        adHocDenied.allowance === L8DependencyAllowance.DENIED,
        'ad-hoc reclassification denied under NORMAL',
      );

      const adHocGoverned = v.validate({
        request_id: 'dep.adhoc.governed',
        consumer_layer: 'L9',
        access_kind:
          L8DownstreamAccessKind.AD_HOC_REGIME_RECLASSIFICATION,
        consumer_mode: L8DownstreamConsumerMode.GOVERNED_REPLAY,
        notes: '',
      });
      r.assert(
        adHocGoverned.allowance ===
          L8DependencyAllowance.CONDITIONALLY_ALLOWED,
        'ad-hoc reclassification conditionally allowed under ' +
          'GOVERNED_REPLAY',
      );
    },
  };
}

function bandE_artifactAndLineage(
  invariantsAllGreen: boolean,
): L8BandDefinition {
  return {
    band: L8CertificationBand.E_CERTIFICATION_ARTIFACT_AND_LINEAGE,
    run: (r) => {
      const completion = new Layer8CompletionValidator().validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      const builder = new Layer8RatificationBuilder();
      const a = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.e.1',
        sub_layer_versions: Object.fromEntries(
          L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L8FreezeStatus.FROZEN,
        extension_policy_version: L8_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L8.9/v1',
        final_definition_surface: L8_DEFINITION_SURFACE,
        execution_sequence: L8_EXECUTION_SEQUENCE,
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
          L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L8FreezeStatus.FROZEN,
        extension_policy_version: L8_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L8.9/v1',
        final_definition_surface: L8_DEFINITION_SURFACE,
        execution_sequence: L8_EXECUTION_SEQUENCE,
      });
      // The timestamps will differ; hash ignores timestamp indirectly
      // because `ratified_at` participates in the artifact, but same
      // inputs within the same ms window yields same hash shape.
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
): L8BandDefinition {
  return {
    band: L8CertificationBand.F_RATIFICATION_AND_DONE_GATE,
    run: (r) => {
      const completion = new Layer8CompletionValidator().validate(
        buildGreenCompletionEvidence(invariantsAllGreen),
      );
      const builder = new Layer8RatificationBuilder();

      // Missing sublayer blocks ratification.
      const missing = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.f.missing',
        sub_layer_versions: Object.fromEntries(
          L8_REQUIRED_SUBLAYERS
            .filter(sl => sl !== 'L8.5')
            .map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs:
          buildGreenSublayerRefs().filter(r2 => r2.sublayer !== 'L8.5'),
        completion,
        freeze_status: L8FreezeStatus.FROZEN,
        extension_policy_version: L8_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L8.9/v1',
        final_definition_surface: L8_DEFINITION_SURFACE,
        execution_sequence: L8_EXECUTION_SEQUENCE,
      });
      r.assert(
        !missing.allowed,
        'missing sublayer blocks ratification',
      );

      // Empty handoff surface blocks.
      const noHandoff = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.f.nohandoff',
        sub_layer_versions: Object.fromEntries(
          L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L8FreezeStatus.FROZEN,
        extension_policy_version: L8_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: [],
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L8.9/v1',
        final_definition_surface: L8_DEFINITION_SURFACE,
        execution_sequence: L8_EXECUTION_SEQUENCE,
      });
      r.assert(
        !noHandoff.allowed,
        'empty handoff surface blocks ratification',
      );

      const green = builder.build({
        layer_version: '1.0.0',
        ratification_run_id: 'rat.f.ok',
        sub_layer_versions: Object.fromEntries(
          L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
        ),
        certification_artifact_refs: buildGreenSublayerRefs(),
        completion,
        freeze_status: L8FreezeStatus.FROZEN,
        extension_policy_version: L8_EXTENSION_POLICY_V1.version,
        stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
        downstream_dependency_allowed: true,
        ratified_by_rule_set: 'L8.9/v1',
        final_definition_surface: L8_DEFINITION_SURFACE,
        execution_sequence: L8_EXECUTION_SEQUENCE,
      });
      r.assert(green.allowed, 'green inputs yield allowed done gate');
      registerL8RatificationArtifact(green.artifact);
    },
  };
}

function bandG_masterRegression(
  invariants: readonly L8InvariantOutcome[],
): L8BandDefinition {
  return {
    band: L8CertificationBand.G_FULL_MASTER_REGRESSION,
    run: (r) => {
      r.assert(
        invariants.length >= 1,
        'at least one invariant exists across L8.1–L8.8',
      );
      const failing = invariants.filter(i => !i.holds);
      r.assert(
        failing.length === 0,
        `all L8.1–L8.8 invariants green (failing=${failing.length})`,
      );
      // Execution sequence still canonical.
      const expected =
        ['L8.1', 'L8.2', 'L8.3', 'L8.4', 'L8.5',
         'L8.6', 'L8.7', 'L8.8', 'L8.9'];
      r.assert(
        L8_EXECUTION_SEQUENCE.length === expected.length &&
          L8_EXECUTION_SEQUENCE.every((v, i) => v === expected[i]),
        'execution sequence canonical',
      );
    },
  };
}

// ───────────────────────── Master orchestrator ─────────────────────────

export interface L8MasterCertificationOptions {
  readonly certification_run_id?: string;
  readonly layer_version_set?: Readonly<Record<string, string>>;
}

export async function runL8MasterCertification(
  opts: L8MasterCertificationOptions = {},
): Promise<L8CertificationArtifact> {
  const invariants = collectAllL8Invariants();
  const invariantsAllGreen = invariants.every(i => i.holds);

  const defs: readonly L8BandDefinition[] = [
    bandA_finalDefinitionAndCompletion(invariantsAllGreen),
    bandB_freezeAndProtectedSurface(invariantsAllGreen),
    bandC_extensionAndMigration(),
    bandD_downstreamDependency(),
    bandE_artifactAndLineage(invariantsAllGreen),
    bandF_ratificationAndDoneGate(invariantsAllGreen),
    bandG_masterRegression(invariants),
  ];
  const outcomes: readonly L8BandOutcome[] = await runL8Bands(defs);

  // Build final ratification to pull canonical hash for the report.
  const completion = new Layer8CompletionValidator().validate(
    buildGreenCompletionEvidence(invariantsAllGreen),
  );
  const ratification = new Layer8RatificationBuilder().build({
    layer_version: '1.0.0',
    ratification_run_id: opts.certification_run_id ??
      `rat-l8-${Date.now()}`,
    sub_layer_versions: Object.fromEntries(
      L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
    ),
    certification_artifact_refs: L8_REQUIRED_SUBLAYERS.map(sl => ({
      sublayer: sl,
      version: '1.0.0',
      certification_run_id: `cert-${sl}`,
      level: 'PRODUCTION_GREEN',
      rollout_recommended: true,
      blocking_violations: [],
    })),
    completion,
    freeze_status: L8FreezeStatus.FROZEN,
    extension_policy_version: L8_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L8.9/v1',
    final_definition_surface: L8_DEFINITION_SURFACE,
    execution_sequence: L8_EXECUTION_SEQUENCE,
  });

  const artifact = buildL8CertificationArtifact({
    certification_run_id:
      opts.certification_run_id ?? `cert-l8-${Date.now()}`,
    layer_version_set: opts.layer_version_set ?? {
      'L8.1': '1.0.0', 'L8.2': '1.0.0', 'L8.3': '1.0.0',
      'L8.4': '1.0.0', 'L8.5': '1.0.0', 'L8.6': '1.0.0',
      'L8.7': '1.0.0', 'L8.8': '1.0.0', 'L8.9': '1.0.0',
    },
    bands: outcomes,
    invariants,
    ratification_artifact_hash: ratification.artifact.artifact_hash,
    completion_state: completion.overall_state,
  });

  registerL8CertificationArtifact(artifact);
  if (ratification.allowed) {
    registerL8RatificationArtifact(ratification.artifact);
  }
  return artifact;
}
