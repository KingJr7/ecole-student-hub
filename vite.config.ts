
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
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
  optimizeDeps: {
    exclude: ['@prisma/client'],
  },
  build: {
    // Générer des sourcemaps pour faciliter le débogage
    sourcemap: true,
    // Assurer que les assets sont correctement référencés
    assetsDir: 'assets',
    // Empêcher la minification pour des erreurs plus lisibles
    minify: mode === 'production',
    // Configurations pour améliorer la compatibilité avec Electron
    commonjsOptions: {
      // Permettre la transformation des modules mixtes (ESM et CommonJS)
      transformMixedEsModules: true,
      // Inclure des modules Node.js
      include: [
        /node_modules/,
      ]
    },
    rollupOptions: {
      // Assurer que les modules natifs ne sont pas inclus dans le build
      external: [
        'electron',
        'electron-settings',
        'node-machine-id',
        'sqlite3',
        'fs',
        'path',
        /^@prisma\/.*/,
        /^\.prisma\/.*/
      ],
      output: {
        // Assurer que les chemins sont relatifs (important pour Electron)
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  // Assurer que les assets statiques sont correctement gérés
  publicDir: 'public',
  // Configuration de base pour le chemin de base
  base: './'
}));
