import { useCallback, useState } from "react"
import { Upload, FileText, Image, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface FileItem {
  id: string
  name: string
  type: string
  size: number
  url: string
}

interface DragDropZoneProps {
  onFilesAdded: (files: FileItem[]) => void
  onFileRemove: (fileId: string) => void
  attachedFiles: FileItem[]
  maxSize?: number // in MB
  accept?: string
  className?: string
}

export function DragDropZone({
  onFilesAdded,
  onFileRemove,
  attachedFiles,
  maxSize = 10,
  accept = "image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx",
  className
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: FileItem[] = []
    
    Array.from(fileList).forEach((file) => {
      if (file.size > maxSize * 1024 * 1024) {
        return // Skip files that are too large
      }

      newFiles.push({
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      })
    })

    if (newFiles.length > 0) {
      onFilesAdded(newFiles)
    }
  }, [maxSize, onFilesAdded])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFiles(files)
    }
  }, [processFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFiles(files)
    }
    // Reset input
    e.target.value = ''
  }, [processFiles])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
              isDragging 
                ? "bg-primary/20 scale-110" 
                : "bg-muted/50"
            )}>
              <Upload className={cn(
                "w-8 h-8 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            
            <div>
              <p className="text-base font-medium text-foreground mb-1">
                {isDragging ? "Drop files here" : "Drop files or click to upload"}
              </p>
              <p className="text-sm text-muted-foreground">
                Maximum file size: {maxSize}MB
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Attached Files List */}
      {attachedFiles.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-sm font-medium text-muted-foreground">
            Attached Files ({attachedFiles.length})
          </p>
          <div className="space-y-2">
            {attachedFiles.map((file, index) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFileRemove(file.id)}
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
