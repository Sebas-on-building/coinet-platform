import React, { useState, useEffect } from 'react';
import { t } from '../../utils/i18n';
// @ts-ignore
import FingerprintJS from '@fingerprintjs/fingerprintjs';

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

// Atomic analytics util
const fireAnalytics = (event: string, data?: any) => {
  // TODO: Integrate with real analytics (e.g., Segment, Amplitude, custom)
  window?.dataLayer?.push({ event, ...data });
  // console.log('Analytics:', event, data);
};

// Atomic export util
const exportCSV = (rows: any[], filename: string) => {
  const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// VPN/proxy check util
const checkVPN = async (ip: string) => {
  // Example: use ipapi.co or ipqualityscore.com
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();
    return data.security?.vpn || data.security?.proxy || false;
  } catch {
    return false;
  }
};

export const ReferralClaimForm: React.FC = () => {
  const [code, setCode] = useState('');
  const [codeValid, setCodeValid] = useState(false);
  const [codeInfo, setCodeInfo] = useState<any>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'fraud'>('idle');
  const [message, setMessage] = useState('');
  const [reward, setReward] = useState<number | null>(null);
  const [claims, setClaims] = useState<any[]>([]); // For export
  const [vpnWarning, setVpnWarning] = useState(false);

  // Auto-detect code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('ref') || '';
    if (urlCode) setCode(urlCode);
    fireAnalytics('referral_view', { code: urlCode });
  }, []);

  // Get device fingerprint
  useEffect(() => {
    FingerprintJS.load().then(fp => fp.get().then(result => setFingerprint(result.visitorId)));
  }, []);

  // Validate code
  useEffect(() => {
    if (code.length < 6) {
      setCodeValid(false);
      setCodeInfo(null);
      return;
    }
    setStatus('loading');
    fetch(`/api/referral/${code}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setCodeValid(false);
          setCodeInfo(null);
          setStatus('error');
          setMessage(t(data.error));
          fireAnalytics('referral_code_error', { code, error: data.error });
        } else {
          setCodeValid(true);
          setCodeInfo(data);
          setStatus('idle');
          fireAnalytics('referral_code_valid', { code });
        }
      });
  }, [code]);

  // VPN/proxy fraud check
  useEffect(() => {
    if (status === 'idle') {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(async ({ ip }) => {
          if (await checkVPN(ip)) setVpnWarning(true);
        });
    }
  }, [status]);

  const handleClaim = async () => {
    setStatus('loading');
    setMessage('');
    fireAnalytics('referral_claim_attempt', { code, fingerprint });
    try {
      const res = await fetch('/api/referral/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId: 'me', deviceFingerprint: fingerprint }), // TODO: Replace 'me' with real userId
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setReward(data.reward);
        setMessage(t('referral.success', { reward: data.reward }));
        setClaims((prev) => [...prev, { code, reward: data.reward, date: new Date().toISOString() }]);
        fireAnalytics('referral_claim_success', { code, reward: data.reward });
      } else if (data.error === 'error.fraud_detected') {
        setStatus('fraud');
        setMessage(t('referral.fraud'));
        fireAnalytics('referral_claim_fraud', { code });
      } else {
        setStatus('error');
        setMessage(t(data.error));
        fireAnalytics('referral_claim_error', { code, error: data.error });
      }
    } catch (err) {
      setStatus('error');
      setMessage(t('error.server_error'));
      fireAnalytics('referral_claim_error', { code, error: 'server_error' });
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white/80 dark:bg-neutral-900/80 rounded-2xl shadow-xl backdrop-blur-md space-y-6 transition-colors duration-300">
      <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-white">
        {t('referral.title')}
      </h2>
      <div>
        <label htmlFor="referral-code" className="block font-medium mb-1 text-gray-700 dark:text-gray-200">
          {t('referral.code_label')}
        </label>
        <input
          id="referral-code"
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="w-full px-4 py-2 rounded border focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white transition-colors duration-300"
          aria-invalid={!codeValid}
        />
        {codeInfo && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 animate-fade-in">
            {t('referral.code_valid', { uses: codeInfo.uses, max: codeInfo.maxUses || '∞' })}
          </div>
        )}
        {vpnWarning && (
          <div className="mt-2 text-xs text-yellow-600 animate-fade-in">
            {t('referral.vpn_warning')}
          </div>
        )}
      </div>
      <button
        type="button"
        className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-500 text-white font-bold text-lg shadow-md hover:scale-105 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-300"
        onClick={handleClaim}
        disabled={!codeValid || status === 'loading'}
        aria-busy={status === 'loading'}
      >
        {status === 'loading' ? t('referral.claiming') : t('referral.claim')}
      </button>
      {message && (
        <div className={`text-center text-lg font-semibold mt-4 animate-fade-in ${status === 'success' ? 'text-green-600' : status === 'fraud' ? 'text-yellow-600' : 'text-red-500'}`}>{message}</div>
      )}
      {status === 'success' && reward && (
        <div className="flex flex-col items-center mt-4 animate-fade-in">
          <span className="text-4xl">🎉</span>
          <span className="text-lg font-bold text-green-600">{t('referral.rewarded', { reward })}</span>
        </div>
      )}
      {claims.length > 0 && (
        <button
          type="button"
          className="mt-4 w-full py-2 rounded-lg bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold shadow hover:from-green-500 hover:to-blue-600 transition-colors"
          onClick={() => exportCSV(claims, 'referral-claims.csv')}
        >
          {t('referral.export')}
        </button>
      )}
      {/* TODO: Add more analytics, sharing, export, more features */}
    </div>
  );
}; 