import React from 'react';
import { TokenContrastCheckDetails } from './TokenContrastCheckDetails';

/**
 * Converts an sRGB channel value (0–255) to its linear-light equivalent
 * per the WCAG 2.x relative luminance formula.
 */
function toLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Parses rgb/rgba strings like "rgb(255,0,0)" or "rgba(255,0,0,0.5)".
 * Returns [r,g,b] in 0–255 or null.
 */
function parseRgb(str: string): [number, number, number] | null {
  const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  const r = Math.min(255, Math.max(0, parseInt(m[1], 10)));
  const g = Math.min(255, Math.max(0, parseInt(m[2], 10)));
  const b = Math.min(255, Math.max(0, parseInt(m[3], 10)));
  return [r, g, b];
}

/**
 * Returns the WCAG relative luminance (0–1) for a hex or rgb/rgba color string.
 * Returns null if the color cannot be parsed.
 */
function relativeLuminance(color: string): number | null {
  const trimmed = color.trim();
  const rgb = parseRgb(trimmed);
  if (rgb) {
    const [r, g, b] = rgb;
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return L;
  }
  const clean = trimmed.replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean.length === 6
      ? clean
      : null;
  if (!full) return null;
  const n = parseInt(full, 16);
  if (isNaN(n)) return null;
  const r = toLinear((n >> 16) & 0xff);
  const g = toLinear((n >> 8) & 0xff);
  const b = toLinear(n & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes WCAG contrast ratio between a foreground color and a background.
 * @param foreground - Hex or rgb/rgba color string
 * @param backgroundLuminance - Background luminance (0–1). Default 1 (white).
 * @returns { ratio, wcag } where wcag is 'AAA' | 'AA' | 'AA Large' | 'Fail'.
 */
function contrastResult(
  foreground: string,
  backgroundLuminance = 1
): { ratio: number; wcag: string } {
  const L = relativeLuminance(foreground);
  if (L === null) return { ratio: 0, wcag: 'Fail' };
  const lighter = Math.max(L, backgroundLuminance);
  const darker = Math.min(L, backgroundLuminance);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  const rounded = Math.round(ratio * 100) / 100;
  let wcag: string;
  if (ratio >= 7) {
    wcag = 'AAA';
  } else if (ratio >= 4.5) {
    wcag = 'AA';
  } else if (ratio >= 3) {
    wcag = 'AA Large';
  } else {
    wcag = 'Fail';
  }
  return { ratio: rounded, wcag };
}

export const TokenContrastCheck: React.FC<{
  colors: Record<string, string>;
  background?: string;
}> = ({ colors, background }) => {
  const bgL = background ? relativeLuminance(background) : 1;
  const bgLuminance = bgL ?? 1;
  const results = Object.entries(colors).map(([key, value]) => {
    const { ratio, wcag } = contrastResult(value, bgLuminance);
    return { key, value, ratio, wcag };
  });
  return (
    <div style={{ margin: '12px 0' }}>
      <h5 style={{ fontWeight: 500, fontSize: 16 }}>Contrast Check</h5>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 0, flexWrap: 'wrap' }}>
        {results.map(r => (
          <li key={r.key}>
            <TokenContrastCheckDetails color={r.value} contrast={r.ratio} wcag={r.wcag} />
          </li>
        ))}
      </ul>
    </div>
  );
}; 