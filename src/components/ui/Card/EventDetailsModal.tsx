import React, { useState } from 'react';
import { Modal } from '../Modal';
import { ExportButton } from './EventExport';
import { MetadataView } from './EventDetailsModal/MetadataView';
import { Timeline } from './EventDetailsModal/Timeline';
import { ActionBar } from './EventDetailsModal/ActionBar';
import { ComplianceNotes } from './EventDetailsModal/ComplianceNotes';
import type { CardEvent } from './CardEventLog';

export interface EventDetailsModalProps {
  open: boolean;
  event: CardEvent;
  relatedEvents?: CardEvent[];
  onClose: () => void;
  onExport?: (event: CardEvent) => void;
  onShare?: (event: CardEvent) => void;
  onFlag?: (event: CardEvent) => void;
  onAddNote?: (event: CardEvent, note: string) => void;
  onMarkReviewed?: (event: CardEvent) => void;
  motionPreference?: 'auto' | 'reduce';
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  open,
  event,
  relatedEvents = [],
  onClose,
  onExport,
  onShare,
  onFlag,
  onAddNote,
  onMarkReviewed,
  motionPreference = 'auto',
}) => {
  const [showJSON, setShowJSON] = useState(false);
  const [note, setNote] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span style={{ fontWeight: 800, fontSize: 22 }}>Event Details</span>}
      size="lg"
      animation={motionPreference === 'reduce' ? undefined : 'fade'}
      overlay
      closeButton
      aria-label="Event Details Modal"
      className="co-event-details-modal glassmorphic"
      style={{
        background: 'var(--color-surface-glass)',
        boxShadow: 'var(--shadow-2xl)',
        color: 'var(--color-text)',
        borderRadius: 'var(--radius-2xl)',
        padding: 0,
        minWidth: 420,
        maxWidth: 640,
      }}
    >
      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <MetadataView event={event} showJSON={showJSON} onToggleJSON={() => setShowJSON(v => !v)} />
        <ComplianceNotes event={event} />
        {relatedEvents.length > 0 && <Timeline events={relatedEvents} currentEvent={event} />}
        <ActionBar
          event={event}
          note={note}
          setNote={setNote}
          onExport={onExport}
          onShare={onShare}
          onFlag={onFlag}
          onAddNote={onAddNote}
          onMarkReviewed={onMarkReviewed}
        />
      </div>
    </Modal>
  );
}; 