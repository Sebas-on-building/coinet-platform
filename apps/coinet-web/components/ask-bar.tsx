"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Plus, ArrowUp, ChevronDown, Waypoints, Zap, Microscope, Check, FileText, ImageIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

const suggestions = [
  { label: "Track whale moves", prompt: "Show me the biggest whale inflows and outflows right now." },
  { label: "Read the sentiment", prompt: "What is the current market sentiment and is it shifting?" },
  { label: "Upcoming unlocks", prompt: "Which token unlocks are coming up and how big are they?" },
  { label: "Explain a move", prompt: "Why did BTC move in the last hour? Break down the drivers." },
]

export const MODES = [
  { id: "fast", label: "Fast", icon: Zap, description: "Quick, one-line read on the move." },
  { id: "default", label: "Default", icon: Waypoints, description: "Balanced verdict weighing every signal." },
  { id: "max", label: "Max", icon: Microscope, description: "Exhaustive deep-dive across timeframes." },
] as const

export type ModeId = (typeof MODES)[number]["id"]

export type Attachment = {
  id: string
  name: string
  kind: "image" | "doc"
}

export type SendMeta = {
  mode: ModeId
  attachments: Attachment[]
}

const ACCEPT = ".pdf,.doc,.docx,.txt,.csv,.md,.json,image/*"

function isImage(file: File) {
  return file.type.startsWith("image/")
}

export function AskBar({
  onSend,
  showSuggestions = true,
  autoFocus = false,
}: {
  onSend: (text: string, meta: SendMeta) => void
  showSuggestions?: boolean
  autoFocus?: boolean
}) {
  const [value, setValue] = useState("")
  const [mode, setMode] = useState<ModeId>("default")
  const [menuOpen, setMenuOpen] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0]
  const ActiveIcon = activeMode.icon

  // Close the mode menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const next: Attachment[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      kind: isImage(file) ? "image" : "doc",
    }))
    setAttachments((prev) => [...prev, ...next])
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  function submit() {
    if (!value.trim() && attachments.length === 0) return
    onSend(value.trim(), { mode, attachments })
    setValue("")
    setAttachments([])
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit()
  }

  const canSend = value.trim().length > 0 || attachments.length > 0

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-[1.75rem] border border-border bg-card/80 p-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl transition-colors focus-within:border-primary/60"
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pb-1 pt-1">
            {attachments.map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 py-1.5 pl-2 pr-1.5 text-xs text-foreground"
              >
                {a.kind === "image" ? (
                  <ImageIcon className="size-3.5 text-primary" />
                ) : (
                  <FileText className="size-3.5 text-primary" />
                )}
                <span className="max-w-[10rem] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            autoGrow()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              handleSubmit(e)
            }
          }}
          placeholder="Ask Coinet anything about the market…"
          aria-label="Ask Coinet anything about the market"
          className="max-h-48 w-full resize-none bg-transparent px-3 pt-2 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ""
          }}
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Attach images or documents"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Plus className="size-5" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors",
                  menuOpen
                    ? "border-primary/60 bg-secondary text-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <ActiveIcon className="size-4 text-primary" />
                <span>{activeMode.label}</span>
                <ChevronDown className={cn("size-3.5 transition-transform", menuOpen && "rotate-180")} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
                >
                  {MODES.map((m) => {
                    const Icon = m.icon
                    const selected = m.id === mode
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        onClick={() => {
                          setMode(m.id)
                          setMenuOpen(false)
                          textareaRef.current?.focus()
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          selected ? "bg-secondary" : "hover:bg-secondary/60",
                        )}
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{m.label}</span>
                            {selected && <Check className="size-3.5 text-primary" />}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                            {m.description}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            aria-label="Send message"
            disabled={!canSend}
            className={cn(
              "flex size-9 items-center justify-center rounded-full transition-all",
              canSend ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-secondary text-muted-foreground",
            )}
          >
            <ArrowUp className="size-5" />
          </button>
        </div>
      </form>

      {showSuggestions && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onSend(s.prompt, { mode, attachments: [] })}
              className="rounded-full border border-border bg-card/40 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
