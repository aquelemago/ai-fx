// Monta o app Express: arquivos estáticos da página + API.
import express from 'express';
import { criarRotasDaApi } from './rotas.js';

export function criarApp({ servico, dirPublico, dirMediapipe = [], log }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.static(dirPublico));
  for (const dir of dirMediapipe) app.use('/mediapipe', express.static(dir));
  app.use('/api', criarRotasDaApi(servico, { log }));
  return app;
}
