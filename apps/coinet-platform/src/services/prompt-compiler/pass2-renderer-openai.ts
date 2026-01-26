/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎨 PASS-2 OPENAI RENDERER — MAKE IT HUMAN                                ║
 * ║                                                                               ║
 * ║   Renders FinalInsightObject into natural chat text.                         ║
 * ║   This is a STYLE REALIZER, not an analyst.                                  ║
 * ║                                                                               ║
 * ║   KEY PRINCIPLES:                                                             ║
 * ║   - NO new facts (only renders what's in FinalInsightObject)                 ║
 * ║   - Human tone ("trader friend" vibe)                                        ║
 * ║   - Language-locked (matches request.language)                               ║
 * ║   - No menu questions, no bot phrases                                        ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, ChatGPT-powered                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import OpenAI from 'openai';
import {
  type FinalInsightObject,
  interpretDisagreement,
  summarizeCoverage,
} from './insight-aggregator';

// ============================================================================
// FEATURE FLAG
// ============================================================================

export const ENABLE_RENDERER_OPENAI = process.env.ENABLE_RENDERER_OPENAI !== 'false';

// ============================================================================
// TYPES
// ============================================================================

export type ResponseModeCap = 'S' | 'M' | 'L';

export interface RendererInput {
  finalInsight: FinalInsightObject;
  userMessage: string;
  responseModeCap: ResponseModeCap;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface RendererEnvelope {
  output_language: string;
  facts_used: string[];
  numbers_used: string[];
  asked_question: boolean;
  final_answer: string;
}

export interface RendererOutput {
  success: boolean;
  envelope: RendererEnvelope | null;
  validatedAnswer: string | null;
  metadata: {
    latencyMs: number;
    wasRegenerated: boolean;
    model: string;
    validationIssues: string[];
  };
  error?: string;
}

// ============================================================================
// RENDERER PROMPT
// ============================================================================

export const PASS2_RENDERER_PROMPT = `[SYSTEM: COINET_PASS2_RENDERER — STYLE REALIZER v1.0]

ROLE
You are a Pass-2 Renderer. You turn structured analysis into natural chat text.
You DO NOT analyze. You DO NOT add facts. You RENDER what's given.

═══════════════════════════════════════════════════════════════════════════════
CORE RULES (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

1) NO NEW FACTS
You may ONLY mention facts/numbers present in the FinalInsightObject.
If you want to say a number, it MUST be in the insight object.
If it's not there, you cannot say it.

2) LANGUAGE LOCK
Output language MUST match meta.language.
- If meta.language is "de", write German only.
- If "es", write Spanish only.
- Never mix languages.

3) NO MENU QUESTIONS
NEVER ask "Want A or B?", "Vibe check or deep dive?", "Shall I elaborate?"
You may ask ONE clarifying question ONLY IF:
- Token is ambiguous (one_clarifier exists)
- Critical data is missing and you need user input

4) HUMAN TONE
Write like a knowledgeable trader friend, not a bot.
- No "As an AI..." or "Based on my analysis..."
- No bullet point lists in chat (use flowing prose)
- Short sentences. Direct. Like texting a smart friend.

5) LENGTH CAPS
S (short): 1-3 sentences. Quick take.
M (medium): 3-6 sentences. Main points.
L (long): 6-10 sentences. Full breakdown.

═══════════════════════════════════════════════════════════════════════════════
FORBIDDEN PHRASES (WILL CAUSE REJECTION)
═══════════════════════════════════════════════════════════════════════════════

- "As an AI..."
- "I don't have real-time data..."
- "Based on my training..."
- "I cannot provide financial advice..."
- "Please note that..."
- "It's important to remember..."
- "Here's what I found..."
- "Let me break this down..."
- "Would you like me to..."
- "Shall I elaborate on..."
- "Want a deeper dive?"
- Any variation of "vibe check or numbers?"

═══════════════════════════════════════════════════════════════════════════════
HANDLING MISSING DATA
═══════════════════════════════════════════════════════════════════════════════

If unknowns[] is non-empty or coverage shows missing modules:
- Mention it naturally: "Don't have holder data on this one" or "Keine Sicherheitsinfos verfügbar"
- Don't apologize excessively. State the limitation, move on.

If disagreement_meter >= 50:
- Acknowledge mixed signals: "Research is showing mixed views here" or "Die Signale sind gemischt"
- Recommend caution or refresh.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON ENVELOPE)
═══════════════════════════════════════════════════════════════════════════════

{
  "output_language": "<must match meta.language>",
  "facts_used": ["evidence.key1", "evidence.key2"],
  "numbers_used": ["12.5", "3.2M", "45%"],
  "asked_question": false,
  "final_answer": "<your human-readable chat message>"
}

RULES FOR ENVELOPE:
- facts_used: List all evidence keys you referenced (from drivers/risks evidence_keys)
- numbers_used: List every specific number in your final_answer (prices, percentages, volumes)
- asked_question: true ONLY if final_answer contains a question mark
- final_answer: The actual chat text to show the user

═══════════════════════════════════════════════════════════════════════════════
EXAMPLES (BY LANGUAGE)
═══════════════════════════════════════════════════════════════════════════════

ENGLISH EXAMPLE (M):
{
  "output_language": "en",
  "facts_used": ["evidence.dexscreener.price", "evidence.dexscreener.volume_24h"],
  "numbers_used": ["0.042", "2.3M"],
  "asked_question": false,
  "final_answer": "Sitting at $0.042 with decent volume ($2.3M in 24h). Main driver looks like the recent listing, but liquidity's thin so entries/exits get messy. Not seeing security red flags. If you're in, keep size small — this kind of setup can dump fast on any whale move."
}

GERMAN EXAMPLE (M):
{
  "output_language": "de",
  "facts_used": ["evidence.dexscreener.price", "evidence.security.risk_level"],
  "numbers_used": ["0.042"],
  "asked_question": false,
  "final_answer": "Steht bei $0.042, Liquidität ist dünn. Keine großen Security-Flags, aber bei so jungen Tokens ist immer Vorsicht geboten. Wenn du rein willst, kleine Position — kann schnell kippen bei Whale-Bewegungen."
}

SPANISH EXAMPLE (S):
{
  "output_language": "es",
  "facts_used": ["evidence.dexscreener.price"],
  "numbers_used": ["0.042"],
  "asked_question": false,
  "final_answer": "A $0.042 ahora. Liquidez baja, así que cuidado con el slippage si entras."
}

END PROMPT.`;

// ============================================================================
// BUILD CONTEXT FOR RENDERER
// ============================================================================

function buildRendererContext(input: RendererInput): string {
  const { finalInsight, userMessage, responseModeCap } = input;
  
  // Build evidence keys list from all drivers and risks
  const allEvidenceKeys = new Set<string>();
  for (const driver of finalInsight.drivers) {
    driver.evidence_keys.forEach(k => allEvidenceKeys.add(k));
  }
  for (const risk of finalInsight.risks) {
    risk.evidence_keys.forEach(k => allEvidenceKeys.add(k));
  }
  for (const catalyst of finalInsight.catalysts_next) {
    catalyst.evidence_keys.forEach(k => allEvidenceKeys.add(k));
  }
  
  // Build disagreement context
  const disagreementContext = interpretDisagreement(finalInsight.disagreement_meter);
  
  // Build coverage summary
  const coverageSummary = summarizeCoverage(finalInsight.coverage, finalInsight.meta.language);
  
  return `[RENDER REQUEST]
Language: ${finalInsight.meta.language}
Response Length: ${responseModeCap}
User Message: "${userMessage}"

[FINAL INSIGHT OBJECT]
Asset: ${finalInsight.meta.asset_focus.symbol || 'unknown'} on ${finalInsight.meta.asset_focus.chain}
Overall Confidence: ${finalInsight.overall_confidence}
Disagreement: ${finalInsight.disagreement_meter}/100 (${disagreementContext.level})
${disagreementContext.message ? `Disagreement Note: ${disagreementContext.message}` : ''}
${coverageSummary ? `Coverage Note: ${coverageSummary}` : ''}
${finalInsight.meta.one_clarifier ? `MUST ASK: ${finalInsight.meta.one_clarifier}` : ''}

[DRIVERS]
${finalInsight.drivers.map(d => `- ${d.topic} (${d.agreement}, ${d.confidence}): ${d.summary}`).join('\n')}

[RISKS]
${finalInsight.risks.map(r => `- ${r.risk} (${r.agreement}, ${r.confidence}): ${r.why}`).join('\n')}

[CATALYSTS TO WATCH]
${finalInsight.catalysts_next.map(c => `- ${c.topic}: ${c.why_it_matters}`).join('\n')}

[SCENARIOS]
Bull: ${finalInsight.scenarios.bull}
Base: ${finalInsight.scenarios.base}
Bear: ${finalInsight.scenarios.bear}

[UNKNOWNS]
${finalInsight.unknowns.length > 0 ? finalInsight.unknowns.join(', ') : 'none'}

[AVAILABLE EVIDENCE KEYS]
${[...allEvidenceKeys].join(', ')}

[TASK]
Render a natural chat response in ${finalInsight.meta.language}.
Length: ${responseModeCap === 'S' ? '1-3 sentences' : responseModeCap === 'M' ? '3-6 sentences' : '6-10 sentences'}
Output JSON envelope only.`;
}

// ============================================================================
// ENVELOPE VALIDATION
// ============================================================================

interface EnvelopeValidation {
  isValid: boolean;
  issues: string[];
  shouldRegenerate: boolean;
}

function validateEnvelope(
  envelope: RendererEnvelope,
  expectedLanguage: string,
  finalInsight: FinalInsightObject
): EnvelopeValidation {
  const issues: string[] = [];
  
  // V1: Language match
  if (envelope.output_language !== expectedLanguage) {
    issues.push(`Language mismatch: expected ${expectedLanguage}, got ${envelope.output_language}`);
  }
  
  // V2: Check language of actual text (basic heuristic)
  const text = envelope.final_answer.toLowerCase();
  const germanWords = ['und', 'der', 'die', 'das', 'ist', 'nicht', 'bei', 'wenn', 'aber'];
  const spanishWords = ['que', 'con', 'por', 'para', 'una', 'pero', 'más', 'como'];
  const englishWords = ['the', 'and', 'for', 'but', 'with', 'this', 'that', 'are'];
  
  const germanCount = germanWords.filter(w => text.includes(` ${w} `)).length;
  const spanishCount = spanishWords.filter(w => text.includes(` ${w} `)).length;
  const englishCount = englishWords.filter(w => text.includes(` ${w} `)).length;
  
  if (expectedLanguage === 'de' && englishCount > germanCount + 2) {
    issues.push('Text appears to be English but expected German');
  }
  if (expectedLanguage === 'es' && englishCount > spanishCount + 2) {
    issues.push('Text appears to be English but expected Spanish');
  }
  if (expectedLanguage === 'en' && (germanCount > englishCount || spanishCount > englishCount)) {
    issues.push('Text appears to be non-English but expected English');
  }
  
  // V3: Question count
  const questionMarks = (envelope.final_answer.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    issues.push(`Multiple questions (${questionMarks}) — max 1 allowed`);
  }
  if (envelope.asked_question !== (questionMarks > 0)) {
    issues.push('asked_question field does not match actual question presence');
  }
  
  // V4: Forbidden phrases
  const forbiddenPhrases = [
    'as an ai',
    'as a language model',
    'i don\'t have real-time',
    'based on my training',
    'i cannot provide financial advice',
    'please note that',
    'it\'s important to remember',
    'here\'s what i found',
    'let me break this down',
    'would you like me to',
    'shall i elaborate',
    'want a deeper dive',
    'vibe check or',
    'vibe or numbers',
  ];
  
  for (const phrase of forbiddenPhrases) {
    if (text.includes(phrase)) {
      issues.push(`Contains forbidden phrase: "${phrase}"`);
    }
  }
  
  // V5: Numbers grounding
  for (const num of envelope.numbers_used) {
    if (!envelope.final_answer.includes(num)) {
      issues.push(`numbers_used contains "${num}" but it's not in final_answer`);
    }
  }
  
  // V6: Check for numbers in text that aren't listed
  const numbersInText = envelope.final_answer.match(/\$?[\d,]+\.?\d*[%MKB]?/g) || [];
  for (const foundNum of numbersInText) {
    const cleanNum = foundNum.replace(/[$,]/g, '');
    // Allow small numbers and common patterns
    if (parseFloat(cleanNum) > 10) {
      const isListed = envelope.numbers_used.some(n => 
        cleanNum.includes(n.replace(/[$,]/g, '')) || n.replace(/[$,]/g, '').includes(cleanNum)
      );
      if (!isListed) {
        issues.push(`Number "${foundNum}" in text not listed in numbers_used`);
      }
    }
  }
  
  const shouldRegenerate = issues.some(i => 
    i.includes('Language mismatch') ||
    i.includes('appears to be') ||
    i.includes('forbidden phrase') ||
    i.includes('Multiple questions')
  );
  
  return {
    isValid: issues.length === 0,
    issues,
    shouldRegenerate,
  };
}

// ============================================================================
// PARSE ENVELOPE
// ============================================================================

function parseEnvelope(raw: string): RendererEnvelope | null {
  try {
    let jsonStr = raw.trim();
    
    // Remove markdown code fences
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      output_language: parsed.output_language || 'en',
      facts_used: Array.isArray(parsed.facts_used) ? parsed.facts_used : [],
      numbers_used: Array.isArray(parsed.numbers_used) ? parsed.numbers_used : [],
      asked_question: Boolean(parsed.asked_question),
      final_answer: String(parsed.final_answer || ''),
    };
  } catch (error: any) {
    logger.error('❌ Failed to parse renderer envelope', { error: error.message });
    return null;
  }
}

// ============================================================================
// ENFORCEMENT PROMPT
// ============================================================================

function buildEnforcementPrompt(issues: string[], language: string): string {
  return `${PASS2_RENDERER_PROMPT}

[ENFORCEMENT MODE]
Your previous output had validation issues:
${issues.map(i => `- ${i}`).join('\n')}

Fix these issues:
- Language MUST be ${language}
- NO forbidden phrases
- MAX 1 question
- List ALL numbers in numbers_used

Produce corrected JSON envelope now.`;
}

// ============================================================================
// MAIN RENDERER FUNCTION
// ============================================================================

export async function executeRenderer(
  client: OpenAI,
  model: string,
  input: RendererInput
): Promise<RendererOutput> {
  const startTime = Date.now();
  let wasRegenerated = false;
  const validationIssues: string[] = [];
  
  // Check feature flag
  if (!ENABLE_RENDERER_OPENAI) {
    // Fall back to local rendering
    return fallbackLocalRender(input, startTime);
  }
  
  try {
    const context = buildRendererContext(input);
    
    // Build messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: PASS2_RENDERER_PROMPT },
    ];
    
    // Add conversation history if available (last 2 turns)
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      const recentHistory = input.conversationHistory.slice(-4);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    
    messages.push({ role: 'user', content: context });
    
    // First attempt
    let response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.6, // Slightly creative for natural voice
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });
    
    let rawContent = response.choices[0]?.message?.content || '';
    let envelope = parseEnvelope(rawContent);
    
    if (!envelope) {
      return {
        success: false,
        envelope: null,
        validatedAnswer: null,
        metadata: { latencyMs: Date.now() - startTime, wasRegenerated: false, model, validationIssues: ['Failed to parse envelope'] },
        error: 'Failed to parse renderer envelope',
      };
    }
    
    // Validate
    let validation = validateEnvelope(envelope, input.finalInsight.meta.language, input.finalInsight);
    validationIssues.push(...validation.issues);
    
    // Retry if validation fails
    if (validation.shouldRegenerate) {
      wasRegenerated = true;
      logger.warn('🎨 Renderer validation failed, regenerating', {
        issues: validation.issues.slice(0, 3),
      });
      
      const enforcementPrompt = buildEnforcementPrompt(validation.issues, input.finalInsight.meta.language);
      
      response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: enforcementPrompt },
          { role: 'user', content: context },
        ],
        temperature: 0.4,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });
      
      rawContent = response.choices[0]?.message?.content || '';
      envelope = parseEnvelope(rawContent);
      
      if (envelope) {
        validation = validateEnvelope(envelope, input.finalInsight.meta.language, input.finalInsight);
        validationIssues.push(...validation.issues);
      }
    }
    
    if (!envelope) {
      return fallbackLocalRender(input, startTime);
    }
    
    return {
      success: validation.isValid || !validation.shouldRegenerate,
      envelope,
      validatedAnswer: envelope.final_answer,
      metadata: {
        latencyMs: Date.now() - startTime,
        wasRegenerated,
        model,
        validationIssues,
      },
    };
    
  } catch (error: any) {
    logger.error('❌ OpenAI Renderer failed', { error: error.message });
    
    // Fall back to local rendering
    return fallbackLocalRender(input, startTime);
  }
}

// ============================================================================
// FALLBACK LOCAL RENDERER
// ============================================================================

function fallbackLocalRender(input: RendererInput, startTime: number): RendererOutput {
  const { finalInsight, responseModeCap } = input;
  const lang = finalInsight.meta.language;
  
  // Build a simple but human answer locally
  const parts: string[] = [];
  const numbersUsed: string[] = [];
  const factsUsed: string[] = [];
  
  // Asset intro
  if (finalInsight.meta.asset_focus.symbol) {
    const templates: Record<string, string> = {
      en: `${finalInsight.meta.asset_focus.symbol} on ${finalInsight.meta.asset_focus.chain}:`,
      de: `${finalInsight.meta.asset_focus.symbol} auf ${finalInsight.meta.asset_focus.chain}:`,
      es: `${finalInsight.meta.asset_focus.symbol} en ${finalInsight.meta.asset_focus.chain}:`,
    };
    parts.push(templates[lang] || templates.en);
  }
  
  // Top driver
  if (finalInsight.drivers.length > 0) {
    const topDriver = finalInsight.drivers[0];
    parts.push(topDriver.summary);
    factsUsed.push(...topDriver.evidence_keys);
    
    // Extract numbers from summary
    const nums = topDriver.summary.match(/\$?[\d,]+\.?\d*[%MKB]?/g) || [];
    numbersUsed.push(...nums);
  }
  
  // Top risk
  if (finalInsight.risks.length > 0 && responseModeCap !== 'S') {
    const topRisk = finalInsight.risks[0];
    const riskTemplates: Record<string, string> = {
      en: `Risk: ${topRisk.why}`,
      de: `Risiko: ${topRisk.why}`,
      es: `Riesgo: ${topRisk.why}`,
    };
    parts.push(riskTemplates[lang] || riskTemplates.en);
    factsUsed.push(...topRisk.evidence_keys);
    
    const nums = topRisk.why.match(/\$?[\d,]+\.?\d*[%MKB]?/g) || [];
    numbersUsed.push(...nums);
  }
  
  // Disagreement note
  if (finalInsight.disagreement_meter >= 50) {
    const disagreementTemplates: Record<string, string> = {
      en: 'Signals are mixed here.',
      de: 'Die Signale sind hier gemischt.',
      es: 'Las señales están mezcladas.',
    };
    parts.push(disagreementTemplates[lang] || disagreementTemplates.en);
  }
  
  // Confidence note for L responses
  if (responseModeCap === 'L' && finalInsight.overall_confidence === 'low') {
    const confTemplates: Record<string, string> = {
      en: 'Confidence is low due to missing data.',
      de: 'Confidence ist niedrig wegen fehlender Daten.',
      es: 'La confianza es baja por falta de datos.',
    };
    parts.push(confTemplates[lang] || confTemplates.en);
  }
  
  // One clarifier
  if (finalInsight.meta.one_clarifier) {
    parts.push(finalInsight.meta.one_clarifier);
  }
  
  const finalAnswer = parts.join(' ').trim() || 'Unable to generate response.';
  
  return {
    success: true,
    envelope: {
      output_language: lang,
      facts_used: [...new Set(factsUsed)],
      numbers_used: [...new Set(numbersUsed)],
      asked_question: finalAnswer.includes('?'),
      final_answer: finalAnswer,
    },
    validatedAnswer: finalAnswer,
    metadata: {
      latencyMs: Date.now() - startTime,
      wasRegenerated: false,
      model: 'local-fallback',
      validationIssues: [],
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PASS2_RENDERER_PROMPT as COINET_PASS2_RENDERER_PROMPT };
