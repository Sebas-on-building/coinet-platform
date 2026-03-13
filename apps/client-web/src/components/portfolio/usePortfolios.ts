import useSWR from 'swr';
import { apiClient } from '@/services/api-client';

/** Fetcher that sends Authorization: Bearer + X-User-Id for portfolio API */
const fetcher = (url: string) => apiClient.getJson(url);

export function usePortfolios(userId: string) {
  const { data, error, mutate } = useSWR(userId ? `/api/v1/portfolios` : null, fetcher);
  return {
    portfolios: Array.isArray(data) ? data : (data?.data ?? []),
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
} 