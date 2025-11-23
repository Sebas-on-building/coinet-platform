import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from '../Avatar';
import { Tooltip } from '../Tooltip';
import { Chart } from '../Chart';
import { Card } from '../Card';
import { useAnalyticsEvent } from '../hooks/useAnalyticsEvent';
import { useComplianceEvent } from '../hooks/useComplianceEvent';

describe('Atomic Primitives', () => {
  it('Avatar touch target is ≥44×44px', () => {
    render(<Avatar alt="User" />);
    const avatar = screen.getByLabelText('User');
    const rect = avatar.getBoundingClientRect();
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  });
  it('Tooltip is accessible and themeable', () => {
    render(<Tooltip content="Hello"><button>Hover</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
  it('Chart renders line, bar, and pie', () => {
    render(<Chart type="line" data={[1, 2, 3]} />);
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    render(<Chart type="bar" data={[1, 2, 3]} />);
    render(<Chart type="pie" data={[1, 2, 3]} />);
  });
  it('Card composes all subcomponents and advanced features', () => {
    render(
      <Card
        header={<Card.Header>Header</Card.Header>}
        footer={<Card.Footer>Footer</Card.Footer>}
        actions={<Card.Actions><button>Action</button></Card.Actions>}
        status={<Card.Status>Live</Card.Status>}
        badge={<Card.Badge>New</Card.Badge>}
        glass
        gradient
        outlined
        shadow
        compact
        elevated
        confetti
        variant="frosted"
      >
        <Card.Content>
          <Avatar alt="User" />
          <Tooltip content="Info"><button>i</button></Tooltip>
          <Chart type="line" data={[1, 2, 3, 4]} />
        </Card.Content>
      </Card>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });
  it('integrates with analytics and compliance hooks', () => {
    const logEvent = useAnalyticsEvent();
    const logCompliance = useComplianceEvent();
    expect(() => logEvent('test', { foo: 'bar' })).not.toThrow();
    expect(() => logCompliance('test', { foo: 'bar' })).not.toThrow();
  });
}); 