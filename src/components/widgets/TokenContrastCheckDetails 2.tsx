import React from 'react';
import { TokenContrastCheckDetailsSwatch } from './TokenContrastCheckDetailsSwatch';
import { TokenContrastCheckDetailsContrast } from './TokenContrastCheckDetailsContrast';
import { TokenContrastCheckDetailsWCAG } from './TokenContrastCheckDetailsWCAG';

export const TokenContrastCheckDetails: React.FC<{ color: string; contrast: number; wcag: string }> = ({ color, contrast, wcag }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
    <TokenContrastCheckDetailsSwatch color={color} />
    <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{color}</span>
    <TokenContrastCheckDetailsContrast contrast={contrast} />
    <TokenContrastCheckDetailsWCAG wcag={wcag} />
    {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
  </div>
); 