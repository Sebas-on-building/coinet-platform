import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/utils/api-config";

// ============================================================================
// TYPES - Railway Backend Compatible
// ============================================================================

// Must match backend Prisma schema UserTier enum
export type UserTier = "FREE" | "PRO" | "ENTERPRISE";

// User type compatible with rest of app (matches database.ts User interface)
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  // Extended Railway fields
  name?: string;
  role?: string;
  tier?: UserTier;
  avatar?: string;
}

// Session type for JWT token management
export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type: string;
  user: User;
}

// User profile (matches database.ts UserProfile interface)
export interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  // Extended Railway fields
  tier?: UserTier;
  role?: string;
}

// Railway API response types
interface RailwayUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  tier: UserTier;
  createdAt: string;
  avatar?: string;
  bio?: string;
  isVerified?: boolean;
}

interface RailwayLoginResponse {
  success: boolean;
  data?: {
    user: RailwayUser;
    token: string;
    expiresIn: string;
  };
  error?: string;
  message?: string;
}

interface RailwayUserResponse {
  success: boolean;
  data?: RailwayUser;
  error?: string;
  message?: string;
}

// ============================================================================
// AUTH CONTEXT
// ============================================================================

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

// ============================================================================
// TOKEN STORAGE
// ============================================================================

const TOKEN_KEY = "coinet_auth_token";
const USER_KEY = "coinet_user";

const TokenStorage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error("Failed to store token:", e);
    }
  },
  clearToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error("Failed to clear token:", e);
    }
  },
  getUser: (): User | null => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: User): void => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error("Failed to store user:", e);
    }
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapRailwayUserToUser(railwayUser: RailwayUser): User {
  return {
    id: railwayUser.id,
    email: railwayUser.email,
    name: railwayUser.name,
    role: railwayUser.role,
    tier: railwayUser.tier,
    avatar: railwayUser.avatar,
    created_at: railwayUser.createdAt,
    updated_at: railwayUser.createdAt,
    last_sign_in_at: new Date().toISOString(),
  };
}

function mapRailwayUserToProfile(railwayUser: RailwayUser): UserProfile {
  const nameParts = railwayUser.name?.split(" ") || [];
  return {
    id: railwayUser.id,
    email: railwayUser.email,
    first_name: nameParts[0] || undefined,
    last_name: nameParts.slice(1).join(" ") || undefined,
    avatar_url: railwayUser.avatar,
    bio: railwayUser.bio,
    tier: railwayUser.tier,
    role: railwayUser.role,
    created_at: railwayUser.createdAt,
    updated_at: railwayUser.createdAt,
  };
}

// ============================================================================
// AUTH PROVIDER COMPONENT
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoModeState] = useState(false);

  // Fetch current user from Railway backend
  const fetchCurrentUser = useCallback(async (token: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn("Failed to fetch user, token may be expired");
        TokenStorage.clearToken();
        return null;
      }

      const data: RailwayUserResponse = await response.json();

      if (data.success && data.data) {
        const mappedUser = mapRailwayUserToUser(data.data);
        const mappedProfile = mapRailwayUserToProfile(data.data);
        
        TokenStorage.setUser(mappedUser);
        setProfile(mappedProfile);
        
        return mappedUser;
      }

      return null;
    } catch (error) {
      console.error("Error fetching current user:", error);
      return null;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = TokenStorage.getToken();
      const storedUser = TokenStorage.getUser();

      if (token) {
        // Try to fetch fresh user data
        const freshUser = await fetchCurrentUser(token);
        
        if (freshUser) {
          setUser(freshUser);
          setSession({
            access_token: token,
            token_type: "bearer",
            user: freshUser,
          });
        } else if (storedUser) {
          // Fallback to stored user if fetch fails
          setUser(storedUser);
          setSession({
            access_token: token,
            token_type: "bearer",
            user: storedUser,
          });
        } else {
          // Token invalid, clear everything
          TokenStorage.clearToken();
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, [fetchCurrentUser]);

  // Sign in with email/password
  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      setLoading(true);
      
      // Try the user service auth endpoint
      // In dev: Vite proxy sends /auth/* to localhost:3000
      // In prod: API Gateway should route this correctly
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data: RailwayLoginResponse = await response.json();

      if (!response.ok || !data.success || !data.data) {
        const errorMessage = data.error || data.message || "Invalid email or password";
        toast.error("Authentication failed", {
          description: errorMessage,
        });
        return { error: new Error(errorMessage) };
      }
      
      // Store token
      TokenStorage.setToken(data.data.token);

      // Map and store user
      const mappedUser = mapRailwayUserToUser(data.data.user);
      const mappedProfile = mapRailwayUserToProfile(data.data.user);
      
      TokenStorage.setUser(mappedUser);
      setUser(mappedUser);
      setProfile(mappedProfile);
      setSession({
        access_token: data.data.token,
        token_type: "bearer",
        user: mappedUser,
      });

      toast.success("Welcome back!");
      return { error: null };
    } catch (error) {
      const err = error as Error;
      console.error("Sign in error:", err);
      toast.error("Sign in failed", {
        description: err.message || "Network error. Please try again.",
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email/password
  const signUp = async (
    email: string,
    password: string,
    metadata?: { display_name?: string }
  ): Promise<{ error: Error | null }> => {
    try {
      setLoading(true);
      
      // Try the user service auth endpoint
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        email,
        password,
          name: metadata?.display_name || undefined,
        }),
      });

      const data: RailwayLoginResponse = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error || data.message || "Registration failed";
        toast.error("Registration failed", {
          description: errorMessage,
        });
        return { error: new Error(errorMessage) };
      }
      
      // If registration returns a token, log the user in automatically
      if (data.data?.token) {
        TokenStorage.setToken(data.data.token);
        
        const mappedUser = mapRailwayUserToUser(data.data.user);
        const mappedProfile = mapRailwayUserToProfile(data.data.user);
        
        TokenStorage.setUser(mappedUser);
        setUser(mappedUser);
        setProfile(mappedProfile);
        setSession({
          access_token: data.data.token,
          token_type: "bearer",
          user: mappedUser,
        });

        toast.success("Welcome to Coinet AI!");
      } else {
        toast.success("Registration successful!", {
          description: "Please check your email to verify your account.",
        });
      }
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      console.error("Sign up error:", err);
      toast.error("Registration failed", {
        description: err.message || "Network error. Please try again.",
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      
      const token = TokenStorage.getToken();

      // Call logout endpoint (optional, for session invalidation)
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } catch {
          // Ignore logout API errors, still clear local state
        }
      }

      // Clear local state
      TokenStorage.clearToken();
      setUser(null);
      setSession(null);
      setProfile(null);
      
      toast.success("Signed out successfully");
      
      // Redirect to auth page
      window.location.href = "/auth";
    } catch (error) {
      console.error("Sign out error:", error);
      // Still clear local state even if API call fails
      TokenStorage.clearToken();
      setUser(null);
      setSession(null);
      setProfile(null);
      toast.success("Signed out successfully");
      window.location.href = "/auth";
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      setLoading(true);
      
      // Redirect to auth service OAuth endpoint
      // The auth service handles OAuth and redirects back with token
      const redirectUrl = encodeURIComponent(`${window.location.origin}/auth/callback`);
      window.location.href = `${API_BASE_URL}/auth/google?redirect=${redirectUrl}`;
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error("Google sign in failed", {
        description: err.message,
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with GitHub OAuth
  const signInWithGithub = async (): Promise<{ error: Error | null }> => {
    try {
      setLoading(true);
      
      // Redirect to auth service OAuth endpoint
      const redirectUrl = encodeURIComponent(`${window.location.origin}/auth/callback`);
      window.location.href = `${API_BASE_URL}/auth/github?redirect=${redirectUrl}`;
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error("GitHub sign in failed", {
        description: err.message,
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (
    updates: Partial<UserProfile>
  ): Promise<{ error: Error | null }> => {
    try {
      if (!user) {
        throw new Error("No authenticated user");
      }
      
      const token = TokenStorage.getToken();
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: [updates.first_name, updates.last_name].filter(Boolean).join(" ") || undefined,
          avatar: updates.avatar_url,
          bio: updates.bio,
        }),
        });
        
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "Profile update failed");
      }
      
      // Refresh user data
      const freshUser = await fetchCurrentUser(token);
      if (freshUser) {
        setUser(freshUser);
      }
      
      toast.success("Profile updated successfully");
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error("Profile update failed", {
        description: err.message,
      });
      return { error: err };
    }
  };

  // Demo mode for development/testing
  const setDemoMode = (enabled: boolean): void => {
    setDemoModeState(enabled);
    
    if (enabled) {
      const DEMO_USER_UUID = "00000000-0000-0000-0000-000000000001";
      
      const mockUser: User = {
        id: DEMO_USER_UUID,
        email: "demo@coinet.ai",
        name: "Demo User",
        role: "USER",
        tier: "FREE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
      };
      
      const mockSession: Session = {
        access_token: "demo-token",
        refresh_token: "demo-refresh",
        expires_at: Date.now() + 3600000,
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      };

      const mockProfile: UserProfile = {
        id: DEMO_USER_UUID,
        first_name: "Demo",
        last_name: "User",
        email: "demo@coinet.ai",
        avatar_url: undefined,
        bio: "Demo account for testing",
        tier: "FREE",
        role: "USER",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setUser(mockUser);
      setSession(mockSession);
      setProfile(mockProfile);
      setLoading(false);
      
      toast.success("Demo mode activated! 🚀");
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    session,
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

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ============================================================================
// UTILITIES FOR OTHER COMPONENTS
// ============================================================================

export { TokenStorage };
export type { AuthContextType };
