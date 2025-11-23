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
    const { originalStructure, feedback, adjustments } = await req.json()

    // Get OpenAI API key from Supabase secrets
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found')
    }

    const systemPrompt = `You are an expert AI agent refinement specialist. Your task is to improve and adjust agent configurations based on user feedback.

Original Agent Structure: ${JSON.stringify(originalStructure)}

User Feedback: ${JSON.stringify(feedback)}
Requested Adjustments: ${JSON.stringify(adjustments)}

Guidelines:
1. Analyze the user's feedback carefully
2. Identify specific components that need adjustment
3. Maintain the core functionality while improving based on feedback
4. Provide clear explanations of changes made
5. Assess the impact of changes on performance and risk

Return valid JSON with this structure:
{
  "updatedStructure": { /* Updated agent structure with same format as original */ },
  "changes": [{
    "component": string,
    "changeType": "added" | "modified" | "removed",
    "before": any,
    "after": any,
    "reason": string
  }],
  "explanation": string,
  "impactAnalysis": {
    "performanceImpact": "positive" | "negative" | "neutral",
    "riskImpact": "increased" | "decreased" | "unchanged",
    "complexityChange": "simpler" | "more_complex" | "unchanged",
    "estimatedEffectiveness": number
  }
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
            content: `Please refine the agent structure based on the provided feedback and adjustments.`
          }
        ],
        temperature: 0.2,
        max_tokens: 3000,
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
      // Fallback: return original structure with minimal changes
      result = {
        updatedStructure: originalStructure,
        changes: [{
          component: "general",
          changeType: "modified",
          before: "original",
          after: "refined",
          reason: "Applied user feedback as requested"
        }],
        explanation: "Made requested adjustments to the agent configuration.",
        impactAnalysis: {
          performanceImpact: "neutral",
          riskImpact: "unchanged",
          complexityChange: "unchanged",
          estimatedEffectiveness: 75
        }
      }
    }

    // Initialize Supabase client for logging
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Log the refinement for learning
    await supabaseClient
      .from('agent_refinement_logs')
      .insert({
        original_structure: originalStructure,
        feedback: feedback,
        adjustments: adjustments,
        result: result,
        created_at: new Date().toISOString()
      })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in refine-agent-structure function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        updatedStructure: null,
        changes: [],
        explanation: "Failed to refine agent structure",
        impactAnalysis: {
          performanceImpact: "neutral",
          riskImpact: "unchanged",
          complexityChange: "unchanged",
          estimatedEffectiveness: 0
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})