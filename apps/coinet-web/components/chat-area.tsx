"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { FileText, ImageIcon } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { AskBar } from "@/components/ask-bar"
import { CoinetLogo } from "@/components/coinet-logo"
import { JudgmentCard } from "@/components/judgment-card"
import { ThinkingIndicator } from "@/components/thinking-indicator"
import { useChat } from "@/components/chat-context"
import { useSettings } from "@/components/settings-context"
import { cn } from "@/lib/utils"

export function ChatArea() {
  const { messages, thinking, thinkingDepth, streamingId, started, send: handleSend } = useChat()
  const { reduceMotion } = useSettings()
  const { user } = useUser()
  const firstName = user?.firstName?.trim() || user?.fullName?.trim().split(/\s+/)[0] || "there"
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, thinking])

  // ---- Empty / hero state ----
  if (!started) {
    return (
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex -translate-y-20 justify-center"
          aria-hidden="true"
        >
          <Image
            src="/coinet-globe.png"
            alt=""
            width={900}
            height={900}
            priority
            className={cn(
              "h-auto w-[min(90vw,640px)] opacity-30 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)] [transform-origin:center]",
              !reduceMotion && "animate-globe-spin",
            )}
          />
        </div>

        <span className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="size-1.5 rounded-full bg-primary" />
          Judgment engine online
        </span>

        <h1 className="relative max-w-full text-balance break-words px-2 text-center font-heading text-2xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
          {`What's moving the market, ${firstName}?`}
        </h1>

        <p className="relative mt-3 max-w-md text-pretty text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          Ask anything about prices, whales, sentiment, and on-chain moves. Coinet weighs the signals and gives you its
          judgment.
        </p>

        <div className="relative mt-8 flex w-full flex-col items-center">
          <AskBar onSend={handleSend} />
        </div>

        <p className="relative mt-6 text-center text-xs text-muted-foreground">
          Coinet analyzes markets and may be imperfect. Always verify before you trade.
        </p>
      </section>
    )
  }

  // ---- Conversation state ----
  return (
    <section className="relative z-10 flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex flex-col items-end gap-2">
                {m.attachments.length > 0 && (
                  <div className="flex max-w-[85%] flex-wrap justify-end gap-2">
                    {m.attachments.map((a) => (
                      <span
                        key={a.id}
                        className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-xs text-foreground"
                      >
                        {a.kind === "image" ? (
                          <ImageIcon className="size-3.5 text-primary" />
                        ) : (
                          <FileText className="size-3.5 text-primary" />
                        )}
                        <span className="max-w-[10rem] truncate">{a.name}</span>
                      </span>
                    ))}
                  </div>
                )}
                {m.text && (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
                    {m.text}
                  </div>
                )}
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <CoinetLogo className="mt-0.5 size-9 shrink-0 text-foreground" />
                <div className="min-w-0 flex-1">
                  {"judgment" in m ? (
                    <JudgmentCard judgment={m.judgment} />
                  ) : (
                    <div className="rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm leading-relaxed text-foreground/90 backdrop-blur">
                      {m.text}
                      {streamingId === m.id && (
                        <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-primary align-middle" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {thinking && (
            <div className="flex gap-3">
              <CoinetLogo
                className={cn("mt-0.5 size-9 shrink-0 text-foreground", !reduceMotion && "animate-pulse")}
              />
              <ThinkingIndicator depth={thinkingDepth} reduceMotion={reduceMotion} />
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Floating composer */}
      <div className="bg-gradient-to-t from-background via-background/90 to-transparent">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-4">
          <AskBar onSend={handleSend} showSuggestions={false} autoFocus />
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            Coinet analyzes markets and may be imperfect. Always verify before you trade.
          </p>
        </div>
      </div>
    </section>
  )
}
