/**
 * L13.5 — Expression Governance Invariants
 *
 * §13.5.27 — INV-13.5-A through INV-13.5-J.
 *
 *   A : uncertainty-is-governed law
 *   B : confidence ceiling law (no raising)
 *   C : mandatory disclosure law
 *   D : contradiction preservation law
 *   E : forbidden certainty law
 *   F : restriction composition law (most restrictive wins)
 *   G : blocked use law
 *   H : expression readiness law
 *   I : rewrite/refusal/block law
 *   J : replay determinism law
 */

import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13AIInputPackage } from '../contracts/ai-input-package';
import { L13ContradictionDisclosureEffectClass } from '../contracts/contradiction-disclosure-profile';
import { L13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import { L13ExpressionReadinessClass } from '../contracts/expression-governance-envelope';
import {
  L13RestrictionLevel,
  L13_ALWAYS_BLOCKED_OUTPUT_USES,
} from '../contracts/restriction-composition';
import { L13PhraseStrengthClass } from '../contracts/phrase-strength';
import { rankL13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import {
  deriveL13ConfidenceCeiling,
  runL13ExpressionGovernance,
} from '../restrictions';
import { runL13GroundingPipeline } from './l13_4-invariants';
import { buildGreenL13Output } from './l13_3-invariants';
import { buildGreenL13InputPackage } from './l13_2-invariants';
import { validateL13UncertaintyDisclosureProfile } from '../validation/uncertainty-disclosure.validator';
import { validateL13ContradictionDisclosureProfile } from '../validation/contradiction-disclosure.validator';
import { validateL13ConfidencePhrasingProfile } from '../validation/confidence-phrasing.validator';
import { validateL13RestrictionCompositionProfile } from '../validation/restriction-composition.validator';
import { validateL13ConfidenceCeilingResult } from '../validation/confidence-ceiling.validator';
import { validateL13PhraseStrengthProfile } from '../validation/phrase-strength.validator';
import { validateL13ExpressionGovernanceEnvelope } from '../validation/expression-governance-envelope.validator';

export interface L13_5InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/**
 * Helper: assemble the inputs the expression-governance engine
 * needs from a green output + input package + grounding pipeline.
 */
export function runL13ExpressionPipeline(
  output: L13AIExplanationOutput,
  pkg: L13AIInputPackage,
): ReturnType<typeof runL13ExpressionGovernance> {
  const { contradictionMatches, grounding } = runL13GroundingPipeline(
    output,
    pkg,
  );
  return runL13ExpressionGovernance({
    output,
    input_package: pkg,
    grounding_result: grounding,
    contradiction_matches: contradictionMatches,
    evidence_refs: pkg.evidence_refs.slice(0, 3),
    lineage_refs: pkg.lineage_refs.slice(0, 3),
  });
}

/**
 * Inject a substring into the summary of a green output, useful
 * for building crafted offenders.
 */
function injectIntoSummary(
  output: L13AIExplanationOutput,
  injection: string,
): L13AIExplanationOutput {
  return {
    ...output,
    summary: `${output.summary} ${injection}`,
  } as L13AIExplanationOutput;
}

// ── INV-13.5-A : uncertainty-is-governed law ────────────────────────

export function checkINV_135_A(): L13_5InvariantResult {
  // Active contradiction package must produce non-empty
  // uncertainty profile sources.
  const pkg = buildGreenL13InputPackage({ contradictionActive: true });
  const output = buildGreenL13Output({ contradictionPresent: true });
  const { uncertainty_disclosure } = runL13ExpressionPipeline(
    output,
    pkg,
  );
  const v = validateL13UncertaintyDisclosureProfile(uncertainty_disclosure);
  const holds =
    uncertainty_disclosure.uncertainty_sources.length > 0 &&
    uncertainty_disclosure.required_disclosure_phrases.length > 0 &&
    v.clean;
  return {
    id: 'INV-13.5-A',
    name: 'uncertainty-is-governed law',
    holds,
    evidence: `sources=${uncertainty_disclosure.uncertainty_sources.length} phrases=${uncertainty_disclosure.required_disclosure_phrases.length} validator=${v.clean}`,
  };
}

// ── INV-13.5-B : confidence ceiling law ─────────────────────────────

export function checkINV_135_B(): L13_5InvariantResult {
  const pkg = buildGreenL13InputPackage({
    invalidationActive: true,
    missingDataActive: true,
  });
  const output = buildGreenL13Output();
  const { grounding } = runL13GroundingPipeline(output, pkg);
  const result = deriveL13ConfidenceCeiling({
    input_package: pkg,
    grounding_result: grounding,
  });
  const inheritedRank = rankL13ExplanationConfidenceBand(
    result.inherited_band,
  );
  const ceilingRank = rankL13ExplanationConfidenceBand(
    result.confidence_ceiling,
  );
  const v = validateL13ConfidenceCeilingResult(result);
  const holds = ceilingRank <= inheritedRank && v.clean;
  return {
    id: 'INV-13.5-B',
    name: 'confidence ceiling law',
    holds,
    evidence: `inherited=${result.inherited_band} ceiling=${result.confidence_ceiling} reasons=${result.reason_codes.join(',')}`,
  };
}

// ── INV-13.5-C : mandatory disclosure law ───────────────────────────

export function checkINV_135_C(): L13_5InvariantResult {
  const pkg = buildGreenL13InputPackage({
    contradictionActive: true,
    invalidationActive: true,
    missingDataActive: true,
  });
  const output = buildGreenL13Output({ contradictionPresent: true });
  const { uncertainty_disclosure } = runL13ExpressionPipeline(
    output,
    pkg,
  );
  const v = validateL13UncertaintyDisclosureProfile(uncertainty_disclosure);
  const mustMentionFlags =
    uncertainty_disclosure.must_mention_contradiction &&
    uncertainty_disclosure.must_mention_invalidation &&
    uncertainty_disclosure.must_mention_missing_data;
  const holds = mustMentionFlags && v.clean;
  return {
    id: 'INV-13.5-C',
    name: 'mandatory disclosure law',
    holds,
    evidence: `mustMention=${mustMentionFlags} validator=${v.clean}`,
  };
}

// ── INV-13.5-D : contradiction preservation law ─────────────────────

export function checkINV_135_D(): L13_5InvariantResult {
  const pkg = buildGreenL13InputPackage({ contradictionActive: true });
  // Build an output that hides contradiction with "no major
  // contradictions" phrasing.
  const offender = injectIntoSummary(
    buildGreenL13Output({ contradictionPresent: true }),
    'There are no major contradictions to worry about.',
  );
  const { contradiction_disclosure } = runL13ExpressionPipeline(
    offender,
    pkg,
  );
  const v = validateL13ContradictionDisclosureProfile(
    contradiction_disclosure,
  );
  const detectedHidden =
    contradiction_disclosure.contradiction_hidden_detected;
  const blocksClean =
    contradiction_disclosure.contradiction_effect_class ===
      L13ContradictionDisclosureEffectClass.BLOCKS_CLEAN_OUTPUT ||
    contradiction_disclosure.contradiction_effect_class ===
      L13ContradictionDisclosureEffectClass.BLOCKS_OUTPUT;
  const holds = detectedHidden && blocksClean && !v.clean;
  return {
    id: 'INV-13.5-D',
    name: 'contradiction preservation law',
    holds,
    evidence: `hidden=${detectedHidden} effect=${contradiction_disclosure.contradiction_effect_class} validatorIssues=${v.issues.length}`,
  };
}

// ── INV-13.5-E : forbidden certainty law ────────────────────────────

export function checkINV_135_E(): L13_5InvariantResult {
  const pkg = buildGreenL13InputPackage();
  const offender = injectIntoSummary(
    buildGreenL13Output(),
    'This confirms the bullish case and is almost certainly going up.',
  );
  const { confidence_phrasing } = runL13ExpressionPipeline(offender, pkg);
  const v = validateL13ConfidencePhrasingProfile(confidence_phrasing);
  const detected =
    confidence_phrasing.absolute_forbidden_phrases_detected.length > 0;
  const flagged =
    confidence_phrasing.confidence_outrun_detected &&
    confidence_phrasing.output_must_be_rewritten;
  const holds = detected && flagged && !v.clean;
  return {
    id: 'INV-13.5-E',
    name: 'forbidden certainty law',
    holds,
    evidence: `detected=${confidence_phrasing.absolute_forbidden_phrases_detected.length} rewrite=${confidence_phrasing.output_must_be_rewritten} validator=${v.clean}`,
  };
}

// ── INV-13.5-F : restriction composition law ────────────────────────

export function checkINV_135_F(): L13_5InvariantResult {
  const pkg = buildGreenL13InputPackage();
  const output = buildGreenL13Output();
  const { restriction_composition } = runL13ExpressionPipeline(
    output,
    pkg,
  );
  const v = validateL13RestrictionCompositionProfile(restriction_composition);
  // Always-blocked uses must all be present in blocked set.
  const allAlwaysBlocked = L13_ALWAYS_BLOCKED_OUTPUT_USES.every(use =>
    restriction_composition.blocked_output_uses.includes(use),
  );
  // FORBIDDEN_CERTAINTY must never be in allowed.
  const forbiddenAbsent =
    !restriction_composition.allowed_phrase_strength_classes.includes(
      L13PhraseStrengthClass.FORBIDDEN_CERTAINTY,
    );
  const holds = allAlwaysBlocked && forbiddenAbsent && v.clean;
  return {
    id: 'INV-13.5-F',
    name: 'restriction composition law',
    holds,
    evidence: `alwaysBlocked=${allAlwaysBlocked} forbiddenAbsent=${forbiddenAbsent} validator=${v.clean} level=${restriction_composition.composed_restriction_level}`,
  };
}

// ── INV-13.5-G : blocked use law ────────────────────────────────────

export function checkINV_135_G(): L13_5InvariantResult {
  const pkg = buildGreenL13InputPackage();
  const output = buildGreenL13Output();
  const { restriction_composition } = runL13ExpressionPipeline(
    output,
    pkg,
  );
  // Every always-blocked use must remain blocked regardless of
  // input-package permissiveness.
  const reopened = L13_ALWAYS_BLOCKED_OUTPUT_USES.filter(
    use =>
      restriction_composition.allowed_output_uses.includes(
        use as unknown as never,
      ),
  );
  return {
    id: 'INV-13.5-G',
    name: 'blocked use law',
    holds: reopened.length === 0,
    evidence: `reopened=${reopened.length}`,
  };
}

// ── INV-13.5-H : expression readiness law ───────────────────────────

export function checkINV_135_H(): L13_5InvariantResult {
  // Clean inputs should produce CLEAN or CLEAN_WITH_DISCLOSURE.
  const cleanPkg = buildGreenL13InputPackage();
  const cleanOut = buildGreenL13Output();
  const { envelope: cleanEnvelope } = runL13ExpressionPipeline(
    cleanOut,
    cleanPkg,
  );
  const cleanReadinessLegal =
    cleanEnvelope.final_expression_readiness ===
      L13ExpressionReadinessClass.EXPRESSION_CLEAN ||
    cleanEnvelope.final_expression_readiness ===
      L13ExpressionReadinessClass.EXPRESSION_CLEAN_WITH_DISCLOSURE ||
    cleanEnvelope.final_expression_readiness ===
      L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_UNCERTAINTY;

  // Disclosure required scenario should not be CLEAN.
  const dirtyPkg = buildGreenL13InputPackage({
    contradictionActive: true,
    invalidationActive: true,
  });
  const dirtyOut = buildGreenL13Output({ contradictionPresent: true });
  const { envelope: dirtyEnvelope } = runL13ExpressionPipeline(
    dirtyOut,
    dirtyPkg,
  );
  const dirtyReadinessLegal =
    dirtyEnvelope.final_expression_readiness !==
    L13ExpressionReadinessClass.EXPRESSION_CLEAN;

  return {
    id: 'INV-13.5-H',
    name: 'expression readiness law',
    holds: cleanReadinessLegal && dirtyReadinessLegal,
    evidence: `clean=${cleanEnvelope.final_expression_readiness} dirty=${dirtyEnvelope.final_expression_readiness}`,
  };
}

// ── INV-13.5-I : rewrite/refusal/block law ──────────────────────────

export function checkINV_135_I(): L13_5InvariantResult {
  const pkg = buildGreenL13InputPackage();
  // Absolute forbidden phrase MUST trigger rewrite or block.
  const offender = injectIntoSummary(
    buildGreenL13Output(),
    'This is guaranteed and locked in; will pump.',
  );
  const { envelope, confidence_phrasing } = runL13ExpressionPipeline(
    offender,
    pkg,
  );
  const phrasingMandatesRewrite =
    confidence_phrasing.output_must_be_rewritten ||
    confidence_phrasing.output_must_be_blocked;
  const envelopeMarksRewrite =
    envelope.rewrite_required || envelope.block_required;
  const ceilingNotRaised =
    envelope.final_confidence_ceiling !==
    L13ExplanationConfidenceBand.VERY_HIGH;
  return {
    id: 'INV-13.5-I',
    name: 'rewrite/refusal/block law',
    holds:
      phrasingMandatesRewrite &&
      envelopeMarksRewrite &&
      ceilingNotRaised,
    evidence: `phrasingRewrite=${phrasingMandatesRewrite} envelopeFlags=rewrite:${envelope.rewrite_required},block:${envelope.block_required} ceiling=${envelope.final_confidence_ceiling}`,
  };
}

// ── INV-13.5-J : replay determinism law ─────────────────────────────

export function checkINV_135_J(): L13_5InvariantResult {
  const pkg = buildGreenL13InputPackage();
  const output = buildGreenL13Output();
  const run1 = runL13ExpressionPipeline(output, pkg);
  const run2 = runL13ExpressionPipeline(output, pkg);
  const envelopesEq =
    run1.envelope.replay_hash === run2.envelope.replay_hash;
  const uncertaintyEq =
    run1.uncertainty_disclosure.replay_hash ===
    run2.uncertainty_disclosure.replay_hash;
  const phrasingEq =
    run1.confidence_phrasing.replay_hash ===
    run2.confidence_phrasing.replay_hash;
  const contradictionEq =
    run1.contradiction_disclosure.replay_hash ===
    run2.contradiction_disclosure.replay_hash;
  const restrictionEq =
    run1.restriction_composition.replay_hash ===
    run2.restriction_composition.replay_hash;

  // Material change flips envelope hash.
  const altered = injectIntoSummary(output, 'This is guaranteed.');
  const altRun = runL13ExpressionPipeline(altered, pkg);
  const flipped =
    altRun.envelope.replay_hash !== run1.envelope.replay_hash;

  return {
    id: 'INV-13.5-J',
    name: 'replay determinism law',
    holds:
      envelopesEq &&
      uncertaintyEq &&
      phrasingEq &&
      contradictionEq &&
      restrictionEq &&
      flipped,
    evidence: `env=${envelopesEq} unc=${uncertaintyEq} phr=${phrasingEq} con=${contradictionEq} res=${restrictionEq} flip=${flipped}`,
  };
}

export function runAllL13_5Invariants():
  readonly L13_5InvariantResult[] {
  return [
    checkINV_135_A(),
    checkINV_135_B(),
    checkINV_135_C(),
    checkINV_135_D(),
    checkINV_135_E(),
    checkINV_135_F(),
    checkINV_135_G(),
    checkINV_135_H(),
    checkINV_135_I(),
    checkINV_135_J(),
  ];
}

// Validator passthroughs used by external callers.
export {
  validateL13PhraseStrengthProfile,
  validateL13ExpressionGovernanceEnvelope,
};
