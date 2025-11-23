import { useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Source {
  id: string;
  domain: string;
  url: string;
  title: string;
  excerpt?: string;
  favicon?: string;
}

interface SourceCitationProps {
  sources: Source[];
  messageId: string;
  onOpenSources: () => void;
  className?: string;
}

export function SourceCitation({ sources, messageId, onOpenSources, className }: SourceCitationProps) {
  const [failedFavicons, setFailedFavicons] = useState<Set<string>>(new Set());

  if (!sources || sources.length === 0) return null;

  const handleFaviconError = (sourceId: string) => {
    setFailedFavicons(prev => new Set(prev).add(sourceId));
  };

  return (
    <div className={cn("flex items-center gap-2 mt-3", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenSources}
        className="h-8 px-3 rounded-full bg-muted/50 hover:bg-muted border border-border/50 transition-all duration-200"
      >
        {/* Source Favicons/Icons */}
        <div className="flex items-center -space-x-1 mr-2">
          {sources.slice(0, 4).map((source, index) => (
            <div 
              key={source.id}
              className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px]"
              style={{ zIndex: sources.length - index }}
            >
              {source.favicon && !failedFavicons.has(source.id) ? (
                <img 
                  src={source.favicon} 
                  alt="" 
                  className="w-4 h-4 rounded-full"
                  onError={() => handleFaviconError(source.id)}
                />
              ) : (
                <Globe className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          ))}
          {sources.length > 4 && (
            <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-medium">
              +{sources.length - 4}
            </div>
          )}
        </div>
        
        <span className="text-xs font-medium">
          Quellen
        </span>
      </Button>
    </div>
  );
}
