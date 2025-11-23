import React, { useRef, useState } from 'react';

interface TOTPInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const TOTPInput: React.FC<TOTPInputProps> = ({ value, onChange, error, disabled, className }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [focused, setFocused] = useState(false);

  const handleInput = (i: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = value.split('');
    next[i] = val;
    onChange(next.join('').slice(0, 6));
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    if (pasted.length === 6) inputs.current[5]?.focus();
    e.preventDefault();
  };

  return (
    <div className={`flex gap-2 items-center justify-center ${className}`} aria-label="TOTP code input">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleInput(i, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-10 h-14 text-2xl text-center font-mono rounded-lg border-2 transition-all bg-gradient-to-br from-white/80 to-slate-100/60 dark:from-slate-900/80 dark:to-slate-800/60 border-slate-300 dark:border-slate-600 shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-400 outline-none ${error ? 'border-red-500' : ''}`}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
      {error && <span className="ml-4 text-red-500 text-sm" role="alert">{error}</span>}
    </div>
  );
};

export default TOTPInput; 