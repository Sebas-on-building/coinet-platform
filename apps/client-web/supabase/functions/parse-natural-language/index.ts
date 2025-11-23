import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { description, context, type } = await req.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get OpenAI API key from Supabase secrets
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found')
    }

    // Create system prompt for agent parsing
    const systemPrompt = `You are an expert AI agent architect for cryptocurrency trading platforms. Your task is to parse natural language descriptions into structured agent configurations.

Input: User's description of desired agent behavior
Output: Structured JSON with agent configuration

Guidelines:
1. Extract key intents, conditions, and actions
2. Map to available trigger types: price, sentiment, volume, technical, onchain, news, time, custom
3. Identify relevant data sources from: market data, social media, on-chain analytics, news feeds
4. Create logical decision trees and risk assessments
5. Generate human-readable explanations
6. Provide confidence scores and suggestions

Available operators: gt, lt, eq, gte, lte, contains, regex
Available trigger types: price, sentiment, volume, technical, onchain, news, time, custom
Available strategy types: momentum, meanReversion, arbitrage, scalping, swing, hodl, custom

Context: ${JSON.stringify(context)}
Type: ${type}

Return valid JSON with this structure:
{
  "success": boolean,
  "agent": {
    "name": string,
    "description": string,
    "personality": string,
    "expertise": string[],
    "systemPrompt": string,
    "triggers": [{
      "id": string,
      "type": string,
      "conditions": [{ "field": string, "operator": string, "value": any, "timeframe"?: string }],
      "logicalOperator": "AND" | "OR",
      "enabled": boolean
    }],
    "strategies": [{
      "id": string,
      "name": string,
      "description": string,
      "category": string,
      "components": [{ "id": string, "type": string, "config": {}, "priority": number }],
      "riskManagement": {
        "maxPositionSize": number,
        "maxDailyLoss": number,
        "stopLossPercentage": number,
        "takeProfitPercentage": number,
        "maxConcurrentTrades": number,
        "cooldownPeriod": number
      },
      "enabled": boolean
    }],
    "dataSources": [{
      "id": string,
      "name": string,
      "type": string,
      "config": { "url"?: string, "refreshInterval"?: number },
      "schema": {},
      "enabled": boolean
    }],
    "tags": string[],
    "color": string
  },
  "explanation": {
    "overview": string,
    "triggerLogic": [{
      "trigger": object,
      "humanReadable": string,
      "examples": string[],
      "dataPoints": string[]
    }],
    "dataSourcesUsed": [{
      "source": object,
      "purpose": string,
      "frequency": string,
      "reliability": "high" | "medium" | "low",
      "cost": "free" | "low" | "medium" | "high"
    }],
    "decisionTree": [{
      "id": string,
      "type": "condition" | "action" | "data" | "logic",
      "label": string,
      "description": string,
      "children": string[],
      "metadata": {}
    }],
    "riskFactors": string[],
    "expectedBehavior": string[]
  },
  "confidence": number,
  "suggestions": string[]
}`

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Parse this ${type}: "${description}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const aiResponse = await response.json()
    const parsedContent = aiResponse.choices[0].message.content

    // Parse the JSON response
    let result
    try {
      result = JSON.parse(parsedContent)
    } catch (parseError) {
      // Fallback: create a basic structure if JSON parsing fails
      result = {
        success: false,
        agent: {
          name: "Generated Agent",
          description: description,
          personality: "Analytical and data-driven",
          expertise: ["trading", "analysis"],
          systemPrompt: `You are a trading agent created from: ${description}`,
          triggers: [],
          strategies: [],
          dataSources: [],
          tags: ["auto-generated"],
          color: "#3b82f6"
        },
        explanation: {
          overview: "Failed to parse complex description. Please try simplifying your request.",
          triggerLogic: [],
          dataSourcesUsed: [],
          decisionTree: [],
          riskFactors: ["Parsing complexity", "Unclear requirements"],
          expectedBehavior: []
        },
        confidence: 25,
        suggestions: ["Please be more specific about conditions and actions", "Try breaking down complex logic into simpler statements"]
      }
    }

    // Store the parsing request for learning and improvement
    await supabaseClient
      .from('agent_parsing_logs')
      .insert({
        input_description: description,
        input_type: type,
        context: context,
        result: result,
        confidence: result.confidence,
        created_at: new Date().toISOString()
      })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in parse-natural-language function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        agent: null,
        explanation: null,
        confidence: 0,
        suggestions: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})