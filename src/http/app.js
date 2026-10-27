// Monta o app Express: arquivos dos projetos, API e, por último, a página (middleware `pagina`).
import express from 'express';
import { criarRotasDaApi } from './rotas.js';
import { criarRotasDeProjetos } from './rotas-projetos.js';

export function criarApp({ servico, projetos, pagina, dirProjetos, dirMediapipe = [], log }) {
  const app = express();
  app.disable('x-powered-by');
  for (const dir of dirMediapipe) app.use('/mediapipe', express.static(dir));
  // foto, quadros e vídeos de cada projeto, para a página reabrir um projeto
  if (dirProjetos) app.use('/arquivos', express.static(dirProjetos, { dotfiles: 'deny', index: false }));
  app.use('/api/projetos', criarRotasDeProjetos(projetos, { log }));
  app.use('/api', criarRotasDaApi(servico, { log }));
  if (pagina) app.use(pagina);
  return app;
}
