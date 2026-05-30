/**
 * L13.12 — Ratification Artifact Builder
 *
 * §13.12.11 — Builds the single ratification artifact that proves
 * Layer 13 is complete, certified, rollout-approved, frozen, and
 * authorized for L14 consumption.
 */

import {
  L13CertificationLevel,
  type L13SublayerId,
} from '../contracts/l13-final-definition';
import type { L13CertificationReport } from '../contracts/l13-certification-report';
import type { L13LayerRatificationArtifact } from '../contracts/l13-ratification-artifact';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.final.v1';

export interface L13RatificationBuilderInput {
  readonly certification_report: L13CertificationReport;
  readonly rollout_approved: boolean;
  readonly freeze_activated: boolean;
  readonly l14_handoff_approved: boolean;
  readonly active_policy_versions: readonly string[];
  readonly lineage_refs?: readonly string[];
  readonly ratified_at?: string;
}

export function buildL13RatificationArtifact(
  input: L13RatificationBuilderInput,
): L13LayerRatificationArtifact {
  const lineage = input.lineage_refs ?? ['l13.final.lineage'];
  const fingerprints: Record<string, string> = {};
  for (const s of input.certification_report.sublayer_results) {
    fingerprints[s.sublayer_id] = s.fingerprint;
  }
  // Refuse to mark FROZEN_LIVE if any precondition fails.
  const level =
    input.rollout_approved &&
    input.freeze_activated &&
    input.l14_handoff_approved &&
    input.certification_report.all_sublayers_green &&
    input.certification_report.all_bands_green &&
    input.certification_report.all_final_invariants_green
      ? L13CertificationLevel.FROZEN_LIVE
      : input.certification_report.certification_level;
  const combined = fnv1a(
    [
      input.certification_report.combined_fingerprint,
      String(input.rollout_approved),
      String(input.freeze_activated),
      String(input.l14_handoff_approved),
      level,
      input.active_policy_versions.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  const replayHash = fnv1a(
    [
      input.certification_report.certification_report_id,
      combined,
      POLICY_V,
    ].join('|'),
  );
  return {
    ratification_artifact_id: `l13.ratification.${replayHash}`,
    layer_id: 'L13',
    layer_name: 'AI Judgment & Explanation Layer',
    certification_report_ref: input.certification_report.certification_report_id,
    certification_level: level,
    all_sublayers_green: input.certification_report.all_sublayers_green,
    all_bands_green: input.certification_report.all_bands_green,
    all_final_invariants_green:
      input.certification_report.all_final_invariants_green,
    rollout_approved: input.rollout_approved,
    freeze_activated: input.freeze_activated,
    l14_handoff_approved: input.l14_handoff_approved,
    canonical_sublayer_fingerprints:
      fingerprints as Readonly<Record<L13SublayerId, string>>,
    combined_layer_fingerprint: combined,
    active_policy_versions: input.active_policy_versions,
    ratified_at: input.ratified_at ?? new Date().toISOString(),
    policy_version: POLICY_V,
    lineage_refs: lineage,
    replay_hash: replayHash,
  };
}
