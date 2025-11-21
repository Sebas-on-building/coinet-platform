// Utility to check color contrast ratio (WCAG AAA)
// Usage: ColorContrastChecker.isAccessible('#fff', '#000')
export class ColorContrastChecker {
  static luminance(hex: string) {
    const rgb = hex.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16) / 255) || [0, 0, 0];
    const [r, g, b] = rgb.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  static ratio(hex1: string, hex2: string) {
    const l1 = this.luminance(hex1);
    const l2 = this.luminance(hex2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  static isAccessible(hex1: string, hex2: string, level: 'AA' | 'AAA' = 'AAA') {
    const ratio = this.ratio(hex1, hex2);
    return level === 'AAA' ? ratio >= 7 : ratio >= 4.5;
  }
} 