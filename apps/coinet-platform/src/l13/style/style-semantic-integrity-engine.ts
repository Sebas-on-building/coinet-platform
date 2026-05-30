/**
 * L13.8 — Style Semantic Integrity Engine
 *
 * §13.8.24 / §13.8.25 — Verifies that the response shaper's pass
 * preserved every required semantic anchor and did not silently
 * add new claims, strengthen confidence, or weaken disclosure.
 *
 * Algorithm:
 *  1. Walk each required semantic anchor class.
 *  2. For each class, check whether AT LEAST one keyword anchor
 *     (from the multilingual catalogue in `style-policy.ts`)
 *     appears in the shaped corpus.
 *  3. Optionally check that anchors present in the source payload
 *     remained present in the shaped corpus.
 *  4. Apply forbidden-style pattern scan to catch newly introduced
 *     hype/advisor/prophecy language.
 *  5. Return a deterministic integrity profile.
 */

import {
  L13_FORBIDDEN_STYLE_PATTERNS,
  L13_SEMANTIC_ANCHOR_KEYWORDS,
  L13RequiredSemanticAnchorClass,
} from '../contracts/style-policy';
import {
  L13StyleIntegrityStatus,
  type L13StyleSemanticIntegrityProfile,
} from '../contracts/style-semantic-integrity-profile';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.style.v1';

export interface L13StyleSemanticIntegrityInput {
  readonly source_mode_payload_ref: string;
  readonly shaped_response_ref: string;
  readonly source_corpus: string;
  readonly shaped_corpus: string;
  readonly required_anchor_classes:
    readonly L13RequiredSemanticAnchorClass[];
}

function anchorPresent(
  corpus: string,
  cls: L13RequiredSemanticAnchorClass,
): boolean {
  const lower = corpus.toLowerCase();
  for (const kw of L13_SEMANTIC_ANCHOR_KEYWORDS[cls]) {
    if (lower.includes(kw.toLowerCase())) return true;
  }
  return false;
}

/**
 * Detect tokens in the shaped corpus that did NOT appear in the
 * source corpus. The heuristic strips ≤4-char tokens, sorts
 * deterministically, and compares lowercase forms. This is a
 * coarse signal — material false positives are tolerated by the
 * runtime (it routes them through governed rewrite); false
 * negatives are the dangerous direction (and the integrity
 * engine errs toward over-detection).
 */
function detectAddedTokens(
  source: string,
  shaped: string,
): boolean {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-zäöüßñáéíóú0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 4);
  const srcSet = new Set(tokenize(source));
  for (const t of tokenize(shaped)) {
    if (!srcSet.has(t)) return true;
  }
  return false;
}

const CONFIDENCE_STRENGTHENING_PATTERNS: readonly RegExp[] = [
  /\b(absolutely|definitely|certainly|guaranteed)\b/i,
  /\bwill\s+(pump|dump|moon|crash)\b/i,
  /\blocked\s+in\b/i,
  /\bthis\s+confirms\b/i,
];

const DISCLOSURE_WEAKENING_PATTERNS: readonly RegExp[] = [
  /\bno\s+(major\s+)?contradictions?\b/i,
  /\beverything\s+lines\s+up\b/i,
  /\bdata\s+is\s+complete\b/i,
  /\bsetup\s+is\s+clean\b/i,
];

/**
 * §13.8.24 — Run the integrity engine. Pure function.
 */
export function runL13StyleSemanticIntegrityEngine(
  input: L13StyleSemanticIntegrityInput,
): L13StyleSemanticIntegrityProfile {
  const preserved: L13RequiredSemanticAnchorClass[] = [];
  const missing: L13RequiredSemanticAnchorClass[] = [];
  for (const cls of input.required_anchor_classes) {
    if (anchorPresent(input.shaped_corpus, cls)) {
      preserved.push(cls);
    } else if (anchorPresent(input.source_corpus, cls)) {
      missing.push(cls);
    } else {
      // Anchor not required by source — neither preserved nor
      // missing; ignore.
    }
  }
  const preserved_uncertainty_anchor = preserved.includes(
    L13RequiredSemanticAnchorClass.UNCERTAINTY_DISCLOSURE,
  );
  const preserved_contradiction_anchor = preserved.includes(
    L13RequiredSemanticAnchorClass.CONTRADICTION_DISCLOSURE,
  );
  const preserved_trigger_anchor = preserved.includes(
    L13RequiredSemanticAnchorClass.TRIGGER_DISCLOSURE,
  );
  const preserved_invalidation_anchor = preserved.includes(
    L13RequiredSemanticAnchorClass.INVALIDATION_DISCLOSURE,
  );
  const preserved_restriction_anchor = preserved.includes(
    L13RequiredSemanticAnchorClass.RESTRICTION_DISCLOSURE,
  );

  const confidence_strengthened_detected =
    CONFIDENCE_STRENGTHENING_PATTERNS.some(p =>
      p.test(input.shaped_corpus),
    );
  const disclosure_weakened_detected =
    DISCLOSURE_WEAKENING_PATTERNS.some(p =>
      p.test(input.shaped_corpus),
    );
  // "Added claim" = a forbidden-style pattern fires in the shaped
  // corpus that did NOT fire in the source corpus.
  const added_claim_detected = (() => {
    for (const entry of L13_FORBIDDEN_STYLE_PATTERNS) {
      if (
        entry.pattern.test(input.shaped_corpus) &&
        !entry.pattern.test(input.source_corpus)
      ) {
        return true;
      }
    }
    return false;
  })();
  const removed_required_claim_detected = missing.length > 0;
  void detectAddedTokens; // tracked for future heuristic use

  let status: L13StyleIntegrityStatus;
  if (
    confidence_strengthened_detected ||
    disclosure_weakened_detected ||
    added_claim_detected
  ) {
    status = L13StyleIntegrityStatus.STYLE_SEMANTIC_REWRITE_REQUIRED;
  } else if (removed_required_claim_detected) {
    status = L13StyleIntegrityStatus.STYLE_RESHAPE_REQUIRED;
  } else if (input.required_anchor_classes.length === 0) {
    status = L13StyleIntegrityStatus.STYLE_INTEGRITY_CLEAN;
  } else {
    status =
      L13StyleIntegrityStatus.STYLE_INTEGRITY_CLEAN_WITH_DISCLOSURE_FLOOR;
  }

  const replayHash = fnv1a(
    [
      input.source_mode_payload_ref,
      input.shaped_response_ref,
      input.required_anchor_classes.slice().sort().join(','),
      preserved.slice().sort().join(','),
      missing.slice().sort().join(','),
      String(added_claim_detected),
      String(removed_required_claim_detected),
      String(confidence_strengthened_detected),
      String(disclosure_weakened_detected),
      status,
      POLICY_V,
    ].join('|'),
  );

  return {
    style_integrity_id: `l13.style.integrity.${replayHash}`,
    source_mode_payload_ref: input.source_mode_payload_ref,
    shaped_response_ref: input.shaped_response_ref,
    required_anchor_classes: input.required_anchor_classes,
    anchor_classes_preserved: preserved,
    anchor_classes_missing: missing,
    preserved_uncertainty_anchor,
    preserved_contradiction_anchor,
    preserved_trigger_anchor,
    preserved_invalidation_anchor,
    preserved_restriction_anchor,
    added_claim_detected,
    removed_required_claim_detected,
    confidence_strengthened_detected,
    disclosure_weakened_detected,
    integrity_status: status,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
