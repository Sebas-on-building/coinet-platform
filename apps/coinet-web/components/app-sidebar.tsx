"use client"

import { useEffect, useState } from "react"
import { PenSquare, Search, TrendingUp, PanelLeft, Settings, X, Trash2 } from "lucide-react"
import { CoinetLogo } from "@/components/coinet-logo"
import { SearchDialog } from "@/components/search-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { useChat } from "@/components/chat-context"
import { useSettings } from "@/components/settings-context"
import { cn } from "@/lib/utils"

type AppSidebarProps = {
  mobileOpen: boolean
  onMobileClose: () => void
}

const SIDEBAR_KEY = "coinet.sidebar.open"

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const [open, setOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { ask, newChat, conversations, activeId, loadConversation, deleteConversation, view, setView } = useChat()
  const { name, initials, plan } = useSettings()

  // Restore the collapsed/expanded preference on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_KEY)
      if (saved !== null) setOpen(saved === "true")
    } catch {
      // ignore
    }
  }, [])

  // Persist whenever it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, String(open))
    } catch {
      // ignore
    }
  }, [open])

  function handleNewChat() {
    newChat()
    onMobileClose()
  }

  function handleAsk(text: string) {
    ask(text)
    setSearchOpen(false)
    onMobileClose()
  }

  function handleOpenMarkets() {
    setView("markets")
    onMobileClose()
  }

  function handleOpenConversation(id: string) {
    loadConversation(id)
    setSearchOpen(false)
    onMobileClose()
  }

  const content = (
    <>
      <div className="flex items-center justify-between px-3 py-4">
        <div className="flex items-center gap-2">
          <CoinetLogo className="size-9 text-foreground" />
          <span className="font-heading text-lg font-bold tracking-tight">Coinet</span>
        </div>
        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={() => {
            setOpen(false)
            onMobileClose()
          }}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {/* Show close icon on mobile, collapse icon on desktop */}
          <X className="size-5 md:hidden" />
          <PanelLeft className="hidden size-5 md:block" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <nav className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            <PenSquare className="size-4 text-primary" />
            New chat
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Search className="size-4" />
            Search chats
          </button>
          <button
            type="button"
            onClick={handleOpenMarkets}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              view === "markets"
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <TrendingUp className={cn("size-4", view === "markets" && "text-primary")} />
            Markets
          </button>
        </nav>

        <div className="mt-6 pb-4">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recent</p>
          {conversations.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground/70">No conversations yet.</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg pr-1 transition-colors hover:bg-secondary",
                    activeId === c.id && "bg-secondary",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenConversation(c.id)}
                    className={cn(
                      "flex-1 truncate px-3 py-2 text-left text-sm transition-colors hover:text-foreground",
                      activeId === c.id ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${c.title}`}
                    onClick={() => deleteConversation(c.id)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </span>
          <span className="flex flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">{plan} plan</span>
          </span>
          <Settings className="size-4 text-muted-foreground" />
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Collapsed rail (desktop) */}
      {!open && (
        <div className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r border-border bg-sidebar py-4 md:flex">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <PanelLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="New chat"
            onClick={handleNewChat}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <PenSquare className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Search chats"
            onClick={() => setSearchOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Search className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Markets"
            onClick={handleOpenMarkets}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-secondary hover:text-foreground",
              view === "markets" ? "bg-secondary text-primary" : "text-muted-foreground",
            )}
          >
            <TrendingUp className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
            className="mt-auto flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Settings className="size-5" />
          </button>
        </div>
      )}

      {/* Full sidebar (desktop) */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all md:flex",
          open ? "w-72" : "w-0 overflow-hidden border-r-0",
        )}
      >
        {open && content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-[80%] max-w-xs flex-col border-r border-border bg-sidebar text-sidebar-foreground">
            {content}
          </aside>
        </div>
      )}

      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        chats={conversations.map((c) => ({ id: c.id, title: c.title }))}
        onSelect={handleOpenConversation}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
