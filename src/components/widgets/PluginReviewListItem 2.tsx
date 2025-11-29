import React from 'react';

export const PluginReviewListItem: React.FC<{ user: string; text: string; rating: number }> = ({ user, text, rating }) => (
  <li style={{ marginBottom: 4 }}>
    <strong>{user}:</strong> {text} <span style={{ color: '#f59e42' }}>({rating}⭐)</span>
    {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
  </li>
); 