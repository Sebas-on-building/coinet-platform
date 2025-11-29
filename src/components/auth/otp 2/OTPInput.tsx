import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useUndoRedo } from '../../../hooks/useUndoRedo';
import { useMotionPreference } from '../../../hooks/useMotionPreference';
import Confetti from 'react-confetti';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const OTPInput: React.FC<OTPInputProps & { success?: boolean }> = ({ value, onChange, error, disabled, className, success }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const { value: otp, set: setOtp, undo, redo, canUndo, canRedo } = useUndoRedo(value);
  const reducedMotion = useMotionPreference();

  // Sync external value
  useEffect(() => { setOtp(value); }, [value, setOtp]);
  useEffect(() => { if (otp !== value) onChange(otp); }, [otp]);

  // Focus trap
  useEffect(() => {
    if (focusedIndex !== null && inputs.current[focusedIndex]) {
      inputs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  // Keyboard shortcuts for undo/redo
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) redo(); else undo();
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' && focusedIndex !== null && focusedIndex > 0) {
      setFocusedIndex(focusedIndex - 1);
      e.preventDefault();
    }
    if (e.key === 'ArrowRight' && focusedIndex !== null && focusedIndex < 5) {
      setFocusedIndex(focusedIndex + 1);
      e.preventDefault();
    }
  }, [focusedIndex, undo, redo]);

  // Haptic feedback (if available)
  const haptic = useCallback(() => {
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  }, []);

  const handleInput = (i: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = otp.split('');
    next[i] = val;
    setOtp(next.join('').slice(0, 6));
    if (val && i < 5) setFocusedIndex(i + 1);
    haptic();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtp(pasted);
    if (pasted.length === 6) setFocusedIndex(5);
    e.preventDefault();
    haptic();
  };

  return (
    <div
      className={`flex gap-2 items-center justify-center ${className}`}
      aria-label="OTP code input"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      role="group"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="relative" key={i}>
          <input
            ref={el => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={otp[i] || ''}
            onChange={e => handleInput(i, e.target.value)}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex(null)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`w-10 h-14 text-2xl text-center font-mono rounded-lg border-2 transition-all ${reducedMotion ? '' : 'duration-200'} bg-gradient-to-br from-white/80 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-800/60 border-slate-300 dark:border-slate-600 shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-400 outline-none ${error ? 'border-red-500' : ''} ${focusedIndex === i ? 'ring-2 ring-blue-400 scale-105' : ''}`}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={!!error}
          />
          {/* Animated SVG/3D illustration on focus */}
          {focusedIndex === i && !reducedMotion && (
            <svg className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce" width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="#60a5fa" opacity="0.2" />
              <path d="M7 13l3 3 7-7" stroke="#2563eb" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
      {/* Confetti on success */}
      {success && !reducedMotion && <Confetti width={300} height={100} numberOfPieces={80} recycle={false} />}
      <div className="flex flex-col gap-1 ml-2">
        <button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo" className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-800 transition disabled:opacity-40">⎌</button>
        <button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo" className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-800 transition disabled:opacity-40">↻</button>
      </div>
      {error && <span className="ml-4 text-red-500 text-sm" role="alert">{error}</span>}
    </div>
  );
};

export default OTPInput; 