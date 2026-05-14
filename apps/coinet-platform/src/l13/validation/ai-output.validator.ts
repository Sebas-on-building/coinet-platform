/**
 * L13.3 — AI Output Validator
 *
 * §13.3.13 — Top-level output validator. Checks identity, content,
 * trace, conditional sections, observation/inference separation,
 * blocked-mode law, semantic leakage, and conditional refs.
 */

import {
  isL13HypothesisOutputClass,
  isL13ScenarioOutputClass,
  isL13ScoreOutputClass,
  L13_REQUIRED_OUTPUT_CONTENT_FIELDS,
  L13_REQUIRED_OUTPUT_IDENTITY_FIELDS,
  L13_REQUIRED_OUTPUT_TRACE_FIELDS,
  L13AIExplanationOutput,
  L13AIOutputClass,
} from '../contracts/ai-output';
import {
  L13_ALWAYS_BLOCKED_ANSWER_MODES,
} from '../contracts/explanation-restriction-profile';
import { L13OutputSectionClass } from '../contracts/output-section';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13OutputViolationCode } from './l13-output-violation-codes';
import {
  l13OutputResult,
  type L13OutputIssue,
  type L13OutputValidationResult,
} from './_l13-output-issue';
import { validateL13OutputSection } from './output-section.validator';
import { validateL13ConfidenceDisclosure } from './confidence-disclosure.validator';
import { validateL13RestrictionDisclosure } from './restriction-disclosure.validator';
import { validateL13BlockedClaims } from './blocked-claim.validator';
import { validateL13ModelMetadata } from './model-metadata.validator';
import {
  getL13UnrecordedLeakIssues,
  validateL13SemanticLeakage,
} from './semantic-leakage.validator';

const SEV = L13ViolationSeverity;

function err(
  code: L13OutputViolationCode,
  severity: L13ViolationSeverity,
  message: string,
  subject_ref?: string,
): L13OutputIssue {
  return { code, severity, message, subject_ref };
}

function missingScalar(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '')
  );
}

function missingArray(v: unknown): boolean {
  return !Array.isArray(v) || v.length === 0;
}

const IDENTITY_FIELD_CODE: Partial<
  Record<keyof L13AIExplanationOutput, L13OutputViolationCode>
> = {
  output_id: L13OutputViolationCode.L13O_OUTPUT_ID_MISSING,
  request_id: L13OutputViolationCode.L13O_REQUEST_ID_MISSING,
  input_package_id: L13OutputViolationCode.L13O_INPUT_PACKAGE_REF_MISSING,
  output_class: L13OutputViolationCode.L13O_OUTPUT_CLASS_MISSING,
  answer_mode: L13OutputViolationCode.L13O_ANSWER_MODE_MISSING,
  scope_type: L13OutputViolationCode.L13O_SCOPE_MISSING,
  scope_id: L13OutputViolationCode.L13O_SCOPE_MISSING,
  as_of: L13OutputViolationCode.L13O_AS_OF_MISSING,
  policy_version: L13OutputViolationCode.L13O_POLICY_VERSION_MISSING,
  replay_hash: L13OutputViolationCode.L13O_REPLAY_HASH_MISSING,
};

const CONTENT_FIELD_CODE: Partial<
  Record<keyof L13AIExplanationOutput, L13OutputViolationCode>
> = {
  headline: L13OutputViolationCode.L13O_HEADLINE_MISSING,
  summary: L13OutputViolationCode.L13O_SUMMARY_MISSING,
  observation_section:
    L13OutputViolationCode.L13O_OBSERVATION_SECTION_MISSING,
  inference_section: L13OutputViolationCode.L13O_INFERENCE_SECTION_MISSING,
  uncertainty_section:
    L13OutputViolationCode.L13O_UNCERTAINTY_SECTION_MISSING,
  confidence_disclosure:
    L13OutputViolationCode.L13O_CONFIDENCE_DISCLOSURE_MISSING,
  restriction_disclosure:
    L13OutputViolationCode.L13O_RESTRICTION_DISCLOSURE_MISSING,
  model_metadata: L13OutputViolationCode.L13O_MODEL_METADATA_MISSING,
};

/**
 * §13.3.13 — Top-level output validator.
 */
export function validateL13AIOutput(
  output: L13AIExplanationOutput,
): L13OutputValidationResult {
  const issues: L13OutputIssue[] = [];

  // §13.3.3.1 — Identity fields.
  for (const f of L13_REQUIRED_OUTPUT_IDENTITY_FIELDS) {
    if (missingScalar(output[f] as unknown)) {
      const code =
        IDENTITY_FIELD_CODE[f] ??
        L13OutputViolationCode.L13O_OUTPUT_ID_MISSING;
      issues.push(err(code, SEV.CRITICAL, `${f} missing`));
    }
  }

  // §13.3.3.2 — Required content fields. Scalar fields (headline,
  // summary) are missing if empty/whitespace; sub-object fields are
  // missing only when undefined/null.
  for (const f of L13_REQUIRED_OUTPUT_CONTENT_FIELDS) {
    const v = output[f] as unknown;
    const fieldMissing =
      typeof v === 'string'
        ? missingScalar(v)
        : v === undefined || v === null;
    if (fieldMissing) {
      const code =
        CONTENT_FIELD_CODE[f] ??
        L13OutputViolationCode.L13O_SECTION_INVALID;
      issues.push(err(code, SEV.CRITICAL, `${f} missing`));
    }
  }

  // §13.3.3.3 — Required trace fields.
  for (const f of L13_REQUIRED_OUTPUT_TRACE_FIELDS) {
    const v = output[f] as unknown;
    if (Array.isArray(v) ? v.length === 0 : missingScalar(v)) {
      const code =
        f === 'evidence_refs'
          ? L13OutputViolationCode.L13O_EVIDENCE_REFS_MISSING
          : f === 'lineage_refs'
            ? L13OutputViolationCode.L13O_LINEAGE_REFS_MISSING
            : f === 'replay_hash'
              ? L13OutputViolationCode.L13O_REPLAY_HASH_MISSING
              : L13OutputViolationCode.L13O_INPUT_PACKAGE_REF_MISSING;
      issues.push(err(code, SEV.CRITICAL, `${f} missing`));
    }
  }

  // Headline/summary text emptiness.
  if (
    !missingScalar(output.headline) &&
    !missingScalar(output.summary)
  ) {
    // headline length sanity (warning only).
    if (output.headline.length > 200) {
      issues.push(
        err(
          L13OutputViolationCode.L13O_SECTION_INVALID,
          SEV.WARNING,
          'headline exceeds 200 chars',
        ),
      );
    }
  }

  // §13.3.3.4 — Conditional sections.
  // (a) Scenario output classes must include scenario + trigger
  //     sections.
  if (isL13ScenarioOutputClass(output.output_class)) {
    if (
      !output.scenario_section ||
      !output.scenario_section.present
    ) {
      if (output.output_class === L13AIOutputClass.SCENARIO_EXPLANATION) {
        issues.push(
          err(
            L13OutputViolationCode.L13O_SCENARIO_SECTION_MISSING,
            SEV.CRITICAL,
            'scenario output class requires scenario_section present',
          ),
        );
      }
    }
    if (
      output.output_class === L13AIOutputClass.SCENARIO_EXPLANATION &&
      (!output.trigger_invalidation_section ||
        !output.trigger_invalidation_section.present)
    ) {
      issues.push(
        err(
          L13OutputViolationCode.L13O_TRIGGER_INVALIDATION_SECTION_MISSING,
          SEV.CRITICAL,
          'scenario explanation requires trigger_invalidation_section present',
        ),
      );
    }
    if (
      output.output_class === L13AIOutputClass.SCENARIO_EXPLANATION &&
      missingArray(output.scenario_refs)
    ) {
      issues.push(
        err(
          L13OutputViolationCode.L13O_SCENARIO_SECTION_MISSING,
          SEV.CRITICAL,
          'scenario explanation requires scenario_refs',
        ),
      );
    }
  }

  // (b) Score output classes require score_refs.
  if (
    isL13ScoreOutputClass(output.output_class) &&
    output.output_class === L13AIOutputClass.SCORE_EXPLANATION &&
    missingArray(output.score_refs)
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_SECTION_REFS_MISSING,
        SEV.CRITICAL,
        'score explanation requires score_refs',
      ),
    );
  }

  // (c) Hypothesis output classes require hypothesis_refs.
  if (
    isL13HypothesisOutputClass(output.output_class) &&
    output.output_class === L13AIOutputClass.THESIS_COMPARISON &&
    missingArray(output.hypothesis_refs)
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_SECTION_REFS_MISSING,
        SEV.CRITICAL,
        'thesis comparison requires hypothesis_refs',
      ),
    );
  }

  // (d) Contradiction explanation requires contradiction section +
  //     refs.
  if (
    output.output_class === L13AIOutputClass.CONTRADICTION_EXPLANATION
  ) {
    if (
      !output.contradiction_section ||
      !output.contradiction_section.present
    ) {
      issues.push(
        err(
          L13OutputViolationCode.L13O_CONTRADICTION_SECTION_MISSING,
          SEV.CRITICAL,
          'contradiction explanation requires contradiction_section',
        ),
      );
    }
    if (missingArray(output.contradiction_refs)) {
      issues.push(
        err(
          L13OutputViolationCode.L13O_CONTRADICTION_OMITTED,
          SEV.CRITICAL,
          'contradiction explanation requires contradiction_refs',
        ),
      );
    }
  }

  // §13.3.13 — Always-blocked answer modes must not be emitted.
  if (
    (L13_ALWAYS_BLOCKED_ANSWER_MODES as readonly string[]).includes(
      output.answer_mode,
    )
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_BLOCKED_ANSWER_MODE_VIOLATED,
        SEV.CRITICAL,
        `output emitted with always-blocked answer mode "${output.answer_mode}"`,
      ),
    );
  }

  // Recurse into each section.
  if (output.observation_section) {
    issues.push(...validateL13OutputSection(output.observation_section).issues);
  }
  if (output.inference_section) {
    issues.push(...validateL13OutputSection(output.inference_section).issues);
  }
  if (output.uncertainty_section) {
    issues.push(...validateL13OutputSection(output.uncertainty_section).issues);
  }
  if (output.contradiction_section) {
    issues.push(...validateL13OutputSection(output.contradiction_section).issues);
  }
  if (output.scenario_section) {
    issues.push(...validateL13OutputSection(output.scenario_section).issues);
  }
  if (output.trigger_invalidation_section) {
    issues.push(
      ...validateL13OutputSection(output.trigger_invalidation_section).issues,
    );
  }

  // Disclosures, claims, metadata.
  if (output.confidence_disclosure) {
    issues.push(
      ...validateL13ConfidenceDisclosure(output.confidence_disclosure).issues,
    );
  }
  if (output.restriction_disclosure) {
    issues.push(
      ...validateL13RestrictionDisclosure(output.restriction_disclosure).issues,
    );
  }
  if (output.blocked_claims && output.blocked_claims.length > 0) {
    issues.push(...validateL13BlockedClaims(output.blocked_claims).issues);
  }
  if (output.model_metadata) {
    issues.push(...validateL13ModelMetadata(output.model_metadata).issues);
  }

  // §13.3.16 — Semantic leakage in any text surface.
  issues.push(...validateL13SemanticLeakage(output).issues);

  // §13.3.8 — Unrecorded leak fragments are an audit failure.
  for (const leak of getL13UnrecordedLeakIssues(output)) {
    // De-dup: leak issues are already added above by
    // validateL13SemanticLeakage; we only flag the extra
    // BLOCKED_CLAIM_NOT_RECORDED metric if there are leaks that have
    // no corresponding blocked-claim record AND output has no blocked
    // claims at all OR there exist unrecorded fragments. Add a single
    // summary issue to keep noise low.
    if (output.blocked_claims.length === 0) {
      issues.push(
        err(
          L13OutputViolationCode.L13O_BLOCKED_CLAIM_NOT_RECORDED,
          SEV.ERROR,
          'leakage detected but no blocked_claim records attached',
          leak.subject_ref,
        ),
      );
      break;
    }
  }

  // Observation/inference separation cross-check: if observation
  // section validator flagged mix, surface a clearer top-level code.
  if (
    output.observation_section?.present &&
    output.inference_section?.present &&
    output.observation_section.content
      .toLowerCase()
      .includes(' will ') &&
    !output.inference_section.content.toLowerCase().includes(' if ')
  ) {
    issues.push(
      err(
        L13OutputViolationCode.L13O_OBSERVATION_INFERENCE_MIXED,
        SEV.CRITICAL,
        'observation section uses prediction language while inference section lacks conditional hedge',
      ),
    );
  }

  return l13OutputResult(issues);
}
