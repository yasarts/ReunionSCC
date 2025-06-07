import { build } from 'esbuild';

await build({
  entryPoints: ['server/index.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  packages: 'external',
  external: [
    // WebSocket libraries
    'ws',
    'bufferutil',
    'utf-8-validate',
    // Database libraries
    '@neondatabase/serverless',
    'pg',
    'pg-native',
    'pg-cloudflare',
    // Drizzle ORM
    'drizzle-orm',
    'drizzle-kit',
    // Other native modules
    'fsevents',
    'sharp',
    // Session store
    'memorystore',
    // Express and related
    'express',
    'express-session',
    // Crypto and auth
    'bcrypt',
    'jsonwebtoken',
    // Email
    '@getbrevo/brevo',
    // Other utilities
    'nanoid',
    'zod'
  ],
  define: {
    'global': 'globalThis'
  },
  // Supprimer le banner qui cause le conflit
  // banner: { ... }
});

console.log('✅ Server build completed successfully');