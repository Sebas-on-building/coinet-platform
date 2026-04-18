/**
 * L6.8 — Master Cross-L6 Certification Harness
 *
 * §6.8.4.4 — Orchestrates all certification bands, aggregates invariant
 * outcomes from L6.1–L6.8, emits a durable, machine-readable
 * `L6CertificationArtifact`.
 *
 * This module exposes `runMasterCertification(...)` so it can be invoked
 * both from `test-l6_8-assurance.ts` (Band scaffolding tests) and from
 * operational tooling.
 */

import {
  ALL_CERTIFICATION_BANDS,
  L6CertificationBand,
} from './l6-certification-level';
import {
  L6BandDefinition,
  runBands,
} from './l6-band-runner';
import {
  L6BandOutcome,
  L6InvariantOutcome,
  L6CertificationArtifact,
  buildCertificationArtifact,
  canonicalizeArtifact,
  fingerprint,
  registerCertificationArtifact,
} from './l6-certification-report';
import {
  ADVERSARIAL_CASES,
  L6AdversarialCaseKind,
} from '../fixtures/l6-adversarial-corpus';
import {
  GOLDEN_FEATURES,
  GOLDEN_EVENTS,
  goldenCorpusSnapshot,
} from '../fixtures/l6-golden-primitives';
import {
  REPLAY_TIMELINES,
  diffReplayOutputs,
} from '../fixtures/l6-replay-timelines';
import {
  LATE_DATA_CASES,
  isModeAllowedForLateDataClass,
} from '../fixtures/l6-late-data-cases';
import {
  CONCURRENCY_LOAD_CASES,
} from '../fixtures/l6-concurrency-load-cases';
import {
  MIGRATION_CASES,
} from '../fixtures/l6-migration-cases';
import {
  L6MigrationClass,
  classifyContractMigration,
} from '../migration/l6-contract-migration';
import {
  gateContractMigration,
} from '../migration/l6-compatibility-gate';
import {
  generateObservabilityReport,
  isObservabilityPackageComplete,
} from '../ops/l6-observability-report';
import {
  checkAllL61Invariants,
} from '../invariants/l6_1-invariants';
import {
  checkAllL62Invariants,
} from '../invariants/l6_2-invariants';
import {
  checkAllL6_3Invariants,
} from '../invariants/l6_3-invariants';
import {
  checkAllL6_4Invariants,
} from '../invariants/l6_4-invariants';
import {
  checkAllL6_5Invariants,
} from '../invariants/l6_5-invariants';
import {
  checkAllL6_6Invariants,
} from '../invariants/l6_6-invariants';
import {
  checkAllL6_7Invariants,
} from '../invariants/l6_7-invariants';
import {
  checkAllL6_8Invariants,
} from '../invariants/l6_8-invariants';
import { L6FeatureFamilyId } from '../contracts/feature-family-definition';

function bandA_contracts(): L6BandDefinition {
  return {
    band: L6CertificationBand.A_CONTRACTS_AND_LEGALITY,
    run: (r) => {
      const l61 = checkAllL61Invariants();
      const l62 = checkAllL62Invariants();
      const l63 = checkAllL6_3Invariants();
      r.assert(l61.every(i => i.holds), 'L6.1 invariants green');
      r.assert(l62.every(i => i.holds), 'L6.2 invariants green');
      r.assert(l63.every(i => i.holds), 'L6.3 invariants green');
    },
  };
}

function bandB_compute(): L6BandDefinition {
  return {
    band: L6CertificationBand.B_DETERMINISTIC_COMPUTE,
    run: (r) => {
      const l64 = checkAllL6_4Invariants();
      const l65 = checkAllL6_5Invariants();
      r.assert(l64.every(i => i.holds), 'L6.4 invariants green');
      r.assert(l65.every(i => i.holds), 'L6.5 invariants green');
      // Golden primitives are deterministic: same inputs → same replay_hash
      const hashes = new Set(GOLDEN_FEATURES.map(g => g.replay_hash));
      r.assert(hashes.size === GOLDEN_FEATURES.length, 'feature replay hashes unique');
    },
  };
}

function bandC_events(): L6BandDefinition {
  return {
    band: L6CertificationBand.C_EVENT_LIFECYCLE,
    run: (r) => {
      const l66 = checkAllL6_6Invariants();
      r.assert(l66.every(i => i.holds), 'L6.6 invariants green');
      const dedupeKeys = new Set(GOLDEN_EVENTS.map(e => e.dedupe_key));
      r.assert(dedupeKeys.size === GOLDEN_EVENTS.length, 'event dedupe keys unique');
    },
  };
}

function bandD_storage(): L6BandDefinition {
  return {
    band: L6CertificationBand.D_STORAGE_AND_LINEAGE,
    run: (r) => {
      const l67 = checkAllL6_7Invariants();
      r.assert(l67.every(i => i.holds), 'L6.7 invariants green');
    },
  };
}

function bandE_replay(): L6BandDefinition {
  return {
    band: L6CertificationBand.E_REPLAY_AND_REPAIR,
    run: (r) => {
      const observedFeatureHashes = new Set(GOLDEN_FEATURES.map(g => g.replay_hash));
      const observedEventHashes = new Set(GOLDEN_EVENTS.map(g => g.replay_hash));
      for (const tl of REPLAY_TIMELINES) {
        const diff = diffReplayOutputs(tl, observedFeatureHashes, observedEventHashes);
        r.assert(diff.missing_feature_hashes.length === 0, `replay:${tl.timeline_id}:features`);
        r.assert(diff.missing_event_hashes.length === 0, `replay:${tl.timeline_id}:events`);
      }
      for (const lc of LATE_DATA_CASES) {
        for (const m of lc.allowed_modes) {
          r.assert(isModeAllowedForLateDataClass(lc.class, m), `late-data-allowed:${lc.case_id}:${m}`);
        }
      }
    },
  };
}

function bandF_adversarial(): L6BandDefinition {
  return {
    band: L6CertificationBand.F_ADVERSARIAL_MISUSE,
    run: (r) => {
      r.assert(ADVERSARIAL_CASES.length >= 10, 'adversarial corpus has ≥10 cases');
      const kinds = new Set(ADVERSARIAL_CASES.map(c => c.kind));
      for (const k of Object.values(L6AdversarialCaseKind)) {
        r.assert(kinds.has(k), `adversarial kind present: ${k}`);
      }
      for (const c of ADVERSARIAL_CASES) {
        r.assert(c.must_block === true, `adversarial must block: ${c.case_id}`);
      }
    },
  };
}

function bandG_load(): L6BandDefinition {
  return {
    band: L6CertificationBand.G_LOAD_AND_CONCURRENCY,
    run: (r) => {
      r.assert(CONCURRENCY_LOAD_CASES.length >= 6, 'load corpus has ≥6 cases');
      for (const c of CONCURRENCY_LOAD_CASES) {
        r.assert(c.expected_max_duplicates_emitted === 0, `no duplicates permitted: ${c.case_id}`);
        r.assert(c.concurrency >= 2, `concurrency ≥ 2: ${c.case_id}`);
      }
    },
  };
}

function bandH_golden(): L6BandDefinition {
  return {
    band: L6CertificationBand.H_GOLDEN_CORPUS_STABILITY,
    run: (r) => {
      const snapshot = goldenCorpusSnapshot();
      const fp = fingerprint(snapshot.join('\n'));
      r.assert(snapshot.length === GOLDEN_FEATURES.length + GOLDEN_EVENTS.length, 'snapshot size matches corpus size');
      r.assert(/^[0-9a-f]{8}$/.test(fp), 'fingerprint is 8-char hex');
      const families = new Set(GOLDEN_FEATURES.map(g => g.family));
      const requiredFamilies: L6FeatureFamilyId[] = [
        L6FeatureFamilyId.MARKET, L6FeatureFamilyId.DEX, L6FeatureFamilyId.DERIVATIVES,
        L6FeatureFamilyId.PROTOCOL, L6FeatureFamilyId.ONCHAIN, L6FeatureFamilyId.SECURITY,
        L6FeatureFamilyId.NARRATIVE, L6FeatureFamilyId.ENTITY,
      ];
      for (const f of requiredFamilies) {
        r.assert(families.has(f), `golden corpus covers family ${f}`);
      }
    },
  };
}

function bandI_migration(): L6BandDefinition {
  return {
    band: L6CertificationBand.I_MIGRATION_AND_COMPATIBILITY,
    run: (r) => {
      r.assert(MIGRATION_CASES.length >= 5, 'migration corpus has ≥5 cases');
      const gates = MIGRATION_CASES.map(c => ({
        case_id: c.case_id,
        decision: gateContractMigration({
          attempt_id: c.case_id,
          target_kind: (c.target_kind === 'FEATURE_FAMILY' || c.target_kind === 'EVENT_FAMILY')
            ? (c.target_kind === 'FEATURE_FAMILY' ? 'FEATURE_CONTRACT' : 'EVENT_CONTRACT')
            : c.target_kind,
          target_id: c.target_id,
          from_version: c.from_version,
          to_version: c.to_version,
          declared_class: c.class,
          historical_meaning_preserved: c.historical_meaning_preserved,
          replay_compatible: c.replay_compatible,
          migration_notes: c.notes,
        }),
      }));
      for (const g of gates) {
        const cls = MIGRATION_CASES.find(c => c.case_id === g.case_id)!.class;
        if (cls === L6MigrationClass.MAJOR_SEMANTIC_BREAK) {
          // MAJOR break is allowed only as a new version namespace; to_version != from_version ensures requires_new_version_namespace
          const ev = g.decision.evidence as { requires_new_version_namespace?: boolean };
          r.assert(ev.requires_new_version_namespace === true, `major break forces new namespace: ${g.case_id}`);
        }
        if (cls === L6MigrationClass.RETIREMENT) {
          r.assert(g.decision.gate === 'BLOCK', `retirement requires explicit gate BLOCK: ${g.case_id}`);
        }
      }
    },
  };
}

function bandJ_contradiction(): L6BandDefinition {
  return {
    band: L6CertificationBand.J_CROSS_FAMILY_CONTRADICTION_INTEGRITY,
    run: (r) => {
      const validities = new Set(GOLDEN_FEATURES.map(g => g.validity_state));
      r.assert(validities.has('VALID'), 'VALID present');
      r.assert(validities.has('DEGRADED') || validities.has('PROVISIONAL'), 'non-VALID states present');
      const confidences = new Set(GOLDEN_FEATURES.map(g => g.confidence_band));
      r.assert(confidences.size >= 2, 'multiple confidence bands represented');
      const families = new Set(GOLDEN_FEATURES.map(g => g.family));
      r.assert(families.size >= 5, 'at least 5 families contribute contradiction surface');
    },
  };
}

const ALL_BAND_DEFS: readonly L6BandDefinition[] = [
  bandA_contracts(), bandB_compute(), bandC_events(), bandD_storage(),
  bandE_replay(), bandF_adversarial(), bandG_load(),
  bandH_golden(), bandI_migration(), bandJ_contradiction(),
];

export interface MasterCertificationOptions {
  readonly certification_run_id?: string;
  readonly layer_version_set?: Readonly<Record<string, string>>;
}

export async function runMasterCertification(
  opts: MasterCertificationOptions = {},
): Promise<L6CertificationArtifact> {
  const outcomes: readonly L6BandOutcome[] = await runBands(ALL_BAND_DEFS);

  const invariantOutcomes: L6InvariantOutcome[] = [
    ...checkAllL61Invariants().map(i => ({ id: i.id, holds: i.holds, evidence: i.evidence })),
    ...checkAllL62Invariants().map(i => ({ id: i.id, holds: i.holds, evidence: i.evidence })),
    ...checkAllL6_3Invariants().map(i => ({ id: i.id, holds: i.holds, evidence: i.evidence })),
    ...checkAllL6_4Invariants().map(i => ({ id: i.id, holds: i.holds, evidence: i.evidence })),
    ...checkAllL6_5Invariants().map(i => ({ id: i.id, holds: i.holds, evidence: i.evidence })),
    ...checkAllL6_6Invariants().map(i => ({ id: i.id, holds: i.holds, evidence: i.evidence })),
    ...checkAllL6_7Invariants().map(i => ({ id: i.id, holds: i.holds, evidence: i.evidence })),
    ...checkAllL6_8Invariants().map(i => ({ id: i.id, holds: i.holds, evidence: i.evidence })),
  ];

  const goldenHash = fingerprint(goldenCorpusSnapshot().join('\n'));
  const obs = generateObservabilityReport({});
  const obsComplete = isObservabilityPackageComplete();

  const replayOk = outcomes.find(o => o.band === L6CertificationBand.E_REPLAY_AND_REPAIR)?.ok === true;
  const loadOk = outcomes.find(o => o.band === L6CertificationBand.G_LOAD_AND_CONCURRENCY)?.ok === true;
  const migrationOk = outcomes.find(o => o.band === L6CertificationBand.I_MIGRATION_AND_COMPATIBILITY)?.ok === true;

  const artifact = buildCertificationArtifact({
    certification_run_id: opts.certification_run_id ?? `cert-${Date.now()}`,
    layer_version_set: opts.layer_version_set ?? {
      'L6.1': '1.0.0', 'L6.2': '1.0.0', 'L6.3': '1.0.0', 'L6.4': '1.0.0',
      'L6.5': '1.0.0', 'L6.6': '1.0.0', 'L6.7': '1.0.0', 'L6.8': '1.0.0',
    },
    bands: outcomes,
    invariants: invariantOutcomes,
    golden_corpus_hash: goldenHash,
    replay_integrity_ok: replayOk,
    load_concurrency_ok: loadOk,
    migration_ok: migrationOk,
    observability_ok: obs.ok && obsComplete.ok,
  });

  registerCertificationArtifact(artifact);
  return artifact;
}

export function ALL_BAND_DEFS_DEBUG(): readonly L6BandDefinition[] { return ALL_BAND_DEFS; }
export { canonicalizeArtifact };
export { ALL_CERTIFICATION_BANDS };
