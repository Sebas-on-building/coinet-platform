/**
 * L13.12 — Canonical Completion Standard Instance
 *
 * §13.12.4 — Frozen instance enumerating the sublayers, bands, and
 * final invariants required for Layer 13 to be complete.
 */

import {
  ALL_L13_CERTIFICATION_BANDS,
  ALL_L13_FINAL_INVARIANT_IDS,
  ALL_L13_SUBLAYER_IDS,
} from '../contracts/l13-final-definition';
import type { L13CompletionStandard } from '../contracts/l13-completion-standard';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.final.v1';

const REQUIRED_SUBLAYERS = ALL_L13_SUBLAYER_IDS;
const REQUIRED_BANDS = ALL_L13_CERTIFICATION_BANDS;
const REQUIRED_FINAL_INVARIANTS = ALL_L13_FINAL_INVARIANT_IDS;

const HASH = fnv1a(
  [
    'l13.completion.standard',
    REQUIRED_SUBLAYERS.join(','),
    REQUIRED_BANDS.join(','),
    REQUIRED_FINAL_INVARIANTS.join(','),
    POLICY_V,
  ].join('|'),
);

export const L13_COMPLETION_STANDARD: L13CompletionStandard = {
  completion_standard_id: `l13.completion.${HASH}`,
  required_sublayers_green: REQUIRED_SUBLAYERS,
  required_bands_green: REQUIRED_BANDS,
  required_final_invariants_green: REQUIRED_FINAL_INVARIANTS,
  zero_critical_violation_tolerance: true,
  zero_rollout_blocking_regression_tolerance: true,
  l14_handoff_required: true,
  ratification_artifact_required: true,
  freeze_activation_required: true,
  policy_version: POLICY_V,
  replay_hash: HASH,
};
