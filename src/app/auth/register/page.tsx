'use client';

import React from 'react';
import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      {/* Mobile logo */}
      <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
          <span className="text-2xl font-bold text-white">C</span>
        </div>
        <span className="text-2xl font-bold text-white">Coinet</span>
      </div>
      
      {/* Auth Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
        <div className="space-y-2 mb-8">
          <h2 className="text-3xl font-bold text-white">Create account</h2>
          <p className="text-slate-400">
            Start your journey with AI-powered crypto intelligence
          </p>
        </div>
        
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none border-0 bg-transparent p-0 m-0',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton: 
                'h-12 bg-slate-800/80 border border-slate-600/50 text-white hover:bg-slate-700 hover:border-slate-500 rounded-xl transition-all duration-200 w-full font-medium',
              socialButtonsBlockButtonText: 'font-medium text-slate-200',
              socialButtonsProviderIcon: 'w-5 h-5',
              dividerLine: 'bg-slate-600/50',
              dividerText: 'text-xs uppercase text-slate-400 font-medium px-4 bg-slate-900/80',
              formFieldLabel: 'text-sm font-medium text-slate-300 mb-2',
              formFieldInput: 
                'h-12 rounded-xl border-slate-600/50 bg-slate-800/80 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all',
              formButtonPrimary: 
                'h-12 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25',
              footerActionLink: 'text-blue-400 hover:text-blue-300 font-semibold transition-colors',
              footerActionText: 'text-slate-400',
              footer: 'bg-transparent',
              formFieldInputShowPasswordButton: 'text-slate-400 hover:text-white',
              identityPreviewEditButton: 'text-blue-400 hover:text-blue-300',
              formResendCodeLink: 'text-blue-400 hover:text-blue-300',
              alert: 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl',
              alertText: 'text-red-400',
              formFieldError: 'text-red-400 text-sm mt-1',
              otpCodeFieldInput: 'bg-slate-800/80 border-slate-600/50 text-white rounded-lg',
            },
            layout: {
              socialButtonsPlacement: 'top',
              showOptionalFields: false,
            },
          }}
          routing="path"
          path="/auth/register"
          signInUrl="/auth/login"
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
      
      {/* Footer */}
      <div className="text-center text-sm text-slate-500 mt-8">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-slate-400 hover:text-white underline underline-offset-2 transition-colors">
          Terms
        </Link>
        {' '}and{' '}
        <Link href="/privacy" className="text-slate-400 hover:text-white underline underline-offset-2 transition-colors">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
