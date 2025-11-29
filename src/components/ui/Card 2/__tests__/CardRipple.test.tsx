import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardRipple } from '../CardRipple';

describe('CardRipple', () => {
  it('renders children and has ARIA label', () => {
    render(<CardRipple>Ripple Child</CardRipple>);
    expect(screen.getByText('Ripple Child')).toBeInTheDocument();
    expect(screen.getByLabelText('Card ripple')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardRipple className="test-class" style={{ background: 'yellow' }}>Styled</CardRipple>);
    const ripple = screen.getByLabelText('Card ripple');
    expect(ripple).toHaveClass('test-class');
    expect(ripple).toHaveStyle('background: yellow');
  });
  it('shows ripple effect on mouseDown', () => {
    render(<CardRipple>Ripple</CardRipple>);
    const ripple = screen.getByLabelText('Card ripple');
    fireEvent.mouseDown(ripple, { clientX: 10, clientY: 10 });
    expect(document.querySelector('.co-card-ripple-effect')).toBeInTheDocument();
  });
}); 