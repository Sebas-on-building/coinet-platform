import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowsPointingOutIcon,
  XMarkIcon,
  ArrowsUpDownIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import type { WidgetPosition } from "@/hooks/useWidgetSettings";

interface DraggableWidgetProps {
  id: string;
  title: string;
  children: React.ReactNode;
  position: WidgetPosition;
  onPositionChange: (position: Partial<WidgetPosition>) => void;
  onRemove?: () => void;
  onConfigure?: () => void;
  minWidth?: number;
  minHeight?: number;
  className?: string;
}

export function DraggableWidget({
  id,
  title,
  children,
  position,
  onPositionChange,
  onRemove,
  onConfigure,
  minWidth = 300,
  minHeight = 200,
  className = "",
}: DraggableWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && widgetRef.current) {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;

        onPositionChange({
          x: position.x + deltaX,
          y: position.y + deltaY,
        });
      }

      if (isResizing && widgetRef.current) {
        const deltaX = e.clientX - resizeStartPos.current.x;
        const deltaY = e.clientY - resizeStartPos.current.y;

        onPositionChange({
          width: Math.max(minWidth, resizeStartPos.current.width + deltaX),
          height: Math.max(minHeight, resizeStartPos.current.height + deltaY),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, position, onPositionChange, minWidth, minHeight]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height,
    };
  };

  return (
    <Card
      ref={widgetRef}
      variant="glass"
      className={`absolute ${className}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: position.width,
        height: position.height,
        transition: isDragging || isResizing ? "none" : "transform 0.2s ease",
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Widget Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-gray-800/30"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <ArrowsUpDownIcon className="h-5 w-5 text-gray-400 cursor-grab" />
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onConfigure && (
            <button
              onClick={onConfigure}
              className="p-1 hover:bg-gray-800/30 rounded-md transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 hover:bg-gray-800/30 rounded-md transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4 h-[calc(100%-4rem)]">{children}</div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <ArrowsPointingOutIcon className="h-4 w-4 text-gray-400 absolute bottom-1 right-1" />
      </div>
    </Card>
  );
}
