/**
 * 🌊 Streaming Chat Hook - Real-Time AI Responses
 * 
 * Divine hook that provides real-time streaming chat with
 * optimistic updates and perfect error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { streamingApiClient } from '@/services/streaming-api-client';
import { enhancedApiClient } from '@/services/enhanced-api-client';
import { useToast } from '@/hooks/use-toast';

export interface StreamingMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  isComplete?: boolean;
  sources?: any[];
  charts?: any[];
  confidence?: number;
}

export function useStreamingChat(activeAgentId?: string) {
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const currentStreamId = useRef<string | null>(null);
  const { toast } = useToast();

  /**
   * Send message with streaming response
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Create user message
    const userMessage: StreamingMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      isComplete: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    // Create assistant message (empty, will be filled by stream)
    const assistantId = `assistant_${Date.now()}`;
    const assistantMessage: StreamingMessage = {
      id: assistantId,
      type: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      isComplete: false,
    };

    setMessages(prev => [...prev, assistantMessage]);
    currentStreamId.current = assistantId;

    try {
      // Start streaming
      await streamingApiClient.streamChatMessage(
        content,
        conversationId,
        activeAgentId,
        {
          onToken: (token: string) => {
            // Append token to assistant message
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + token }
                : msg
            ));
          },
          onSource: (source: any) => {
            // Add source to assistant message
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, sources: [...(msg.sources || []), source] }
                : msg
            ));
          },
          onChart: (chart: any) => {
            // Add chart to assistant message
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, charts: [...(msg.charts || []), chart] }
                : msg
            ));
          },
          onMetadata: (metadata: any) => {
            // Add metadata to assistant message
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, confidence: metadata.confidence }
                : msg
            ));

            // Update conversation ID if provided
            if (metadata.conversationId) {
              setConversationId(metadata.conversationId);
            }
          },
          onComplete: (fullResponse: string) => {
            // Mark as complete
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, isStreaming: false, isComplete: true }
                : msg
            ));
            setIsStreaming(false);
            console.log('✅ Streaming complete');
          },
          onError: (error: Error) => {
            console.error('❌ Streaming error:', error);
            
            // Mark message as error
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? { 
                    ...msg, 
                    content: msg.content || '❌ Failed to generate response',
                    isStreaming: false,
                    isComplete: true,
                  }
                : msg
            ));

            toast({
              title: 'Streaming Error',
              description: error.message,
              variant: 'destructive',
            });

            setIsStreaming(false);
          },
        }
      );
    } catch (error) {
      console.error('❌ Failed to start stream:', error);
      
      // Fallback to non-streaming
      try {
        const response = await enhancedApiClient.sendChatMessage({
          message: content,
          conversationId: conversationId || undefined,
          agentId: activeAgentId,
        });

        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? {
                id: response.data.message.id,
                type: 'assistant',
                content: response.data.message.content,
                timestamp: new Date(response.data.message.createdAt).getTime(),
                sources: response.data.message.sources,
                charts: response.data.message.charts,
                isComplete: true,
              }
            : msg
        ));

        setConversationId(response.data.conversationId);
      } catch (fallbackError) {
        toast({
          title: 'Message Failed',
          description: 'Unable to send message. Please try again.',
          variant: 'destructive',
        });
      }

      setIsStreaming(false);
    }
  }, [conversationId, activeAgentId, toast]);

  /**
   * Load conversation history
   */
  const loadHistory = useCallback(async (convId: string) => {
    try {
      const response = await enhancedApiClient.getConversationHistory(convId);
      
      if (response.success) {
        const loadedMessages: StreamingMessage[] = response.data.conversation.messages.map(msg => ({
          id: msg.id,
          type: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
          timestamp: new Date(msg.createdAt).getTime(),
          sources: msg.sources,
          charts: msg.charts,
          isComplete: true,
        }));

        setMessages(loadedMessages);
        setConversationId(convId);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      toast({
        title: 'Load Failed',
        description: 'Could not load conversation history',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    messages,
    conversationId,
    isStreaming,
    sendMessage,
    loadHistory,
  };
}

