import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardConfetti } from '../CardConfetti';

describe('CardConfetti', () => {
  it('renders confetti when show is true', () => {
    const { container } = render(<CardConfetti show />);
    expect(container.querySelector('.co-card-confetti')).toBeInTheDocument();
  });
  it('does not render confetti when show is false', () => {
    const { container } = render(<CardConfetti show={false} />);
    expect(container.querySelector('.co-card-confetti')).not.toBeInTheDocument();
  });
  it('applies className and style', () => {
    const { container } = render(<CardConfetti show className="test-class" style={{ zIndex: 99 }} />);
    const confetti = container.querySelector('.co-card-confetti');
    expect(confetti).toHaveClass('test-class');
    expect(confetti).toHaveStyle('z-index: 99');
  });
  it('has ARIA label', () => {
    const { container } = render(<CardConfetti show />);
    const confetti = container.querySelector('.co-card-confetti');
    expect(confetti).toHaveAttribute('aria-label', 'Card confetti');
  });
}); 