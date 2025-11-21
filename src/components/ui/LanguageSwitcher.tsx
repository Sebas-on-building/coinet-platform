import React from "react";
import { messages } from "./messages";

/**
 * LanguageSwitcher: lets users switch UI language. Pixel-perfect, accessible, animated.
 */
export const LanguageSwitcher: React.FC<{
  lang: string;
  setLang: (l: string) => void;
}> = ({ lang, setLang }) => (
  <div className="flex gap-2 items-center mt-4">
    {Object.keys(messages).map((l) => (
      <button
        key={l}
        className={`px-3 py-1 rounded-full transition font-semibold border-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${lang === l ? "bg-blue-600 text-white border-blue-600 scale-105 shadow-lg" : "bg-gray-200 text-gray-700 border-gray-300 hover:bg-blue-100"}`}
        onClick={() => setLang(l)}
        aria-label={`Switch to ${l}`}
      >
        {l.toUpperCase()}
      </button>
    ))}
  </div>
);
