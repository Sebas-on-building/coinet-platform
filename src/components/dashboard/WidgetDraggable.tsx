import { Card } from 'src/components/ui/Card';
import { spacing } from 'src/styles/tokens/spacing';

export const WidgetDraggable: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      cursor: 'grab',
      userSelect: 'none',
      marginBottom: spacing.md,
      ...style,
    }}
    draggable
    aria-grabbed="false"
    role="listitem"
  >
    <Card>{children}</Card>
  </div>
); 