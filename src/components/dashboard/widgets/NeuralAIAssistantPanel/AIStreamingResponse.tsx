import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import styles from './design.module.css';
import { AIActionRegistry } from './AIActionRegistry';

interface AIStreamingResponseProps {
  response: string | null;
  streamResponse?: string | null;
  loading: boolean;
  onActionClick: (actionId: string, chartContext?: any) => void;
  chartContext?: any;
}

export const AIStreamingResponse: React.FC<AIStreamingResponseProps> = ({ response, streamResponse, loading, onActionClick, chartContext }) => {
  // Extract action suggestions from the response (simple pattern match for demo)
  const actions = useMemo(() => {
    if (!response) return [];
    // Example: Look for [Action: action-id] in the response
    const matches = [...response.matchAll(/\[Action: ([^\]]+)\]/g)];
    return matches.map(m => m[1]).filter(id => AIActionRegistry[id]);
  }, [response]);

  return (
    <div className={styles['ai-streaming-response']} aria-live="polite">
      {loading && (
        <div className={styles['ai-streaming-loader']}>Thinking<span className={styles['ai-streaming-ellipsis']}>…</span></div>
      )}
      {response && (
        <div className={styles['ai-streaming-animated']}>
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{response}</ReactMarkdown>
          {actions.length > 0 && (
            <div className={styles['ai-action-list']}>
              {actions.map(actionId => (
                <button
                  key={actionId}
                  className={styles['ai-action-button']}
                  onClick={() => onActionClick(actionId, chartContext)}
                  aria-label={`Apply action: ${AIActionRegistry[actionId].label}`}
                >
                  {AIActionRegistry[actionId].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 