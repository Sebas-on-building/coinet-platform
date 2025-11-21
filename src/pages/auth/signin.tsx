import React, { useState } from "react";
import { useAuthUI } from "@/contexts/AuthUIContext";
import { signIn, getProviders } from "next-auth/react";
import Head from "next/head";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Flex } from "@/components/layout/Flex";
import { Spacer } from "@/components/layout/Spacer";
import { ProviderButton } from "@/components/ui/ProviderButton";
import { ConsentModal } from "@/components/ui/ConsentModal";
import { FaGithub, FaDiscord, FaLinkedin } from "react-icons/fa";
import { GetServerSideProps } from "next";

const providerIcons: Record<string, JSX.Element> = {
  google: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <g>
        <path
          fill="#4285F4"
          d="M21.805 10.023h-9.765v3.955h5.627c-.243 1.3-1.47 3.818-5.627 3.818-3.386 0-6.145-2.803-6.145-6.25s2.759-6.25 6.145-6.25c1.927 0 3.222.82 3.963 1.527l2.713-2.64C17.09 2.98 14.97 2 12.04 2 6.477 2 2 6.477 2 12s4.477 10 10.04 10c5.77 0 9.56-4.04 9.56-9.75 0-.65-.07-1.15-.16-1.627z"
        />
        <path
          fill="#34A853"
          d="M3.153 7.345l3.285 2.409C7.5 8.13 9.57 6.545 12.04 6.545c1.927 0 3.222.82 3.963 1.527l2.713-2.64C17.09 2.98 14.97 2 12.04 2 8.24 2 4.97 4.29 3.153 7.345z"
        />
        <path
          fill="#FBBC05"
          d="M12.04 22c2.93 0 5.05-.98 6.73-2.67l-3.09-2.53c-.86.58-2.02.99-3.64.99-2.8 0-5.17-1.89-6.02-4.44l-3.22 2.49C4.97 19.71 8.24 22 12.04 22z"
        />
        <path
          fill="#EA4335"
          d="M21.805 10.023h-9.765v3.955h5.627c-.243 1.3-1.47 3.818-5.627 3.818-3.386 0-6.145-2.803-6.145-6.25s2.759-6.25 6.145-6.25c1.927 0 3.222.82 3.963 1.527l2.713-2.64C17.09 2.98 14.97 2 12.04 2 6.477 2 2 6.477 2 12s4.477 10 10.04 10c5.77 0 9.56-4.04 9.56-9.75 0-.65-.07-1.15-.16-1.627z"
        />
      </g>
    </svg>
  ),
  apple: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path
        fill="#000"
        d="M16.365 1.43c0 1.14-.93 2.07-2.07 2.07-.04 0-.08 0-.12-.01-.02-.04-.03-.09-.03-.14 0-1.13.92-2.05 2.05-2.05.05 0 .09.01.13.02.01.04.02.09.02.14zm2.13 4.13c-1.13-.13-2.08.62-2.62.62-.54 0-1.38-.6-2.28-.58-.88.01-1.7.51-2.16 1.3-.93 1.61-.24 3.99.67 5.3.45.66.98 1.4 1.68 1.37.67-.03.93-.44 1.74-.44.8 0 1.04.44 1.74.43.71-.01 1.16-.67 1.6-1.33.5-.73.7-1.44.71-1.48-.02-.01-1.36-.52-1.38-2.07-.01-1.29 1.05-1.91 1.1-1.94-.6-.87-1.54-.97-1.87-.98zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02zm-2.13 1.13c.01.01.01.01.01.02 0-.01 0-.01-.01-.02z"
      />
    </svg>
  ),
  twitter: (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path
        fill="#1DA1F2"
        d="M22.46 5.924c-.793.352-1.645.59-2.54.697a4.48 4.48 0 0 0 1.963-2.475 8.94 8.94 0 0 1-2.828 1.082A4.48 4.48 0 0 0 16.11 4c-2.48 0-4.49 2.01-4.49 4.49 0 .35.04.69.11 1.01C7.69 9.36 4.07 7.57 1.64 4.95c-.38.65-.6 1.4-.6 2.2 0 1.52.77 2.86 1.94 3.65-.72-.02-1.4-.22-1.99-.55v.06c0 2.13 1.52 3.91 3.54 4.31-.37.1-.76.16-1.16.16-.28 0-.55-.03-.81-.08.55 1.72 2.16 2.97 4.07 3-1.49 1.17-3.36 1.87-5.4 1.87-.35 0-.7-.02-1.04-.06C2.29 21.29 5.01 22 7.92 22c9.5 0 14.7-7.87 14.7-14.7 0-.22 0-.43-.02-.65.99-.72 1.85-1.62 2.53-2.65z"
      />
    </svg>
  ),
  github: <FaGithub className="w-6 h-6 text-black dark:text-white" />,
  discord: <FaDiscord className="w-6 h-6 text-indigo-500" />,
  linkedin: <FaLinkedin className="w-6 h-6 text-blue-700" />,
  credentials: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 20C18 17.7909 15.3137 16 12 16C8.68629 16 6 17.7909 6 20" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// Add a mapping of provider scopes and descriptions
const providerScopes: Record<string, { label: string; description: string }[]> =
{
  google: [
    { label: "openid", description: "Authenticate with your Google account" },
    { label: "email", description: "Access your email address" },
    { label: "profile", description: "Access your basic profile info" },
  ],
  apple: [
    { label: "name", description: "Access your name" },
    { label: "email", description: "Access your email address" },
  ],
  twitter: [
    { label: "tweet.read", description: "Read your tweets" },
    { label: "users.read", description: "Read your profile info" },
    { label: "email", description: "Access your email address" },
    { label: "offline.access", description: "Access when you are offline" },
  ],
  github: [
    { label: "read:user", description: "Read your GitHub profile" },
    { label: "user:email", description: "Access your email address" },
  ],
  discord: [
    {
      label: "identify",
      description: "Access your Discord username and avatar",
    },
    { label: "email", description: "Access your email address" },
  ],
  linkedin: [
    {
      label: "r_liteprofile",
      description: "Access your basic LinkedIn profile",
    },
    { label: "r_emailaddress", description: "Access your email address" },
  ],
  credentials: [
    { label: "username", description: "Use your username to sign in" },
    { label: "password", description: "Use your password to sign in" },
  ],
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const providers = await getProviders();
  return {
    props: { providers: providers || {} },
  };
};

const SignIn = ({ providers }: any) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [showConsentScreen, setShowConsentScreen] = useState(false);
  const [consentProvider, setConsentProvider] = useState<string | null>(null);
  const [consentScopes, setConsentScopes] = useState<
    { label: string; description: string }[]
  >([]);
  const { triggerAccountLinking } = useAuthUI();
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);
  const [demoUsername, setDemoUsername] = useState("demo");
  const [demoPassword, setDemoPassword] = useState("demo");

  const handleSignIn = async (providerId: string) => {
    setLoading(providerId);

    if (providerId === "credentials") {
      setShowDemoCredentials(true);
      setLoading(null);
      return;
    }

    openConsentModal(providerId);
  };

  const handleDemoSignIn = async () => {
    setLoading("credentials");
    await signIn("credentials", {
      username: demoUsername,
      password: demoPassword,
      callbackUrl: "/"
    });
  };

  const openConsentModal = (providerId: string) => {
    setConsentProvider(providerId);
    setConsentScopes(providerScopes[providerId] || []);
    setShowConsentScreen(true);
  };

  const handleConsentAccept = async () => {
    if (consentProvider) {
      setShowConsentScreen(false);
      await signIn(consentProvider);
    }
  };

  // Demo login form
  const DemoLoginForm = () => (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      marginTop: 'var(--space-md)'
    }}>
      <h3 style={{
        fontSize: 'var(--font-size-lg)',
        fontWeight: 600,
        marginBottom: 'var(--space-md)',
        color: 'var(--color-text-primary)'
      }}>
        Development Login
      </h3>
      <p style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--space-md)'
      }}>
        Use these credentials for development testing
      </p>
      <Flex direction="column" gap="var(--space-md)">
        <div>
          <label style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-xs)',
            color: 'var(--color-text-secondary)'
          }}>
            Username
          </label>
          <input
            type="text"
            value={demoUsername}
            onChange={(e) => setDemoUsername(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-base)'
            }}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-xs)',
            color: 'var(--color-text-secondary)'
          }}>
            Password
          </label>
          <input
            type="password"
            value={demoPassword}
            onChange={(e) => setDemoPassword(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--font-size-base)'
            }}
          />
        </div>
        <button
          onClick={handleDemoSignIn}
          disabled={loading === "credentials"}
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-accent-blue)',
            color: 'white',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontSize: 'var(--font-size-base)',
            marginTop: 'var(--space-xs)'
          }}
        >
          {loading === "credentials" ? "Signing in..." : "Sign In"}
        </button>
      </Flex>
    </div>
  );

  return (
    <>
      <Head>
        <title>Sign in to Coinet</title>
      </Head>
      <Container size="sm" center background="var(--color-surface)" radius="var(--radius-2xl)" shadow="var(--shadow-glass)">
        <Section background="transparent" padding="0" margin="0">
          <Flex direction="column" align="center" gap="var(--space-2xl)">
            <img src="/logo.svg" alt="Coinet Logo" style={{ width: 64, height: 64 }} />
            <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-accent-blue)', marginBottom: 0 }}>Sign In</h1>
            <Spacer size="md" />
            <Flex direction="column" gap="var(--space-md)" style={{ width: '100%' }}>
              {providers && Object.keys(providers).length > 0 ? (
                Object.values(providers).map((provider: any) => (
                  <ProviderButton
                    key={provider.id}
                    id={provider.id}
                    name={provider.name}
                    icon={providerIcons[provider.id] || null}
                    loading={loading === provider.id}
                    onClick={() => handleSignIn(provider.id)}
                    aria-label={`Sign in with ${provider.name}`}
                    fullWidth
                    disabled={!!loading}
                  />
                ))
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-md)" }}>
                  <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-lg)' }}>
                    No authentication providers configured.
                  </div>
                  <button
                    onClick={() => handleSignIn("credentials")}
                    style={{
                      padding: 'var(--space-sm) var(--space-lg)',
                      backgroundColor: 'var(--color-accent-blue)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Use Development Login
                  </button>
                </div>
              )}

              {showDemoCredentials && <DemoLoginForm />}
            </Flex>
            <Spacer size="sm" />
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 'var(--space-md)' }}>
              By signing in, you agree to our{' '}
              <a href="/terms" style={{ textDecoration: 'underline', color: 'var(--color-accent-blue)' }}>Terms of Service</a> and{' '}
              <a href="/privacy" style={{ textDecoration: 'underline', color: 'var(--color-accent-blue)' }}>Privacy Policy</a>.
            </div>
          </Flex>
        </Section>
      </Container>
      <ConsentModal
        open={showConsentScreen}
        onAccept={handleConsentAccept}
        onClose={() => setShowConsentScreen(false)}
        provider={consentProvider || ''}
        scopes={consentScopes}
      />
    </>
  );
};

export default SignIn;
