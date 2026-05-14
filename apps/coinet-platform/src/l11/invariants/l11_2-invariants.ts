/**
 * L11.2 — Score Doctrine Invariants (§11.2.20)
 *
 * Eight machine-enforced invariants that prove the score doctrine,
 * score families, and score object model are intact.
 *
 *   INV-11.2-A  production-family meaning law
 *   INV-11.2-B  direction law
 *   INV-11.2-C  object completeness law
 *   INV-11.2-D  reserved-family embargo law
 *   INV-11.2-E  band/direction consistency law
 *   INV-11.2-F  non-judgment law
 *   INV-11.2-G  replay identity law
 *   INV-11.2-H  disclosure law
 */

import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
  L11_RESERVED_SCORE_FAMILIES,
} from '../contracts/score-family';
import {
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
} from '../contracts/score-direction';
import {
  L11ScoreProductionStatus,
} from '../contracts/score-production-status';
import {
  L11ScoreFamilyDefinition,
  L11_SCORE_FAMILY_DEFINITIONS,
  getL11ScoreFamilyDefinition,
} from '../contracts/score-family-catalogue';
import {
  L11ScoreFamilyMeaningClaim,
} from '../contracts/score-meaning-claim';
import {
  L11ScoreOutput,
  L11ScoreReplayMaterial,
  canonicalScoreOutputReplayHash,
  extractL11ReplayMaterial,
} from '../contracts/score-output';
import {
  L11ScoreBandPolicy,
  resolveL11ScoreBand,
  checkL11BandThresholdIntegrity,
  L11_DEFAULT_BAND_THRESHOLDS,
} from '../contracts/score-band-policy';

import {
  L11_PRODUCTION_MEANING_CLAIMS,
} from '../registry/score-meaning-claim.registry';
import {
  L11_BAND_POLICIES,
  getL11BandPolicyForFamily,
} from '../registry/score-band-policy.registry';

import {
  validateL11ScoreFamilyDefinition,
} from '../validation/score-family.validator';
import {
  validateL11ScoreFamilyMeaningClaim,
} from '../validation/score-meaning-claim.validator';
import {
  validateL11ScoreOutput,
} from '../validation/score-output.validator';
import {
  scanL11FamilyInterpretation,
} from '../validation/score-family-interpretation.validator';
import {
  classifyL11ScoreObjectReadiness,
} from '../validation/score-object-readiness.validator';
import {
  L11ScoreObjectReadinessClass,
} from '../contracts/score-object-readiness';
import {
  L11ScoreDoctrineViolationCode,
} from '../validation/l11-score-doctrine-violation-codes';

export interface L11_2InvariantResult {
  readonly invariant_id: string;
  readonly title: string;
  readonly ok: boolean;
  readonly violations: readonly string[];
}

export interface L11_2InvariantSuiteResult {
  readonly ok: boolean;
  readonly results: readonly L11_2InvariantResult[];
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.2-A — production-family meaning law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_2_A_ProductionMeaning(
  defs: readonly L11ScoreFamilyDefinition[] = L11_SCORE_FAMILY_DEFINITIONS,
  claims: readonly L11ScoreFamilyMeaningClaim[] = L11_PRODUCTION_MEANING_CLAIMS,
): L11_2InvariantResult {
  const violations: string[] = [];

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    const def = defs.find(d => d.score_family === f);
    if (!def) {
      violations.push(`production family ${f} missing from catalogue`);
      continue;
    }
    if (def.production_status !== L11ScoreProductionStatus.PRODUCTION_ENABLED) {
      violations.push(`family ${f} should be PRODUCTION_ENABLED, got ${def.production_status}`);
    }
    if (!def.meaning_claim_ref) {
      violations.push(`family ${f} missing meaning_claim_ref`);
    }
    const familyResult = validateL11ScoreFamilyDefinition(def);
    for (const i of familyResult.issues) {
      violations.push(`[family ${f}] ${i.code}: ${i.message}`);
    }

    const claim = claims.find(c => c.score_family === f);
    if (!claim) {
      violations.push(`production family ${f} missing meaning claim`);
      continue;
    }
    const claimResult = validateL11ScoreFamilyMeaningClaim(claim);
    for (const i of claimResult.issues) {
      violations.push(`[claim ${claim.meaning_claim_id}] ${i.code}: ${i.message}`);
    }
  }

  return {
    invariant_id: 'INV-11.2-A',
    title: 'production-family meaning law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.2-B — direction law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_2_B_Direction(
  defs: readonly L11ScoreFamilyDefinition[] = L11_SCORE_FAMILY_DEFINITIONS,
  claims: readonly L11ScoreFamilyMeaningClaim[] = L11_PRODUCTION_MEANING_CLAIMS,
): L11_2InvariantResult {
  const violations: string[] = [];

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    const def = defs.find(d => d.score_family === f);
    const expected = L11_REQUIRED_DIRECTION_BY_FAMILY[f];
    if (!def) {
      violations.push(`production family ${f} missing from catalogue`);
      continue;
    }
    if (!def.direction_class) {
      violations.push(`family ${f} missing direction_class`);
    } else if (def.direction_class !== expected) {
      violations.push(`family ${f} direction ${def.direction_class} != expected ${expected}`);
    }
    const claim = claims.find(c => c.score_family === f);
    if (claim && claim.direction_class !== expected) {
      violations.push(`claim for ${f} direction ${claim.direction_class} != expected ${expected}`);
    }
  }

  return {
    invariant_id: 'INV-11.2-B',
    title: 'direction law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.2-C — object completeness law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_2_C_ObjectCompleteness(
  scores: readonly L11ScoreOutput[],
): L11_2InvariantResult {
  const violations: string[] = [];
  for (const s of scores) {
    const r = classifyL11ScoreObjectReadiness({ score: s });
    if (r.readiness_class !== L11ScoreObjectReadinessClass.OBJECT_COMPLETE) {
      violations.push(
        `score ${s.score_id} not OBJECT_COMPLETE (readiness=${r.readiness_class}; ${r.issues.length} issue(s))`,
      );
    }
  }
  return {
    invariant_id: 'INV-11.2-C',
    title: 'object completeness law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.2-D — reserved-family embargo law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_2_D_ReservedEmbargo(
  defs: readonly L11ScoreFamilyDefinition[] = L11_SCORE_FAMILY_DEFINITIONS,
): L11_2InvariantResult {
  const violations: string[] = [];

  for (const f of L11_RESERVED_SCORE_FAMILIES) {
    const def = defs.find(d => d.score_family === f);
    if (!def) {
      violations.push(`reserved family ${f} missing from catalogue`);
      continue;
    }
    if (def.production_status === L11ScoreProductionStatus.PRODUCTION_ENABLED) {
      violations.push(`reserved family ${f} marked PRODUCTION_ENABLED`);
    }
    if (def.required_lower_layer_surfaces.length > 0) {
      violations.push(`reserved family ${f} declares lower-layer surfaces`);
    }
    if (def.required_output_surfaces.length > 0) {
      violations.push(`reserved family ${f} declares output surfaces`);
    }
  }

  return {
    invariant_id: 'INV-11.2-D',
    title: 'reserved-family embargo law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.2-E — band/direction consistency law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_2_E_BandDirection(
  policies: readonly L11ScoreBandPolicy[] = L11_BAND_POLICIES,
  scores: readonly L11ScoreOutput[] = [],
): L11_2InvariantResult {
  const violations: string[] = [];

  for (const p of policies) {
    const integrity = checkL11BandThresholdIntegrity(p.thresholds);
    if (!integrity.ok) {
      violations.push(`band policy ${p.band_policy_id} failed integrity: ${integrity.reason}`);
    }
    const expectedDirection = L11_REQUIRED_DIRECTION_BY_FAMILY[p.score_family];
    if (p.direction_class !== expectedDirection) {
      violations.push(
        `band policy ${p.band_policy_id} direction ${p.direction_class} != family direction ${expectedDirection}`,
      );
    }
  }

  for (const s of scores) {
    const policy = getL11BandPolicyForFamily(s.score_family);
    const expectedBand = resolveL11ScoreBand(
      s.final_score,
      policy ? policy.thresholds : L11_DEFAULT_BAND_THRESHOLDS,
    );
    if (!expectedBand) {
      violations.push(`score ${s.score_id} final_score ${s.final_score} unresolvable`);
    } else if (expectedBand !== s.score_band) {
      violations.push(`score ${s.score_id} band ${s.score_band} != expected ${expectedBand}`);
    }
    const expectedDirection = L11_REQUIRED_DIRECTION_BY_FAMILY[s.score_family];
    if (s.direction_class !== expectedDirection) {
      violations.push(
        `score ${s.score_id} direction ${s.direction_class} != family direction ${expectedDirection}`,
      );
    }
  }

  return {
    invariant_id: 'INV-11.2-E',
    title: 'band/direction consistency law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.2-F — non-judgment law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_2_F_NonJudgment(
  defs: readonly L11ScoreFamilyDefinition[] = L11_SCORE_FAMILY_DEFINITIONS,
  claims: readonly L11ScoreFamilyMeaningClaim[] = L11_PRODUCTION_MEANING_CLAIMS,
  extraScores: readonly L11ScoreOutput[] = [],
): L11_2InvariantResult {
  const violations: string[] = [];

  for (const def of defs) {
    if (def.production_status !== L11ScoreProductionStatus.PRODUCTION_ENABLED) continue;
    const r = scanL11FamilyInterpretation({
      score_family: def.score_family,
      texts: [
        def.score_name,
        ...def.legal_interpretations,
      ],
      subject_ref: `family-def:${def.score_family}`,
    });
    for (const i of r.issues) {
      violations.push(`[family-def ${def.score_family}] ${i.code}: ${i.message}`);
    }
  }

  for (const claim of claims) {
    const r = scanL11FamilyInterpretation({
      score_family: claim.score_family,
      texts: [
        claim.score_name,
        claim.meaning_claim,
        claim.high_value_means,
        claim.low_value_means,
        ...claim.legal_interpretations,
      ],
      subject_ref: `claim:${claim.meaning_claim_id}`,
    });
    for (const i of r.issues) {
      violations.push(`[claim ${claim.meaning_claim_id}] ${i.code}: ${i.message}`);
    }
  }

  for (const s of extraScores) {
    const r = scanL11FamilyInterpretation({
      score_family: s.score_family,
      texts: [s.score_name],
      subject_ref: `score:${s.score_id}`,
    });
    for (const i of r.issues) {
      violations.push(`[score ${s.score_id}] ${i.code}: ${i.message}`);
    }
  }

  return {
    invariant_id: 'INV-11.2-F',
    title: 'non-judgment law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.2-G — replay identity law
// ─────────────────────────────────────────────────────────────────────

export function checkInvariantL11_2_G_ReplayIdentity(
  scores: readonly L11ScoreOutput[],
): L11_2InvariantResult {
  const violations: string[] = [];
  for (const s of scores) {
    if (!s.replay_hash) {
      violations.push(`score ${s.score_id} missing replay_hash`);
      continue;
    }
    const material = extractL11ReplayMaterial(s);
    const expected = canonicalScoreOutputReplayHash(material);
    if (expected !== s.replay_hash) {
      violations.push(
        `score ${s.score_id} replay_hash ${s.replay_hash} != recomputed ${expected}`,
      );
    }
    const recomputed = canonicalScoreOutputReplayHash(material);
    if (recomputed !== expected) {
      violations.push(`score ${s.score_id} replay hash not deterministic`);
    }

    // Mutated material must change the hash.
    const mutated: L11ScoreReplayMaterial = {
      ...material,
      final_score: clampDifferent(material.final_score),
    };
    const mutatedHash = canonicalScoreOutputReplayHash(mutated);
    if (mutatedHash === expected) {
      violations.push(`score ${s.score_id} replay hash invariant under final_score change`);
    }
  }
  return {
    invariant_id: 'INV-11.2-G',
    title: 'replay identity law',
    ok: violations.length === 0,
    violations,
  };
}

function clampDifferent(v: number): number {
  if (!Number.isFinite(v)) return 50;
  const target = v >= 50 ? Math.max(0, v - 1) : Math.min(100, v + 1);
  return target === v ? (v + 5) % 100 : target;
}

// ─────────────────────────────────────────────────────────────────────
// INV-11.2-H — disclosure law
// ─────────────────────────────────────────────────────────────────────

const DISCLOSURE_RELATED_CODES = new Set<L11ScoreDoctrineViolationCode>([
  L11ScoreDoctrineViolationCode.L11D_REQUIRED_DISCLOSURE_MISSING,
  L11ScoreDoctrineViolationCode.L11D_REGIME_MODIFIER_MISSING,
  L11ScoreDoctrineViolationCode.L11D_SEQUENCE_MODIFIER_MISSING,
  L11ScoreDoctrineViolationCode.L11D_HYPOTHESIS_MODIFIER_MISSING,
  L11ScoreDoctrineViolationCode.L11D_MISSING_DATA_PROFILE_MISSING,
  L11ScoreDoctrineViolationCode.L11D_ATTRIBUTION_MISSING,
  L11ScoreDoctrineViolationCode.L11D_CALIBRATION_TARGET_MISSING,
  L11ScoreDoctrineViolationCode.L11D_RESTRICTION_PROFILE_MISSING,
  L11ScoreDoctrineViolationCode.L11D_EVIDENCE_PACK_MISSING,
]);

export function checkInvariantL11_2_H_Disclosure(
  defs: readonly L11ScoreFamilyDefinition[] = L11_SCORE_FAMILY_DEFINITIONS,
  scores: readonly L11ScoreOutput[] = [],
): L11_2InvariantResult {
  const violations: string[] = [];

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    const def = defs.find(d => d.score_family === f);
    if (!def) {
      violations.push(`production family ${f} missing from catalogue`);
      continue;
    }
    if (def.required_disclosure_requirements.length === 0) {
      violations.push(`production family ${f} declares no required disclosures`);
    }
  }

  for (const s of scores) {
    const r = validateL11ScoreOutput(s);
    for (const i of r.issues) {
      if (DISCLOSURE_RELATED_CODES.has(i.code)) {
        violations.push(`[score ${s.score_id}] ${i.code}: ${i.message}`);
      }
    }
  }

  return {
    invariant_id: 'INV-11.2-H',
    title: 'disclosure law',
    ok: violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Suite runner
// ─────────────────────────────────────────────────────────────────────

export interface L11_2InvariantInputs {
  readonly defs?: readonly L11ScoreFamilyDefinition[];
  readonly claims?: readonly L11ScoreFamilyMeaningClaim[];
  readonly band_policies?: readonly L11ScoreBandPolicy[];
  readonly scores?: readonly L11ScoreOutput[];
}

export function runL11_2InvariantSuite(
  inputs: L11_2InvariantInputs = {},
): L11_2InvariantSuiteResult {
  const defs = inputs.defs ?? L11_SCORE_FAMILY_DEFINITIONS;
  const claims = inputs.claims ?? L11_PRODUCTION_MEANING_CLAIMS;
  const bandPolicies = inputs.band_policies ?? L11_BAND_POLICIES;
  const scores = inputs.scores ?? [];

  const results: L11_2InvariantResult[] = [
    checkInvariantL11_2_A_ProductionMeaning(defs, claims),
    checkInvariantL11_2_B_Direction(defs, claims),
    checkInvariantL11_2_C_ObjectCompleteness(scores),
    checkInvariantL11_2_D_ReservedEmbargo(defs),
    checkInvariantL11_2_E_BandDirection(bandPolicies, scores),
    checkInvariantL11_2_F_NonJudgment(defs, claims, scores),
    checkInvariantL11_2_G_ReplayIdentity(scores),
    checkInvariantL11_2_H_Disclosure(defs, scores),
  ];

  return { ok: results.every(r => r.ok), results };
}

// ── Convenience accessors used by tests ──

export function l11_2InvariantTitleById(id: string): string | null {
  switch (id) {
    case 'INV-11.2-A': return 'production-family meaning law';
    case 'INV-11.2-B': return 'direction law';
    case 'INV-11.2-C': return 'object completeness law';
    case 'INV-11.2-D': return 'reserved-family embargo law';
    case 'INV-11.2-E': return 'band/direction consistency law';
    case 'INV-11.2-F': return 'non-judgment law';
    case 'INV-11.2-G': return 'replay identity law';
    case 'INV-11.2-H': return 'disclosure law';
    default: return null;
  }
}

export function getRequiredDirectionForFamily(
  f: L11ScoreFamily,
): L11ScoreFamilyDirectionClass {
  return L11_REQUIRED_DIRECTION_BY_FAMILY[f];
}

export function getDefinitionForFamily(
  f: L11ScoreFamily,
): L11ScoreFamilyDefinition | undefined {
  return getL11ScoreFamilyDefinition(f);
}
