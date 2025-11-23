import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChapters, addBookmark, addReaction } from '@/api/video';

interface BookmarkVars { id: number; }
interface ReactVars { id: number; reaction: string; }

export function useChapters() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['chapters'], queryFn: getChapters });
  const bookmark = useMutation({
    mutationFn: ({ id }: BookmarkVars) => addBookmark('chapter', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chapters'] }),
  });
  const react = useMutation({
    mutationFn: ({ id, reaction }: ReactVars) => addReaction('chapter', id, reaction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chapters'] }),
  });
  return { ...query, bookmark, react };
} 