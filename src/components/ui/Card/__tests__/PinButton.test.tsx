import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PinButton } from '../PinButton';

describe('PinButton', () => {
  it('renders and toggles pin state', () => {
    const onToggle = jest.fn();
    render(<PinButton pinned={false} onToggle={onToggle} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalled();
  });
  it('is accessible', () => {
    render(<PinButton pinned={false} onToggle={() => { }} ariaLabel="Pin event" />);
    expect(screen.getByLabelText('Pin event')).toBeInTheDocument();
  });
}); 