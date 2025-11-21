import { useEffect } from "react";
import { X, Command, CornerUpLeft, Keyboard, Search, Plus } from "lucide-react";

interface KeyboardShortcut {
  action: string;
  description: string;
  keys: string[];
  icon?: React.ElementType;
}

const shortcuts: KeyboardShortcut[] = [
  {
    action: "New Brief",
    description: "Create a new AI research brief",
    keys: ["⌘", "N"],
    icon: Plus,
  },
  {
    action: "Search Briefs", 
    description: "Search through your research history",
    keys: ["⌘", "F"],
    icon: Search,
  },
  {
    action: "Toggle Sidebar",
    description: "Show or hide the navigation sidebar", 
    keys: ["⌘", "B"],
  },
  {
    action: "Settings",
    description: "Open application settings",
    keys: ["⌘", ","],
  },
  {
    action: "Keyboard Shortcuts",
    description: "Show this shortcuts panel",
    keys: ["⌘", "?"],
    icon: Keyboard,
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0, 0, 0, 0.7)" }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden animate-scale-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Keyboard Shortcuts</h2>
                <p className="text-muted-foreground mt-1">Boost your productivity with these shortcuts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="p-6 space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all duration-300 group border border-border/20 hover:border-primary/20"
            >
              <div className="flex items-center gap-3">
                {shortcut.icon && (
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <shortcut.icon className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">{shortcut.action}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{shortcut.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <div
                    key={keyIndex}
                    className="flex items-center justify-center min-w-[2rem] h-8 px-2 bg-card border border-border/50 rounded-lg text-foreground font-mono text-sm shadow-sm group-hover:border-primary/30 transition-colors duration-200"
                  >
                    {key === "⌘" && <Command className="w-3 h-3" />}
                    {key === "↵" && <CornerUpLeft className="w-3 h-3" />}
                    {key !== "⌘" && key !== "↵" && key}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="p-6 border-t border-border/50 bg-muted/20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              💡 <span className="font-medium">Pro tip:</span> Most shortcuts work from anywhere in the application
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}