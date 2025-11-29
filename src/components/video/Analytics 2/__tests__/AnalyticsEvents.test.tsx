import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsEvents from '../AnalyticsEvents';
import * as hooks from '@/hooks/useAnalyticsEvents';

type UseAnalyticsEventsType = typeof hooks.useAnalyticsEvents;
const mockedUseAnalyticsEvents = hooks.useAnalyticsEvents as jest.MockedFunction<UseAnalyticsEventsType>;

jest.mock('@/hooks/useAnalyticsEvents');

const mockEvents = [
  { id: 1, type: 'Event 1', timestamp: '12:00', details: 'Details 1' },
  { id: 2, type: 'Event 2', timestamp: '12:02', details: 'Details 2' },
];

describe('AnalyticsEvents', () => {
  it('renders loading', () => {
    mockedUseAnalyticsEvents.mockReturnValue({ isLoading: true } as any);
    render(<AnalyticsEvents />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('renders error', () => {
    mockedUseAnalyticsEvents.mockReturnValue({ isError: true, refetch: jest.fn() } as any);
    render(<AnalyticsEvents />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
  it('renders empty', () => {
    mockedUseAnalyticsEvents.mockReturnValue({ isLoading: false, isError: false, data: [] } as any);
    render(<AnalyticsEvents />);
    expect(screen.getByText(/no analytics events found/i)).toBeInTheDocument();
  });
  it('renders data and handles actions', () => {
    const exportData = { mutate: jest.fn() };
    const share = { mutate: jest.fn() };
    mockedUseAnalyticsEvents.mockReturnValue({ isLoading: false, isError: false, data: mockEvents, exportData, share } as any);
    render(<AnalyticsEvents />);
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Export'));
    expect(exportData.mutate).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Share'));
    expect(share.mutate).toHaveBeenCalled();
  });
}); 