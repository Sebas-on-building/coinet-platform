import React, { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { ConfettiBurst } from "../ui/ConfettiBurst";
import { CheckmarkSuccess } from "../ui/CheckmarkSuccess";
import { ShakeOnError } from "../ui/ShakeOnError";
import { SoundFeedback } from "../ui/SoundFeedback";

interface AccountLinkingModalProps {
  onConfirm: () => void;
  needsLinkingConfirmation?: boolean;
  provider?: string;
}

const providerIcons: Record<string, JSX.Element> = {
  google: (
    <svg width="32" height="32" viewBox="0 0 24 24">
      <g>
        <path
          fill="#4285F4"
          d="M21.805 10.023h-9.765v3.955h5.627c-.243 1.3-1.47 3.818-5.627 3.818-3.386 0-6.145-2.803-6.145-6.25s2.759-6.25 6.145-6.25c1.927 0 3.222.82 3.963 1.527l2.713-2.64C17.09 2.98 14.97 2 12.04 2 6.477 2 2 6.477 2 12s4.477 10 10.04 10c5.77 0 9.56-4.04 9.56-9.75 0-.65-.07-1.15-.16-1.627z"
        />
        <path
          fill="#34A853"
          d="M3.153 7.345l3.285 2.409C7.5 8.13 9.57 6.545 12.04 6.545c1.927 0 3.222.82 3.963 1.527l2.713-2.64C17.09 2.98 14.97 2 12.04 2 8.24 2 4.97 4.29 3.153 7.345z"
        />
        <path
          fill="#FBBC05"
          d="M12.04 22c2.93 0 5.05-.98 6.73-2.67l-3.09-2.53c-.86.58-2.02.99-3.64.99-2.8 0-5.17-1.89-6.02-4.44l-3.22 2.49C4.97 19.71 8.24 22 12.04 22z"
        />
        <path
          fill="#EA4335"
          d="M21.805 10.023h-9.765v3.955h5.627c-.243 1.3-1.47 3.818-5.627 3.818-3.386 0-6.145-2.803-6.145-6.25s2.759-6.25 6.145-6.25c1.927 0 3.222.82 3.963 1.527l2.713-2.64C17.09 2.98 14.97 2 12.04 2 6.477 2 2 6.477 2 12s4.477 10 10.04 10c5.77 0 9.56-4.04 9.56-9.75 0-.65-.07-1.15-.16-1.627z"
        />
      </g>
    </svg>
  ),
  apple: (
    <svg width="32" height="32" viewBox="0 0 24 24">
      <path
        fill="#000"
        d="M16.365 1.43c0 1.14-.93 2.07-2.07 2.07-.04 0-.08 0-.12-.01-.02-.04-.03-.09-.03-.14 0-1.13.92-2.05 2.05-2.05.05 0 .09.01.13.02.01.04.02.09.02.14zm2.13 4.13c-1.13-.13-2.08.62-2.62.62-.54 0-1.38-.6-2.28-.58-.88.01-1.7.51-2.16 1.3-.93 1.61-.24 3.99.67 5.3.45.66.98 1.4 1.68 1.37.67-.03.93-.44 1.74-.44.8 0 1.04.44 1.74.43.71-.01 1.16-.67 1.6-1.33.5-.73.7-1.44.71-1.48-.02-.01-1.36-.52-1.38-2.07-.01-1.29 1.05-1.91 1.1-1.94-.6-.87-1.54-.97-1.87-.98zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02z"
      />
    </svg>
  ),
  twitter: (
    <svg width="32" height="32" viewBox="0 0 24 24">
      <path
        fill="#1DA1F2"
        d="M22.46 5.924c-.793.352-1.645.59-2.54.697a4.48 4.48 0 0 0 1.963-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 16.11 4c-2.48 0-4.49 2.01-4.49 4.49 0 .35.04.69.11 1.01C7.69 9.36 4.07 7.57 1.64 4.95c-.38.65-.6 1.4-.6 2.2 0 1.52.77 2.86 1.94 3.65-.72-.02-1.4-.22-1.99-.55v.06c0 2.13 1.52 3.91 3.54 4.31-.37.1-.76.16-1.16.16-.28 0-.55-.03-.81-.08.55 1.72 2.16 2.97 4.07 3-1.49 1.17-3.36 1.87-5.4 1.87-.35 0-.7-.02-1.04-.06C2.29 21.29 5.01 22 7.92 22c9.5 0 14.7-7.87 14.7-14.7 0-.22 0-.43-.02-.65.99-.72 1.85-1.62 2.53-2.65z"
      />
    </svg>
  ),
};

export const AccountLinkingModal: React.FC<AccountLinkingModalProps> = ({
  onConfirm,
  needsLinkingConfirmation = false,
  provider,
}) => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [shake, setShake] = useState(false);
  const [playSound, setPlaySound] = useState<
    "success" | "error" | "link" | null
  >(null);

  useEffect(() => {
    if (needsLinkingConfirmation) {
      setPlaySound("link");
      // analytics.track('account_linking_modal_shown', { provider });
    }
  }, [needsLinkingConfirmation, provider]);

  if (!needsLinkingConfirmation) return null;

  const handleConfirm = () => {
    setShowConfetti(true);
    setShowCheckmark(true);
    setPlaySound("success");
    // analytics.track('account_linking_confirmed', { provider });
    setTimeout(() => {
      setShowConfetti(false);
      setShowCheckmark(false);
      onConfirm();
    }, 1200);
  };

  const handleDecline = () => {
    setShake(true);
    setPlaySound("error");
    // analytics.track('account_linking_declined', { provider });
    setTimeout(() => {
      setShake(false);
      signOut();
    }, 700);
  };

  return (
    <AnimatePresence>
      <ConfettiBurst run={showConfetti} />
      <CheckmarkSuccess show={showCheckmark} />
      <SoundFeedback type={playSound || "success"} play={!!playSound} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        aria-modal="true"
        role="dialog"
      >
        <ShakeOnError shake={shake}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center space-y-6">
            <img src="/logo.svg" alt="Coinet Logo" className="w-12 h-12" />
            <h2 className="text-2xl font-bold text-center">
              Link your accounts?
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-300">
              We found an existing Coinet account with your email.
              <br />
              Would you like to link your <b>{provider}</b> account to your
              profile?
            </p>
            <div className="flex gap-4 items-center">
              {provider && providerIcons[provider]}
              {user?.primaryEmailAddress?.emailAddress && (
                <span className="text-gray-700 dark:text-gray-200 font-semibold">
                  {user.primaryEmailAddress.emailAddress}
                </span>
              )}
            </div>
            <div className="flex gap-4 mt-4">
              <button
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold shadow hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-green-300"
                onClick={handleConfirm}
                autoFocus
              >
                Yes, Link Accounts
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold shadow hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-gray-300"
                onClick={handleDecline}
              >
                No, Keep Separate
              </button>
            </div>
          </div>
        </ShakeOnError>
      </motion.div>
    </AnimatePresence>
  );
};
