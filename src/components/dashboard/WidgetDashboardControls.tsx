import React from 'react';
import { Button } from 'src/components/ui/Button';
import { widgetRegistry } from './widgets/registry';

export const WidgetDashboardControls: React.FC<{
  onAdd: (type: string) => void;
}> = ({ onAdd }) => (
  <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
    {Object.entries(widgetRegistry).map(([type, { name }]) => (
      <Button key={type} size="sm" onClick={() => onAdd(type)}>
        + {name}
      </Button>
    ))}
  </div>
); 