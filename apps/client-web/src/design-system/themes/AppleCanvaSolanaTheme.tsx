import { ReactNode } from 'react';

export function AppleCanvaSolanaTheme({ children }: { children: ReactNode }) {
  return (
    <div className="font-sfpro bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] text-gray-900 min-h-screen">
      {/* Custom CSS variables for color tokens, shadows, etc. */}
      {children}
    </div>
  );
} 