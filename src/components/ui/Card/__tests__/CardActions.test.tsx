import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardActions } from '../CardActions';

describe('CardActions', () => {
  it('renders children', () => {
    render(<CardActions>Action Content</CardActions>);
    expect(screen.getByText('Action Content')).toBeInTheDocument();
  });
  it('applies className and style', () => {
    render(<CardActions className="test-class" style={{ gap: 12 }}>Styled</CardActions>);
    const actions = screen.getByText('Styled');
    expect(actions).toHaveClass('test-class');
    expect(actions.parentElement).toHaveStyle('gap: 12px');
  });
  it('has ARIA label and role', () => {
    render(<CardActions>Actions</CardActions>);
    const el = screen.getByLabelText('Card actions');
    expect(el).toHaveAttribute('role', 'group');
  });
}); 