/**
 * 🎯 API Types - Complete Type Definitions
 * 
 * Divine TypeScript types for complete type safety across the application.
 */

// ============================================================================
// CHAT TYPES
// ============================================================================

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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  charts?: ChartConfig[];
  confidence?: number;
  verdict?: ChatVerdict;
  createdAt: string;
}

/**
 * Structured Coinet judgment verdict — mirrors the backend ChatVerdict DTO
 * (api/chat/types.ts). Sent alongside the prose `content`. When
 * `status === 'UNAVAILABLE'`, `fields` is absent (governance invariant).
 */
export interface ChatVerdict {
  status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  symbol?: string;
  fields?: {
    state?: string;
    cause?: string;
    thesis?: string;
    contradiction_summary?: string;
    timing_phase?: string;
    scenario_summary?: string;
    confidence_band?: string;
  };
  disclosures?: string[];
  policyVersion: string;
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
  interval: string;
  timeframe?: string;
  type?: 'candlestick' | 'line' | 'volume';
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  messages: ChatMessage[];
  context?: Record<string, any>;
  agentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationHistoryResponse {
  success: boolean;
  data: {
    conversation: Conversation;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
  metadata?: {
    requestId?: string;
    processingTime?: number;
  };
}

// ============================================================================
// STREAMING TYPES
// ============================================================================

export type StreamEventType = 'token' | 'source' | 'chart' | 'metadata' | 'complete' | 'error';

export interface StreamChunk {
  type: StreamEventType;
  content?: string;
  data?: any;
  metadata?: {
    confidence?: number;
    model?: string;
    processingTime?: number;
    conversationId?: string;
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isChatMessageResponse(data: any): data is ChatMessageResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    'data' in data &&
    'message' in data.data
  );
}

export function isErrorResponse(data: any): data is ErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.success === false &&
    'error' in data
  );
}

export function isStreamChunk(data: any): data is StreamChunk {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    ['token', 'source', 'chart', 'metadata', 'complete', 'error'].includes(data.type)
  );
}

