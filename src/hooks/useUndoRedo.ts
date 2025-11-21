import { useCallback, useRef, useState } from 'react';

/**
 * useUndoRedo - Atomic undo/redo stack for any value.
 * @param {T} initial - Initial value.
 * @returns { value, set, undo, redo, canUndo, canRedo }
 */
export function useUndoRedo<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);

  const set = useCallback((val: T) => {
    undoStack.current.push(value);
    setValue(val);
    redoStack.current = [];
  }, [value]);

  const undo = useCallback(() => {
    if (undoStack.current.length) {
      redoStack.current.push(value);
      setValue(undoStack.current.pop()!);
    }
  }, [value]);

  const redo = useCallback(() => {
    if (redoStack.current.length) {
      undoStack.current.push(value);
      setValue(redoStack.current.pop()!);
    }
  }, [value]);

  return { value, set, undo, redo, canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 };
} 