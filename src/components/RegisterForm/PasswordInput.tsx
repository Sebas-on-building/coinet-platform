import React, { useState } from "react";
import { t } from '../../utils/i18n';

interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  register?: any;
  id: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  error,
  register,
  id,
  autoComplete,
  ...rest
}) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative mb-2">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        {...register}
        {...rest}
        className={`w-full px-4 py-2 rounded border transition-all duration-200 focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white bg-white/80 backdrop-blur-md ${error ? "border-red-500 animate-shake" : "border-gray-300"
          } ${focused ? "shadow-lg" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none transition-all duration-200 ${focused || rest.value
            ? "-top-3 text-xs text-blue-600 bg-white dark:bg-neutral-900 px-1"
            : "text-gray-500"
          }`}
      >
        {label}
      </label>
      <button
        type="button"
        tabIndex={0}
        aria-label={show ? t('register.hide_password') : t('register.show_password')}
        title={show ? t('register.hide_password') : t('register.show_password')}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-full p-1 bg-white/70 dark:bg-neutral-800/70 backdrop-blur-md shadow-md transition-all duration-200"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
      >
        <span className="sr-only">
          {show ? t('register.hide_password') : t('register.show_password')}
        </span>
        <span className="tooltip-text absolute z-10 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none left-1/2 -translate-x-1/2 -top-8">
          {show ? t('register.hide_password') : t('register.show_password')}
        </span>
        {show ? (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              strokeWidth="2"
              d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              strokeWidth="2"
              d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M1 1l22 22"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )}
      </button>
      {error && (
        <span id={`${id}-error`} className="text-red-500 text-xs mt-1 block animate-shake">
          {error}
        </span>
      )}
    </div>
  );
};

export default PasswordInput;
