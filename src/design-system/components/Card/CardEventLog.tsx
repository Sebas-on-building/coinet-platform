import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { CardAnalyticsEvent } from './CardAnalytics';
import type { CardComplianceEvent } from './CardCompliance';
import { ExportButton, ExportModal } from './EventExport';
import { EventDetailsModal } from './EventDetailsModal';
import { AnimatePresence, motion } from 'framer-motion';
import { PinButton } from './PinButton';
import { EventCheckbox } from './EventCheckbox';
import { SelectAllCheckbox } from './SelectAllCheckbox';
import { BatchActionBar } from './BatchActionBar';

export type CardEvent = (CardAnalyticsEvent | CardComplianceEvent) & { timestamp: number; source: 'analytics' | 'compliance' };

interface CardEventLogProps {
  events: CardEvent[];
  onClear?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const typeColor: Record<string, string> = {
  click: 'var(--color-accent-blue)',
  drag: 'var(--color-accent-purple)',
  resize: 'var(--color-accent-green)',
  contextMenu: 'var(--color-accent-yellow)',
  export: 'var(--color-accent-pink)',
  undo: 'var(--color-accent-orange)',
  redo: 'var(--color-accent-orange)',
  custom: 'var(--color-accent-cyan)',
};

export const CardEventLog: React.FC<CardEventLogProps> = ({ events, onClear, style, className }) => {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CardEvent | null>(null);
  const [lastEventId, setLastEventId] = useState<number | null>(null);
  const eventRefs = useRef<(HTMLLIElement | null)[]>([]);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const filtered = useMemo(() => {
    return events.filter(e =>
      (filter === 'all' || e.type === filter) &&
      (search === '' || JSON.stringify(e).toLowerCase().includes(search.toLowerCase()))
    );
  }, [events, filter, search]);

  useEffect(() => {
    if (filtered.length > 0 && filtered[0].timestamp !== lastEventId) {
      setLastEventId(filtered[0].timestamp);
      // Announce new event
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `New event: ${filtered[0].type}`;
      }
      // Focus new event if keyboard user
      setTimeout(() => {
        eventRefs.current[0]?.focus();
      }, 120);
    }
  }, [filtered, lastEventId]);

  // Sort: pinned events first, then by timestamp desc
  const sorted = React.useMemo(() => {
    const withPin = filtered.map(e => ({ ...e, pinned: !!pinned[e.timestamp] }));
    return [
      ...withPin.filter(e => e.pinned).sort((a, b) => b.timestamp - a.timestamp),
      ...withPin.filter(e => !e.pinned).sort((a, b) => b.timestamp - a.timestamp),
    ];
  }, [filtered, pinned]);

  // Select all logic
  const allIds = sorted.map(e => e.timestamp);
  const selectedIds = allIds.filter(id => selected[id]);
  const allSelected = selectedIds.length === allIds.length && allIds.length > 0;
  const indeterminate = selectedIds.length > 0 && selectedIds.length < allIds.length;

  // Batch action handlers
  const handleBatchExport = () => {/* TODO: Implement batch export */ };
  const handleBatchFlag = () => {/* TODO: Implement batch flag */ };
  const handleBatchReview = () => {/* TODO: Implement batch review */ };
  const handleBatchClear = () => setSelected({});

  return (
    <section
      className={["co-card-event-log", className].filter(Boolean).join(' ')}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: 24,
        width: 420,
        maxHeight: 420,
        overflow: 'auto',
        ...style,
      }}
      aria-label="Card event log"
    >
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontWeight: 700, fontSize: 20, flex: 1 }}>Event Log</h3>
        <ExportButton onClick={() => setShowExport(true)} aria-label="Export event log" />
        <button onClick={onClear} aria-label="Clear event log" style={{ background: 'none', border: 'none', color: 'var(--color-accent-red)', fontWeight: 600, cursor: 'pointer' }}>Clear</button>
      </header>
      {showExport && (
        <ExportModal
          events={filtered}
          onClose={() => setShowExport(false)}
        />
      )}
      {selectedEvent && (
        <EventDetailsModal
          open={!!selectedEvent}
          event={selectedEvent}
          relatedEvents={filtered}
          onClose={() => setSelectedEvent(null)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <SelectAllCheckbox
          checked={allSelected}
          indeterminate={indeterminate}
          onChange={checked => {
            if (checked) setSelected(Object.fromEntries(allIds.map(id => [id, true])));
            else setSelected({});
          }}
          ariaLabel={allSelected ? 'Deselect all events' : 'Select all events'}
        />
        <span style={{ fontWeight: 600, fontSize: 15 }}>Select All</span>
        <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter event type" style={{ borderRadius: 8, padding: 4 }}>
          <option value="all">All</option>
          <option value="click">Click</option>
          <option value="drag">Drag</option>
          <option value="resize">Resize</option>
          <option value="contextMenu">ContextMenu</option>
          <option value="export">Export</option>
          <option value="undo">Undo</option>
          <option value="redo">Redo</option>
          <option value="custom">Custom</option>
        </select>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events..."
          aria-label="Search events"
          style={{ borderRadius: 8, padding: 4, flex: 1 }}
        />
      </div>
      <BatchActionBar
        selectedCount={selectedIds.length}
        onExport={handleBatchExport}
        onFlag={handleBatchFlag}
        onReview={handleBatchReview}
        onClear={handleBatchClear}
      />
      <div ref={liveRegionRef} aria-live="polite" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }} />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 320, overflowY: 'auto', position: 'relative' }}>
        {sorted.length === 0 && <li style={{ color: 'var(--color-border)', textAlign: 'center', padding: 24 }}>No events</li>}
        <AnimatePresence initial={false}>
          {sorted.map((e, i) => (
            <motion.li
              key={e.timestamp + '-' + i}
              ref={el => { eventRefs.current[i] = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 15, cursor: 'pointer', borderRadius: 8, transition: 'background 0.15s',
                background: selectedEvent === e ? 'var(--color-accent-blue-opaque)' : e.pinned ? 'var(--color-accent-yellow-opaque)' : 'transparent',
                outline: 'none',
                boxShadow: e.pinned ? '0 2px 12px var(--color-accent-yellow-opaque)' : undefined,
                border: e.pinned ? '1.5px solid var(--color-accent-yellow)' : undefined,
              }}
              tabIndex={0}
              aria-label={`View details for event ${e.type}`}
              onClick={() => setSelectedEvent(e)}
              onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') setSelectedEvent(e); }}
              onMouseEnter={ev => ev.currentTarget.style.background = e.pinned ? 'var(--color-accent-yellow-opaque)' : 'var(--color-surface-hover)'}
              onMouseLeave={ev => ev.currentTarget.style.background = selectedEvent === e ? 'var(--color-accent-blue-opaque)' : e.pinned ? 'var(--color-accent-yellow-opaque)' : 'transparent'}
            >
              <EventCheckbox
                checked={!!selected[e.timestamp]}
                onChange={checked => setSelected(sel => ({ ...sel, [e.timestamp]: checked }))}
                ariaLabel={selected[e.timestamp] ? 'Deselect event' : 'Select event'}
              />
              <PinButton
                pinned={!!pinned[e.timestamp]}
                onToggle={() => setPinned(p => ({ ...p, [e.timestamp]: !p[e.timestamp] }))}
                ariaLabel={e.pinned ? 'Unpin event' : 'Pin event'}
              />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor[e.type] || 'var(--color-accent-blue)', display: 'inline-block' }} aria-label={e.type}></span>
              <span style={{ fontWeight: 600, color: typeColor[e.type] || 'var(--color-accent-blue)' }}>{e.type}</span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
              <span style={{ color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.source}</span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{JSON.stringify(e.meta || e)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}; 