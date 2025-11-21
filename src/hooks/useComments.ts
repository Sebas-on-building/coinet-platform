import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, addBookmark, addReaction } from '@/api/video';

interface BookmarkVars { id: number; }
interface ReactVars { id: number; reaction: string; }

export function useComments() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['comments'], queryFn: getComments });
  const bookmark = useMutation({
    mutationFn: ({ id }: BookmarkVars) => addBookmark('comment', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });
  const react = useMutation({
    mutationFn: ({ id, reaction }: ReactVars) => addReaction('comment', id, reaction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
  });
  return { ...query, bookmark, react };
} 