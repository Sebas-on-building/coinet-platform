/**
 * 💬 Chat API - TypeScript Types
 *
 * Divine type definitions for chat system with full type safety.
 */

import type { CoinetJudgmentPromptPackageJudgment } from './judgment-prompt-package.types';

export interface ChatMessageRequest {
  message: string;
  conversationId?: string;
  agentId?: string;
  context?: {
    includeSources?: boolean;
    includeCharts?: boolean;
    analysisDepth?: 'quick' | 'standard' | 'deep';
  };
}

export interface ChatMessageResponse {
  success: boolean;
  data: {
    message: {
      id: string;
      role: 'user' | 'assistant';
      content: string;
      sources?: Source[];
      charts?: (ChartConfig | OmniScoreQuadrantData)[];
      confidence?: number;
      verdict?: ChatVerdict;
      createdAt: string;
    };
    conversationId: string;
    conversationTitle?: string;
  };
  metadata: {
    processingTime: number;
    tokens?: number;
    model?: string;
  };
}

export interface Source {
  id: string;
  domain: string;
  url: string;
  title: string;
  excerpt: string;
  favicon?: string;
  relevanceScore?: number;
  publishDate?: string;
}

export interface ChartConfig {
  symbol: string;
  interval: string; // 'D', 'W', '240', '60', etc.
  timeframe?: string;
  type?: 'candlestick' | 'line' | 'volume';
}

export interface OmniScoreQuadrantData {
  type: 'omniscore-quadrant';
  projects: Array<{
    ticker: string;
    qs: number;
    os: number | null;
    pos: number;
    posAdj: number;
    confidence: string;
    nmiTier: string;
  }>;
}

/**
 * Structured Coinet judgment verdict — a first-class, reusable projection of the
 * governed CoinetJudgmentPromptPackage, sent to the client alongside the prose
 * `content` (never instead of it). Sourced from the package so the AVAILABLE/
 * DEGRADED/UNAVAILABLE status + governance carry to the UI.
 *
 * Governance invariant (mirrors the package): when `status === 'UNAVAILABLE'`,
 * `fields` is omitted — the client can never render a fabricated verdict.
 */
export interface ChatVerdict {
  status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  symbol?: string;
  /**
   * Structured package projection (headline one-liners + Phase-2 structured
   * depth + derived 24h-signal / failure-condition). Each field is optional and
   * is a pure projection of an existing JudgmentOutput — never invented. Mirrors
   * the governed package's judgment shape so card + AI prompt stay in lockstep.
   */
  fields?: CoinetJudgmentPromptPackageJudgment;
  /** required_disclosures from the package (DEGRADED/UNAVAILABLE guidance). */
  disclosures?: string[];
  policyVersion: string;
}

export interface ConversationHistoryResponse {
  success: boolean;
  data: {
    conversation: {
      id: string;
      title?: string;
      messages: ChatMessage[];
      createdAt: string;
      updatedAt: string;
    };
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  charts?: (ChartConfig | OmniScoreQuadrantData)[];
  confidence?: number;
  // Live-only: present on fresh responses, not persisted to history (MVP).
  verdict?: ChatVerdict;
  createdAt: string;
}

export interface RegenerateMessageRequest {
  messageId: string;
  conversationId: string;
}

export interface RegenerateMessageResponse {
  success: boolean;
  data: {
    message: ChatMessage;
  };
}

