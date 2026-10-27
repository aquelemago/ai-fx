// Página (web/): em desenvolvimento o Express monta o Vite como middleware (src/http/pagina.js);
// `npm run build` gera web/dist, que o Express serve com NODE_ENV=production.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const raiz = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(raiz, 'web'),
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/teste/preparar.js'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
