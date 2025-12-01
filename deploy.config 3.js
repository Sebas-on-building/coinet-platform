export default {
  // Domain configuration
  domain: "coinet.co",
  subdomains: ["api", "cdn", "docs"],

  // SSL configuration
  ssl: {
    provider: "letsencrypt",
    email: "admin@coinet.co",
    staging: false,
  },

  // DNS configuration
  dns: {
    provider: "cloudflare",
    records: [
      {
        type: "A",
        name: "@",
        value: "YOUR_SERVER_IP",
        ttl: 3600,
      },
      {
        type: "CNAME",
        name: "www",
        value: "coinet.co",
        ttl: 3600,
      },
      {
        type: "CNAME",
        name: "api",
        value: "api.coinet.co",
        ttl: 3600,
      },
      {
        type: "CNAME",
        name: "cdn",
        value: "cdn.coinet.co",
        ttl: 3600,
      },
    ],
  },

  // Server configuration
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },

  // Build configuration
  build: {
    output: "standalone",
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://coinet.co",
    },
  },
};
