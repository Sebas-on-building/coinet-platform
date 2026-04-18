/**
 * L7.3 — Replay Identity and Materialization Readiness
 *
 * §7.3.7.4 – §7.3.7.6 — Canonical replay hash + materialization-ready
 * checks. Hash is deterministic across canonical JSON of the input.
 */

import type { L7ValidationSubjectContract } from '../contracts/validation-subject.contract';
import type { L7ValidationOutputContract } from '../contracts/validation-output.contract';
import type { L7ContradictionBundleContract } from '../contracts/contradiction-bundle.contract';
import type { L7ConfidenceAssessmentContract } from '../contracts/confidence-assessment.contract';
import type { L7ClaimRestrictionProfileContract } from '../contracts/restriction-profile.contract';
import {
  L7MaterializationReadinessState,
  L7ReplayIdentityMode,
} from '../contracts/validation-runtime-status';

/**
 * Stable canonical JSON: keys sorted recursively, numbers preserved as-is,
 * `undefined` removed. The output is a string suitable for hashing.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(canonicalize);
  const out: Record<string, unknown> = {};
  const keys = Object.keys(v as Record<string, unknown>).sort();
  for (const k of keys) out[k] = canonicalize((v as Record<string, unknown>)[k]);
  return out;
}

/**
 * 64-bit FNV-1a expressed as 16 hex chars. Implemented with BigInt for
 * deterministic correctness across runtimes. Used everywhere replay
 * identity must collide-resist beyond the L7.2 32-bit helpers.
 */
export function fnv1a64Hex(s: string): string {
  const PRIME = 0x100000001b3n;
  const MASK = 0xffffffffffffffffn;
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * PRIME) & MASK;
  }
  return h.toString(16).padStart(16, '0');
}

/**
 * §7.3.7.5 — Canonical replay hash. The mode controls which fields are
 * included: replay/repair modes normalise out the original `compute_run_id`
 * so re-running the same inputs yields the same hash.
 */
export function canonicalValidationReplayHash(args: {
  subject_contract_ref: string;
  scope_type: string;
  scope_id: string;
  as_of: string;
  contract_versions: Record<string, string>;
  material_inputs_canonical: unknown;
  contradiction_bundle_id: string | null;
  confidence_factor_signature: unknown;
  restriction_profile_id: string | null;
  mode: L7ReplayIdentityMode;
  compute_run_id: string;
}): string {
  const includeRunId =
    args.mode === L7ReplayIdentityMode.LIVE || args.mode === L7ReplayIdentityMode.LATE_DATA;
  const payload = canonicalJson({
    subject_contract_ref: args.subject_contract_ref,
    scope_type: args.scope_type,
    scope_id: args.scope_id,
    as_of: args.as_of,
    contract_versions: args.contract_versions,
    material_inputs: args.material_inputs_canonical,
    contradiction_bundle_id: args.contradiction_bundle_id,
    confidence_factor_signature: args.confidence_factor_signature,
    restriction_profile_id: args.restriction_profile_id,
    mode: args.mode,
    compute_run_id: includeRunId ? args.compute_run_id : null,
  });
  return `rh_${fnv1a64Hex(payload)}`;
}

/**
 * §7.3.7.6 — `isValidationMaterializationReady`. Returns the readiness
 * state; callers should treat `READY` and `READY_WITH_MODIFIERS` as
 * pass states.
 */
export function isValidationMaterializationReady(args: {
  output: L7ValidationOutputContract;
  subjectContract: L7ValidationSubjectContract | null;
  confidence: L7ConfidenceAssessmentContract | null;
  contradiction: L7ContradictionBundleContract | null;
  restriction: L7ClaimRestrictionProfileContract | null;
  evidenceRequired: boolean;
  cleanlinessViolation: boolean;
}): L7MaterializationReadinessState {
  const o = args.output;
  if (!o.validation_contract_version || !o.schema_version) {
    return L7MaterializationReadinessState.NOT_READY_VERSION_MISSING;
  }
  if (!o.replay_hash) return L7MaterializationReadinessState.NOT_READY_MISSING_REPLAY_HASH;
  if (!o.lineage_refs || !o.lineage_refs.trace_id || !o.lineage_refs.manifest_id) {
    return L7MaterializationReadinessState.NOT_READY_MISSING_LINEAGE;
  }
  if (!args.subjectContract) return L7MaterializationReadinessState.NOT_READY_INCOMPLETE_CONTRACT;
  if (args.evidenceRequired && !o.evidence_pack_ref) {
    return L7MaterializationReadinessState.NOT_READY_EVIDENCE_MISSING;
  }
  if (args.cleanlinessViolation) return L7MaterializationReadinessState.NOT_READY_CLEANLINESS_VIOLATION;

  if (
    o.validation_modifiers.length > 0 ||
    o.staleness_score > 0 ||
    o.incompleteness_score > 0 ||
    o.ambiguity_score > 0 ||
    o.degradation_score > 0 ||
    o.contradiction_severity_score > 0
  ) {
    return L7MaterializationReadinessState.READY_WITH_MODIFIERS;
  }
  return L7MaterializationReadinessState.READY;
}
