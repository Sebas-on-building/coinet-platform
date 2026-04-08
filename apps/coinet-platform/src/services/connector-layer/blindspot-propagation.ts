/**
 * L2.7 — Blind-Spot Propagation
 *
 * Takes compiled blind spots and converts them into actual downstream
 * restrictions. If propagation is weak, L2.7 is fake. Every fallback,
 * route weakness, freshness loss, or missing authority must compile
 * into real downstream behavior changes.
 */

import type { BlindSpotRecord, BlindSpotSummary } from './blindspot-engine';
import type { BlindSpotClaimConstraint } from './fallback-semantics';

// ═══════════════════════════════════════════════════════════════════════════════
// PROPAGATION EFFECT
// ═══════════════════════════════════════════════════════════════════════════════

export type PropagationTarget =
  | 'CONFIDENCE_BANDS'
  | 'CONTRADICTION_ENGINE'
  | 'SCENARIO_ENGINE'
  | 'JUDGMENT_LAYER'
  | 'CHAT_SYSTEM'
  | 'UI_BADGES'
  | 'ALERTS'
  | 'AUDIT_LOG';

export type PropagationEffectType =
  | 'CONFIDENCE_HAIRCUT'
  | 'CLAIM_BLOCK'
  | 'DISPLAY_CAVEAT'
  | 'SCENARIO_CONFIRMATION_BLOCK'
  | 'IDENTITY_ASSERTION_BLOCK'
  | 'SAFETY_VERDICT_BLOCK'
  | 'TRACEABILITY_WARNING'
  | 'NO_EFFECT';

export interface BlindSpotPropagationEffect {
  blindSpotId: string;
  target: PropagationTarget;
  effectType: PropagationEffectType;
  effectPayload: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE PACK AUGMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlindSpotLineageAugmentation {
  activeBlindSpotIds: string[];
  blockedClaimFamilies: string[];
  constrainedClaimFamilies: string[];
  disclosureSummaries: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPAGATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PropagationResult {
  effects: BlindSpotPropagationEffect[];
  lineageAugmentation: BlindSpotLineageAugmentation;
  confidenceHaircut: number;
  totalEffectCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPAGATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function propagateBlindSpots(
  blindSpots: BlindSpotRecord[],
  summary: BlindSpotSummary,
): PropagationResult {
  const effects: BlindSpotPropagationEffect[] = [];

  for (const bs of blindSpots) {
    effects.push(...propagateOne(bs));
  }

  const haircut = computeConfidenceHaircut(blindSpots, summary);
  if (haircut > 0) {
    effects.push({
      blindSpotId: '__aggregate__',
      target: 'CONFIDENCE_BANDS',
      effectType: 'CONFIDENCE_HAIRCUT',
      effectPayload: { haircut, reason: `${summary.totalBlindSpots} blind spot(s)` },
    });
  }

  const augmentation = buildLineageAugmentation(blindSpots, summary);

  return {
    effects,
    lineageAugmentation: augmentation,
    confidenceHaircut: haircut,
    totalEffectCount: effects.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

function propagateOne(bs: BlindSpotRecord): BlindSpotPropagationEffect[] {
  const out: BlindSpotPropagationEffect[] = [];

  out.push({
    blindSpotId: bs.blindSpotId,
    target: 'AUDIT_LOG',
    effectType: bs.claimConstraints.length > 0 ? 'TRACEABILITY_WARNING' : 'NO_EFFECT',
    effectPayload: {
      type: bs.type,
      severity: bs.severity,
      cause: bs.cause,
      disclosure: bs.disclosureText,
    },
  });

  if (bs.disclosureRequired) {
    out.push({
      blindSpotId: bs.blindSpotId,
      target: 'UI_BADGES',
      effectType: 'DISPLAY_CAVEAT',
      effectPayload: {
        disclosure: bs.disclosureText,
        severity: bs.severity,
        fieldFamily: bs.fieldFamily,
      },
    });

    out.push({
      blindSpotId: bs.blindSpotId,
      target: 'CHAT_SYSTEM',
      effectType: 'DISPLAY_CAVEAT',
      effectPayload: {
        disclosure: bs.disclosureText,
        type: bs.type,
      },
    });
  }

  for (const constraint of bs.claimConstraints) {
    const targets = constraintToTargets(constraint);
    for (const t of targets) {
      out.push({
        blindSpotId: bs.blindSpotId,
        target: t.target,
        effectType: t.effectType,
        effectPayload: {
          constraint,
          fieldFamily: bs.fieldFamily,
          sourceClass: bs.sourceClass,
          severity: bs.severity,
        },
      });
    }
  }

  if (bs.type === 'OWNER_UNAVAILABLE' || bs.type === 'NO_LEGAL_SUBSTITUTE') {
    out.push({
      blindSpotId: bs.blindSpotId,
      target: 'ALERTS',
      effectType: 'CLAIM_BLOCK',
      effectPayload: {
        type: bs.type,
        severity: bs.severity,
        fieldFamily: bs.fieldFamily,
        entities: bs.affectedEntities,
      },
    });
  }

  if (bs.type === 'TRACE_INCOMPLETE') {
    out.push({
      blindSpotId: bs.blindSpotId,
      target: 'JUDGMENT_LAYER',
      effectType: 'TRACEABILITY_WARNING',
      effectPayload: {
        type: bs.type,
        disclosure: bs.disclosureText,
      },
    });
  }

  return out;
}

function constraintToTargets(
  constraint: BlindSpotClaimConstraint,
): Array<{ target: PropagationTarget; effectType: PropagationEffectType }> {
  switch (constraint) {
    case 'DISPLAY_CONSTRAINED':
      return [{ target: 'UI_BADGES', effectType: 'DISPLAY_CAVEAT' }];
    case 'SCORING_CONSTRAINED':
      return [
        { target: 'CONFIDENCE_BANDS', effectType: 'CONFIDENCE_HAIRCUT' },
        { target: 'JUDGMENT_LAYER', effectType: 'CONFIDENCE_HAIRCUT' },
      ];
    case 'SCENARIO_CONFIRMATION_BLOCKED':
      return [{ target: 'SCENARIO_ENGINE', effectType: 'SCENARIO_CONFIRMATION_BLOCK' }];
    case 'CONTRADICTION_WEIGHT_REDUCED':
      return [{ target: 'CONTRADICTION_ENGINE', effectType: 'CONFIDENCE_HAIRCUT' }];
    case 'DIRECTIONAL_CLAIM_BLOCKED':
      return [{ target: 'JUDGMENT_LAYER', effectType: 'CLAIM_BLOCK' }];
    case 'IDENTITY_ASSERTION_BLOCKED':
      return [{ target: 'JUDGMENT_LAYER', effectType: 'IDENTITY_ASSERTION_BLOCK' }];
    case 'SAFETY_VERDICT_BLOCKED':
      return [{ target: 'JUDGMENT_LAYER', effectType: 'SAFETY_VERDICT_BLOCK' }];
    case 'REPLAY_ONLY':
      return [
        { target: 'JUDGMENT_LAYER', effectType: 'CLAIM_BLOCK' },
        { target: 'AUDIT_LOG', effectType: 'TRACEABILITY_WARNING' },
      ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE HAIRCUT
// ═══════════════════════════════════════════════════════════════════════════════

function computeConfidenceHaircut(spots: BlindSpotRecord[], summary: BlindSpotSummary): number {
  let haircut = 0;

  haircut += summary.critical * 0.25;
  haircut += summary.high * 0.15;
  haircut += summary.medium * 0.08;
  haircut += summary.low * 0.03;

  for (const s of spots) {
    if (s.type === 'OWNER_UNAVAILABLE') haircut += 0.10;
    if (s.type === 'NO_LEGAL_SUBSTITUTE') haircut += 0.15;
    if (s.type === 'FALLBACK_WITH_SEMANTIC_LOSS') haircut += 0.05;
  }

  return Math.min(haircut, 1.0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE AUGMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

function buildLineageAugmentation(
  spots: BlindSpotRecord[],
  summary: BlindSpotSummary,
): BlindSpotLineageAugmentation {
  const disclosures: string[] = [];
  for (const s of spots) {
    if (s.disclosureRequired && s.disclosureText) {
      disclosures.push(s.disclosureText);
    }
  }

  return {
    activeBlindSpotIds: spots.map(s => s.blindSpotId),
    blockedClaimFamilies: summary.blockedClaimFamilies,
    constrainedClaimFamilies: summary.constrainedClaimFamilies,
    disclosureSummaries: disclosures,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FAKE: VERIFY PROPAGATION HONESTY
// ═══════════════════════════════════════════════════════════════════════════════

export function verifyPropagationHonesty(
  blindSpots: BlindSpotRecord[],
  result: PropagationResult,
): string[] {
  const violations: string[] = [];

  for (const bs of blindSpots) {
    if (bs.disclosureRequired) {
      const hasUIEffect = result.effects.some(
        e => e.blindSpotId === bs.blindSpotId && e.target === 'UI_BADGES');
      if (!hasUIEffect) {
        violations.push(`Blind spot ${bs.blindSpotId} requires disclosure but no UI badge effect`);
      }
    }

    if (bs.claimConstraints.length > 0) {
      const displayOnlyConstraints = bs.claimConstraints.every(c => c === 'DISPLAY_CONSTRAINED');
      if (displayOnlyConstraints) {
        const hasUIEffect = result.effects.some(
          e => e.blindSpotId === bs.blindSpotId &&
            (e.target === 'UI_BADGES' || e.target === 'CHAT_SYSTEM'));
        if (!hasUIEffect) {
          violations.push(`Blind spot ${bs.blindSpotId} has display constraints but no UI propagation`);
        }
      } else {
        const hasDownstream = result.effects.some(
          e => e.blindSpotId === bs.blindSpotId &&
            e.target !== 'AUDIT_LOG' && e.target !== 'UI_BADGES' && e.target !== 'CHAT_SYSTEM');
        if (!hasDownstream) {
          violations.push(`Blind spot ${bs.blindSpotId} has claim constraints but no downstream propagation`);
        }
      }
    }

    const hasAudit = result.effects.some(
      e => e.blindSpotId === bs.blindSpotId && e.target === 'AUDIT_LOG');
    if (!hasAudit) {
      violations.push(`Blind spot ${bs.blindSpotId} missing audit log entry`);
    }
  }

  for (const bs of blindSpots) {
    if (!result.lineageAugmentation.activeBlindSpotIds.includes(bs.blindSpotId)) {
      violations.push(`Blind spot ${bs.blindSpotId} missing from lineage augmentation`);
    }
  }

  const semanticLossSpots = blindSpots.filter(
    bs => bs.type === 'FALLBACK_WITH_SEMANTIC_LOSS' && bs.semanticLoss.length > 0);
  for (const bs of semanticLossSpots) {
    if (!bs.disclosureRequired || !bs.disclosureText) {
      violations.push(`Semantic-loss blind spot ${bs.blindSpotId} has no disclosure — ingress honesty violated`);
    }
  }

  return violations;
}
