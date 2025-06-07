import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration compatible pour __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fonction pour charger les plugins Replit conditionnellement
async function getReplitPlugins() {
  if (process.env.NODE_ENV === "production" || process.env.REPL_ID === undefined) {
    return [];
  }
  
  try {
    // Essayer de charger les plugins Replit seulement s'ils sont disponibles
    const [runtimeErrorOverlay, cartographer] = await Promise.all([
      import("@replit/vite-plugin-runtime-error-modal").catch(() => null),
      import("@replit/vite-plugin-cartographer").catch(() => null)
    ]);
    
    const plugins = [];
    if (runtimeErrorOverlay) {
      plugins.push(runtimeErrorOverlay.default());
    }
    if (cartographer) {
      plugins.push(cartographer.cartographer());
    }
    
    return plugins;
  } catch (error) {
    console.warn("Replit plugins not available, continuing without them");
    return [];
  }
}

export default defineConfig(async () => {
  const replitPlugins = await getReplitPlugins();
  
  return {
    plugins: [
      react(),
      ...replitPlugins,
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
