import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import TwitterProvider from "next-auth/providers/twitter";
import GitHubProvider from "next-auth/providers/github";
import DiscordProvider from "next-auth/providers/discord";
import LinkedInProvider from "next-auth/providers/linkedin";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "../../../generated/prisma-client";

const prisma = new PrismaClient();

// Enhanced: Utility to get dynamic scopes for a user/provider
function getDynamicScopes(user: any, provider: string): string {
  const defaultScopes: Record<string, string[]> = {
    google: ["openid", "email", "profile"],
    apple: ["name", "email"],
    twitter: ["tweet.read", "users.read", "email", "offline.access"],
    github: ["read:user", "user:email"],
    discord: ["identify", "email"],
    linkedin: ["r_liteprofile", "r_emailaddress"],
  };
  let scopes = [...(defaultScopes[provider] || [])];
  if (user) {
    // Admins get extra scopes
    if (user.role === "admin" || (user.roles && user.roles.includes("admin"))) {
      if (provider === "google")
        scopes.push("https://www.googleapis.com/auth/admin.directory.user");
      if (provider === "github") scopes.push("admin:org");
      // Add more as needed
    }
    // Feature flags
    if (Array.isArray(user.featureFlags)) {
      if (
        user.featureFlags.includes("extended_profile") &&
        provider === "google"
      ) {
        scopes.push("https://www.googleapis.com/auth/user.birthday.read");
      }
      // Add more feature-flag-driven scopes here
    }
    // Admin overrides
    if (user.scopeOverrides && user.scopeOverrides[provider]) {
      scopes = [...user.scopeOverrides[provider]];
    }
  }
  // Remove duplicates
  scopes = Array.from(new Set(scopes));
  return scopes.join(" ");
}

// Helper to get provider authorization config synchronously
function getProviderAuthorization(provider: string, user?: any) {
  const scope = getDynamicScopes(user, provider);
  return { params: { scope } };
}

// Create an array of provider configurations based on available environment variables
function getConfiguredProviders() {
  const providers = [];

  // Always add credentials provider for development
  if (process.env.NODE_ENV === "development") {
    providers.push(
      CredentialsProvider({
        name: "Development Credentials",
        credentials: {
          username: { label: "Username", type: "text", placeholder: "demo" },
          password: { label: "Password", type: "password", placeholder: "demo" }
        },
        async authorize(credentials) {
          // Dev mode - return a mock user
          if (credentials?.username === "demo" && credentials?.password === "demo") {
            return {
              id: "dev-user-1",
              name: "Demo User",
              email: "demo@example.com",
              image: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
            };
          }
          return null;
        }
      })
    );
  }

  // Add OAuth providers only if they have credentials configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: getProviderAuthorization("google"),
      })
    );
  }

  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    providers.push(
      AppleProvider({
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: process.env.APPLE_CLIENT_SECRET,
        authorization: getProviderAuthorization("apple"),
      })
    );
  }

  if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
    providers.push(
      TwitterProvider({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
        version: "2.0",
        authorization: getProviderAuthorization("twitter"),
      })
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        authorization: getProviderAuthorization("github"),
      })
    );
  }

  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    providers.push(
      DiscordProvider({
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        authorization: getProviderAuthorization("discord"),
      })
    );
  }

  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    providers.push(
      LinkedInProvider({
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        authorization: getProviderAuthorization("linkedin"),
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: getConfiguredProviders(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // For development credentials, skip account linking
      if (account?.provider === "credentials") {
        return true;
      }

      // Account linking: merge on matching email
      if (account && user && user.email) {
        // Find existing user by email
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (existingUser) {
          // Check if provider is already linked
          const linkedAccount = await prisma.account.findFirst({
            where: {
              userId: existingUser.id,
              provider: account.provider,
            },
          });
          if (!linkedAccount) {
            // Link new provider to existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                type: account.type,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            });
            // Store consented scopes in DB (example: user.consent)
            await prisma.consent.upsert({
              where: {
                userId_provider: {
                  userId: existingUser.id,
                  provider: account.provider,
                },
              },
              update: {
                scopes: account.scope || "",
                scopesJson: account.scope ? account.scope.split(" ") : [],
                perScopeStatus: account.scope
                  ? Object.fromEntries(
                    account.scope.split(" ").map((s) => [s, "approved"]),
                  )
                  : {},
                consentedAt: new Date(),
              },
              create: {
                userId: existingUser.id,
                provider: account.provider,
                scopes: account.scope || "",
                scopesJson: account.scope ? account.scope.split(" ") : [],
                perScopeStatus: account.scope
                  ? Object.fromEntries(
                    account.scope.split(" ").map((s) => [s, "approved"]),
                  )
                  : {},
                consentedAt: new Date(),
              },
            });
            // Audit trail: log consent event
            await prisma.auditLog.create({
              data: {
                userId: existingUser.id,
                event: "CONSENT",
                provider: account.provider,
                scopes: account.scope || "",
                timestamp: new Date(),
                details: JSON.stringify({
                  action: "consent",
                  provider: account.provider,
                  scopes: account.scope,
                }),
              },
            });
            // Optionally, set a flag for frontend confirmation
            (user as any).needsLinkingConfirmation = true;
            (user as any).showConsentScreen = true;
            // Log event
            console.log(
              `[Account Linking] Linked ${account.provider} to user ${user.email}`,
            );
          }
        }
      }
      return true;
    },
    async session({ session, token, user }) {
      // Add user id and provider info to session
      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).provider = token.provider;
        if (token.needsLinkingConfirmation) {
          (session.user as any).needsLinkingConfirmation = true;
        }
        if (token.showConsentScreen) {
          (session.user as any).showConsentScreen = true;
        }
        session.user.role = user.role;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Add provider info and linking flag to JWT
      if (account) {
        token.provider = account.provider;
      }
      if (user && (user as any).needsLinkingConfirmation) {
        token.needsLinkingConfirmation = true;
      }
      if (user && (user as any).showConsentScreen) {
        token.showConsentScreen = true;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Custom redirect after sign-in
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: "/auth/signin", // Custom sign-in page
    error: "/auth/error",
    newUser: "/auth/onboarding",
  },
  events: {
    async signIn(message) {
      // Log sign-in event, analytics, etc.
    },
    async createUser(message) {
      // Log new user event, onboarding, etc.
    },
  },
  theme: {
    colorScheme: "auto",
    brandColor: "#6366f1",
    logo: "/logo.svg",
  },
  // Set a secret for development
  secret: process.env.NEXTAUTH_SECRET || "development_secret_do_not_use_in_production",
  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);
