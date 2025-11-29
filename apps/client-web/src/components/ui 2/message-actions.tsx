import { Copy, RotateCcw, Download, Share2, Trash2, CheckCheck, Check } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { MoreHorizontal } from "lucide-react"

interface MessageActionsProps {
  messageId: string
  messageContent: string
  messageType: "user" | "assistant"
  timestamp: number
  isRead?: boolean
  onCopy: (content: string) => void
  onRegenerate?: () => void
  onExport?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  className?: string
}

export function MessageActions({
  messageId,
  messageContent,
  messageType,
  timestamp,
  isRead = true,
  onCopy,
  onRegenerate,
  onExport,
  onDelete,
  className
}: MessageActionsProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className={cn(
      "flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
      className
    )}>
      {/* Timestamp with read status */}
      <div className="flex items-center gap-1.5 mr-1">
        <span className="text-xs text-muted-foreground">
          {formatTime(timestamp)}
        </span>
        {messageType === "user" && (
          <div className="flex items-center" title={isRead ? "Read" : "Sent"}>
            {isRead ? (
              <CheckCheck className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Check className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Quick Copy Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCopy(messageContent)}
        className="h-7 w-7 p-0 hover:bg-muted rounded-lg"
        title="Copy message"
      >
        <Copy className="w-3.5 h-3.5" />
      </Button>

      {/* Regenerate Button (Assistant only) */}
      {messageType === "assistant" && onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          className="h-7 w-7 p-0 hover:bg-muted rounded-lg"
          title="Regenerate response"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      )}

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-muted rounded-lg"
            title="More actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onCopy(messageContent)}>
            <Copy className="w-4 h-4 mr-2" />
            Copy message
          </DropdownMenuItem>
          
          {messageType === "assistant" && onRegenerate && (
            <DropdownMenuItem onClick={onRegenerate}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerate
            </DropdownMenuItem>
          )}
          
          {onExport && (
            <DropdownMenuItem onClick={() => onExport(messageId)}>
              <Download className="w-4 h-4 mr-2" />
              Export message
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem 
            onClick={() => {
              const text = `${messageType === "user" ? "You" : "AI"}: ${messageContent}`
              navigator.share?.({ text }) || navigator.clipboard.writeText(text)
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {onDelete && (
            <DropdownMenuItem 
              onClick={() => onDelete(messageId)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete message
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Compact version for mobile or tight spaces
export function CompactMessageActions({
  messageContent,
  onCopy,
  className
}: {
  messageContent: string
  onCopy: (content: string) => void
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onCopy(messageContent)}
      className={cn("h-6 w-6 p-0 hover:bg-muted rounded-md", className)}
      title="Copy"
    >
      <Copy className="w-3 h-3" />
    </Button>
  )
}