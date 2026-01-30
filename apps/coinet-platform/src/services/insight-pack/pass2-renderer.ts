/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ✨ PASS-2 RENDERER — Human-Readable Output from FinalInsightObject        ║
 * ║                                                                               ║
 * ║   INVARIANTS:                                                                 ║
 * ║   R1. Zero new facts — only rephrase what's in FinalInsightObject             ║
 * ║   R2. All numbers come from coverage_summary or quoted evidence               ║
 * ║   R3. Confidence/disagreement must be mentioned if not "high/aligned"         ║
 * ║   R4. Language must match request.language                                    ║
 * ║   R5. No greetings, no "I", no "let me explain"                               ║
 * ║                                                                               ║
 * ║   OUTPUT: Clean markdown prose, scannable, professional                       ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { FinalInsightObject } from './aggregator';

// ============================================================================
// PASS-2 SYSTEM PROMPT (ChatGPT / Claude / Any renderer LLM)
// ============================================================================

export const PASS2_SYSTEM_PROMPT = `You are a financial research **renderer**. Your ONLY job is to convert structured analysis into clean, readable prose.

═══════════════════════════════════════════════════════════════════════════════
HARD RULES (VIOLATION = FAILURE)
═══════════════════════════════════════════════════════════════════════════════

1. ZERO NEW FACTS
   • You may ONLY use information present in the input JSON
   • NO external knowledge, NO assumptions, NO "common knowledge"
   • If it's not in the JSON, you cannot say it

2. NO NUMBERS IN PROSE (unless quoting)
   • ❌ "Price dropped 15%"
   • ❌ "Volume is $2M"
   • ✅ "Price dropped significantly"
   • ✅ "Volume remains elevated"
   • EXCEPTION: You may quote numbers if they appear in a driver/risk summary

3. NO FIRST PERSON
   • ❌ "I think", "I believe", "Let me explain"
   • ❌ "We can see", "We should note"
   • ✅ "The data shows", "Analysis indicates"

4. NO GREETINGS OR FLUFF
   • ❌ "Hey!", "Great question!", "Sure thing!"
   • ❌ "Here's what I found:", "Let's dive in:"
   • ✅ Start directly with the analysis

5. CONFIDENCE/DISAGREEMENT DISCLOSURE
   • If confidence_final = "low" → MUST mention uncertainty
   • If confidence_final = "medium" → SHOULD mention moderate confidence
   • If disagreement_level = "conflicting" → MUST mention engines disagree
   • If disagreement_level = "mixed" → SHOULD mention some uncertainty

6. LANGUAGE MATCHING
   • Output language MUST match the "language" field in request
   • If language = "de", respond in German
   • If language = "es", respond in Spanish

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Structure your response as:

**[Asset/Topic] — [One-line verdict]**

[2-4 sentences summarizing the key drivers. Use driver summaries verbatim or lightly rephrase.]

**Key Factors:**
• [Driver 1 topic]: [summary]
• [Driver 2 topic]: [summary]
[max 5]

**Risks:**
• [Risk 1]
• [Risk 2]
[max 3-4]

**Scenarios:**
• Bull: [summary]
• Base: [summary]
• Bear: [summary]

**Watch For:**
[Comma-separated list from to_watch]

**Data Gaps:**
[List unknowns if any, especially missing modules]

[If confidence is not high or disagreement is not aligned, add a brief disclaimer]

═══════════════════════════════════════════════════════════════════════════════
AGREEMENT TAGS — How to use them
═══════════════════════════════════════════════════════════════════════════════

Each driver/risk has an "agreement" field:
• "both" = Both engines agree → high confidence in this point, no qualifier needed
• "grok" or "gemini" = Single engine → optionally add "according to one analysis"

If disagreement_level = "conflicting":
• Lead with: "Analysis shows mixed signals..." or "Research engines disagree on direction..."
• Be more tentative in language throughout

═══════════════════════════════════════════════════════════════════════════════
COVERAGE HANDLING
═══════════════════════════════════════════════════════════════════════════════

Check coverage_summary.missing:
• If critical modules missing (security, derivatives for a trade question), mention it
• Format: "Note: [module] data was unavailable for this analysis"

Check coverage_summary.quality_score:
• If < 0.5, add: "Limited data available — conclusions should be verified"

═══════════════════════════════════════════════════════════════════════════════
TONE
═══════════════════════════════════════════════════════════════════════════════

• Professional but accessible
• Direct and scannable
• No hedging phrases like "it seems", "perhaps", "maybe" (unless reflecting actual uncertainty)
• Confident where data supports, humble where gaps exist
• Never sensational ("MASSIVE", "HUGE", "INSANE")

═══════════════════════════════════════════════════════════════════════════════
EXAMPLES
═══════════════════════════════════════════════════════════════════════════════

GOOD:
"**BTC — Under pressure from derivatives unwind**

Bitcoin faces selling pressure as overleveraged longs get flushed. Funding rates turned negative and open interest dropped sharply, indicating a derivatives-driven move rather than spot selling.

**Key Factors:**
• Liquidations: Cascading long liquidations triggered the initial drop
• Funding/OI: Negative funding and declining OI suggest positioning reset
• Macro: Risk-off sentiment across markets adding pressure

**Risks:**
• Further liquidation cascade if support breaks
• Low weekend liquidity could amplify moves

**Scenarios:**
• Bull: Quick bounce if liquidations complete and spot demand returns
• Base: Consolidation in current range as market digests the move
• Bear: Break below support triggers another leg down

**Watch For:** Next funding reset, ETF flow data, weekend volume

**Data Gaps:** On-chain whale flow data unavailable

*Confidence: Medium — derivatives data clear but spot flow data missing*"

BAD (violates rules):
"Hey! Great question about BTC! 🚀 I think Bitcoin dropped 15.3% because of some liquidations. The price went from $67,000 to $56,800. Let me explain what I found..."

(Violations: greeting, emoji, first person, specific numbers, "let me explain")`;

// ============================================================================
// USER MESSAGE BUILDER
// ============================================================================

export interface Pass2UserMessageParams {
  finalInsight: FinalInsightObject;
  userQuestion: string;
  language: string;
  assetFocus: string | null;
  intent: string;
}

/**
 * Build the user message for Pass-2 renderer.
 */
export function buildPass2UserMessage(params: Pass2UserMessageParams): string {
  const { finalInsight, userQuestion, language, assetFocus, intent } = params;

  return `═══════════════════════════════════════════════════════════════════════════════
RENDER REQUEST
═══════════════════════════════════════════════════════════════════════════════

**User Question:** ${userQuestion}
**Language:** ${language}
**Asset Focus:** ${assetFocus || 'Market/General'}
**Intent:** ${intent}

═══════════════════════════════════════════════════════════════════════════════
FINAL INSIGHT OBJECT (Your ONLY source of truth)
═══════════════════════════════════════════════════════════════════════════════

${JSON.stringify(finalInsight, null, 2)}

═══════════════════════════════════════════════════════════════════════════════
INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

1. Render the above FinalInsightObject as clean, readable prose
2. Follow ALL system prompt rules (no new facts, no numbers, no first person)
3. Output in ${language.toUpperCase()} language
4. Disclose confidence/disagreement if not high/aligned
5. Mention missing modules if relevant to the question

Output your response now. No preamble, no "Here's the analysis:" — start directly with the content.`;
}

// ============================================================================
// PASS-2 EXECUTION
// ============================================================================

export interface Pass2Input {
  finalInsight: FinalInsightObject;
  userQuestion: string;
  language: string;
  assetFocus: string | null;
  intent: string;
}

export interface Pass2Result {
  ok: true;
  renderedOutput: string;
  latencyMs: number;
}

export interface Pass2Failure {
  ok: false;
  error: string;
  latencyMs: number;
}

export type Pass2Output = Pass2Result | Pass2Failure;

export interface Pass2Options {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  temperature?: number;
}

/**
 * Execute Pass-2 rendering with ChatGPT/Claude.
 */
export async function executePass2Renderer(
  input: Pass2Input,
  options: Pass2Options = {}
): Promise<Pass2Output> {
  const startTime = Date.now();

  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  const model = options.model || 'gpt-4o-mini';  // Fast, cheap, good at following instructions
  const baseUrl = options.baseUrl || 'https://api.openai.com/v1';
  const timeoutMs = options.timeoutMs || 5000;
  const temperature = options.temperature ?? 0.4;  // Slightly creative for prose

  if (!apiKey) {
    return {
      ok: false,
      error: 'OpenAI API key not configured for Pass-2',
      latencyMs: Date.now() - startTime,
    };
  }

  const userMessage = buildPass2UserMessage(input);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: PASS2_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        ok: false,
        error: `Pass-2 API error ${response.status}: ${errorText}`,
        latencyMs: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const renderedOutput = data.choices?.[0]?.message?.content || '';

    if (!renderedOutput) {
      return {
        ok: false,
        error: 'Pass-2 returned empty response',
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      ok: true,
      renderedOutput,
      latencyMs: Date.now() - startTime,
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        ok: false,
        error: `Pass-2 timeout after ${timeoutMs}ms`,
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      ok: false,
      error: `Pass-2 error: ${error.message}`,
      latencyMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// FALLBACK RENDERER (No LLM, just template)
// ============================================================================

/**
 * Render FinalInsightObject without LLM (deterministic fallback).
 * Use when Pass-2 fails or for testing.
 */
export function renderFallback(
  finalInsight: FinalInsightObject,
  assetFocus: string | null
): string {
  const asset = assetFocus || 'Market';
  const lines: string[] = [];

  // Header
  const verdict = finalInsight.confidence_final === 'high' 
    ? 'Clear signals' 
    : finalInsight.confidence_final === 'medium'
    ? 'Mixed signals'
    : 'Uncertain outlook';
  lines.push(`**${asset} — ${verdict}**`);
  lines.push('');

  // Drivers summary
  if (finalInsight.drivers.length > 0) {
    const topDrivers = finalInsight.drivers.slice(0, 3);
    const summaryParts = topDrivers.map(d => d.summary.split('.')[0]);
    lines.push(summaryParts.join('. ') + '.');
    lines.push('');
  }

  // Key Factors
  if (finalInsight.drivers.length > 0) {
    lines.push('**Key Factors:**');
    for (const driver of finalInsight.drivers.slice(0, 5)) {
      const tag = driver.agreement === 'both' ? '' : ` (${driver.agreement})`;
      lines.push(`• ${driver.topic}: ${driver.summary}${tag}`);
    }
    lines.push('');
  }

  // Risks
  if (finalInsight.risks.length > 0) {
    lines.push('**Risks:**');
    for (const risk of finalInsight.risks.slice(0, 4)) {
      lines.push(`• ${risk.risk}`);
    }
    lines.push('');
  }

  // Scenarios
  lines.push('**Scenarios:**');
  lines.push(`• Bull: ${finalInsight.scenarios.bull.summary}`);
  lines.push(`• Base: ${finalInsight.scenarios.base.summary}`);
  lines.push(`• Bear: ${finalInsight.scenarios.bear.summary}`);
  lines.push('');

  // Watch For
  if (finalInsight.to_watch.length > 0) {
    lines.push(`**Watch For:** ${finalInsight.to_watch.join(', ')}`);
    lines.push('');
  }

  // Data Gaps
  if (finalInsight.unknowns.length > 0) {
    lines.push('**Data Gaps:**');
    for (const unknown of finalInsight.unknowns.slice(0, 5)) {
      lines.push(`• ${unknown.what}`);
    }
    lines.push('');
  }

  // Confidence disclaimer
  if (finalInsight.confidence_final !== 'high' || finalInsight.disagreement_level !== 'aligned') {
    const confText = finalInsight.confidence_final === 'low' 
      ? 'Low confidence' 
      : 'Moderate confidence';
    const disagreeText = finalInsight.disagreement_level === 'conflicting'
      ? 'research engines show conflicting views'
      : finalInsight.disagreement_level === 'mixed'
      ? 'some uncertainty in analysis'
      : '';
    
    const disclaimer = disagreeText 
      ? `*${confText} — ${disagreeText}*`
      : `*${confText}*`;
    lines.push(disclaimer);
  }

  return lines.join('\n');
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Quick validation that rendered output follows rules.
 */
export function validateRenderedOutput(output: string): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check for first person
  if (/\b(I think|I believe|I found|let me|we can|we should)\b/i.test(output)) {
    violations.push('Contains first person language');
  }

  // Check for greetings
  if (/^(hey|hi|hello|sure|great question)/i.test(output.trim())) {
    violations.push('Starts with greeting');
  }

  // Check for emojis
  if (/[\u{1F300}-\u{1F9FF}]/u.test(output)) {
    violations.push('Contains emojis');
  }

  // Check for sensational language
  if (/\b(MASSIVE|HUGE|INSANE|CRAZY|MOON|PUMP|DUMP)\b/i.test(output)) {
    violations.push('Contains sensational language');
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// All exports are inline (export const, export function, export interface)
