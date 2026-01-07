/**
 * 🌊 Streaming API Client - Real-Time Responses
 * 
 * Server-Sent Events (SSE) implementation for streaming AI responses.
 * Provides real-time token-by-token streaming for optimal UX.
 */

import { API_BASE_URL } from '@/utils/api-config';
import { TokenStorage } from '@/components/auth/AuthProvider';

export interface StreamChunk {
  type: 'token' | 'source' | 'chart' | 'metadata' | 'complete' | 'error';
  content?: string;
  data?: any;
  metadata?: {
    confidence?: number;
    model?: string;
    processingTime?: number;
  };
}

export interface StreamOptions {
  onToken?: (token: string) => void;
  onSource?: (source: any) => void;
  onChart?: (chart: any) => void;
  onMetadata?: (metadata: any) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export class StreamingApiClient {
  private baseURL: string;
  private activeStreams: Map<string, AbortController> = new Map();

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Stream chat message response
   */
  async streamChatMessage(
    message: string,
    conversationId: string | null,
    agentId: string | undefined,
    options: StreamOptions
  ): Promise<void> {
    const streamId = `stream_${Date.now()}`;
    const controller = new AbortController();
    this.activeStreams.set(streamId, controller);

    let fullResponse = '';

    const token = TokenStorage.getToken();
    if (!token) {
      throw new Error('Please log in to continue.');
    }

    try {
      const response = await fetch(`${this.baseURL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message,
          conversationId: conversationId || undefined,
          agentId,
          context: {
            includeSources: true,
            includeCharts: true,
            analysisDepth: 'standard',
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          TokenStorage.clearToken();
          throw new Error('Please log in to continue.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('🎉 Stream complete');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              this.handleStreamChunk(data, fullResponse, options, (text) => {
                fullResponse = text;
              });
            } catch (error) {
              console.error('Failed to parse SSE data:', error);
            }
          }
        }
      }

      // Final complete callback
      if (options.onComplete) {
        options.onComplete(fullResponse);
      }
    } catch (error) {
      console.error('❌ Stream error:', error);
      
      if (options.onError) {
        options.onError(error as Error);
      }
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Handle individual stream chunk
   */
  private handleStreamChunk(
    chunk: StreamChunk,
    fullResponse: string,
    options: StreamOptions,
    updateFullResponse: (text: string) => void
  ): void {
    switch (chunk.type) {
      case 'token':
        if (chunk.content && options.onToken) {
          options.onToken(chunk.content);
          updateFullResponse(fullResponse + chunk.content);
        }
        break;

      case 'source':
        if (chunk.data && options.onSource) {
          options.onSource(chunk.data);
        }
        break;

      case 'chart':
        if (chunk.data && options.onChart) {
          options.onChart(chunk.data);
        }
        break;

      case 'metadata':
        if (chunk.metadata && options.onMetadata) {
          options.onMetadata(chunk.metadata);
        }
        break;

      case 'complete':
        console.log('✅ Stream marked as complete');
        break;

      case 'error':
        if (options.onError) {
          options.onError(new Error(chunk.content || 'Stream error'));
        }
        break;
    }
  }

  /**
   * Cancel active stream
   */
  cancelStream(streamId: string): void {
    const controller = this.activeStreams.get(streamId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(streamId);
      console.log('🛑 Stream cancelled');
    }
  }

  /**
   * Cancel all active streams
   */
  cancelAllStreams(): void {
    for (const controller of this.activeStreams.values()) {
      controller.abort();
    }
    this.activeStreams.clear();
    console.log('🛑 All streams cancelled');
  }

}

// Export singleton
export const streamingApiClient = new StreamingApiClient();

