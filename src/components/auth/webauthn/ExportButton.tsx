import React from 'react';

function toCSV(data: any[]): string {
  if (!data.length) return '';
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))];
  return rows.join('\n');
}

export const ExportButton: React.FC<{ data: any[]; filename: string }> = ({ data, filename }) => {
  const handleExport = () => {
    const csv = toCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      onClick={handleExport}
      className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
      aria-label="Export as CSV"
      title="Export as CSV"
    >
      Export
    </button>
  );
}; 