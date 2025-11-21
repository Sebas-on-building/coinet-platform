// @ts-ignore: No type declarations for react-hcaptcha
// eslint-disable-next-line
declare module "react-hcaptcha";

import React, { useEffect, useState } from "react";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";
import HCaptcha from "react-hcaptcha";
import { t } from '../../utils/i18n';

interface CaptchaWidgetProps {
  onVerify?: (token: string, provider: "recaptcha" | "hcaptcha") => void;
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "";

const CaptchaCore: React.FC<CaptchaWidgetProps> = ({ onVerify }) => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fallback && executeRecaptcha) {
      executeRecaptcha("register")
        .then((token) => {
          if (token) {
            onVerify && onVerify(token, "recaptcha");
          } else {
            setFallback(true);
          }
        })
        .catch(() => setFallback(true));
    }
  }, [executeRecaptcha, fallback, onVerify]);

  if (fallback) {
    return (
      <div className="my-2 animate-fade-in" aria-live="polite">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-yellow-600 dark:text-yellow-400" title={t('captcha.fallback_tooltip')}>
            {t('captcha.fallback')}
          </span>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="animate-bounce">
            <circle cx="12" cy="12" r="10" stroke="#fbbf24" strokeWidth="2" fill="none" />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#fbbf24">!</text>
          </svg>
        </div>
        <HCaptcha
          sitekey={HCAPTCHA_SITE_KEY}
          onVerify={(token: string) => onVerify && onVerify(token, "hcaptcha")}
          onError={(err: any) => setError(t('captcha.error'))}
        />
        {error && <span className="text-xs text-red-500 animate-shake">{error}</span>}
      </div>
    );
  }
  return (
    <div className="my-2" aria-live="polite">
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {t('captcha.protected')}
      </span>
    </div>
  );
};

const CaptchaWidget: React.FC<CaptchaWidgetProps> = (props) => (
  <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY} language="en">
    <CaptchaCore {...props} />
  </GoogleReCaptchaProvider>
);

export default CaptchaWidget;
