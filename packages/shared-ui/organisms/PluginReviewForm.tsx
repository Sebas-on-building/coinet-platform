import React, { useState } from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginReviewSubmitPayload {
  rating: number;
  text: string;
}

export interface PluginReviewFormProps {
  pluginId: string;
  theme?: 'light' | 'dark';
  onSubmitted?: () => void;
  /**
   * Auth-aware submission callback provided by the host application.
   * Must add appropriate authentication headers (Bearer token / X-User-Id)
   * and throw on failure so the form can surface the error.
   */
  submitReview: (pluginId: string, payload: PluginReviewSubmitPayload) => Promise<void>;
}

export const PluginReviewForm: React.FC<PluginReviewFormProps> = ({
  pluginId,
  theme = 'light',
  onSubmitted,
  submitReview,
}) => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await submitReview(pluginId, { rating, text });
      setSuccess(true);
      setText('');
      setRating(0);
      onSubmitted?.();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', marginBottom: tokens.spacing.md }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            style={{
              background: 'none',
              border: 'none',
              color: i <= rating ? tokens.colors.accent.blue[theme] : tokens.colors.border[theme],
              fontSize: 24,
              cursor: 'pointer',
              transition: `color ${tokens.motion.duration.short}`,
            }}
            aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write your review…"
        style={{
          width: '100%',
          minHeight: 60,
          marginTop: tokens.spacing.xs,
          padding: tokens.spacing.sm,
          borderRadius: tokens.radius.sm,
          border: `1px solid ${tokens.colors.border[theme]}`,
          fontSize: tokens.typography.fontSize.base,
          background: tokens.colors.surface[theme],
          color: tokens.colors.text[theme],
          outline: 'none',
          resize: 'vertical',
        }}
        aria-label="Review text"
        required
      />
      <button
        type="submit"
        disabled={loading || rating === 0 || !text.trim()}
        style={{
          marginTop: tokens.spacing.xs,
          padding: tokens.spacing.xs,
          borderRadius: tokens.radius.sm,
          background: tokens.colors.accent.blue[theme],
          color: tokens.colors.text[theme],
          fontWeight: 600,
          fontSize: tokens.typography.fontSize.sm,
          boxShadow: tokens.shadows.xs,
          minWidth: 80,
          transition: `background ${tokens.motion.duration.short}`,
          opacity: loading ? 0.5 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
          outline: 'none',
          border: 'none',
        }}
        aria-label="Submit review"
      >
        {loading ? 'Submitting…' : 'Submit'}
      </button>
      {error && <div style={{ color: tokens.colors.error[theme], marginTop: tokens.spacing.xs }}>{error}</div>}
      {success && <div style={{ color: tokens.colors.success[theme], marginTop: tokens.spacing.xs }}>Review submitted!</div>}
    </form>
  );
}; 