import { createContext, useContext, useState } from "react";
import { ClerkProvider, useUser, useAuth as useClerkAuth, useSignIn, useSignUp } from "@clerk/clerk-react";
import { toast } from "sonner";

// Get Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Validate Clerk key format
if (!CLERK_PUBLISHABLE_KEY) {
  console.error("❌ Missing VITE_CLERK_PUBLISHABLE_KEY - auth will not work");
} else if (!CLERK_PUBLISHABLE_KEY.startsWith('pk_test_') && !CLERK_PUBLISHABLE_KEY.startsWith('pk_live_')) {
  console.error("❌ Invalid VITE_CLERK_PUBLISHABLE_KEY format. Should start with 'pk_test_' or 'pk_live_'");
  console.error("Current key:", CLERK_PUBLISHABLE_KEY.substring(0, 50) + "...");
} else if (CLERK_PUBLISHABLE_KEY.length < 50) {
  console.error("❌ VITE_CLERK_PUBLISHABLE_KEY appears truncated. Expected length ~100+ characters, got:", CLERK_PUBLISHABLE_KEY.length);
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: any | null;
  session: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithGithub: () => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  setDemoMode?: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  const { signIn: clerkSignIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp: clerkSignUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const [demoMode, setDemoModeState] = useState(false);
  const [demoUser, setDemoUser] = useState<any>(null);
  
  // All Clerk hooks must be loaded before auth operations
  const isLoaded = userLoaded && signInLoaded !== undefined && signUpLoaded !== undefined;

  const profile: UserProfile | null = user ? {
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.primaryEmailAddress?.emailAddress || null,
    avatar_url: user.imageUrl,
    bio: null,
    created_at: user.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: user.updatedAt?.toISOString() || new Date().toISOString(),
  } : null;

  const signIn = async (email: string, password: string) => {
    try {
      if (!isLoaded) {
        console.warn("Clerk not loaded yet");
        return { error: new Error("Please wait, authentication is loading...") };
      }
      
      if (!clerkSignIn) {
        console.error("clerkSignIn is null/undefined");
        return { error: new Error("Sign in not available. Please refresh the page.") };
      }
      
      if (!setSignInActive) {
        console.error("setSignInActive is null/undefined");
        return { error: new Error("Sign in not available. Please refresh the page.") };
      }
      
      const signInAttempt = await clerkSignIn.create({
        identifier: email,
        password: password,
      });

      if (signInAttempt.status === 'complete') {
        await setSignInActive({ session: signInAttempt.createdSessionId });
        toast.success("Welcome back!");
        return { error: null };
      }
      
      // Handle other statuses (e.g., needs verification)
      if (signInAttempt.status === 'needs_first_factor') {
        return { error: new Error("Please verify your email address") };
      }
      
      return { error: null };
    } catch (error: any) {
      console.error("Sign in error:", error);
      const message = error.errors?.[0]?.message || error.message || "Sign in failed";
      toast.error("Authentication failed", { description: message });
      return { error: new Error(message) };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      if (!isLoaded) {
        console.warn("Clerk not loaded yet");
        return { error: new Error("Please wait, authentication is loading...") };
      }
      
      if (!clerkSignUp) {
        console.error("clerkSignUp is null/undefined");
        return { error: new Error("Sign up not available. Please refresh the page.") };
      }
      
      if (!setSignUpActive) {
        console.error("setSignUpActive is null/undefined");
        return { error: new Error("Sign up not available. Please refresh the page.") };
      }
      
      const signUpAttempt = await clerkSignUp.create({
        emailAddress: email,
        password: password,
        firstName: metadata?.display_name || undefined,
      });

      if (signUpAttempt.status === 'complete') {
        await setSignUpActive({ session: signUpAttempt.createdSessionId });
        toast.success("Welcome to Coinet AI!");
        return { error: null };
      } else {
        // Email verification required
        toast.success("Registration successful!", {
          description: "Please check your email to verify your account."
        });
        return { error: null };
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      const message = error.errors?.[0]?.message || error.message || "Registration failed";
      toast.error("Registration failed", { description: message });
      return { error: new Error(message) };
    }
  };

  const signOut = async () => {
    try {
      if (demoMode) {
        setDemoModeState(false);
        setDemoUser(null);
        toast.success("Demo mode deactivated");
        window.location.href = '/auth';
        return;
      }
      
      await clerkSignOut();
      toast.success("Signed out successfully");
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error("Sign out failed");
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (!isLoaded || !clerkSignIn) return { error: new Error("Sign in not available") };
      
      await clerkSignIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
      
      return { error: null };
    } catch (error: any) {
      toast.error("Google sign in failed");
      return { error: error as Error };
    }
  };

  const signInWithGithub = async () => {
    try {
      if (!isLoaded || !clerkSignIn) return { error: new Error("Sign in not available") };
      
      await clerkSignIn.authenticateWithRedirect({
        strategy: 'oauth_github',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
      
      return { error: null };
    } catch (error: any) {
      toast.error("GitHub sign in failed");
      return { error: error as Error };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error("No authenticated user");
      
      await user.update({
        firstName: updates.first_name || undefined,
        lastName: updates.last_name || undefined,
      });
      
      toast.success("Profile updated successfully");
      return { error: null };
    } catch (error: any) {
      toast.error("Profile update failed", { description: error.message });
      return { error: error as Error };
    }
  };

  const setDemoMode = (enabled: boolean) => {
    setDemoModeState(enabled);
    if (enabled) {
      const DEMO_USER_UUID = '00000000-0000-0000-0000-000000000001';
      
      const mockUser = {
        id: DEMO_USER_UUID,
        firstName: 'Demo',
        lastName: 'User',
        primaryEmailAddress: { emailAddress: 'demo@coinet.ai' },
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setDemoUser(mockUser);
      toast.success("Demo mode activated! 🚀");
    } else {
      setDemoUser(null);
    }
  };

  const effectiveUser = demoMode ? demoUser : user;
  const effectiveProfile = demoMode ? {
    id: '00000000-0000-0000-0000-000000000001',
    first_name: 'Demo',
    last_name: 'User',
    email: 'demo@coinet.ai',
    avatar_url: null,
    bio: 'Demo account for testing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } : profile;

  const value: AuthContextType = {
    user: effectiveUser,
    session: isSignedIn || demoMode ? { user: effectiveUser } : null,
    profile: effectiveProfile,
    loading: (!isLoaded || !userLoaded) && !demoMode,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGithub,
    updateProfile,
    setDemoMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) {
    console.error("VITE_CLERK_PUBLISHABLE_KEY is missing! Auth will not work.");
    // Fallback for missing key - allow demo mode only
    return (
      <AuthProviderFallback>
        {children}
      </AuthProviderFallback>
    );
  }

  return (
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </ClerkProvider>
  );
}

// Fallback provider when Clerk key is missing (demo mode only)
function AuthProviderFallback({ children }: { children: React.ReactNode }) {
  const [demoMode, setDemoModeState] = useState(false);
  const [demoUser, setDemoUser] = useState<any>(null);

  const setDemoMode = (enabled: boolean) => {
    setDemoModeState(enabled);
    if (enabled) {
      setDemoUser({
        id: '00000000-0000-0000-0000-000000000001',
        firstName: 'Demo',
        lastName: 'User',
        primaryEmailAddress: { emailAddress: 'demo@coinet.ai' },
      });
      toast.success("Demo mode activated! 🚀");
    } else {
      setDemoUser(null);
    }
  };

  const value: AuthContextType = {
    user: demoUser,
    session: demoMode ? { user: demoUser } : null,
    profile: demoMode ? {
      id: '00000000-0000-0000-0000-000000000001',
      first_name: 'Demo',
      last_name: 'User',
      email: 'demo@coinet.ai',
      avatar_url: null,
      bio: 'Demo account',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : null,
    loading: false,
    signIn: async () => {
      toast.error("Please configure Clerk to enable authentication");
      return { error: new Error("Clerk not configured") };
    },
    signUp: async () => {
      toast.error("Please configure Clerk to enable authentication");
      return { error: new Error("Clerk not configured") };
    },
    signOut: async () => {
      setDemoModeState(false);
      setDemoUser(null);
      window.location.href = '/auth';
    },
    signInWithGoogle: async () => {
      toast.error("Please configure Clerk to enable Google sign in");
      return { error: new Error("Clerk not configured") };
    },
    signInWithGithub: async () => {
      toast.error("Please configure Clerk to enable GitHub sign in");
      return { error: new Error("Clerk not configured") };
    },
    updateProfile: async () => {
      toast.error("Please configure Clerk to enable profile updates");
      return { error: new Error("Clerk not configured") };
    },
    setDemoMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
