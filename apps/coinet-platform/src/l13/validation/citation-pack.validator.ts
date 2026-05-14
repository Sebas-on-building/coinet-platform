/**
 * L13.4 — Citation Pack Validator
 *
 * §13.4.16 — Verifies citation pack completeness and that refs come
 * from the input package.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import {
  isL13BlockedCitationCompleteness,
  L13CitationCompletenessClass,
  L13MissingCitationReasonCode,
  type L13CitationPack,
} from '../contracts/citation-pack';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { buildL13PackageRefIndex } from '../grounding/_package-refs';
import { L13GroundingViolationCode } from './l13-grounding-violation-codes';
import {
  l13GroundingResult,
  type L13GroundingIssue,
  type L13GroundingValidationResult,
} from './_l13-grounding-issue';

const SEV = L13ViolationSeverity;

const MISSING_CODE_TO_VIOLATION: Readonly<
  Record<L13MissingCitationReasonCode, L13GroundingViolationCode>
> = {
  [L13MissingCitationReasonCode.MISSING_SCENARIO_REF]:
    L13GroundingViolationCode.L13G_SCENARIO_CLAIM_WITHOUT_SCENARIO_REF,
  [L13MissingCitationReasonCode.MISSING_SCORE_REF]:
    L13GroundingViolationCode.L13G_SCORE_CLAIM_WITHOUT_SCORE_REF,
  [L13MissingCitationReasonCode.MISSING_HYPOTHESIS_REF]:
    L13GroundingViolationCode.L13G_HYPOTHESIS_CLAIM_WITHOUT_HYPOTHESIS_REF,
  [L13MissingCitationReasonCode.MISSING_REGIME_REF]:
    L13GroundingViolationCode.L13G_REGIME_CLAIM_WITHOUT_REGIME_REF,
  [L13MissingCitationReasonCode.MISSING_SEQUENCE_REF]:
    L13GroundingViolationCode.L13G_SEQUENCE_CLAIM_WITHOUT_SEQUENCE_REF,
  [L13MissingCitationReasonCode.MISSING_CONTRADICTION_REF]:
    L13GroundingViolationCode.L13G_CONTRADICTION_CLAIM_WITHOUT_CONTRADICTION_REF,
  [L13MissingCitationReasonCode.MISSING_VALIDATION_REF]:
    L13GroundingViolationCode.L13G_CITATION_CLAIM_MISSING,
  [L13MissingCitationReasonCode.MISSING_EVIDENCE_REF]:
    L13GroundingViolationCode.L13G_CITATION_CLAIM_MISSING,
  [L13MissingCitationReasonCode.UNGOVERNED_REF]:
    L13GroundingViolationCode.L13G_CITATION_REF_UNGOVERNED,
  [L13MissingCitationReasonCode.CLAIM_HAS_NO_CITATION]:
    L13GroundingViolationCode.L13G_CITATION_CLAIM_MISSING,
};

export function validateL13CitationPack(
  pack: L13CitationPack,
  pkg: L13AIInputPackage,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];

  if (!pack.citation_pack_id || !pack.replay_hash) {
    issues.push({
      code: L13GroundingViolationCode.L13G_CITATION_PACK_MISSING,
      severity: SEV.CRITICAL,
      message: 'citation pack missing id or replay_hash',
    });
  }

  const index = buildL13PackageRefIndex(pkg);

  for (const r of [
    ...pack.evidence_refs,
    ...pack.contradiction_refs,
    ...pack.scenario_refs,
    ...pack.score_refs,
    ...pack.hypothesis_refs,
    ...pack.regime_refs,
    ...pack.sequence_refs,
    ...pack.validation_refs,
  ]) {
    if (!index.all_refs.has(r)) {
      issues.push({
        code: L13GroundingViolationCode.L13G_CITATION_REF_UNGOVERNED,
        severity: SEV.ERROR,
        subject_ref: pack.citation_pack_id,
        message: `citation ref "${r}" is not governed (absent from input package)`,
      });
    }
  }

  for (const r of pack.missing_citation_reason_codes) {
    const code = MISSING_CODE_TO_VIOLATION[r];
    if (code) {
      issues.push({
        code,
        severity:
          pack.citation_completeness_class ===
          L13CitationCompletenessClass.BLOCKED_MISSING_CRITICAL_CITATION
            ? SEV.CRITICAL
            : SEV.ERROR,
        subject_ref: pack.citation_pack_id,
        message: `citation pack flagged: ${r}`,
      });
    }
  }

  if (isL13BlockedCitationCompleteness(pack.citation_completeness_class)) {
    issues.push({
      code: L13GroundingViolationCode.L13G_CITATION_PACK_MISSING,
      severity: SEV.CRITICAL,
      subject_ref: pack.citation_pack_id,
      message: `citation completeness class ${pack.citation_completeness_class} blocks output`,
    });
  }

  return l13GroundingResult(issues);
}
