import React, { useState } from "react";
import { useComments } from "@/hooks/useComments";
import { CommentItem } from "./CommentItem";
import { useUserDirectory } from "@/contexts/UserDirectoryContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { notifyOnCommentEvent } from "@/utils/notifyOnCommentEvent";
import { motion, AnimatePresence } from "framer-motion";

interface CommentThreadProps {
  threadId: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ threadId }) => {
  const { comments, addComment, editComment, deleteComment, reactToComment, resolveComment } = useComments(threadId);
  const [input, setInput] = useState("");
  const userDirectory = useUserDirectory();
  const { addNotification } = useNotifications(userDirectory.find(u => u.isSelf)?.userId || "");

  // Add reply to a comment by id (recursive)
  const handleReply = (parentId: string, content: string) => {
    // Find parent comment and push reply
    const addReplyRecursive = (arr: any[]): boolean => {
      for (let c of arr) {
        if (c.id === parentId) {
          c.replies = c.replies || [];
          const reply = {
            id: Math.random().toString(36).slice(2),
            userId: userDirectory.find(u => u.isSelf)?.userId || "user-1",
            userName: userDirectory.find(u => u.isSelf)?.userName || "Steve Jobs",
            userAvatar: userDirectory.find(u => u.isSelf)?.avatarUrl || null,
            content,
            createdAt: Date.now(),
            editedAt: null,
            resolved: false,
            reactions: {},
            replies: [],
          };
          c.replies.push(reply);
          // Notification: reply and mention
          notifyOnCommentEvent({
            event: "reply",
            comment: reply,
            parentComment: c,
            threadId,
            userDirectory,
            addNotification,
          });
          notifyOnCommentEvent({
            event: "mention",
            comment: reply,
            parentComment: c,
            threadId,
            userDirectory,
            addNotification,
          });
          return true;
        }
        if (c.replies && addReplyRecursive(c.replies)) return true;
      }
      return false;
    };
    addReplyRecursive(comments);
  };

  // Divine: Add, edit, delete, react, resolve, reply
  return (
    <div className="space-y-4">
      <div className="font-bold text-blue-100 text-lg mb-2">Comments</div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              depth={0}
              onEdit={editComment}
              onDelete={deleteComment}
              onReact={reactToComment}
              onResolve={(id) => {
                resolveComment(id);
                // Notification: resolve
                notifyOnCommentEvent({
                  event: "resolve",
                  comment: userDirectory.find(u => u.isSelf) as any,
                  parentComment: c,
                  threadId,
                  userDirectory,
                  addNotification,
                });
              }}
              onReply={handleReply}
            />
          ))}
        </AnimatePresence>
      </div>
      <form
        className="flex gap-2 mt-2"
        onSubmit={e => {
          e.preventDefault();
          if (input.trim()) {
            const newComment = {
              userId: userDirectory.find(u => u.isSelf)?.userId || "user-1",
              userName: userDirectory.find(u => u.isSelf)?.userName || "Steve Jobs",
              userAvatar: userDirectory.find(u => u.isSelf)?.avatarUrl || null,
              content: input,
            };
            addComment(newComment);
            // Notification: comment and mention
            notifyOnCommentEvent({
              event: "comment",
              comment: { ...newComment, id: "temp", createdAt: Date.now(), editedAt: null, resolved: false, reactions: {}, replies: [] },
              threadId,
              userDirectory,
              addNotification,
            });
            notifyOnCommentEvent({
              event: "mention",
              comment: { ...newComment, id: "temp", createdAt: Date.now(), editedAt: null, resolved: false, reactions: {}, replies: [] },
              threadId,
              userDirectory,
              addNotification,
            });
            setInput("");
          }
        }}
      >
        <input
          className="flex-1 rounded px-3 py-2 bg-blue-950/80 text-white border border-blue-800 outline-none"
          placeholder="Add a comment..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold shadow"
        >
          Send
        </button>
      </form>
    </div>
  );
}; 