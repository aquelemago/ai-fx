// Validação dos pedidos que chegam pela API. Tudo que entra no gerador passa por aqui:
// tipos conferidos, números limitados e textos com tamanho máximo.

import { ErroDeValidacao } from '../util/erros.js';

export { ErroDeValidacao };
import { validarIdDoProjeto } from '../projetos/manifesto.js';

const ID_FOTO = /^[0-9a-f]{12}$/;

const texto = (v, campo, vazio = false) => {
  if (typeof v !== 'string' || (!vazio && !v.trim())) throw new ErroDeValidacao(`${campo} precisa ser um texto`);
  if (v.length > 1000) throw new ErroDeValidacao(`${campo} passa de 1000 caracteres`);
  return v;
};
const numero = (v, campo, min, max, padrao) => {
  if (v === undefined) return padrao;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ErroDeValidacao(`${campo} precisa ser um número`);
  return Math.min(max, Math.max(min, v));
};
const inteiro = (v, campo, padrao) => {
  if (v === undefined) return padrao;
  if (!Number.isInteger(v)) throw new ErroDeValidacao(`${campo} precisa ser um número inteiro`);
  return v;
};

export function validarIdFoto(v) {
  if (typeof v !== 'string' || !ID_FOTO.test(v)) throw new ErroDeValidacao('id de foto inválido');
  return v;
}

export function validarNumeroDoQuadro(v) {
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
  if (!Number.isInteger(n) || n < 0 || n > 9999) throw new ErroDeValidacao('número de quadro inválido');
  return n;
}

/** Pedido de um rosto novo: descrição da pessoa (em inglês) e semente. */
export function validarPedidoDeRosto(corpo) {
  if (!corpo || typeof corpo !== 'object') throw new ErroDeValidacao('corpo do pedido ausente');
  const descricao = corpo.descricao === undefined ? 'a person' : texto(corpo.descricao, 'descricao');
  if (descricao.length > 300) throw new ErroDeValidacao('descricao passa de 300 caracteres');
  return { descricao, semente: inteiro(corpo.semente, 'semente', 0) };
}

/** Pedido de geração de um quadro, já normalizado com os valores padrão. Prompt vazio = só a imagem. */
export function validarPedidoDeQuadro(corpo) {
  if (!corpo || typeof corpo !== 'object') throw new ErroDeValidacao('corpo do pedido ausente');
  const promptA = texto(corpo.promptA, 'promptA', true);
  const sementeA = inteiro(corpo.sementeA, 'sementeA', 0);
  return {
    baseId: validarIdFoto(corpo.baseId),
    projetoId: corpo.projetoId === undefined ? undefined : validarIdDoProjeto(corpo.projetoId),
    quadro: corpo.quadro === undefined ? undefined : validarNumeroDoQuadro(corpo.quadro),
    promptA,
    promptB: corpo.promptB === undefined ? promptA : texto(corpo.promptB, 'promptB', true),
    mixPrompt: numero(corpo.mixPrompt, 'mixPrompt', 0, 1, 0),
    sementeA,
    sementeB: inteiro(corpo.sementeB, 'sementeB', sementeA),
    mixSemente: numero(corpo.mixSemente, 'mixSemente', 0, 1, 0),
    forca: numero(corpo.forca, 'forca', 0.05, 1, 0.5),
    passos: Math.round(numero(corpo.passos, 'passos', 1, 4, 1)),
  };
}
