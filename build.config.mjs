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
    // Other native modules
    'fsevents',
    'sharp',
  ],
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
  }
});