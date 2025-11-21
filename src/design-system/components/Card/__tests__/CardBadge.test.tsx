import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardBadge } from '../CardBadge';

describe('CardBadge', () => {
  it('renders children', () => {
    render(<CardBadge>Badge Content</CardBadge>);
    expect(screen.getByText('Badge Content')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardBadge className="test-class" style={{ background: 'orange' }}>Styled</CardBadge>);
    const badge = screen.getByText('Styled');
    expect(badge).toHaveClass('test-class');
    expect(badge).toHaveStyle('background: orange');
  });
  it('has ARIA label', () => {
    render(<CardBadge>Badge</CardBadge>);
    expect(screen.getByLabelText('Card badge')).toBeInTheDocument();
  });
}); 