import React from 'react';

interface QRCodeDisplayProps {
  qr: string;
  alt?: string;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ qr, alt, className }) => (
  <div
    className={`relative flex items-center justify-center p-6 rounded-2xl shadow-xl bg-gradient-to-br from-white/80 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700 backdrop-blur-lg transition-all ${className}`}
    aria-label={alt || 'QR code'}
    role="img"
  >
    <img
      src={qr}
      alt={alt || 'TOTP QR code'}
      className="w-40 h-40 rounded-xl shadow-lg border border-slate-300 dark:border-slate-600 transition-all hover:scale-105 focus:scale-105 outline-none"
      tabIndex={0}
      aria-label={alt || 'TOTP QR code'}
    />
    {/* Micro-interaction: animated border on hover/focus */}
    <span className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-transparent hover:border-blue-400 focus-within:border-blue-400 transition-all" />
  </div>
);

export default QRCodeDisplay; 