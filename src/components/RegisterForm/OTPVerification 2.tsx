import React, { useState, useRef, useEffect } from "react";
import OTPInput from "./OTPInput";
import { t } from '../../utils/i18n';
import { useOTPCooldown } from '../../hooks/useOTPCooldown';
import { logEvent } from '../../utils/analytics';
import { getDeviceFingerprint, useDeviceFingerprint } from '../../utils/deviceFingerprint';
import ResendOTPButton from '../auth/otp/ResendOTPButton';
import ComplianceExportButton from '../auth/otp/ComplianceExportButton';

// ExpiryTimer subcomponent
const ExpiryTimer: React.FC<{ seconds: number; onExpire: () => void }> = ({
  seconds,
  onExpire,
}) => {
  const [time, setTime] = useState(seconds);
  useEffect(() => {
    if (time > 0) {
      const interval = setInterval(() => setTime((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      onExpire();
    }
  }, [time, onExpire]);
  const percent = (time / seconds) * 100;
  const color =
    time < 10
      ? "stroke-red-500"
      : time < 30
        ? "stroke-yellow-400"
        : "stroke-blue-500";
  return (
    <div className="flex items-center gap-2 mt-2">
      <svg width="32" height="32" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          strokeWidth="4"
          className={color}
          strokeDasharray={100}
          strokeDashoffset={100 - percent}
          strokeLinecap="round"
        />
      </svg>
      <span className={`text-sm ${time < 10 ? "text-red-500 font-bold" : ""}`}>
        {time}s
      </span>
    </div>
  );
};

// Confetti subcomponent (simple SVG burst)
const Confetti: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none animate-fade-in"
    viewBox="0 0 200 100"
  >
    {[...Array(20)].map((_, i) => (
      <circle
        key={i}
        cx={10 + Math.random() * 180}
        cy={20 + Math.random() * 60}
        r={2 + Math.random() * 3}
        fill={`hsl(${Math.random() * 360},90%,60%)`}
      />
    ))}
  </svg>
);

interface OTPVerificationProps {
  email: string;
}

const OTP_LENGTH = 6;
const OTP_EXPIRY = 600; // 10 min in seconds
const RESEND_COOLDOWN = 30; // seconds

const OTPVerification: React.FC<OTPVerificationProps> = ({ email }) => {
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(OTP_EXPIRY);
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { cooldown, isCooldown, startCooldown, resetCooldown } = useOTPCooldown(RESEND_COOLDOWN);
  const deviceFingerprint = useDeviceFingerprint();
  const [logs, setLogs] = useState<any[]>([]); // For compliance export

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Handle OTP submit
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("verifying");
    setError(null);
    const fingerprint = deviceFingerprint || (await getDeviceFingerprint());
    logEvent('otp_verify_attempt', { email, fingerprint });
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, deviceFingerprint: fingerprint }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Verification failed");
      setStatus("success");
      setShowConfetti(true);
      logEvent('otp_verify_success', { email, fingerprint });
      setLogs(l => [...l, { type: 'verify', email, fingerprint, otp, time: new Date().toISOString(), result: 'success' }]);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      setStatus("error");
      setError(err.message);
      logEvent('otp_verify_error', { email, error: err.message });
      setLogs(l => [...l, { type: 'verify', email, fingerprint, otp, time: new Date().toISOString(), result: 'error', error: err.message }]);
    }
  };

  // Handle resend OTP using atomic ResendOTPButton
  const handleResend = async (fingerprint: string) => {
    setTimer(OTP_EXPIRY);
    setOtp("");
    setError(null);
    logEvent('otp_resend_attempt', { email, fingerprint });
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, deviceFingerprint: fingerprint }),
    });
    const result = await res.json();
    if (!res.ok) {
      logEvent('otp_resend_error', { email, error: result.error });
      setLogs(l => [...l, { type: 'resend', email, fingerprint, time: new Date().toISOString(), result: 'error', error: result.error }]);
      throw new Error(result.error || 'Failed to resend OTP.');
    }
    logEvent('otp_resend_success', { email, fingerprint });
    setLogs(l => [...l, { type: 'resend', email, fingerprint, time: new Date().toISOString(), result: 'success' }]);
  };

  return (
    <div className="space-y-4 relative bg-gradient-to-br from-white/90 to-blue-50/80 dark:from-slate-900/90 dark:to-blue-950/80 rounded-2xl shadow-xl p-8 max-w-md mx-auto border border-slate-200 dark:border-slate-800">
      {showConfetti && <Confetti />}
      <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white tracking-tight mb-2" style={{ letterSpacing: '0.01em' }}>{t('otp.title')}</h3>
      <p className="text-center text-gray-500 dark:text-gray-300 mb-4">
        {t('otp.sent', { email })}
      </p>
      <form
        onSubmit={handleVerify}
        className="space-y-2"
        aria-label={t('otp.form_aria')}
      >
        <OTPInput
          value={otp}
          onChange={setOtp}
          error={status === "error" ? !!error : undefined}
          disabled={status === "success" || timer === 0}
          success={status === "success"}
        />
        <ExpiryTimer seconds={timer} onExpire={() => setTimer(0)} />
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1 gap-2">
          <ResendOTPButton
            onResend={handleResend}
            cooldownSeconds={RESEND_COOLDOWN}
            i18n={{
              resend: t('otp.resend'),
              cooldown: (s) => t('otp.resend_in', { seconds: s }),
              tooltip: t('otp.resend_tooltip', { seconds: cooldown }),
            }}
            className="mr-2"
          />
          <ComplianceExportButton
            logs={logs}
            i18n={{
              export: t('otp.export'),
              tooltip: t('otp.export_tooltip'),
              success: t('otp.export_success'),
              error: t('otp.export_error'),
              csv: t('otp.export_csv'),
              pdf: t('otp.export_pdf'),
            }}
          />
        </div>
        {status === "error" && error && (
          <div className="text-red-500 text-center animate-shake" role="alert">{error}</div>
        )}
        <button
          type="submit"
          className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-500 text-white font-bold text-lg shadow-md hover:scale-105 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-300"
          disabled={
            otp.length !== OTP_LENGTH || status === "verifying" || timer === 0
          }
          aria-busy={status === "verifying"}
        >
          {status === "verifying" ? t('otp.verifying') : t('otp.verify')}
        </button>
        {status === "success" && (
          <div className="text-green-600 text-center font-semibold mt-2 animate-fade-in" role="status">
            {t('otp.verified')}
          </div>
        )}
      </form>
    </div>
  );
};

export default OTPVerification;
