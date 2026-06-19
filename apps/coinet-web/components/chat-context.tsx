"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { Attachment, SendMeta } from "@/components/ask-bar"
import { analyzePrompt, type Judgment } from "@/lib/judgment"

export type Message =
  | { id: string; role: "user"; text: string; attachments: Attachment[] }
  | { id: string; role: "assistant"; judgment: Judgment }
  | { id: string; role: "assistant"; text: string }

export type Conversation = {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
}

export type AppView = "chat" | "markets"

type ChatContextValue = {
  conversations: Conversation[]
  activeId: string | null
  messages: Message[]
  thinking: boolean
  streamingId: string | null
  started: boolean
  view: AppView
  setView: (view: AppView) => void
  send: (text: string, meta: SendMeta) => void
  ask: (text: string) => void
  regenerate: () => void
  newChat: () => void
  loadConversation: (id: string) => void
  deleteConversation: (id: string) => void
  clearAll: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

const STORAGE_KEY = "coinet.conversations.v1"

function loadStored(): Conversation[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Conversation[]
  } catch {
    return []
  }
}

function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ")
  if (!t) return "New chat"
  return t.length > 48 ? `${t.slice(0, 48)}…` : t
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [view, setView] = useState<AppView>("chat")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeIdRef = useRef<string | null>(null)

  const clearTimers = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    if (streamTimer.current) clearInterval(streamTimer.current)
  }, [])

  // Load saved conversations on mount.
  useEffect(() => {
    setConversations(loadStored())
    setHydrated(true)
  }, [])

  // Persist conversations whenever they change (after initial hydration).
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    } catch {
      // ignore quota / serialization errors
    }
  }, [conversations, hydrated])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  // Produce an assistant reply for `text`, appending it to conversation `targetId`.
  // Judgment cards appear at once; plain text answers stream word-by-word.
  const respondTo = useCallback((text: string, targetId: string) => {
    setThinking(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const reply = analyzePrompt(text)
      const id = crypto.randomUUID()

      if (reply.kind === "judgment") {
        const assistantMsg: Message = { id, role: "assistant", judgment: reply.judgment }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetId ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() } : c,
          ),
        )
        setThinking(false)
        return
      }

      // Stream a text reply word-by-word.
      const words = reply.text.split(" ")
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? { ...c, messages: [...c.messages, { id, role: "assistant", text: words[0] ?? "" }], updatedAt: Date.now() }
            : c,
        ),
      )
      setThinking(false)
      setStreamingId(id)
      let i = 1
      if (streamTimer.current) clearInterval(streamTimer.current)
      streamTimer.current = setInterval(() => {
        if (i >= words.length) {
          if (streamTimer.current) clearInterval(streamTimer.current)
          setStreamingId(null)
          return
        }
        const partial = words.slice(0, i + 1).join(" ")
        i += 1
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  messages: c.messages.map((m) => (m.id === id ? { ...m, text: partial } : m)),
                  updatedAt: Date.now(),
                }
              : c,
          ),
        )
      }, 45)
    }, 1400)
  }, [])

  const send = useCallback((text: string, meta: SendMeta) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      attachments: meta.attachments,
    }

    // Decide the target conversation id before mutating state so the
    // pending assistant reply lands in the same conversation.
    const existingId = activeIdRef.current
    const targetId = existingId ?? crypto.randomUUID()

    setConversations((prev) => {
      const exists = prev.some((c) => c.id === targetId)
      if (exists) {
        return prev.map((c) =>
          c.id === targetId
            ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() }
            : c,
        )
      }
      const convo: Conversation = {
        id: targetId,
        title: titleFrom(text),
        messages: [userMsg],
        updatedAt: Date.now(),
      }
      return [convo, ...prev]
    })

    activeIdRef.current = targetId
    setActiveId(targetId)
    setView("chat")

    respondTo(text, targetId)
  }, [respondTo])

  // Re-run the assistant reply for the last user message in the active conversation.
  const regenerate = useCallback(() => {
    const id = activeIdRef.current
    if (!id) return
    clearTimers()
    setStreamingId(null)
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        // Drop trailing assistant messages so the fresh reply replaces them.
        let msgs = [...c.messages]
        while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs = msgs.slice(0, -1)
        return { ...c, messages: msgs }
      }),
    )
    const convo = conversations.find((c) => c.id === id)
    const lastUser = [...(convo?.messages ?? [])].reverse().find((m) => m.role === "user") as
      | { text: string }
      | undefined
    if (lastUser) respondTo(lastUser.text, id)
  }, [conversations, respondTo, clearTimers])

  const ask = useCallback(
    (text: string) => {
      send(text, { mode: "judgment", attachments: [] })
    },
    [send],
  )

  const newChat = useCallback(() => {
    clearTimers()
    setThinking(false)
    setStreamingId(null)
    activeIdRef.current = null
    setActiveId(null)
    setView("chat")
  }, [clearTimers])

  const loadConversation = useCallback((id: string) => {
    clearTimers()
    setThinking(false)
    setStreamingId(null)
    activeIdRef.current = id
    setActiveId(id)
    setView("chat")
  }, [clearTimers])

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setActiveId((cur) => {
      if (cur === id) {
        activeIdRef.current = null
        return null
      }
      return cur
    })
  }, [])

  const clearAll = useCallback(() => {
    clearTimers()
    setThinking(false)
    setStreamingId(null)
    activeIdRef.current = null
    setActiveId(null)
    setConversations([])
  }, [clearTimers])

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
  const active = conversations.find((c) => c.id === activeId) ?? null
  const messages = active?.messages ?? []
  const started = messages.length > 0 || thinking

  return (
    <ChatContext.Provider
      value={{
        conversations: sorted,
        activeId,
        messages,
        thinking,
        streamingId,
        started,
        view,
        setView,
        send,
        ask,
        regenerate,
        newChat,
        loadConversation,
        deleteConversation,
        clearAll,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within a ChatProvider")
  return ctx
}
