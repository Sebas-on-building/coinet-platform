import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { widgetRegistry, WidgetMeta } from '../widgets/registry';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// =========================
// WidgetArea: Dynamic, Drag/Drop, Configurable, Persistent
// =========================
const LS_KEY = 'coi_dashboard_widgets_v1';
const ONBOARD_KEY = 'coi_dashboard_onboarded_v1';

const defaultWidgets = [
  { key: 'marketOverview', layout: { x: 0, y: 0, w: 2, h: 3 } },
  { key: 'portfolio', layout: { x: 2, y: 0, w: 2, h: 3 } },
  { key: 'sentiment', layout: { x: 4, y: 0, w: 2, h: 3 } },
];

function loadWidgets() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { }
  return defaultWidgets;
}

function saveWidgets(widgets: any, configs: any) {
  localStorage.setItem(LS_KEY, JSON.stringify({ widgets, configs }));
}

function loadConfigs() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return JSON.parse(saved).configs || {};
  } catch { }
  return {};
}

const widgetCardVariants = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } },
  exit: { opacity: 0, y: 24, scale: 0.98, transition: { duration: 0.18 } },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18 } },
};

// =========================
// Onboarding Modal
// =========================
const OnboardingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.38)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      style={{ background: '#fff', borderRadius: 20, padding: 40, minWidth: 340, maxWidth: 420, boxShadow: '0 12px 48px 0 rgba(0,0,0,0.18)' }}
    >
      <h2 style={{ fontWeight: 800, fontSize: 26, marginBottom: 16 }}>Welcome to Coinet Dashboard!</h2>
      <ol style={{ margin: '16px 0 24px 20px', fontSize: 16, lineHeight: 1.7 }}>
        <li>Drag, drop, and resize widgets to create your perfect workspace.</li>
        <li>Click <span style={{ fontWeight: 700 }}>⚙️</span> to configure widgets.</li>
        <li>Click <span style={{ fontWeight: 700 }}>✖️</span> to remove widgets.</li>
        <li>Use the <span style={{ fontWeight: 700 }}>Add Widget...</span> menu to add more widgets.</li>
      </ol>
      <button onClick={onClose} style={{ marginTop: 8, padding: '10px 28px', borderRadius: 10, background: '#0057FF', color: '#fff', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>Get Started</button>
    </motion.div>
  </motion.div>
);

// =========================
// Tooltip Component
// =========================
const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactNode }> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      tabIndex={0}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '110%',
              transform: 'translateX(-50%)',
              background: '#222',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 14,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              zIndex: 3000,
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

const WidgetArea: React.FC = () => {
  const [widgets, setWidgets] = useState<any[]>(loadWidgets());
  const [configuring, setConfiguring] = useState<{ key: string; idx: number } | null>(null);
  const [configs, setConfigs] = useState<Record<string, any>>(loadConfigs());
  const [hovered, setHovered] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARD_KEY) === '1');

  // Persist widgets and configs
  useEffect(() => { saveWidgets(widgets, configs); }, [widgets, configs]);

  // Add widget
  function addWidget(key: string) {
    setWidgets(w => [
      ...w,
      { key, layout: { x: 0, y: Infinity, w: 2, h: 3 } },
    ]);
  }

  // Remove widget
  function removeWidget(idx: number) {
    setWidgets(w => w.filter((_, i) => i !== idx));
  }

  // Open config modal
  function openConfig(idx: number) {
    setConfiguring({ key: widgets[idx].key, idx });
  }

  // Save config
  function saveConfig(idx: number, config: any) {
    setConfigs(c => ({ ...c, [idx]: config }));
    setConfiguring(null);
  }

  // Layout change
  function onLayoutChange(layout: any) {
    setWidgets(w => w.map((widget, i) => ({ ...widget, layout: layout[i] })));
  }

  // Available widgets to add
  const available = Object.keys(widgetRegistry).filter(
    k => !widgets.some(w => w.key === k)
  );

  // Onboarding close
  function closeOnboarding() {
    setOnboarded(true);
    localStorage.setItem(ONBOARD_KEY, '1');
  }

  return (
    <main style={{
      flex: 1,
      padding: 32,
      background: 'var(--widgetarea-bg)',
      minHeight: 0,
      position: 'relative',
    }}>
      {/* Onboarding Modal */}
      <AnimatePresence>{!onboarded && <OnboardingModal onClose={closeOnboarding} />}</AnimatePresence>
      {/* Add Widget Button */}
      <div style={{ marginBottom: 24 }}>
        <Tooltip content="Add a new widget to your dashboard.">
          <select
            style={{ padding: 8, borderRadius: 8, marginRight: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            defaultValue=""
            onChange={e => { if (e.target.value) addWidget(e.target.value); }}
          >
            <option value="">Add Widget...</option>
            {available.map(key => (
              <option key={key} value={key}>{widgetRegistry[key].name}</option>
            ))}
          </select>
        </Tooltip>
      </div>
      {/* Widget Grid */}
      <ResponsiveGridLayout
        className="layout"
        rowHeight={100}
        cols={{ lg: 6, md: 4, sm: 2, xs: 1, xxs: 1 }}
        layouts={{ lg: widgets.map(w => ({ i: String(w.key), ...w.layout })) }}
        onLayoutChange={layout => onLayoutChange(layout)}
        isResizable
        isDraggable
        draggableHandle=".widget-drag-handle"
        style={{ transition: 'box-shadow 0.18s' }}
      >
        <AnimatePresence>
          {widgets.map((w, idx) => {
            const meta: WidgetMeta = widgetRegistry[w.key];
            const Widget = meta.component;
            const Config = meta.configComponent;
            const config = configs[idx] || meta.defaultConfig || {};
            return (
              <motion.div
                key={w.key}
                data-grid={w.layout}
                variants={widgetCardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                whileHover={{
                  boxShadow: '0 8px 32px 0 rgba(0,0,0,0.10), 0 1.5px 6px 0 rgba(0,0,0,0.08)',
                  scale: 1.012,
                  border: '1.5px solid #0057FF',
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  background: 'linear-gradient(135deg, var(--widgetarea-bg) 80%, #f0f4ff 100%)',
                  borderRadius: 18,
                  boxShadow: hovered === idx ? '0 8px 32px 0 rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.06)',
                  border: active === idx ? '2px solid #0057FF' : '1px solid #e5e7eb',
                  transition: 'box-shadow 0.18s, border 0.18s',
                  overflow: 'hidden',
                }}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                onMouseDown={() => setActive(idx)}
                onMouseUp={() => setActive(null)}
                tabIndex={0}
              >
                {/* Widget Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '8px 12px 0 12px', background: 'rgba(255,255,255,0.92)', borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
                  <Tooltip content="Drag to move widget">
                    <span className="widget-drag-handle" style={{ cursor: 'grab', fontSize: 18, marginRight: 8, opacity: 0.7, transition: 'opacity 0.18s' }}>⠿</span>
                  </Tooltip>
                  <span style={{ fontWeight: 600, fontSize: 16, flex: 1, letterSpacing: 0.2 }}>{meta.icon} {meta.name}</span>
                  <Tooltip content="Configure widget">
                    <button onClick={() => openConfig(idx)} aria-label="Configure" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, marginRight: 8, opacity: 0.7, transition: 'opacity 0.18s' }}>⚙️</button>
                  </Tooltip>
                  <Tooltip content="Remove widget">
                    <button onClick={() => removeWidget(idx)} aria-label="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, opacity: 0.7, transition: 'opacity 0.18s' }}>✖️</button>
                  </Tooltip>
                </div>
                {/* Widget Body */}
                <div style={{ flex: 1, minHeight: 0, padding: '0 12px 12px 12px', background: 'rgba(255,255,255,0.98)', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
                  <Widget config={config} />
                </div>
                {/* Config Modal */}
                <AnimatePresence>
                  {configuring && configuring.idx === idx && Config && (
                    <motion.div
                      key="modal"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={modalVariants}
                      style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.32)',
                        zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <motion.div
                        style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)' }}
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                      >
                        <h3 style={{ marginBottom: 16 }}>{meta.name} Settings</h3>
                        <Config config={config} setConfig={c => saveConfig(idx, c)} />
                        <button onClick={() => setConfiguring(null)} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, background: '#eee', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </ResponsiveGridLayout>
    </main>
  );
};

export default WidgetArea; 