import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardSkeleton } from '../CardSkeleton';

describe('CardSkeleton', () => {
  it('renders and has ARIA label', () => {
    render(<CardSkeleton />);
    expect(screen.getByLabelText('Card loading')).toBeInTheDocument();
    expect(screen.getByLabelText('Card loading')).toHaveAttribute('aria-busy', 'true');
  });
  it('applies variant, className, and style', () => {
    render(<CardSkeleton variant="compact" className="test-class" style={{ height: 42 }} />);
    const skeleton = screen.getByLabelText('Card loading');
    expect(skeleton).toHaveClass('test-class');
    expect(skeleton).toHaveStyle('height: 42px');
  });
}); 