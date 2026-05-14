/**
 * L13.3 — Output Section Validator
 *
 * §13.3.14 — Validates a single section against the section
 * discipline: required vs present consistency, content emptiness,
 * evidence-ref presence for factual sections, contradiction-ref
 * presence for the contradiction section, observation/inference
 * separation, and forbidden semantic hits.
 */

import {
  L13_INFERENCE_MARKER_PHRASES,
  L13_OBSERVATION_MARKER_PHRASES,
  L13OutputSection,
  L13OutputSectionClass,
  L13OutputSectionReadinessClass,
} from '../contracts/output-section';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13OutputViolationCode } from './l13-output-violation-codes';
import {
  l13OutputResult,
  type L13OutputIssue,
  type L13OutputValidationResult,
} from './_l13-output-issue';
import { scanL13SemanticLeakage } from './semantic-leakage-scanners';

const SEV = L13ViolationSeverity;

function err(
  code: L13OutputViolationCode,
  severity: L13ViolationSeverity,
  message: string,
  subject_ref?: string,
  details?: Record<string, unknown>,
): L13OutputIssue {
  return { code, severity, message, subject_ref, details };
}

function isEmpty(s: string): boolean {
  return !s || s.trim() === '';
}

function containsAny(text: string, phrases: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const p of phrases) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return null;
}

/**
 * §13.3.4.3 / §13.3.5 — Validate a single section.
 */
export function validateL13OutputSection(
  section: L13OutputSection,
): L13OutputValidationResult {
  const issues: L13OutputIssue[] = [];

  // Required/present consistency.
  if (section.required && !section.present) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_SECTION_INVALID,
        SEV.ERROR,
        `section "${section.section_class}" is required but not present`,
        section.section_id,
      ),
    );
  }

  // Content emptiness when present.
  if (section.present && isEmpty(section.content)) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_SECTION_CONTENT_EMPTY,
        SEV.ERROR,
        `section "${section.section_class}" present but content is empty`,
        section.section_id,
      ),
    );
  }

  // Factual sections must carry evidence refs.
  const factualClasses: L13OutputSectionClass[] = [
    L13OutputSectionClass.OBSERVATION,
    L13OutputSectionClass.SCENARIO,
    L13OutputSectionClass.SCORE,
    L13OutputSectionClass.TRIGGER_INVALIDATION,
  ];
  if (
    section.present &&
    factualClasses.includes(section.section_class) &&
    section.evidence_refs.length === 0
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_SECTION_REFS_MISSING,
        SEV.CRITICAL,
        `factual section "${section.section_class}" missing evidence refs`,
        section.section_id,
      ),
    );
  }

  // Contradiction section must carry contradiction refs.
  if (
    section.section_class === L13OutputSectionClass.CONTRADICTION &&
    section.present &&
    section.contradiction_refs.length === 0
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_SECTION_REFS_MISSING,
        SEV.CRITICAL,
        'contradiction section missing contradiction_refs',
        section.section_id,
      ),
    );
  }

  // Scenario section must carry claim refs (which map to scenarios).
  if (
    section.section_class === L13OutputSectionClass.SCENARIO &&
    section.present &&
    section.claim_refs.length === 0
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_SECTION_REFS_MISSING,
        SEV.CRITICAL,
        'scenario section missing scenario claim_refs',
        section.section_id,
      ),
    );
  }

  // Trigger/invalidation section must carry refs.
  if (
    section.section_class === L13OutputSectionClass.TRIGGER_INVALIDATION &&
    section.present &&
    section.claim_refs.length === 0
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_SECTION_REFS_MISSING,
        SEV.CRITICAL,
        'trigger/invalidation section missing claim_refs',
        section.section_id,
      ),
    );
  }

  // §13.3.5 — Observation / inference separation.
  if (
    section.section_class === L13OutputSectionClass.OBSERVATION &&
    section.present
  ) {
    const speculation = containsAny(
      section.content,
      L13_INFERENCE_MARKER_PHRASES,
    );
    if (speculation) {
      issues.push(
        err(
          L13OutputViolationCode.L13O_OBSERVATION_INFERENCE_MIXED,
          SEV.CRITICAL,
          `observation section contains inference marker "${speculation}"`,
          section.section_id,
        ),
      );
    }
  }
  if (
    section.section_class === L13OutputSectionClass.INFERENCE &&
    section.present
  ) {
    // Inference section presents direct observation language without
    // any inference marker — flag as "presented as fact".
    const observationMarker = containsAny(
      section.content,
      L13_OBSERVATION_MARKER_PHRASES,
    );
    const inferenceMarker = containsAny(
      section.content,
      L13_INFERENCE_MARKER_PHRASES,
    );
    if (observationMarker && !inferenceMarker) {
      issues.push(
        err(
          L13OutputViolationCode.L13O_INFERENCE_PRESENTED_AS_FACT,
          SEV.CRITICAL,
          `inference section uses observation language "${observationMarker}" without an inference marker`,
          section.section_id,
        ),
      );
    }
  }

  // Forbidden semantic hits stored on the section.
  for (const hit of section.forbidden_semantic_hits) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_SECTION_INVALID,
        SEV.CRITICAL,
        `section flagged forbidden semantic hit: ${hit}`,
        section.section_id,
      ),
    );
  }

  // §13.3.16 — Run leakage scanners against the section content (only
  // factual/explanatory section classes; refusal/restriction
  // sections may legitimately quote forbidden phrases).
  const scannedClasses: L13OutputSectionClass[] = [
    L13OutputSectionClass.OBSERVATION,
    L13OutputSectionClass.INFERENCE,
    L13OutputSectionClass.UNCERTAINTY,
    L13OutputSectionClass.SCENARIO,
    L13OutputSectionClass.TRIGGER_INVALIDATION,
    L13OutputSectionClass.SCORE,
    L13OutputSectionClass.HYPOTHESIS,
    L13OutputSectionClass.SUMMARY,
    L13OutputSectionClass.HEADLINE,
  ];
  if (section.present && scannedClasses.includes(section.section_class)) {
    const hits = scanL13SemanticLeakage(section.content);
    for (const h of hits) {
      issues.push(
        err(h.code, SEV.CRITICAL, h.reason, section.section_id, {
          fragment: h.fragment,
          blocked_claim_type: h.blocked_claim_type,
        }),
      );
    }
  }

  // Section readiness sanity.
  if (
    section.section_readiness ===
      L13OutputSectionReadinessClass.SECTION_COMPLETE &&
    !section.present
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_OUTPUT_READINESS_ILLEGAL,
        SEV.ERROR,
        'section readiness=SECTION_COMPLETE but present=false',
        section.section_id,
      ),
    );
  }
  if (
    section.section_readiness ===
      L13OutputSectionReadinessClass.SECTION_REQUIRED_MISSING &&
    section.present
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_OUTPUT_READINESS_ILLEGAL,
        SEV.ERROR,
        'section readiness=SECTION_REQUIRED_MISSING but present=true',
        section.section_id,
      ),
    );
  }

  return l13OutputResult(issues);
}
