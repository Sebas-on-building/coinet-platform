import React from 'react';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import clsx from 'clsx';

export interface ChartToolControlProps {
  tools: { name: string; icon: string; tooltip: string; active?: boolean }[];
  onToolSelect: (name: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ChartToolControl: React.FC<ChartToolControlProps> = ({
  tools,
  onToolSelect,
  className,
  style,
}) => {
  return (
    <div className={clsx('co-charttoolcontrol', className)} style={style} role="toolbar" aria-label="Chart tools">
      {tools.map(tool => (
        <Button
          key={tool.name}
          variant={tool.active ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onToolSelect(tool.name)}
          aria-pressed={tool.active}
          aria-label={tool.tooltip}
          className="co-charttoolcontrol-btn"
        >
          <Icon name={tool.icon} size="sm" />
        </Button>
      ))}
    </div>
  );
}; 