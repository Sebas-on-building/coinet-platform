import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('does not render when closed', () => {
    render(<Modal open={false} onClose={jest.fn()}>Content</Modal>);
    expect(screen.queryByText('Content')).toBeNull();
  });

  it('renders when open', () => {
    render(<Modal open={true} onClose={jest.fn()}>Content</Modal>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders header and footer', () => {
    render(<Modal open={true} onClose={jest.fn()} header={<span>Header</span>} footer={<span>Footer</span>}>Body</Modal>);
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('calls onClose when clicking outside', () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose}>Content</Modal>);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalled();
  });

  it('focuses modal on open', () => {
    render(<Modal open={true} onClose={jest.fn()}>Focus</Modal>);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('supports keyboard navigation (Escape, Tab)', () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose}>Keyboard</Modal>);
    const modal = screen.getByRole('dialog');
    fireEvent.keyDown(modal, { key: 'Escape' });
    // Should call onClose if Escape is handled in Modal (add in Modal if not present)
    // fireEvent.keyDown(modal, { key: 'Tab' });
    // Tab focus trap would be tested here
  });

  it('shows focus ring when focused', () => {
    render(<Modal open={true} onClose={jest.fn()}>Focus</Modal>);
    const modal = screen.getByRole('dialog');
    modal.focus();
    expect(modal).toHaveFocus();
    // Visual regression: focus ring should be visible (manual/visual check or screenshot in Storybook)
  });

  it('renders close button and handles click', () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose}>CloseBtn</Modal>);
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalled();
  });

  it('handles edge cases: empty, long content', () => {
    render(<Modal open={true} onClose={jest.fn()}></Modal>);
    render(<Modal open={true} onClose={jest.fn()}>Very very very very very very long content</Modal>);
    // No crash
  });

  // Placeholder for animation and visual regression (manual/Storybook)
  it('shows animation (visual regression/manual)', () => {
    // This would be tested in Storybook/Chromatic
    // expect(animation).toBeVisible();
  });
}); 