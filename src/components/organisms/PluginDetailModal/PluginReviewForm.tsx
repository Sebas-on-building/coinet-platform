import React, { useState } from 'react';
import styles from './PluginReviewForm.module.css';
import { ReviewTextInput } from './atoms/ReviewTextInput';
import { ReviewRatingStars } from './atoms/ReviewRatingStars';
import { ReviewSubmitButton } from './atoms/ReviewSubmitButton';

export interface PluginReviewFormProps {
  onSubmit: (review: { text: string; rating: number }) => void;
  loading?: boolean;
  aiSuggestions?: string[];
  emojiReactions?: string[];
}

export const PluginReviewForm: React.FC<PluginReviewFormProps> = ({ onSubmit, loading, aiSuggestions, emojiReactions }) => {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please enter your review.');
      return;
    }
    if (rating === 0) {
      setError('Please select a rating.');
      return;
    }
    setError(null);
    onSubmit({ text, rating });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Plugin Review Form">
      <ReviewRatingStars value={rating} onChange={setRating} />
      <ReviewTextInput value={text} onChange={setText} aiSuggestions={aiSuggestions} emojiReactions={emojiReactions} />
      {error && <div className={styles.error} role="alert">{error}</div>}
      <ReviewSubmitButton loading={loading} disabled={loading || !text.trim() || rating === 0} />
    </form>
  );
}; 