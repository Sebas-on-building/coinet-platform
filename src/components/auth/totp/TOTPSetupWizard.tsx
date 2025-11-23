import React, { useState } from 'react';
import QRCodeDisplay from './QRCodeDisplay';
import SecretDisplay from './SecretDisplay';
import TOTPInput from './TOTPInput';
import BackupCodesDisplay from './BackupCodesDisplay';
import AnimatedStep from './AnimatedStep';
import MicroInteractionButton from './MicroInteractionButton';
import AccessibilityAnnouncer from './AccessibilityAnnouncer';
import AuditTrailBanner from './AuditTrailBanner';
import { post } from '@/utils/api';
import Confetti from 'react-confetti';
import { useDeviceFingerprint } from '@/utils/deviceFingerprint';
import { logEvent } from '@/utils/analytics';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import ComplianceExportButton from '../otp/ComplianceExportButton';
import { useTranslation } from 'react-i18next';

// DeviceList atomic component
const DeviceList: React.FC<{ devices: any[]; onRevoke: (id: string) => void }> = ({ devices, onRevoke }) => (
  <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-4 shadow border w-full max-w-md mx-auto">
    <h4 className="font-semibold mb-2">Active Devices</h4>
    <ul>
      {devices.map(d => (
        <li key={d.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
          <span>{d.name} <span className="text-xs text-slate-500">({d.location})</span></span>
          <span className="text-xs text-slate-400">{d.lastUsed}</span>
          <button onClick={() => onRevoke(d.id)} className="text-red-500 hover:underline">Revoke</button>
        </li>
      ))}
    </ul>
  </div>
);

// Step 0: Intro
const TOTPIntroStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="flex flex-col items-center gap-6 text-center">
    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">Secure Your Account with 2FA</h2>
    <p className="text-slate-600 dark:text-slate-300 max-w-md">Protect your Coinet account with industry-leading security. Two-Factor Authentication (2FA) adds an extra layer of protection using your mobile device. Inspired by Apple, Canva, TradingView, and Solana for a seamless, beautiful, and secure experience.</p>
    {/* TODO: Add animated SVG/3D illustration, micro-interaction */}
    <MicroInteractionButton onClick={onNext} className="mt-4">Get Started</MicroInteractionButton>
  </div>
);

// Step 1: QR/Secret
const TOTPQRStep: React.FC<{ qr: string; secret: string; onNext: () => void; loading: boolean; error?: string }> = ({ qr, secret, onNext, loading, error }) => (
  <div className="flex flex-col items-center gap-6">
    <h3 className="text-xl font-semibold mb-2">Scan the QR Code</h3>
    {error && <span className="text-red-500">{error}</span>}
    <QRCodeDisplay qr={qr} alt="TOTP QR code" />
    <p className="text-slate-600 dark:text-slate-300">Scan this code with your authenticator app (Google Authenticator, 1Password, etc.).</p>
    <SecretDisplay secret={secret} label="Secret Key" />
    <MicroInteractionButton onClick={onNext} className="mt-4" loading={loading}>Next</MicroInteractionButton>
  </div>
);

// Step 2: TOTP Input (polished with undo/redo)
const TOTPVerifyStep: React.FC<{ value: string; onChange: (v: string) => void; onVerify: () => void; error?: string; loading?: boolean; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; }> = ({ value, onChange, onVerify, error, loading, undo, redo, canUndo, canRedo }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-6" aria-live="polite">
      <h3 className="text-xl font-semibold mb-2">{t('2fa.enter_code', 'Enter the 6-digit Code')}</h3>
      <TOTPInput value={value} onChange={onChange} error={error} disabled={loading} />
      <div className="flex gap-2">
        <button onClick={undo} disabled={!canUndo} aria-label={t('2fa.undo', 'Undo')} className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-800 transition disabled:opacity-40">⎌</button>
        <button onClick={redo} disabled={!canRedo} aria-label={t('2fa.redo', 'Redo')} className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-800 transition disabled:opacity-40">↻</button>
      </div>
      <MicroInteractionButton onClick={onVerify} loading={loading} className="mt-4">{t('2fa.verify', 'Verify')}</MicroInteractionButton>
    </div>
  );
};

// Step 3: Backup Codes (polished)
const TOTPBackupCodesStep: React.FC<{ codes: string[]; onNext: () => void }> = ({ codes, onNext }) => {
  const { t } = useTranslation();
  const handleCopy = () => {
    navigator.clipboard.writeText(codes.join('\n'));
  };
  const handlePrint = () => {
    const win = window.open('', '', 'width=600,height=600');
    win?.document.write('<pre>' + codes.join('\n') + '</pre>');
    win?.print();
    win?.close();
  };
  return (
    <div className="flex flex-col items-center gap-6" aria-live="polite">
      <h3 className="text-xl font-semibold mb-2">{t('2fa.backup_codes_title', 'Save Your Backup Codes')}</h3>
      <p className="text-slate-600 dark:text-slate-300">{t('2fa.backup_codes_desc', 'Store these codes in a safe place. Each can be used once if you lose access to your authenticator app.')}</p>
      <BackupCodesDisplay codes={codes} />
      <div className="flex gap-2">
        <button onClick={handleCopy} className="px-3 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition">{t('2fa.copy_codes', 'Copy')}</button>
        <button onClick={handlePrint} className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition">{t('2fa.print_codes', 'Print')}</button>
        <ComplianceExportButton logs={codes} i18n={{ export: t('2fa.export'), tooltip: t('2fa.export_tooltip'), success: t('2fa.export_success'), error: t('2fa.export_error'), csv: t('2fa.export_csv'), pdf: t('2fa.export_pdf') }} />
      </div>
      <MicroInteractionButton onClick={onNext} className="mt-4">{t('2fa.finish', 'Finish')}</MicroInteractionButton>
    </div>
  );
};

// Step 4: Success
const TOTPSuccessStep: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex flex-col items-center gap-6">
    <Confetti width={typeof window !== 'undefined' ? window.innerWidth : 800} height={typeof window !== 'undefined' ? window.innerHeight : 600} numberOfPieces={200} recycle={false} />
    <h3 className="text-xl font-semibold mb-2">2FA Enabled! 🎉</h3>
    <p className="text-slate-600 dark:text-slate-300">Your account is now protected with Two-Factor Authentication. You can manage your devices and backup codes in your account settings.</p>
    <MicroInteractionButton onClick={onClose} className="mt-4">Next: Manage Devices</MicroInteractionButton>
  </div>
);

// Step 5: Device Management
const TOTPDeviceStep: React.FC<{ devices: any[]; onRevoke: (id: string) => void; onNext: () => void }> = ({ devices, onRevoke, onNext }) => (
  <div className="flex flex-col items-center gap-6">
    <h3 className="text-xl font-semibold mb-2">Manage Devices</h3>
    <DeviceList devices={devices} onRevoke={onRevoke} />
    <MicroInteractionButton onClick={onNext} className="mt-4">Continue</MicroInteractionButton>
  </div>
);

// Step 6: Audit Trail (optional, extensible)
const TOTPSetupAuditStep: React.FC<{ events: any[]; onClose: () => void }> = ({ events, onClose }) => (
  <div className="flex flex-col items-center gap-6">
    <h3 className="text-xl font-semibold mb-2">Setup Audit Trail</h3>
    <AuditTrailBanner events={events} />
    <MicroInteractionButton onClick={onClose} className="mt-4">Done</MicroInteractionButton>
  </div>
);

const STEPS = ['intro', 'qr', 'verify', 'backup', 'success', 'devices', 'audit'] as const;
type Step = typeof STEPS[number];

export const TOTPSetupWizard: React.FC = () => {
  const [step, setStep] = useState<Step>('intro');
  const [activeIndex, setActiveIndex] = useState(0);
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [totp, setTotp] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [announce, setAnnounce] = useState('');
  const [devices, setDevices] = useState<any[]>([{ id: '1', name: 'MacBook Pro', lastUsed: 'Just now', location: 'Berlin' }]);
  // TODO: Replace with real userId from session/auth context
  const userId = 'demo-user';
  const deviceFingerprint = useDeviceFingerprint();
  const { value: totpValue, set: setTotpValue, undo, redo, canUndo, canRedo } = useUndoRedo(totp);
  const { t } = useTranslation();

  // Real API integration
  const fetchSetup = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const { qr, secret } = await post<{ qr: string; secret: string }>('/api/auth/2fa/setup', {}, { 'x-user-id': userId });
      setQr(qr);
      setSecret(secret);
      setAuditEvents((ev) => [...ev, { event: '2FA Setup Started', timestamp: new Date().toISOString() }]);
      setStep('qr');
      setActiveIndex(1);
      setAnnounce('QR code and secret generated.');
      logEvent('2FA Setup', { userId });
    } catch (err: any) {
      setError(err.message);
      setAnnounce('Failed to generate QR code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyTotp = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const { backupCodes } = await post<{ backupCodes: string[] }>('/api/auth/2fa/verify', { code: totpValue }, { 'x-user-id': userId });
      setBackupCodes(backupCodes);
      setAuditEvents((ev) => [...ev, { event: '2FA Verified', timestamp: new Date().toISOString() }]);
      setStep('backup');
      setActiveIndex(3);
      setAnnounce('TOTP verified. Backup codes generated.');
      logEvent('2FA Verified', { userId });
    } catch (err: any) {
      setError(err.message);
      setAuditEvents((ev) => [...ev, { event: '2FA Verification Failed', timestamp: new Date().toISOString(), detail: err.message }]);
      setAnnounce('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Device management (stub)
  const handleRevokeDevice = (id: string) => {
    setDevices(devices => devices.filter(d => d.id !== id));
    setAuditEvents(ev => [...ev, { event: 'Device Revoked', timestamp: new Date().toISOString(), detail: id }]);
    setAnnounce('Device revoked.');
  };

  // Step navigation handlers
  const handleNext = () => {
    if (step === 'intro') {
      fetchSetup();
    } else if (step === 'qr') {
      setStep('verify');
      setActiveIndex(2);
      setAnnounce('Enter the 6-digit code from your app.');
    } else if (step === 'backup') {
      setStep('success');
      setActiveIndex(4);
      setAnnounce('2FA enabled!');
    } else if (step === 'success') {
      setStep('devices');
      setActiveIndex(5);
      setAnnounce('Manage your devices.');
    } else if (step === 'devices') {
      setStep('audit');
      setActiveIndex(6);
      setAnnounce('Audit trail displayed.');
    }
  };
  const handleClose = () => {
    // TODO: Integrate with modal/parent close
    setStep('intro');
    setActiveIndex(0);
    setAnnounce('Wizard closed.');
  };

  return (
    <div className="w-full max-w-lg mx-auto p-8 rounded-3xl bg-gradient-to-br from-white/90 to-slate-100/70 dark:from-slate-900/90 dark:to-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-2xl backdrop-blur-2xl flex flex-col gap-8 relative">
      <AccessibilityAnnouncer message={announce} />
      <AnimatedStep index={0} activeIndex={activeIndex}>
        <TOTPIntroStep onNext={handleNext} />
      </AnimatedStep>
      <AnimatedStep index={1} activeIndex={activeIndex}>
        <TOTPQRStep qr={qr} secret={secret} onNext={handleNext} loading={loading} error={error} />
      </AnimatedStep>
      <AnimatedStep index={2} activeIndex={activeIndex}>
        <TOTPVerifyStep value={totpValue} onChange={setTotpValue} onVerify={verifyTotp} error={error} loading={loading} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />
      </AnimatedStep>
      <AnimatedStep index={3} activeIndex={activeIndex}>
        <TOTPBackupCodesStep codes={backupCodes} onNext={handleNext} />
      </AnimatedStep>
      <AnimatedStep index={4} activeIndex={activeIndex}>
        <TOTPSuccessStep onClose={handleNext} />
      </AnimatedStep>
      <AnimatedStep index={5} activeIndex={activeIndex}>
        <TOTPDeviceStep devices={devices} onRevoke={handleRevokeDevice} onNext={handleNext} />
      </AnimatedStep>
      <AnimatedStep index={6} activeIndex={activeIndex}>
        <TOTPSetupAuditStep events={auditEvents} onClose={handleClose} />
      </AnimatedStep>
      {/* TODO: Add WebAuthn, device fingerprinting, analytics, extensibility hooks, i18n, accessibility improvements, and more. */}
    </div>
  );
};

export default TOTPSetupWizard; 