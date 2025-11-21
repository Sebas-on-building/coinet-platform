import React, { useRef } from "react";

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
}

const OTP_LENGTH = 6;

const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  error,
  success,
  disabled,
}) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    idx: number,
  ) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 1);
    const newValue = value.split("");
    newValue[idx] = val;
    const joined = newValue.join("").slice(0, OTP_LENGTH);
    onChange(joined);
    if (val && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
  ) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      const newValue = value.split("");
      newValue[idx - 1] = "";
      onChange(newValue.join(""));
      inputs.current[idx - 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData
      .getData("Text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    onChange(pasted);
    setTimeout(() => {
      if (pasted.length === OTP_LENGTH) {
        inputs.current[OTP_LENGTH - 1]?.blur();
      } else if (pasted.length > 0) {
        inputs.current[pasted.length]?.focus();
      }
    }, 0);
    e.preventDefault();
  };

  return (
    <div className="flex justify-center gap-2" aria-label="OTP input">
      {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[idx] || ""}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-12 h-14 text-2xl text-center rounded-lg border transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-900 ${
            error
              ? "border-red-500 animate-shake"
              : success
                ? "border-green-500 animate-pulse"
                : "border-gray-300"
          } ${value[idx] ? "scale-105 shadow-md" : ""}`}
          aria-label={`Digit ${idx + 1}`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
