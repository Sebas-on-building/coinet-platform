import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card } from '../Card';
import { CardAnalyticsProvider, useCardAnalytics } from '../CardAnalytics';
import { CardComplianceProvider, useCardCompliance } from '../CardCompliance';

describe('CardAnalyticsProvider', () => {
  it('provides track function to children', () => {
    let tracked = false;
    const TestChild = () => {
      const { track } = useCardAnalytics();
      return <button onClick={() => { track({ type: 'click' }); tracked = true; }}>Track</button>;
    };
    render(<CardAnalyticsProvider><TestChild /></CardAnalyticsProvider>);
    fireEvent.click(screen.getByText('Track'));
    expect(tracked).toBe(true);
  });
  it('calls onEvent when event is tracked', () => {
    const onEvent = jest.fn();
    const TestChild = () => {
      const { track } = useCardAnalytics();
      return <button onClick={() => track({ type: 'click' })}>Track</button>;
    };
    render(<CardAnalyticsProvider onEvent={onEvent}><TestChild /></CardAnalyticsProvider>);
    fireEvent.click(screen.getByText('Track'));
    expect(onEvent).toHaveBeenCalledWith({ type: 'click' });
  });
});

describe('CardComplianceProvider', () => {
  it('provides log function to children', () => {
    let logged = false;
    const TestChild = () => {
      const { log } = useCardCompliance();
      return <button onClick={() => { log({ type: 'click' }); logged = true; }}>Log</button>;
    };
    render(<CardComplianceProvider><TestChild /></CardComplianceProvider>);
    fireEvent.click(screen.getByText('Log'));
    expect(logged).toBe(true);
  });
  it('calls onEvent when event is logged', () => {
    const onEvent = jest.fn();
    const TestChild = () => {
      const { log } = useCardCompliance();
      return <button onClick={() => log({ type: 'click' })}>Log</button>;
    };
    render(<CardComplianceProvider onEvent={onEvent}><TestChild /></CardComplianceProvider>);
    fireEvent.click(screen.getByText('Log'));
    expect(onEvent).toHaveBeenCalledWith({ type: 'click' });
  });
  it('provides exportData function to children', () => {
    let exported = false;
    const TestChild = () => {
      const { exportData } = useCardCompliance();
      return <button onClick={() => { exportData?.('csv', {}); exported = true; }}>Export</button>;
    };
    render(<CardComplianceProvider exportData={() => { }}><TestChild /></CardComplianceProvider>);
    fireEvent.click(screen.getByText('Export'));
    expect(exported).toBe(true);
  });
}); 