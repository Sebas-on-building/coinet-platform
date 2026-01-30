import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Github, Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { toast } from "sonner";
import coinetLogo from "@/assets/coinet-logo.png";

export function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
  });

  const [signUpForm, setSignUpForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInForm.email || !signInForm.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signIn(signInForm.email, signInForm.password);
      
      if (!error) {
        // Redirect will happen automatically via auth state change
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpForm.email || !signUpForm.password || !signUpForm.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (signUpForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await signUp(signUpForm.email, signUpForm.password, {
        display_name: signUpForm.displayName
      });
      
      if (!error) {
        // Switch to sign in tab after successful registration
        setActiveTab("signin");
        // Reset form
        setSignUpForm({
          email: "",
          password: "",
          confirmPassword: "",
          displayName: "",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGithub();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] space-y-6">
        {/* Minimal Logo Header */}
        <div className="flex items-center justify-center space-x-2">
          <img src={coinetLogo} alt="Coinet AI" className="w-10 h-10 object-contain" />
          <span className="text-xl font-semibold text-foreground">Coinet AI</span>
        </div>

        {/* Auth Card */}
        <Card className="border-border/40 shadow-lg bg-card">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">Get started</CardTitle>
            <CardDescription className="text-base">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="signin" className="text-sm font-medium">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-sm font-medium">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin" className="space-y-6">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signInForm.email}
                        onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-11 h-12"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={signInForm.password}
                        onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-11 h-12"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-6">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="signup-name" className="text-sm font-medium">Display Name (Optional)</Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your display name"
                        value={signUpForm.displayName}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, displayName: e.target.value }))}
                        className="pl-11 h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signUpForm.email}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-11 h-12"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={signUpForm.password}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-11 h-12"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        value={signUpForm.confirmPassword}
                        onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="pl-11 h-12"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, hsl(282 70% 55%), hsl(192 80% 50%))',
                      color: 'white'
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

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
              <Button 
                variant="outline" 
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="h-12 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button 
                variant="outline" 
                onClick={handleGithubSignIn}
                disabled={isLoading}
                className="h-12 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
            </div>

          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our{" "}
          <button className="underline hover:text-foreground transition-colors">
            Terms of Service
          </button>
          {" "}and{" "}
          <button className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}