import React, { useState } from 'react';

interface SecretDisplayProps {
  secret: string;
  label?: string;
  className?: string;
}

export const SecretDisplay: React.FC<SecretDisplayProps> = ({ secret, label = 'Secret Key', className }) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-white/80 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-lg backdrop-blur-lg transition-all ${className}`}
      aria-label={label}
    >
      <span className="font-mono text-lg tracking-widest select-all" aria-label={revealed ? secret : '••••••••••'}>
        {revealed ? secret : '••••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label={revealed ? 'Hide secret' : 'Show secret'}
      >
        {revealed ? 'Hide' : 'Show'}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className={`px-2 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 ${copied ? 'ring-2 ring-green-400' : ''}`}
        aria-label="Copy secret"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

export default SecretDisplay; 