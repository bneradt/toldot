import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: true,
    // This is intentionally one startup bundle: interactions never trigger a
    // lazy chunk or data request after the application is ready.
    chunkSizeWarningLimit: 1100,
  },
});
