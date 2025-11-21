import { useState, useMemo } from 'react';
import { PriceDataPoint } from '@/components/charts/mockData';
import { TradingDataPoint } from '@/types/trading';
import { subDays, subWeeks, subMonths, subYears, format, isAfter } from 'date-fns';

export type TimeframeValue = '1T' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | '10Y' | 'ALL';

export interface TimeframeOption {
  label: string;
  value: TimeframeValue;
  active: boolean;
}

export const timeframeOptions: TimeframeOption[] = [
  { label: '1T', value: '1T', active: true },
  { label: '1W', value: '1W', active: false },
  { label: '1M', value: '1M', active: false },
  { label: '3M', value: '3M', active: false },
  { label: '6M', value: '6M', active: false },
  { label: '1Y', value: '1Y', active: false },
  { label: '2Y', value: '2Y', active: false },
  { label: '5Y', value: '5Y', active: false },
  { label: '10Y', value: '10Y', active: false },
  { label: 'ALL', value: 'ALL', active: false }
];

export function useTimeframeData(data: any[], currentTimeframe?: TimeframeValue) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeValue>('1T');
  const activeTimeframe = currentTimeframe || selectedTimeframe;
  
  const filteredData = useMemo(() => {
    if (!data.length) return data;
    
    const now = new Date();
    let startDate: Date;
    
    switch (activeTimeframe) {
      case '1T':
        startDate = subDays(now, 1);
        break;
      case '1W':
        startDate = subWeeks(now, 1);
        break;
      case '1M':
        startDate = subMonths(now, 1);
        break;
      case '3M':
        startDate = subMonths(now, 3);
        break;
      case '6M':
        startDate = subMonths(now, 6);
        break;
      case '1Y':
        startDate = subYears(now, 1);
        break;
      case '2Y':
        startDate = subYears(now, 2);
        break;
      case '5Y':
        startDate = subYears(now, 5);
        break;
      case '10Y':
        startDate = subYears(now, 10);
        break;
      case 'ALL':
      default:
        return data;
    }
    
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return isAfter(itemDate, startDate);
    });
  }, [data, activeTimeframe]);

  const getTimeAxisFormatter = () => {
    switch (activeTimeframe) {
      case '1T':
        return (dateStr: string) => format(new Date(dateStr), 'HH:mm');
      case '1W':
        return (dateStr: string) => format(new Date(dateStr), 'E');
      case '1M':
      case '3M':
        return (dateStr: string) => format(new Date(dateStr), 'MMM dd');
      case '6M':
      case '1Y':
        return (dateStr: string) => format(new Date(dateStr), 'MMM');
      case '2Y':
      case '5Y':
      case '10Y':
      case 'ALL':
      default:
        return (dateStr: string) => format(new Date(dateStr), 'yyyy');
    }
  };

  const getTickInterval = () => {
    switch (activeTimeframe) {
      case '1T':
        return 'preserveEnd';
      case '1W':
        return 0;
      case '1M':
        return 'preserveStartEnd';
      case '3M':
      case '6M':
        return 'preserveStartEnd';
      case '1Y':
      case '2Y':
      case '5Y':
      case '10Y':
      case 'ALL':
      default:
        return 'preserveStartEnd';
    }
  };
  
  return {
    selectedTimeframe,
    setSelectedTimeframe,
    filteredData,
    timeAxisFormatter: getTimeAxisFormatter(),
    tickInterval: getTickInterval(),
    timeframeOptions
  };
}