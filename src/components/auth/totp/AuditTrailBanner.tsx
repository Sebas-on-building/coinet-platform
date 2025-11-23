import React from 'react';

interface AuditEvent {
  event: string;
  timestamp: string;
  detail?: string;
}

interface AuditTrailBannerProps {
  events: AuditEvent[];
  className?: string;
}

export const AuditTrailBanner: React.FC<AuditTrailBannerProps> = ({ events, className }) => (
  <div
    className={`w-full max-w-xl mx-auto p-4 rounded-xl bg-gradient-to-br from-white/80 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-lg backdrop-blur-lg transition-all ${className}`}
    aria-label="Audit trail"
  >
    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Audit Trail</h3>
    <ol className="relative border-l-2 border-blue-400 ml-2">
      {events.map((e, i) => (
        <li key={i} className="mb-4 ml-4">
          <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-2.5 border-2 border-white dark:border-slate-900" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-300">{e.event}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(e.timestamp).toLocaleString()}</span>
            {e.detail && <span className="text-xs text-slate-600 dark:text-slate-300">{e.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
    {/* TODO: Add analytics, export, filtering, extensibility hooks */}
  </div>
);

export default AuditTrailBanner; 