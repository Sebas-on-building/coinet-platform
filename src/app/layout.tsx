import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import ClientLayout from './ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coinet - AI-Powered Crypto Intelligence',
  description: 'Professional-grade crypto platform for privacy, analytics, and trading—designed to delight.',
  keywords: ['crypto', 'trading', 'analytics', 'AI', 'blockchain', 'DeFi'],
  authors: [{ name: 'Coinet' }],
  openGraph: {
    title: 'Coinet - AI-Powered Crypto Intelligence',
    description: 'Professional-grade crypto platform for privacy, analytics, and trading—designed to delight.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#ffffff',
          colorText: '#1f2937',
          colorInputBackground: '#f9fafb',
          colorInputText: '#1f2937',
          borderRadius: '0.75rem',
          fontFamily: 'inherit',
        },
        elements: {
          formButtonPrimary: 
            'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200',
          card: 
            'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl border border-slate-200 dark:border-slate-700 rounded-3xl',
          headerTitle: 
            'text-2xl font-extrabold text-gray-900 dark:text-white',
          headerSubtitle: 
            'text-gray-600 dark:text-gray-300',
          socialButtonsBlockButton: 
            'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all duration-200',
          formFieldInput: 
            'rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white',
          footerActionLink: 
            'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium',
          identityPreview: 
            'bg-slate-50 dark:bg-slate-800 rounded-xl',
          userButtonPopoverCard: 
            'bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 rounded-2xl',
          userButtonPopoverActionButton: 
            'hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg',
        },
      }}
    >
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-gradient-to-br from-zinc-50 to-slate-100 dark:from-[#18181b] dark:to-[#23272f] min-h-screen text-zinc-900 dark:text-zinc-100 antialiased transition-colors duration-300">
          <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
    </ClerkProvider>
  );
}
