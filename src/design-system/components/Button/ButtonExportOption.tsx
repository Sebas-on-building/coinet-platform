/**
 * ButtonExportOption – Atomic export option for Coinet
 * Extensible, accessible, themeable
 */
import React from 'react';

export interface ButtonExportOptionProps {
  type: 'csv' | 'pdf' | 'json';
  data: any;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonExportOption for export formats
 */
export const ButtonExportOption: React.FC<ButtonExportOptionProps> = ({
  type,
  data,
  onClose,
  className,
  style,
}) => {
  const handleExport = () => {
    // TODO: Implement export logic for each type
    // For now, just close the menu
    onClose();
  };
  const labels: Record<string, string> = {
    csv: 'Export as CSV',
    pdf: 'Export as PDF',
    json: 'Export as JSON',
  };
  return (
    <button
      className={["co-btn-export-option", className].filter(Boolean).join(' ')}
      style={{
        display: 'block',
        width: '100%',
        background: 'none',
        border: 'none',
        padding: '8px 0',
        color: 'var(--color-text)',
        fontSize: 15,
        textAlign: 'left',
        cursor: 'pointer',
        borderRadius: 6,
        ...style,
      }}
      onClick={handleExport}
      aria-label={labels[type]}
      role="menuitem"
    >
      {labels[type]}
    </button>
  );
}; 