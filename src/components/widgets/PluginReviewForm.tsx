import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PluginReviewFormField } from './PluginReviewFormField';

export const PluginReviewForm: React.FC<{ onAdd: (review: { user: string; rating: number; text: string }) => void }> = ({ onAdd }) => {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  return (
    <form onSubmit={e => { e.preventDefault(); onAdd({ user: 'You', rating, text }); setText(''); setRating(5); }} style={{ marginBottom: 8 }}>
      <div style={{ marginBottom: 8 }}>
        <PluginReviewFormField id="review-input" label="Your review" value={text} onChange={setText} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <PluginReviewFormField id="rating-input" label="Rating (1-5)" value={rating} onChange={v => setRating(Number(v))} type="number" />
      </div>
      <Button type="submit" disabled={!text}>Add Review</Button>
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </form>
  );
}; 