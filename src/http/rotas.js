// Rotas de geração (/api). Só traduzem HTTP ↔ serviço: validam a entrada, chamam o serviço e
// convertem erros em códigos de status. Nenhuma regra de negócio mora aqui.
import express from 'express';
import { validarPedidoDeQuadro, validarPedidoDeRosto } from './validacao.js';
import { tratar } from './tratar.js';

export function criarRotasDaApi(servico, { log = console.error } = {}) {
  const api = express.Router();

  api.get('/status', (_req, res) => res.json(servico.status()));

  // Imagem de partida avulsa (ex.: quadro composto para o repasse do rosto). Não é gravada em disco.
  api.post('/base', express.raw({ type: 'image/*', limit: '30mb' }), tratar(async (req, res) => {
    if (!req.body?.length) return res.status(400).json({ erro: 'envie a foto no corpo do pedido' });
    res.json({ id: await servico.prepararBase(req.body) });
  }, log));

  api.post('/gerar', express.json(), tratar(async (req, res) => {
    const { png, ms } = await servico.gerarQuadro(validarPedidoDeQuadro(req.body));
    res.set('X-Tempo-Ms', String(ms)).type('png').send(png);
  }, log));

  api.post('/rosto', express.json(), tratar(async (req, res) => {
    const { png, ms } = await servico.gerarRosto(validarPedidoDeRosto(req.body));
    res.set('X-Tempo-Ms', String(ms)).type('png').send(png);
  }, log));

  return api;
}
