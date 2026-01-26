/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎨 COINET STYLE REALIZER - Two-Layer Output System                       ║
 * ║                                                                               ║
 * ║   Separates "thinking" from "speaking":                                      ║
 * ║   - Layer A: Analysis Object (structured, factual + interpretation)          ║
 * ║   - Layer B: Chat Message (human voice only, no new facts)                   ║
 * ║                                                                               ║
 * ║   IMPLEMENTATION MODES:                                                       ║
 * ║   - MODE 1 (Best): Two API calls (analysis → validate → render)             ║
 * ║   - MODE 2 (Cheaper): One call with dual output                             ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Divine production standard, streaming-safe               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import OpenAI from 'openai';

// ============================================================================
// ANALYSIS OBJECT SCHEMA (STRICT)
// ============================================================================

export interface AnalysisObjectMeta {
  output_language: string;
  intent: 
    | 'SOCIAL' | 'MARKET_OVERVIEW' | 'COIN_CHECK' | 'TOKEN_ANALYSIS'
    | 'EXPLAIN_MOVE' | 'SOURCES' | 'OMNISCORE' | 'LEARNING' | 'TROUBLESHOOT' | 'OTHER';
  requires_data: boolean;
  confidence: 'high' | 'medium' | 'low';
  timeframe: 'now' | 'today' | '24h' | '7d' | 'unknown';
  resolved_token: {
    chain: string | null;
    address: string | null;
    symbol: string | null;
    name: string | null;
  } | null;
}

export interface FactClaim {
  claim: string;
  fact_keys: string[];
  numbers: string[];
}

export interface FactMetric {
  label: string;
  value: string;
  unit: string | null;
  fact_keys: string[];
}

export interface AnalysisObjectFacts {
  summary: FactClaim[];
  metrics: FactMetric[];
}

export interface AnalysisObjectInterpretation {
  takeaway: string;
  drivers: string[];
  risks: string[];
  invalidations: string[];
}

export interface AnalysisObjectCoverage {
  available_modules: string[];
  missing_modules: string[];
  freshness_seconds: Record<string, number>;
}

export interface AnalysisObjectConstraints {
  max_bullets: number;
  max_questions: number;
  no_menu_questions: boolean;
  no_new_facts_in_render: boolean;
}

export interface AnalysisObject {
  meta: AnalysisObjectMeta;
  facts: AnalysisObjectFacts;
  interpretation: AnalysisObjectInterpretation;
  coverage: AnalysisObjectCoverage;
  constraints: AnalysisObjectConstraints;
}

// ============================================================================
// PASS 1 PROMPT: ANALYSIS GENERATOR
// ============================================================================

export const ANALYSIS_GENERATOR_PROMPT = `[COINET ANALYSIS GENERATOR — PASS 1]

You MUST output exactly ONE valid JSON object matching the Analysis Object Schema.
No markdown. No extra keys. No prose outside JSON.

You may only use facts present in provided payloads.
If payload is missing required data, mark it in coverage.missing_modules and set confidence to low.

Interpretation must be written in a neutral, trader-realistic style.
Do not include "chat voice", slang mirroring, or emojis here.
This is analysis, not performance.

============================================================
ANALYSIS OBJECT SCHEMA
============================================================

{
  "meta": {
    "output_language": "<user's language>",
    "intent": "SOCIAL|MARKET_OVERVIEW|COIN_CHECK|TOKEN_ANALYSIS|EXPLAIN_MOVE|SOURCES|OMNISCORE|LEARNING|TROUBLESHOOT|OTHER",
    "requires_data": true/false,
    "confidence": "high|medium|low",
    "timeframe": "now|today|24h|7d|unknown",
    "resolved_token": {
      "chain": "<chain or null>",
      "address": "<address or null>",
      "symbol": "<symbol or null>",
      "name": "<name or null>"
    }
  },
  "facts": {
    "summary": [
      { "claim": "<factual statement>", "fact_keys": ["payload.path.key"], "numbers": ["value"] }
    ],
    "metrics": [
      { "label": "<metric name>", "value": "<number>", "unit": "<unit or null>", "fact_keys": ["payload.path.key"] }
    ]
  },
  "interpretation": {
    "takeaway": "<1-2 sentence main point>",
    "drivers": ["<cause/reason>"],
    "risks": ["<risk/concern>"],
    "invalidations": ["<what would change this view>"]
  },
  "coverage": {
    "available_modules": ["<module names>"],
    "missing_modules": ["<missing module names>"],
    "freshness_seconds": { "<module>": <seconds_since_fetch> }
  },
  "constraints": {
    "max_bullets": 4,
    "max_questions": 1,
    "no_menu_questions": true,
    "no_new_facts_in_render": true
  }
}

============================================================
HARD RULES
============================================================

1) Every number must appear in facts.summary[n].numbers OR facts.metrics[*].value.
2) Every factual claim must include fact_keys pointing to payload fields.
3) If requires_data=true but payload is missing critical modules:
   - facts.metrics must be empty
   - interpretation must explicitly say what is missing
   - confidence must be "low"
4) Do not invent, guess, or approximate any values.
5) Output language must match the user's message language.

============================================================
INTENT CLASSIFICATION
============================================================

- SOCIAL: Greetings, thanks, casual chat
- MARKET_OVERVIEW: General market state question
- COIN_CHECK: Quick price/status check on specific coin
- TOKEN_ANALYSIS: Deep analysis request on token
- EXPLAIN_MOVE: "Why did X move?" questions
- SOURCES: Asking about data sources
- OMNISCORE: Asking about OmniScore specifically
- LEARNING: Educational questions about crypto
- TROUBLESHOOT: Technical issues or errors
- OTHER: Anything else

============================================================
OUTPUT
============================================================

Produce the Analysis Object JSON now. No other text.`;

// ============================================================================
// PASS 2 PROMPT: STYLE REALIZER
// ============================================================================

export const STYLE_REALIZER_PROMPT = `[COINET STYLE REALIZER — PASS 2]

You are rendering the user-facing message from a validated Analysis Object.
You MUST output only the final chat text (no JSON, no markdown fences).
You MUST NOT add new facts, new numbers, or new claims.
You MUST NOT change language.
You MUST NOT exceed constraints.max_questions question marks.

============================================================
RENDERING RULES
============================================================

1) Start with 1 short human reaction line (language-appropriate).
   Examples: "Okay." / "Vale." / "Alles klar." / "Got it."

2) Give the main takeaway (interpretation.takeaway) in plain language.

3) Include only 0–3 key metrics if present (from facts.metrics), otherwise no numbers.

4) Mention missing coverage briefly if it affects trust.
   Example: "Don't have holder data right now."

5) Avoid menus and meta phrases:
   - NO: "keeping it short", "building on that", "quick pulse"
   - NO: "Want A or B or C?"
   
6) End cleanly, or ask ONE natural clarifier only if interpretation needs it.

============================================================
ALLOWED CONTENT SOURCES (ONLY THESE)
============================================================

- meta.output_language → Must match output language
- interpretation.takeaway → Main message
- interpretation.drivers → Reasons/causes
- interpretation.risks → Concerns to mention
- facts.metrics → Numbers to cite (use label + value + unit)
- coverage.missing_modules → "I don't have X data"

============================================================
VOICE STYLE
============================================================

- Real trader friend: calm, direct, helpful
- Not performative, not cringe
- Short paragraphs (2-4 lines each)
- Max 4 bullet points if needed
- No headings or markdown
- Correct grammar in target language

============================================================
OUTPUT
============================================================

Produce only the final chat message. No JSON. No explanation.`;

// ============================================================================
// ANALYSIS OBJECT VALIDATION
// ============================================================================

export interface AnalysisValidationResult {
  isValid: boolean;
  issues: string[];
  shouldRegenerate: boolean;
}

/**
 * Validate an Analysis Object against payload data
 */
export function validateAnalysisObject(
  analysis: AnalysisObject,
  expectedLanguage: string,
  payloadKeys: Set<string>,
  payloadNumbers: Set<string>
): AnalysisValidationResult {
  const issues: string[] = [];
  
  // V1: Language check
  if (analysis.meta.output_language !== expectedLanguage) {
    issues.push(`Language mismatch: expected ${expectedLanguage}, got ${analysis.meta.output_language}`);
  }
  
  // V2: Fact keys must exist in payload
  for (const claim of analysis.facts.summary) {
    for (const key of claim.fact_keys) {
      if (!isKeyInPayload(key, payloadKeys)) {
        issues.push(`Fact key "${key}" not found in payload (claim: "${claim.claim.slice(0, 30)}...")`);
      }
    }
  }
  
  for (const metric of analysis.facts.metrics) {
    for (const key of metric.fact_keys) {
      if (!isKeyInPayload(key, payloadKeys)) {
        issues.push(`Metric fact key "${key}" not found in payload (metric: ${metric.label})`);
      }
    }
  }
  
  // V3: Numbers must be grounded in payload (if requires_data)
  if (analysis.meta.requires_data && payloadNumbers.size > 0) {
    // Collect all numbers from the analysis
    const analysisNumbers = new Set<string>();
    
    for (const claim of analysis.facts.summary) {
      claim.numbers.forEach(n => analysisNumbers.add(n));
    }
    for (const metric of analysis.facts.metrics) {
      analysisNumbers.add(metric.value);
    }
    
    // Check each is grounded
    for (const num of analysisNumbers) {
      const cleanNum = num.replace(/[,$%]/g, '');
      if (!isNumberInPayload(cleanNum, payloadNumbers)) {
        issues.push(`Number "${num}" not grounded in payload`);
      }
    }
  }
  
  // V4: If requires_data but missing critical modules, confidence must be low
  if (analysis.meta.requires_data && analysis.coverage.missing_modules.length > 0) {
    if (analysis.meta.confidence !== 'low' && analysis.facts.metrics.length > 0) {
      issues.push('Has missing modules and metrics but confidence is not "low"');
    }
  }
  
  // V5: No empty takeaway if data is available
  if (analysis.meta.requires_data && 
      analysis.coverage.available_modules.length > 0 && 
      !analysis.interpretation.takeaway) {
    issues.push('Takeaway is empty but data is available');
  }
  
  const shouldRegenerate = issues.some(i => 
    i.includes('not found in payload') || 
    i.includes('not grounded') ||
    i.includes('Language mismatch')
  );
  
  if (issues.length > 0) {
    logger.warn('🎨 Analysis validation issues', { issueCount: issues.length, issues });
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    shouldRegenerate,
  };
}

function isKeyInPayload(key: string, payloadKeys: Set<string>): boolean {
  if (payloadKeys.size === 0) return true; // No payload to check against
  
  // Allow partial path matches
  const keyBase = key.split('.').slice(0, 2).join('.');
  
  for (const pKey of payloadKeys) {
    if (pKey === key || pKey.startsWith(key + '.') || key.startsWith(pKey + '.') || pKey === keyBase) {
      return true;
    }
  }
  return false;
}

function isNumberInPayload(num: string, payloadNumbers: Set<string>): boolean {
  if (payloadNumbers.size === 0) return true; // No payload to check against
  
  const cleanNum = parseFloat(num);
  if (isNaN(cleanNum)) return true; // Not a number
  
  for (const pNum of payloadNumbers) {
    const cleanPNum = parseFloat(pNum);
    if (isNaN(cleanPNum)) continue;
    
    // Allow small differences (rounding)
    const diff = Math.abs(cleanNum - cleanPNum);
    if (diff < 1 || diff / cleanPNum < 0.02) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// ANALYSIS OBJECT PARSER
// ============================================================================

/**
 * Parse Analysis Object from raw JSON string
 */
export function parseAnalysisObject(raw: string): AnalysisObject | null {
  try {
    let jsonStr = raw.trim();
    
    // Remove markdown code fences if present
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate required top-level keys
    if (!parsed.meta || !parsed.facts || !parsed.interpretation || !parsed.coverage || !parsed.constraints) {
      logger.error('❌ Analysis Object missing required keys');
      return null;
    }
    
    // Set defaults for missing fields
    return {
      meta: {
        output_language: parsed.meta.output_language || 'en',
        intent: parsed.meta.intent || 'OTHER',
        requires_data: Boolean(parsed.meta.requires_data),
        confidence: parsed.meta.confidence || 'medium',
        timeframe: parsed.meta.timeframe || 'unknown',
        resolved_token: parsed.meta.resolved_token || null,
      },
      facts: {
        summary: Array.isArray(parsed.facts.summary) ? parsed.facts.summary : [],
        metrics: Array.isArray(parsed.facts.metrics) ? parsed.facts.metrics : [],
      },
      interpretation: {
        takeaway: parsed.interpretation.takeaway || '',
        drivers: Array.isArray(parsed.interpretation.drivers) ? parsed.interpretation.drivers : [],
        risks: Array.isArray(parsed.interpretation.risks) ? parsed.interpretation.risks : [],
        invalidations: Array.isArray(parsed.interpretation.invalidations) ? parsed.interpretation.invalidations : [],
      },
      coverage: {
        available_modules: Array.isArray(parsed.coverage.available_modules) ? parsed.coverage.available_modules : [],
        missing_modules: Array.isArray(parsed.coverage.missing_modules) ? parsed.coverage.missing_modules : [],
        freshness_seconds: parsed.coverage.freshness_seconds || {},
      },
      constraints: {
        max_bullets: parsed.constraints.max_bullets ?? 4,
        max_questions: parsed.constraints.max_questions ?? 1,
        no_menu_questions: parsed.constraints.no_menu_questions ?? true,
        no_new_facts_in_render: parsed.constraints.no_new_facts_in_render ?? true,
      },
    };
  } catch (error: any) {
    logger.error('❌ Failed to parse Analysis Object', { error: error.message, raw: raw.slice(0, 100) });
    return null;
  }
}

// ============================================================================
// TWO-PASS PIPELINE
// ============================================================================

export interface StyleRealizerInput {
  userMessage: string;
  userLanguage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  payloads: string; // Formatted payload string
  payloadKeys: Set<string>;
  payloadNumbers: Set<string>;
  resolvedToken?: {
    chain: string;
    address: string;
    symbol: string;
  } | null;
}

export interface StyleRealizerOutput {
  success: boolean;
  finalAnswer: string;
  analysisObject: AnalysisObject | null;
  validation: AnalysisValidationResult | null;
  metadata: {
    mode: 'two-pass' | 'single-pass';
    pass1LatencyMs: number;
    pass2LatencyMs: number;
    totalLatencyMs: number;
    wasRegenerated: boolean;
  };
  error?: string;
}

/**
 * Execute the two-pass Style Realizer pipeline (MODE 1 - RECOMMENDED)
 */
export async function executeTwoPassPipeline(
  client: OpenAI,
  model: string,
  input: StyleRealizerInput
): Promise<StyleRealizerOutput> {
  const startTime = Date.now();
  let pass1Latency = 0;
  let pass2Latency = 0;
  let wasRegenerated = false;
  
  try {
    // =========================================================================
    // PASS 1: Generate Analysis Object
    // =========================================================================
    const pass1Start = Date.now();
    
    const pass1Messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildPass1Prompt(input) },
    ];
    
    // Add conversation history
    if (input.conversationHistory) {
      for (const msg of input.conversationHistory.slice(-4)) {
        pass1Messages.push({ role: msg.role, content: msg.content });
      }
    }
    
    // Add user message
    pass1Messages.push({ role: 'user', content: input.userMessage });
    
    let pass1Response = await client.chat.completions.create({
      model,
      messages: pass1Messages,
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });
    
    let rawAnalysis = pass1Response.choices[0]?.message?.content || '';
    let analysisObject = parseAnalysisObject(rawAnalysis);
    
    pass1Latency = Date.now() - pass1Start;
    
    if (!analysisObject) {
      return {
        success: false,
        finalAnswer: 'I encountered an error processing your request.',
        analysisObject: null,
        validation: null,
        metadata: { mode: 'two-pass', pass1LatencyMs: pass1Latency, pass2LatencyMs: 0, totalLatencyMs: Date.now() - startTime, wasRegenerated: false },
        error: 'Failed to parse Analysis Object',
      };
    }
    
    // =========================================================================
    // VALIDATE Analysis Object
    // =========================================================================
    let validation = validateAnalysisObject(
      analysisObject,
      input.userLanguage,
      input.payloadKeys,
      input.payloadNumbers
    );
    
    // Retry if validation requires regeneration
    if (validation.shouldRegenerate) {
      wasRegenerated = true;
      
      logger.warn('🎨 Analysis Object validation failed, regenerating', {
        issues: validation.issues.slice(0, 3),
      });
      
      // Regenerate with enforcement
      const enforcementMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { 
          role: 'system', 
          content: `${ANALYSIS_GENERATOR_PROMPT}\n\n[ENFORCEMENT]\nYour previous analysis had issues:\n${validation.issues.join('\n')}\n\nFix these issues. Output language must be: ${input.userLanguage}` 
        },
        { role: 'user', content: input.userMessage },
      ];
      
      pass1Response = await client.chat.completions.create({
        model,
        messages: enforcementMessages,
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });
      
      rawAnalysis = pass1Response.choices[0]?.message?.content || '';
      analysisObject = parseAnalysisObject(rawAnalysis);
      
      if (analysisObject) {
        validation = validateAnalysisObject(
          analysisObject,
          input.userLanguage,
          input.payloadKeys,
          input.payloadNumbers
        );
      }
    }
    
    if (!analysisObject) {
      return {
        success: false,
        finalAnswer: 'I encountered an error analyzing your request.',
        analysisObject: null,
        validation,
        metadata: { mode: 'two-pass', pass1LatencyMs: pass1Latency, pass2LatencyMs: 0, totalLatencyMs: Date.now() - startTime, wasRegenerated },
        error: 'Analysis Object still invalid after retry',
      };
    }
    
    // =========================================================================
    // PASS 2: Render Chat Message
    // =========================================================================
    const pass2Start = Date.now();
    
    const pass2Messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: STYLE_REALIZER_PROMPT },
      { 
        role: 'user', 
        content: `[ANALYSIS OBJECT]\n${JSON.stringify(analysisObject, null, 2)}\n\n[ORIGINAL USER MESSAGE]\n${input.userMessage}` 
      },
    ];
    
    const pass2Response = await client.chat.completions.create({
      model,
      messages: pass2Messages,
      temperature: 0.6,
      max_tokens: 600,
    });
    
    let finalAnswer = pass2Response.choices[0]?.message?.content || '';
    
    pass2Latency = Date.now() - pass2Start;
    
    // =========================================================================
    // POST-RENDER VALIDATION
    // =========================================================================
    
    // Check question count
    const questionCount = (finalAnswer.match(/\?/g) || []).length;
    if (questionCount > analysisObject.constraints.max_questions) {
      // Auto-fix: keep only last question
      const parts = finalAnswer.split('?');
      if (parts.length > 2) {
        const last = parts.pop();
        finalAnswer = parts.join('.') + '?' + last;
        finalAnswer = finalAnswer.replace(/\.+/g, '.').replace(/\.\?/g, '?');
      }
    }
    
    // Remove any JSON that leaked through
    if (finalAnswer.includes('{') && finalAnswer.includes('"meta"')) {
      logger.warn('🎨 JSON leaked into render output, extracting text');
      // Try to find any natural text before or after JSON
      const beforeJson = finalAnswer.split('{')[0].trim();
      if (beforeJson.length > 10) {
        finalAnswer = beforeJson;
      } else {
        finalAnswer = analysisObject.interpretation.takeaway || 'Let me check that for you.';
      }
    }
    
    return {
      success: true,
      finalAnswer: finalAnswer.trim(),
      analysisObject,
      validation,
      metadata: {
        mode: 'two-pass',
        pass1LatencyMs: pass1Latency,
        pass2LatencyMs: pass2Latency,
        totalLatencyMs: Date.now() - startTime,
        wasRegenerated,
      },
    };
    
  } catch (error: any) {
    logger.error('❌ Style Realizer pipeline failed', { error: error.message });
    
    return {
      success: false,
      finalAnswer: 'I encountered an error. Please try again.',
      analysisObject: null,
      validation: null,
      metadata: {
        mode: 'two-pass',
        pass1LatencyMs: pass1Latency,
        pass2LatencyMs: pass2Latency,
        totalLatencyMs: Date.now() - startTime,
        wasRegenerated,
      },
      error: error.message,
    };
  }
}

/**
 * Build Pass 1 prompt with session context
 */
function buildPass1Prompt(input: StyleRealizerInput): string {
  let prompt = ANALYSIS_GENERATOR_PROMPT;
  
  // Add session directives
  prompt += `\n\n[SESSION DIRECTIVES]
output_language = ${input.userLanguage}
resolved_token = ${input.resolvedToken ? `${input.resolvedToken.chain}/${input.resolvedToken.address?.slice(0, 10)}... (${input.resolvedToken.symbol})` : 'NONE'}

[PAYLOADS]
${input.payloads || '(no payloads provided)'}`;
  
  return prompt;
}

// ============================================================================
// SINGLE-PASS MODE (MODE 2 - CHEAPER)
// ============================================================================

export const SINGLE_PASS_PROMPT = `[COINET SINGLE-PASS RESPONSE]

You must output a JSON object with TWO sections:
1) "analysis" - the Analysis Object (structured)
2) "final_answer" - the rendered chat message (human text)

The final_answer may ONLY use facts from the analysis section.
Do not add new facts, numbers, or claims in final_answer.

${ANALYSIS_GENERATOR_PROMPT}

After producing the analysis, add:
"final_answer": "<human chat message following Style Realizer rules>"

Style Realizer rules:
- Start with 1 short human reaction line
- Give main takeaway in plain language
- Max 3 key metrics (from analysis.facts.metrics)
- Mention missing coverage if relevant
- No menus, no meta phrases
- Max 1 question mark
- Correct language throughout`;

/**
 * Execute single-pass pipeline (MODE 2 - cheaper but less safe)
 */
export async function executeSinglePassPipeline(
  client: OpenAI,
  model: string,
  input: StyleRealizerInput
): Promise<StyleRealizerOutput> {
  const startTime = Date.now();
  
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSinglePassPrompt(input) },
    ];
    
    if (input.conversationHistory) {
      for (const msg of input.conversationHistory.slice(-4)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    
    messages.push({ role: 'user', content: input.userMessage });
    
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });
    
    const rawContent = response.choices[0]?.message?.content || '';
    
    // Parse combined response
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return {
        success: false,
        finalAnswer: 'I encountered an error processing your request.',
        analysisObject: null,
        validation: null,
        metadata: { mode: 'single-pass', pass1LatencyMs: Date.now() - startTime, pass2LatencyMs: 0, totalLatencyMs: Date.now() - startTime, wasRegenerated: false },
        error: 'Failed to parse single-pass response',
      };
    }
    
    // Extract analysis and final_answer
    const analysisObject = parsed.analysis ? parseAnalysisObject(JSON.stringify(parsed.analysis)) : null;
    const finalAnswer = parsed.final_answer || analysisObject?.interpretation.takeaway || '';
    
    // Validate
    const validation = analysisObject 
      ? validateAnalysisObject(analysisObject, input.userLanguage, input.payloadKeys, input.payloadNumbers)
      : null;
    
    return {
      success: Boolean(finalAnswer),
      finalAnswer,
      analysisObject,
      validation,
      metadata: {
        mode: 'single-pass',
        pass1LatencyMs: Date.now() - startTime,
        pass2LatencyMs: 0,
        totalLatencyMs: Date.now() - startTime,
        wasRegenerated: false,
      },
    };
    
  } catch (error: any) {
    return {
      success: false,
      finalAnswer: 'I encountered an error. Please try again.',
      analysisObject: null,
      validation: null,
      metadata: { mode: 'single-pass', pass1LatencyMs: 0, pass2LatencyMs: 0, totalLatencyMs: Date.now() - startTime, wasRegenerated: false },
      error: error.message,
    };
  }
}

function buildSinglePassPrompt(input: StyleRealizerInput): string {
  let prompt = SINGLE_PASS_PROMPT;
  
  prompt += `\n\n[SESSION DIRECTIVES]
output_language = ${input.userLanguage}
resolved_token = ${input.resolvedToken ? `${input.resolvedToken.chain}/${input.resolvedToken.address?.slice(0, 10)}... (${input.resolvedToken.symbol})` : 'NONE'}

[PAYLOADS]
${input.payloads || '(no payloads provided)'}`;
  
  return prompt;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ANALYSIS_GENERATOR_PROMPT as COINET_ANALYSIS_GENERATOR_PROMPT,
  STYLE_REALIZER_PROMPT as COINET_STYLE_REALIZER_PROMPT,
  SINGLE_PASS_PROMPT as COINET_SINGLE_PASS_PROMPT,
};
