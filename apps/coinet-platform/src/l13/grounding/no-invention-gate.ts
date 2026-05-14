/**
 * L13.4 — No-Invention Gate
 *
 * §13.4.6 / §13.4.12 — Inspects every emitted claim's text against
 * the input package's governed surfaces to detect invented
 * information. Twelve invention families are recognized; financial
 * instruction invention is unconditionally blocking.
 */

import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13ExtractedClaim } from '../contracts/claim-extraction';
import {
  isL13BlockingInvention,
  L13InventionClass,
  type L13DetectedInvention,
  type L13NoInventionGateResult,
} from '../contracts/no-invention';
import { fnv1a } from '../context/_fnv1a';
import { buildL13PackageRefIndex } from './_package-refs';

const POLICY_V = 'l13.grounding.v1';

// ── Detection patterns ──────────────────────────────────────────────

const WHALE_PATTERN = /\b(whale|whales|smart\s+money|insider|insiders)\b/i;
const ACCUMULATION_PATTERN =
  /\b(accumulat\w+|distribution|hoarding|loading\s+up)\b/i;
const SCORE_DRIVER_PATTERNS: readonly RegExp[] = [
  /\b(opportunity|risk|timing|momentum|leadership|liquidity)\s+(is|score\s+is|score)\s+(high|low|elevated)\s+because\b/i,
  /\bbecause\s+(whales|smart\s+money|insiders)\s+(are|is)\b/i,
];
const TRIGGER_PATTERNS: readonly RegExp[] = [
  /\bthe\s+next\s+trigger\s+is\b/i,
  /\btrigger\s+(is|would\s+be)\s+a\s+(breakout|breakdown|move|push|tap)\b/i,
];
const INVALIDATION_PATTERNS: readonly RegExp[] = [
  /\b(setup|scenario|case)\s+invalidates?\s+(only\s+)?if\b/i,
  /\binvalidation\s+(is|would\s+be)\s+a\s+(loss|break|tap)\s+of\b/i,
];
const CONTRADICTION_ABSENCE_PATTERNS: readonly RegExp[] = [
  /\bno\s+(major\s+)?contradictions?\b/i,
  /\bthere\s+(is|are)\s+no\s+contradictions?\b/i,
  /\beverything\s+lines\s+up\b/i,
];
const CONFIDENCE_PATTERNS: readonly RegExp[] = [
  /\bconfidence\s+is\s+(high|very\s+high|strong)\b/i,
  /\bhigh\s+confidence\s+(setup|path|scenario)\b/i,
  /\bfull\s+confidence\b/i,
];
const REGIME_PATTERNS: readonly RegExp[] = [
  /\bregime\s+is\s+([a-z\s-]+)\b/i,
  /\bcurrent\s+regime\s+is\b/i,
];
const SEQUENCE_PATTERNS: readonly RegExp[] = [
  /\b(early|mid|late)\s+(stage|phase|cycle)\b/i,
  /\bsequence\s+is\s+([a-z\s-]+)\b/i,
];
const DATA_COMPLETENESS_PATTERNS: readonly RegExp[] = [
  /\bdata\s+(is|looks)\s+complete\b/i,
  /\bnothing\s+is\s+missing\b/i,
  /\bclean\s+visibility\b/i,
  /\bfull\s+data\s+coverage\b/i,
];
const FINANCIAL_INSTRUCTION_PATTERNS: readonly RegExp[] = [
  /\byou\s+should\s+(long|short|buy|sell|avoid|hold)\b/i,
  /\bgo\s+(long|short)\b/i,
  /\bi\s+(would|recommend)\s+(long|short|buy|sell|avoid)\b/i,
  /\b(open|close|enter|exit)\s+(a\s+)?(long|short)\b/i,
];

interface PatternEntry {
  readonly invention: L13InventionClass;
  readonly description: string;
  readonly trigger: (text: string) => RegExpMatchArray | null;
  readonly support: (
    text: string,
    pkg: L13AIInputPackage,
    index: ReturnType<typeof buildL13PackageRefIndex>,
  ) => boolean;
}

function regexAny(text: string, patterns: readonly RegExp[]): RegExpMatchArray | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m;
  }
  return null;
}

const INVENTION_DETECTORS: readonly PatternEntry[] = [
  {
    invention: L13InventionClass.INVENTED_FINANCIAL_INSTRUCTION,
    description: 'financial instruction',
    trigger: t => regexAny(t, FINANCIAL_INSTRUCTION_PATTERNS),
    support: () => false,
  },
  {
    invention: L13InventionClass.INVENTED_EVIDENCE,
    description: 'whale / smart-money / accumulation claim',
    trigger: t => {
      if (WHALE_PATTERN.test(t) || ACCUMULATION_PATTERN.test(t)) {
        return t.match(WHALE_PATTERN) ?? t.match(ACCUMULATION_PATTERN);
      }
      return null;
    },
    support: (_t, pkg, _index) => {
      // Whale / accumulation / smart-money claims require an
      // EXPLICIT lower-layer surface that names this kind of
      // activity. The package must contain at least one evidence
      // digest, hypothesis name, attribution code, or score
      // family that textually references whale/flow/accumulation.
      const haystack: string[] = [];
      for (const d of pkg.strongest_positive_evidence ?? []) {
        haystack.push((d as { summary_text?: string }).summary_text ?? '');
      }
      for (const d of pkg.strongest_contradictions ?? []) {
        haystack.push((d as { summary_text?: string }).summary_text ?? '');
      }
      if (pkg.hypothesis_summary) {
        haystack.push(pkg.hypothesis_summary.primary_hypothesis_name ?? '');
        if (pkg.hypothesis_summary.secondary_hypothesis_name)
          haystack.push(pkg.hypothesis_summary.secondary_hypothesis_name);
      }
      for (const s of pkg.score_summary?.score_band_summaries ?? []) {
        haystack.push((s as { score_family?: string }).score_family ?? '');
      }
      const blob = haystack.join(' ').toLowerCase();
      return /\b(whale|whales|smart\s+money|insider|insiders|accumulation|distribution|hoarding)\b/i.test(
        blob,
      );
    },
  },
  {
    invention: L13InventionClass.INVENTED_SCORE_DRIVER,
    description: 'score driver attribution',
    trigger: t => regexAny(t, SCORE_DRIVER_PATTERNS),
    support: (_t, _pkg, index) =>
      index.score_refs.size > 0,
  },
  {
    invention: L13InventionClass.INVENTED_SCENARIO_TRIGGER,
    description: 'scenario trigger',
    trigger: t => regexAny(t, TRIGGER_PATTERNS),
    support: (_t, _pkg, index) =>
      index.trigger_refs.size > 0,
  },
  {
    invention: L13InventionClass.INVENTED_SCENARIO_INVALIDATION,
    description: 'scenario invalidation',
    trigger: t => regexAny(t, INVALIDATION_PATTERNS),
    support: (_t, _pkg, index) =>
      index.invalidation_refs.size > 0,
  },
  {
    invention: L13InventionClass.INVENTED_CONTRADICTION_ABSENCE,
    description: 'contradiction absence',
    trigger: t => regexAny(t, CONTRADICTION_ABSENCE_PATTERNS),
    support: (_t, pkg) => {
      const cs = pkg.contradiction_summary;
      // Claim is supported only when the contradiction summary
      // exists AND reports zero active contradictions.
      return (
        !!cs &&
        cs.active_contradiction_refs.length === 0 &&
        cs.contradiction_pressure_score === 0
      );
    },
  },
  {
    invention: L13InventionClass.INVENTED_CONFIDENCE,
    description: 'high confidence',
    trigger: t => regexAny(t, CONFIDENCE_PATTERNS),
    support: (_t, pkg) => {
      const cb = pkg.confidence_breakdown;
      if (!cb) return false;
      // Supported only if confidence band is HIGH and no caps.
      return (
        String(cb.overall_explanation_confidence_band).includes('HIGH') &&
        cb.confidence_cap_refs.length === 0
      );
    },
  },
  {
    invention: L13InventionClass.INVENTED_REGIME_STATE,
    description: 'regime state',
    trigger: t => regexAny(t, REGIME_PATTERNS),
    support: (_t, _pkg, index) =>
      index.regime_refs.size > 0,
  },
  {
    invention: L13InventionClass.INVENTED_SEQUENCE_STATE,
    description: 'sequence state',
    trigger: t => regexAny(t, SEQUENCE_PATTERNS),
    support: (_t, _pkg, index) =>
      index.sequence_refs.size > 0,
  },
  {
    invention: L13InventionClass.INVENTED_DATA_COMPLETENESS,
    description: 'data completeness',
    trigger: t => regexAny(t, DATA_COMPLETENESS_PATTERNS),
    support: (_t, pkg) => {
      // Supported only if missing-data and drift disclosures are
      // empty AND uncertainty profile flags say no missing data.
      const md = pkg.missing_data_disclosures ?? [];
      const dd = pkg.drift_disclosures ?? [];
      const up = pkg.uncertainty_profile;
      const noMissing = !up?.material_missing_data_present;
      const noDrift = !up?.material_drift_present;
      return md.length === 0 && dd.length === 0 && noMissing && noDrift;
    },
  },
];

/**
 * §13.4.12 — Scan a single claim against the invention detectors.
 */
function detectClaimInventions(
  claim: L13ExtractedClaim,
  output: L13AIExplanationOutput,
  pkg: L13AIInputPackage,
  index: ReturnType<typeof buildL13PackageRefIndex>,
): readonly L13DetectedInvention[] {
  const detected: L13DetectedInvention[] = [];
  for (const detector of INVENTION_DETECTORS) {
    const t = detector.trigger(claim.raw_text);
    if (!t) continue;
    const supported =
      detector.invention === L13InventionClass.INVENTED_FINANCIAL_INSTRUCTION
        ? false
        : detector.support(claim.raw_text, pkg, index);
    if (supported) continue;
    const id = `l13.invention.${fnv1a(
      [
        output.output_id,
        claim.extracted_claim_id,
        detector.invention,
        t[0],
      ].join('|'),
    )}`;
    detected.push({
      detected_invention_id: id,
      output_id: output.output_id,
      claim_ref: claim.extracted_claim_id,
      invention_class: detector.invention,
      evidence_text: t[0],
      missing_support_codes: [detector.description],
      blocks_output: isL13BlockingInvention(detector.invention),
      requires_rewrite:
        detector.invention !==
        L13InventionClass.INVENTED_FINANCIAL_INSTRUCTION,
      lineage_refs: ['l13.lineage.no-invention-gate'],
      policy_version: POLICY_V,
    });
  }
  return detected;
}

/**
 * §13.4.12.3 — Run the no-invention gate.
 */
export function runL13NoInventionGate(
  output: L13AIExplanationOutput,
  pkg: L13AIInputPackage,
  claims: readonly L13ExtractedClaim[],
): L13NoInventionGateResult {
  const index = buildL13PackageRefIndex(pkg);
  const all: L13DetectedInvention[] = [];
  for (const c of claims) {
    for (const d of detectClaimInventions(c, output, pkg, index)) all.push(d);
  }
  const blocking = all.filter(d => d.blocks_output);
  const rewriteOnly = all.filter(d => !d.blocks_output && d.requires_rewrite);
  const gatePassed = all.length === 0;

  const replayHash = fnv1a(
    [
      'L13_NO_INVENTION_GATE',
      output.output_id,
      all
        .map(d =>
          [
            d.detected_invention_id,
            d.invention_class,
            d.evidence_text,
            String(d.blocks_output),
          ].join('::'),
        )
        .join('||'),
      String(gatePassed),
      POLICY_V,
    ].join('|'),
  );

  return {
    gate_result_id: `l13.invention_gate.${replayHash}`,
    output_id: output.output_id,
    detected_inventions: all,
    gate_passed: gatePassed,
    blocking_invention_refs: blocking
      .map(d => d.detected_invention_id)
      .sort(),
    rewrite_required_refs: rewriteOnly
      .map(d => d.detected_invention_id)
      .sort(),
    evidence_refs: [...output.evidence_refs].sort(),
    lineage_refs: ['l13.lineage.no-invention-gate'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
