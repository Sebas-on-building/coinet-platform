import { useQuery, useMutation } from '@tanstack/react-query';
import { getAnalyticsEvents, exportAnalytics, shareAnalytics } from '@/api/video';

export function useAnalyticsEvents() {
  const query = useQuery({ queryKey: ['analyticsEvents'], queryFn: getAnalyticsEvents });
  const exportData = useMutation({ mutationFn: exportAnalytics });
  const share = useMutation({ mutationFn: shareAnalytics });
  return { ...query, exportData, share };
} 