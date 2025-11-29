import { Minus, Square, X } from "lucide-react";

interface MacWindowControlsProps {
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export function MacWindowControls({ onMinimize, onMaximize, onClose }: MacWindowControlsProps) {
  return (
    <div className="mac-controls">
      <div 
        className="mac-control red group"
        onClick={onClose}
        role="button"
        tabIndex={0}
      >
        <X className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
      <div 
        className="mac-control yellow group"
        onClick={onMinimize}
        role="button"
        tabIndex={0}
      >
        <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
      <div 
        className="mac-control green group"
        onClick={onMaximize}
        role="button"
        tabIndex={0}
      >
        <Square className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>
    </div>
  );
}