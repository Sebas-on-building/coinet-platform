/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔬 COINET PASS-1 RESEARCH ENGINE                                         ║
 * ║                                                                               ║
 * ║   Structured insight generation from Evidence Packs.                         ║
 * ║   Does NOT speak to users. Produces Insight Packs only.                      ║
 * ║                                                                               ║
 * ║   KEY PRINCIPLES:                                                             ║
 * ║   - Facts come from Evidence Pack (deterministic)                            ║
 * ║   - Insights are interpretations (model-generated)                           ║
 * ║   - Every claim must cite evidence_keys                                      ║
 * ║   - No invented numbers, ever                                                ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, anti-hallucination                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import OpenAI from 'openai';

// ============================================================================
// TYPES: EVIDENCE PACK (INPUT)
// ============================================================================

export interface EvidenceModule {
  ts: number;              // Unix timestamp
  freshness_seconds: number;
  source: string;
  data: Record<string, any>;
}

export interface ResolvedTokenInfo {
  symbol: string | null;
  chain: string;
  address: string | null;
  confidence: number;
  is_ambiguous: boolean;
}

export interface EvidencePack {
  request: {
    user_message: string;
    language: string;
    intent: string;
  };
  resolved_token: ResolvedTokenInfo | null;
  evidence: {
    dexscreener?: EvidenceModule;
    security?: EvidenceModule;
    holders?: EvidenceModule;
    sentiment?: EvidenceModule;
    news?: EvidenceModule;
    derivatives?: EvidenceModule;
    onchain?: EvidenceModule;
    pumpfun?: EvidenceModule;
    smartmoney?: EvidenceModule;
  };
  coverage: {
    available: string[];
    missing: string[];
    freshness_seconds: Record<string, number>;
  };
}

// ============================================================================
// TYPES: INSIGHT PACK (OUTPUT)
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ResearchMode = 'NO_RESEARCH' | 'DUAL_RESEARCH';
export type Timeframe = 'now' | 'today' | '24h' | '7d' | 'unknown';

export interface InsightDriver {
  topic: string;
  summary: string;           // 1-2 sentences max
  evidence_keys: string[];   // Must have at least one
  confidence: ConfidenceLevel;
}

export interface InsightCatalyst {
  topic: string;
  why_it_matters: string;    // 1 sentence max
  evidence_keys: string[];   // May be empty only for future events
  confidence: ConfidenceLevel;
}

export interface InsightSecondOrder {
  if: string;                // Condition, no new numbers
  then: string;              // Effect, no new numbers
  confidence: ConfidenceLevel;
}

export interface InsightRisk {
  risk: string;
  why: string;               // 1-2 sentences max
  evidence_keys: string[];   // Must have at least one
  confidence: ConfidenceLevel;
}

export interface InsightScenarios {
  bull: string;              // Narrative, no new numbers
  base: string;
  bear: string;
}

export interface InsightPackMeta {
  should_run_research: boolean;
  mode: ResearchMode;
  language: string;
  intent: string;
  asset_focus: {
    symbol: string | null;
    chain: string;
    address: string | null;
  };
  timeframe: Timeframe;
  request_refresh: boolean;
  one_clarifier: string | null;
}

export interface InsightPackContent {
  drivers: InsightDriver[];
  catalysts_next: InsightCatalyst[];
  second_order_effects: InsightSecondOrder[];
  risks: InsightRisk[];
  scenarios: InsightScenarios;
  unknowns: string[];
  overall_confidence: ConfidenceLevel;
}

export interface InsightPack {
  meta: InsightPackMeta;
  insight: InsightPackContent;
}

// ============================================================================
// RESEARCH MODE DETECTION
// ============================================================================

const NO_RESEARCH_PATTERNS = [
  // Greetings
  /^(hey|hi|hello|hola|hallo|moin|yo|sup|wassup|salut|ciao|oi)[\s!?.]*$/i,
  // Thanks
  /^(thanks|thank you|thx|danke|gracias|merci|grazie|obrigado)[\s!?.]*$/i,
  // Acknowledgments
  /^(ok|okay|alright|got it|sure|yep|yes|no|nah|nope|cool|nice|great)[\s!?.]*$/i,
  // Simple price checks (without analysis request)
  /^(btc|eth|sol|bitcoin|ethereum|solana)\s*(price)?[\s?]*$/i,
  /^price\s*(of)?\s*\w+[\s?]*$/i,
  // Vague/empty
  /^(news|what's up|whats up|how's it going|how are you)[\s?]*$/i,
];

const DUAL_RESEARCH_PATTERNS = [
  // Token analysis
  /\b(analyze|analysis|analyse|check|review|investigate)\b/i,
  /\b(should i|would you|do you think|what do you think)\s*(buy|sell|hold|long|short|ape)/i,
  /\b(is this|is it)\s*(a )?(rug|scam|safe|legit|good|bad)/i,
  /\b(what's the|whats the)\s*(risk|potential|outlook|prognosis)/i,
  // Market/event analysis
  /\b(why|what happened|what's happening|explain)\b.*\b(dump|pump|crash|moon|move|drop|spike)/i,
  /\b(what happened|what's going on)\s*(today|now|with)/i,
  // Deep comparison
  /\b(compare|versus|vs\.?|pros and cons|tradeoffs|difference between)\b/i,
  // OmniScore / full analysis
  /\b(omniscore|full analysis|deep dive|breakdown)\b/i,
];

/**
 * Determine research mode from user message
 */
export function detectResearchMode(message: string): ResearchMode {
  const trimmed = message.trim();
  
  // Check NO_RESEARCH patterns first
  for (const pattern of NO_RESEARCH_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'NO_RESEARCH';
    }
  }
  
  // Check DUAL_RESEARCH patterns
  for (const pattern of DUAL_RESEARCH_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'DUAL_RESEARCH';
    }
  }
  
  // Default: if message is short and doesn't match research patterns, skip research
  if (trimmed.length < 15 && !trimmed.includes('?')) {
    return 'NO_RESEARCH';
  }
  
  // Default: if has question mark or is longer, probably needs research
  return 'DUAL_RESEARCH';
}

// ============================================================================
// PASS-1 RESEARCH ENGINE PROMPT
// ============================================================================

export const PASS1_RESEARCH_ENGINE_PROMPT = `[SYSTEM: COINET_PASS1_RESEARCH_ENGINE — v1.0]

ROLE
You are a PASS-1 Research Engine inside Coinet. You DO NOT speak to the end user.
Your only job is to produce an "Insight Pack" (structured hypotheses) from an Evidence Pack (deterministic facts).
You never generate chat text. You never generate new facts.

═══════════════════════════════════════════════════════════════════════════════
CORE DEFINITIONS (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════════════════

A) FACTS ("Evidence")
Facts are deterministic values provided in the Evidence Pack payload.
Examples: price, volume, liquidity, age, holders distribution, security flags, funding, OI, liquidations, curated news items, sentiment scores.
Facts MUST be referenced by exact Evidence Pack keys (dot paths like "evidence.dexscreener.price").

B) INSIGHT ("Interpretation")
Insight is model-generated interpretation of the facts:
- drivers: what likely caused the move
- catalysts_next: what could move it next
- second_order_effects: what breaks/moves if X happens
- risks: what could go wrong, with evidence
- scenarios: bull/base/bear narratives (NO new numbers)
- unknowns: explicit missing data that blocks certainty

═══════════════════════════════════════════════════════════════════════════════
RULES THAT WILL CAUSE REJECTION (HARD GATES)
═══════════════════════════════════════════════════════════════════════════════

1) You MUST NOT invent or estimate numeric values (prices, percentages, liquidity, holder concentration, etc.).
2) You MUST NOT infer token properties not present in the Evidence Pack.
   BAD: "3 hours old", "top 10 wallets hold 58%", "creator sold 12%" — unless EXACT values exist in Evidence Pack.
3) You MUST NOT claim "live" or "real-time" knowledge outside Evidence Pack.
4) You MUST NOT output prose, markdown, or "Here's the analysis:". Output JSON only.
5) You MUST NOT leave evidence_keys empty for drivers or risks. If you cannot cite evidence, put the statement in unknowns instead.

═══════════════════════════════════════════════════════════════════════════════
RESEARCH MODE HANDLING
═══════════════════════════════════════════════════════════════════════════════

MODE = "NO_RESEARCH"
When: greetings, small talk, one-liner price checks, vague prompts without asset/timeframe.
Output:
- should_run_research: false
- All insight arrays empty
- one_clarifier only if essential

MODE = "DUAL_RESEARCH"
When: token analysis, decision help, market/event analysis, deep comparisons.
Output: Full Insight Pack with evidence-backed claims.

EVEN IF MODE="DUAL_RESEARCH", set should_run_research=false if:
- Evidence Pack coverage.available is empty or null → unknowns=["No data available"], request_refresh=true
- Token resolution is ambiguous (confidence < 0.85) → one_clarifier="Which chain / contract address?"
- Critical modules missing for the question → unknowns lists what's missing, request_refresh=true

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE KEY RULES (ANTI-HALLUCINATION)
═══════════════════════════════════════════════════════════════════════════════

- Every driver MUST have at least ONE evidence_keys entry.
- Every risk MUST have at least ONE evidence_keys entry.
- catalysts_next MAY have empty evidence_keys ONLY for future events not yet in data (e.g., "upcoming ETF decision").
- second_order_effects are conditional — no evidence_keys required, but NO new numbers allowed.
- If you cannot cite evidence for a claim, move it to unknowns.

═══════════════════════════════════════════════════════════════════════════════
CONFIDENCE SCORING
═══════════════════════════════════════════════════════════════════════════════

Per-item confidence:
- high: Strong evidence, clear pattern
- medium: Partial evidence, reasonable inference
- low: Weak evidence, speculative

overall_confidence rule:
- If ANY critical driver has confidence="low", overall_confidence must be "low"
- If evidence coverage < 50%, overall_confidence must be "low" or "medium"
- Otherwise, use the lowest confidence among top drivers + highest-impact risks

═══════════════════════════════════════════════════════════════════════════════
LENGTH CONSTRAINTS
═══════════════════════════════════════════════════════════════════════════════

- summary fields: 1-2 sentences maximum
- why/why_it_matters fields: 1 sentence maximum
- scenarios: 1-2 sentences each, narrative style
- No bullet lists inside JSON string values
- No markdown formatting inside strings

═══════════════════════════════════════════════════════════════════════════════
LANGUAGE RULE
═══════════════════════════════════════════════════════════════════════════════

- All string values in the Insight Pack MUST be in request.language
- Never mix languages within a single JSON string
- If language is "de", write German. If "es", write Spanish. Etc.

═══════════════════════════════════════════════════════════════════════════════
OUTPUT SCHEMA (STRICT JSON ONLY)
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
      "bull": "<narrative>",
      "base": "<narrative>",
      "bear": "<narrative>"
    },
    "unknowns": ["<missing data or blocked certainty>"],
    "overall_confidence": "high|medium|low"
  }
}

═══════════════════════════════════════════════════════════════════════════════
EXAMPLES (INTERNAL BEHAVIOR)
═══════════════════════════════════════════════════════════════════════════════

Example 1: Greeting
Request: "hey"
→ should_run_research=false, mode="NO_RESEARCH", all arrays empty, one_clarifier=null

Example 2: Ambiguous token
Request: "analyze $PENGUIN" but token resolution confidence=0.72
→ should_run_research=false, one_clarifier="Which chain / contract address?"

Example 3: Missing critical data
Request: "what happened today" but evidence.news is missing
→ should_run_research=false, request_refresh=true, unknowns=["news module missing"]

Example 4: Valid research
Request: "should I buy $XYZ" with full Evidence Pack
→ should_run_research=true, full insight with evidence_keys for each driver/risk

END PROMPT.`;

// ============================================================================
// INSIGHT PACK VALIDATION
// ============================================================================

export interface InsightValidationResult {
  isValid: boolean;
  issues: string[];
  shouldRegenerate: boolean;
}

/**
 * Validate an Insight Pack against the Evidence Pack
 */
export function validateInsightPack(
  insight: InsightPack,
  evidencePack: EvidencePack
): InsightValidationResult {
  const issues: string[] = [];
  
  // Build set of valid evidence keys
  const validKeys = buildValidEvidenceKeys(evidencePack);
  
  // V1: Language match
  if (insight.meta.language !== evidencePack.request.language) {
    issues.push(`Language mismatch: expected ${evidencePack.request.language}, got ${insight.meta.language}`);
  }
  
  // V2: Drivers must have evidence_keys
  for (const driver of insight.insight.drivers) {
    if (!driver.evidence_keys || driver.evidence_keys.length === 0) {
      issues.push(`Driver "${driver.topic}" has no evidence_keys — must cite evidence or move to unknowns`);
    } else {
      // Check keys exist
      for (const key of driver.evidence_keys) {
        if (!isKeyValid(key, validKeys)) {
          issues.push(`Driver "${driver.topic}" cites non-existent key: ${key}`);
        }
      }
    }
  }
  
  // V3: Risks must have evidence_keys
  for (const risk of insight.insight.risks) {
    if (!risk.evidence_keys || risk.evidence_keys.length === 0) {
      issues.push(`Risk "${risk.risk}" has no evidence_keys — must cite evidence or move to unknowns`);
    } else {
      for (const key of risk.evidence_keys) {
        if (!isKeyValid(key, validKeys)) {
          issues.push(`Risk "${risk.risk}" cites non-existent key: ${key}`);
        }
      }
    }
  }
  
  // V4: Check for invented numbers in scenarios
  const scenarioText = `${insight.insight.scenarios.bull} ${insight.insight.scenarios.base} ${insight.insight.scenarios.bear}`;
  const numbersInScenarios = scenarioText.match(/\d+\.?\d*%?/g) || [];
  const evidenceNumbers = extractEvidenceNumbers(evidencePack);
  
  for (const num of numbersInScenarios) {
    const cleanNum = num.replace('%', '');
    if (!isNumberInEvidence(cleanNum, evidenceNumbers)) {
      issues.push(`Scenario contains number "${num}" not found in Evidence Pack`);
    }
  }
  
  // V5: Empty Evidence Pack check
  if (evidencePack.coverage.available.length === 0) {
    if (insight.meta.should_run_research && insight.insight.drivers.length > 0) {
      issues.push('Evidence Pack is empty but research was attempted — should set should_run_research=false');
    }
  }
  
  // V6: Confidence consistency
  const hasLowDriver = insight.insight.drivers.some(d => d.confidence === 'low');
  const hasLowRisk = insight.insight.risks.some(r => r.confidence === 'low');
  if ((hasLowDriver || hasLowRisk) && insight.insight.overall_confidence === 'high') {
    issues.push('overall_confidence is "high" but has low-confidence drivers/risks — should be lower');
  }
  
  const shouldRegenerate = issues.some(i => 
    i.includes('no evidence_keys') || 
    i.includes('non-existent key') ||
    i.includes('Language mismatch') ||
    i.includes('not found in Evidence Pack')
  );
  
  if (issues.length > 0) {
    logger.warn('🔬 Insight Pack validation issues', { issueCount: issues.length, issues });
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    shouldRegenerate,
  };
}

function buildValidEvidenceKeys(pack: EvidencePack): Set<string> {
  const keys = new Set<string>();
  
  for (const [moduleName, moduleData] of Object.entries(pack.evidence)) {
    if (!moduleData) continue;
    
    const addKeys = (obj: any, prefix: string) => {
      if (obj === null || obj === undefined) return;
      
      if (typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = `${prefix}.${key}`;
          keys.add(fullKey);
          addKeys(value, fullKey);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          keys.add(`${prefix}[${index}]`);
          addKeys(item, `${prefix}[${index}]`);
        });
      }
    };
    
    keys.add(`evidence.${moduleName}`);
    addKeys(moduleData.data, `evidence.${moduleName}`);
  }
  
  return keys;
}

function isKeyValid(key: string, validKeys: Set<string>): boolean {
  if (validKeys.size === 0) return true; // No evidence to validate against
  
  // Allow partial matches
  for (const validKey of validKeys) {
    if (validKey === key || validKey.startsWith(key + '.') || key.startsWith(validKey + '.')) {
      return true;
    }
  }
  return false;
}

function extractEvidenceNumbers(pack: EvidencePack): Set<string> {
  const numbers = new Set<string>();
  
  const extract = (obj: any) => {
    if (obj === null || obj === undefined) return;
    
    if (typeof obj === 'number') {
      numbers.add(String(obj));
      numbers.add(String(Math.round(obj)));
      if (obj < 1) {
        numbers.add((obj * 100).toFixed(1)); // For percentages
      }
    } else if (typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        extract(value);
      }
    }
  };
  
  for (const moduleData of Object.values(pack.evidence)) {
    if (moduleData?.data) {
      extract(moduleData.data);
    }
  }
  
  return numbers;
}

function isNumberInEvidence(num: string, evidenceNumbers: Set<string>): boolean {
  if (evidenceNumbers.size === 0) return true;
  
  const cleanNum = parseFloat(num);
  if (isNaN(cleanNum)) return true;
  
  // Small numbers like "1", "2" are often just counts, allow them
  if (cleanNum <= 10 && Number.isInteger(cleanNum)) return true;
  
  for (const evNum of evidenceNumbers) {
    const evClean = parseFloat(evNum);
    if (isNaN(evClean)) continue;
    
    const diff = Math.abs(cleanNum - evClean);
    if (diff < 1 || diff / evClean < 0.05) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// INSIGHT PACK PARSER
// ============================================================================

/**
 * Parse Insight Pack from raw JSON string
 */
export function parseInsightPack(raw: string): InsightPack | null {
  try {
    let jsonStr = raw.trim();
    
    // Remove markdown code fences if present
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate required structure
    if (!parsed.meta || !parsed.insight) {
      logger.error('❌ Insight Pack missing meta or insight');
      return null;
    }
    
    // Set defaults
    return {
      meta: {
        should_run_research: Boolean(parsed.meta.should_run_research),
        mode: parsed.meta.mode || 'NO_RESEARCH',
        language: parsed.meta.language || 'en',
        intent: parsed.meta.intent || 'unknown',
        asset_focus: {
          symbol: parsed.meta.asset_focus?.symbol || null,
          chain: parsed.meta.asset_focus?.chain || 'unknown',
          address: parsed.meta.asset_focus?.address || null,
        },
        timeframe: parsed.meta.timeframe || 'unknown',
        request_refresh: Boolean(parsed.meta.request_refresh),
        one_clarifier: parsed.meta.one_clarifier || null,
      },
      insight: {
        drivers: Array.isArray(parsed.insight.drivers) ? parsed.insight.drivers : [],
        catalysts_next: Array.isArray(parsed.insight.catalysts_next) ? parsed.insight.catalysts_next : [],
        second_order_effects: Array.isArray(parsed.insight.second_order_effects) ? parsed.insight.second_order_effects : [],
        risks: Array.isArray(parsed.insight.risks) ? parsed.insight.risks : [],
        scenarios: {
          bull: parsed.insight.scenarios?.bull || '',
          base: parsed.insight.scenarios?.base || '',
          bear: parsed.insight.scenarios?.bear || '',
        },
        unknowns: Array.isArray(parsed.insight.unknowns) ? parsed.insight.unknowns : [],
        overall_confidence: parsed.insight.overall_confidence || 'low',
      },
    };
  } catch (error: any) {
    logger.error('❌ Failed to parse Insight Pack', { error: error.message, raw: raw.slice(0, 100) });
    return null;
  }
}

// ============================================================================
// RESEARCH ENGINE EXECUTION
// ============================================================================

export interface ResearchEngineInput {
  evidencePack: EvidencePack;
  mode: ResearchMode;
}

export interface ResearchEngineOutput {
  success: boolean;
  insightPack: InsightPack | null;
  validation: InsightValidationResult | null;
  metadata: {
    latencyMs: number;
    wasRegenerated: boolean;
    model: string;
  };
  error?: string;
}

/**
 * Execute Pass-1 Research Engine
 */
export async function executeResearchEngine(
  client: OpenAI,
  model: string,
  input: ResearchEngineInput
): Promise<ResearchEngineOutput> {
  const startTime = Date.now();
  let wasRegenerated = false;
  
  try {
    // Build prompt with Evidence Pack
    const prompt = buildResearchPrompt(input);
    
    // Call LLM
    let response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: PASS1_RESEARCH_ENGINE_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });
    
    let rawContent = response.choices[0]?.message?.content || '';
    let insightPack = parseInsightPack(rawContent);
    
    if (!insightPack) {
      return {
        success: false,
        insightPack: null,
        validation: null,
        metadata: { latencyMs: Date.now() - startTime, wasRegenerated: false, model },
        error: 'Failed to parse Insight Pack',
      };
    }
    
    // Validate
    let validation = validateInsightPack(insightPack, input.evidencePack);
    
    // Retry if validation fails
    if (validation.shouldRegenerate) {
      wasRegenerated = true;
      
      logger.warn('🔬 Insight Pack validation failed, regenerating', {
        issues: validation.issues.slice(0, 3),
      });
      
      const enforcementPrompt = buildEnforcementPrompt(input, validation.issues);
      
      response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: enforcementPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });
      
      rawContent = response.choices[0]?.message?.content || '';
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
      },
    };
    
  } catch (error: any) {
    logger.error('❌ Research Engine failed', { error: error.message });
    
    return {
      success: false,
      insightPack: null,
      validation: null,
      metadata: { latencyMs: Date.now() - startTime, wasRegenerated, model },
      error: error.message,
    };
  }
}

function buildResearchPrompt(input: ResearchEngineInput): string {
  const { evidencePack, mode } = input;
  
  return `[RESEARCH REQUEST]
Mode: ${mode}
Language: ${evidencePack.request.language}
Intent: ${evidencePack.request.intent}
User Message: "${evidencePack.request.user_message}"

[RESOLVED TOKEN]
${JSON.stringify(evidencePack.resolved_token, null, 2)}

[EVIDENCE PACK]
${JSON.stringify(evidencePack.evidence, null, 2)}

[COVERAGE]
Available modules: ${evidencePack.coverage.available.join(', ') || 'none'}
Missing modules: ${evidencePack.coverage.missing.join(', ') || 'none'}
Freshness: ${JSON.stringify(evidencePack.coverage.freshness_seconds)}

[TASK]
Produce an Insight Pack JSON. Follow all rules in the system prompt.
If mode is NO_RESEARCH or data is insufficient, set should_run_research=false.
Output JSON only.`;
}

function buildEnforcementPrompt(input: ResearchEngineInput, issues: string[]): string {
  return `${PASS1_RESEARCH_ENGINE_PROMPT}

[ENFORCEMENT MODE]
Your previous output had validation issues:
${issues.map(i => `- ${i}`).join('\n')}

Fix these issues:
- Every driver/risk MUST have evidence_keys pointing to real Evidence Pack paths
- Do NOT invent numbers not in the Evidence Pack
- If you cannot cite evidence, move the claim to unknowns
- Language must be: ${input.evidencePack.request.language}

Produce corrected Insight Pack JSON now.`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PASS1_RESEARCH_ENGINE_PROMPT as COINET_PASS1_RESEARCH_ENGINE_PROMPT,
};
