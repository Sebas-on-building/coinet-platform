import React, { useState, useEffect } from 'react';
import styles from './design.module.css';
import { AIPromptInput } from './AIPromptInput';
import { AIStreamingResponse } from './AIStreamingResponse';
import { AIErrorDisplay } from './AIErrorDisplay';
import { useAIAssistant } from './useAIAssistant';
import { useChartContext } from '@/contexts/ChartContext';
import { AISharedHistory } from './AISharedHistory';
import { AssistantOnboarding } from './AssistantOnboarding';
import { AssistantPreferences } from './AssistantPreferences';
import { LivePresenceCursors } from './LivePresenceCursors';
import { LiveCursorTrails } from './LiveCursorTrails';

const DEFAULT_PREFS = {
  tone: 'friendly',
  verbosity: 'medium',
  theme: 'system',
  behavior: 'default',
};

interface NeuralAIAssistantPanelProps {
  open?: boolean;
  context?: string;
  onClose?: () => void;
}

export const NeuralAIAssistantPanel: React.FC<NeuralAIAssistantPanelProps> = ({ open = true, context, onClose }) => {
  const {
    input, setInput, suggestions, loading, response, error, streamResponse, handleAsk, handleSuggestionClick, handleActionClick, history
  } = useAIAssistant({ context });
  const chartContext = useChartContext();

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('coi_ai_onboarded'));
  const [showPrefs, setShowPrefs] = useState(false);
  const [preferences, setPreferences] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('coi_ai_prefs') || '') || DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    localStorage.setItem('coi_ai_prefs', JSON.stringify(preferences));
  }, [preferences]);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('coi_ai_onboarded', '1');
  };

  if (!open) return null;

  return (
    <div className={styles.panel} aria-label="AI Assistant Panel">
      <LiveCursorTrails />
      <LivePresenceCursors />
      {showOnboarding && <AssistantOnboarding onClose={handleOnboardingClose} />}
      {showPrefs && <AssistantPreferences preferences={preferences} onChange={setPreferences} />}
      <button className={styles.close} onClick={onClose} aria-label="Close AI assistant">×</button>
      <h3 className={styles.title}>AI Assistant</h3>
      <div className={styles.subtitle}>Ask anything about your chart or get smart suggestions.</div>
      <button className={styles['prefs-button']} onClick={() => setShowPrefs(p => !p)} aria-label="Open AI assistant preferences">⚙️</button>
      <button className={styles['feedback-button']} onClick={() => setShowFeedback(f => !f)} aria-label="Send feedback">💬</button>
      {showFeedback && (
        <div className={styles['feedback-modal']}>
          <h4>Feedback</h4>
          <textarea className={styles['feedback-textarea']} placeholder="How can we make the AI assistant even better?" />
          <button className={styles['feedback-submit']}>Send</button>
          <button className={styles['feedback-close']} onClick={() => setShowFeedback(false)}>Close</button>
        </div>
      )}
      <AIPromptInput
        input={input}
        setInput={setInput}
        suggestions={suggestions}
        loading={loading}
        onAsk={handleAsk}
        onSuggestionClick={handleSuggestionClick}
      />
      {error && <AIErrorDisplay error={error} />}
      <AIStreamingResponse
        response={response}
        streamResponse={streamResponse}
        loading={loading}
        onActionClick={(actionId) => handleActionClick(actionId, chartContext)}
        chartContext={chartContext}
      />
      <AISharedHistory events={history} />
    </div>
  );
}; 