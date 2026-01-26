/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔷 GEMINI PASS-1B RESEARCH ENGINE                                        ║
 * ║                                                                               ║
 * ║   Same Insight Pack schema as Grok, different strengths:                     ║
 * ║   - News/macro synthesis                                                      ║
 * ║   - Long-form digestion (whitepapers, docs)                                  ║
 * ║   - Counter-thesis / risk blind spots                                        ║
 * ║                                                                               ║
 * ║   NON-REDUNDANT: If no news/macro context, Gemini finds alternate angles.    ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, same contract as Grok                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import {
  type EvidencePack,
  type InsightPack,
  type ResearchMode,
  type InsightValidationResult,
  parseInsightPack,
  validateInsightPack,
} from './research-engine';

// ============================================================================
// FEATURE FLAG
// ============================================================================

export const ENABLE_GEMINI_PASS1B = process.env.ENABLE_GEMINI_PASS1B !== 'false';

// ============================================================================
// GEMINI-SPECIFIC PROMPT
// ============================================================================

/**
 * Gemini prompt emphasizes:
 * 1. News/macro synthesis (its strength)
 * 2. Counter-thesis generation
 * 3. Risk blind spots
 * 4. Same strict output schema
 */
export const GEMINI_PASS1B_PROMPT = `[SYSTEM: COINET_GEMINI_PASS1B_ENGINE — v1.0]

ROLE
You are a PASS-1B Research Engine (Gemini) inside Coinet.
You DO NOT speak to the end user. You produce an "Insight Pack" (JSON only).
Your job COMPLEMENTS the primary engine by focusing on:
- News/macro synthesis and context
- Counter-thesis and contrarian angles
- Risk blind spots the primary engine might miss
- Long-form digest (if whitepapers/docs in Evidence Pack)

═══════════════════════════════════════════════════════════════════════════════
YOUR UNIQUE VALUE (DO NOT DUPLICATE PRIMARY ENGINE)
═══════════════════════════════════════════════════════════════════════════════

1) NEWS/MACRO FOCUS
If Evidence Pack contains news items or sentiment data:
- Extract "why now" context
- Connect to macro events (rate decisions, regulations, competitor launches)
- Identify narrative shifts

2) COUNTER-THESIS
Always include at least ONE risk or driver the bullish case ignores:
- What's the bear argument?
- What breaks if assumptions fail?

3) CROSS-CHECK
If you see a driver that seems obvious but lacks strong evidence:
- Put it in unknowns, not drivers
- Be the skeptic

═══════════════════════════════════════════════════════════════════════════════
RULES THAT WILL CAUSE REJECTION (SAME AS PRIMARY)
═══════════════════════════════════════════════════════════════════════════════

1) You MUST NOT invent or estimate numeric values.
2) You MUST NOT infer token properties not in Evidence Pack.
3) You MUST NOT claim "live" or "real-time" knowledge outside Evidence Pack.
4) You MUST NOT output prose, markdown, or explanations. JSON only.
5) Every driver/risk MUST have evidence_keys. No empty arrays for drivers/risks.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT SCHEMA (IDENTICAL TO PRIMARY ENGINE)
═══════════════════════════════════════════════════════════════════════════════

{
  "meta": {
    "should_run_research": boolean,
    "mode": "NO_RESEARCH" | "DUAL_RESEARCH",
    "language": "<request.language>",
    "intent": "<request.intent>",
    "asset_focus": {
      "symbol": "<string or null>",
      "chain": "<string or 'unknown'>",
      "address": "<string or null>"
    },
    "timeframe": "now" | "today" | "24h" | "7d" | "unknown",
    "request_refresh": boolean,
    "one_clarifier": "<string or null>"
  },
  "insight": {
    "drivers": [
      { "topic": "<short label>", "summary": "<1-2 sentences>", "evidence_keys": ["evidence.path"], "confidence": "high|medium|low" }
    ],
    "catalysts_next": [
      { "topic": "<label>", "why_it_matters": "<1 sentence>", "evidence_keys": [], "confidence": "high|medium|low" }
    ],
    "second_order_effects": [
      { "if": "<condition>", "then": "<effect>", "confidence": "high|medium|low" }
    ],
    "risks": [
      { "risk": "<label>", "why": "<1-2 sentences>", "evidence_keys": ["evidence.path"], "confidence": "high|medium|low" }
    ],
    "scenarios": {
      "bull": "<narrative, no new numbers>",
      "base": "<narrative, no new numbers>",
      "bear": "<narrative, no new numbers>"
    },
    "unknowns": ["<missing data or blocked certainty>"],
    "overall_confidence": "high|medium|low"
  }
}

═══════════════════════════════════════════════════════════════════════════════
GEMINI-SPECIFIC BEHAVIOR
═══════════════════════════════════════════════════════════════════════════════

IF evidence.news EXISTS:
- Prioritize news-driven drivers
- Add "narrative momentum" or "attention cycle" as catalysts if relevant

IF NO news/macro context:
- Focus on finding alternate risk angles
- Be the skeptic: what did the other engine probably miss?

IF Evidence Pack is sparse (< 3 modules available):
- Set should_run_research=false
- Add to unknowns: "Insufficient data for Gemini analysis"

LENGTH CONSTRAINTS (same as primary):
- summary: 1-2 sentences max
- why/why_it_matters: 1 sentence max
- scenarios: 1-2 sentences each
- No bullet lists inside JSON strings

LANGUAGE:
- All strings in request.language
- Never mix languages

END PROMPT.`;

// ============================================================================
// GEMINI CLIENT INTERFACE
// ============================================================================

export interface GeminiClient {
  generateContent(params: {
    model: string;
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    generationConfig?: {
      temperature?: number;
      maxOutputTokens?: number;
      responseMimeType?: string;
    };
  }): Promise<{
    response: {
      text(): string;
    };
  }>;
}

// ============================================================================
// EXECUTION
// ============================================================================

export interface GeminiEngineInput {
  evidencePack: EvidencePack;
  mode: ResearchMode;
}

export interface GeminiEngineOutput {
  success: boolean;
  insightPack: InsightPack | null;
  validation: InsightValidationResult | null;
  metadata: {
    latencyMs: number;
    wasRegenerated: boolean;
    model: string;
    engineMissing: boolean;
  };
  error?: string;
}

/**
 * Execute Gemini Pass-1B Research Engine
 */
export async function executeGeminiPass1B(
  client: GeminiClient,
  model: string,
  input: GeminiEngineInput
): Promise<GeminiEngineOutput> {
  const startTime = Date.now();
  let wasRegenerated = false;

  // Check feature flag
  if (!ENABLE_GEMINI_PASS1B) {
    return {
      success: false,
      insightPack: null,
      validation: null,
      metadata: { latencyMs: 0, wasRegenerated: false, model, engineMissing: true },
      error: 'Gemini Pass-1B disabled by feature flag',
    };
  }

  // Check if Evidence Pack has enough data for Gemini to add value
  const hasNewsContext = Boolean(input.evidencePack.evidence.news || input.evidencePack.evidence.sentiment);
  const moduleCount = input.evidencePack.coverage.available.length;
  
  if (moduleCount < 2 && !hasNewsContext) {
    logger.info('🔷 Gemini Pass-1B skipped: insufficient evidence for value-add');
    return {
      success: false,
      insightPack: null,
      validation: null,
      metadata: { latencyMs: Date.now() - startTime, wasRegenerated: false, model, engineMissing: true },
      error: 'Insufficient evidence for Gemini value-add',
    };
  }

  try {
    const prompt = buildGeminiPrompt(input);

    // First attempt
    let response = await client.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: `${GEMINI_PASS1B_PROMPT}\n\n${prompt}` }] },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
      },
    });

    let rawContent = response.response.text();
    let insightPack = parseInsightPack(rawContent);

    if (!insightPack) {
      return {
        success: false,
        insightPack: null,
        validation: null,
        metadata: { latencyMs: Date.now() - startTime, wasRegenerated: false, model, engineMissing: true },
        error: 'Failed to parse Gemini Insight Pack',
      };
    }

    // Validate
    let validation = validateInsightPack(insightPack, input.evidencePack);

    // Retry if validation fails
    if (validation.shouldRegenerate) {
      wasRegenerated = true;
      logger.warn('🔷 Gemini Insight Pack validation failed, regenerating', {
        issues: validation.issues.slice(0, 3),
      });

      const enforcementPrompt = buildGeminiEnforcementPrompt(input, validation.issues);

      response = await client.generateContent({
        model,
        contents: [
          { role: 'user', parts: [{ text: `${enforcementPrompt}\n\n${prompt}` }] },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json',
        },
      });

      rawContent = response.response.text();
      insightPack = parseInsightPack(rawContent);

      if (insightPack) {
        validation = validateInsightPack(insightPack, input.evidencePack);
      }
    }

    return {
      success: validation.isValid || !validation.shouldRegenerate,
      insightPack,
      validation,
      metadata: {
        latencyMs: Date.now() - startTime,
        wasRegenerated,
        model,
        engineMissing: false,
      },
    };

  } catch (error: any) {
    logger.error('❌ Gemini Pass-1B failed', { error: error.message });

    return {
      success: false,
      insightPack: null,
      validation: null,
      metadata: { latencyMs: Date.now() - startTime, wasRegenerated, model, engineMissing: true },
      error: error.message,
    };
  }
}

function buildGeminiPrompt(input: GeminiEngineInput): string {
  const { evidencePack, mode } = input;
  
  const hasNews = Boolean(evidencePack.evidence.news);
  const hasSentiment = Boolean(evidencePack.evidence.sentiment);

  return `[GEMINI PASS-1B REQUEST]
Mode: ${mode}
Language: ${evidencePack.request.language}
Intent: ${evidencePack.request.intent}
User Message: "${evidencePack.request.user_message}"

[CONTEXT FOR GEMINI]
Has news data: ${hasNews}
Has sentiment data: ${hasSentiment}
Your focus: ${hasNews ? 'News synthesis + counter-thesis' : 'Risk blind spots + contrarian angles'}

[RESOLVED TOKEN]
${JSON.stringify(evidencePack.resolved_token, null, 2)}

[EVIDENCE PACK]
${JSON.stringify(evidencePack.evidence, null, 2)}

[COVERAGE]
Available modules: ${evidencePack.coverage.available.join(', ') || 'none'}
Missing modules: ${evidencePack.coverage.missing.join(', ') || 'none'}

[TASK]
Produce an Insight Pack JSON that COMPLEMENTS the primary engine.
Focus on news/macro context OR contrarian risk angles.
Output JSON only. Follow all rules.`;
}

function buildGeminiEnforcementPrompt(input: GeminiEngineInput, issues: string[]): string {
  return `${GEMINI_PASS1B_PROMPT}

[ENFORCEMENT MODE]
Your previous output had validation issues:
${issues.map(i => `- ${i}`).join('\n')}

Fix these issues:
- Every driver/risk MUST have evidence_keys pointing to real Evidence Pack paths
- Do NOT invent numbers
- If you cannot cite evidence, move the claim to unknowns
- Language must be: ${input.evidencePack.request.language}

Produce corrected Insight Pack JSON now.`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { GEMINI_PASS1B_PROMPT as COINET_GEMINI_PASS1B_PROMPT };
