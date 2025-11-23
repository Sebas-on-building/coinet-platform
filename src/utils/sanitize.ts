import DOMPurify from 'dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function sanitizeText(text: string): string {
  // Remove any script tags or suspicious characters
  return text.replace(/[<>]/g, '');
} 