/**
 * Atomic CardExportShare for Coinet Card system
 * Export/share button for CSV, PDF, image, and Web Share API
 * Uses design tokens, ARIA, analytics, and compliance hooks
 */
import React from 'react';
import { useCardAnalytics } from './CardAnalytics';
import { useCardCompliance } from './CardCompliance';

export interface CardExportShareProps {
  cardId?: string;
  data: any;
  exportOptions?: ('csv' | 'pdf' | 'image')[];
  shareOptions?: { title?: string; text?: string; url?: string };
  className?: string;
  style?: React.CSSProperties;
}

export const CardExportShare: React.FC<CardExportShareProps> = ({ cardId, data, exportOptions = ['csv', 'pdf', 'image'], shareOptions, className, style }) => {
  const { track } = useCardAnalytics();
  const { log, exportData } = useCardCompliance();

  const handleExport = (format: 'csv' | 'pdf' | 'image') => {
    exportData?.(format, data);
    log?.({ type: 'export', cardId, format, meta: { data } });
    track?.({ type: 'custom', name: 'export', cardId, meta: { format } });
  };

  const handleShare = async () => {
    if (navigator.share && shareOptions) {
      try {
        await navigator.share(shareOptions);
        track?.({ type: 'custom', name: 'share', cardId, meta: { shareOptions } });
      } catch { }
    }
  };

  return (
    <div className={["co-card-export-share", className].filter(Boolean).join(' ')} style={{ display: 'flex', gap: 8, ...style }}>
      {exportOptions.includes('csv') && (
        <button aria-label="Export CSV" onClick={() => handleExport('csv')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" fill="none" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" /><path d="M7 8h6M7 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      )}
      {exportOptions.includes('pdf') && (
        <button aria-label="Export PDF" onClick={() => handleExport('pdf')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" fill="none" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" /><path d="M7 8h6M7 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="10" r="2" fill="currentColor" /></svg>
        </button>
      )}
      {exportOptions.includes('image') && (
        <button aria-label="Export Image" onClick={() => handleExport('image')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" fill="none" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="8" r="2" fill="currentColor" /><path d="M5 15l4-4 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      )}
      {shareOptions && typeof navigator.share === 'function' && (
        <button aria-label="Share" onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" /><path d="M10 6v8M10 6l-3 3M10 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      )}
    </div>
  );
}; 