import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: true,
  },
  build: {
    sourcemap: mode === "development",
  },
  // This allows to have sourcemaps in production. They are not loaded unless you open the devtools
  // Remove this line if you don't need to debug react-admin in production
  base: "./",
}));