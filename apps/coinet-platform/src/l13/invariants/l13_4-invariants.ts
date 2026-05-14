/**
 * L13.4 — Grounding Invariants
 *
 * §13.4.20 — INV-13.4-A through INV-13.4-J.
 *
 *   A : claim extraction law
 *   B : claim grounding law
 *   C : evidence support law
 *   D : contradiction dominance law
 *   E : no-invention law
 *   F : citation completeness law
 *   G : rewrite/block law
 *   H : source-layer boundary law
 *   I : uncertainty preservation law
 *   J : replay determinism law
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13AIExplanationOutput } from '../contracts/ai-output';
import {
  L13ClaimGroundingClass,
  L13ClaimType,
} from '../contracts/grounded-claim';
import { L13GroundingReadinessClass } from '../contracts/claim-grounding';
import {
  extractL13Claims,
  matchL13EvidenceForClaims,
  matchL13ContradictionForClaims,
  runL13NoInventionGate,
  runL13ClaimGroundingEngine,
  buildL13CitationPack,
} from '../grounding';
import {
  L13CitationCompletenessClass,
} from '../contracts/citation-pack';
import { validateL13GroundedClaims } from '../validation/grounded-claim.validator';
import { validateL13ClaimGroundingResult } from '../validation/claim-grounding-result.validator';
import { validateL13NoInventionGateResult } from '../validation/no-invention.validator';
import { validateL13CitationPack } from '../validation/citation-pack.validator';
import { buildGreenL13Output } from './l13_3-invariants';
import { buildGreenL13InputPackage } from './l13_2-invariants';

export interface L13_4InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ── Pipeline runner ─────────────────────────────────────────────────

interface PipelineOutputs {
  readonly extraction: ReturnType<typeof extractL13Claims>;
  readonly evidenceMatches: ReturnType<typeof matchL13EvidenceForClaims>;
  readonly contradictionMatches: ReturnType<
    typeof matchL13ContradictionForClaims
  >;
  readonly inventionGate: ReturnType<typeof runL13NoInventionGate>;
  readonly grounding: ReturnType<typeof runL13ClaimGroundingEngine>;
  readonly citationPack: ReturnType<typeof buildL13CitationPack>;
}

export function runL13GroundingPipeline(
  output: L13AIExplanationOutput,
  pkg: L13AIInputPackage,
): PipelineOutputs {
  const extraction = extractL13Claims(output);
  const evidenceMatches = matchL13EvidenceForClaims(
    extraction.extracted_claims,
    pkg,
  );
  const contradictionMatches = matchL13ContradictionForClaims(
    extraction.extracted_claims,
    pkg,
  );
  const inventionGate = runL13NoInventionGate(
    output,
    pkg,
    extraction.extracted_claims,
  );
  const grounding = runL13ClaimGroundingEngine({
    output,
    input_package: pkg,
    extraction_result: extraction,
    evidence_matches: evidenceMatches,
    contradiction_matches: contradictionMatches,
    no_invention_gate: inventionGate,
    policy_version: 'l13.grounding.v1',
  });
  const citationPack = buildL13CitationPack({
    output_id: output.output_id,
    input_package: pkg,
    emitted_claims: grounding.grounded_claims,
  });
  return {
    extraction,
    evidenceMatches,
    contradictionMatches,
    inventionGate,
    grounding,
    citationPack,
  };
}

// ── Helpers to build offenders ──────────────────────────────────────

function injectIntoSummary(
  output: L13AIExplanationOutput,
  injection: string,
): L13AIExplanationOutput {
  return {
    ...output,
    summary: output.summary + ' ' + injection,
  } as L13AIExplanationOutput;
}

function injectIntoObservation(
  output: L13AIExplanationOutput,
  injection: string,
): L13AIExplanationOutput {
  if (!output.observation_section) return output;
  return {
    ...output,
    observation_section: {
      ...output.observation_section,
      content: output.observation_section.content + ' ' + injection,
    },
  } as L13AIExplanationOutput;
}

// ── INV-13.4-A : claim extraction law ───────────────────────────────

export function checkINV_134_A(): L13_4InvariantResult {
  const output = buildGreenL13Output();
  const extraction = extractL13Claims(output);
  const claims = extraction.extracted_claims;
  const hasHeadline = claims.some(c =>
    c.section_ref.endsWith(':headline'),
  );
  const hasSummary = claims.some(c =>
    c.section_ref.endsWith(':summary'),
  );
  const hasObservation = claims.some(c =>
    c.section_ref === 'sec.obs.1',
  );
  const hasInference = claims.some(c => c.section_ref === 'sec.inf.1');
  const allTyped = claims.every(c => !!c.detected_claim_type);
  const holds = hasHeadline && hasSummary && hasObservation && hasInference && allTyped;
  return {
    id: 'INV-13.4-A',
    name: 'claim extraction law',
    holds,
    evidence: `${claims.length} claims (headline=${hasHeadline}, summary=${hasSummary}, obs=${hasObservation}, inf=${hasInference}, typed=${allTyped})`,
  };
}

// ── INV-13.4-B : claim grounding law ────────────────────────────────

export function checkINV_134_B(): L13_4InvariantResult {
  const output = buildGreenL13Output();
  const pkg = buildGreenL13InputPackage();
  const { grounding } = runL13GroundingPipeline(output, pkg);
  // Every claim has exactly one grounding class.
  const allHaveClass = grounding.grounded_claims.every(
    c => !!c.grounding_class,
  );
  // Allowed emission only for non-blocked classes.
  const emissionLegal = grounding.grounded_claims.every(
    c =>
      !c.allowed_to_emit ||
      (c.grounding_class !==
        L13ClaimGroundingClass.UNSUPPORTED_BLOCKED &&
        c.grounding_class !==
          L13ClaimGroundingClass.CONTRADICTED_BLOCKED),
  );
  const v = validateL13GroundedClaims(grounding.grounded_claims, pkg);
  return {
    id: 'INV-13.4-B',
    name: 'claim grounding law',
    holds: allHaveClass && emissionLegal && v.clean,
    evidence: `n=${grounding.grounded_claims.length} class=${allHaveClass} emit=${emissionLegal} validator=${v.clean}`,
  };
}

// ── INV-13.4-C : evidence support law ───────────────────────────────

export function checkINV_134_C(): L13_4InvariantResult {
  const output = buildGreenL13Output();
  const pkg = buildGreenL13InputPackage();
  const { grounding } = runL13GroundingPipeline(output, pkg);
  // Every emitted observation/inference/scenario/score/hypothesis/
  // regime/sequence claim carries supporting refs.
  const violators = grounding.grounded_claims.filter(c => {
    if (!c.allowed_to_emit) return false;
    if (
      c.claim_type === L13ClaimType.UNCERTAINTY_STATEMENT ||
      c.claim_type === L13ClaimType.RESTRICTION_STATEMENT ||
      c.claim_type === L13ClaimType.REFUSAL_STATEMENT
    )
      return false;
    return c.supporting_evidence_refs.length === 0;
  });
  return {
    id: 'INV-13.4-C',
    name: 'evidence support law',
    holds: violators.length === 0,
    evidence: `violators=${violators.length}`,
  };
}

// ── INV-13.4-D : contradiction dominance law ───────────────────────

export function checkINV_134_D(): L13_4InvariantResult {
  // Build a package where active contradiction is present.
  const pkg = buildGreenL13InputPackage({ contradictionActive: true });
  const output = buildGreenL13Output({ contradictionPresent: true });
  const { grounding } = runL13GroundingPipeline(output, pkg);
  // The active contradiction should either narrow or block all
  // observation/inference/scenario claims.
  const offenders = grounding.grounded_claims.filter(c => {
    const isMaterial =
      c.claim_type === L13ClaimType.OBSERVATION ||
      c.claim_type === L13ClaimType.INFERENCE ||
      c.claim_type === L13ClaimType.SCENARIO_STATEMENT ||
      c.claim_type === L13ClaimType.SCORE_STATEMENT;
    if (!isMaterial) return false;
    if (!c.allowed_to_emit) return false;
    // emitted material claim under active contradiction must
    // declare disclosure or uncertainty.
    return !c.disclosure_required && !c.uncertainty_required;
  });
  return {
    id: 'INV-13.4-D',
    name: 'contradiction dominance law',
    holds: offenders.length === 0,
    evidence: `offenders=${offenders.length}`,
  };
}

// ── INV-13.4-E : no-invention law ───────────────────────────────────

export function checkINV_134_E(): L13_4InvariantResult {
  const pkg = buildGreenL13InputPackage();
  // Inject a financial instruction into observation — must be
  // detected and block.
  const offender = injectIntoObservation(
    buildGreenL13Output(),
    'You should long this here for a fast bounce.',
  );
  const { inventionGate, grounding } = runL13GroundingPipeline(
    offender,
    pkg,
  );
  const v = validateL13NoInventionGateResult(inventionGate);
  const detected = inventionGate.detected_inventions.length > 0;
  const blocked =
    inventionGate.gate_passed === false &&
    inventionGate.blocking_invention_refs.length > 0;
  const groundingBlocked = grounding.grounded_claims.some(
    c => !c.allowed_to_emit,
  );
  return {
    id: 'INV-13.4-E',
    name: 'no-invention law',
    holds: detected && blocked && !v.clean && groundingBlocked,
    evidence: `detected=${detected} blocked=${blocked} groundingBlocked=${groundingBlocked} issues=${v.issues.length}`,
  };
}

// ── INV-13.4-F : citation completeness law ─────────────────────────

export function checkINV_134_F(): L13_4InvariantResult {
  const output = buildGreenL13Output();
  const pkg = buildGreenL13InputPackage();
  const { citationPack } = runL13GroundingPipeline(output, pkg);
  const v = validateL13CitationPack(citationPack, pkg);
  const acceptable = [
    L13CitationCompletenessClass.COMPLETE_CITATION_PACK,
    L13CitationCompletenessClass.COMPLETE_WITH_DISCLOSURE,
    L13CitationCompletenessClass.PARTIAL_CITATION_PACK,
  ].includes(citationPack.citation_completeness_class);
  return {
    id: 'INV-13.4-F',
    name: 'citation completeness law',
    holds: acceptable && v.clean,
    evidence: `class=${citationPack.citation_completeness_class} validator=${v.clean}`,
  };
}

// ── INV-13.4-G : rewrite/block law ──────────────────────────────────

export function checkINV_134_G(): L13_4InvariantResult {
  const pkg = buildGreenL13InputPackage();
  // Inject an unsupported whale-accumulation claim with no support.
  const offender = injectIntoSummary(
    buildGreenL13Output(),
    'Whales are accumulating heavily.',
  );
  const { grounding } = runL13GroundingPipeline(offender, pkg);
  // The claim should be blocked or rewritten.
  const offendingClaim = grounding.grounded_claims.find(c =>
    c.normalized_claim_text.includes('whales are accumulating'),
  );
  const holds =
    !!offendingClaim &&
    (!offendingClaim.allowed_to_emit ||
      offendingClaim.rewrite_required ||
      offendingClaim.uncertainty_required);
  return {
    id: 'INV-13.4-G',
    name: 'rewrite/block law',
    holds,
    evidence: `claim=${!!offendingClaim} allowed=${offendingClaim?.allowed_to_emit} rewrite=${offendingClaim?.rewrite_required} uncertainty=${offendingClaim?.uncertainty_required}`,
  };
}

// ── INV-13.4-H : source-layer boundary law ──────────────────────────

export function checkINV_134_H(): L13_4InvariantResult {
  const output = buildGreenL13Output();
  const pkg = buildGreenL13InputPackage();
  const { grounding, citationPack } = runL13GroundingPipeline(
    output,
    pkg,
  );
  // Every ref in citation pack must live inside the package.
  const v = validateL13CitationPack(citationPack, pkg);
  const validatorR = validateL13ClaimGroundingResult(grounding);
  return {
    id: 'INV-13.4-H',
    name: 'source-layer boundary law',
    holds: v.clean && validatorR.clean,
    evidence: `citationValidator=${v.clean} groundingValidator=${validatorR.clean}`,
  };
}

// ── INV-13.4-I : uncertainty preservation law ──────────────────────

export function checkINV_134_I(): L13_4InvariantResult {
  // Under active invalidation + missing data, weak/inferred claims
  // must require uncertainty.
  const pkg = buildGreenL13InputPackage({
    invalidationActive: true,
    missingDataActive: true,
  });
  const output = buildGreenL13Output({ scenarioPresent: true });
  const { grounding } = runL13GroundingPipeline(output, pkg);
  const scenarioClaims = grounding.grounded_claims.filter(
    c =>
      c.claim_type === L13ClaimType.SCENARIO_STATEMENT &&
      c.allowed_to_emit,
  );
  const allRequireUncertainty = scenarioClaims.every(
    c => c.uncertainty_required || c.disclosure_required,
  );
  const readinessReflectsDisclosure =
    grounding.grounding_readiness_class !==
    L13GroundingReadinessClass.GROUNDING_CLEAN;
  return {
    id: 'INV-13.4-I',
    name: 'uncertainty preservation law',
    holds: allRequireUncertainty && readinessReflectsDisclosure,
    evidence: `scenarioClaims=${scenarioClaims.length} allRequireUnc=${allRequireUncertainty} readiness=${grounding.grounding_readiness_class}`,
  };
}

// ── INV-13.4-J : replay determinism law ─────────────────────────────

export function checkINV_134_J(): L13_4InvariantResult {
  const output = buildGreenL13Output();
  const pkg = buildGreenL13InputPackage();
  const run1 = runL13GroundingPipeline(output, pkg);
  const run2 = runL13GroundingPipeline(output, pkg);
  const extractionEq = run1.extraction.replay_hash === run2.extraction.replay_hash;
  const groundingEq = run1.grounding.replay_hash === run2.grounding.replay_hash;
  const citationEq = run1.citationPack.replay_hash === run2.citationPack.replay_hash;
  const inventionEq = run1.inventionGate.replay_hash === run2.inventionGate.replay_hash;

  // Material change flips hash.
  const altered = injectIntoSummary(output, 'Confidence is high.');
  const altRun = runL13GroundingPipeline(altered, pkg);
  const groundingFlipped =
    altRun.grounding.replay_hash !== run1.grounding.replay_hash;

  return {
    id: 'INV-13.4-J',
    name: 'replay determinism law',
    holds:
      extractionEq &&
      groundingEq &&
      citationEq &&
      inventionEq &&
      groundingFlipped,
    evidence: `ext=${extractionEq} gnd=${groundingEq} cite=${citationEq} inv=${inventionEq} flip=${groundingFlipped}`,
  };
}

export function runAllL13_4Invariants():
  readonly L13_4InvariantResult[] {
  return [
    checkINV_134_A(),
    checkINV_134_B(),
    checkINV_134_C(),
    checkINV_134_D(),
    checkINV_134_E(),
    checkINV_134_F(),
    checkINV_134_G(),
    checkINV_134_H(),
    checkINV_134_I(),
    checkINV_134_J(),
  ];
}
