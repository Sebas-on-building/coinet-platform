import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardExportShare } from '../CardExportShare';
import * as CardAnalytics from '../CardAnalytics';
import * as CardCompliance from '../CardCompliance';

describe('CardExportShare', () => {
  beforeEach(() => {
    jest.spyOn(CardAnalytics, 'useCardAnalytics').mockReturnValue({ track: jest.fn() });
    jest.spyOn(CardCompliance, 'useCardCompliance').mockReturnValue({ log: jest.fn(), exportData: jest.fn() });
  });

  it('renders export buttons and has ARIA labels', () => {
    render(<CardExportShare data={{}} exportOptions={['csv', 'pdf', 'image']} />);
    expect(screen.getByLabelText('Export CSV')).toBeInTheDocument();
    expect(screen.getByLabelText('Export PDF')).toBeInTheDocument();
    expect(screen.getByLabelText('Export Image')).toBeInTheDocument();
  });
  it('calls exportData, log, and track on export', () => {
    const exportData = jest.fn();
    const log = jest.fn();
    const track = jest.fn();
    jest.spyOn(CardCompliance, 'useCardCompliance').mockReturnValue({ log, exportData });
    jest.spyOn(CardAnalytics, 'useCardAnalytics').mockReturnValue({ track });
    render(<CardExportShare data={{}} exportOptions={['csv']} />);
    fireEvent.click(screen.getByLabelText('Export CSV'));
    expect(exportData).toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    expect(track).toHaveBeenCalled();
  });
  it('renders share button if Web Share API is available', () => {
    Object.defineProperty(navigator, 'share', { value: jest.fn(), configurable: true });
    render(<CardExportShare data={{}} shareOptions={{ title: 'Share', url: 'https://co.net' }} />);
    expect(screen.getByLabelText('Share')).toBeInTheDocument();
  });
}); 