import React from 'react';
import { HeroParticles } from '../particles/HeroParticles';

export const CanvasParticles: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
    <HeroParticles />
  </div>
); 