import React, { useRef, useState } from 'react';
import styles from './ReviewTextInput.module.css';

interface ReviewTextInputProps {
  value: string;
  onChange: (v: string) => void;
  aiSuggestions?: string[];
  emojiReactions?: string[];
}

export const ReviewTextInput: React.FC<ReviewTextInputProps> = ({ value, onChange, aiSuggestions = [], emojiReactions = [] }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <div className={styles.inputWrap}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Write your review..."
        maxLength={1000}
        aria-label="Review text"
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        rows={1}
      />
      <div className={styles.toolbar}>
        <span className={styles.charCount}>{value.length}/1000</span>
        <button
          type="button"
          className={styles.emojiBtn}
          aria-label="Add emoji"
          onClick={() => setShowEmojis(v => !v)}
        >😊</button>
      </div>
      {showSuggestions && aiSuggestions.length > 0 && (
        <ul className={styles.suggestions} role="listbox">
          {aiSuggestions.map((s, i) => (
            <li key={i} className={styles.suggestion} onClick={() => onChange(s)} tabIndex={0} role="option">{s}</li>
          ))}
        </ul>
      )}
      {showEmojis && emojiReactions.length > 0 && (
        <ul className={styles.emojis} role="listbox">
          {emojiReactions.map((e, i) => (
            <li key={i} className={styles.emoji} onClick={() => onChange(value + e)} tabIndex={0} role="option">{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}; 