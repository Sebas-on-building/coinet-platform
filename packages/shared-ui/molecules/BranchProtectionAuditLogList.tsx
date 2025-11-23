import React from 'react';
import { BranchProtectionAuditLogBadge } from '../atoms/BranchProtectionAuditLogBadge';

interface AuditLogEvent {
  id: string;
  type: 'created' | 'updated' | 'deleted' | 'rule-applied' | 'notification-sent';
  timestamp: string;
  details?: string;
}

export const BranchProtectionAuditLogList = ({ events }: { events: AuditLogEvent[] }) => (
  <ul className="space-y-2">
    {events.map(event => (
      <li key={event.id} className="flex items-center gap-2">
        <BranchProtectionAuditLogBadge type={event.type} />
        <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</span>
        {event.details && <span className="text-xs text-gray-400">{event.details}</span>}
      </li>
    ))}
  </ul>
); 