'use client';

import { useState } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';
import Image from 'next/image';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="w-full max-w-[440px] space-y-6">
      {/* Minimal Logo Header */}
      <div className="flex items-center justify-center space-x-2">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <span className="text-xl font-semibold text-foreground">Coinet AI</span>
      </div>

      {/* Auth Card */}
      <div className="border border-border/40 shadow-lg bg-card rounded-xl overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-2xl font-bold text-foreground">Get started</h2>
          <p className="text-base text-muted-foreground mt-1">
            Sign in to your account or create a new one
          </p>
        </div>
        
        <div className="px-6">
          {/* Tabs */}
          <div className="grid grid-cols-2 h-12 bg-muted rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('signin')}
              className={`rounded-md text-sm font-medium transition-all ${
                activeTab === 'signin'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`rounded-md text-sm font-medium transition-all ${
                activeTab === 'signup'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Clerk Forms */}
          <div className="pb-6">
            {activeTab === 'signin' ? (
              <SignIn
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none border-0 bg-transparent p-0 m-0 w-full',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton: 
                      'h-12 border border-border/40 bg-background hover:bg-muted text-foreground rounded-lg transition-all duration-200 w-full font-medium',
                    socialButtonsBlockButtonText: 'font-medium',
                    socialButtonsProviderIcon: 'w-4 h-4',
                    dividerLine: 'bg-border/40',
                    dividerText: 'text-xs uppercase text-muted-foreground font-medium px-4 bg-card',
                    formFieldLabel: 'text-sm font-medium text-foreground mb-2',
                    formFieldInput: 
                      'h-12 rounded-lg border-border/40 bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all',
                    formButtonPrimary: 
                      'h-12 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-200',
                    footerAction: 'hidden',
                    footer: 'hidden',
                    formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',
                    identityPreviewEditButton: 'text-primary hover:text-primary/80',
                    formResendCodeLink: 'text-primary hover:text-primary/80',
                    alert: 'bg-destructive/10 border border-destructive/20 text-destructive rounded-lg',
                    alertText: 'text-destructive',
                    formFieldError: 'text-destructive text-sm mt-1',
                    otpCodeFieldInput: 'bg-background border-border/40 text-foreground rounded-lg',
                  },
                  layout: {
                    socialButtonsPlacement: 'bottom',
                    showOptionalFields: false,
                  },
                }}
                routing="hash"
                forceRedirectUrl="/dashboard"
                fallbackRedirectUrl="/dashboard"
              />
            ) : (
              <SignUp
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none border-0 bg-transparent p-0 m-0 w-full',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton: 
                      'h-12 border border-border/40 bg-background hover:bg-muted text-foreground rounded-lg transition-all duration-200 w-full font-medium',
                    socialButtonsBlockButtonText: 'font-medium',
                    socialButtonsProviderIcon: 'w-4 h-4',
                    dividerLine: 'bg-border/40',
                    dividerText: 'text-xs uppercase text-muted-foreground font-medium px-4 bg-card',
                    formFieldLabel: 'text-sm font-medium text-foreground mb-2',
                    formFieldInput: 
                      'h-12 rounded-lg border-border/40 bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all',
                    formButtonPrimary: 
                      'h-12 w-full font-medium rounded-lg transition-all duration-200',
                    footerAction: 'hidden',
                    footer: 'hidden',
                    formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',
                    identityPreviewEditButton: 'text-primary hover:text-primary/80',
                    formResendCodeLink: 'text-primary hover:text-primary/80',
                    alert: 'bg-destructive/10 border border-destructive/20 text-destructive rounded-lg',
                    alertText: 'text-destructive',
                    formFieldError: 'text-destructive text-sm mt-1',
                    otpCodeFieldInput: 'bg-background border-border/40 text-foreground rounded-lg',
                  },
                  layout: {
                    socialButtonsPlacement: 'bottom',
                    showOptionalFields: false,
                  },
                }}
                routing="hash"
                forceRedirectUrl="/dashboard"
                fallbackRedirectUrl="/dashboard"
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        By continuing, you agree to our{' '}
        <button className="underline hover:text-foreground transition-colors">
          Terms of Service
        </button>
        {' '}and{' '}
        <button className="underline hover:text-foreground transition-colors">
          Privacy Policy
        </button>
      </div>
    </div>
  );
}
