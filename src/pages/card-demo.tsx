import React, { useState, useCallback } from 'react';
import { Card, CardExportShare, CardUndoRedo, CardAnalyticsProvider, CardComplianceProvider } from '../components/ui/Card/Card';
import { CardEventLog, CardEvent } from '../components/ui/Card/CardEventLog';
import { ErrorBoundary } from '../components/ui/Card/ErrorBoundary';

const demoData = { name: 'Coinet Card', value: 42 };

const CardDemoPage = () => {
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [content, setContent] = useState('Edit me!');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(false);
  const [variant, setVariant] = useState<'frosted' | 'neon' | 'minimal'>('frosted');
  const [events, setEvents] = useState<CardEvent[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [motion, setMotion] = useState<'auto' | 'reduce'>('auto');

  // Event logging
  const logEvent = useCallback((event: any, source: 'analytics' | 'compliance') => {
    setEvents(evts => [
      { ...event, timestamp: Date.now(), source },
      ...evts.slice(0, 199)
    ]);
  }, []);
  const handleAnalytics = useCallback((event: any) => logEvent(event, 'analytics'), [logEvent]);
  const handleCompliance = useCallback((event: any) => logEvent(event, 'compliance'), [logEvent]);
  const handleClearEvents = () => setEvents([]);

  // Undo/redo logic
  const handleEdit = (val: string) => {
    setUndoStack([...undoStack, content]);
    setRedoStack([]);
    setContent(val);
  };
  const handleUndo = () => {
    if (undoStack.length) {
      setRedoStack([content, ...redoStack]);
      setContent(undoStack[undoStack.length - 1]);
      setUndoStack(undoStack.slice(0, -1));
    }
  };
  const handleRedo = () => {
    if (redoStack.length) {
      setUndoStack([...undoStack, content]);
      setContent(redoStack[0]);
      setRedoStack(redoStack.slice(1));
    }
  };

  // Error demo
  const triggerError = () => setError('Something went wrong!');
  const clearError = () => setError(null);

  return (
    <div className={darkMode ? 'dark' : ''} style={{ transition: 'background 0.3s' }}>
      <CardAnalyticsProvider onEvent={handleAnalytics}>
        <CardComplianceProvider onEvent={handleCompliance}>
          <main style={{ fontFamily: 'var(--font-sans)', background: 'var(--color-background)', minHeight: '100vh', padding: 32 }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
              <h1 style={{ fontSize: 36, fontWeight: 800, flex: 1 }}>Coinet Card System Demo</h1>
              <button onClick={() => setDarkMode(d => !d)} aria-label="Toggle dark mode" style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 700, background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>{darkMode ? 'Light Mode' : 'Dark Mode'}</button>
              <select value={motion} onChange={e => setMotion(e.target.value as 'auto' | 'reduce')} aria-label="Motion preference" style={{ borderRadius: 8, padding: 8 }}>
                <option value="auto">Motion: Auto</option>
                <option value="reduce">Motion: Reduce</option>
              </select>
            </header>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Frosted Card */}
                <ErrorBoundary>
                  <Card
                    header={<Card.Header>Frosted Variant</Card.Header>}
                    footer={<Card.Footer>Footer</Card.Footer>}
                    actions={<Card.Actions><button>Action</button></Card.Actions>}
                    status={<Card.Status>Live</Card.Status>}
                    badge={<Card.Badge>New</Card.Badge>}
                    glass
                    variant="frosted"
                    className="co-card-frosted"
                    style={{ width: 320 }}
                  >
                    <Card.Content>Frosted glassmorphism, gradients, and micro-interactions.</Card.Content>
                  </Card>
                </ErrorBoundary>
                {/* Neon Card */}
                <ErrorBoundary>
                  <Card
                    header={<Card.Header>Neon Variant</Card.Header>}
                    badge={<Card.Badge>🔥</Card.Badge>}
                    gradient
                    variant="neon"
                    className="co-card-neon"
                    style={{ width: 320 }}
                  >
                    <Card.Content>Vibrant gradients, glowing borders, animated shadows.</Card.Content>
                  </Card>
                </ErrorBoundary>
                {/* Minimal Card */}
                <ErrorBoundary>
                  <Card
                    header={<Card.Header>Minimal Variant</Card.Header>}
                    outlined
                    variant="minimal"
                    className="co-card-minimal"
                    style={{ width: 320 }}
                  >
                    <Card.Content>Ultra-clean, low-contrast, subtle borders and shadows.</Card.Content>
                  </Card>
                </ErrorBoundary>
                {/* Card with missing props (edge case) */}
                <ErrorBoundary>
                  <Card><Card.Content>{''}</Card.Content></Card>
                </ErrorBoundary>
                {/* Card that throws error (edge case) */}
                <ErrorBoundary>
                  <Card header={<Card.Header>Throws Error</Card.Header>}>
                    <ThrowErrorCard />
                  </Card>
                </ErrorBoundary>
                {/* Card with async error (edge case) */}
                <ErrorBoundary>
                  <Card header={<Card.Header>Async Error</Card.Header>}>
                    <AsyncErrorCard />
                  </Card>
                </ErrorBoundary>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* All Features Card */}
                <Card.Resizable>
                  <Card.ContextMenu
                    items={[
                      { label: 'Edit', onClick: () => handleEdit('Edited!') },
                      { label: 'Delete', danger: true, onClick: triggerError },
                    ]}
                  >
                    <ErrorBoundary>
                      <Card
                        header={<Card.Header>All Features</Card.Header>}
                        footer={<Card.Footer>Resizable, draggable, context menu, export/share, undo/redo, analytics, compliance, error state.</Card.Footer>}
                        actions={<Card.Actions><button onClick={() => setSelected(!selected)}>{selected ? 'Deselect' : 'Select'}</button></Card.Actions>}
                        status={<Card.Status>Active</Card.Status>}
                        badge={<Card.Badge>Pro</Card.Badge>}
                        glass
                        gradient
                        outlined
                        shadow
                        compact
                        elevated
                        confetti
                        clickable
                        selectable
                        selected={selected}
                        variant={variant}
                        className={`co-card-${variant}`}
                        style={{ width: 400, minHeight: 220 }}
                      >
                        <Card.DragHandle />
                        <Card.Content>
                          <input
                            aria-label="Editable content"
                            value={content}
                            onChange={e => handleEdit(e.target.value)}
                            style={{ width: '100%', fontSize: 18, padding: 8, borderRadius: 8, border: '1px solid var(--color-border)' }}
                          />
                          {error && (
                            <div style={{ color: 'var(--color-accent-red)', marginTop: 8 }}>
                              {error} <button onClick={clearError} aria-label="Clear error">Clear</button>
                            </div>
                          )}
                        </Card.Content>
                        <CardExportShare cardId="all-features" data={demoData} exportOptions={['csv', 'pdf', 'image']} shareOptions={{ title: 'Share Card', url: window.location.href }} />
                        <CardUndoRedo cardId="all-features" onUndo={handleUndo} onRedo={handleRedo} canUndo={!!undoStack.length} canRedo={!!redoStack.length} />
                      </Card>
                    </ErrorBoundary>
                  </Card.ContextMenu>
                </Card.Resizable>
                {/* Event Log */}
                <CardEventLog events={events} onClear={handleClearEvents} />
              </div>
            </div>
            {/* Accessibility and edge case demos */}
            <section style={{ marginTop: 48 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700 }}>Accessibility & Edge Cases</h2>
              <ErrorBoundary>
                <Card header={<Card.Header>ARIA & Focus</Card.Header>} tabIndex={0} style={{ width: 320 }}>
                  <Card.Content>
                    <button autoFocus style={{ width: '100%', padding: 12, borderRadius: 8 }}>Focusable Button</button>
                  </Card.Content>
                </Card>
              </ErrorBoundary>
              <ErrorBoundary>
                <Card header={<Card.Header>Error State</Card.Header>} style={{ width: 320, marginTop: 16 }}>
                  <Card.Content>
                    <span style={{ color: 'var(--color-accent-red)' }}>This is an error state example.</span>
                  </Card.Content>
                </Card>
              </ErrorBoundary>
            </section>
          </main>
        </CardComplianceProvider>
      </CardAnalyticsProvider>
    </div>
  );
};

// Atomic error-throwing demo components
function ThrowErrorCard(): React.ReactElement | null {
  React.useEffect(() => { throw new Error('This is a thrown error for demo purposes.'); }, []);
  return null;
}
function AsyncErrorCard() {
  const [err, setErr] = React.useState(false);
  React.useEffect(() => { setTimeout(() => setErr(true), 800); }, []);
  if (err) throw new Error('Async error after mount!');
  return <div>Async error will occur in 800ms...</div>;
}

export default CardDemoPage; 