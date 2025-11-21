import useSWR from 'swr';
import axios from 'axios';

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export function useOHLCV(symbol: string, interval: string, since: string) {
  const { data, error } = useSWR(
    symbol && interval && since ? `/market/ohlcv?symbol=${symbol}&interval=${interval}&since=${since}` : null,
    fetcher
  );
  return {
    ohlcv: data,
    isLoading: !error && !data,
    isError: error,
  };
} 