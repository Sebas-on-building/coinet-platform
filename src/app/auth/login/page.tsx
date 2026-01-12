'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] space-y-6">
        {/* Minimal Logo Header */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">C</span>
          </div>
          <span className="text-xl font-semibold text-foreground">Coinet AI</span>
        </div>

        {/* Auth Card */}
        <Card className="border-border/40 shadow-lg bg-card">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription className="text-base">
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-none border-0 bg-transparent',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'h-12 border border-border bg-transparent hover:bg-accent rounded-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-full',
                  socialButtonsBlockButtonText: 'font-medium',
                  dividerLine: 'bg-border/20',
                  dividerText: 'text-xs uppercase text-muted-foreground font-medium bg-card px-4',
                  formFieldLabel: 'text-sm font-medium',
                  formFieldInput: 'h-12 rounded-md border-input bg-background focus-visible:ring-2 focus-visible:ring-primary',
                  formButtonPrimary: 'h-12 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                  footerActionLink: 'text-primary hover:text-primary/90 font-semibold transition-colors',
                  footerActionText: 'text-muted-foreground',
                },
                layout: {
                  socialButtonsPlacement: 'top',
                  showOptionalFields: false,
                },
              }}
              routing="path"
              path="/auth/login"
              signUpUrl="/auth/register"
              forceRedirectUrl="/dashboard"
              fallbackRedirectUrl="/dashboard"
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
} 
