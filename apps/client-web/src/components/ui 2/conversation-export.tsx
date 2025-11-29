import { Download, FileText, Share2 } from "lucide-react"
import { Button } from "./button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
import { Card } from "./card"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: number
}

interface ConversationExportProps {
  messages: Message[]
  conversationTitle?: string
}

export function ConversationExport({ 
  messages, 
  conversationTitle = "Coinet AI Chat" 
}: ConversationExportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportAsText = () => {
    const header = `${conversationTitle}\nExported: ${formatDate(Date.now())}\n${'='.repeat(50)}\n\n`
    
    const content = messages.map(msg => {
      const role = msg.type === "user" ? "You" : "AI Assistant"
      const time = formatDate(msg.timestamp)
      return `[${role}] - ${time}\n${msg.content}\n\n${'─'.repeat(50)}\n`
    }).join('\n')

    const blob = new Blob([header + content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${conversationTitle.replace(/\s+/g, '_')}_${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Exported successfully",
      description: "Conversation saved as text file"
    })
    setIsOpen(false)
  }

  const exportAsJSON = () => {
    const exportData = {
      title: conversationTitle,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        formattedTime: formatDate(msg.timestamp)
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${conversationTitle.replace(/\s+/g, '_')}_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Exported successfully",
      description: "Conversation saved as JSON file"
    })
    setIsOpen(false)
  }

  const exportAsMarkdown = () => {
    const header = `# ${conversationTitle}\n\n*Exported: ${formatDate(Date.now())}*\n\n---\n\n`
    
    const content = messages.map(msg => {
      const role = msg.type === "user" ? "**You**" : "**AI Assistant**"
      const time = formatDate(msg.timestamp)
      return `${role} *(${time})*\n\n${msg.content}\n\n---\n`
    }).join('\n')

    const blob = new Blob([header + content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${conversationTitle.replace(/\s+/g, '_')}_${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Exported successfully",
      description: "Conversation saved as Markdown file"
    })
    setIsOpen(false)
  }

  const copyToClipboard = () => {
    const text = messages.map(msg => {
      const role = msg.type === "user" ? "You" : "AI"
      return `${role}: ${msg.content}`
    }).join('\n\n')

    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Conversation copied successfully"
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
          <DialogDescription>
            Choose a format to download your chat history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <Card 
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-border hover:border-primary/50"
            onClick={exportAsText}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Plain Text (.txt)</h4>
                <p className="text-xs text-muted-foreground">
                  Simple text format, easy to read
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-border hover:border-primary/50"
            onClick={exportAsMarkdown}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Markdown (.md)</h4>
                <p className="text-xs text-muted-foreground">
                  Formatted text with styling
                </p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-border hover:border-primary/50"
            onClick={exportAsJSON}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">JSON (.json)</h4>
                <p className="text-xs text-muted-foreground">
                  Structured data format
                </p>
              </div>
            </div>
          </Card>

          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={copyToClipboard}
          >
            <Share2 className="w-4 h-4" />
            Copy to Clipboard
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground text-center">
            <strong>{messages.length}</strong> messages • Conversation started {formatDate(messages[0]?.timestamp || Date.now())}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}