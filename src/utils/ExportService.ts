import type { CardEvent } from '../components/ui/Card/CardEventLog';

// Atomic CSV export
export function createCSV(events: CardEvent[], columns: string[]): string {
  const header = columns.join(',');
  const rows = events.map(e => columns.map(col => JSON.stringify((e as any)[col] ?? '')).join(','));
  return [header, ...rows].join('\n');
}

// Atomic PDF export (stub, ready for extension)
export async function createPDF(events: CardEvent[], columns: string[]): Promise<void> {
  // TODO: Implement beautiful, branded PDF export (use jsPDF, pdf-lib, or similar)
  alert('PDF export is coming soon!');
} 