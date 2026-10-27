// Middleware que serve a página: em desenvolvimento o Vite (JSX, CSS Modules e recarga na hora),
// em produção os arquivos já montados por `npm run build` em web/dist.
import path from 'node:path';
import express from 'express';

export async function criarPagina({ dirWeb, desenvolvimento, servidorHttp }) {
  if (!desenvolvimento) return express.static(path.join(dirWeb, 'dist'));
  const { createServer } = await import('vite'); // só existe com as dependências de desenvolvimento
  const vite = await createServer({
    configFile: path.join(dirWeb, '..', 'vite.config.js'),
    server: { middlewareMode: true, hmr: { server: servidorHttp } },
    appType: 'spa',
  });
  return vite.middlewares;
}
