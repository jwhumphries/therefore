import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../internal/static/dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "./src/main.tsx",
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      // Proxy all requests to Go backend except for Vite's own assets
      "^/(?!src|node_modules|@vite|@react-refresh|assets).*": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
