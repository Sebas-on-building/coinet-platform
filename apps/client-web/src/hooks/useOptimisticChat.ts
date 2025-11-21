/**
 * 🚀 Optimistic Chat Hook - Divine UX
 * 
 * Provides optimistic updates for instant UI feedback
 * while handling background API calls and error recovery.
 */

import { useState, useCallback } from 'react';
import { enhancedApiClient, ChatMessageResponse } from '@/services/enhanced-api-client';
import { useToast } from '@/hooks/use-toast';

export interface OptimisticMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isOptimistic?: boolean;
  isPending?: boolean;
  isError?: boolean;
  sources?: any[];
  charts?: any[];
}

export function useOptimisticChat(activeAgentId?: string) {
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Send message with optimistic update
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Create optimistic user message
    const optimisticUserMessage: OptimisticMessage = {
      id: `temp_user_${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      isOptimistic: true,
    };

    // Immediately add to UI
    setMessages(prev => [...prev, optimisticUserMessage]);
    setIsLoading(true);

    // Create optimistic assistant message (placeholder)
    const optimisticAssistantMessage: OptimisticMessage = {
      id: `temp_assistant_${Date.now()}`,
      type: 'assistant',
      content: '',
      timestamp: Date.now(),
      isOptimistic: true,
      isPending: true,
    };

    setMessages(prev => [...prev, optimisticAssistantMessage]);

    try {
      // Make actual API call
      const response = await enhancedApiClient.sendChatMessage({
        message: content,
        conversationId: conversationId || undefined,
        agentId: activeAgentId,
        context: {
          includeSources: true,
          includeCharts: true,
          analysisDepth: 'standard',
        },
      }, {
        onProgress: (progress) => {
          // Update progress if needed
          console.log('📊 Progress:', progress);
        },
      });

      // Update conversation ID
      if (response.data.conversationId !== conversationId) {
        setConversationId(response.data.conversationId);
      }

      // Replace optimistic messages with real ones
      setMessages(prev => prev.map(msg => {
        if (msg.id === optimisticUserMessage.id) {
          // Keep user message as is (already correct)
          return { ...msg, isOptimistic: false };
        }
        if (msg.id === optimisticAssistantMessage.id) {
          // Replace with real assistant message
          return {
            id: response.data.message.id,
            type: 'assistant',
            content: response.data.message.content,
            timestamp: new Date(response.data.message.createdAt).getTime(),
            sources: response.data.message.sources,
            charts: response.data.message.charts,
            isOptimistic: false,
          };
        }
        return msg;
      }));

      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);

      // Mark optimistic messages as error
      setMessages(prev => prev.map(msg => {
        if (msg.id === optimisticUserMessage.id || msg.id === optimisticAssistantMessage.id) {
          return { ...msg, isError: true, isPending: false };
        }
        return msg;
      }));

      toast({
        title: 'Message Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, activeAgentId, toast]);

  /**
   * Regenerate message with optimistic update
   */
  const regenerateMessage = useCallback(async (messageId: string) => {
    if (!conversationId) return;

    setIsLoading(true);

    // Mark message as regenerating
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, isPending: true } : msg
    ));

    try {
      const response = await enhancedApiClient.regenerateMessage(conversationId, messageId);

      // Replace with new message
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? {
              id: response.data.message.id,
              type: 'assistant',
              content: response.data.message.content,
              timestamp: new Date(response.data.message.createdAt).getTime(),
              sources: response.data.message.sources,
              charts: response.data.message.charts,
            }
          : msg
      ));
    } catch (error) {
      console.error('❌ Failed to regenerate message:', error);
      
      // Remove pending state
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, isPending: false, isError: true } : msg
      ));

      toast({
        title: 'Regeneration Failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, toast]);

  /**
   * Delete message with optimistic removal
   */
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!conversationId) return;

    // Optimistically remove from UI
    const messagesToRestore = messages;
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    try {
      await enhancedApiClient.deleteMessage(conversationId, messageId);
    } catch (error) {
      console.error('❌ Failed to delete message:', error);
      
      // Restore messages on failure
      setMessages(messagesToRestore);

      toast({
        title: 'Delete Failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  }, [conversationId, messages, toast]);

  return {
    messages,
    conversationId,
    isLoading,
    sendMessage,
    regenerateMessage,
    deleteMessage,
  };
}

