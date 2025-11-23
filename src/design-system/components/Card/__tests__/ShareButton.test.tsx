import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareButton } from '../ShareButton';

describe('ShareButton', () => {
  it('renders and opens modal fallback', () => {
    render(<ShareButton url="https://co.net" />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(screen.getByText(/Share this event/i)).toBeInTheDocument();
  });
  it('is accessible', () => {
    render(<ShareButton url="https://co.net" ariaLabel="Share event" />);
    expect(screen.getByLabelText('Share event')).toBeInTheDocument();
  });
}); 