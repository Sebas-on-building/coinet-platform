/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 8 - NARRATIVE RENDERING ENGINE                              ║
 * ║                                                                               ║
 * ║   Transforms the Explanation Object into deterministic narrative output      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { 
  ExplanationObject, 
  GatedOutput, 
  Claim, 
  Driver, 
  Warning 
} from '../layer7/types';
import { isGatedOutput } from '../layer7/builder';
import { 
  SYSTEM_PROMPT_COMPLETE, 
  GATED_OUTPUT_TEMPLATE,
  formatCitation,
} from './prompts';
import { HARD_GATE_THRESHOLDS } from '../layer6/types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RenderingContext {
  /** Target format */
  format: 'prose' | 'structured' | 'brief';
  
  /** Include citations? */
  includeCitations: boolean;
  
  /** Maximum length (characters) */
  maxLength?: number;
  
  /** Include warnings section? */
  includeWarnings: boolean;
  
  /** Audience */
  audience: 'retail' | 'institutional' | 'technical';
}

export interface RenderedNarrative {
  /** The generated narrative text */
  narrative: string;
  
  /** Claims that were cited */
  cited_claims: string[];
  
  /** Warnings that were included */
  included_warnings: string[];
  
  /** Rendering metadata */
  metadata: {
    format: string;
    character_count: number;
    citation_count: number;
    generated_at: string;
    eo_id: string;
    confidence_level: string;
  };
  
  /** Was output gated? */
  gated: boolean;
}

export const DEFAULT_RENDERING_CONTEXT: RenderingContext = {
  format: 'prose',
  includeCitations: true,
  includeWarnings: true,
  audience: 'retail',
};

// ═══════════════════════════════════════════════════════════════════════════════
// GATED OUTPUT HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render a gated output
 */
function renderGatedOutput(gated: GatedOutput): RenderedNarrative {
  return {
    narrative: GATED_OUTPUT_TEMPLATE(
      gated.reason,
      gated.confidence,
      gated.threshold
    ),
    cited_claims: [],
    included_warnings: [],
    metadata: {
      format: 'gated',
      character_count: 0,
      citation_count: 0,
      generated_at: gated.timestamp,
      eo_id: 'GATED',
      confidence_level: 'INSUFFICIENT',
    },
    gated: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION RENDERERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render the summary section
 */
function renderSummary(
  eo: ExplanationObject,
  context: RenderingContext
): { text: string; citations: string[] } {
  const citations: string[] = [];
  const asset = eo.asset;
  const scores = eo.scores;
  
  let summary = `**${asset.name} (${asset.symbol})** `;
  
  if (scores.pos.gated) {
    summary += `analysis is partially gated due to ${scores.pos.gating_reason}. `;
  } else if (scores.pos.final !== null) {
    const tier = scores.pos.tier?.toLowerCase() ?? 'neutral';
    summary += `receives an overall Position Score of ${scores.pos.final.toFixed(0)}/100, placing it in the **${scores.pos.tier}** tier. `;
    
    if (context.includeCitations) {
      citations.push('pos_final');
    }
  }
  
  summary += `Quality Score: ${scores.qs.value.toFixed(0)}/100 (${scores.qs.tier}). `;
  citations.push('qs_score');
  
  if (scores.os.gated) {
    summary += `Opportunity Score is gated due to insufficient data. `;
  } else if (scores.os.value !== null) {
    summary += `Opportunity Score: ${scores.os.value.toFixed(0)}/100 (${scores.os.tier}). `;
    citations.push('os_score');
  }
  
  summary += `Risk Score: ${scores.risk.value.toFixed(0)}/100 (${scores.risk.tier}). `;
  citations.push('risk_score');
  
  summary += `Confidence: ${eo.confidence.toFixed(0)}% (${eo.confidence_level.toLowerCase()}).`;
  
  return { text: summary, citations };
}

/**
 * Render the quality analysis section
 */
function renderQualityAnalysis(
  eo: ExplanationObject,
  context: RenderingContext
): { text: string; citations: string[] } {
  const citations: string[] = [];
  const qsDrivers = eo.positive_drivers.filter(d => 
    eo.claims.find(c => c.claim_id === d.claim_id)?.score_category === 'QS'
  );
  const qsNegatives = eo.negative_drivers.filter(d =>
    eo.claims.find(c => c.claim_id === d.claim_id)?.score_category === 'QS'
  );
  
  let text = `\n\n**Quality Analysis**\n\n`;
  text += `The Quality Score of ${eo.scores.qs.value.toFixed(0)}/100 reflects the asset's fundamental strength. `;
  
  if (qsDrivers.length > 0) {
    text += `Key positive factors include: `;
    const factors: string[] = [];
    
    for (const driver of qsDrivers.slice(0, 3)) {
      const claim = eo.claims.find(c => c.claim_id === driver.claim_id);
      if (claim) {
        const citation = context.includeCitations 
          ? ` ${formatCitation(claim.metric_id, claim.source_id)}` 
          : '';
        factors.push(`${claim.metric_name} at ${claim.normalized_value.toFixed(0)}/100${citation}`);
        citations.push(claim.metric_id);
      }
    }
    
    text += factors.join(', ') + '. ';
  }
  
  if (qsNegatives.length > 0) {
    text += `Areas of concern: `;
    const concerns: string[] = [];
    
    for (const driver of qsNegatives.slice(0, 2)) {
      const claim = eo.claims.find(c => c.claim_id === driver.claim_id);
      if (claim) {
        const citation = context.includeCitations 
          ? ` ${formatCitation(claim.metric_id, claim.source_id)}` 
          : '';
        concerns.push(`${claim.metric_name} at ${claim.normalized_value.toFixed(0)}/100${citation}`);
        citations.push(claim.metric_id);
      }
    }
    
    text += concerns.join(', ') + '.';
  }
  
  // Add context-specific note
  text += `\n\n_${eo.asset.interpretation_context}_`;
  
  return { text, citations };
}

/**
 * Render the opportunity analysis section
 */
function renderOpportunityAnalysis(
  eo: ExplanationObject,
  context: RenderingContext
): { text: string; citations: string[] } {
  const citations: string[] = [];
  
  let text = `\n\n**Opportunity Analysis**\n\n`;
  
  if (eo.scores.os.gated) {
    text += `The Opportunity Score is currently gated due to insufficient data coverage. `;
    text += `This indicates that short-term trading signals should be viewed with additional caution.`;
    return { text, citations };
  }
  
  if (eo.scores.os.value === null) {
    text += `Opportunity metrics are not available for this analysis.`;
    return { text, citations };
  }
  
  text += `The Opportunity Score of ${eo.scores.os.value.toFixed(0)}/100 suggests `;
  
  if (eo.scores.os.value >= 70) {
    text += `favorable short-term conditions based on available data. `;
  } else if (eo.scores.os.value >= 50) {
    text += `neutral market conditions. `;
  } else {
    text += `challenging short-term conditions. `;
  }
  
  // Add OS drivers
  const osDrivers = eo.positive_drivers.filter(d =>
    eo.claims.find(c => c.claim_id === d.claim_id)?.score_category === 'OS'
  );
  
  if (osDrivers.length > 0) {
    const driver = osDrivers[0];
    const claim = eo.claims.find(c => c.claim_id === driver.claim_id);
    if (claim) {
      const citation = context.includeCitations 
        ? ` ${formatCitation(claim.metric_id, claim.source_id)}` 
        : '';
      text += `${claim.metric_name} (${claim.normalized_value.toFixed(0)}/100)${citation} is a notable factor.`;
      citations.push(claim.metric_id);
    }
  }
  
  return { text, citations };
}

/**
 * Render the risk analysis section
 */
function renderRiskAnalysis(
  eo: ExplanationObject,
  context: RenderingContext
): { text: string; citations: string[] } {
  const citations: string[] = [];
  
  let text = `\n\n**Risk Analysis**\n\n`;
  text += `The Risk Score of ${eo.scores.risk.value.toFixed(0)}/100 `;
  
  if (eo.scores.risk.value <= 30) {
    text += `indicates relatively low risk exposure. `;
  } else if (eo.scores.risk.value <= 50) {
    text += `suggests moderate risk levels. `;
  } else if (eo.scores.risk.value <= 70) {
    text += `indicates elevated risk that warrants attention. `;
  } else {
    text += `signals high risk exposure requiring careful consideration. `;
  }
  
  // Add risk drivers
  const riskClaims = eo.claims.filter(c => c.score_category === 'RISK');
  const highRiskClaims = riskClaims.filter(c => c.normalized_value >= 60);
  
  if (highRiskClaims.length > 0) {
    text += `Key risk factors: `;
    const factors: string[] = [];
    
    for (const claim of highRiskClaims.slice(0, 3)) {
      const citation = context.includeCitations 
        ? ` ${formatCitation(claim.metric_id, claim.source_id)}` 
        : '';
      factors.push(`${claim.metric_name} (${claim.normalized_value.toFixed(0)}/100)${citation}`);
      citations.push(claim.metric_id);
    }
    
    text += factors.join(', ') + '.';
  }
  
  return { text, citations };
}

/**
 * Render the warnings section
 */
function renderWarnings(
  eo: ExplanationObject,
  context: RenderingContext
): { text: string; warnings: string[] } {
  const includedWarnings: string[] = [];
  
  // Filter warnings by severity
  const criticalWarnings = eo.warnings.filter(w => w.severity === 'CRITICAL');
  const highWarnings = eo.warnings.filter(w => w.severity === 'HIGH');
  
  if (criticalWarnings.length === 0 && highWarnings.length === 0) {
    return { text: '', warnings: [] };
  }
  
  let text = `\n\n**⚠️ Important Warnings**\n\n`;
  
  for (const warning of criticalWarnings) {
    text += `🔴 **CRITICAL**: ${warning.message}\n`;
    includedWarnings.push(warning.warning_id);
  }
  
  for (const warning of highWarnings) {
    text += `🟠 **WARNING**: ${warning.message}\n`;
    includedWarnings.push(warning.warning_id);
  }
  
  return { text, warnings: includedWarnings };
}

/**
 * Render the conclusion section
 */
function renderConclusion(
  eo: ExplanationObject,
  context: RenderingContext
): string {
  let text = `\n\n**Conclusion**\n\n`;
  
  const posScore = eo.scores.pos.final;
  const confidence = eo.confidence;
  
  if (posScore === null || eo.scores.pos.gated) {
    text += `Due to data limitations, a complete assessment cannot be provided at this time. `;
    text += `Confidence level: ${eo.confidence_level.toLowerCase()} (${confidence.toFixed(0)}%).`;
    return text;
  }
  
  // Tone-appropriate conclusion
  switch (eo.narrative_guidance.recommended_tone) {
    case 'BULLISH_CAUTIOUS':
      text += `Based on the available data, ${eo.asset.name} demonstrates strong fundamentals `;
      text += `with a Position Score of ${posScore.toFixed(0)}/100. `;
      text += `However, investors should consider the noted risk factors.`;
      break;
      
    case 'NEUTRAL':
      text += `The data presents a balanced picture for ${eo.asset.name}, `;
      text += `with a Position Score of ${posScore.toFixed(0)}/100. `;
      text += `Both strengths and weaknesses are evident in the metrics.`;
      break;
      
    case 'CAUTIOUS':
      text += `${eo.asset.name} shows mixed signals with a Position Score of ${posScore.toFixed(0)}/100. `;
      text += `The highlighted warnings warrant careful consideration.`;
      break;
      
    case 'BEARISH_CAUTIOUS':
      text += `The analysis indicates concerns for ${eo.asset.name}, `;
      text += `reflected in a Position Score of ${posScore.toFixed(0)}/100. `;
      text += `Risk factors appear to outweigh positive indicators.`;
      break;
  }
  
  text += ` Analysis confidence: ${confidence.toFixed(0)}% (${eo.confidence_level.toLowerCase()}).`;
  
  return text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RENDERING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render the complete narrative from an Explanation Object
 */
export function renderNarrative(
  input: ExplanationObject | GatedOutput,
  context: RenderingContext = DEFAULT_RENDERING_CONTEXT
): RenderedNarrative {
  const now = new Date().toISOString();
  
  // Handle gated output
  if (isGatedOutput(input)) {
    return renderGatedOutput(input);
  }
  
  const eo = input;
  
  // Check confidence gate
  if (eo.confidence < HARD_GATE_THRESHOLDS.CONFIDENCE_GATE || !eo.gate_status.passed) {
    return renderGatedOutput({
      gated: true,
      entity_id: eo.asset.entity_id,
      reason: eo.gate_status.failure_reason ?? 'Confidence threshold not met',
      confidence: eo.confidence,
      threshold: HARD_GATE_THRESHOLDS.CONFIDENCE_GATE,
      requirements: [],
      timestamp: now,
    });
  }
  
  // Render all sections
  const allCitations: string[] = [];
  const allWarnings: string[] = [];
  
  const summary = renderSummary(eo, context);
  allCitations.push(...summary.citations);
  
  const quality = renderQualityAnalysis(eo, context);
  allCitations.push(...quality.citations);
  
  const opportunity = renderOpportunityAnalysis(eo, context);
  allCitations.push(...opportunity.citations);
  
  const risk = renderRiskAnalysis(eo, context);
  allCitations.push(...risk.citations);
  
  let warningsText = '';
  if (context.includeWarnings) {
    const warnings = renderWarnings(eo, context);
    warningsText = warnings.text;
    allWarnings.push(...warnings.warnings);
  }
  
  const conclusion = renderConclusion(eo, context);
  
  // Combine all sections
  let narrative = summary.text + quality.text + opportunity.text + risk.text;
  
  if (warningsText) {
    narrative += warningsText;
  }
  
  narrative += conclusion;
  
  // Add metadata footer
  narrative += `\n\n---\n_Analysis generated at ${now}. Confidence: ${eo.confidence.toFixed(0)}%. EO ID: ${eo.eo_id}_`;
  
  return {
    narrative,
    cited_claims: [...new Set(allCitations)],
    included_warnings: allWarnings,
    metadata: {
      format: context.format,
      character_count: narrative.length,
      citation_count: allCitations.length,
      generated_at: now,
      eo_id: eo.eo_id,
      confidence_level: eo.confidence_level,
    },
    gated: false,
  };
}

/**
 * Render a brief summary (for chat/quick view)
 */
export function renderBriefSummary(
  input: ExplanationObject | GatedOutput
): string {
  if (isGatedOutput(input)) {
    return `⚠️ ANALYSIS GATED: ${input.reason}`;
  }
  
  const eo = input;
  
  if (!eo.gate_status.passed) {
    return `⚠️ ANALYSIS GATED: ${eo.gate_status.failure_reason}`;
  }
  
  const pos = eo.scores.pos.final;
  const tier = eo.scores.pos.tier;
  
  if (pos === null) {
    return `${eo.asset.symbol}: Score gated. QS: ${eo.scores.qs.value.toFixed(0)}/100. Confidence: ${eo.confidence.toFixed(0)}%`;
  }
  
  const warnings = eo.warnings.filter(w => w.severity === 'CRITICAL' || w.severity === 'HIGH');
  const warningNote = warnings.length > 0 ? ` ⚠️ ${warnings.length} warning(s)` : '';
  
  return `${eo.asset.symbol}: ${pos.toFixed(0)}/100 (${tier}). QS: ${eo.scores.qs.value.toFixed(0)}, OS: ${eo.scores.os.value?.toFixed(0) ?? 'gated'}, Risk: ${eo.scores.risk.value.toFixed(0)}. Confidence: ${eo.confidence.toFixed(0)}%${warningNote}`;
}

/**
 * Get the system prompt for LLM rendering
 */
export function getSystemPrompt(): string {
  return SYSTEM_PROMPT_COMPLETE;
}

/**
 * Format an EO as JSON for LLM input
 */
export function formatEOForLLM(eo: ExplanationObject): string {
  return JSON.stringify(eo, null, 2);
}
