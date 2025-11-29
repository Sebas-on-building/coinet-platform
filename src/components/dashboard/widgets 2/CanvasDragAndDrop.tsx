import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChartRenderer } from "./ChartRenderer";

interface CanvasElement {
  id: string;
  x: number;
  y: number;
  type: "chart" | "text";
}

export const CanvasDragAndDrop: React.FC = () => {
  const [elements, setElements] = useState<CanvasElement[]>([
    { id: "1", x: 100, y: 100, type: "chart" },
  ]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragEnd = () => setDraggedId(null);
  const handleSelect = (id: string) => setSelectedId(id);
  const handleDrag = (id: string, dx: number, dy: number) => {
    setElements(els => els.map(el => el.id === id ? { ...el, x: el.x + dx, y: el.y + dy } : el));
  };

  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
      {elements.map(el => (
        <motion.g
          key={el.id}
          drag
          dragMomentum={false}
          onDragStart={() => handleDragStart(el.id)}
          onDragEnd={handleDragEnd}
          onClick={() => handleSelect(el.id)}
          style={{ cursor: draggedId === el.id ? "grabbing" : "grab" }}
          initial={false}
          animate={{
            filter: selectedId === el.id ? "drop-shadow(0 0 8px var(--color-primary))" : "none",
            scale: draggedId === el.id ? 1.04 : 1,
          }}
          dragConstraints={{ left: 0, top: 0, right: 640, bottom: 400 }}
          onDrag={(e, info) => handleDrag(el.id, info.delta.x, info.delta.y)}
          tabIndex={0}
          aria-label={el.type === "chart" ? "Chart element" : "Text element"}
        >
          {el.type === "chart" ? (
            <foreignObject x={el.x} y={el.y} width={640} height={400}>
              <ChartRenderer />
            </foreignObject>
          ) : (
            <text x={el.x} y={el.y} fontSize={24} fill="var(--color-text)">Text</text>
          )}
        </motion.g>
      ))}
    </svg>
  );
}; 