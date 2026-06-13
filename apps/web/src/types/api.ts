/**
 * Coinet API contract types.
 *
 * These mirror the REAL backend contract (apps/coinet-platform), not mocks:
 *  - `JudgmentResponse` / `JudgmentOutput` => the PUBLIC `GET /api/judgment`
 *    endpoint, which runs the real engine (produceJudgment + evaluateJudgment)
 *    and returns the raw judgment object. Used to prove the connection with a
 *    real verdict, no auth required.
 *  - `ChatVerdict` / `ChatMessageResponse` => the AUTHENTICATED
 *    `POST /api/chat/message` path (Milestone 2), which projects the governed
 *    judgment package into the stable client DTO.
 *
 * Governance invariant (enforced server-side, honored here): when a verdict is
 * UNAVAILABLE, no fabricated fields are ever surfaced.
 */

// ============================================================================
// RAW JUDGMENT ENGINE CONTRACT  — GET /api/judgment?symbol=BTC  (public)
// ============================================================================

export type MarketState = string;
export type TimingPhase = string;
export type ConfidenceBand = string;

export interface JudgmentStateBlock {
  primary: MarketState;
  secondary: MarketState | null;
  confidence: number; // 0–1
}

export interface CausalDriver {
  family: string;
  supporting_features: string[];
  strength: number; // 0–1
  summary: string;
}

export interface JudgmentCauseBlock {
  positive_drivers: CausalDriver[];
  negative_drivers: CausalDriver[];
  dominant_cluster: string;
  secondary_cluster: string | null;
}

export interface RankedHypothesis {
  hypothesis: string;
  support_score: number;
  contradiction_score: number;
  confidence: number;
  missing_evidence: string[];
}

export interface JudgmentThesisBlock {
  primary: RankedHypothesis;
  secondary: RankedHypothesis | null;
  clarity: number;
  ambiguity_flag: boolean;
}

export interface ContradictionItem {
  class: string;
  severity: string;
  positive_side: string[];
  negative_side: string[];
  affects_scores: string[];
  resolvable: boolean;
  summary: string;
}

export interface JudgmentContradictionsBlock {
  items: ContradictionItem[];
  load: number; // 0–1
  structural_warning: boolean;
  identity_gate_denial?: string;
  identity_gate_note?: string;
}

export interface JudgmentTimingBlock {
  phase: TimingPhase;
  score: number; // 0–100
  sequence_position: number;
  sequence_total: number;
  maturity_warning: boolean;
  maturity_note: string | null;
}

export interface HorizonScenario {
  horizon: "24h" | "7d" | "30d";
  confirmation: string;
  failure: string;
  trigger: string;
  invalidation: string;
}

export interface JudgmentScenarioBlock {
  base_case: string;
  bullish_confirmation: string;
  bearish_failure: string;
  next_trigger: string;
  scenario_confidence: number;
  horizons?: HorizonScenario[];
  primary_hypothesis?: string;
  top_contradiction?: string;
  regime_context?: string;
}

export interface ConfidenceBreakdown {
  market: number;
  fundamentals: number;
  onchain: number;
  narrative: number;
}

export interface JudgmentConfidenceBlock {
  overall: ConfidenceBand;
  score: number; // 0–1
  breakdown: ConfidenceBreakdown;
  primary_uncertainty: string | null;
}

export interface JudgmentRegimeMacro {
  posture:
    | "risk_on"
    | "risk_off"
    | "neutral"
    | "transition_bearish"
    | "transition_bullish"
    | "data_unavailable";
  confidence: number;
  drivers: string[];
  btcTrend: "bullish" | "bearish" | "neutral";
  btcDominanceTrend: "rising" | "falling" | "stable";
  overallLeverage: "low" | "moderate" | "high" | "extreme";
  coverage: number;
}

/** The complete raw judgment object from the engine (JudgmentOutput). */
export interface JudgmentOutput {
  version: string;
  entity_id: string;
  symbol: string;
  chain: string | null;
  judged_at: string;
  state: JudgmentStateBlock;
  cause: JudgmentCauseBlock;
  thesis: JudgmentThesisBlock;
  contradictions: JudgmentContradictionsBlock;
  timing: JudgmentTimingBlock;
  scenario: JudgmentScenarioBlock;
  confidence: JudgmentConfidenceBlock;
  evidence: {
    positive: string[];
    negative: string[];
    unresolved: string[];
    stale: string[];
  };
  scores: {
    qs: number;
    os: number | null;
    risk: number;
    pos: number | null;
  };
  quality_checks: {
    has_clear_state: boolean;
    has_top_causes: boolean;
    has_contradictions: boolean;
    has_timing: boolean;
    has_next_conditions: boolean;
    has_honest_confidence: boolean;
    all_passed: boolean;
  };
  regime?: {
    macro?: JudgmentRegimeMacro;
    [key: string]: unknown;
  };
}

/** Envelope returned by GET /api/judgment. */
export interface JudgmentResponse {
  success: boolean;
  judgment: JudgmentOutput;
  evaluation: {
    healthy: boolean;
    score: number;
    issue_count: number;
    issues: Array<{ severity?: string; message?: string; [k: string]: unknown }>;
  };
  ai_context: string;
  computeTime: string;
  error?: string;
}

// ============================================================================
// CHAT VERDICT DTO  — POST /api/chat/message  (authenticated, Milestone 2)
// ============================================================================

export interface ChatMessageRequest {
  message: string;
  conversationId?: string;
  agentId?: string;
  context?: {
    includeSources?: boolean;
    includeCharts?: boolean;
    analysisDepth?: "quick" | "standard" | "deep";
  };
}

export interface ChatVerdict {
  status: "AVAILABLE" | "DEGRADED" | "UNAVAILABLE";
  symbol?: string;
  fields?: {
    state?: string;
    cause?: string;
    thesis?: string;
    contradiction_summary?: string;
    timing_phase?: string;
    scenario_summary?: string;
    confidence_band?: string;
    state_detail?: { secondary?: string; confidence?: number };
    cause_detail?: {
      dominant_cluster?: string;
      secondary_cluster?: string;
      drivers?: Array<{
        family: string;
        direction: "positive" | "negative";
        strength?: number;
        summary?: string;
      }>;
    };
    thesis_detail?: {
      support_score?: number;
      contradiction_score?: number;
      confidence?: number;
      secondary?: string;
      clarity?: number;
      ambiguous?: boolean;
    };
    contradiction_items?: Array<{
      class: string;
      severity: string;
      summary?: string;
      resolvable?: boolean;
    }>;
    contradiction_load?: number;
    contradiction_structural_warning?: boolean;
    timing_detail?: {
      score?: number;
      position?: number;
      total?: number;
      maturity_warning?: boolean;
      maturity_note?: string;
    };
    scenario_detail?: {
      bullish_confirmation?: string;
      bearish_failure?: string;
      next_trigger?: string;
      confidence?: number;
      horizons?: HorizonScenario[];
    };
    confidence_detail?: {
      score?: number;
      breakdown?: {
        market?: number;
        fundamentals?: number;
        onchain?: number;
        narrative?: number;
      };
      primary_uncertainty?: string;
    };
    signal_24h?: string;
    failure_condition?: string;
  };
  disclosures?: string[];
  policyVersion: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  confidence?: number;
  verdict?: ChatVerdict;
  createdAt: string;
}

export interface ChatMessageResponse {
  success: boolean;
  data: {
    message: ChatMessage;
    conversationId: string;
    conversationTitle?: string;
  };
  metadata: {
    processingTime: number;
    tokens?: number;
    model?: string;
  };
}

// ============================================================================
// MARKET REGIME CONTRACT  — GET /api/market-regime  (Milestone 4, additive)
// ============================================================================

export interface MarketRegimeResponse {
  success: boolean;
  data: {
    fearGreed: {
      value: number; // 0–100
      classification: string;
      trend?: "rising" | "falling" | "stable";
    } | null;
    btcDominance: number | null;
    btcDominanceChange7d?: number | null;
    totalMarketCapUsd: number | null;
    totalMarketCapChange24h: number | null;
    updatedAt: string;
  };
  error?: string;
}

// ============================================================================
// ERROR
// ============================================================================

export interface ApiErrorResponse {
  success: false;
  error: { code?: string; message: string } | string;
}
