import '../styles/globals.css';
import { AnimatePresence, motion } from 'framer-motion';
import type { AppProps } from 'next/app';
import { AuthUIProvider } from "@/contexts/AuthUIContext";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { useRouter } from "next/router";
import React from "react";

// Public routes that don't require authentication
const publicRoutes = ['/auth/signin', '/auth/signup', '/', '/sign-in', '/sign-up'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isPublicRoute = publicRoutes.some(route => router.pathname.startsWith(route));

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <ClerkProvider>
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
        </AuthGuard>
      </AuthUIProvider>
    </ClerkProvider>
  );
}
