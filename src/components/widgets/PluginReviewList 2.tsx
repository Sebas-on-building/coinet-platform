import React from 'react';
import { PluginReviewListItem } from './PluginReviewListItem';

export const PluginReviewList: React.FC<{ reviews: { user: string; rating: number; text: string }[] }> = ({ reviews }) => {
  const avg = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);
  return (
    <div style={{ marginBottom: 12 }}>
      <h5 style={{ fontWeight: 500, fontSize: 16 }}>Reviews (Avg: {avg}⭐)</h5>
      <ul>
        {reviews.map((r, i) => (
          <PluginReviewListItem key={i} user={r.user} text={r.text} rating={r.rating} />
        ))}
      </ul>
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </div>
  );
}; 