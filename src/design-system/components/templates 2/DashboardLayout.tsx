import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from '../organisms/Header';
import clsx from 'clsx';

export interface DashboardWidget {
  id: string;
  content: React.ReactNode;
  x: number; // grid col
  y: number; // grid row
  w: number; // grid width (cols)
  h: number; // grid height (rows)
  minimized?: boolean;
  locked?: boolean;
  groupId?: string;
  settingsMenu?: React.ReactNode;
}

export interface DashboardLayoutProps {
  headerProps: React.ComponentProps<typeof Header>;
  sidebar: React.ReactNode;
  initialWidgets: DashboardWidget[];
  theme?: 'light' | 'dark' | 'system';
  className?: string;
  style?: React.CSSProperties;
}

const LAYOUT_STORAGE_KEY = 'co-dashboardlayout-layout-v1';

function useUndoRedo<T>(initial: T) {
  const [stack, setStack] = useState([initial]);
  const [pos, setPos] = useState(0);
  const set = (val: T | ((prev: T) => T)) => {
    setStack(s => {
      const next = typeof val === 'function' ? (val as (prev: T) => T)(s[pos]) : val;
      return [...s.slice(0, pos + 1), next];
    });
    setPos(p => p + 1);
  };
  const undo = () => setPos(p => Math.max(0, p - 1));
  const redo = () => setPos(p => Math.min(stack.length - 1, p + 1));
  return [stack[pos], set, undo, redo, pos > 0, pos < stack.length - 1] as const;
}

// Add WebSocket for multi-user collaboration
const WS_URL = 'wss://co-dashboard-collab.example.com';

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  headerProps,
  sidebar,
  initialWidgets,
  theme = 'system',
  className,
  style,
}) => {
  const [widgets, setWidgets, undo, redo, canUndo, canRedo] = useUndoRedo<DashboardWidget[]>(initialWidgets);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [resizeInfo, setResizeInfo] = useState<null | { id: string; startX: number; startY: number; startW: number; startH: number }>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupIds, setGroupedIds] = useState<string[][]>([]);
  const [grid, setGrid] = useState({ cols: 6, rows: 6 });
  const [snapPreview, setSnapPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // --- Multi-user collaboration ---
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    wsRef.current = new WebSocket(WS_URL);
    wsRef.current.onopen = () => wsRef.current?.send(JSON.stringify({ type: 'join', dashboard: 'main' }));
    wsRef.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'update' && msg.widgets) setWidgets(msg.widgets);
    };
    return () => wsRef.current?.close();
  }, [setWidgets]);
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'update', widgets }));
    }
  }, [widgets]);

  // --- Widget Templates ---
  const widgetTemplates = [
    { id: 'template-analytics', label: 'Analytics', content: <div>Analytics Widget</div> },
    { id: 'template-news', label: 'News Feed', content: <div>News Feed Widget</div> },
    { id: 'template-chart', label: 'Chart', content: <div>Chart Widget</div> },
  ];
  const addWidgetFromTemplate = (templateId: string) => {
    const template = widgetTemplates.find(t => t.id === templateId);
    if (template) {
      setWidgets(ws => [
        ...ws,
        { id: `widget-${Date.now()}`, content: template.content, x: 0, y: 0, w: 2, h: 2 },
      ]);
    }
  };

  // --- AI-powered Layout Suggestions ---
  const [aiSuggestion, setAiSuggestion] = useState<DashboardWidget[] | null>(null);
  const requestAiSuggestion = async () => {
    // Simulate AI API call
    const response = await fetch('/api/ai-layout-suggestion', { method: 'POST', body: JSON.stringify({ widgets }) });
    const suggestion = await response.json();
    setAiSuggestion(suggestion.widgets);
  };
  const applyAiSuggestion = () => {
    if (aiSuggestion) setWidgets(aiSuggestion);
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDrag = (id: string, x: number, y: number) => setSnapPreview({ x, y, w: widgets.find(w => w.id === id)?.w || 1, h: widgets.find(w => w.id === id)?.h || 1 });
  const handleDrop = (id: string, x: number, y: number) => {
    setWidgets((ws: DashboardWidget[]) => ws.map((w: DashboardWidget) => w.id === id ? { ...w, x, y } : w));
    setDraggedId(null);
    setSnapPreview(null);
  };

  const handleResizeStart = (id: string, e: React.MouseEvent) => {
    const w = widgets.find(w => w.id === id);
    if (!w) return;
    setResizeInfo({ id, startX: e.clientX, startY: e.clientY, startW: w.w, startH: w.h });
  };
  useEffect(() => {
    if (!resizeInfo) return;
    const onMove = (e: MouseEvent) => {
      const dx = Math.round((e.clientX - resizeInfo.startX) / 120); // 120px per col
      const dy = Math.round((e.clientY - resizeInfo.startY) / 120); // 120px per row
      setWidgets((ws: DashboardWidget[]) => ws.map((w: DashboardWidget) => w.id === resizeInfo.id ? { ...w, w: Math.max(1, resizeInfo.startW + dx), h: Math.max(1, resizeInfo.startH + dy) } : w));
    };
    const onUp = () => setResizeInfo(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizeInfo, setWidgets]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'Z')) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey) setSelectedIds((ids: string[]) => [...ids, id]);
    else setSelectedIds([id]);
  };
  const groupSelected = () => {
    setGroupedIds((groups: string[][]) => [...groups, selectedIds]);
    setSelectedIds([]);
  };
  const ungroup = (group: string[]) => setGroupedIds((groups: string[][]) => groups.filter((g: string[]) => g !== group));

  return (
    <div className={clsx('co-dashboardlayout', className)} style={style}>
      <Header {...headerProps} />
      <div className="co-dashboardlayout-main">
        <aside className="co-dashboardlayout-sidebar" role="complementary">
          {sidebar}
          <div className="co-dashboardlayout-templates">
            <h4>Widget Templates</h4>
            {widgetTemplates.map(t => (
              <button key={t.id} onClick={() => addWidgetFromTemplate(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="co-dashboardlayout-ai">
            <button onClick={requestAiSuggestion}>AI Layout Suggestion</button>
            {aiSuggestion && <button onClick={applyAiSuggestion}>Apply AI Suggestion</button>}
          </div>
          <button onClick={undo} disabled={!canUndo}>Undo</button>
          <button onClick={redo} disabled={!canRedo}>Redo</button>
          <button onClick={groupSelected} disabled={selectedIds.length < 2}>Group</button>
        </aside>
        <section
          className="co-dashboardlayout-widgetsgrid"
          role="main"
          aria-label="Dashboard widgets"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
            gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
            gap: 16,
            padding: 24,
          }}
        >
          {snapPreview && (
            <div
              className="co-dashboardlayout-snap-preview"
              style={{
                gridColumn: `${snapPreview.x + 1} / span ${snapPreview.w}`,
                gridRow: `${snapPreview.y + 1} / span ${snapPreview.h}`,
                background: 'rgba(0,87,255,0.08)',
                border: '2px dashed #0057ff',
                borderRadius: 12,
                pointerEvents: 'none',
                zIndex: 10,
                position: 'absolute',
              }}
            />
          )}
          {widgets.map(w => (
            <div
              key={w.id}
              className={clsx(
                'co-dashboardlayout-widget',
                selectedIds.includes(w.id) && 'co-dashboardlayout-widget-selected',
                w.locked && 'co-dashboardlayout-widget-locked'
              )}
              style={{
                gridColumn: `${w.x + 1} / span ${w.w}`,
                gridRow: `${w.y + 1} / span ${w.h}`,
                minWidth: 120, minHeight: 120,
                position: 'relative',
                zIndex: 1,
                transition: 'box-shadow 0.3s, opacity 0.3s',
                boxShadow: draggedId === w.id ? '0 8px 32px 0 rgba(0,87,255,0.18)' : undefined,
                opacity: w.minimized ? 0.5 : 1,
              }}
              draggable={!w.locked}
              onDragStart={() => handleDragStart(w.id)}
              onDragOver={() => handleDrag(w.id, w.x, w.y)}
              onDrop={() => handleDrop(w.id, snapPreview?.x ?? w.x, snapPreview?.y ?? w.y)}
              onClick={e => handleSelect(w.id, e)}
              tabIndex={0}
              aria-label={`Widget ${w.id}`}
              role="region"
            >
              <div className="co-dashboardlayout-widget-toolbar">
                <button onClick={() => setWidgets((ws: DashboardWidget[]) => ws.map((x: DashboardWidget) => x.id === w.id ? { ...x, minimized: !x.minimized } : x))}>{w.minimized ? '▢' : '—'}</button>
                <button onClick={() => setWidgets((ws: DashboardWidget[]) => ws.map((x: DashboardWidget) => x.id === w.id ? { ...x, locked: !x.locked } : x))}>{w.locked ? '🔒' : '🔓'}</button>
                <button onClick={() => setWidgets((ws: DashboardWidget[]) => ws.filter((x: DashboardWidget) => x.id !== w.id))}>✕</button>
                {w.settingsMenu}
              </div>
              {!w.minimized && <div className="co-dashboardlayout-widget-content">{w.content}</div>}
              {!w.locked && (
                <>
                  <div className="resize-handle resize-handle-se" onMouseDown={e => handleResizeStart(w.id, e)} />
                </>
              )}
            </div>
          ))}
          {groupIds.map((group, i) => (
            <div key={i} className="co-dashboardlayout-groupbox">
              <button onClick={() => ungroup(group)}>Ungroup</button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}; 