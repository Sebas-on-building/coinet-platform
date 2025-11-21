import React, { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import MicroInteractionButton from '../totp/MicroInteractionButton';
import AnimatedStep from '../totp/AnimatedStep';
import AccessibilityAnnouncer from '../totp/AccessibilityAnnouncer';
import { post } from '@/utils/api';
import Confetti from 'react-confetti';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { logEvent } from '@/utils/analytics';
import ComplianceExportButton from '../otp/ComplianceExportButton';
import { useTranslation } from 'react-i18next';

// Atomic: Device naming input
const DeviceNameStep: React.FC<{ name: string; onChange: (v: string) => void; onNext: () => void; loading: boolean }> = ({ name, onChange, onNext, loading }) => (
  <div className="flex flex-col items-center gap-6 text-center">
    <h3 className="text-xl font-semibold mb-2">Name Your Device</h3>
    <p className="text-slate-600 dark:text-slate-300">Give this device a memorable name (e.g., "MacBook Pro", "iPhone 15 Pro").</p>
    <input
      className="w-64 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80 shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-400 outline-none text-lg text-center"
      value={name}
      onChange={e => onChange(e.target.value)}
      placeholder="Device name"
      aria-label="Device name"
      disabled={loading}
      maxLength={32}
    />
    <MicroInteractionButton onClick={onNext} loading={loading} disabled={!name.trim()} className="mt-4">Continue</MicroInteractionButton>
  </div>
);

// Atomic: Device list management
const DeviceList: React.FC<{ devices: any[]; onRevoke: (id: string) => void }> = ({ devices, onRevoke }) => (
  <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-4 shadow border w-full max-w-md mx-auto">
    <h4 className="font-semibold mb-2">Registered Devices</h4>
    <ul>
      {devices.map(d => (
        <li key={d.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
          <span>{d.name} <span className="text-xs text-slate-500">({d.type})</span></span>
          <span className="text-xs text-slate-400">{d.registeredAt}</span>
          <button onClick={() => onRevoke(d.id)} className="text-red-500 hover:underline">Revoke</button>
        </li>
      ))}
    </ul>
  </div>
);

// Atomic: Audit trail
const AuditTrailBanner: React.FC<{ events: any[] }> = ({ events }) => (
  <div className="w-full max-w-xl mx-auto p-4 rounded-xl bg-gradient-to-br from-white/80 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-lg backdrop-blur-lg transition-all">
    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Audit Trail</h3>
    <ol className="relative border-l-2 border-blue-400 ml-2">
      {events.map((e, i) => (
        <li key={i} className="mb-4 ml-4">
          <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-2.5 border-2 border-white dark:border-slate-900" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-300">{e.event}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(e.timestamp).toLocaleString()}</span>
            {e.detail && <span className="text-xs text-slate-600 dark:text-slate-300">{e.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
  </div>
);

const STEPS = ['intro', 'name', 'register', 'success', 'devices', 'audit'] as const;
type Step = typeof STEPS[number];

export const WebAuthnSetup: React.FC<{ userId: string }> = ({ userId }) => {
  const { t } = useTranslation();
  const deviceFingerprint = getDeviceFingerprint();
  const [step, setStep] = useState<Step>('intro');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [announce, setAnnounce] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [devices, setDevices] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Analytics/extensibility hooks
  const fireAnalytics = (event: string, detail?: any) => {
    logEvent(event, { ...detail, userId, deviceFingerprint });
  };

  // Step 1: Device naming
  const handleNameNext = () => {
    setStep('register');
    setActiveIndex(2);
    setAnnounce('Prompting for biometric registration...');
    fireAnalytics('webauthn.device_named', { deviceName });
    setAuditEvents(ev => [...ev, { event: 'Device named', timestamp: new Date().toISOString(), detail: deviceName }]);
  };

  // Step 2: Registration
  const handleStart = async () => {
    setLoading(true);
    setError(undefined);
    setAnnounce('Preparing WebAuthn registration...');
    fireAnalytics('webauthn.registration.start');
    try {
      const options = await post('/api/auth/webauthn/generate-registration-options', {}, { 'x-user-id': userId });
      const attResp = await startRegistration(options);
      await post('/api/auth/webauthn/verify-registration', attResp, { 'x-user-id': userId });
      setStep('success');
      setActiveIndex(3);
      setAnnounce(t('webauthn.registration_success', 'WebAuthn registration successful!'));
      setShowConfetti(true);
      setDevices(devs => [...devs, { id: Date.now().toString(), name: deviceName, type: 'Passkey', registeredAt: new Date().toLocaleString() }]);
      setAuditEvents(ev => [...ev, { event: t('webauthn.device_registered', 'Device registered'), timestamp: new Date().toISOString(), detail: deviceName }]);
      fireAnalytics('webauthn.registration.success', { deviceName });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setAnnounce('Registration failed.');
      setAuditEvents(ev => [...ev, { event: 'Registration failed', timestamp: new Date().toISOString(), detail: err.message }]);
      fireAnalytics('webauthn.registration.error', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Device management
  const handleRevokeDevice = (id: string) => {
    setDevices(devs => devs.filter(d => d.id !== id));
    setAuditEvents(ev => [...ev, { event: 'Device revoked', timestamp: new Date().toISOString(), detail: id }]);
    setAnnounce('Device revoked.');
    fireAnalytics('webauthn.device_revoked', { id });
  };

  // Step navigation
  const handleNext = () => {
    if (step === 'intro') {
      setStep('name');
      setActiveIndex(1);
      setAnnounce('Name your device.');
    } else if (step === 'name') {
      handleNameNext();
    } else if (step === 'register') {
      handleStart();
    } else if (step === 'success') {
      setShowConfetti(false);
      setStep('devices');
      setActiveIndex(4);
      setAnnounce('Manage your devices.');
    } else if (step === 'devices') {
      setStep('audit');
      setActiveIndex(5);
      setAnnounce('Audit trail displayed.');
    }
  };
  const handleClose = () => {
    setStep('intro');
    setActiveIndex(0);
    setAnnounce('Wizard closed.');
  };

  return (
    <div className="w-full max-w-lg mx-auto p-8 rounded-3xl bg-gradient-to-br from-white/90 to-slate-100/70 dark:from-slate-900/90 dark:to-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-2xl backdrop-blur-2xl flex flex-col gap-8 relative">
      <AccessibilityAnnouncer message={announce} />
      {showConfetti && <Confetti width={typeof window !== 'undefined' ? window.innerWidth : 800} height={typeof window !== 'undefined' ? window.innerHeight : 600} numberOfPieces={200} recycle={false} />}
      <AnimatedStep index={0} activeIndex={activeIndex}>
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">Enable Biometric Login (WebAuthn)</h2>
          <p className="text-slate-600 dark:text-slate-300 max-w-md">Add a passkey or biometric device for passwordless, ultra-secure login. Works with Face ID, Touch ID, Windows Hello, and more. Inspired by Apple, Canva, TradingView, and Solana.</p>
          <MicroInteractionButton onClick={handleNext} className="mt-4">Start</MicroInteractionButton>
        </div>
      </AnimatedStep>
      <AnimatedStep index={1} activeIndex={activeIndex}>
        <DeviceNameStep name={deviceName} onChange={setDeviceName} onNext={handleNext} loading={loading} />
      </AnimatedStep>
      <AnimatedStep index={2} activeIndex={activeIndex}>
        <div className="flex flex-col items-center gap-6 text-center">
          <h3 className="text-xl font-semibold mb-2">Follow your device prompt…</h3>
          <p className="text-slate-600 dark:text-slate-300">Approve the biometric or passkey prompt in your browser/device. This is ultra-secure and privacy-preserving.</p>
          {loading && <span className="text-blue-500 animate-pulse">Waiting for device…</span>}
          {error && <span className="text-red-500 mt-2">{error}</span>}
          <MicroInteractionButton onClick={handleStart} loading={loading} className="mt-4">Retry</MicroInteractionButton>
        </div>
      </AnimatedStep>
      <AnimatedStep index={3} activeIndex={activeIndex}>
        <div className="flex flex-col items-center gap-6 text-center">
          <h3 className="text-xl font-semibold mb-2">Device Registered! 🎉</h3>
          <p className="text-slate-600 dark:text-slate-300">You can now use this device for passwordless login and 2FA. Manage your devices in account settings.</p>
          <MicroInteractionButton onClick={handleNext} className="mt-4">Next: Manage Devices</MicroInteractionButton>
        </div>
      </AnimatedStep>
      <AnimatedStep index={4} activeIndex={activeIndex}>
        <DeviceList devices={devices} onRevoke={handleRevokeDevice} />
        <ComplianceExportButton logs={devices} i18n={{ export: t('webauthn.export_devices'), tooltip: t('webauthn.export_devices_tooltip'), success: t('webauthn.export_success'), error: t('webauthn.export_error'), csv: t('webauthn.export_csv'), pdf: t('webauthn.export_pdf') }} />
        <MicroInteractionButton onClick={handleNext} className="mt-4">{t('webauthn.continue', 'Continue')}</MicroInteractionButton>
      </AnimatedStep>
      <AnimatedStep index={5} activeIndex={activeIndex}>
        <AuditTrailBanner events={auditEvents} />
        <ComplianceExportButton logs={auditEvents} i18n={{ export: t('webauthn.export_audit'), tooltip: t('webauthn.export_audit_tooltip'), success: t('webauthn.export_success'), error: t('webauthn.export_error'), csv: t('webauthn.export_csv'), pdf: t('webauthn.export_pdf') }} />
        <MicroInteractionButton onClick={handleClose} className="mt-4">{t('webauthn.done', 'Done')}</MicroInteractionButton>
      </AnimatedStep>
      {/* TODO: Add analytics, extensibility hooks, device fingerprinting, i18n, accessibility improvements, and more. */}
    </div>
  );
};

export default WebAuthnSetup; 