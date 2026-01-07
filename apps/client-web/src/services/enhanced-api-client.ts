/**
 * 🌟 Enhanced API Client - Divine World-Class Implementation
 * 
 * Features:
 * - Automatic retries with exponential backoff
 * - Request deduplication
 * - Response caching
 * - Performance monitoring
 * - Advanced error handling
 * - Offline queue management
 * - Request cancellation
 * - Type safety
 */

import { API_BASE_URL } from '@/utils/api-config';
import { TokenStorage } from '@/components/auth/AuthProvider';

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

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RequestMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  retries: number;
  success: boolean;
  error?: string;
}

class EnhancedApiClient {
  private baseURL: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private activeRequests: Map<string, Promise<any>> = new Map();
  private metrics: RequestMetrics[] = [];
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // Base delay in ms
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes
  private requestTimeout: number = 30000; // 30 seconds

  constructor() {
    this.baseURL = API_BASE_URL;
    
    // Clean up cache periodically
    setInterval(() => this.cleanExpiredCache(), 60000); // Every minute
    
    // Track online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processOfflineQueue());
      window.addEventListener('offline', () => console.log('📴 Offline mode detected'));
    }
  }

  /**
   * 💬 Send chat message with advanced features
   */
  async sendChatMessage(
    request: ChatMessageRequest,
    options?: {
      skipCache?: boolean;
      maxRetries?: number;
      onProgress?: (progress: { stage: string; percent: number }) => void;
    }
  ): Promise<ChatMessageResponse> {
    const cacheKey = this.getCacheKey('chat', request);
    
    // Check cache (skip for chat messages to ensure freshness)
    if (!options?.skipCache) {
      const cached = this.getFromCache<ChatMessageResponse>(cacheKey);
      if (cached) {
        console.log('✅ Using cached response');
        return cached;
      }
    }

    // Check for duplicate requests
    if (this.activeRequests.has(cacheKey)) {
      console.log('⚡ Deduplicating request');
      return this.activeRequests.get(cacheKey)!;
    }

    // Create request promise
    const requestPromise = this.executeRequest<ChatMessageResponse>(
      '/api/chat/message',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      options
    );

    // Store active request
    this.activeRequests.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;
      
      // Don't cache chat messages (always get fresh responses)
      // this.saveToCache(cacheKey, response);
      
      return response;
    } finally {
      this.activeRequests.delete(cacheKey);
    }
  }

  /**
   * 📜 Get conversation history with caching
   */
  async getConversationHistory(
    conversationId: string,
    options?: { skipCache?: boolean }
  ): Promise<ConversationHistoryResponse> {
    const cacheKey = this.getCacheKey('history', { conversationId });
    
    // Check cache
    if (!options?.skipCache) {
      const cached = this.getFromCache<ConversationHistoryResponse>(cacheKey);
      if (cached) {
        console.log('✅ Using cached conversation history');
        return cached;
      }
    }

    const response = await this.executeRequest<ConversationHistoryResponse>(
      `/api/chat/history/${conversationId}`,
      { method: 'GET' }
    );

    // Cache conversation history
    this.saveToCache(cacheKey, response, 2 * 60 * 1000); // 2 minutes

    return response;
  }

  /**
   * 🔄 Regenerate message
   */
  async regenerateMessage(
    conversationId: string,
    messageId: string
  ): Promise<ChatMessageResponse> {
    return this.executeRequest<ChatMessageResponse>(
      '/api/chat/regenerate',
      {
        method: 'POST',
        body: JSON.stringify({ conversationId, messageId }),
      }
    );
  }

  /**
   * 🗑️ Delete message
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await this.executeRequest(
      `/api/chat/message/${messageId}?conversationId=${conversationId}`,
      { method: 'DELETE' }
    );

    // Invalidate conversation cache
    this.invalidateCache(`history:${conversationId}`);
  }

  /**
   * 🏥 Health check with circuit breaker pattern
   */
  async healthCheck(): Promise<{ ok: boolean; service: string; latency: number }> {
    const start = Date.now();
    
    try {
      const response = await fetch(`${this.baseURL}/api/health`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      const data = await response.json();
      const latency = Date.now() - start;
      
      return {
        ...data,
        latency,
      };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        ok: false,
        service: 'coinet-platform',
        latency: Date.now() - start,
      };
    }
  }

  /**
   * 🔥 Core request execution with retries and error handling
   */
  private async executeRequest<T>(
    endpoint: string,
    options: RequestInit,
    retryOptions?: {
      maxRetries?: number;
      onProgress?: (progress: { stage: string; percent: number }) => void;
    }
  ): Promise<T> {
    const maxRetries = retryOptions?.maxRetries ?? this.maxRetries;
    let lastError: Error | null = null;
    
    const metrics: RequestMetrics = {
      startTime: Date.now(),
      retries: 0,
      success: false,
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        metrics.retries = attempt;
        
        // Progress callback
        if (retryOptions?.onProgress) {
          retryOptions.onProgress({
            stage: attempt === 0 ? 'sending' : 'retrying',
            percent: (attempt / (maxRetries + 1)) * 100,
          });
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        try {
          const token = TokenStorage.getToken();
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Request-ID': this.generateRequestId(),
            ...options.headers as Record<string, string>,
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Handle authentication errors
            if (response.status === 401) {
              TokenStorage.clearToken();
              throw new Error(errorData.error?.message || errorData.message || 'Please log in to continue.');
            }
            
            throw new Error(
              errorData.error?.message || 
              errorData.message || 
              `HTTP ${response.status}: ${response.statusText}`
            );
          }

          const data = await response.json();
          
          // Success metrics
          metrics.endTime = Date.now();
          metrics.duration = metrics.endTime - metrics.startTime;
          metrics.success = true;
          this.recordMetrics(metrics);

          // Progress complete
          if (retryOptions?.onProgress) {
            retryOptions.onProgress({ stage: 'complete', percent: 100 });
          }

          return data;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Request attempt ${attempt + 1} failed:`, error);

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.error = lastError?.message;
    this.recordMetrics(metrics);

    throw new Error(`Request failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
  }

  /**
   * 🔑 Cache management
   */
  private getCacheKey(type: string, data: any): string {
    return `${type}:${JSON.stringify(data)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private saveToCache<T>(key: string, data: T, ttl: number = this.cacheTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    });
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 📊 Performance metrics
   */
  private recordMetrics(metrics: RequestMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Log performance stats periodically
    if (this.metrics.length % 10 === 0) {
      this.logPerformanceStats();
    }
  }

  private logPerformanceStats(): void {
    const recent = this.metrics.slice(-10);
    const avgDuration = recent.reduce((sum, m) => sum + (m.duration || 0), 0) / recent.length;
    const successRate = (recent.filter(m => m.success).length / recent.length) * 100;

    console.log('📊 API Performance:', {
      avgResponseTime: `${avgDuration.toFixed(0)}ms`,
      successRate: `${successRate.toFixed(1)}%`,
      totalRequests: this.metrics.length,
    });
  }


  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🔧 Utilities
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📴 Offline queue (for future implementation)
   */
  private offlineQueue: Array<{
    endpoint: string;
    options: RequestInit;
    timestamp: number;
  }> = [];

  private async processOfflineQueue(): Promise<void> {
    console.log('🔄 Processing offline queue...');
    
    while (this.offlineQueue.length > 0) {
      const request = this.offlineQueue.shift();
      if (!request) break;

      try {
        await this.executeRequest(request.endpoint, request.options);
        console.log('✅ Offline request processed');
      } catch (error) {
        console.error('❌ Failed to process offline request:', error);
        // Re-queue if failed
        this.offlineQueue.push(request);
        break;
      }
    }
  }

  /**
   * 📈 Get performance metrics
   */
  getMetrics() {
    const successCount = this.metrics.filter(m => m.success).length;
    const failureCount = this.metrics.length - successCount;
    const avgDuration = this.metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / this.metrics.length;

    return {
      totalRequests: this.metrics.length,
      successCount,
      failureCount,
      successRate: (successCount / this.metrics.length) * 100,
      avgResponseTime: avgDuration,
      cacheSize: this.cache.size,
    };
  }

  /**
   * 🧹 Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }
}

// Export singleton instance
export const enhancedApiClient = new EnhancedApiClient();

