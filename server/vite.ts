import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration compatible pour __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  console.log("Configuration Vite en mode développement...");
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  try {
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          // Ne pas faire exit en production
          if (process.env.NODE_ENV !== "production") {
            process.exit(1);
          }
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);
    
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
        
        console.log("Recherche du template:", clientTemplate);
        
        if (!fs.existsSync(clientTemplate)) {
          console.error(`Template non trouvé: ${clientTemplate}`);
          // Essayer d'autres emplacements
          const altTemplates = [
            path.resolve(__dirname, "client", "index.html"),
            path.resolve(__dirname, "..", "..", "client", "index.html"),
            path.resolve(process.cwd(), "client", "index.html")
          ];
          
          let foundTemplate = null;
          for (const altTemplate of altTemplates) {
            if (fs.existsSync(altTemplate)) {
              foundTemplate = altTemplate;
              console.log(`Template trouvé à: ${altTemplate}`);
              break;
            }
          }
          
          if (!foundTemplate) {
            throw new Error(`Aucun template HTML trouvé. Vérifiez la structure des dossiers.`);
          }
          
          const template = await fs.promises.readFile(foundTemplate, "utf-8");
          const transformedTemplate = template.replace(
            `src="/src/main.tsx"`,
            `src="/src/main.tsx?v=${nanoid()}"`,
          );
          const page = await vite.transformIndexHtml(url, transformedTemplate);
          res.status(200).set({ "Content-Type": "text/html" }).end(page);
          return;
        }

        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
        
      } catch (e) {
        console.error("Erreur Vite:", e);
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
    
    console.log("Configuration Vite terminée avec succès");
    
  } catch (error) {
    console.error("Erreur lors de la configuration Vite:", error);
    throw error;
  }
}

export function serveStatic(app: Express) {
  console.log("Configuration en mode production (fichiers statiques)");
  
  // Essayer plusieurs emplacements pour les fichiers de build
  const possibleDistPaths = [
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "..", "dist", "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];
  
  let distPath = null;
  for (const possiblePath of possibleDistPaths) {
    console.log(`Vérification du chemin: ${possiblePath}`);
    if (fs.existsSync(possiblePath)) {
      distPath = possiblePath;
      console.log(`Dossier de build trouvé: ${distPath}`);
      break;
    }
  }

  if (!distPath) {
    console.error("Aucun dossier de build trouvé. Chemins vérifiés:");
    possibleDistPaths.forEach(p => console.error(`  - ${p}`));
    throw new Error(
      `Could not find the build directory. Make sure to build the client first with 'npm run build'`
    );
  }

  app.use(express.static(distPath));

  // Fallback vers index.html pour les routes SPA
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath!, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Application not found. Please build the client first.");
    }
  });
  
  console.log("Configuration des fichiers statiques terminée");
}