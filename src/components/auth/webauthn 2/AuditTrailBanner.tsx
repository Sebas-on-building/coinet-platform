import React, { useState } from 'react';
import { ExportButton } from './ExportButton';

const AuditEventRow: React.FC<{ event: any }> = ({ event }) => (
  <li className="mb-4 ml-4">
    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-2.5 border-2 border-white dark:border-slate-900" />
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-bold text-blue-600 dark:text-blue-300">{event.event}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(event.timestamp).toLocaleString()}</span>
      {event.detail && <span className="text-xs text-slate-600 dark:text-slate-300">{event.detail}</span>}
    </div>
  </li>
);

export const AuditTrailBanner: React.FC<{ events: any[] }> = ({ events }) => {
  const [filter, setFilter] = useState('');
  const filtered = filter ? events.filter(e => e.event.toLowerCase().includes(filter.toLowerCase())) : events;
  return (
    <div className="w-full max-w-xl mx-auto p-4 rounded-xl bg-gradient-to-br from-white/80 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-lg backdrop-blur-lg transition-all">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Audit Trail</h3>
        <ExportButton data={filtered} filename="audit-trail.csv" />
      </div>
      <input
        className="w-48 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/70 text-xs mb-2"
        placeholder="Filter events..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        aria-label="Filter audit events"
      />
      <ol className="relative border-l-2 border-blue-400 ml-2">
        {filtered.map((e, i) => <AuditEventRow key={i} event={e} />)}
      </ol>
    </div>
  );
}; 