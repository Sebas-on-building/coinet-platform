import React from 'react';
import { typography } from '../tokens/typography';

export default {
  title: 'Style Guide/Typography',
};

export const AllTypography = () => (
  <div style={{ padding: 32, background: 'linear-gradient(90deg, #f8fafc 0%, #e0e7ff 100%)', borderRadius: 16 }}>
    {Object.entries(typography.fontSize).map(([key, size]) => (
      <div key={key} style={{ fontSize: size, fontFamily: typography.fontFamily.sans, marginBottom: 18, fontWeight: 700, letterSpacing: 0.01 }}>
        {key} — {size} — The quick brown fox jumps over the lazy dog.
      </div>
    ))}
  </div>
); 