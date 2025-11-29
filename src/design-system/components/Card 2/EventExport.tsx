import React, { useState } from 'react';
import { createCSV, createPDF } from '@/utils/ExportService';
import type { CardEvent } from './CardEventLog';
import { Modal } from '../Modal';

// Atomic, animated, accessible export button
export const ExportButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ ...props }) => (
  <button
    {...props}
    className={["co-export-btn", props.className].filter(Boolean).join(' ')}
    style={{
      background: 'var(--color-accent-blue)',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '8px 16px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 15,
      boxShadow: 'var(--shadow-md)',
      transition: 'background 0.2s, box-shadow 0.2s',
      outline: 'none',
      ...props.style,
    }}
    aria-label={props['aria-label'] || 'Export'}
    tabIndex={0}
    onMouseDown={e => e.currentTarget.classList.add('active')}
    onMouseUp={e => e.currentTarget.classList.remove('active')}
    onBlur={e => e.currentTarget.classList.remove('active')}
  >
    <span style={{ marginRight: 6, fontWeight: 900 }}>⤓</span> Export
  </button>
);

// Modal for export options and preview
export const ExportModal: React.FC<{
  events: CardEvent[];
  onClose: () => void;
}> = ({ events, onClose }) => {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [columns, setColumns] = useState<string[]>(['type', 'timestamp', 'source']);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const allColumns = Array.from(new Set(events.flatMap(e => Object.keys(e))));

  const handleExport = async () => {
    setLoading(true);
    try {
      if (format === 'csv') {
        const csv = createCSV(events, columns);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event-log-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        await createPDF(events, columns);
      }
    } finally {
      setLoading(false);
      onClose();
    }
  };

  React.useEffect(() => {
    // Generate preview
    if (format === 'csv') {
      setPreview(createCSV(events.slice(0, 5), columns));
    } else {
      setPreview('PDF preview not available inline.');
    }
  }, [format, columns, events]);

  return (
    <Modal open={true} onClose={onClose} title="Export Event Log" size="md" animation="fade" overlay closeButton aria-label="Export Event Log Modal">
      <label style={{ display: 'block', marginBottom: 8 }}>
        Format:
        <select value={format} onChange={e => setFormat(e.target.value as 'csv' | 'pdf')} style={{ marginLeft: 8, borderRadius: 8, padding: 4 }}>
          <option value="csv">CSV</option>
          <option value="pdf">PDF</option>
        </select>
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Columns:
        <select multiple value={columns} onChange={e => setColumns(Array.from(e.target.selectedOptions, o => o.value))} style={{ marginLeft: 8, borderRadius: 8, padding: 4, minHeight: 60 }}>
          {allColumns.map(col => <option key={col} value={col}>{col}</option>)}
        </select>
      </label>
      <div style={{ margin: '12px 0', background: 'var(--color-background)', borderRadius: 8, padding: 12, fontSize: 13, maxHeight: 120, overflow: 'auto' }}>
        <strong>Preview:</strong>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{preview}</pre>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={onClose} style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 700, background: 'var(--color-border)', color: 'var(--color-text)', border: 'none', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleExport} disabled={loading} style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 700, background: 'var(--color-accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Exporting...' : 'Export'}</button>
      </div>
    </Modal>
  );
}; 