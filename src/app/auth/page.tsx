'use client';

import { useState } from 'react';
import { useSignIn, useSignUp, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const router = useRouter();
  
  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();
  const { isSignedIn } = useAuth();

  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });

  // Redirect if already signed in
  if (isSignedIn) {
    router.push('/dashboard');
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInForm.email || !signInForm.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!signIn) return;

    setIsLoading(true);
    
    try {
      const result = await signIn.create({
        identifier: signInForm.email,
        password: signInForm.password,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpForm.email || !signUpForm.password || !signUpForm.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (signUpForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!signUp) return;

    setIsLoading(true);
    
    try {
      const result = await signUp.create({
        emailAddress: signUpForm.email,
        password: signUpForm.password,
        firstName: signUpForm.displayName || undefined,
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        router.push('/dashboard');
      } else {
        // Email verification might be required
        toast.success('Check your email to verify your account');
        setActiveTab('signin');
        setSignUpForm({ email: '', password: '', confirmPassword: '', displayName: '' });
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message || 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    setIsLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/auth/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err: any) {
      toast.error('Google sign in failed');
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!signIn) return;
    setIsLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: '/auth/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err: any) {
      toast.error('Apple sign in failed');
      setIsLoading(false);
    }
  };

  const handleDemoMode = () => {
    // Demo mode - redirect to dashboard without auth
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] space-y-6">
        {/* Minimal Logo Header */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="text-xl font-semibold text-foreground">Coinet AI</span>
        </div>

        {/* Auth Card */}
        <div className="border border-border/40 shadow-lg bg-card rounded-xl">
          <div className="p-6 pb-4 space-y-1">
            <h2 className="text-2xl font-bold text-foreground">Get started</h2>
            <p className="text-base text-muted-foreground">
              Sign in to your account or create a new one
            </p>
          </div>
          
          <div className="p-6 pt-0">
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

            {/* Sign In Form */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-3">
                  <label htmlFor="signin-email" className="text-sm font-medium text-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInForm.email}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-11 h-12 rounded-lg border border-border/40 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label htmlFor="signin-password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-11 h-12 rounded-lg border border-border/40 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Sign In
                </button>
              </form>
            )}

            {/* Sign Up Form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-3">
                  <label htmlFor="signup-name" className="text-sm font-medium text-foreground">
                    Display Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      id="signup-name"
                      type="text"
                      placeholder="Your display name"
                      value={signUpForm.displayName}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full pl-11 h-12 rounded-lg border border-border/40 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpForm.email}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-11 h-12 rounded-lg border border-border/40 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signUpForm.password}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-11 h-12 rounded-lg border border-border/40 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={signUpForm.confirmPassword}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full pl-11 h-12 rounded-lg border border-border/40 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white"
                  style={{
                    background: 'linear-gradient(135deg, hsl(282 70% 55%), hsl(192 80% 50%))',
                  }}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create Account
                </button>
              </form>
            )}

            {/* Social Login */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground font-medium">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="h-12 border border-border/40 bg-background hover:bg-muted text-foreground font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={isLoading}
                className="h-12 border border-border/40 bg-background hover:bg-muted text-foreground font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Apple
              </button>
            </div>

            {/* Demo Mode Section */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground font-medium">Development</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoMode}
              disabled={isLoading}
              className="w-full h-12 bg-primary/80 hover:bg-primary text-primary-foreground font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 Enter Demo Mode
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our{' '}
          <a 
            href="https://www.coinet.ai/terms-of-service" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Terms of Service
          </a>
          {' '}and{' '}
          <a 
            href="https://www.coinet.ai/privacy-policy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
