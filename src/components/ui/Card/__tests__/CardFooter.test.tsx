import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardFooter } from '../CardFooter';

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter>Footer Content</CardFooter>);
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardFooter className="test-class" style={{ color: 'green' }}>Styled</CardFooter>);
    const footer = screen.getByText('Styled');
    expect(footer).toHaveClass('test-class');
    expect(footer).toHaveStyle('color: green');
  });
  it('has ARIA label', () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByLabelText('Card footer')).toBeInTheDocument();
  });
}); 