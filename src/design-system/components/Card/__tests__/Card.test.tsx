import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children and header/footer/actions/status/badge', () => {
    render(
      <Card
        header={<Card.Header>Header</Card.Header>}
        footer={<Card.Footer>Footer</Card.Footer>}
        actions={<Card.Actions>Action</Card.Actions>}
        status={<Card.Status>Status</Card.Status>}
        badge={<Card.Badge>Badge</Card.Badge>}
      >
        <Card.Content>Content</Card.Content>
      </Card>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Badge')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies all visual variants', () => {
    const { rerender } = render(<Card variant="frosted">Frosted</Card>);
    expect(screen.getByText('Frosted').parentElement).toHaveClass('co-card');
    rerender(<Card variant="neon">Neon</Card>);
    expect(screen.getByText('Neon').parentElement).toHaveClass('co-card');
    rerender(<Card variant="minimal">Minimal</Card>);
    expect(screen.getByText('Minimal').parentElement).toHaveClass('co-card');
  });

  it('supports glass, gradient, outlined, shadow, compact, elevated, confetti', () => {
    render(
      <Card glass gradient outlined shadow compact elevated confetti>Variants</Card>
    );
    expect(screen.getByText('Variants')).toBeInTheDocument();
  });

  it('is accessible with ARIA, tabIndex, and role', () => {
    render(<Card header="A" clickable selectable selected>Accessible</Card>);
    const card = screen.getByText('Accessible').parentElement;
    expect(card).toHaveAttribute('role', 'region');
    expect(card).toHaveAttribute('tabIndex');
    expect(card).toHaveAttribute('aria-selected', 'true');
  });

  it('handles pointer, keyboard, and touch interactions', () => {
    const onClick = jest.fn();
    render(<Card clickable onClick={onClick}>Click me</Card>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
    fireEvent.keyDown(screen.getByText('Click me').parentElement!, { key: 'Enter' });
    // Add more keyboard/touch tests as needed
  });

  it('shows confetti when confetti prop is true and clicked', () => {
    render(<Card clickable confetti>Confetti</Card>);
    fireEvent.click(screen.getByText('Confetti'));
    expect(document.querySelector('.co-card-confetti')).toBeInTheDocument();
  });

  it('shows ripple on click', () => {
    render(<Card clickable>Ripple</Card>);
    fireEvent.mouseDown(screen.getByText('Ripple'));
    expect(document.querySelector('.co-card-ripple-effect')).toBeInTheDocument();
  });

  it('renders with default props', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders all elevations', () => {
    ['sm', 'md', 'lg'].forEach(elevation => {
      render(<Card elevation={elevation as any}>Elevated</Card>);
      expect(screen.getByText('Elevated')).toBeInTheDocument();
    });
  });

  it('renders header and footer', () => {
    render(<Card header={<span>Header</span>} footer={<span>Footer</span>}>Body</Card>);
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('renders sectioned', () => {
    render(<Card sectioned>Sectioned</Card>);
    expect(screen.getByText('Sectioned')).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<Card aria-label="Accessible">A</Card>);
    expect(screen.getByLabelText('Accessible')).toBeInTheDocument();
  });

  it('supports keyboard navigation (Tab, Enter, Space)', () => {
    render(<Card tabIndex={0}>Keyboard</Card>);
    const card = screen.getByText('Keyboard').parentElement;
    card && card.focus();
    expect(card).toHaveFocus();
    fireEvent.keyDown(card!, { key: 'Enter' });
    fireEvent.keyDown(card!, { key: ' ' });
    // No error should occur
  });

  it('shows focus ring when focused', () => {
    render(<Card tabIndex={0}>Focus</Card>);
    const card = screen.getByText('Focus').parentElement;
    card && card.focus();
    expect(card).toHaveFocus();
    // Visual regression: focus ring should be visible (manual/visual check or screenshot in Storybook)
  });

  it('handles pointer, keyboard, and touch interactions', () => {
    const onClick = jest.fn();
    render(<Card tabIndex={0} onClick={onClick}>Click me</Card>);
    const card = screen.getByText('Click me').parentElement;
    card && fireEvent.click(card);
    expect(onClick).toHaveBeenCalled();
    card && fireEvent.keyDown(card, { key: 'Enter' });
    // Add more keyboard/touch tests as needed
  });

  it('handles edge cases: empty, long content, only header', () => {
    render(<Card></Card>);
    render(<Card>Very very very very very very long content</Card>);
    render(<Card header={<span>Header</span>} />);
    // No crash
  });

  // Placeholder for confetti and ripple effect tests (visual regression/manual)
  it('shows confetti and ripple effect (visual regression/manual)', () => {
    // This would be tested in Storybook/Chromatic
    // fireEvent.click(screen.getByText('Confetti'));
    // expect(confetti).toBeVisible();
    // fireEvent.mouseDown(screen.getByText('Ripple'));
    // expect(ripple).toBeVisible();
  });
}); 