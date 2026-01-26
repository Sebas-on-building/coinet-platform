import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/database";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoModeState] = useState(false);

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error("Authentication failed", {
          description: error.message
        });
        return { error };
      }
      
      if (data.user) {
        toast.success("Welcome back!");
        // Redirect will happen automatically via auth state change
      }
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error("Sign in failed", {
        description: err.message
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      setLoading(true);
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      });
      
      if (error) {
        toast.error("Registration failed", {
          description: error.message
        });
        return { error };
      }
      
      if (data.user && !data.session) {
        toast.success("Registration successful!", {
          description: "Please check your email to verify your account."
        });
      } else if (data.session) {
        toast.success("Welcome to Coinet AI!");
      }
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error("Registration failed", {
        description: err.message
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      toast.success("Signed out successfully");
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error("Sign out failed");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast.error("Google sign in failed", {
          description: error.message
        });
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error("Google sign in failed", {
        description: err.message
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGithub = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast.error("GitHub sign in failed", {
          description: error.message
        });
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error("GitHub sign in failed", {
        description: err.message
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) {
        throw new Error("No authenticated user");
      }
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        toast.error("Profile update failed", {
          description: error.message
        });
        return { error };
      }
      
      // Refresh profile
      await fetchUserProfile(user.id);
      
      toast.success("Profile updated successfully");
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error("Profile update failed", {
        description: err.message
      });
      return { error: err };
    }
  };

  const setDemoMode = (enabled: boolean) => {
    setDemoModeState(enabled);
    if (enabled) {
      // Create a mock user for demo mode
      // Valid UUID format for demo user (deterministic)
      const DEMO_USER_UUID = '00000000-0000-0000-0000-000000000001';
      
      const mockUser = {
        id: DEMO_USER_UUID,
        email: 'demo@coinet.ai',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          name: 'Demo User'
        },
        app_metadata: {},
        aud: 'authenticated'
      } as unknown as User;
      
      const mockSession = {
        user: mockUser,
        access_token: 'demo-token',
        refresh_token: 'demo-refresh',
        expires_at: Date.now() + 3600000,
        expires_in: 3600,
        token_type: 'bearer'
      } as Session;

      setUser(mockUser);
      setSession(mockSession);
      setProfile({
        id: DEMO_USER_UUID,
        first_name: 'Demo',
        last_name: 'User',
        email: 'demo@coinet.ai',
        avatar_url: null,
        bio: 'Demo account for testing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setLoading(false);
      
      toast.success("Demo mode activated! 🚀");
    }
  };

  const value = {
    user: demoMode ? user : user,
    session: demoMode ? session : session,
    profile,
    loading,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}