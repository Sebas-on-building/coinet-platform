/**
 * L13.4 — Claim Grounding Engine
 *
 * §13.4.11 — Consolidates extraction + evidence match + contradiction
 * match into a single deterministic grounding result. Each claim
 * gets a grounding class, strength, scope, allowed_to_emit flag,
 * block reason codes, and (when applicable) suggested rewrite.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import {
  L13ClaimContradictionEffect,
  type L13ContradictionMatch,
} from '../contracts/contradiction-match';
import {
  L13ClaimGroundingClass,
  L13ClaimScopeClass,
  L13ClaimStrengthClass,
  L13ClaimType,
  L13GroundingAction,
  L13GroundingBlockReasonCode,
  type L13GroundedClaim,
} from '../contracts/grounded-claim';
import {
  L13EvidenceMatchStrength,
  type L13EvidenceMatch,
} from '../contracts/evidence-match';
import type { L13ExtractedClaim } from '../contracts/claim-extraction';
import {
  L13GroundingReadinessClass,
  type L13ClaimGroundingInput,
  type L13ClaimGroundingResult,
} from '../contracts/claim-grounding';
import type { L13NoInventionGateResult } from '../contracts/no-invention';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.grounding.v1';

function scopeFromPackage(pkg: L13AIInputPackage): L13ClaimScopeClass {
  // Map scope_type to claim scope class.
  switch ((pkg.scope_type ?? '').toLowerCase()) {
    case 'entity':
      return L13ClaimScopeClass.ENTITY_SCOPE;
    case 'asset':
      return L13ClaimScopeClass.ASSET_SCOPE;
    case 'sector':
      return L13ClaimScopeClass.SECTOR_SCOPE;
    case 'ecosystem':
      return L13ClaimScopeClass.ECOSYSTEM_SCOPE;
    case 'market':
      return L13ClaimScopeClass.MARKET_SCOPE;
    case 'comparison':
      return L13ClaimScopeClass.COMPARISON_SCOPE;
    default:
      return L13ClaimScopeClass.USER_REQUEST_SCOPE;
  }
}

interface GroundOneInput {
  readonly claim: L13ExtractedClaim;
  readonly match: L13EvidenceMatch;
  readonly contra: L13ContradictionMatch;
  readonly inventionByClaim: ReadonlyMap<string, readonly string[]>;
  readonly inventionBlockingByClaim: ReadonlyMap<string, boolean>;
  readonly output_id: string;
  readonly input_package_id: string;
  readonly scope: L13ClaimScopeClass;
}

function groundOne(input: GroundOneInput): L13GroundedClaim {
  const { claim, match, contra, inventionByClaim, inventionBlockingByClaim } =
    input;

  const blockedReasons = new Set<L13GroundingBlockReasonCode>();
  const inventionCodes = inventionByClaim.get(claim.extracted_claim_id) ?? [];
  const inventionBlocks =
    inventionBlockingByClaim.get(claim.extracted_claim_id) === true;
  for (const code of inventionCodes) {
    // Map invention class string to block reason.
    const mapped = code as L13GroundingBlockReasonCode;
    if (
      (
        Object.values(L13GroundingBlockReasonCode) as string[]
      ).includes(mapped)
    ) {
      blockedReasons.add(mapped);
    }
  }

  const hasNonBlockingInvention =
    inventionCodes.length > 0 && !inventionBlocks;

  // §13.4.11.4 — Derive grounding class.
  let groundingClass: L13ClaimGroundingClass;
  if (contra.blocks_claim) {
    groundingClass = L13ClaimGroundingClass.CONTRADICTED_BLOCKED;
    blockedReasons.add(L13GroundingBlockReasonCode.ACTIVE_CONTRADICTION);
  } else if (inventionBlocks) {
    groundingClass = L13ClaimGroundingClass.UNSUPPORTED_BLOCKED;
  } else if (hasNonBlockingInvention) {
    // Non-blocking invention (e.g. INVENTED_EVIDENCE without the
    // specific support surface) still removes the claim from
    // direct-emission. The claim becomes UNSUPPORTED_BLOCKED so
    // the action layer can rewrite or remove it.
    groundingClass = L13ClaimGroundingClass.UNSUPPORTED_BLOCKED;
    blockedReasons.add(L13GroundingBlockReasonCode.NO_EVIDENCE_MATCH);
  } else if (match.match_strength === L13EvidenceMatchStrength.NO_MATCH) {
    groundingClass = L13ClaimGroundingClass.UNSUPPORTED_BLOCKED;
    blockedReasons.add(L13GroundingBlockReasonCode.NO_EVIDENCE_MATCH);
  } else if (
    match.match_strength === L13EvidenceMatchStrength.DIRECT_MATCH &&
    contra.contradiction_effect === L13ClaimContradictionEffect.NO_CONTRADICTION
  ) {
    groundingClass = L13ClaimGroundingClass.DIRECTLY_SUPPORTED;
  } else if (
    match.match_strength === L13EvidenceMatchStrength.DIRECT_MATCH &&
    contra.contradiction_effect === L13ClaimContradictionEffect.DISCLOSURE_REQUIRED
  ) {
    // Strong support but contradiction requires disclosure.
    groundingClass = L13ClaimGroundingClass.INFERRED_FROM_SUPPORTED_SURFACES;
  } else if (
    match.match_strength === L13EvidenceMatchStrength.DIRECT_MATCH &&
    contra.contradiction_effect === L13ClaimContradictionEffect.NARROWS_CLAIM
  ) {
    // Strong support narrowed by contradiction → uncertain-but-plausible.
    groundingClass = L13ClaimGroundingClass.UNCERTAIN_BUT_PLAUSIBLE;
  } else if (
    match.match_strength === L13EvidenceMatchStrength.STRONG_SEMANTIC_MATCH &&
    !contra.blocks_claim
  ) {
    groundingClass = L13ClaimGroundingClass.INFERRED_FROM_SUPPORTED_SURFACES;
  } else if (
    match.match_strength === L13EvidenceMatchStrength.WEAK_SEMANTIC_MATCH &&
    !contra.blocks_claim
  ) {
    groundingClass = L13ClaimGroundingClass.UNCERTAIN_BUT_PLAUSIBLE;
  } else {
    groundingClass = L13ClaimGroundingClass.UNSUPPORTED_BLOCKED;
    blockedReasons.add(L13GroundingBlockReasonCode.NO_EVIDENCE_MATCH);
  }

  // §13.4.5.1 — Claim strength derivation.
  let strength: L13ClaimStrengthClass;
  switch (groundingClass) {
    case L13ClaimGroundingClass.DIRECTLY_SUPPORTED:
      strength =
        claim.detected_claim_type === L13ClaimType.OBSERVATION
          ? L13ClaimStrengthClass.STRONG_ENGINE_STATED
          : L13ClaimStrengthClass.MODERATE_ENGINE_SUPPORTED;
      break;
    case L13ClaimGroundingClass.INFERRED_FROM_SUPPORTED_SURFACES:
      strength =
        claim.detected_claim_type === L13ClaimType.SCENARIO_STATEMENT
          ? L13ClaimStrengthClass.CONDITIONAL_ONLY
          : L13ClaimStrengthClass.MODERATE_ENGINE_SUPPORTED;
      break;
    case L13ClaimGroundingClass.UNCERTAIN_BUT_PLAUSIBLE:
      strength = L13ClaimStrengthClass.WEAK_DISCLOSURE_ONLY;
      break;
    default:
      strength = L13ClaimStrengthClass.BLOCKED;
  }

  // §13.4.11.4 — Allowed to emit?
  const allowedToEmit =
    groundingClass !== L13ClaimGroundingClass.UNSUPPORTED_BLOCKED &&
    groundingClass !== L13ClaimGroundingClass.CONTRADICTED_BLOCKED;

  // Determine action.
  let action: L13GroundingAction;
  let rewriteRequired = false;
  let suggested: string | undefined;
  if (!allowedToEmit) {
    action = inventionBlocks
      ? L13GroundingAction.BLOCK_OUTPUT
      : L13GroundingAction.REMOVE_CLAIM;
    if (
      groundingClass === L13ClaimGroundingClass.CONTRADICTED_BLOCKED &&
      claim.detected_claim_type === L13ClaimType.SCENARIO_STATEMENT
    ) {
      action = L13GroundingAction.REWRITE_AS_UNCERTAINTY;
      rewriteRequired = true;
      suggested =
        'The path is not confirmed yet; it remains conditional on governed triggers.';
    }
  } else if (
    groundingClass === L13ClaimGroundingClass.UNCERTAIN_BUT_PLAUSIBLE ||
    contra.contradiction_effect === L13ClaimContradictionEffect.NARROWS_CLAIM
  ) {
    action = L13GroundingAction.ALLOW_WITH_DISCLOSURE;
  } else if (contra.requires_rewrite) {
    action = L13GroundingAction.REWRITE_AS_UNCERTAINTY;
    rewriteRequired = true;
  } else {
    action = L13GroundingAction.ALLOW;
  }

  // §13.4.4 — Inference / uncertainty / disclosure required flags.
  const inferenceRequired =
    claim.detected_claim_type === L13ClaimType.INFERENCE ||
    groundingClass ===
      L13ClaimGroundingClass.INFERRED_FROM_SUPPORTED_SURFACES;
  const uncertaintyRequired =
    contra.requires_uncertainty ||
    groundingClass === L13ClaimGroundingClass.UNCERTAIN_BUT_PLAUSIBLE ||
    contra.contradiction_effect === L13ClaimContradictionEffect.NARROWS_CLAIM;
  const disclosureRequired =
    uncertaintyRequired ||
    contra.contradiction_effect ===
      L13ClaimContradictionEffect.DISCLOSURE_REQUIRED;

  // Normalize claim text.
  const normalized = claim.raw_text.toLowerCase().replace(/\s+/g, ' ').trim();

  const replayHash = fnv1a(
    [
      'L13_GROUNDED_CLAIM',
      claim.extracted_claim_id,
      input.output_id,
      input.input_package_id,
      claim.detected_claim_type,
      groundingClass,
      strength,
      input.scope,
      [...match.matched_evidence_refs].sort().join(','),
      [...contra.matched_contradiction_refs].sort().join(','),
      [...match.matched_source_layer_refs].sort().join(','),
      String(allowedToEmit),
      action,
      String(rewriteRequired),
      String(inferenceRequired),
      String(uncertaintyRequired),
      String(disclosureRequired),
      [...blockedReasons].sort().join(','),
      normalized,
      POLICY_V,
    ].join('|'),
  );

  return {
    claim_id: `l13.gclaim.${replayHash}`,
    output_id: input.output_id,
    input_package_id: input.input_package_id,
    claim_text: claim.raw_text,
    normalized_claim_text: normalized,
    claim_type: claim.detected_claim_type,
    grounding_class: groundingClass,
    claim_strength: strength,
    claim_scope: input.scope,
    supporting_evidence_refs: [...match.matched_evidence_refs].sort(),
    contradiction_refs: [...contra.matched_contradiction_refs].sort(),
    source_layer_refs: [...match.matched_source_layer_refs].sort(),
    source_surface_refs: [...match.matched_surface_refs].sort(),
    section_ref: claim.section_ref,
    inference_required: inferenceRequired,
    uncertainty_required: uncertaintyRequired,
    disclosure_required: disclosureRequired,
    allowed_to_emit: allowedToEmit,
    blocked_reason_codes: [...blockedReasons].sort(),
    rewrite_required: rewriteRequired,
    suggested_rewrite: suggested,
    grounding_action: action,
    lineage_refs: ['l13.lineage.grounding-engine'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

export interface L13GroundingEngineInput extends L13ClaimGroundingInput {
  readonly no_invention_gate: L13NoInventionGateResult;
}

/**
 * §13.4.11 — Run the grounding engine over the full pipeline.
 */
export function runL13ClaimGroundingEngine(
  input: L13GroundingEngineInput,
): L13ClaimGroundingResult {
  const {
    output,
    input_package,
    extraction_result,
    evidence_matches,
    contradiction_matches,
    no_invention_gate,
  } = input;

  const evidenceByClaim = new Map(
    evidence_matches.map(m => [m.claim_ref, m] as const),
  );
  const contraByClaim = new Map(
    contradiction_matches.map(c => [c.claim_ref, c] as const),
  );

  const inventionCodesByClaim = new Map<string, string[]>();
  const inventionBlockingByClaim = new Map<string, boolean>();
  for (const inv of no_invention_gate.detected_inventions) {
    const list = inventionCodesByClaim.get(inv.claim_ref) ?? [];
    list.push(inv.invention_class);
    inventionCodesByClaim.set(inv.claim_ref, list);
    if (inv.blocks_output) {
      inventionBlockingByClaim.set(inv.claim_ref, true);
    } else if (!inventionBlockingByClaim.has(inv.claim_ref)) {
      inventionBlockingByClaim.set(inv.claim_ref, false);
    }
  }

  const scope = scopeFromPackage(input_package);

  const grounded: L13GroundedClaim[] = [];
  for (const claim of extraction_result.extracted_claims) {
    const match = evidenceByClaim.get(claim.extracted_claim_id);
    const contra = contraByClaim.get(claim.extracted_claim_id);
    if (!match || !contra) {
      // Defensive — should never happen.
      continue;
    }
    grounded.push(
      groundOne({
        claim,
        match,
        contra,
        inventionByClaim: inventionCodesByClaim,
        inventionBlockingByClaim,
        output_id: output.output_id,
        input_package_id: input_package.input_package_id,
        scope,
      }),
    );
  }

  const blockedClaimRefs = grounded
    .filter(g => !g.allowed_to_emit)
    .map(g => g.claim_id)
    .sort();
  const rewriteRefs = grounded
    .filter(g => g.rewrite_required)
    .map(g => g.claim_id)
    .sort();
  const anyContradicted = grounded.some(
    g =>
      g.grounding_class === L13ClaimGroundingClass.CONTRADICTED_BLOCKED &&
      g.allowed_to_emit,
  );
  const anyUnsupported = grounded.some(
    g =>
      g.grounding_class === L13ClaimGroundingClass.UNSUPPORTED_BLOCKED &&
      g.allowed_to_emit,
  );
  const allGrounded = grounded
    .filter(g => g.allowed_to_emit)
    .every(
      g =>
        g.grounding_class !== L13ClaimGroundingClass.UNSUPPORTED_BLOCKED &&
        g.grounding_class !== L13ClaimGroundingClass.CONTRADICTED_BLOCKED,
    );

  let readiness: L13GroundingReadinessClass;
  if (
    grounded.some(
      g =>
        g.grounding_class === L13ClaimGroundingClass.CONTRADICTED_BLOCKED,
    )
  ) {
    readiness = L13GroundingReadinessClass.GROUNDING_BLOCKED_CONTRADICTED;
  } else if (blockedClaimRefs.length > 0 && grounded.some(g => g.blocked_reason_codes.includes(L13GroundingBlockReasonCode.INVENTED_FINANCIAL_INSTRUCTION))) {
    readiness = L13GroundingReadinessClass.GROUNDING_REFUSAL_REQUIRED;
  } else if (
    grounded.some(
      g =>
        g.grounding_class === L13ClaimGroundingClass.UNSUPPORTED_BLOCKED,
    )
  ) {
    readiness = L13GroundingReadinessClass.GROUNDING_BLOCKED_UNSUPPORTED;
  } else if (rewriteRefs.length > 0) {
    readiness = L13GroundingReadinessClass.GROUNDING_REWRITE_REQUIRED;
  } else if (grounded.some(g => g.disclosure_required)) {
    readiness = L13GroundingReadinessClass.GROUNDING_CLEAN_WITH_DISCLOSURE;
  } else {
    readiness = L13GroundingReadinessClass.GROUNDING_CLEAN;
  }

  const replayHash = fnv1a(
    [
      'L13_GROUNDING_RESULT',
      output.output_id,
      input_package.input_package_id,
      grounded.map(g => g.replay_hash).join('||'),
      readiness,
      String(allGrounded),
      String(anyContradicted),
      String(anyUnsupported),
      POLICY_V,
    ].join('|'),
  );

  return {
    grounding_result_id: `l13.grounding.${replayHash}`,
    output_id: output.output_id,
    input_package_id: input_package.input_package_id,
    grounded_claims: grounded,
    blocked_claim_refs: blockedClaimRefs,
    rewrite_required_claim_refs: rewriteRefs,
    all_emitted_claims_grounded: allGrounded,
    any_contradicted_claim_emitted: anyContradicted,
    any_unsupported_claim_emitted: anyUnsupported,
    grounding_readiness_class: readiness,
    evidence_refs: [...output.evidence_refs].sort(),
    lineage_refs: ['l13.lineage.grounding-engine'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
