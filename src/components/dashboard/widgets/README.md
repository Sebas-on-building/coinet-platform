# Dashboard Widgets: Atomic Components & Extension Points

This directory contains all atomic, modular, and extensible components for the Coinet minimalist canvas and dashboard system. Each component is designed for world-class UX, accessibility, and future-proofing.

## Components

- **MinimalistCanvasWidget**: Main workspace, composes all atomic subcomponents.
- **ChartRenderer**: Modular chart engine, supports overlays, axes, gridlines, and more.
- **ChartCanvasSurface**: Canvas/WebGL chart rendering, panning, zooming, gradients, glows.
- **ChartGridLines**: Animated, minimal gridlines (SVG overlay).
- **ChartAxis**: Modular X/Y axes (SVG, animated, accessible).
- **ChartLegend**: Floating, theme-aware, animated legend.
- **ChartTooltip**: Animated, accessible tooltip.
- **ChartSelectionHandles**: Direct manipulation handles (SVG, animated).
- **ChartGlowEffects**: Subtle, animated glow for selection.
- **ChartAccessibilityLayer**: ARIA, keyboard nav, screen reader support.
- **NeuralToolbar2**: Adaptive, context-sensitive toolbar (usage tracking, AI suggestions).
- **NeuralAIAssistantPanel**: Context-aware, floating, AI-powered assistant.
- **MultiChartOverlayRegistry**: Multi-chart, multi-overlay support (drag, overlays, registry).
- **GestureAndVoiceHooks**: Pinch, tap, swipe, and voice command support.
- **CollaborationHooks**: Real-time presence, comments, shared state (Liveblocks/CRDT).
- **LiveDataPulse**: Animated, theme-aware live data indicator.

## Extension Points

- **Add new chart types**: Extend ChartRenderer and ChartCanvasSurface.
- **Add overlays**: Register new overlays in MultiChartOverlayRegistry.
- **Add toolbar tools**: Extend NeuralToolbar2 TOOL_LIST.
- **Add AI/voice/gesture features**: Use hooks in GestureAndVoiceHooks.
- **Add collaboration features**: Use hooks in CollaborationHooks.
- **Add new themes**: Extend ThemeMode and colors.ts.

## Usage

Import and compose atomic components in MinimalistCanvasWidget or any dashboard layout. All components are theme-aware, accessible, and animated.

---

**Every component is documented and ready for world-class extension.** 