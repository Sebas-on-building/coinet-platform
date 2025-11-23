import '../styles/globals.css';
import { AnimatePresence, motion } from 'framer-motion';
import type { AppProps } from 'next/app';
import { AuthUIProvider } from "@/contexts/AuthUIContext";
import { AccountLinkingModal } from "@/components/auth/AccountLinkingModal";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React from "react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  React.useEffect(() => {
    if (status === "unauthenticated" && router.pathname !== "/auth/signin") {
      router.replace("/auth/signin");
    }
  }, [status, router]);
  if (status === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Loading...
      </div>
    );
  return <>{children}</>;
}

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <AuthUIProvider>
        <AuthGuard>
          <div className="min-h-screen font-sans bg-background text-text flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={router.route}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="w-full"
              >
                <Component {...pageProps} />
              </motion.div>
            </AnimatePresence>
          </div>
          <AccountLinkingModal onConfirm={() => window.location.reload()} />
        </AuthGuard>
      </AuthUIProvider>
    </SessionProvider>
  );
}
