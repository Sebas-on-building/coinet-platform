import React from 'react';
import { colors } from '../tokens/colors';

export default {
  title: 'Style Guide/Colors',
};

export const AllColors = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, padding: 32, background: 'linear-gradient(90deg, #f8fafc 0%, #e0e7ff 100%)', borderRadius: 16 }}>
    {Object.entries(colors.light).map(([name, value]) => (
      <div key={name} style={{ width: 140, height: 90, background: value, color: '#18192b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {name}
      </div>
    ))}
    {/* Repeat for dark/brand/gradient tokens as needed */}
  </div>
); 