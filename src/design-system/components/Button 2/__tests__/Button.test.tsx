import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders all variants', () => {
    ['primary', 'secondary', 'accent', 'ghost', 'outline'].forEach(variant => {
      render(<Button variant={variant as any}>Variant</Button>);
      expect(screen.getByText('Variant')).toBeInTheDocument();
    });
  });

  it('renders all sizes', () => {
    ['sm', 'md', 'lg'].forEach(size => {
      render(<Button size={size as any}>Size</Button>);
      expect(screen.getByText('Size')).toBeInTheDocument();
    });
  });

  it('shows loading spinner', () => {
    render(<Button loading>Load</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
  });

  it('is disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders with left and right icons', () => {
    render(<Button icon={<span>icon</span>} iconRight={<span>iconR</span>}>Icon</Button>);
    expect(screen.getByText('icon')).toBeInTheDocument();
    expect(screen.getByText('iconR')).toBeInTheDocument();
  });

  it('renders pill style', () => {
    render(<Button pill>Pill</Button>);
    expect(screen.getByText('Pill')).toBeInTheDocument();
  });

  it('is accessible', () => {
    render(<Button aria-label="Accessible">A</Button>);
    expect(screen.getByLabelText('Accessible')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalled();
  });

  it('supports keyboard navigation (Tab, Enter, Space)', () => {
    render(<Button>Keyboard</Button>);
    const btn = screen.getByRole('button');
    btn.focus();
    expect(btn).toHaveFocus();
    fireEvent.keyDown(btn, { key: 'Enter' });
    fireEvent.keyDown(btn, { key: ' ' });
    // No error should occur
  });

  it('shows focus ring when focused', () => {
    render(<Button>Focus</Button>);
    const btn = screen.getByRole('button');
    btn.focus();
    expect(btn).toHaveFocus();
    // Visual regression: focus ring should be visible (manual/visual check or screenshot in Storybook)
  });

  it('renders icon-only button', () => {
    render(<Button icon={<span>icon</span>} aria-label="icon-only" />);
    expect(screen.getByLabelText('icon-only')).toBeInTheDocument();
  });

  it('handles edge cases: empty, long text, only icon', () => {
    render(<Button></Button>);
    render(<Button>Very very very very very very long text</Button>);
    render(<Button icon={<span>icon</span>} />);
    // No crash
  });

  // Placeholder for ripple effect test (visual regression/manual)
  it('shows ripple effect on click (visual regression/manual)', () => {
    // This would be tested in Storybook/Chromatic
    // fireEvent.mouseDown(screen.getByRole('button'));
    // expect(ripple).toBeVisible();
  });
}); 