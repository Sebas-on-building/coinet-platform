import React, { createContext, useContext, useState, ReactNode } from "react";

interface AuthUIContextProps {
  showAccountLinking: boolean;
  setShowAccountLinking: (show: boolean) => void;
  triggerAccountLinking: (onConfirm: () => void) => void;
  onAccountLinkingConfirm: (() => void) | null;
}

const AuthUIContext = createContext<AuthUIContextProps | undefined>(undefined);

export const AuthUIProvider = ({ children }: { children: ReactNode }) => {
  const [showAccountLinking, setShowAccountLinking] = useState(false);
  const [onAccountLinkingConfirm, setOnAccountLinkingConfirm] = useState<
    (() => void) | null
  >(null);

  const triggerAccountLinking = (onConfirm: () => void) => {
    setOnAccountLinkingConfirm(() => onConfirm);
    setShowAccountLinking(true);
  };

  return (
    <AuthUIContext.Provider
      value={{
        showAccountLinking,
        setShowAccountLinking,
        triggerAccountLinking,
        onAccountLinkingConfirm,
      }}
    >
      {children}
    </AuthUIContext.Provider>
  );
};

export const useAuthUI = () => {
  const ctx = useContext(AuthUIContext);
  if (!ctx) throw new Error("useAuthUI must be used within AuthUIProvider");
  return ctx;
};
