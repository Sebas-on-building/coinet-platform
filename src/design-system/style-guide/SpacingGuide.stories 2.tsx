import React from 'react';
import { spacing } from '../tokens/spacing';

export default {
  title: 'Style Guide/Spacing',
};

export const AllSpacing = () => (
  <div style={{ padding: 32, background: 'linear-gradient(90deg, #f8fafc 0%, #e0e7ff 100%)', borderRadius: 16 }}>
    {Object.entries(spacing).map(([key, value]) => (
      <div key={key} style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'inline-block', width: value, height: 24, background: '#00ffa3', borderRadius: 6, marginRight: 16 }} />
        <span style={{ fontWeight: 600 }}>{key}: {value}</span>
      </div>
    ))}
  </div>
); 