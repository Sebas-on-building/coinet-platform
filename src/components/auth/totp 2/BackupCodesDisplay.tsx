import React, { useState } from 'react';

interface BackupCodesDisplayProps {
  codes: string[];
  className?: string;
}

export const BackupCodesDisplay: React.FC<BackupCodesDisplayProps> = ({ codes, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleDownload = () => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coient-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const win = window.open('', '', 'width=600,height=400');
    if (win) {
      win.document.write('<pre>' + codes.join('\n') + '</pre>');
      win.print();
      win.close();
    }
  };

  return (
    <div
      className={`p-6 rounded-2xl shadow-xl bg-gradient-to-br from-white/80 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700 backdrop-blur-lg transition-all flex flex-col items-center gap-4 ${className}`}
      aria-label="Backup codes"
    >
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
        {codes.map((code, i) => (
          <span key={i} className="font-mono text-base px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center select-all shadow-sm">
            {code}
          </span>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleCopy}
          className={`px-3 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 ${copied ? 'ring-2 ring-green-400' : ''}`}
          aria-label="Copy all backup codes"
        >
          {copied ? 'Copied!' : 'Copy All'}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="px-3 py-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Download backup codes"
        >
          Download
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="px-3 py-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Print backup codes"
        >
          Print
        </button>
      </div>
      {/* TODO: Add analytics, export, sharing, and more extensibility hooks */}
    </div>
  );
};

export default BackupCodesDisplay; 