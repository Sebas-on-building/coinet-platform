import React from 'react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';

interface ComplianceExportButtonProps {
  logs?: any[]; // Array of log objects
  onExport?: () => Promise<void>;
  className?: string;
  i18n?: {
    export: string;
    tooltip: string;
    success: string;
    error: string;
    csv: string;
    pdf: string;
  };
}

/**
 * ComplianceExportButton - Atomic button for exporting OTP compliance logs (stub).
 */
export const ComplianceExportButton: React.FC<ComplianceExportButtonProps> = ({
  logs = [],
  onExport,
  className = '',
  i18n = {
    export: 'Export Compliance Logs',
    tooltip: 'Download OTP delivery and verification logs',
    success: 'Exported successfully!',
    error: 'Export failed',
    csv: 'Export CSV',
    pdf: 'Export PDF',
  },
}) => {
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleExportCSV = async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const csv = Papa.unparse(logs);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'otp_compliance_logs.csv';
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
      if (onExport) await onExport();
    } catch (e: any) {
      setError(i18n.error);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  const handleExportPDF = async () => {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const doc = new jsPDF();
      doc.text('OTP Compliance Logs', 10, 10);
      logs.forEach((log, i) => {
        doc.text(JSON.stringify(log), 10, 20 + i * 10);
      });
      doc.save('otp_compliance_logs.pdf');
      setSuccess(true);
      if (onExport) await onExport();
    } catch (e: any) {
      setError(i18n.error);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleExportCSV}
        disabled={loading}
        aria-busy={loading}
        aria-label={i18n.csv}
        title={i18n.tooltip}
        className="px-3 py-2 rounded-lg font-medium shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-gradient-to-br from-white/80 to-green-100/60 dark:from-slate-900/80 dark:to-green-900/60 border border-slate-200 dark:border-slate-700 text-green-700 dark:text-green-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        tabIndex={0}
      >
        {i18n.csv}
      </button>
      <button
        type="button"
        onClick={handleExportPDF}
        disabled={loading}
        aria-busy={loading}
        aria-label={i18n.pdf}
        title={i18n.tooltip}
        className="px-3 py-2 rounded-lg font-medium shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-gradient-to-br from-white/80 to-green-100/60 dark:from-slate-900/80 dark:to-green-900/60 border border-slate-200 dark:border-slate-700 text-green-700 dark:text-green-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        tabIndex={0}
      >
        {i18n.pdf}
      </button>
      {success && <span className="ml-2 text-green-600">{i18n.success}</span>}
      {error && <span className="ml-2 text-red-500">{error}</span>}
    </div>
  );
};

export default ComplianceExportButton; 