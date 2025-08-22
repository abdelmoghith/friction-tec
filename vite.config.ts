import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3001';
  
  return {
    base: "./", // Important for Electron
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/fournisseurs': apiBaseUrl,
        '/api': apiBaseUrl,
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
