import useSWR from 'swr';
import axios from 'axios';

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export function usePortfolios(userId: string) {
  const { data, error, mutate } = useSWR(userId ? `/portfolios/user/${userId}` : null, fetcher);
  return {
    portfolios: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
} 