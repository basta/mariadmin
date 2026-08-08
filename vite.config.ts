import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app is served by api.py at /admin/, so the built asset URLs have to be
// absolute under that prefix. The old "./" worked only because the app was
// served from the root of its own dev server.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "/admin/",
  build: {
    sourcemap: mode === "development",
  },
  server: {
    host: true,
    // In development Vite serves the app and api.py serves everything else.
    // Proxying rather than pointing fetch at another origin keeps the session
    // cookie first-party, which is the whole reason there is no CORS.
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/images": "http://127.0.0.1:8000",
      "/assets": "http://127.0.0.1:8000",
    },
  },
}));
