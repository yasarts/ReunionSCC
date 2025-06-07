import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration compatible pour __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fonction pour charger conditionnellement les plugins Replit
async function getOptionalPlugins() {
  const plugins = [];
  
  // Seulement en environnement Replit
  if (process.env.REPL_ID) {
    try {
      const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal").catch(() => null);
      if (runtimeErrorOverlay) {
        plugins.push(runtimeErrorOverlay.default());
      }
      
      if (process.env.NODE_ENV !== "production") {
        const cartographer = await import("@replit/vite-plugin-cartographer").catch(() => null);
        if (cartographer) {
          plugins.push(cartographer.cartographer());
        }
      }
    } catch (error) {
      console.warn("Plugins Replit non disponibles, continuons sans eux");
    }
  }
  
  return plugins;
}

export default defineConfig(async () => {
  const optionalPlugins = await getOptionalPlugins();
  
  return {
    plugins: [
      react(),
      ...optionalPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});