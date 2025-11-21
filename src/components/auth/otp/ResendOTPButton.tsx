import React from 'react';
import { useOTPCooldown } from '../../../hooks/useOTPCooldown';
import { logEvent } from '../../../utils/analytics';
import { getDeviceFingerprint } from '../../../utils/deviceFingerprint';

interface ResendOTPButtonProps {
  onResend: (deviceFingerprint: string) => Promise<void>;
  cooldownSeconds?: number;
  className?: string;
  i18n?: {
    resend: string;
    cooldown: (s: number) => string;
    tooltip: string;
  };
}

export const ResendOTPButton: React.FC<ResendOTPButtonProps> = ({
  onResend,
  cooldownSeconds = 60,
  className = '',
  i18n = {
    resend: 'Resend Code',
    cooldown: (s: number) => `Resend in ${s}s`,
    tooltip: 'Request a new OTP code',
  },
}) => {
  const { cooldown, isCooldown, startCooldown } = useOTPCooldown(cooldownSeconds);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      await onResend(fingerprint);
      logEvent('otp_resend', { fingerprint });
      startCooldown();
    } catch (e: any) {
      setError(e.message || 'Failed to resend');
      logEvent('otp_resend_error', { error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <button
        type="button"
        onClick={handleResend}
        disabled={isCooldown || loading}
        aria-disabled={isCooldown || loading}
        aria-busy={loading}
        aria-label={i18n.resend}
        title={i18n.tooltip}
        className={`px-6 py-2 rounded-xl font-semibold shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gradient-to-br from-white/80 to-blue-100/60 dark:from-slate-900/80 dark:to-blue-900/60 border border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${isCooldown || loading ? '' : 'hover:shadow-xl'} ${error ? 'border-red-500' : ''}`}
        tabIndex={0}
      >
        {loading ? (
          <span className="animate-spin mr-2">⏳</span>
        ) : isCooldown ? (
          <span>{i18n.cooldown(cooldown)}</span>
        ) : (
          <span>{i18n.resend}</span>
        )}
      </button>
      {error && <span className="mt-2 text-red-500 text-xs" role="alert">{error}</span>}
    </div>
  );
};

export default ResendOTPButton; 