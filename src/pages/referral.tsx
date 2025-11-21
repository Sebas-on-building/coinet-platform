import React, { useState, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
// import Confetti from 'react-confetti'; // Uncomment if using a confetti library

const ReferralClaim: React.FC = () => {
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState("");
  const [fpLoading, setFpLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real FingerprintJS integration
  React.useEffect(() => {
    setFpLoading(true);
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        setFingerprint(result.visitorId);
        setFpLoading(false);
      })
      .catch(() => {
        setError(
          "Could not generate device fingerprint. Please refresh and try again.",
        );
        setFpLoading(false);
      });
  }, []);

  const handleLookup = async () => {
    setError(null);
    setLookup(null);
    setClaimed(false);
    setSuccess(null);
    if (!code) return setError("Please enter a referral code.");
    try {
      const res = await axios.get(
        `/api/referral/lookup?code=${encodeURIComponent(code)}`,
      );
      setLookup(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Referral code not found.");
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await axios.post("/api/referral/claim", {
        code,
        fingerprint,
      });
      setClaimed(true);
      setSuccess(res.data.message || "Referral claimed!");
      setLookup(null);
      setCode("");
      // Optionally trigger confetti here
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not claim referral.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-background text-text p-4">
      {/* <Confetti run={!!success} /> */}
      <div className="w-full max-w-md p-8 bg-surface dark:bg-surface-dark rounded-2xl shadow-glass flex flex-col items-center gap-8">
        <img
          src="/logo.svg"
          alt="Coinet Logo"
          className="w-16 h-16 mb-2 animate-fade-in"
        />
        <h1 className="text-3xl font-bold text-center text-accent-blue dark:text-accent-blue mb-2">
          Claim your Referral
        </h1>
        <div className="w-full flex flex-col gap-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-700 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 transition-all text-lg bg-white dark:bg-neutral-800"
              placeholder="Enter referral code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              aria-label="Referral code"
              disabled={claiming || fpLoading}
              autoFocus
            />
            <button
              onClick={handleLookup}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold shadow-glass hover:scale-105 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-w-[44px] min-h-[44px]"
              disabled={claiming || !code || fpLoading}
              aria-label="Lookup referral code"
            >
              Lookup
            </button>
          </div>
          {fpLoading && (
            <div className="text-xs text-gray-400 text-center animate-pulse">
              Detecting device...
            </div>
          )}
          <AnimatePresence>
            {lookup && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mt-2 flex flex-col gap-2 border border-blue-200 dark:border-blue-700"
              >
                <div className="font-semibold text-blue-700 dark:text-blue-200">
                  Code: {lookup.code}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-300">
                  Owner:{" "}
                  {lookup.owner?.name || lookup.owner?.email || "Unknown"}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-300">
                  Usage: {lookup.usageCount}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-300">
                  Status:{" "}
                  <span
                    className={
                      lookup.status === "active"
                        ? "text-green-600"
                        : "text-red-500"
                    }
                  >
                    {lookup.status}
                  </span>
                </div>
                <button
                  onClick={handleClaim}
                  className="mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold shadow hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-green-300"
                  disabled={claiming || fpLoading}
                  aria-label="Claim referral"
                >
                  {claiming ? "Claiming..." : "Claim Referral"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full bg-green-50 dark:bg-green-900 rounded-lg p-4 mt-2 text-green-700 dark:text-green-200 text-center font-semibold animate-bounce-in"
              >
                <span role="img" aria-label="confetti">
                  🎉
                </span>{" "}
                {success}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full bg-red-50 dark:bg-red-900 rounded-lg p-4 mt-2 text-red-700 dark:text-red-200 text-center font-semibold animate-shake"
              >
                <span role="img" aria-label="error">
                  ❌
                </span>{" "}
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="text-xs text-gray-400 text-center mt-4">
          By claiming, you agree to our{" "}
          <a href="/terms" className="underline hover:text-blue-600">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-blue-600">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
};

export default ReferralClaim;
