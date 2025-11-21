import React from 'react';
import { Button } from 'src/components/ui/Button';
import { spacing } from 'src/styles/tokens/spacing';

export const WidgetRemoveButton: React.FC<{ onRemove: () => void }> = ({ onRemove }) => (
  <Button
    size="sm"
    variant="danger"
    onClick={onRemove}
    style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 10 }}
    aria-label="Remove widget"
  >
    ×
  </Button>
); 