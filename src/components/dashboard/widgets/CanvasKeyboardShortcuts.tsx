import { useEffect } from "react";

/**
 * CanvasKeyboardShortcuts - Keyboard shortcuts for canvas actions.
 * Ctrl/Cmd+A: Select all | Ctrl/Cmd+Z: Undo | Ctrl/Cmd+Y: Redo
 * Delete/Backspace: Delete | Ctrl/Cmd+D: Duplicate
 */
export const CanvasKeyboardShortcuts: React.FC<{ onDelete?: () => void; onDuplicate?: () => void; onSelectAll?: () => void; onUndo?: () => void; onRedo?: () => void; }> = ({ onDelete, onDuplicate, onSelectAll, onUndo, onRedo }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        onSelectAll?.();
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        onUndo?.();
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        onRedo?.();
        e.preventDefault();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        onDelete?.();
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        onDuplicate?.();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDelete, onDuplicate, onSelectAll, onUndo, onRedo]);
  return null;
}; 