import React from 'react';
import { Badge } from '../ui';

export const AccessibilityChecker: React.FC<{ issues: string[] }> = ({ issues }) => (
  <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
    <Badge color={issues.length ? 'danger' : 'success'} glow gradient>
      {issues.length ? `Accessibility Issues: ${issues.length}` : 'All Accessible'}
    </Badge>
  </div>
); 