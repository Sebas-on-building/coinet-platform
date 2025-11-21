import React, { useRef } from 'react';
import styles from './design.module.css';

interface AIPromptInputProps {
  input: string;
  setInput: (val: string) => void;
  suggestions: string[];
  loading: boolean;
  onAsk: (prompt: string) => void;
  onSuggestionClick: (suggestion: string) => void;
}

export const AIPromptInput: React.FC<AIPromptInputProps> = ({ input, setInput, suggestions, loading, onAsk, onSuggestionClick }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <form
      className={styles['prompt-form']}
      onSubmit={e => {
        e.preventDefault();
        if (input.trim()) onAsk(input);
      }}
      aria-label="Ask AI assistant"
    >
      <input
        ref={inputRef}
        className={styles['prompt-input']}
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="e.g. How can I make this chart more readable?"
        aria-label="Ask AI assistant"
        disabled={loading}
        autoFocus
      />
      <button
        className={styles['prompt-button']}
        type="submit"
        disabled={loading}
        aria-label="Submit AI prompt"
      >
        {loading ? 'Thinking…' : 'Ask'}
      </button>
      <div className={styles.suggestions} role="list">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className={styles['suggestion-button']}
            onClick={e => {
              e.preventDefault();
              onSuggestionClick(s);
            }}
            disabled={loading}
            tabIndex={0}
            aria-label={`Suggestion: ${s}`}
          >
            {s}
          </button>
        ))}
      </div>
    </form>
  );
};

export default AIPromptInput;
