import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

async function fetchAIResponse(prompt: string): Promise<string> {
  const response = await fetch("/api/ai-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }
  const data = await response.json() as { content?: string };
  return data.content || "No response.";
}

export const NeuralAIAssistantPanel: React.FC<{ open?: boolean; context?: string; onClose?: () => void }> = ({ open = true, context, onClose }) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([
    "Increase font size for readability",
    "Simplify this chart into a bar chart",
    "Highlight outliers",
  ]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleAsk = async (prompt: string) => {
    setLoading(true);
    setResponse(null);
    try {
      const aiResponse = await fetchAIResponse(prompt);
      setResponse(aiResponse);
    } catch (e) {
      setResponse("AI error: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            position: "absolute",
            right: 40,
            bottom: 40,
            zIndex: 100,
            background: "var(--color-surface)",
            borderRadius: 20,
            boxShadow: "0 8px 40px 0 rgba(24,25,43,0.18)",
            padding: 28,
            minWidth: 340,
            maxWidth: 420,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
          aria-label="AI Assistant Panel"
        >
          <button
            aria-label="Close AI assistant"
            onClick={onClose}
            style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 20, cursor: "pointer" }}
          >×</button>
          <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", margin: 0 }}>AI Assistant</h3>
          <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>Ask anything about your chart or get smart suggestions.</div>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (input.trim()) handleAsk(input);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. How can I make this chart more readable?"
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                fontSize: 15,
                outline: "none",
                background: "var(--color-background)",
                color: "var(--color-text)",
                marginBottom: 0,
              }}
              aria-label="Ask AI assistant"
              disabled={loading}
            />
            <button type="submit" style={{ background: "var(--color-primary)", color: "var(--color-background)", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "background 0.18s" }} disabled={loading}>
              {loading ? "Thinking..." : "Ask"}
            </button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleAsk(s)} style={{ background: "var(--color-primary)", color: "var(--color-background)", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "background 0.18s" }} disabled={loading}>{s}</button>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: response ? 1 : 0 }}
            transition={{ duration: 0.18 }}
            style={{ background: "var(--color-background)", color: "var(--color-text)", borderRadius: 8, padding: "12px 16px", marginTop: 8, minHeight: 32, fontSize: 15, fontWeight: 500, boxShadow: "0 1px 4px 0 rgba(24,25,43,0.06)", opacity: response ? 1 : 0, pointerEvents: "auto" }}
            aria-live="polite"
          >
            {response}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 