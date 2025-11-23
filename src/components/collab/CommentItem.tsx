import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LsonComment } from "@/contexts/CommentsContext";
import { useCommentHighlight } from "@/contexts/CommentHighlightContext";

interface CommentItemProps {
  comment: LsonComment;
  depth: number;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
  onResolve: (id: string) => void;
  onReply: (id: string, content: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment: c,
  depth,
  onEdit,
  onDelete,
  onReact,
  onResolve,
  onReply,
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(c.content);
  const [replying, setReplying] = useState(false);
  const [replyValue, setReplyValue] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const { highlightedCommentId, setHighlightedCommentId } = useCommentHighlight();
  const isHighlighted = highlightedCommentId === c.id;

  useEffect(() => {
    if (isHighlighted) {
      const timeout = setTimeout(() => setHighlightedCommentId(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isHighlighted, setHighlightedCommentId]);

  return (
    <motion.div
      id={`comment-${c.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className={`relative flex flex-col gap-1 group rounded-xl p-3 bg-blue-950/80 border border-blue-800/60 shadow ${c.resolved ? "opacity-60" : ""}`}
      style={{ marginLeft: depth * 24 }}
    >
      <AnimatePresence>
        {isHighlighted && (
          <motion.div
            layoutId={`highlight-${c.id}`}
            className="absolute inset-0 rounded-xl pointer-events-none z-10"
            initial={{ boxShadow: "0 0 0 0px #f472b6" }}
            animate={{ boxShadow: "0 0 0 6px #f472b6, 0 0 24px 8px #f472b6aa" }}
            exit={{ boxShadow: "0 0 0 0px #f472b6" }}
            transition={{ duration: 0.6, type: "spring" }}
          />
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm">
          {c.userAvatar ? <img src={c.userAvatar} alt={c.userName} className="w-full h-full object-cover rounded-full" /> : c.userName[0]}
        </span>
        <span className="text-blue-200 font-semibold text-sm">{c.userName}</span>
        <span className="text-xs text-blue-300 ml-2">{new Date(c.createdAt).toLocaleString()}</span>
        {c.resolved && <span className="ml-2 text-green-400 text-xs font-bold">Resolved</span>}
        {c.replies.length > 0 && (
          <button
            className="ml-2 text-xs text-blue-400 hover:text-blue-200 underline"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand replies" : "Collapse replies"}
          >
            {collapsed ? `+${c.replies.length} replies` : "Collapse"}
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2 items-center">
          <input
            className="flex-1 rounded px-2 py-1 bg-blue-900/60 text-white border border-blue-700 outline-none"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            autoFocus
          />
          <button className="text-blue-300 font-bold px-2" onClick={() => { onEdit(c.id, editValue); setEditing(false); }}>Save</button>
          <button className="text-blue-200 px-2" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div className="text-blue-100 text-sm whitespace-pre-line">{c.content}</div>
      )}
      <div className="flex items-center gap-2 mt-1">
        <button className="text-xs text-blue-300 hover:text-blue-100" onClick={() => { setEditValue(c.content); setEditing(true); }}>Edit</button>
        <button className="text-xs text-red-400 hover:text-red-200" onClick={() => onDelete(c.id)}>Delete</button>
        <button className="text-xs text-green-400 hover:text-green-200" onClick={() => onResolve(c.id)} disabled={c.resolved}>Resolve</button>
        <button className="text-xs text-blue-400 hover:text-blue-200" onClick={() => setReplying((v) => !v)}>{replying ? "Cancel" : "Reply"}</button>
        {/* Emoji reactions */}
        <div className="flex gap-1 ml-2">
          {["👍", "🎉", "❤️", "😂", "🚀"].map(emoji => (
            <button
              key={emoji}
              className="text-lg hover:scale-125 transition"
              onClick={() => onReact(c.id, emoji)}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
              {c.reactions && c.reactions[emoji] ? <span className="ml-0.5 text-xs font-bold">{c.reactions[emoji]}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {replying && (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="flex gap-2 mt-2"
            onSubmit={e => {
              e.preventDefault();
              if (replyValue.trim()) {
                onReply(c.id, replyValue);
                setReplyValue("");
                setReplying(false);
              }
            }}
          >
            <input
              className="flex-1 rounded px-2 py-1 bg-blue-900/60 text-white border border-blue-700 outline-none"
              placeholder="Reply..."
              value={replyValue}
              onChange={e => setReplyValue(e.target.value)}
              autoFocus
            />
            <button type="submit" className="px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold shadow">Send</button>
          </motion.form>
        )}
      </AnimatePresence>
      {/* Recursive replies */}
      <AnimatePresence initial={false}>
        {!collapsed && c.replies && c.replies.length > 0 && c.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onReact={onReact}
            onResolve={onResolve}
            onReply={onReply}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}; 