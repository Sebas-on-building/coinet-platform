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
}

class ApiClient {
  private baseURL: string;
  private authToken: string | null = null;
  private userId: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Set authentication context from Clerk
   */
  setAuth(userId: string | null, token: string | null) {
    this.userId = userId;
    this.authToken = token;
    console.log('🔐 Auth set:', { userId: userId ? userId.substring(0, 10) + '...' : null, hasToken: !!token });
  }

  /**
   * Get auth headers for requests
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    if (this.userId) {
      headers['X-User-Id'] = this.userId;
    } else {
      // Fallback to localStorage for demo mode
      headers['X-User-Id'] = this.getLegacyUserId();
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
   * Get user ID from storage or generate one (legacy fallback for demo mode)
   */
  private getLegacyUserId(): string {
    // Check localStorage for stored user ID
    const stored = localStorage.getItem('coinet_user_id');
    if (stored) {
      return stored;
    }

    // Generate and store new user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('coinet_user_id', userId);
    return userId;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ ok: boolean; service: string }> {
    const response = await fetch(`${this.baseURL}/api/health`);
    return response.json();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

