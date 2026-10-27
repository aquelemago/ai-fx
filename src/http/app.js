// Monta o app Express: arquivos estáticos da página, arquivos dos projetos e API.
import express from 'express';
import { criarRotasDaApi } from './rotas.js';
import { criarRotasDeProjetos } from './rotas-projetos.js';

export function criarApp({ servico, projetos, dirPublico, dirProjetos, dirMediapipe = [], log }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.static(dirPublico));
  for (const dir of dirMediapipe) app.use('/mediapipe', express.static(dir));
  // foto, quadros e vídeos de cada projeto, para a página reabrir um projeto
  if (dirProjetos) app.use('/arquivos', express.static(dirProjetos, { dotfiles: 'deny', index: false }));
  app.use('/api/projetos', criarRotasDeProjetos(projetos, { log }));
  app.use('/api', criarRotasDaApi(servico, { log }));
  return app;
}
