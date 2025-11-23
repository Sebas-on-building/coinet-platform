import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import zxcvbn from "zxcvbn";
import PasswordStrengthMeter from "./RegisterForm/PasswordStrengthMeter";
import CaptchaWidget from "./RegisterForm/CaptchaWidget";
import OTPVerification from "./RegisterForm/OTPVerification";
import PasswordInput from "./RegisterForm/PasswordInput";
import { t } from '../utils/i18n';
import { signIn } from 'next-auth/react';

/**
 * RegisterForm
 *
 * World-class registration form for Coinet.
 * - Email/password registration with real-time validation and entropy feedback
 * - Google reCAPTCHA v3 with hCaptcha fallback
 * - OTP email verification with rate-limiting and cooldown
 * - Accessibility (ARIA, keyboard, screen reader)
 * - i18n-ready, dark/light mode, animated micro-interactions
 * - Extensible for social login, passwordless, analytics
 *
 * @component
 */
// Main RegisterForm component
const RegisterForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [serverError, setServerError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaProvider, setCaptchaProvider] = useState<
    "recaptcha" | "hcaptcha" | null
  >(null);
  const password = watch("password", "");
  const [passwordEntropy, setPasswordEntropy] = useState<number | undefined>(undefined);

  // Handle registration form submit
  const onSubmit = async (data: any) => {
    setServerError(null);
    if (!captchaToken) {
      setServerError(t('register.captcha_required'));
      return;
    }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          captcha: captchaToken,
          captchaProvider,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t('register.failed'));
      setPasswordEntropy(result.entropy);
      setEmail(data.email);
      setStep("verify");
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  // Handle CAPTCHA verification
  const handleCaptchaVerify = (
    token: string,
    provider: "recaptcha" | "hcaptcha",
  ) => {
    setCaptchaToken(token);
    setCaptchaProvider(provider);
  };

  // Reset CAPTCHA token on form reset
  const handleFormReset = () => {
    setCaptchaToken(null);
    setCaptchaProvider(null);
    reset();
  };

  // TODO: Integrate social login (Google, Apple, etc.) here
  // TODO: Integrate passwordless (magic link, WebAuthn) here
  // TODO: Add analytics event tracking for registration steps
  // TODO: Optimize with React.memo and lazy load subcomponents if needed

  return (
    <div className="max-w-md mx-auto p-8 bg-white/80 dark:bg-neutral-900/80 rounded-xl shadow-2xl backdrop-blur-md space-y-6 transition-colors duration-300">
      {step === "register" && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 animate-fade-in"
          aria-label={t('register.form_aria')}
        >
          <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-white transition-colors duration-300">
            {t('register.title')}
          </h2>
          <div className="flex flex-col gap-3 mb-2">
            {/* OAuth Buttons */}
            <button
              type="button"
              onClick={() => signIn('google')}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white text-gray-800 font-semibold shadow hover:shadow-lg border border-gray-200 hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={t('oauth.google')}
            >
              <img src="/icons/google.svg" alt="Google" className="w-5 h-5" />
              {t('oauth.google')}
            </button>
            <button
              type="button"
              onClick={() => signIn('apple')}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-black text-white font-semibold shadow hover:shadow-lg hover:bg-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-gray-800"
              aria-label={t('oauth.apple')}
            >
              <img src="/icons/apple.svg" alt="Apple" className="w-5 h-5" />
              {t('oauth.apple')}
            </button>
            <button
              type="button"
              onClick={() => signIn('twitter')}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-500 text-white font-semibold shadow hover:shadow-lg hover:bg-blue-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={t('oauth.twitter')}
            >
              <img src="/icons/twitter.svg" alt="Twitter" className="w-5 h-5" />
              {t('oauth.twitter')}
            </button>
            {/* TODO: Show linked status, add more providers as needed */}
          </div>
          <div>
            <label htmlFor="email" className="block font-medium mb-1 text-gray-700 dark:text-gray-200">
              {t('register.email_label')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email", { required: t('register.email_required') })}
              className="w-full px-4 py-2 rounded border focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white transition-colors duration-300"
              aria-invalid={!!errors.email}
              aria-describedby="email-error"
            />
            {errors.email && (
              <span id="email-error" className="text-red-500 text-sm animate-shake">
                {errors.email.message as string}
              </span>
            )}
          </div>
          <div className="relative group">
            <PasswordInput
              id="password"
              label={t('register.password_label')}
              autoComplete="new-password"
              register={register("password", {
                required: t('register.password_required'),
                minLength: { value: 12, message: t('register.password_min') },
              })}
              error={errors.password?.message as string}
            />
            <div className="absolute top-0 right-0 mt-2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg">
                {t('register.password_tooltip')}
              </span>
            </div>
            <PasswordStrengthMeter password={password} entropy={passwordEntropy} />
          </div>
          <div>
            <PasswordInput
              id="confirmPassword"
              label={t('register.confirm_label')}
              autoComplete="new-password"
              register={register("confirmPassword", {
                required: t('register.confirm_required'),
                validate: (value) =>
                  value === password || t('register.passwords_no_match'),
              })}
              error={errors.confirmPassword?.message as string}
            />
          </div>
          {/* CAPTCHA Widget (Google reCAPTCHA v3, fallback to hCaptcha) */}
          <CaptchaWidget onVerify={handleCaptchaVerify} />
          {serverError && (
            <div className="text-red-600 text-center animate-shake" role="alert">
              {serverError}
            </div>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-500 text-white font-bold text-lg shadow-md hover:scale-105 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center gap-2"
            disabled={isSubmitting || !captchaToken}
            aria-busy={isSubmitting}
          >
            {isSubmitting && (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {isSubmitting ? t('register.submitting') : t('register.submit')}
          </button>
          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-300 dark:border-neutral-700" />
            <span className="mx-2 text-gray-400 text-xs">{t('register.or')}</span>
            <div className="flex-grow border-t border-gray-300 dark:border-neutral-700" />
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" className="w-full py-2 rounded-lg bg-black text-white font-semibold shadow hover:bg-gray-900 transition-colors" disabled>
              {t('register.social_placeholder')}
            </button>
            <button type="button" className="w-full py-2 rounded-lg bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold shadow hover:from-green-500 hover:to-blue-600 transition-colors" disabled>
              {t('register.passwordless_placeholder')}
            </button>
          </div>
        </form>
      )}
      {step === "verify" && <OTPVerification email={email} />}
    </div>
  );
};

export default RegisterForm;
