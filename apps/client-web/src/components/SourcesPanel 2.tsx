import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Globe } from "lucide-react";
import type { Source } from "./SourceCitation";

interface SourcesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: Source[];
}

export function SourcesPanel({ open, onOpenChange, sources }: SourcesPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">
            Quellenangaben
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <div className="space-y-4 pr-4">
            {sources.map((source, index) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200">
                  {/* Domain with Favicon */}
                  <div className="flex items-center gap-2 mb-2">
                    {source.favicon ? (
                      <img 
                        src={source.favicon} 
                        alt="" 
                        className="w-4 h-4 rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Globe className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground font-medium">
                      {source.domain}
                    </span>
                    <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  
                  {/* Title */}
                  <h4 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {source.title}
                  </h4>
                  
                  {/* Excerpt */}
                  {source.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {source.excerpt}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
