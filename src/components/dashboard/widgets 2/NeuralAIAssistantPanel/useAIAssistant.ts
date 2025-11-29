import { useState, useRef, useEffect, useContext } from 'react';
import { AIActionRegistry } from './AIActionRegistry';
import { useBroadcastEvent, useEventListener, useSelf } from '@liveblocks/react';
import { NotificationContext } from '@/contexts/NotificationContext';

export function useAIAssistant({ context }: { context?: string }) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([
    'Increase font size for readability',
    'Simplify this chart into a bar chart',
    'Highlight outliers',
  ]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const broadcast = useBroadcastEvent();
  const self = useSelf();
  const notificationCtx = useContext(NotificationContext);

  // Listen for AI events from collaborators
  useEventListener('ai-event', (event: any) => {
    setHistory(h => [...h, event]);
  });

  const handleAsk = async (prompt: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const user = self?.info || { name: 'You', color: '#00ffe7' };
    const queryEvent = {
      id: Math.random().toString(36).slice(2),
      user,
      type: 'query',
      content: prompt,
      timestamp: Date.now(),
    };
    setHistory(h => [...h, queryEvent]);
    broadcast({ type: 'ai-event', ...queryEvent });
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
        signal: abortRef.current.signal,
      });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += new TextDecoder().decode(value);
        setResponse(result);
      }
      const responseEvent = {
        id: Math.random().toString(36).slice(2),
        user,
        type: 'response',
        content: result,
        timestamp: Date.now(),
      };
      setHistory(h => [...h, responseEvent]);
      broadcast({ type: 'ai-event', ...responseEvent });
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleAsk(suggestion);
  };

  const handleActionClick = (actionId: string, chartContext: any) => {
    const action = AIActionRegistry[actionId];
    if (action) action.apply(chartContext);
    const user = self?.info || { name: 'You', color: '#00ffe7' };
    const actionEvent = {
      id: Math.random().toString(36).slice(2),
      user,
      type: 'action',
      content: actionId,
      timestamp: Date.now(),
    };
    setHistory(h => [...h, actionEvent]);
    broadcast({ type: 'ai-event', ...actionEvent });
    // Push notification for AI action
    if (notificationCtx && notificationCtx.addNotification) {
      notificationCtx.addNotification(user.userId || 'system', {
        type: 'ai-action',
        threadId: undefined,
        commentId: undefined,
        fromUserId: user.userId || 'system',
        fromUserName: user.name,
        fromUserAvatar: user.avatarUrl,
        content: `AI action: ${actionId}`,
      });
    }
  };

  return {
    input,
    setInput,
    suggestions,
    loading,
    response,
    error,
    handleAsk,
    handleSuggestionClick,
    handleActionClick,
    streamResponse: response, // for compatibility
    history,
  };
} 