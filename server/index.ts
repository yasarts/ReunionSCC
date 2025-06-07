import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration compatible pour __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function serveStatic(app: express.Express) {
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // En production, servir uniquement les fichiers statiques
  serveStatic(app);

  // ALWAYS serve the app on port 5000
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();