import React, { createContext, useContext, useState, ReactNode } from "react";

interface CommentHighlightContextValue {
  highlightedCommentId: string | null;
  setHighlightedCommentId: (id: string | null) => void;
}

const CommentHighlightContext = createContext<CommentHighlightContextValue | undefined>(undefined);

export const CommentHighlightProvider = ({ children }: { children: ReactNode }) => {
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  return (
    <CommentHighlightContext.Provider value={{ highlightedCommentId, setHighlightedCommentId }}>
      {children}
    </CommentHighlightContext.Provider>
  );
};

export const useCommentHighlight = () => {
  const ctx = useContext(CommentHighlightContext);
  if (!ctx) throw new Error("useCommentHighlight must be used within CommentHighlightProvider");
  return ctx;
}; 