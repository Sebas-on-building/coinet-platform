import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    // Dev/preview only: allow the external preview host (e.g. *.vercel.run) to
    // reach the dev server. Vite blocks unknown Host headers by default.
    // This affects only the dev server, never the production build.
    allowedHosts: true,
    proxy: {
      // Dev-only: the additive /api/market-regime route isn't on production
      // api.coinet.ai yet (it lives on this branch). When VITE_REGIME_PROXY is
      // set, route just that path to the local regime harness; everything else
      // hits the real production backend.
      ...(process.env.VITE_REGIME_PROXY
        ? {
            "/api/market-regime": {
              target: process.env.VITE_REGIME_PROXY,
              changeOrigin: true,
              secure: false,
            },
          }
        : {}),
      // Dev-only proxy to dodge CORS while pointing at a local backend.
      // In production we hit VITE_API_URL (https://api.coinet.ai) directly.
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "https://api.coinet.ai",
        changeOrigin: true,
        secure: true,
        ws: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
