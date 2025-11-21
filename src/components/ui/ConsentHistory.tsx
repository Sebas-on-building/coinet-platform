import React, { useEffect, useState, useRef } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { Tooltip } from "./tooltip";
import { Modal } from "./Modal";
import { LoadingSpinner } from "./LoadingSpinner";
import { CheckmarkSuccess } from "./CheckmarkSuccess";
import { ShakeOnError } from "./ShakeOnError";
import { ConfettiBurst } from "./ConfettiBurst";
import { motion } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { providerMeta } from "./providerMeta";
import { ConsentAI } from "./ConsentAI";

interface Consent {
  id: string;
  provider: string;
  scopes: string;
  scopesJson: string[];
  perScopeStatus?: Record<string, string>;
  consentedAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

interface AuditLog {
  id: string;
  event: string;
  provider?: string;
  scopes?: string;
  timestamp: string;
  details?: string;
}

/**
 * Simple i18n messages object and t() function
 */
const messages: Record<string, { [key: string]: string }> = {
  en: {
    consentTitle: "Your Consents",
    auditLog: "Audit Log",
    revoke: "Revoke",
    undo: "Undo",
    revoked: "Revoked",
    expiring: "Expiring",
    consented: "Consented",
    scopeRevoked: "Scope revoked.",
    undoSuccess: "Scope restored.",
    downloadCSV: "Download CSV",
    downloadJSON: "Download JSON",
    expiryBanner: "Some of your consents are expiring soon.",
    review: "Review",
    noConsents: "No consents found.",
    noAuditLogs: "No audit logs found.",
    close: "Close",
  },
};
const t = (key: string): string => messages["en"][key] || key;

/**
 * Analytics event logger (replace with Segment/Amplitude as needed)
 */
function logEvent(event: string, data: Record<string, any>) {
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[Analytics]", event, data);
  }
}

const ConsentHistory: React.FC = () => {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shake, setShake] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    consentId: string;
    scope: string;
  } | null>(null);
  const snackbarTimeout = useRef<NodeJS.Timeout | null>(null);
  const [revoking, setRevoking] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [consentRes, auditRes] = await Promise.all([
          fetch("/api/user/consents"),
          fetch("/api/user/audit-logs"),
        ]);
        if (!consentRes.ok || !auditRes.ok)
          throw new Error("Failed to fetch data");
        const consents = await consentRes.json();
        const auditLogs = await auditRes.json();
        setConsents(consents);
        setAuditLogs(auditLogs);
      } catch (e: any) {
        setError(e.message);
        setShake(true);
        setTimeout(() => setShake(false), 600);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleRevoke = async (consentId: string) => {
    try {
      setError(null);
      const res = await fetch("/api/user/consents?action=revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentId }),
      });
      if (!res.ok) throw new Error("Failed to revoke consent");
      const updated = await res.json();
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId ? { ...c, revokedAt: updated.revokedAt } : c,
        ),
      );
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } catch (e: any) {
      setError(e.message);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleRevokeScope = async (consentId: string, scope: string) => {
    setRevoking((prev) => ({ ...prev, [consentId]: scope }));
    try {
      setError(null);
      const res = await fetch("/api/user/consents?action=revoke-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentId, scope }),
      });
      if (!res.ok) throw new Error("Failed to revoke scope");
      const updated = await res.json();
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId
            ? {
                ...c,
                perScopeStatus: updated.perScopeStatus,
                revokedAt: updated.revokedAt,
              }
            : c,
        ),
      );
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      setSnackbar({ consentId, scope });
      if (snackbarTimeout.current) clearTimeout(snackbarTimeout.current);
      snackbarTimeout.current = setTimeout(() => setSnackbar(null), 5000);
      logEvent("consent_scope_revoked", { consentId, scope });
    } catch (e: any) {
      setError(e.message);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setRevoking((prev) => ({ ...prev, [consentId]: null }));
    }
  };

  const handleUndo = async () => {
    if (!snackbar) return;
    try {
      const { consentId, scope } = snackbar;
      const res = await fetch("/api/user/consents?action=restore-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentId, scope }),
      });
      if (!res.ok) throw new Error("Failed to restore scope");
      const updated = await res.json();
      setConsents((prev) =>
        prev.map((c) =>
          c.id === consentId
            ? {
                ...c,
                perScopeStatus: updated.perScopeStatus,
                revokedAt: updated.revokedAt,
              }
            : c,
        ),
      );
      setSnackbar(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      logEvent("consent_scope_restored", { consentId, scope });
    } catch (e: any) {
      setError(e.message);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  // Expiry reminder
  const expiring = consents.filter(
    (c) =>
      c.expiresAt &&
      new Date(c.expiresAt).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  // Export
  const handleExport = async (type: "csv" | "json") => {
    try {
      const res = await fetch(`/api/user/consents?action=export&type=${type}`);
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `consent-history.${type}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner />
      </div>
    );
  if (error)
    return (
      <ShakeOnError shake={shake}>
        <div className="text-red-500">{error}</div>
      </ShakeOnError>
    );

  return (
    <div className="space-y-8" aria-label="Consent and Audit History">
      {expiring.length > 0 && (
        <div
          className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-4 mb-4 rounded animate-fade-in"
          role="status"
        >
          {t("expiryBanner")}{" "}
          <button
            className="underline"
            onClick={() =>
              document
                .getElementById(expiring[0].id)
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            {t("review")}
          </button>
        </div>
      )}
      {showConfetti && <ConfettiBurst run={showConfetti} />}
      <div className="flex gap-2 mb-4">
        <Button variant="secondary" onClick={() => handleExport("csv")}>
          {t("downloadCSV")}
        </Button>
        <Button variant="secondary" onClick={() => handleExport("json")}>
          {t("downloadJSON")}
        </Button>
      </div>
      <Card className="p-6" aria-labelledby="consent-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="consent-title" className="text-xl font-semibold">
            {t("consentTitle")}
          </h2>
          <Button
            onClick={handleShowModal}
            aria-haspopup="dialog"
            aria-controls="consent-modal"
          >
            {t("auditLog")}
          </Button>
        </div>
        <div className="space-y-4">
          {consents.length === 0 && (
            <div className="text-gray-500">{t("noConsents")}</div>
          )}
          {consents.map((consent) => (
            <div
              key={consent.id}
              id={consent.id}
              className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between bg-white/80 shadow-sm transition hover:shadow-md"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-800 flex items-center gap-2">
                  {providerMeta[consent.provider]?.logo && (
                    <img
                      src={providerMeta[consent.provider].logo}
                      alt={consent.provider}
                      className="w-6 h-6 rounded-full mr-2 inline-block align-middle"
                    />
                  )}
                  <span
                    className="capitalize"
                    style={{ color: providerMeta[consent.provider]?.color }}
                  >
                    {consent.provider}
                  </span>
                  {consent.revokedAt && (
                    <Tooltip text={t("revoked")}>
                      <span className="text-red-500 ml-2">
                        ({t("revoked")})
                      </span>
                    </Tooltip>
                  )}
                  {consent.expiresAt && (
                    <Tooltip
                      text={`${t("expiring")}: ${new Date(consent.expiresAt).toLocaleString()}`}
                    >
                      <span className="text-yellow-500 ml-2">
                        ({t("expiring")})
                      </span>
                    </Tooltip>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {t("consented")}:{" "}
                  {new Date(consent.consentedAt).toLocaleString()}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {consent.scopesJson?.map((scope) => {
                    const isRevoked =
                      consent.perScopeStatus?.[scope] === "revoked";
                    return (
                      <motion.span
                        key={scope}
                        initial={{ opacity: 1, x: 0 }}
                        animate={{
                          opacity: isRevoked ? 0.3 : 1,
                          x: isRevoked ? 20 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                        className={`relative flex items-center group`}
                      >
                        <Tooltip
                          text={
                            providerMeta[consent.provider]?.scopes?.[scope] ||
                            scope
                          }
                        >
                          <span
                            className={`px-2 py-1 rounded text-xs font-mono bg-gray-100 border ${isRevoked ? "border-gray-300 text-gray-400 line-through" : "border-green-400 text-green-700"} transition-all duration-200`}
                          >
                            {scope}
                          </span>
                        </Tooltip>
                        {!isRevoked && (
                          <button
                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full p-0.5 hover:bg-gray-200 focus:bg-gray-300 focus:outline-none"
                            aria-label={`${t("revoke")} ${scope}`}
                            disabled={revoking[consent.id] === scope}
                            onClick={() => handleRevokeScope(consent.id, scope)}
                            tabIndex={0}
                          >
                            <XMarkIcon className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        )}
                      </motion.span>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center gap-2">
                {consent.revokedAt && <CheckmarkSuccess show={true} />}
              </div>
            </div>
          ))}
        </div>
      </Card>
      {/* Snackbar/Toast for Undo */}
      {snackbar && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 z-50 animate-fade-in"
          role="status"
          aria-live="polite"
          tabIndex={0}
        >
          <span>{t("scopeRevoked")}</span>
          <button
            className="underline font-semibold hover:text-blue-400 focus:outline-none"
            onClick={handleUndo}
            aria-label={t("undo")}
          >
            {t("undo")}
          </button>
        </div>
      )}
      <Modal open={showModal} onClose={handleCloseModal} aria-label="Audit Log">
        <Card className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Audit Log</h2>
            <Button onClick={handleCloseModal} aria-label="Close audit log">
              Close
            </Button>
          </div>
          <div className="overflow-y-auto max-h-96 divide-y divide-gray-200">
            {auditLogs.length === 0 && (
              <div className="text-gray-500">No audit logs found.</div>
            )}
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-800">{log.event}</span>
                  {log.provider && (
                    <span className="text-gray-500">({log.provider})</span>
                  )}
                  <span className="text-gray-400 ml-auto">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  Scopes: {log.scopes}
                </div>
                {log.details && (
                  <div className="mt-1 text-xs text-gray-400">
                    {log.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </Modal>
      {/* AI Privacy Assistant */}
      <ConsentAI consents={consents} />
    </div>
  );
};

/**
 * ConsentHistory component displays user consents, audit logs, and advanced privacy controls.
 * - Per-scope revoke/undo, expiry reminders, export, branding, i18n, analytics, microinteractions, AI assistant.
 */
export default ConsentHistory;
