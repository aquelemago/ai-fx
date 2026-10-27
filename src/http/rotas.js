// Rotas da API. Só traduzem HTTP ↔ serviço: validam a entrada, chamam o serviço e
// convertem erros em códigos de status. Nenhuma regra de negócio mora aqui.
import express from 'express';
import { validarIdFoto, validarNumeroDoQuadro, validarPedidoDeQuadro } from './validacao.js';

const STATUS_POR_CODIGO = {
  VALIDACAO: 400,
  BASE_AUSENTE: 409,
  MODELO_INDISPONIVEL: 503,
};

// Envolve um handler assíncrono e responde erros no formato { erro }
const tratar = (handler, log) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    const status = STATUS_POR_CODIGO[e.codigo] ?? 500;
    if (status === 500) log(e);
    res.status(status).json({ erro: e.message });
  }
};

export function criarRotasDaApi(servico, { log = console.error } = {}) {
  const api = express.Router();

  api.get('/status', (_req, res) => res.json(servico.status()));

  api.post('/base', express.raw({ type: 'image/*', limit: '30mb' }), tratar(async (req, res) => {
    if (!req.body?.length) return res.status(400).json({ erro: 'envie a foto no corpo do pedido' });
    res.json({ id: await servico.prepararBase(req.body) });
  }, log));

  api.post('/gerar', express.json(), tratar(async (req, res) => {
    const { png, ms } = await servico.gerarQuadro(validarPedidoDeQuadro(req.body));
    res.set('X-Tempo-Ms', String(ms)).type('png').send(png);
  }, log));

  // Quadro final (alinhado e com o rosto colado) vindo do navegador
  api.post('/salvar/:baseId/:quadro', express.raw({ type: 'image/png', limit: '10mb' }), tratar(async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ erro: 'envie o PNG no corpo do pedido' });
    await servico.salvarFinal(validarIdFoto(req.params.baseId), validarNumeroDoQuadro(req.params.quadro), req.body);
    res.status(204).end();
  }, log));

  return api;
}
