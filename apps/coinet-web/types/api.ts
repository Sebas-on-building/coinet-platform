/**
 * Coinet backend chat contract (subset used by the terminal).
 *
 * Mirrors apps/coinet-platform's `ChatVerdict` DTO from POST /api/chat/message
 * (the governed mentor verdict). Governance invariant: when status is
 * UNAVAILABLE there are no `fields` — the client can never render a fabricated
 * verdict.
 */

export interface ChatMessageRequest {
  message: string
  conversationId?: string
  agentId?: string
  context?: {
    includeSources?: boolean
    includeCharts?: boolean
    analysisDepth?: "quick" | "standard" | "deep"
  }
}

export interface HorizonScenario {
  horizon: "24h" | "7d" | "30d"
  confirmation: string
  failure: string
  trigger: string
  invalidation: string
}

export interface ChatVerdict {
  status: "AVAILABLE" | "DEGRADED" | "UNAVAILABLE"
  symbol?: string
  fields?: {
    state?: string
    cause?: string
    thesis?: string
    contradiction_summary?: string
    timing_phase?: string
    scenario_summary?: string
    confidence_band?: string
    state_detail?: { secondary?: string; confidence?: number }
    cause_detail?: {
      dominant_cluster?: string
      secondary_cluster?: string
      drivers?: Array<{
        family: string
        direction: "positive" | "negative"
        strength?: number
        summary?: string
      }>
    }
    thesis_detail?: {
      support_score?: number
      contradiction_score?: number
      confidence?: number
      secondary?: string
      clarity?: number
      ambiguous?: boolean
    }
    contradiction_items?: Array<{
      class: string
      severity: string
      summary?: string
      resolvable?: boolean
    }>
    contradiction_load?: number
    contradiction_structural_warning?: boolean
    timing_detail?: {
      score?: number
      position?: number
      total?: number
      maturity_warning?: boolean
      maturity_note?: string
    }
    scenario_detail?: {
      bullish_confirmation?: string
      bearish_failure?: string
      next_trigger?: string
      confidence?: number
      horizons?: HorizonScenario[]
    }
    confidence_detail?: {
      score?: number
      breakdown?: {
        market?: number
        fundamentals?: number
        onchain?: number
        narrative?: number
      }
      primary_uncertainty?: string
    }
    signal_24h?: string
    failure_condition?: string
  }
  disclosures?: string[]
  policyVersion: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  confidence?: number
  verdict?: ChatVerdict
  createdAt: string
}

export interface ChatMessageResponse {
  success: boolean
  data: {
    message: ChatMessage
    conversationId: string
    conversationTitle?: string
  }
  metadata: {
    processingTime: number
    tokens?: number
    model?: string
  }
}
