"use client"

import { useState } from "react"
import { Menu, Plus } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChatArea } from "@/components/chat-area"
import { MarketsView } from "@/components/markets-view"
import { CoinetLogo } from "@/components/coinet-logo"
import { useAuth } from "@clerk/nextjs"
import { ChatProvider, useChat } from "@/components/chat-context"
import { SettingsProvider } from "@/components/settings-context"
import { AuthScreen } from "@/components/auth-screen"

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { newChat, view } = useChat()

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <CoinetLogo className="size-8 text-foreground" />
            <span className="font-heading text-base font-bold tracking-tight">Coinet</span>
          </div>
          <button
            type="button"
            aria-label="New chat"
            onClick={newChat}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Plus className="size-5" />
          </button>
        </header>

        {view === "markets" ? <MarketsView /> : <ChatArea />}
      </main>
    </div>
  )
}

function Gate() {
  const { isLoaded, isSignedIn } = useAuth()

  // Avoid an auth-screen flash while Clerk restores the session.
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (!isSignedIn) return <AuthScreen />

  return (
    <ChatProvider>
      <Shell />
    </ChatProvider>
  )
}

export default function Page() {
  return (
    <SettingsProvider>
      <Gate />
    </SettingsProvider>
  )
}
