import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardMotion } from '../CardMotion';

describe('CardMotion', () => {
  it('renders children and has ARIA label', () => {
    render(<CardMotion>Motion Child</CardMotion>);
    expect(screen.getByText('Motion Child')).toBeInTheDocument();
    expect(screen.getByLabelText('Card motion')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardMotion className="test-class" style={{ opacity: 0.5 }}>Styled</CardMotion>);
    const motion = screen.getByLabelText('Card motion');
    expect(motion).toHaveClass('test-class');
    expect(motion).toHaveStyle('opacity: 0.5');
  });
  it('accepts Framer Motion props', () => {
    render(<CardMotion initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Anim</CardMotion>);
    expect(screen.getByText('Anim')).toBeInTheDocument();
  });
}); 