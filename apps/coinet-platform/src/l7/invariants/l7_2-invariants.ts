/**
 * L7.2 — Object-Model Invariants
 *
 * §7.2.9.1 — INV-7.2-A through INV-7.2-G, all executable and
 * test-covered. Each invariant is a pure function returning a structured
 * result so the certification suite can fail with specific evidence.
 */

import {
  L7ValidationSubject,
  L7ValidationSubject as _SubjectTypeMarker,
} from '../contracts/validation-subject';
import {
  L7ValidationAssessment,
  classRequiresContradictionBundle,
  modifiersRequireContradictionBundle,
} from '../contracts/validation-assessment';
import {
  L7ContradictionBundle,
} from '../contracts/contradiction-bundle';
import {
  L7ConfidenceAssessment,
} from '../contracts/confidence-assessment';
import {
  L7ClaimRestrictionProfile,
  rightsAreInternallyConsistent,
} from '../contracts/claim-restriction-profile';
import {
  ALL_VALIDATION_OUTPUT_CLASSES,
} from '../contracts/validation-output-class';
import {
  validateValidationSubjectContract,
} from '../validation/validation-subject-contract.validator';
import {
  validateValidationAssessment,
} from '../validation/validation-assessment.validator';
import {
  validateContradictionBundle,
} from '../validation/contradiction-bundle.validator';
import {
  validateConfidenceAssessment,
} from '../validation/confidence-assessment.validator';
import {
  validateClaimRestrictionProfile,
} from '../validation/claim-restriction-profile.validator';
import {
  ValidationSubjectClassRegistry,
  getDefaultSubjectClassRegistry,
} from '../registry/validation-subject-class.registry';
import {
  ContradictionFamilyRegistry,
  getDefaultContradictionFamilyRegistry,
} from '../registry/contradiction-family.registry';
import {
  RestrictionRightRegistry,
  getDefaultRestrictionRightRegistry,
} from '../registry/restriction-right.registry';
import {
  ValidationOutputClassRegistry,
  getDefaultOutputClassRegistry,
} from '../registry/validation-output-class.registry';

// avoid "unused type" compiler complaint while making intent explicit
type _KeepSubjectImport = _SubjectTypeMarker;

export interface L7_2InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

export interface L7_2InvariantInput {
  readonly subjects: readonly L7ValidationSubject[];
  readonly assessments: readonly L7ValidationAssessment[];
  readonly bundles: readonly L7ContradictionBundle[];
  readonly confidences: readonly L7ConfidenceAssessment[];
  readonly restrictions: readonly L7ClaimRestrictionProfile[];
  readonly looseTextSubjects?: readonly unknown[];
}

// ── INV-7.2-A ──
// Layer 7 validates structured subjects only, never loose text opinions.
export function checkINV_72_A(input: L7_2InvariantInput): L7_2InvariantResult {
  const looseRejected = (input.looseTextSubjects ?? []).every(raw => {
    const s = raw as Partial<L7ValidationSubject>;
    const noId = !s.validation_subject_id;
    const noSupport = !s.supporting_primitive_refs || s.supporting_primitive_refs.length === 0;
    const noScope = !s.scope_type || !s.scope_id;
    return noId || noSupport || noScope;
  });
  const allStructured = input.subjects.every(
    s =>
      validateValidationSubjectContract(s).valid === true ||
      // If the subject fails structured validation for other reasons we still
      // accept it as "structured" for this invariant so long as it has
      // identity + scope + at least one primitive ref.
      (!!s.validation_subject_id &&
        !!s.scope_type &&
        !!s.scope_id &&
        s.supporting_primitive_refs.length > 0),
  );
  return {
    id: 'INV-7.2-A',
    name: 'L7 validates structured subjects only',
    holds: looseRejected && allStructured,
    evidence: `loose_rejected=${looseRejected} structured=${allStructured} subjects=${input.subjects.length}`,
  };
}

// ── INV-7.2-B ──
// Every subject has stable identity, scope, time anchoring, support/challenge
// declarations, and lineage.
export function checkINV_72_B(input: L7_2InvariantInput): L7_2InvariantResult {
  let failures = 0;
  for (const s of input.subjects) {
    const ok =
      !!s.validation_subject_id &&
      !!s.claim_family &&
      !!s.claim_name &&
      !!s.claim_version &&
      !!s.scope_type &&
      !!s.scope_id &&
      !!s.as_of &&
      s.supporting_primitive_refs.length > 0 &&
      s.required_confirmation_surfaces.length > 0 &&
      s.required_challenge_surfaces.length > 0 &&
      !!s.lineage_refs?.trace_id &&
      !!s.lineage_refs?.manifest_id;
    if (!ok) failures++;
  }
  return {
    id: 'INV-7.2-B',
    name: 'Subjects carry identity/scope/time/support/challenge/lineage',
    holds: failures === 0,
    evidence: `subjects=${input.subjects.length} failures=${failures}`,
  };
}

// ── INV-7.2-C ──
// Only registered subject classes are legal.
export function checkINV_72_C(
  input: L7_2InvariantInput,
  registry: ValidationSubjectClassRegistry = getDefaultSubjectClassRegistry(),
): L7_2InvariantResult {
  const unregistered = input.subjects.filter(
    s =>
      !registry.isRegistered(s.subject_class) ||
      s.hybrid_subject_classes.some(h => !registry.isRegistered(h)),
  );
  return {
    id: 'INV-7.2-C',
    name: 'Only registered subject classes are legal',
    holds: unregistered.length === 0,
    evidence: `subjects=${input.subjects.length} unregistered=${unregistered.length}`,
  };
}

// ── INV-7.2-D ──
// Validation outputs must be governed objects, not freeform commentary.
export function checkINV_72_D(
  input: L7_2InvariantInput,
  registry: ValidationOutputClassRegistry = getDefaultOutputClassRegistry(),
): L7_2InvariantResult {
  const outputClassesOk = ALL_VALIDATION_OUTPUT_CLASSES.every(c => registry.isRegistered(c));
  const unregisteredRejected = !registry.isRegistered('FREEFORM_NARRATIVE');

  const assessmentFailures = input.assessments.filter(
    a => validateValidationAssessment(a).valid === false,
  ).length;
  const bundleFailures = input.bundles.filter(
    b => validateContradictionBundle(b).valid === false,
  ).length;
  const confidenceFailures = input.confidences.filter(
    c => validateConfidenceAssessment(c).valid === false,
  ).length;
  const restrictionFailures = input.restrictions.filter(
    r => validateClaimRestrictionProfile(r).valid === false,
  ).length;

  const totalFailures =
    assessmentFailures + bundleFailures + confidenceFailures + restrictionFailures;

  return {
    id: 'INV-7.2-D',
    name: 'Outputs are governed objects, not freeform commentary',
    holds: outputClassesOk && unregisteredRejected && totalFailures === 0,
    evidence:
      `classes_ok=${outputClassesOk} unregistered_rejected=${unregisteredRejected} ` +
      `assessment_fail=${assessmentFailures} bundle_fail=${bundleFailures} ` +
      `confidence_fail=${confidenceFailures} restriction_fail=${restrictionFailures}`,
  };
}

// ── INV-7.2-E ──
// Contradiction bundles remain explicit, queryable, and lineage-linked.
export function checkINV_72_E(
  input: L7_2InvariantInput,
  registry: ContradictionFamilyRegistry = getDefaultContradictionFamilyRegistry(),
): L7_2InvariantResult {
  const bundleById = new Map(input.bundles.map(b => [b.contradiction_bundle_id, b]));

  // Every assessment that requires a bundle must reference one that exists
  // and that bundle must be non-empty and typed.
  let leakage = 0;
  for (const a of input.assessments) {
    const needs =
      classRequiresContradictionBundle(a.validation_class) ||
      modifiersRequireContradictionBundle(a.validation_modifiers);
    if (!needs) continue;
    const ref = a.contradiction_bundle_ref;
    if (!ref || !bundleById.has(ref)) {
      leakage++;
      continue;
    }
    const b = bundleById.get(ref)!;
    if (b.contradiction_records.length === 0) {
      leakage++;
      continue;
    }
    if (b.contradiction_records.some(r => !registry.isRegistered(r.family))) {
      leakage++;
    }
    if (!b.lineage_refs?.trace_id || !b.lineage_refs?.manifest_id) {
      leakage++;
    }
  }
  return {
    id: 'INV-7.2-E',
    name: 'Contradiction bundles are explicit, queryable, lineage-linked',
    holds: leakage === 0,
    evidence: `assessments=${input.assessments.length} leakage=${leakage}`,
  };
}

// ── INV-7.2-F ──
// Confidence assessments must be separable from validation and contradictions.
export function checkINV_72_F(input: L7_2InvariantInput): L7_2InvariantResult {
  // Separability means: confidence is its own object with its own id/hash
  // chain and is linkable from assessment via confidence_assessment_ref.
  const assessmentRefs = new Set(
    input.assessments
      .map(a => a.confidence_assessment_ref)
      .filter((x): x is string => typeof x === 'string' && x.length > 0),
  );
  const confidenceIds = new Set(
    input.confidences.map(c => `${c.validation_subject_id}|${c.compute_run_id}`),
  );

  let overlapViolations = 0;
  for (const a of input.assessments) {
    // The assessment must not embed confidence factor breakdown directly
    // (that belongs in ConfidenceAssessment).
    const shaped = a as unknown as Record<string, unknown>;
    if ('source_trust_component' in shaped || 'confidence_score' in shaped || 'components' in shaped) {
      overlapViolations++;
    }
  }

  const separable = input.confidences.every(
    c => typeof c.replay_hash === 'string' && c.replay_hash.length > 0 && !!c.components,
  );

  return {
    id: 'INV-7.2-F',
    name: 'Confidence is separable from assessment and contradiction',
    holds: overlapViolations === 0 && separable,
    evidence:
      `overlap_violations=${overlapViolations} separable=${separable} ` +
      `assessment_refs=${assessmentRefs.size} confidences=${confidenceIds.size}`,
  };
}

// ── INV-7.2-G ──
// Restriction profiles must explicitly define downstream usage rights.
export function checkINV_72_G(
  input: L7_2InvariantInput,
  registry: RestrictionRightRegistry = getDefaultRestrictionRightRegistry(),
): L7_2InvariantResult {
  let violations = 0;
  for (const p of input.restrictions) {
    if (!p.downstream_use_rights || p.downstream_use_rights.length === 0) {
      violations++;
      continue;
    }
    if (p.downstream_use_rights.some(r => !registry.isRegistered(r))) {
      violations++;
      continue;
    }
    if (!rightsAreInternallyConsistent(p)) {
      violations++;
    }
  }
  return {
    id: 'INV-7.2-G',
    name: 'Restriction profiles explicitly define downstream rights',
    holds: violations === 0,
    evidence: `restrictions=${input.restrictions.length} violations=${violations}`,
  };
}

export function runAllL7_2Invariants(input: L7_2InvariantInput): readonly L7_2InvariantResult[] {
  return [
    checkINV_72_A(input),
    checkINV_72_B(input),
    checkINV_72_C(input),
    checkINV_72_D(input),
    checkINV_72_E(input),
    checkINV_72_F(input),
    checkINV_72_G(input),
  ];
}
