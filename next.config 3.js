/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  images: {
    domains: ["coinet.co", "randomuser.me"],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src * data:; connect-src *; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
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
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
}; 