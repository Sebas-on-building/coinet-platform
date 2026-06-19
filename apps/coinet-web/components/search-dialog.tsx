"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, X, MessageSquare } from "lucide-react"
import { Modal } from "@/components/modal"

type ChatItem = { id: string; title: string }

type SearchDialogProps = {
  open: boolean
  onClose: () => void
  chats: ChatItem[]
  onSelect: (id: string) => void
}

export function SearchDialog({ open, onClose, chats, onSelect }: SearchDialogProps) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chats
    return chats.filter((c) => c.title.toLowerCase().includes(q))
  }, [query, chats])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Search chats"
      hideTitle
      align="top"
      className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats..."
          aria-label="Search chats"
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          aria-label="Close search"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {chats.length === 0 ? "No saved chats yet." : "No chats found."}
          </p>
        ) : (
          results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <MessageSquare className="size-4 shrink-0 text-primary" />
              <span className="truncate">{c.title}</span>
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}
