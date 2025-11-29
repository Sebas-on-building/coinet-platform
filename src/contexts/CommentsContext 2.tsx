import React, { createContext, useContext, ReactNode } from "react";
import { useMutation, useStorage } from "@liveblocks/react";
import { LiveMap, LiveList, LsonObject } from "@liveblocks/client";

// Lson-compatible Comment type
export type LsonComment = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  createdAt: number;
  editedAt: number | null;
  resolved: boolean;
  reactions: { [emoji: string]: number };
  replies: LsonComment[];
};

export interface CommentsContextValue {
  getComments: (threadId: string) => LsonComment[];
  addComment: (threadId: string, comment: Omit<LsonComment, "id" | "createdAt" | "editedAt" | "resolved" | "reactions" | "replies">) => void;
  editComment: (threadId: string, commentId: string, content: string) => void;
  deleteComment: (threadId: string, commentId: string) => void;
  reactToComment: (threadId: string, commentId: string, emoji: string) => void;
  resolveComment: (threadId: string, commentId: string) => void;
  markThreadRead: (threadId: string, userId: string) => void;
  getUnreadCount: (threadId: string, userId: string) => number;
}

const CommentsContext = createContext<CommentsContextValue | undefined>(undefined);

export const CommentsProvider = ({ children }: { children: ReactNode }) => {
  // Comments are stored in Liveblocks storage as { [threadId]: LiveList<LsonComment> }
  const commentsMap = useStorage((root: { comments?: LiveMap<string, LiveList<LsonComment>> }) => root.comments || new LiveMap());
  const lastReadMap = useStorage((root: any) => root.lastRead || {});

  // Add comment
  const addComment = useMutation(({ storage }, threadId: string, comment: Omit<LsonComment, "id" | "createdAt" | "editedAt" | "resolved" | "reactions" | "replies">) => {
    const comments = storage.get("comments") as LiveMap<string, LiveList<LsonComment>> | undefined;
    if (!comments) return;
    let thread = comments.get(threadId);
    if (!thread) {
      thread = new LiveList<LsonComment>([]);
      comments.set(threadId, thread);
    }
    thread.push({
      ...comment,
      id: Math.random().toString(36).slice(2),
      createdAt: Date.now(),
      editedAt: null,
      resolved: false,
      reactions: {},
      replies: [],
    });
  }, []);

  // Edit comment
  const editComment = useMutation(({ storage }, threadId: string, commentId: string, content: string) => {
    const comments = storage.get("comments") as LiveMap<string, LiveList<LsonComment>> | undefined;
    if (!comments) return;
    const thread = comments.get(threadId);
    if (!thread) return;
    const idx = thread.findIndex((c: LsonComment) => c.id === commentId);
    if (idx !== -1) {
      const comment = thread.get(idx);
      if (comment) {
        comment.content = content;
        comment.editedAt = Date.now();
        thread.set(idx, comment);
      }
    }
  }, []);

  // Delete comment
  const deleteComment = useMutation(({ storage }, threadId: string, commentId: string) => {
    const comments = storage.get("comments") as LiveMap<string, LiveList<LsonComment>> | undefined;
    if (!comments) return;
    const thread = comments.get(threadId);
    if (!thread) return;
    const idx = thread.findIndex((c: LsonComment) => c.id === commentId);
    if (idx !== -1) {
      thread.delete(idx);
    }
  }, []);

  // React to comment
  const reactToComment = useMutation(({ storage }, threadId: string, commentId: string, emoji: string) => {
    const comments = storage.get("comments") as LiveMap<string, LiveList<LsonComment>> | undefined;
    if (!comments) return;
    const thread = comments.get(threadId);
    if (!thread) return;
    const idx = thread.findIndex((c: LsonComment) => c.id === commentId);
    if (idx !== -1) {
      const comment = thread.get(idx);
      if (comment) {
        if (!comment.reactions) comment.reactions = {};
        comment.reactions[emoji] = (comment.reactions[emoji] || 0) + 1;
        thread.set(idx, comment);
      }
    }
  }, []);

  // Resolve comment
  const resolveComment = useMutation(({ storage }, threadId: string, commentId: string) => {
    const comments = storage.get("comments") as LiveMap<string, LiveList<LsonComment>> | undefined;
    if (!comments) return;
    const thread = comments.get(threadId);
    if (!thread) return;
    const idx = thread.findIndex((c: LsonComment) => c.id === commentId);
    if (idx !== -1) {
      const comment = thread.get(idx);
      if (comment) {
        comment.resolved = true;
        thread.set(idx, comment);
      }
    }
  }, []);

  const markThreadRead = useMutation(({ storage }, threadId: string, userId: string) => {
    let lastRead = storage.get("lastRead");
    if (!lastRead) {
      lastRead = {};
      storage.set("lastRead", lastRead);
    }
    if (!lastRead[userId]) lastRead[userId] = {};
    lastRead[userId][threadId] = Date.now();
  }, []);

  const getUnreadCount = (threadId: string, userId: string) => {
    const comments = getComments(threadId);
    const lastRead = lastReadMap[userId]?.[threadId] || 0;
    return comments.filter(c => c.createdAt > lastRead).length;
  };

  const getComments = (threadId: string) => {
    if (!commentsMap) return [];
    const thread = commentsMap.get(threadId);
    if (thread && typeof (thread as any).toArray === "function") {
      return (thread as LiveList<LsonComment>).toArray();
    }
    return [];
  };

  return (
    <CommentsContext.Provider
      value={{ getComments, addComment, editComment, deleteComment, reactToComment, resolveComment, markThreadRead, getUnreadCount }}
    >
      {children}
    </CommentsContext.Provider>
  );
};

export const useCommentsContext = () => {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error("useCommentsContext must be used within CommentsProvider");
  return ctx;
}; 