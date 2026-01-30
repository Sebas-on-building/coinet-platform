/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'coinet.co' },
      { protocol: 'https', hostname: 'randomuser.me' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
    ],
    // Keep domains for backward compatibility
    domains: ["coinet.co", "randomuser.me", "img.clerk.com", "images.clerk.dev"],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.accounts.dev; style-src 'self' 'unsafe-inline'; img-src * data: blob:; connect-src * https://*.clerk.accounts.dev wss://*.clerk.accounts.dev; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.clerk.accounts.dev; worker-src 'self' blob:; child-src 'self' blob: https://*.clerk.accounts.dev;"
          },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // HSTS
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Referrer Policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions Policy
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          // XSS Protection
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // MIME Sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
  experimental: {
    // Enable server components if needed
    // serverComponents: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Set root directory to project root so Turbopack can find Next.js package
    root: process.cwd(),
  },
  // Keep webpack for compatibility, but Turbopack will be used
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
}; 