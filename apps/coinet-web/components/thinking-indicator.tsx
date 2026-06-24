"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Telescope, Waypoints, Scale, GitCompareArrows, Activity, Gavel, type LucideIcon } from "lucide-react"
import type { AnalysisDepth } from "@/components/chat-context"
import { cn } from "@/lib/utils"

type Phase = { icon: LucideIcon; label: string }

// Each depth narrates a different amount of "research" so the user can see the
// engine actually working. Faster modes show fewer, snappier steps.
const PHASES: Record<AnalysisDepth, Phase[]> = {
  quick: [
    { icon: Search, label: "Scanning the market" },
    { icon: Scale, label: "Forming a quick read" },
  ],
  standard: [
    { icon: Search, label: "Scanning the market" },
    { icon: Activity, label: "Reading whale & on-chain flows" },
    { icon: GitCompareArrows, label: "Cross-checking sentiment" },
    { icon: Scale, label: "Weighing the signals" },
    { icon: Gavel, label: "Forming a verdict" },
  ],
  deep: [
    { icon: Search, label: "Scanning every timeframe" },
    { icon: Telescope, label: "Researching the sources" },
    { icon: Activity, label: "Tracing whale & on-chain flows" },
    { icon: GitCompareArrows, label: "Cross-checking contradictions" },
    { icon: Waypoints, label: "Mapping the signal graph" },
    { icon: Scale, label: "Weighing every signal" },
    { icon: Gavel, label: "Forming the final verdict" },
  ],
}

export function ThinkingIndicator({
  depth = "standard",
  reduceMotion = false,
}: {
  depth?: AnalysisDepth
  reduceMotion?: boolean
}) {
  const phases = useMemo(() => PHASES[depth] ?? PHASES.standard, [depth])
  const [index, setIndex] = useState(0)

  // Advance through the research phases on a loop. The last phase stays put so
  // the indicator settles on "forming a verdict" while the request finishes.
  useEffect(() => {
    setIndex(0)
    if (reduceMotion) return
    const interval = setInterval(() => {
      setIndex((i) => (i < phases.length - 1 ? i + 1 : i))
    }, 1400)
    return () => clearInterval(interval)
  }, [phases, reduceMotion])

  const phase = phases[Math.min(index, phases.length - 1)]
  const Icon = phase.icon

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur">
      {/* Pulsing icon ring */}
      <span className="relative flex size-7 shrink-0 items-center justify-center">
        {!reduceMotion && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/25 [animation-duration:1.6s]" />
        )}
        <span className="relative flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="size-4" />
        </span>
      </span>

      {/* Shimmering phase label — fade wrapper remounts per phase, inner span shimmers */}
      <span key={index} className={cn("inline-block", !reduceMotion && "animate-thinking-fade")}>
        <span
          className={cn(
            "text-sm font-medium",
            reduceMotion
              ? "text-muted-foreground"
              : "animate-thinking-shimmer bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent",
          )}
        >
          {phase.label}
        </span>
      </span>

      {/* Trailing animated dots */}
      <span className="flex translate-y-0.5 gap-1">
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-primary/70" />
      </span>
    </div>
  )
}
