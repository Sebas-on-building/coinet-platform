import useSWR from 'swr';
import axios from 'axios';

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export function usePortfolios(userId: string) {
  const { data, error, mutate } = useSWR(userId ? `/api/v1/portfolios` : null, fetcher);
  return {
    portfolios: Array.isArray(data) ? data : (data?.data ?? []),
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
} 