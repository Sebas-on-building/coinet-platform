import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/themes/ThemeProvider";
import { AnimatedParticlesBG } from "./AnimatedParticlesBG";
import { CanvasRulersAndSnapping } from "./CanvasRulersAndSnapping";
import { CanvasDragAndDrop } from "./CanvasDragAndDrop";
import { NeuralToolbar } from "./NeuralToolbar";
import { ContextPropertiesPanel } from "./ContextPropertiesPanel";
import { NotificationSystem } from "./NotificationSystem";
import { CanvasKeyboardShortcuts } from "./CanvasKeyboardShortcuts";

// Atomic: Collapsible Toolbar
const Toolbar: React.FC<{ collapsed: boolean; onToggle: () => void }> = ({ collapsed, onToggle }) => {
  return (
    <motion.aside
      initial={{ width: 72 }}
      animate={{ width: collapsed ? 48 : 72 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      style={{
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 0",
        minHeight: "100%",
        boxShadow: "2px 0 8px 0 rgba(24,25,43,0.04)",
      }}
    >
      <button
        aria-label={collapsed ? "Expand toolbar" : "Collapse toolbar"}
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-secondary)",
          fontSize: 20,
          marginBottom: 24,
          cursor: "pointer",
        }}
      >
        {collapsed ? "→" : "←"}
      </button>
      {/* Toolbar buttons (icons only, minimal) */}
      <button style={{ background: "none", border: "none", margin: "12px 0", color: "var(--color-text)", fontSize: 24, cursor: "pointer" }} aria-label="Add Chart">📈</button>
      <button style={{ background: "none", border: "none", margin: "12px 0", color: "var(--color-text)", fontSize: 24, cursor: "pointer" }} aria-label="Add Text">🅰️</button>
      <button style={{ background: "none", border: "none", margin: "12px 0", color: "var(--color-text)", fontSize: 24, cursor: "pointer" }} aria-label="More Tools">⋯</button>
    </motion.aside>
  );
};

// Atomic: Properties Panel (appears only on selection)
const PropertiesPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          style={{
            background: "var(--color-surface)",
            borderLeft: "1px solid var(--color-border)",
            minWidth: 240,
            maxWidth: 320,
            padding: 24,
            boxShadow: "-2px 0 8px 0 rgba(24,25,43,0.04)",
            height: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            aria-label="Close properties panel"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-secondary)",
              fontSize: 20,
              position: "absolute",
              top: 16,
              right: 16,
              cursor: "pointer",
            }}
          >×</button>
          <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", margin: 0, marginBottom: 16 }}>Properties</h3>
          {/* Property controls go here */}
          <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>No selection</div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

// Atomic: Central Canvas Area
const CanvasArea: React.FC<{ onSelect: () => void }> = ({ onSelect }) => {
  return (
    <div
      tabIndex={0}
      style={{
        flex: 1,
        background: "var(--color-background)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        outline: "none",
        transition: "background 0.2s",
      }}
      onClick={onSelect}
      aria-label="Canvas workspace"
    >
      {/* Placeholder for chart elements, drag-and-drop, rulers, etc. */}
      <div style={{
        width: 640,
        height: 400,
        background: "var(--color-surface)",
        borderRadius: 24,
        boxShadow: "0 4px 32px 0 rgba(24,25,43,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-secondary)",
        fontSize: "var(--font-size-xl)",
        fontWeight: "var(--font-weight-medium)",
        userSelect: "none",
      }}>
        Canvas (Charts & Elements go here)
      </div>
    </div>
  );
};

// Main Minimalist Canvas Widget
export const MinimalistCanvasWidget: React.FC = () => {
  // State for selection, dragging, and context
  const [selectedType, setSelectedType] = useState<"chart" | "text" | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | undefined>(undefined);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const { colors } = useTheme();

  // Handlers for drag-and-drop and selection
  const handleSelect = (type: "chart" | "text") => {
    setSelectedType(type);
    setPropertiesOpen(true);
  };
  const handleDeselect = () => {
    setSelectedType(undefined);
    setPropertiesOpen(false);
  };
  const handleDragStart = (x: number, y: number) => {
    setDragging(true);
    setDragPos({ x, y });
  };
  const handleDrag = (x: number, y: number) => {
    setDragPos({ x, y });
  };
  const handleDragEnd = () => {
    setDragging(false);
    setDragPos(undefined);
  };

  // Keyboard shortcuts (stub handlers)
  const handleDelete = () => handleDeselect();
  const handleDuplicate = () => { };
  const handleSelectAll = () => { };
  const handleUndo = () => { };
  const handleRedo = () => { };

  return (
    <div style={{ position: "relative", display: "flex", height: "100vh", background: "var(--color-background)", minWidth: 0, overflow: "hidden" }}>
      {/* Animated background particles */}
      <AnimatedParticlesBG />
      {/* Rulers and snapping guides */}
      <CanvasRulersAndSnapping dragging={dragging} x={dragPos?.x} y={dragPos?.y} />
      {/* NeuralToolbar (adaptive, floating) */}
      <NeuralToolbar context={selectedType} />
      {/* Notification system (bell, popover, badges) */}
      <NotificationSystem />
      {/* Central canvas area with drag-and-drop */}
      <div style={{ flex: 1, position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CanvasDragAndDrop />
      </div>
      {/* Context-sensitive properties panel */}
      <ContextPropertiesPanel open={propertiesOpen} type={selectedType} onClose={handleDeselect} />
      {/* Keyboard shortcuts for core actions */}
      <CanvasKeyboardShortcuts
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onSelectAll={handleSelectAll}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
    </div>
  );
}; 