import React, { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import MicroInteractionButton from '../totp/MicroInteractionButton';
import AnimatedStep from '../totp/AnimatedStep';
import AccessibilityAnnouncer from '../totp/AccessibilityAnnouncer';
import { post } from '../../utils/api';
import { Tooltip } from './Tooltip';
import { ScreenReaderOnly } from './ScreenReaderOnly';

export const BiometricAuth: React.FC<{ userId: string; onSuccess: () => void }> = ({ userId, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [announce, setAnnounce] = useState('');

  // Analytics/extensibility hooks (stub)
  const fireAnalytics = (event: string, detail?: any) => {
    // TODO: Integrate with analytics provider
  };

  const handleAuth = async () => {
    setLoading(true);
    setError(undefined);
    setAnnounce('Preparing biometric authentication...');
    fireAnalytics('webauthn.auth.start');
    try {
      const options = await post('/api/auth/webauthn/generate-authentication-options', {}, { 'x-user-id': userId });
      setStep(1);
      setAnnounce('Prompting for biometric authentication...');
      const assertion = await startAuthentication(options);
      await post('/api/auth/webauthn/verify-authentication', assertion, { 'x-user-id': userId });
      setAnnounce('Authentication successful!');
      fireAnalytics('webauthn.auth.success');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setAnnounce('Authentication failed.');
      fireAnalytics('webauthn.auth.error', { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-gradient-to-br from-white/90 to-slate-100/70 dark:from-slate-900/90 dark:to-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-2xl backdrop-blur-2xl flex flex-col gap-8 relative">
      <AccessibilityAnnouncer message={announce} />
      <AnimatedStep index={0} activeIndex={step}>
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">Biometric Authentication</h2>
          <p className="text-slate-600 dark:text-slate-300 max-w-md">Use your device's biometric sensor or passkey for passwordless, ultra-secure login. Works with Face ID, Touch ID, Windows Hello, and more.</p>
          <Tooltip content="Start biometric authentication">
            <MicroInteractionButton onClick={handleAuth} loading={loading} className="mt-4">Authenticate</MicroInteractionButton>
          </Tooltip>
          {error && <span className="text-red-500 mt-2">{error}</span>}
          <ScreenReaderOnly>Step: Biometric authentication</ScreenReaderOnly>
        </div>
      </AnimatedStep>
      <AnimatedStep index={1} activeIndex={step}>
        <div className="flex flex-col items-center gap-6 text-center">
          <h3 className="text-xl font-semibold mb-2">Follow your device prompt…</h3>
          <p className="text-slate-600 dark:text-slate-300">Approve the biometric or passkey prompt in your browser/device. This is ultra-secure and privacy-preserving.</p>
          {loading && <span className="text-blue-500 animate-pulse">Waiting for device…</span>}
          {error && <span className="text-red-500 mt-2">{error}</span>}
          <ScreenReaderOnly>Step: Device prompt</ScreenReaderOnly>
        </div>
      </AnimatedStep>
    </div>
  );
}; 