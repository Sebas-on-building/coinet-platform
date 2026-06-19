import Image from "next/image"
import { cn } from "@/lib/utils"

export function CoinetLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center", className)} aria-hidden="true">
      <Image
        src="/coinet-logo.png"
        alt=""
        width={96}
        height={96}
        priority
        className="size-full object-contain [.light_&]:invert"
      />
    </span>
  )
}
