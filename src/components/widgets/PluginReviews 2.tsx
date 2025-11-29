import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PluginReviewForm } from './PluginReviewForm';
import { PluginReviewList } from './PluginReviewList';

export const PluginReviews: React.FC<{ pluginKey: string }> = ({ pluginKey }) => {
  const [reviews, setReviews] = useState([
    { user: 'Alice', rating: 5, text: 'Amazing plugin!' },
    { user: 'Bob', rating: 4, text: 'Very useful.' },
  ]);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const handleAdd = () => {
    setReviews(r => [...r, { user: 'You', rating, text }]);
    setText('');
    setRating(5);
  };
  const avg = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);
  return (
    <div style={{ margin: '24px 0' }}>
      <h4 style={{ fontWeight: 600, fontSize: 18 }}>Reviews (Avg: {avg}⭐)</h4>
      <PluginReviewList reviews={reviews} />
      <PluginReviewForm onAdd={review => setReviews(r => [...r, review])} />
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </div>
  );
}; 