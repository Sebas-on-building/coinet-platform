/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 OMNISCORE DEBUG VIEW v2.3.4                                            ║
 * ║                                                                               ║
 * ║   Transparent view of all OmniScore calculations for troubleshooting         ║
 * ║   Shows: Raw → Smoothed → Adjusted → Final with all caps/limits applied     ║
 * ║                                                                               ║
 * ║   USE THIS to diagnose:                                                       ║
 * ║   • Why POS changed dramatically                                             ║
 * ║   • Whether smoothing is working                                             ║
 * ║   • If plausibility cap was hit                                              ║
 * ║   • OS ceiling application                                                   ║
 * ║   • Invariant violations                                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { 
  OmniScoreProductionResponse, 
  OmniScoreSnapshot,
  InvariantViolation 
} from './omniscore-v2.5';
import { getQuadrantZone } from './omniscore-v2.5';

export interface OmniScoreDebugView {
  project: string;
  engineVersion: string;
  formulaVersion: 'v2.3' | 'v2.4';
  timestamp: string;
  
  // Score progression
  progression: {
    qs: {
      raw: number;
      final: number;
      clamped: boolean;
    };
    os: {
      raw: number;
      afterCeiling: number;
      final: number;
      ceilingApplied: boolean;
      capBucket: string;
      ceiling: number;
    };
    risk: {
      legal: number;
      macro: number;
      ers: number;
      combined: number;
    };
    pos: {
      // v2.4: Different calculation steps based on formula
      formulaUsed: 'weighted-average' | 'baseline-tilt';
      
      step1_raw: number;                    // v2.3: ω_F×QS + ω_O×OS - ω_R×Risk
                                             // v2.4: QS + K_OS×(OS-50) - K_RISK×(Risk-50)
      fundamentalsFloor: number | null;     // v2.4 only
      fundamentalsFloorApplied: boolean;    // v2.4 only
      
      step2_plausibilityCap: number;        // After ≤97 cap
      step3_smoothed: number;               // After temporal smoothing
      step4_ersAdjusted: number;            // After -γ×ERS
      final: number;                        // Final POS
      
      plausibilityCapped: boolean;
      smoothed: boolean;
      smoothingDelta: number | null;
      ersAdjustment: number;
    };
  };
  
  // Smoothing details
  smoothing: {
    enabled: boolean;
    alpha: number;
    previousPos: number | null;
    rawDelta: number;
    boundedDelta: number;
    maxDeltaAllowed: number;
    wasLimited: boolean;
    eventMode: boolean;
    timeSinceLastHours: number | null;
  };
  
  // Tier analysis
  tierAnalysis: {
    finalTier: string;
    rawTier: string;
    conditionedTier: string;
    tierMismatch: boolean;
    tierThresholds: {
      Elite: number;
      Strong: number;
      Neutral: number;
      Weak: number;
      Critical: number;
    };
    posToThresholdDeltas: {
      toElite: number;
      toStrong: number;
      toNeutral: number;
      toWeak: number;
    };
  };
  
  // Quadrant position
  quadrant: {
    zone: 'TARGET' | 'BUILDER' | 'HYPE' | 'AVOID';
    qs: number;
    os: number | null;
    qsThreshold: number;
    osThreshold: number;
  };
  
  // Invariant violations
  violations: {
    errors: InvariantViolation[];
    warnings: InvariantViolation[];
    status: 'pass' | 'warn' | 'fail';
  };
  
  // NRG/NMI analysis
  narrativeAnalysis: {
    nrg: {
      value: number;
      interpretation: string;
      percentile: number;
      components: {
        narrative: number;  // COMM + MARKET
        reality: number;    // SEC + TECH + ADOPT
      };
    };
    nmi: {
      score: number;
      tier: string;
      botRisk: number;
      anomalyScore: number;
      influencerConcentration: number;
    };
  };
}

/**
 * Generate debug view from OmniScore response
 */
export function generateDebugView(
  response: OmniScoreProductionResponse
): OmniScoreDebugView {
  const audit = response.audit as any;
  const tierContext = (response as any).tierContext;
  const smoothing = audit.smoothingApplied || {
    enabled: false,
    alpha: 1,
    previousPos: null,
    rawDelta: 0,
    boundedDelta: 0,
    maxDeltaAllowed: 0,
    wasLimited: false,
    eventMode: false,
    timeSinceLastHours: null,
  };
  
  // Calculate tier thresholds
  const tierThresholds = {
    Elite: 85,
    Strong: 70,
    Neutral: 50,
    Weak: 30,
    Critical: 0,
  };
  
  // Calculate deltas to next tier
  const pos = response.pos.adjusted;
  const posToThresholdDeltas = {
    toElite: 85 - pos,
    toStrong: pos >= 70 ? 0 : 70 - pos,
    toNeutral: pos >= 50 ? 0 : 50 - pos,
    toWeak: pos >= 30 ? 0 : 30 - pos,
  };
  
  // Determine quadrant zone
  const qs = response.qualityScore.score;
  const os = response.opportunityScore.status === 'gated' ? null : response.opportunityScore.score;
  const qsThreshold = 60;
  const osThreshold = 60;
  
  let zone: 'TARGET' | 'BUILDER' | 'HYPE' | 'AVOID';
  if (qs >= qsThreshold && os !== null && os >= osThreshold) {
    zone = 'TARGET';
  } else if (qs >= qsThreshold && (os === null || os < osThreshold)) {
    zone = 'BUILDER';
  } else if (qs < qsThreshold && os !== null && os >= osThreshold) {
    zone = 'HYPE';
  } else {
    zone = 'AVOID';
  }
  
  const nmi = (response as any).nmi || { score: 0, tier: 'clean', components: {} };
  
  return {
    project: response.project,
    engineVersion: audit.engineVersion,
    formulaVersion: audit.formulaVersion || 'v2.3',
    timestamp: response.timestamp,

    progression: {
      qs: {
        raw: response.qualityScore.score, // Already processed
        final: response.qualityScore.score,
        clamped: audit.clampApplied?.qs || false,
      },
      os: {
        raw: response.opportunityScore.score + (smoothing.enabled ? 0 : 0), // Approximation
        afterCeiling: response.opportunityScore.score,
        final: response.opportunityScore.score,
        ceilingApplied: audit.warnings?.some((w: any) => w.code === 'OS-CAP-ADJ') || false,
        capBucket: audit.capBucket,
        ceiling: audit.capBucket === 'mega' ? 92 :
                 audit.capBucket === 'large' ? 95 :
                 audit.capBucket === 'mid' ? 98 : 100,
      },
      risk: {
        legal: response.risk.score / 2, // Approximation
        macro: response.risk.score / 2,
        ers: response.risk.eventRiskSeverity,
        combined: response.risk.score,
      },
      pos: {
        formulaUsed: audit.formulaVersion === 'v2.4' ? 'baseline-tilt' : 'weighted-average',
        
        step1_raw: response.pos.raw,
        fundamentalsFloor: audit.fundamentalsFloor || null,
        fundamentalsFloorApplied: audit.fundamentalsFloorApplied || false,
        
        step2_plausibilityCap: audit.posBeforeCap || response.pos.raw,
        step3_smoothed: smoothing.enabled ?
          response.pos.raw - (smoothing.rawDelta - smoothing.boundedDelta) :
          response.pos.raw,
        step4_ersAdjusted: response.pos.adjusted,
        final: response.pos.adjusted,

        plausibilityCapped: audit.posPlausibilityCapped,
        smoothed: smoothing.enabled,
        smoothingDelta: smoothing.enabled ? smoothing.boundedDelta : null,
        ersAdjustment: response.risk.adjustmentGamma * response.risk.eventRiskSeverity,
      },
    },
    
    smoothing,
    
    tierAnalysis: {
      finalTier: response.pos.tier,
      rawTier: audit.rawTierUsed || response.pos.tier,
      conditionedTier: audit.conditionedTierInternal || response.pos.tier,
      tierMismatch: audit.tierMismatch || false,
      tierThresholds,
      posToThresholdDeltas,
    },
    
    quadrant: {
      zone,
      qs,
      os,
      qsThreshold,
      osThreshold,
    },
    
    violations: {
      errors: audit.violations || [],
      warnings: audit.warnings || [],
      status: audit.invariantStatus,
    },
    
    narrativeAnalysis: {
      nrg: {
        value: response.nrg.value,
        interpretation: response.nrg.interpretation,
        percentile: response.nrg.percentile,
        components: {
          narrative: 0, // Would need to compute from inputs
          reality: 0,
        },
      },
      nmi: {
        score: nmi.score,
        tier: nmi.tier,
        botRisk: nmi.components?.botLikelihood || 0,
        anomalyScore: nmi.components?.anomalyBursts || 0,
        influencerConcentration: nmi.components?.influencerConcentrationComposite || 0,
      },
    },
  };
}

/**
 * Format debug view as human-readable text
 */
export function formatDebugView(debug: OmniScoreDebugView): string {
  return `
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🔍 OMNISCORE DEBUG VIEW — ${debug.project.toUpperCase()}                                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Engine: v${debug.engineVersion} (Formula ${debug.formulaVersion}) | ${debug.timestamp}
Sector: ${debug.quadrant.zone} Zone (${debug.tierAnalysis.finalTier} tier)

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 SCORE PROGRESSION (Watch for anomalies)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

QS (Quality Score):
  Final: ${debug.progression.qs.final.toFixed(1)}/100 (${debug.progression.qs.final >= 60 ? '✅ HIGH' : '⚠️ LOW'})
  ${debug.progression.qs.clamped ? '⚠️ Clamped to bounds' : '✅ No clamping needed'}

OS (Opportunity Score):
  Raw:           ${debug.progression.os.raw.toFixed(1)}/100
  After Ceiling: ${debug.progression.os.afterCeiling.toFixed(1)}/100
  Final:         ${debug.progression.os.final.toFixed(1)}/100
  ${debug.progression.os.ceilingApplied ? `⚠️ Cap applied (${debug.progression.os.capBucket} bucket: max ${debug.progression.os.ceiling})` : '✅ No ceiling hit'}

Risk:
  LEGAL: ${debug.progression.risk.legal.toFixed(1)}
  MACRO: ${debug.progression.risk.macro.toFixed(1)}
  ERS:   ${debug.progression.risk.ers.toFixed(2)} ${debug.smoothing.eventMode ? '🚨 EVENT MODE' : ''}
  Combined: ${debug.progression.risk.combined.toFixed(1)}/100

POS (Project OmniScore):
  Formula: ${debug.progression.pos.formulaUsed === 'baseline-tilt' ? '🆕 v2.4 Baseline+Tilt' : 'v2.3 Weighted Average'}
  Step 1 - Raw calculation:      ${debug.progression.pos.step1_raw.toFixed(1)}/100${debug.progression.pos.fundamentalsFloorApplied ? ` ⚠️ Floor at ${debug.progression.pos.fundamentalsFloor}` : ''}
  Step 2 - Plausibility cap:     ${debug.progression.pos.step2_plausibilityCap.toFixed(1)}/100 ${debug.progression.pos.plausibilityCapped ? '⚠️ CAPPED AT 97' : ''}
  Step 3 - Temporal smoothing:   ${debug.progression.pos.step3_smoothed.toFixed(1)}/100 ${debug.progression.pos.smoothed ? `(Δ=${debug.progression.pos.smoothingDelta?.toFixed(1)})` : ''}
  Step 4 - ERS adjustment:       ${debug.progression.pos.step4_ersAdjusted.toFixed(1)}/100 ${debug.progression.pos.ersAdjustment > 0 ? `(-${debug.progression.pos.ersAdjustment.toFixed(1)})` : ''}
  ═══════════════════════════════════════════════════════════════════════════
  FINAL POS: ${debug.progression.pos.final.toFixed(1)}/100 (${debug.tierAnalysis.finalTier})

${debug.progression.pos.plausibilityCapped ? `
🚨 PLAUSIBILITY CAP HIT!
Original POS was ${debug.progression.pos.step1_raw.toFixed(1)}, capped at 97.
This indicates either:
  - Data anomaly (check input quality)
  - Invariant violation (check audit trail)
  - Configuration error (check weights)
` : ''}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🕐 TEMPORAL SMOOTHING (Prevents wild swings)                                │
└─────────────────────────────────────────────────────────────────────────────┘

${debug.smoothing.enabled ? `
Enabled:  ✅
Alpha:    ${debug.smoothing.alpha} (new × ${debug.smoothing.alpha}, old × ${(1-debug.smoothing.alpha).toFixed(2)})
Previous: ${debug.smoothing.previousPos?.toFixed(1) || 'N/A'}
Time Gap: ${debug.smoothing.timeSinceLastHours?.toFixed(1) || 'N/A'} hours

Raw Delta:     ${debug.smoothing.rawDelta > 0 ? '+' : ''}${debug.smoothing.rawDelta.toFixed(1)} ${Math.abs(debug.smoothing.rawDelta) > 20 ? '⚠️ LARGE SWING' : ''}
Bounded Delta: ${debug.smoothing.boundedDelta > 0 ? '+' : ''}${debug.smoothing.boundedDelta.toFixed(1)}
Max Allowed:   ±${debug.smoothing.maxDeltaAllowed} ${debug.smoothing.eventMode ? '(EVENT MODE)' : '(NORMAL)'}
${debug.smoothing.wasLimited ? '⚠️ DELTA WAS LIMITED (smoothing prevented crash/spike)' : '✅ Delta within limits'}
` : `
Disabled: First reading or insufficient data
`}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎯 TIER ANALYSIS                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Final Tier: ${debug.tierAnalysis.finalTier}
Raw Tier:   ${debug.tierAnalysis.rawTier} (fixed thresholds)
Conditioned: ${debug.tierAnalysis.conditionedTier} (percentile-based, internal only)
${debug.tierAnalysis.tierMismatch ? '⚠️ TIER MISMATCH (raw ≠ conditioned)' : '✅ Tiers aligned'}

Distance to next tier:
  → Elite (85):   ${debug.tierAnalysis.posToThresholdDeltas.toElite > 0 ? `+${debug.tierAnalysis.posToThresholdDeltas.toElite.toFixed(1)} needed` : 'Already Elite'}
  → Strong (70):  ${debug.tierAnalysis.posToThresholdDeltas.toStrong > 0 ? `+${debug.tierAnalysis.posToThresholdDeltas.toStrong.toFixed(1)} needed` : 'Already Strong or higher'}
  → Neutral (50): ${debug.tierAnalysis.posToThresholdDeltas.toNeutral > 0 ? `+${debug.tierAnalysis.posToThresholdDeltas.toNeutral.toFixed(1)} needed` : 'Already Neutral or higher'}
  → Weak (30):    ${debug.tierAnalysis.posToThresholdDeltas.toWeak > 0 ? `+${debug.tierAnalysis.posToThresholdDeltas.toWeak.toFixed(1)} needed` : 'Already Weak or higher'}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📍 QUADRANT POSITION                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

Zone: ${debug.quadrant.zone}
  QS: ${debug.quadrant.qs.toFixed(1)} ${debug.quadrant.qs >= debug.quadrant.qsThreshold ? '✅' : '❌'} (threshold: ${debug.quadrant.qsThreshold})
  OS: ${debug.quadrant.os?.toFixed(1) || 'GATED'} ${debug.quadrant.os !== null && debug.quadrant.os >= debug.quadrant.osThreshold ? '✅' : '❌'} (threshold: ${debug.quadrant.osThreshold})

Interpretation:
  ${debug.quadrant.zone === 'TARGET' ? '✅ HIGH QUALITY + HIGH OPPORTUNITY → Strong buy signal' :
    debug.quadrant.zone === 'BUILDER' ? '🔨 HIGH QUALITY + LOW OPPORTUNITY → Accumulation zone' :
    debug.quadrant.zone === 'HYPE' ? '⚠️ LOW QUALITY + HIGH OPPORTUNITY → Ride momentum or exit' :
    '🚫 LOW QUALITY + LOW OPPORTUNITY → Avoid'}

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📈 NARRATIVE ANALYSIS                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

NRG (Narrative Energy): ${debug.narrativeAnalysis.nrg.value > 0 ? '+' : ''}${debug.narrativeAnalysis.nrg.value.toFixed(2)}
  Interpretation: ${debug.narrativeAnalysis.nrg.interpretation}
  Percentile: ${(debug.narrativeAnalysis.nrg.percentile * 100).toFixed(0)}th
  ${debug.narrativeAnalysis.nrg.value > 0.5 ? '🔴 SIGNIFICANTLY OVERHYPED' :
    debug.narrativeAnalysis.nrg.value > 0.2 ? '🟡 MILDLY OVERHYPED' :
    debug.narrativeAnalysis.nrg.value < -0.5 ? '💎 SIGNIFICANTLY UNDERHYPED (opportunity)' :
    debug.narrativeAnalysis.nrg.value < -0.2 ? '🟢 MILDLY UNDERHYPED' :
    '⚪ BALANCED'}

NMI (Manipulation Index): ${debug.narrativeAnalysis.nmi.score.toFixed(1)}/100 (${debug.narrativeAnalysis.nmi.tier})
  Bot Risk: ${(debug.narrativeAnalysis.nmi.botRisk * 100).toFixed(0)}%
  Anomaly: ${(debug.narrativeAnalysis.nmi.anomalyScore * 100).toFixed(0)}%
  ICR: ${(debug.narrativeAnalysis.nmi.influencerConcentration * 100).toFixed(0)}%
  ${debug.narrativeAnalysis.nmi.tier === 'clean' ? '✅ No manipulation detected' :
    debug.narrativeAnalysis.nmi.tier === 'suspicious' ? '⚠️ Suspicious activity' :
    '🚨 MANIPULATION LIKELY'}

┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚠️ INVARIANT VIOLATIONS                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Status: ${debug.violations.status === 'pass' ? '✅ PASS' : 
         debug.violations.status === 'warn' ? '⚠️ WARNINGS' : 
         '❌ ERRORS'}

${debug.violations.errors.length > 0 ? `
ERRORS (${debug.violations.errors.length}):
${debug.violations.errors.map(v => `  • [${v.code}] ${v.message}`).join('\n')}
` : '✅ No errors'}

${debug.violations.warnings.length > 0 ? `
WARNINGS (${debug.violations.warnings.length}):
${debug.violations.warnings.map(v => `  • [${v.code}] ${v.message}`).join('\n')}
` : '✅ No warnings'}

╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎯 SANITY CHECKS                                                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

${debug.progression.pos.final >= 97 ? '🚨 POS ≥ 97 — IMPOSSIBLE! Check data quality' : '✅ POS within plausible range'}
${debug.progression.os.final >= 100 ? '🚨 OS = 100 — SHOULD BE RARE! Check cap application' : '✅ OS reasonable'}
${Math.abs(debug.smoothing.rawDelta) > 30 && !debug.smoothing.eventMode ? '🚨 HUGE SWING WITHOUT EVENT — Data anomaly?' : '✅ Changes reasonable'}
${debug.violations.errors.length > 0 ? '🚨 ERRORS PRESENT — Investigate immediately' : '✅ No errors'}

═══════════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Format snapshot for AI/chat consumption (simplified from full response)
 */
export function formatSnapshotForAI(snapshot: OmniScoreSnapshot): string {
  return `
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎯 OMNISCORE SNAPSHOT: ${snapshot.symbol} (Engine v${snapshot.audit.engineVersion})                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

MANDATORY RULES:
1. 🔒 USE EXACT VALUES: POS=${snapshot.posAdjusted}, tier="${snapshot.tier}"
2. 🚫 NEVER say "100/100" unless posAdjusted is exactly 100 (it won't be)
3. 📊 ALWAYS show: "scores ${snapshot.posAdjusted}/100 (${snapshot.tier} tier)"
4. 🎯 Separate quadrant (${getQuadrantZone(snapshot.qs, snapshot.os)}) from tier (${snapshot.tier})

═══════════════════════════════════════════════════════════════════════════════

PROJECT OMNISCORE (Final):
  Score: ${snapshot.posAdjusted}/100
  Tier:  ${snapshot.tier}  ← USE THIS EXACT STRING

QUALITY SCORE (Fundamentals):
  Score: ${snapshot.qs}/100
  Tier:  ${snapshot.qsTier}  ← USE THIS EXACT STRING

OPPORTUNITY SCORE (Market):
  Score: ${snapshot.os !== null ? `${snapshot.os}/100` : 'GATED'}
  Tier:  ${snapshot.osTier || 'N/A'}  ← USE THIS EXACT STRING
  Status: ${snapshot.osStatus}

QUADRANT: ${getQuadrantZone(snapshot.qs, snapshot.os)} Zone
  (QS=${snapshot.qs >= 60 ? '≥60 ✅' : '<60 ❌'}, OS=${snapshot.os !== null && snapshot.os >= 60 ? '≥60 ✅' : '<60 ❌'})

NARRATIVE:
  NRG: ${snapshot.nrg > 0 ? '+' : ''}${snapshot.nrg.toFixed(2)} (${snapshot.nrgTier})
  NMI: ${snapshot.nmi.toFixed(1)}/100 (${snapshot.nmiTier})

AUDIT:
  ${snapshot.audit.posPlausibilityCapped ? '🚨 POS was capped at 97 (original > 97!)' : '✅ POS within plausible range'}
  ${snapshot.audit.smoothingApplied ? `🕐 Smoothing applied (prevents wild swings)` : ''}
  ${snapshot.audit.osCeilingApplied ? `📊 OS ceiling applied (${snapshot.capBucket} cap)` : ''}
  Invariants: ${snapshot.audit.invariantStatus === 'pass' ? '✅ Pass' : snapshot.audit.invariantStatus === 'warn' ? '⚠️ Warnings' : '❌ ERRORS'}

═══════════════════════════════════════════════════════════════════════════════
PRESENTATION FORMAT (MANDATORY):

"${snapshot.symbol} scores ${snapshot.posAdjusted}/100 on OmniScore (${snapshot.tier} tier).
Quality Score is ${snapshot.qs}/100 (${snapshot.qsTier}) — [interpret].
Opportunity Score is ${snapshot.os !== null ? `${snapshot.os}/100 (${snapshot.osTier})` : 'GATED'} — [interpret].
This positions ${snapshot.symbol} in the ${getQuadrantZone(snapshot.qs, snapshot.os)} Zone."

DO NOT DEVIATE FROM THIS FORMAT.
═══════════════════════════════════════════════════════════════════════════════
`;
}
