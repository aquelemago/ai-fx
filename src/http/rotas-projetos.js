// Rotas de projetos (/api/projetos). Só traduzem HTTP ↔ ServicoDeProjetos.
import express from 'express';
import { validarIdDoProjeto, validarMudancas, validarNome } from '../projetos/manifesto.js';
import { ErroDeValidacao, validarNumeroDoQuadro } from './validacao.js';
import { tratar } from './tratar.js';

const binario = (tipo, limit) => express.raw({ type: tipo, limit });

const exigirCorpo = (req) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) throw new ErroDeValidacao('envie o arquivo no corpo do pedido');
  return req.body;
};

const extensaoDoVideo = (tipo = '') => {
  if (tipo.startsWith('video/mp4')) return 'mp4';
  if (tipo.startsWith('video/webm')) return 'webm';
  throw new ErroDeValidacao('o vídeo precisa ser MP4 ou WebM');
};

export function criarRotasDeProjetos(projetos, { log = console.error } = {}) {
  const r = express.Router();
  const id = (req) => validarIdDoProjeto(req.params.id);

  r.get('/', tratar(async (_req, res) => res.json(await projetos.listar()), log));

  r.post('/', express.json(), tratar(async (req, res) => {
    res.status(201).json(await projetos.criar(validarNome(req.body?.nome)));
  }, log));

  r.get('/:id', tratar(async (req, res) => res.json(await projetos.ler(id(req))), log));

  r.patch('/:id', express.json({ limit: '1mb' }), tratar(async (req, res) => {
    res.json(await projetos.atualizar(id(req), validarMudancas(req.body)));
  }, log));

  r.delete('/:id', tratar(async (req, res) => {
    await projetos.excluir(id(req));
    res.status(204).end();
  }, log));

  r.put('/:id/foto', binario('image/png', '30mb'), tratar(async (req, res) => {
    res.json(await projetos.definirFoto(id(req), exigirCorpo(req)));
  }, log));

  r.delete('/:id/quadros', tratar(async (req, res) => {
    res.json(await projetos.limparQuadros(id(req)));
  }, log));

  r.put('/:id/quadros/:indice', binario('image/png', '10mb'), tratar(async (req, res) => {
    await projetos.salvarFinal(id(req), validarNumeroDoQuadro(req.params.indice), exigirCorpo(req));
    res.status(204).end();
  }, log));

  r.post('/:id/videos', binario('video/*', '300mb'), tratar(async (req, res) => {
    const arquivo = await projetos.salvarVideo(id(req), extensaoDoVideo(req.get('content-type')), exigirCorpo(req));
    res.status(201).json({ arquivo });
  }, log));

  return r;
}
