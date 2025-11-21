import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ExportButton, ExportModal } from '../EventExport';

const mockEvents = [
  { type: 'click', timestamp: 123, source: 'analytics', meta: { foo: 'bar' } },
  { type: 'export', timestamp: 456, source: 'compliance', meta: { baz: 'qux' } },
];

describe('ExportButton', () => {
  it('renders and is accessible', () => {
    render(<ExportButton aria-label="Export" />);
    expect(screen.getByLabelText('Export')).toBeInTheDocument();
  });
});

describe('ExportModal', () => {
  it('renders with events and columns', () => {
    render(<ExportModal events={mockEvents} onClose={() => { }} />);
    expect(screen.getByText('Export Event Log')).toBeInTheDocument();
    expect(screen.getByText('Preview:')).toBeInTheDocument();
  });
  it('can change format and columns', () => {
    render(<ExportModal events={mockEvents} onClose={() => { }} />);
    fireEvent.change(screen.getByLabelText('Format:'), { target: { value: 'pdf' } });
    expect(screen.getByDisplayValue('pdf')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Columns:'), { target: { selectedOptions: [{ value: 'type' }] } });
  });
  it('calls onClose when cancel is clicked', () => {
    const onClose = jest.fn();
    render(<ExportModal events={mockEvents} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
}); 