import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    proxy: {
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
