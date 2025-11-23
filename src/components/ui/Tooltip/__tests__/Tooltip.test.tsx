import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  it('renders child', () => {
    render(<Tooltip content="Tip"><button>Hover me</button></Tooltip>);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('shows tooltip on hover', () => {
    render(<Tooltip content="Tip"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    render(<Tooltip content="Tip"><button>Hover me</button></Tooltip>);
    const btn = screen.getByText('Hover me');
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders all placements', () => {
    ['top', 'bottom', 'left', 'right'].forEach(placement => {
      render(<Tooltip content="Tip" placement={placement as any}><button>{placement}</button></Tooltip>);
      fireEvent.mouseEnter(screen.getByText(placement));
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('is accessible', () => {
    render(<Tooltip content="Tip"><button aria-label="Accessible">A</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByLabelText('Accessible'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('supports keyboard navigation (Tab, focus/blur)', () => {
    render(<Tooltip content="Tip"><button>Tab me</button></Tooltip>);
    const btn = screen.getByText('Tab me');
    btn.focus();
    expect(btn).toHaveFocus();
    fireEvent.focus(btn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.blur(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('handles delay', () => {
    jest.useFakeTimers();
    render(<Tooltip content="Delayed" delay={500}><button>Delay</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Delay'));
    expect(screen.queryByRole('tooltip')).toBeNull();
    jest.advanceTimersByTime(500);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('handles edge cases: empty, long content, only icon', () => {
    render(<Tooltip content=""><button>Empty</button></Tooltip>);
    render(<Tooltip content={"Very very very very very very long tooltip content"}><button>Long</button></Tooltip>);
    render(<Tooltip content={<span>icon</span>}><button>Icon</button></Tooltip>);
    // No crash
  });

  // Placeholder for visual regression (manual/Storybook)
  it('shows tooltip visually correct (visual regression/manual)', () => {
    // This would be tested in Storybook/Chromatic
    // expect(tooltip).toBeVisible();
  });
}); 