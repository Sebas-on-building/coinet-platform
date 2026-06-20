"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useClerk } from "@clerk/nextjs"
import type { Attachment, SendMeta } from "@/components/ask-bar"
import type { Judgment } from "@/lib/judgment"
import { apiClient } from "@/lib/api-client"
import { chatVerdictToJudgment } from "@/lib/verdict-map"

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
  const clerk = useClerk()

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

  // Produce an assistant reply for `text` from the REAL backend, appending it to
  // conversation `targetId`. A governed verdict (AVAILABLE/DEGRADED with fields)
  // renders as a JudgmentCard; everything else (UNAVAILABLE / greeting / error)
  // renders as honest text — never a fabricated card.
  const respondTo = useCallback(
    async (text: string, targetId: string) => {
      setThinking(true)
      if (timer.current) clearTimeout(timer.current)
      if (streamTimer.current) clearInterval(streamTimer.current)
      setStreamingId(null)

      const append = (msg: Message) =>
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetId ? { ...c, messages: [...c.messages, msg], updatedAt: Date.now() } : c,
          ),
        )

      try {
        // Fresh Clerk session token per send (no stale hook), then call the API.
        const token = (await clerk.session?.getToken()) ?? null
        apiClient.setAuth(clerk.user?.id ?? null, token)

        const res = await apiClient.sendChatMessage({
          message: text,
          context: { analysisDepth: "standard" },
        })
        const m = res.data.message
        const id = m.id || crypto.randomUUID()
        const v = m.verdict

        if (v && v.status !== "UNAVAILABLE" && v.fields && Object.keys(v.fields).length > 0) {
          append({ id, role: "assistant", judgment: chatVerdictToJudgment(v, m.content) })
        } else {
          append({
            id,
            role: "assistant",
            text: m.content || "I couldn't form a judgment on that just now.",
          })
        }
      } catch (err) {
        const unauthorized = err instanceof Error && /\b401\b|unauth/i.test(err.message)
        append({
          id: crypto.randomUUID(),
          role: "assistant",
          text: unauthorized
            ? "Your session expired — please sign out and back in, then try again."
            : "I couldn't reach Coinet's engine just now. Give it a moment and try again.",
        })
      } finally {
        setThinking(false)
      }
    },
    [clerk],
  )

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
