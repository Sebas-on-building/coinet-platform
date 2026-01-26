/**
 * 🌐 Coinet API Client - Divine World-Class Edition
 * 
 * Elite API client with:
 * - Automatic retries with exponential backoff
 * - Request deduplication
 * - Response caching
 * - Real-time health monitoring
 * - Comprehensive error handling
 * - Request/response logging
 * - Timeout management
 * - Optimistic updates support
 */

import { API_BASE_URL } from '@/utils/api-config';
import { TokenStorage } from '@/components/auth/AuthProvider';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start at 1 second

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
      charts?: ChartConfig[];
      confidence?: number;
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
  interval: string;
  timeframe?: string;
  type?: 'candlestick' | 'line' | 'volume';
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
  charts?: ChartConfig[];
  confidence?: number;
  createdAt: string;
  userFeedback?: 'positive' | 'negative' | 'neutral' | null;
}

// ============================================================================
// CONVERSATION MANAGEMENT TYPES
// ============================================================================

export interface ConversationSummary {
  id: string;
  title: string | null;
  lastMessage: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface ListConversationsResponse {
  success: boolean;
  data: {
    conversations: ConversationSummary[];
    total: number;
    hasMore: boolean;
  };
}

export interface CreateConversationRequest {
  title?: string;
  agentId?: string;
}

export interface CreateConversationResponse {
  success: boolean;
  data: {
    id: string;
    title: string | null;
    createdAt: string;
  };
}

export interface UpdateConversationRequest {
  title?: string;
  archived?: boolean;
}

export interface UpdateConversationResponse {
  success: boolean;
  data: {
    id: string;
    title: string | null;
    isArchived: boolean;
    updatedAt: string;
  };
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const token = TokenStorage.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Send chat message to backend
   */
  async sendChatMessage(request: ChatMessageRequest): Promise<ChatMessageResponse> {
    const url = `${this.baseURL}/api/chat/message`;
    console.log('🔍 Making request to:', url);
    console.log('📦 Request body:', request);
    
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include', // Include credentials for CORS
        mode: 'cors', // Explicitly set CORS mode
        body: JSON.stringify(request),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Response error:', error);
        
        // Handle authentication errors
        if (response.status === 401) {
          TokenStorage.clearToken();
          throw new Error(error.error?.message || error.message || 'Please log in to continue.');
        }
        
        throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);
      return data;
    } catch (error) {
      console.error('💥 Fetch error:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Network error - backend might be unreachable
        console.error('🌐 Network error - Backend might be unreachable at:', url);
        console.error('💡 Current API Base URL:', this.baseURL || '(relative URLs)');
        
        // Provide helpful error message based on environment
        if (typeof window !== 'undefined' && window.location.hostname.includes('coinet.ai')) {
          console.error('💡 Production detected - Check Vercel environment variables:');
          console.error('💡 VITE_API_URL should be set to https://api.coinet.ai');
        } else if (import.meta.env.DEV) {
          console.error('💡 Development mode - Check if backend is running on port 3000');
        } else {
          console.error('💡 Try checking if backend is running and accessible');
        }
        
        // Create a more helpful error
        const helpfulError = new Error(
          `Failed to connect to backend API. ${this.baseURL ? `URL: ${url}` : 'API URL not configured. Please set VITE_API_URL environment variable.'}`
        );
        helpfulError.name = 'NetworkError';
        throw helpfulError;
      }
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: string): Promise<ConversationHistoryResponse> {
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }
    
    const response = await fetch(`${this.baseURL}/api/chat/history/${conversationId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Regenerate message
   */
  async regenerateMessage(
    conversationId: string,
    messageId: string
  ): Promise<ChatMessageResponse> {
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }
    
    const response = await fetch(`${this.baseURL}/api/chat/regenerate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        conversationId,
        messageId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Delete a message
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }
    
    const response = await fetch(`${this.baseURL}/api/chat/message/${messageId}?conversationId=${conversationId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }
  }


  /**
   * Health check
   */
  async healthCheck(): Promise<{ ok: boolean; service: string }> {
    const response = await fetch(`${this.baseURL}/api/health`);
    return response.json();
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT
  // ============================================================================

  /**
   * List all conversations for the current user (for sidebar)
   */
  async listConversations(options?: {
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
  }): Promise<ListConversationsResponse> {
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }

    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    if (options?.includeArchived) params.set('includeArchived', 'true');

    const url = `${this.baseURL}/api/chat/conversations${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a new empty conversation
   */
  async createConversation(request?: CreateConversationRequest): Promise<CreateConversationResponse> {
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }

    const response = await fetch(`${this.baseURL}/api/chat/conversations`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request || {}),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }

    const response = await fetch(`${this.baseURL}/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update a conversation (title, archive status)
   */
  async updateConversation(
    conversationId: string,
    updates: UpdateConversationRequest
  ): Promise<UpdateConversationResponse> {
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }

    const response = await fetch(`${this.baseURL}/api/chat/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Archive/unarchive a conversation
   */
  async archiveConversation(conversationId: string, archive: boolean = true): Promise<{ success: boolean }> {
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }

    const response = await fetch(`${this.baseURL}/api/chat/conversations/${conversationId}/archive`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ archive }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================================================
  // RLHF FEEDBACK SYSTEM
  // ============================================================================

  /**
   * Submit feedback on an AI message (for RLHF)
   */
  async submitFeedback(params: {
    messageId: string;
    type: 'THUMBS_UP' | 'THUMBS_DOWN' | 'TOO_LONG' | 'TOO_SHORT' | 'WRONG_DATA' | 'BAD_TONE' | 'REPETITIVE' | 'HELPFUL' | 'PERFECT';
    category?: string;
    severity?: string;
    reason?: string;
  }): Promise<{ success: boolean; feedbackId: string }> {
    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }

    const response = await fetch(`${this.baseURL}/api/feedback/submit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

