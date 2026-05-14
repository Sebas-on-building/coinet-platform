/**
 * L13.4 — Claim Extractor
 *
 * §13.4.8 — Decomposes every textual surface of the AI output into
 * typed claim candidates. The extractor does NOT decide truth: it
 * proposes claim candidates and the grounding engine later decides
 * which claims may emit.
 *
 * Illegal extractor behavior (§13.4.8.4):
 *   - silently drop a claim
 *   - merge contradictory claims into one
 *   - remove hedging or certainty words before validation
 *   - classify prediction as scenario statement without flag
 */

import type { L13AIExplanationOutput } from '../contracts/ai-output';
import { L13ClaimType } from '../contracts/grounded-claim';
import {
  L13ClaimExtractionCompletenessClass,
  type L13ClaimExtractionResult,
  type L13ExtractedClaim,
} from '../contracts/claim-extraction';
import { L13DependencyLayer } from '../contracts/l13-constitutional-types';
import { L13OutputSectionClass } from '../contracts/output-section';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.grounding.v1';

// ── Section-class → default claim type ──────────────────────────────

const SECTION_DEFAULT_TYPE: Readonly<
  Record<L13OutputSectionClass, L13ClaimType>
> = {
  [L13OutputSectionClass.HEADLINE]: L13ClaimType.OBSERVATION,
  [L13OutputSectionClass.SUMMARY]: L13ClaimType.INFERENCE,
  [L13OutputSectionClass.OBSERVATION]: L13ClaimType.OBSERVATION,
  [L13OutputSectionClass.INFERENCE]: L13ClaimType.INFERENCE,
  [L13OutputSectionClass.UNCERTAINTY]: L13ClaimType.UNCERTAINTY_STATEMENT,
  [L13OutputSectionClass.CONTRADICTION]: L13ClaimType.CONTRADICTION_STATEMENT,
  [L13OutputSectionClass.SCENARIO]: L13ClaimType.SCENARIO_STATEMENT,
  [L13OutputSectionClass.TRIGGER_INVALIDATION]:
    L13ClaimType.SCENARIO_STATEMENT,
  [L13OutputSectionClass.SCORE]: L13ClaimType.SCORE_STATEMENT,
  [L13OutputSectionClass.HYPOTHESIS]: L13ClaimType.HYPOTHESIS_STATEMENT,
  [L13OutputSectionClass.RESTRICTION]: L13ClaimType.RESTRICTION_STATEMENT,
  [L13OutputSectionClass.REFUSAL]: L13ClaimType.REFUSAL_STATEMENT,
};

// ── Semantic marker tables ──────────────────────────────────────────

const TYPE_MARKERS: ReadonlyArray<{
  readonly type: L13ClaimType;
  readonly layers: readonly L13DependencyLayer[];
  readonly patterns: readonly RegExp[];
}> = [
  {
    type: L13ClaimType.SCENARIO_STATEMENT,
    layers: [L13DependencyLayer.L12_SCENARIO],
    patterns: [
      /\bbase\s+case\b/i,
      /\bscenario\b/i,
      /\bcontinuation\s+(path|setup)\b/i,
      /\bbullish\s+(path|case)\b/i,
      /\bbearish\s+(path|case)\b/i,
      /\btrigger\b/i,
      /\binvalidation\b/i,
    ],
  },
  {
    type: L13ClaimType.SCORE_STATEMENT,
    layers: [L13DependencyLayer.L11_SCORE],
    patterns: [
      /\bopportunity\s+score\b/i,
      /\brisk\s+score\b/i,
      /\btiming\s+score\b/i,
      /\bmomentum\s+score\b/i,
      /\bleadership\s+score\b/i,
      /\bliquidity\s+score\b/i,
      /\bscore\s+is\s+(high|low|medium)\b/i,
      /\battribution\b/i,
    ],
  },
  {
    type: L13ClaimType.HYPOTHESIS_STATEMENT,
    layers: [L13DependencyLayer.L10_HYPOTHESIS],
    patterns: [
      /\bprimary\s+hypothesis\b/i,
      /\bsecondary\s+hypothesis\b/i,
      /\bthesis\b/i,
      /\bhypothesis\b/i,
    ],
  },
  {
    type: L13ClaimType.REGIME_STATEMENT,
    layers: [L13DependencyLayer.L8_REGIME],
    patterns: [
      /\bregime\b/i,
      /\btransition\s+risk\b/i,
      /\bregime\s+state\b/i,
    ],
  },
  {
    type: L13ClaimType.SEQUENCE_STATEMENT,
    layers: [L13DependencyLayer.L9_SEQUENCE],
    patterns: [
      /\bsequence\b/i,
      /\bphase\b/i,
      /\blead\s*-\s*lag\b/i,
      /\bdecay\b/i,
    ],
  },
  {
    type: L13ClaimType.CONTRADICTION_STATEMENT,
    layers: [L13DependencyLayer.L7_VALIDATION],
    patterns: [
      /\bcontradicts?\b/i,
      /\bcontradiction\b/i,
      /\boffsets?\b/i,
      /\bweakens?\b/i,
      /\btempers?\b/i,
    ],
  },
  {
    type: L13ClaimType.UNCERTAINTY_STATEMENT,
    layers: [L13DependencyLayer.L11_SCORE, L13DependencyLayer.L12_SCENARIO],
    patterns: [
      /\buncertain(ty)?\b/i,
      /\bmissing\s+data\b/i,
      /\bdrift\b/i,
      /\bconfidence\s+(cap|narrow|capped|low|reduced)\b/i,
      /\bnarrow\s+spread\b/i,
      /\bactive\s+invalidation\b/i,
    ],
  },
  {
    type: L13ClaimType.USER_GUIDANCE_STATEMENT,
    layers: [L13DependencyLayer.L12_SCENARIO],
    patterns: [
      /\bwatch\s+(whether|for|if)\b/i,
      /\bworth\s+watching\b/i,
      /\bworth\s+observing\b/i,
      /\bkeep\s+an\s+eye\b/i,
    ],
  },
  {
    type: L13ClaimType.RESTRICTION_STATEMENT,
    layers: [],
    patterns: [
      /\bnot\s+a\s+(buy|sell|hold|recommendation|trade)\b/i,
      /\brestriction\b/i,
      /\bgoverned\s+restriction\b/i,
    ],
  },
];

const INFERENCE_MARKERS: readonly RegExp[] = [
  /\bsuggests\b/i,
  /\bimplies\b/i,
  /\bmeans\s+that\b/i,
  /\bas\s+a\s+result\b/i,
  /\btherefore\b/i,
  /\bconsequently\b/i,
];

const OBSERVATION_MARKERS: readonly RegExp[] = [
  /\bengine\s+(reports|surfaces|marks|currently)/i,
  /\bcurrently\s+(shows|marks|sees)/i,
  /\bgoverned\s+surface\b/i,
  /\bis\s+the\s+(active|base)\b/i,
];

/**
 * §13.4.8 — Split a section's content into sentence-level claim
 * candidates. Sentences are kept verbatim; the extractor does NOT
 * strip hedges or certainty words.
 */
function splitSentences(text: string): readonly string[] {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, ' ').trim();
  // Sentence boundary: ., !, ?, or ; followed by whitespace or end.
  const raw = normalized.split(/(?<=[.!?;])\s+/);
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[“”"'`]/g, '')
    .trim();
}

interface DetectionResult {
  readonly type: L13ClaimType;
  readonly markers: readonly string[];
  readonly layers: readonly L13DependencyLayer[];
}

/**
 * §13.4.8.4 — Detect claim type from text + section default.
 */
function detectClaimType(
  text: string,
  defaultType: L13ClaimType,
): DetectionResult {
  const markers: string[] = [];
  let chosen: L13ClaimType = defaultType;
  const layers = new Set<L13DependencyLayer>();

  for (const entry of TYPE_MARKERS) {
    for (const p of entry.patterns) {
      const m = text.match(p);
      if (m) {
        markers.push(m[0]);
        for (const l of entry.layers) layers.add(l);
        // Stronger semantic match wins over section default.
        chosen = entry.type;
      }
    }
  }

  // Inference marker promotes default OBSERVATION → INFERENCE.
  if (chosen === L13ClaimType.OBSERVATION) {
    for (const p of INFERENCE_MARKERS) {
      const m = text.match(p);
      if (m) {
        markers.push(m[0]);
        chosen = L13ClaimType.INFERENCE;
        break;
      }
    }
  }
  for (const p of OBSERVATION_MARKERS) {
    const m = text.match(p);
    if (m) markers.push(m[0]);
  }

  return { type: chosen, markers, layers: [...layers].sort() };
}

interface SectionTextTarget {
  readonly sectionRef: string;
  readonly sectionClass: L13OutputSectionClass;
  readonly text: string;
}

function gatherTargets(
  output: L13AIExplanationOutput,
): readonly SectionTextTarget[] {
  const targets: SectionTextTarget[] = [];

  if (output.headline) {
    targets.push({
      sectionRef: `output:${output.output_id}:headline`,
      sectionClass: L13OutputSectionClass.HEADLINE,
      text: output.headline,
    });
  }
  if (output.summary) {
    targets.push({
      sectionRef: `output:${output.output_id}:summary`,
      sectionClass: L13OutputSectionClass.SUMMARY,
      text: output.summary,
    });
  }

  const sections = [
    output.observation_section,
    output.inference_section,
    output.uncertainty_section,
    output.contradiction_section,
    output.scenario_section,
    output.trigger_invalidation_section,
  ];
  for (const s of sections) {
    if (s && s.present && s.content) {
      targets.push({
        sectionRef: s.section_id,
        sectionClass: s.section_class,
        text: s.content,
      });
    }
  }
  return targets;
}

/**
 * §13.4.8 — Main extractor.
 */
export function extractL13Claims(
  output: L13AIExplanationOutput,
): L13ClaimExtractionResult {
  const claims: L13ExtractedClaim[] = [];
  const warnings: string[] = [];
  const targets = gatherTargets(output);

  let claimIndex = 0;
  for (const t of targets) {
    const sentences = splitSentences(t.text);
    if (sentences.length === 0) {
      warnings.push(`empty content for section ${t.sectionRef}`);
      continue;
    }
    const defaultType = SECTION_DEFAULT_TYPE[t.sectionClass];
    for (const s of sentences) {
      claimIndex += 1;
      const det = detectClaimType(s, defaultType);
      const claimId = `l13.claim.${output.output_id}.${claimIndex}.${fnv1a(s + '|' + t.sectionRef)}`;
      const requiresEvidence =
        det.type !== L13ClaimType.UNCERTAINTY_STATEMENT &&
        det.type !== L13ClaimType.RESTRICTION_STATEMENT &&
        det.type !== L13ClaimType.REFUSAL_STATEMENT;
      const requiresContradictionCheck =
        det.type === L13ClaimType.OBSERVATION ||
        det.type === L13ClaimType.INFERENCE ||
        det.type === L13ClaimType.SCENARIO_STATEMENT ||
        det.type === L13ClaimType.SCORE_STATEMENT ||
        det.type === L13ClaimType.HYPOTHESIS_STATEMENT;
      const requiresUncertaintyCheck =
        det.type === L13ClaimType.SCENARIO_STATEMENT ||
        det.type === L13ClaimType.HYPOTHESIS_STATEMENT ||
        det.type === L13ClaimType.SCORE_STATEMENT;

      claims.push({
        extracted_claim_id: claimId,
        output_id: output.output_id,
        section_ref: t.sectionRef,
        raw_text: s,
        normalized_text: normalize(s),
        detected_claim_type: det.type,
        detected_semantic_markers: det.markers,
        candidate_source_layers: det.layers,
        requires_evidence: requiresEvidence,
        requires_contradiction_check: requiresContradictionCheck,
        requires_uncertainty_check: requiresUncertaintyCheck,
        policy_version: POLICY_V,
      });
    }
  }

  const completeness =
    claims.length === 0
      ? L13ClaimExtractionCompletenessClass.BLOCKED_EXTRACTION_FAILURE
      : warnings.length === 0
        ? L13ClaimExtractionCompletenessClass.COMPLETE_EXTRACTION
        : L13ClaimExtractionCompletenessClass.COMPLETE_WITH_WARNINGS;

  const replayHash = fnv1a(
    [
      'L13_CLAIM_EXTRACTION',
      output.output_id,
      claims
        .map(c =>
          [
            c.extracted_claim_id,
            c.section_ref,
            c.detected_claim_type,
            c.normalized_text,
          ].join('::'),
        )
        .join('||'),
      completeness,
      POLICY_V,
    ].join('|'),
  );

  return {
    extraction_result_id: `l13.extraction.${replayHash}`,
    output_id: output.output_id,
    extracted_claims: claims,
    extraction_warnings: warnings,
    extraction_completeness_class: completeness,
    lineage_refs: [...output.lineage_refs].sort(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

export const __l13_extractor_internals = {
  splitSentences,
  detectClaimType,
  normalize,
};
