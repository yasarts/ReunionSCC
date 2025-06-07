import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuration pour les WebSockets
neonConfig.webSocketConstructor = ws;

// Debug des variables d'environnement
console.log("=== DEBUG DATABASE CONFIG ===");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? `présente (${process.env.DATABASE_URL.substring(0, 20)}...)` : "manquante");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("============================");

if (!process.env.DATABASE_URL) {
  console.error("ERREUR: Variable d'environnement DATABASE_URL manquante");
  console.error("Variables disponibles:", Object.keys(process.env).filter(k => k.includes('DATABASE')));
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuration de la connexion avec gestion d'erreurs
let pool: Pool;
let db: ReturnType<typeof drizzle>;

try {
  console.log("Initialisation de la connexion à la base de données...");
  
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    // Configuration additionnelle pour la stabilité
    max: 10, // Maximum 10 connexions dans le pool
    idleTimeoutMillis: 30000, // 30 secondes avant de fermer une connexion inactive
    connectionTimeoutMillis: 2000, // 2 secondes de timeout pour établir une connexion
  });

  db = drizzle({ 
    client: pool, 
    schema,
    logger: process.env.NODE_ENV === 'development' // Logs SQL en développement seulement
  });

  console.log("Connexion à la base de données initialisée avec succès");

  // Test de connexion simple
  if (process.env.NODE_ENV !== 'production') {
    pool.query('SELECT NOW()')
      .then(() => console.log("Test de connexion à la base de données réussi"))
      .catch((error) => console.error("Erreur lors du test de connexion:", error));
  }

} catch (error) {
  console.error("Erreur lors de l'initialisation de la base de données:", error);
  throw error;
}

// Gestion propre de la fermeture des connexions
process.on('SIGINT', async () => {
  console.log('Fermeture propre des connexions de base de données...');
  try {
    await pool.end();
    console.log('Connexions fermées');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la fermeture des connexions:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Signal SIGTERM reçu, fermeture des connexions...');
  try {
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la fermeture des connexions:', error);
    process.exit(1);
  }
});

export { pool, db };